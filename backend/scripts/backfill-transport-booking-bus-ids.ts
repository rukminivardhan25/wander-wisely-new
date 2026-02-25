/**
 * Backfill bus_id and listing_id on transport_bookings rows that have them null.
 * Matches by listing_name + bus_name to buses/listings in the same database.
 * Run from backend/: npx tsx scripts/backfill-transport-booking-bus-ids.ts
 * Requires: DATABASE_URL (single database for app and transport).
 */
import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

async function run() {
  const needBackfill = await pool.query<{
    id: string;
    booking_id: string;
    listing_name: string | null;
    bus_name: string | null;
    travel_date: string;
  }>(
    `select id, booking_id, listing_name, bus_name, travel_date
     from transport_bookings where bus_id is null`
  );

  if (needBackfill.rows.length === 0) {
    console.log("No transport_bookings rows with bus_id null. Nothing to backfill.");
    return;
  }

  console.log(`Found ${needBackfill.rows.length} booking(s) with bus_id null. Looking up bus_id...`);

  const busesByKey = await pool.query<{ bus_id: string; listing_id: string; listing_name: string; bus_name: string }>(
    `select b.id as bus_id, b.listing_id, l.name as listing_name, b.name as bus_name
     from buses b
     join listings l on l.id = b.listing_id`
  );

  const key = (a: string | null, b: string | null) =>
    `${(a ?? "").trim().toLowerCase()}::${(b ?? "").trim().toLowerCase()}`;
  const map = new Map<string, { bus_id: string; listing_id: string }>();
  for (const row of busesByKey.rows) {
    map.set(key(row.listing_name, row.bus_name), { bus_id: row.bus_id, listing_id: row.listing_id });
  }

  let updated = 0;
  for (const row of needBackfill.rows) {
    const listingName = row.listing_name ?? "";
    const busName = row.bus_name ?? "";
    const match = map.get(key(listingName, busName));
    if (!match) {
      console.log(`  Skip ${row.booking_id}: no bus found for listing="${listingName}" bus="${busName}"`);
      continue;
    }
    await pool.query(
      `update transport_bookings set bus_id = $1, listing_id = $2 where id = $3`,
      [match.bus_id, match.listing_id, row.id]
    );
    console.log(`  Updated ${row.booking_id} -> bus_id=${match.bus_id}`);
    updated++;
  }

  console.log(`Done. Updated ${updated} row(s).`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

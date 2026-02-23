/**
 * One-off: count buses for a listing name (e.g. Fairytravels).
 * Run: npx tsx scripts/count-buses-by-listing.ts [listing-name]
 * Default listing name: fairytravels
 */
import "dotenv/config";
import pg from "pg";

const listingName = process.argv[2] ?? "fairytravels";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

async function main() {
  const q = await pool.query(
    `select l.id as listing_id, l.name as listing_name, count(b.id)::int as bus_count
     from listings l
     left join buses b on b.listing_id = l.id
     where lower(trim(l.name)) = $1 or lower(trim(l.name)) like $2
     group by l.id, l.name`,
    [listingName.toLowerCase(), `%${listingName.toLowerCase()}%`]
  );
  if (q.rows.length === 0) {
    console.log(`No listing found matching "${listingName}". Bus count: 0`);
  } else {
    for (const row of q.rows) {
      console.log(`Listing: ${row.listing_name} (id: ${row.listing_id}) -> ${row.bus_count} bus(es)`);
    }
    const total = q.rows.reduce((s, r) => s + (Number(r.bus_count) || 0), 0);
    console.log(`Total buses from "${listingName}": ${total}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

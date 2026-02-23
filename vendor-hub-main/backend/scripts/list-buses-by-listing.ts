/**
 * List all buses with their listing (so you can see why Fleet shows only some).
 * Run from vendor-hub-main/backend: npx tsx scripts/list-buses-by-listing.ts
 * Optional: npx tsx scripts/list-buses-by-listing.ts fairytales
 */
import "dotenv/config";
import pg from "pg";

const filterName = process.argv[2]?.toLowerCase(); // e.g. "fairytales"

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
  const q = await pool.query<{ bus_id: string; bus_name: string; listing_id: string; listing_name: string }>(
    `select b.id as bus_id, b.name as bus_name, l.id as listing_id, l.name as listing_name
     from buses b
     join listings l on l.id = b.listing_id
     order by l.name, b.name`
  );
  if (filterName) {
    const filtered = q.rows.filter((r) => (r.listing_name || "").toLowerCase().includes(filterName));
    console.log(`Buses under listings matching "${filterName}":\n`);
    filtered.forEach((r) => console.log(`  ${r.bus_name}  ->  listing "${r.listing_name}" (${r.listing_id})`));
    if (filtered.length === 0) console.log("  (none)");
    const byListing = filtered.reduce<Record<string, string[]>>((acc, r) => {
      const key = r.listing_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r.bus_name);
      return acc;
    }, {});
    const listingIds = Object.keys(byListing);
    if (listingIds.length > 1) {
      console.log("\n--> You have more than one listing for this name. Buses are split across them.");
      console.log("--> To see all 4 buses under one Fleet, move buses to the same listing_id in the DB.");
      const targetId = listingIds[0];
      const otherBuses = q.rows.filter((r) => r.listing_id !== targetId && (r.listing_name || "").toLowerCase().includes(filterName));
      if (otherBuses.length > 0) {
        console.log(`\nExample: to put all buses under listing ${targetId}, run in SQL:`);
        console.log(`UPDATE buses SET listing_id = '${targetId}' WHERE id IN (${otherBuses.map((b) => `'${b.bus_id}'`).join(", ")});`);
      }
    }
  } else {
    console.log("All buses and their listing:\n");
    q.rows.forEach((r) => console.log(`  ${r.bus_name}  ->  "${r.listing_name}" (${r.listing_id})`));
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

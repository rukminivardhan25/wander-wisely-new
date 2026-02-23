/**
 * One-off: move the bus that was under the other "fairytales" listing to the main one
 * so all 4 buses show in one Fleet. Run: npx tsx scripts/fix-fairytales-buses.ts
 */
import "dotenv/config";
import pg from "pg";

const TARGET_LISTING_ID = "231c3fa0-1111-4f9b-bbb2-e2f39409f33d"; // listing that has 3 buses
const BUS_IDS_TO_MOVE = ["777aed20-dec9-4dd4-a18f-bfe591443a2f"]; // the 1 bus under the other listing

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
  const r = await pool.query(
    "UPDATE buses SET listing_id = $1 WHERE id = ANY($2::uuid[]) RETURNING id, name, listing_id",
    [TARGET_LISTING_ID, BUS_IDS_TO_MOVE]
  );
  console.log("Updated", r.rowCount, "bus(es) to listing", TARGET_LISTING_ID);
  r.rows.forEach((row) => console.log("  -", row.name, "-> listing_id", row.listing_id));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

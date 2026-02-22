import "dotenv/config";
import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

const schemaFiles = [
  "001_vendors.sql",
  "002_listings.sql",
  "003_vendor_bookings.sql",
  "004_buses.sql",
  "005_routes.sql",
  "006_route_schedules.sql",
  "007_listing_availability.sql",
  "008_listing_driver_info.sql",
  "009_drivers.sql",
  "010_drop_listing_driver_columns.sql",
  "011_vendor_listings.sql",
];

async function run() {
  const schemaDir = join(__dirname, "..", "schema");

  try {
    for (const file of schemaFiles) {
      const sql = readFileSync(join(schemaDir, file), "utf-8");
      await pool.query(sql);
      console.log("Schema applied:", file);
    }
  } catch (err) {
    console.error("Schema run failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

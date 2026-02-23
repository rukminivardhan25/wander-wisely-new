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
  "000_drop_all_vendor_tables.sql",
  "001_vendors.sql",
  "002_listings.sql",
  "003_buses.sql",
  "004_drivers.sql",
  "005_routes.sql",
  "006_route_schedules.sql",
  "007_listing_availability.sql",
  "018_drivers_routes_bus_id.sql",
  "019_bus_schedules_route_id.sql",
  "020_buses_unique_registration_per_listing.sql",
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

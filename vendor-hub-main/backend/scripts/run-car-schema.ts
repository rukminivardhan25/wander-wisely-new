/**
 * Run car-related schema files only (026, 028, 031, 032).
 * Use when the partner portal DB already has base tables and you need cars + car_operating_areas + car_bookings.
 *
 * From vendor-hub-main/backend: npx tsx scripts/run-car-schema.ts
 * Requires .env with DATABASE_URL pointing to the partner portal database.
 */
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

import pg from "pg";
import { readFileSync, existsSync } from "fs";

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
  "026_cars.sql",
  "028_car_operating_areas.sql",
  "031_car_areas_schedule_dates.sql",
  "032_car_rental_bookings.sql",
];

async function run() {
  const schemaDir = join(__dirname, "..", "schema");

  for (const file of schemaFiles) {
    const path = join(schemaDir, file);
    if (!existsSync(path)) {
      console.error("File not found:", file);
      process.exit(1);
    }
    const sql = readFileSync(path, "utf-8");
    try {
      await pool.query(sql);
      console.log("Schema applied:", file);
    } catch (err) {
      console.error("Schema run failed for", file, ":", err);
      process.exit(1);
    }
  }
  await pool.end();
  console.log("Car schema done. Set TRANSPORT_DATABASE_URL in main app backend .env to this same DATABASE_URL.");
}

run();

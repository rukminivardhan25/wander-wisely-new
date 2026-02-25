/**
 * Run flight-related schema files so flight details can be saved.
 * Requires: DATABASE_URL in .env and listings table (from db:init or earlier schema).
 * Usage: npm run db:flight   or   npx tsx scripts/run-flight-schema.ts
 */
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

const flightSchemaFiles = [
  "033_flight_bookings.sql",
  "034_flights.sql",
  "035_flight_routes.sql",
  "036_flight_schedules.sql",
  "037_flights_verification.sql",
];

async function run() {
  const schemaDir = join(__dirname, "..", "schema");

  try {
    for (const file of flightSchemaFiles) {
      const sql = readFileSync(join(schemaDir, file), "utf-8");
      await pool.query(sql);
      console.log("Schema applied:", file);
    }
    console.log("Flight schema done. You can save flight details now.");
  } catch (err) {
    console.error("Flight schema run failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

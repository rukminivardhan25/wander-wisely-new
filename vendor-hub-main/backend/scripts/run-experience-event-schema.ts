/**
 * Run experience and event schema files.
 * Requires: DATABASE_URL in .env and listings table (from db:init or earlier schema).
 * Usage: npm run db:experience-event   or   npx tsx scripts/run-experience-event-schema.ts
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

const schemaFiles = [
  "038_experiences.sql",
  "039_experience_bookings.sql",
  "040_events.sql",
  "041_event_bookings.sql",
  "042_experiences_drop_discount.sql",
];

async function run() {
  const schemaDir = join(__dirname, "..", "schema");

  try {
    for (const file of schemaFiles) {
      const sql = readFileSync(join(schemaDir, file), "utf-8");
      await pool.query(sql);
      console.log("Schema applied:", file);
    }
    console.log("Experience & Event schema done.");
  } catch (err) {
    console.error("Schema run failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

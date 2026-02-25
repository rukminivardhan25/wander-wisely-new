/**
 * One-off: run clear-all-bookings.sql to remove all booking rows (My Trips will show empty).
 * Run from backend/: npx tsx scripts/run-clear-all-bookings.ts
 * Requires: DATABASE_URL
 */
import "dotenv/config";
import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
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
  const sql = readFileSync(join(__dirname, "clear-all-bookings.sql"), "utf-8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const stmt of statements) {
    const res = await pool.query(stmt);
    console.log("OK:", stmt.slice(0, 50).replace(/\s+/g, " ") + "...");
  }
  console.log("All booking rows deleted. My Trips will show no bookings.");
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());

import "dotenv/config";
import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

const sql = readFileSync(join(__dirname, "..", "schema", "015_trip_activity_status.sql"), "utf-8");

pool
  .query(sql)
  .then(() => {
    console.log("015_trip_activity_status.sql applied.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());

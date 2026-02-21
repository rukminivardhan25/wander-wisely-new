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

async function run() {
  const schemaDir = join(__dirname, "..", "schema");
  const files = ["001_users.sql", "002_trips_itineraries.sql"];

  try {
    for (const file of files) {
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

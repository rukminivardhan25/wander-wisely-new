/**
 * Read-only check: test database connection and list existing tables.
 * Does NOT create, alter, or delete anything.
 * Run: npx tsx scripts/check-db.ts
 */
import "dotenv/config";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

async function check() {
  try {
    await pool.query("select 1");
    console.log("Database connection: OK\n");

    const tables = await pool.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' order by tablename`
    );
    console.log("Tables in schema 'public':");
    if (tables.rows.length === 0) {
      console.log("  (none)");
    } else {
      tables.rows.forEach((r) => console.log("  -", r.tablename));
    }

    const vendorHubTables = ["vendors", "listings", "vendor_bookings"];
    const existing = new Set(tables.rows.map((r) => r.tablename));
    const missing = vendorHubTables.filter((t) => !existing.has(t));
    const present = vendorHubTables.filter((t) => existing.has(t));

    console.log("\nPartner Portal tables:");
    console.log("  Already present:", present.length ? present.join(", ") : "(none)");
    console.log("  Not yet created:", missing.length ? missing.join(", ") : "(none)");
    if (missing.length > 0) {
      console.log("\nRun 'npm run db:init' to create missing Partner Portal tables (no data is deleted).");
    }
  } catch (err) {
    console.error("Database check failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

check();

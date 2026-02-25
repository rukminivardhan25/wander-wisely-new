/**
 * One-off script: list experiences in the database (name, city, status).
 * Run from backend folder: npx tsx scripts/list-experiences.ts
 */
import "dotenv/config";
import { query } from "../src/config/db.js";

interface Row {
  name: string;
  city: string;
  status: string;
}

const result = await query<Row>(
  "SELECT name, city, status FROM experiences ORDER BY name"
);
const rows = result.rows;

if (rows.length === 0) {
  console.log("No experiences in the database.");
  process.exit(0);
}

console.log("Experiences in the database:\n");
console.log("Name          | City     | Status");
console.log("--------------|----------|----------");
for (const r of rows) {
  const name = (r.name || "").padEnd(13).slice(0, 13);
  const city = (r.city || "").padEnd(8).slice(0, 8);
  const status = r.status || "";
  console.log(`${name} | ${city} | ${status}`);
}
console.log(`\nTotal: ${rows.length} experience(s).`);
process.exit(0);

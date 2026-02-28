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
  const files = ["001_users.sql", "002_trips_itineraries.sql", "003_active_trip.sql", "004_expenses.sql", "005_trip_start_date.sql", "006_trip_budget_amount.sql", "007_transport_bookings.sql", "008_transport_bookings_bus_id.sql", "013_hotel_bookings.sql", "014_hotel_bookings_room_type.sql", "015_trip_activity_status.sql", "016_booking_trip_id.sql", "017_posts_community.sql", "018_post_bookmarks.sql", "019_posts_description.sql", "020_app_feedback.sql", "021_app_feedback_admin_reply.sql", "022_users_phone.sql", "023_payout_transactions.sql", "024_hotel_bookings_paid_at.sql", "025_hotel_bookings_rejection_reason.sql"];

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

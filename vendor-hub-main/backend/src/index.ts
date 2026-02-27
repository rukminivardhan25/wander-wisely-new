import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import listingsIndexRoutes from "./routes/listingsIndex.js";
import uploadRoutes from "./routes/upload.js";
import transportBookingsRoutes from "./routes/transportBookings.js";
import publicTransportRoutes from "./routes/publicTransport.js";
import customersRoutes from "./routes/customers.js";
import verificationRoutes from "./routes/verification.js";
import citiesRoutes from "./routes/cities.js";
import bookingReviewsRoutes from "./routes/bookingReviews.js";
import profileRoutes from "./routes/profile.js";
import adminVendorsRoutes from "./routes/adminVendors.js";
import payoutsRoutes from "./routes/payouts.js";
import dashboardRoutes from "./routes/dashboard.js";
import supportRoutes from "./routes/support.js";
import adminSupportTicketsRoutes from "./routes/adminSupportTickets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3002;

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:8080,http://localhost:8081,http://localhost:8083,http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8083";
const corsOrigins = corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
const allowedSet = new Set(corsOrigins.length ? corsOrigins : ["http://localhost:8080", "http://localhost:8081", "http://127.0.0.1:8080", "http://127.0.0.1:8081"]);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedSet.has(origin)) return cb(null, origin);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return cb(null, origin);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: "6mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Partner Portal API" });
});

/** Debug: return ALL car_bookings (no filters). Uses same DB as DATABASE_URL (single DB). */
app.get("/api/debug/all-car-bookings", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, booking_ref, listing_id, car_id, user_id, travel_date, status, created_at FROM car_bookings ORDER BY created_at DESC LIMIT 50"
    );
    res.json({
      message: "All car_bookings (max 50), no filters (single DATABASE_URL)",
      count: result.rows.length,
      rows: result.rows,
    });
  } catch (err) {
    console.error("Debug all-car-bookings error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Query failed" });
  }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingsIndexRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/transport-bookings", transportBookingsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/booking-reviews", bookingReviewsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin/vendors", adminVendorsRoutes);
app.use("/api/payouts", payoutsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin/support-tickets", adminSupportTicketsRoutes);
app.use("/api/public", publicTransportRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

function logDbUrl(label: string, url: string): void {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    console.log(`[DB] ${label} ${u.toString().replace(/:[^:@]+@/, ":***@")}`);
  } catch {
    console.log(`[DB] ${label} (url parse skipped)`);
  }
}

app.listen(Number(PORT), "0.0.0.0", () => {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl) logDbUrl("Partner portal DATABASE_URL", dbUrl);
  console.log("[DB] Car bookings use DATABASE_URL (single DB, same as bus/listings).");
  const publicUrl = process.env.RENDER_EXTERNAL_URL ?? process.env.PUBLIC_URL;
  console.log(publicUrl ? `Partner Portal API running at ${publicUrl}` : `Partner Portal API running at http://localhost:${PORT}`);
});

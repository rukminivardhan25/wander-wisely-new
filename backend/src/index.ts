import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import { pool } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import tripsRoutes from "./routes/trips.js";
import destinationsRoutes from "./routes/destinations.js";
import postsRoutes from "./routes/posts.js";
import uploadRoutes from "./routes/upload.js";
import meRoutes from "./routes/me.js";
import placesRoutes from "./routes/places.js";
import transportRoutes from "./routes/transport.js";
import bookingsRoutes from "./routes/bookings.js";
import carBookingsRoutes from "./routes/carBookings.js";
import flightsRoutes from "./routes/flights.js";
import flightBookingsRoutes from "./routes/flightBookings.js";
import experiencesRoutes from "./routes/experiences.js";
import experienceBookingsRoutes from "./routes/experienceBookings.js";
import eventsRoutes from "./routes/events.js";
import eventBookingsRoutes from "./routes/eventBookings.js";
import hotelsRoutes from "./routes/hotels.js";
import hotelBookingsRoutes from "./routes/hotelBookings.js";
import feedbackRoutes from "./routes/feedback.js";
import adminFeedbackRoutes from "./routes/adminFeedback.js";
import adminUsersRoutes from "./routes/adminUsers.js";
import adminBookingsRoutes from "./routes/adminBookings.js";
import adminPayoutsRoutes from "./routes/adminPayouts.js";
import bookingReviewsRoutes from "./routes/bookingReviews.js";

/** Log DATABASE_URL (password redacted) so you can confirm main app and partner portal use the same DB. */
function logDbUrl(label: string, url: string): void {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    console.log(`[DB] ${label} ${u.toString().replace(/:[^:@]+@/, ":***@")}`);
  } catch {
    console.log(`[DB] ${label} (url parse skipped)`);
  }
}

const app = express();
const PORT = process.env.PORT ?? 3001;

const defaultOrigins = "http://localhost:8080,http://localhost:8081,http://localhost:5173,http://localhost:5174,http://localhost:8083,http://localhost:8082,http://127.0.0.1:8082";
const corsOrigin = process.env.CORS_ORIGIN ?? defaultOrigins;
const corsOrigins = corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
const allowedSet = new Set([
  ...(corsOrigins.length ? corsOrigins : defaultOrigins.split(",").map((o) => o.trim())),
  "http://localhost:8083", // admin-main
  "http://localhost:8082", "http://127.0.0.1:8082", // admin-main (alternate port)
]);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedSet.has(origin)) return cb(null, origin);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "Content-Disposition", "X-Admin-Key"],
  optionsSuccessStatus: 204,
  preflightContinue: false,
}));
app.use(express.json());

// Log 4xx/5xx responses so you can see which request failed (check terminal for the route and error).
app.use((req, res, next) => {
  const onDone = () => {
    if (res.statusCode >= 400) {
      console.warn(`[${res.statusCode}] ${req.method} ${req.originalUrl || req.url}`);
    }
  };
  res.on("finish", onDone);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Wander Wisely API" });
});

app.get("/", (_req, res) => {
  res.json({ message: "Wander Wisely API", docs: "Use the frontend at your app URL; API routes are under /api/...", health: "/api/health" });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/destinations", destinationsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/me", meRoutes);
app.use("/api/places", placesRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/transport", transportRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/car-bookings", carBookingsRoutes);
app.use("/api/flights", flightsRoutes);
app.use("/api/flight-bookings", flightBookingsRoutes);
app.use("/api/experiences", experiencesRoutes);
app.use("/api/experience-bookings", experienceBookingsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/event-bookings", eventBookingsRoutes);
app.use("/api/hotels", hotelsRoutes);
app.use("/api/hotel-bookings", hotelBookingsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/admin/feedback", adminFeedbackRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/bookings", adminBookingsRoutes);
app.use("/api/admin/payouts", adminPayoutsRoutes);
app.use("/api/booking-reviews", bookingReviewsRoutes);

app.listen(PORT, () => {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl) logDbUrl("Main app DATABASE_URL", dbUrl);
  console.log("[DB] Single database (DATABASE_URL) used for app and transport (flights, buses, cars, bookings).");
  const publicUrl = process.env.RENDER_EXTERNAL_URL ?? process.env.PUBLIC_URL;
  console.log(publicUrl ? `Server running at ${publicUrl}` : `Server running at http://localhost:${PORT}`);
});

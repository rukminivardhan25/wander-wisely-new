import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import tripsRoutes from "./routes/trips.js";
import destinationsRoutes from "./routes/destinations.js";
import postsRoutes from "./routes/posts.js";
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

/** Log DATABASE_URL (password redacted) so you can confirm main app and vendor hub use the same DB. */
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

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:8080,http://localhost:8081";
const corsOrigins = corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
const allowedSet = new Set(corsOrigins.length ? corsOrigins : ["http://localhost:8080", "http://localhost:8081"]);
app.use(cors({
  origin: (origin, cb) => {
    // Preflight or same-origin requests may omit Origin
    if (!origin) return cb(null, true);
    if (allowedSet.has(origin)) return cb(null, origin);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Wander Wisely API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/destinations", destinationsRoutes);
app.use("/api/posts", postsRoutes);
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

app.listen(PORT, () => {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl) logDbUrl("Main app DATABASE_URL", dbUrl);
  console.log("[DB] Single database (DATABASE_URL) used for app and transport (flights, buses, cars, bookings).");
  console.log(`Server running at http://localhost:${PORT}`);
});

import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import tripsRoutes from "./routes/trips.js";
import destinationsRoutes from "./routes/destinations.js";
import postsRoutes from "./routes/posts.js";
import transportRoutes from "./routes/transport.js";
import bookingsRoutes from "./routes/bookings.js";
import carBookingsRoutes from "./routes/carBookings.js";

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

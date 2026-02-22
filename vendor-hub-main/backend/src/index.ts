import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import listingsIndexRoutes from "./routes/listingsIndex.js";
import bookingsRoutes from "./routes/bookings.js";
import routeSchedulesRoutes from "./routes/routeSchedules.js";

const app = express();
const PORT = process.env.PORT ?? 3002;

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:8080,http://127.0.0.1:8080";
const corsOrigins = corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(null, corsOrigins[0] ?? true);
  },
  credentials: true,
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Vendor Hub API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingsIndexRoutes);
app.use("/api/routes/:routeId/schedules", routeSchedulesRoutes);
app.use("/api/bookings", bookingsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Vendor Hub API running at http://localhost:${PORT}`);
});

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import listingsIndexRoutes from "./routes/listingsIndex.js";
import uploadRoutes from "./routes/upload.js";
import transportBookingsRoutes from "./routes/transportBookings.js";
import publicTransportRoutes from "./routes/publicTransport.js";
import customersRoutes from "./routes/customers.js";
import verificationRoutes from "./routes/verification.js";
import citiesRoutes from "./routes/cities.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3002;

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:8080,http://localhost:8081,http://127.0.0.1:8080,http://127.0.0.1:8081";
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
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: "6mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Vendor Hub API" });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingsIndexRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/transport-bookings", transportBookingsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/public", publicTransportRoutes);

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

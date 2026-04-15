import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import verificationRoutes from "./routes/verification.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();
const PORT = process.env.PORT ?? 3003;

const defaultOrigins = "http://localhost:8082,http://127.0.0.1:8082,http://localhost:8083,http://127.0.0.1:8083";
const corsOrigin = process.env.CORS_ORIGIN ?? defaultOrigins;
const corsOrigins = corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
const allowedSet = new Set(corsOrigins.length ? corsOrigins : defaultOrigins.split(",").map((o) => o.trim()));
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
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Admin API" });
});

app.get("/", (_req, res) => {
  res.json({ message: "Admin API", docs: "API routes are under /api/...", health: "/api/health" });
});

app.use("/api/verification", verificationRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Serve verification uploads so admin can open documents (same files as partner portal uploads)
const UPLOADS_PATH = process.env.UPLOADS_PATH || path.resolve(process.cwd(), "..", "..", "vendor-hub-main", "backend", "uploads");
app.get("/api/verification/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  if (!filename || !/^[a-f0-9-]+\.(pdf|jpg|jpeg|png|gif|webp)$/i.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  const filepath = path.join(UPLOADS_PATH, filename);
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(path.resolve(filepath));
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(Number(PORT), "0.0.0.0", () => {
  const publicUrl = process.env.RENDER_EXTERNAL_URL ?? process.env.PUBLIC_URL;
  console.log(publicUrl ? `Admin API running at ${publicUrl}` : `Admin API running at http://localhost:${PORT}`);
});

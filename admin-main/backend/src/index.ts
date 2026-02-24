import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import verificationRoutes from "./routes/verification.js";

const app = express();
const PORT = process.env.PORT ?? 3003;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Admin API" });
});

app.use("/api/verification", verificationRoutes);

// Serve verification uploads so admin can open documents (same files as vendor-hub uploads)
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
  console.log(`Admin API running at http://localhost:${PORT}`);
});

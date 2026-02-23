import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

router.use(authMiddleware);

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { image } = req.body as { image?: string };
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      res.status(400).json({ error: "Invalid image: send { image: 'data:image/...;base64,...' }" });
      return;
    }
    const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: "Invalid base64 image" });
      return;
    }
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: "Image too large (max 5MB)" });
      return;
    }
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    const filename = `${crypto.randomUUID()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    const baseUrl = process.env.VENDOR_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3002}`;
    const url = `${baseUrl.replace(/\/$/, "")}/uploads/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;

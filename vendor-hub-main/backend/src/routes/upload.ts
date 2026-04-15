import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

router.use(authMiddleware);

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

function getRequestBaseUrl(req: Request): string {
  const configured = process.env.VENDOR_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return `http://localhost:${process.env.PORT ?? 3002}`;
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, file: fileDataUrl } = req.body as { image?: string; file?: string };
    const dataUrl = typeof image === "string" && image ? image : typeof fileDataUrl === "string" && fileDataUrl ? fileDataUrl : null;
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      res.status(400).json({ error: "Invalid upload: send { image: 'data:image/...;base64,...' } or { file: 'data:...;base64,...' } for image/PDF" });
      return;
    }
    let ext: string;
    let buffer: Buffer;
    const imageMatch = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    const pdfMatch = dataUrl.match(/^data:application\/pdf;base64,(.+)$/);
    if (imageMatch) {
      ext = imageMatch[1] === "jpeg" ? "jpg" : imageMatch[1];
      buffer = Buffer.from(imageMatch[2], "base64");
    } else if (pdfMatch) {
      ext = "pdf";
      buffer = Buffer.from(pdfMatch[1], "base64");
    } else {
      res.status(400).json({ error: "Unsupported file type. Use image (JPEG, PNG, etc.) or PDF." });
      return;
    }
    if (buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: "File too large (max 10MB)" });
      return;
    }
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    const filename = `${crypto.randomUUID()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    const url = `${getRequestBaseUrl(req)}/uploads/${filename}`;
    res.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;

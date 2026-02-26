import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED_TYPES = /^image\/(jpeg|jpg|png|gif|webp)$/;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // ignore
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safe = ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
    cb(null, `${randomUUID()}${safe || ".jpg"}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.test(file.mimetype)) {
      (req as Request & { uploadError?: string }).uploadError = "Only images (jpeg, png, gif, webp) are allowed.";
      return cb(null, false);
    }
    cb(null, true);
  },
});

router.use(authMiddleware);

/** POST /api/upload — Upload one image. Field name: "image". Returns { url: "/uploads/filename" }. */
router.post("/", upload.single("image"), (req: Request, res: Response) => {
  try {
    const uploadError = (req as Request & { uploadError?: string }).uploadError;
    if (uploadError) {
      res.status(400).json({ error: uploadError });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No image file provided. Use field name 'image'." });
      return;
    }
    const url = "/uploads/" + (req.file.filename || path.basename(req.file.path || ""));
    res.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|jpg|png|gif|webp)$/;
const ALLOWED_DOC_TYPES = /^application\/pdf$/;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // ignore
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype === "application/pdf" ? ".pdf" : ".jpg");
    const safe = ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
    cb(null, `${randomUUID()}${safe || ".jpg"}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED_IMAGE_TYPES.test(file.mimetype) || ALLOWED_DOC_TYPES.test(file.mimetype);
    if (!ok) {
      (req as Request & { uploadError?: string }).uploadError =
        "Only images (jpeg, png, gif, webp) and PDF are allowed.";
      return cb(null, false);
    }
    cb(null, true);
  },
});

router.use(authMiddleware);

/** POST /api/upload — Upload one image or PDF. Field name: "image". Returns { url: "/uploads/filename" }. */
router.post("/", upload.single("image"), (req: Request, res: Response) => {
  try {
    const uploadError = (req as Request & { uploadError?: string }).uploadError;
    if (uploadError) {
      res.status(400).json({ error: uploadError });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file provided. Use field name 'image' and send an image or PDF." });
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

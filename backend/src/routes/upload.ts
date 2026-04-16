import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createHash, randomUUID } from "crypto";
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

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_ENABLED = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

function getExt(file: Express.Multer.File): string {
  const byName = path.extname(file.originalname || "").toLowerCase();
  if (/^\.[a-z0-9]+$/.test(byName)) return byName;
  if (file.mimetype === "application/pdf") return ".pdf";
  if (file.mimetype.includes("png")) return ".png";
  if (file.mimetype.includes("webp")) return ".webp";
  if (file.mimetype.includes("gif")) return ".gif";
  return ".jpg";
}

async function uploadToCloudinary(file: Express.Multer.File): Promise<string> {
  if (!CLOUDINARY_ENABLED) throw new Error("Cloudinary is not configured");
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `community/${randomUUID()}`;
  const folder = "wander-wisely/community";
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = sha1(toSign);
  const blob = new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" });

  const form = new FormData();
  form.append("file", blob, `${publicId}${getExt(file)}`);
  form.append("api_key", CLOUDINARY_API_KEY!);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const res = await fetch(endpoint, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }
  return data.secure_url;
}

const upload = multer({
  storage: multer.memoryStorage(),
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
router.post("/", upload.single("image"), async (req: Request, res: Response) => {
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

    // Production-safe path: store uploads in Cloudinary and return permanent URL.
    if (CLOUDINARY_ENABLED) {
      const url = await uploadToCloudinary(req.file);
      res.json({ url });
      return;
    }

    // Local fallback for dev when Cloudinary isn't configured.
    const filename = `${randomUUID()}${getExt(req.file)}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    const url = "/uploads/" + filename;
    res.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;

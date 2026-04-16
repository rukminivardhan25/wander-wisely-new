import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { query, pool } from "../src/config/db.js";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary credentials in backend env.");
  process.exit(1);
}

function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

function extFromUrl(url: string): string {
  const ext = path.extname(url.split("?")[0] || "").toLowerCase();
  if (/^\.[a-z0-9]+$/.test(ext)) return ext;
  return ".jpg";
}

function isUsableSourceUrl(url: string): boolean {
  if (!url || !url.startsWith("http")) return false;
  if (url.includes("api.openverse.org/v1/images/")) return false;
  if (url.includes("upload.wikimedia.org") || url.includes("commons.wikimedia.org")) return false;
  return true;
}

function scoreCandidate(result: any, tokens: string[]): number {
  const title = String(result?.title || "").toLowerCase();
  const tags = Array.isArray(result?.tags) ? result.tags.join(" ").toLowerCase() : "";
  const text = `${title} ${tags}`;
  let score = 0;
  for (const token of tokens) if (text.includes(token)) score += 5;
  if ((result?.width || 0) >= 1200) score += 3;
  if ((result?.height || 0) >= 800) score += 3;
  if (/\b(person|people|portrait|man|woman|selfie|face|model)\b/i.test(text)) score -= 10;
  if (/\b(landmark|temple|church|mosque|cathedral|fort|palace|beach|mountain|waterfall|river|lake|forest|skyline|city)\b/i.test(text)) score += 5;
  return score;
}

async function fetchOpenverseCandidates(search: string): Promise<any[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(search)}&page_size=20&license_type=commercial`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "wander-wisely-community-migrate/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Openverse failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

async function selectOpenverseUrl(location: string, caption: string): Promise<string | null> {
  const base = location.split(",")[0].trim();
  const queries = [`${base} famous landmark`, `${base} travel destination`, `${base} city view`, `${base} nature scenic`];
  const tokens = `${location} ${caption || ""}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((x) => x.length > 2);

  let bestUrl: string | null = null;
  let bestScore = -Infinity;

  for (const q of queries) {
    const results = await fetchOpenverseCandidates(q);
    for (const r of results) {
      const candidate =
        (typeof r?.url === "string" && r.url.startsWith("http") && r.url) ||
        (typeof r?.thumbnail === "string" && r.thumbnail.startsWith("http") && r.thumbnail) ||
        null;
      if (!candidate || !isUsableSourceUrl(candidate)) continue;
      const score = scoreCandidate(r, tokens);
      if (score > bestScore) {
        bestScore = score;
        bestUrl = candidate;
      }
    }
  }
  return bestUrl;
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "wander-wisely-community-migrate/1.0",
      Accept: "image/*,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const ab = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { buffer: Buffer.from(ab), contentType };
}

async function uploadToCloudinary(fileBuffer: Buffer, mimeType: string, publicId: string, ext: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "wander-wisely/community";
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = sha1(toSign);

  const blob = new Blob([fileBuffer], { type: mimeType || "application/octet-stream" });
  const form = new FormData();
  form.append("file", blob, `${publicId}${ext}`);
  form.append("api_key", CLOUDINARY_API_KEY);
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

type PostRow = { id: string; image_url: string; location: string; caption: string | null };

async function run(): Promise<void> {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const { rows } = await query<PostRow>(
    `select id, image_url, location, caption
     from posts
     where image_url is not null
       and image_url <> ''
       and image_url not like 'https://res.cloudinary.com/%'
     order by created_at asc`
  );

  let migrated = 0;
  let missingLocal = 0;
  let skippedExternal = 0;
  let failed = 0;

  for (const post of rows) {
    const raw = post.image_url.trim();

    try {
      if (raw.startsWith("/uploads/")) {
        const filename = path.basename(raw);
        const filePath = path.join(uploadsDir, filename);
        try {
          await fs.access(filePath);
        } catch {
          const fallbackUrl = await selectOpenverseUrl(post.location || "", post.caption || "");
          if (!fallbackUrl) {
            missingLocal++;
            console.log(`[missing] ${post.id} -> ${raw}`);
            continue;
          }
          const { buffer, contentType } = await downloadImage(fallbackUrl);
          const recovered = await uploadToCloudinary(buffer, contentType, `post-${post.id}-missing-local`, ".jpg");
          await query("update posts set image_url = $1 where id = $2", [recovered, post.id]);
          migrated++;
          console.log(`[migrated-missing-local] ${post.id}`);
          continue;
        }

        const fileBuffer = await fs.readFile(filePath);
        const ext = path.extname(filename) || ".jpg";
        const mimeType = ext === ".pdf" ? "application/pdf" : "image/jpeg";
        const secureUrl = await uploadToCloudinary(fileBuffer, mimeType, `post-${post.id}`, ext);
        await query("update posts set image_url = $1 where id = $2", [secureUrl, post.id]);
        migrated++;
        console.log(`[migrated-local] ${post.id}`);
        continue;
      }

      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = "wander-wisely/community";
        const publicId = `post-${post.id}-${timestamp}`;
        const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const signature = sha1(toSign);

        const form = new FormData();
        form.append("file", raw);
        form.append("api_key", CLOUDINARY_API_KEY);
        form.append("timestamp", String(timestamp));
        form.append("folder", folder);
        form.append("public_id", publicId);
        form.append("signature", signature);

        const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
        const res = await fetch(endpoint, { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
        if (!res.ok || !data.secure_url) {
          const fallbackUrl = await selectOpenverseUrl(post.location || "", post.caption || "");
          if (!fallbackUrl) {
            skippedExternal++;
            console.log(`[skip-external] ${post.id} -> ${raw} :: ${data?.error?.message || res.statusText}`);
            continue;
          }
          const { buffer, contentType } = await downloadImage(fallbackUrl);
          const recovered = await uploadToCloudinary(buffer, contentType, `post-${post.id}-fallback`, ".jpg");
          await query("update posts set image_url = $1 where id = $2", [recovered, post.id]);
          migrated++;
          console.log(`[migrated-fallback] ${post.id}`);
          continue;
        }
        await query("update posts set image_url = $1 where id = $2", [data.secure_url, post.id]);
        migrated++;
        console.log(`[migrated-external] ${post.id}`);
        continue;
      }

      skippedExternal++;
      console.log(`[skip-unknown] ${post.id} -> ${raw}`);
    } catch (err) {
      failed++;
      console.log(`[failed] ${post.id} -> ${raw} :: ${String(err)}`);
    }
  }

  console.log(`Done. migrated=${migrated}, missing_local=${missingLocal}, skipped_external=${skippedExternal}, failed=${failed}, total=${rows.length}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });


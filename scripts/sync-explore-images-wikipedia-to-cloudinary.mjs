import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const TARGET_FILE = path.join(ROOT, "src", "lib", "destinations.ts");

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const DRY_RUN = process.argv.includes("--dry-run");

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary credentials.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

function extractDestinationImageBlock(content) {
  const start = content.indexOf("const DESTINATION_IMAGES: Record<string, string[]> = {");
  if (start < 0) throw new Error("DESTINATION_IMAGES block start not found");
  const open = content.indexOf("{", start);
  let depth = 0;
  let close = -1;
  for (let i = open; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) throw new Error("DESTINATION_IMAGES block end not found");
  return { start, end: close + 2 };
}

function parseDestinationNames(content) {
  const map = new Map();
  const regex = /id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(content))) {
    map.set(m[1], m[2]);
  }
  return map;
}

function parseExistingImagesById(blockContent) {
  const out = new Map();
  const entryRegex = /^\s*(?:"([^"]+)"|([a-z0-9-]+)):\s*\[([\s\S]*?)\],/gm;
  let m;
  while ((m = entryRegex.exec(blockContent))) {
    const id = m[1] || m[2];
    const urls = [...(m[3] || "").matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    out.set(id, urls);
  }
  return out;
}

async function fetchWikipediaImageUrl(placeName) {
  const title = placeName.split(",")[0].trim().replace(/\s+/g, "_");
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "wander-wisely-sync/1.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Wikipedia summary failed (${res.status}) for ${placeName}`);
  const data = await res.json();
  const img = data?.originalimage?.source || data?.thumbnail?.source;
  if (!img || typeof img !== "string") throw new Error(`No image in Wikipedia summary for ${placeName}`);
  return img;
}

async function downloadImage(url, retries = 4) {
  let lastErr;
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "wander-wisely-sync/1.0", Accept: "image/*,*/*;q=0.8" } });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const ab = await res.arrayBuffer();
      return { buffer: Buffer.from(ab), contentType };
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(1000 * i);
    }
  }
  throw lastErr;
}

async function uploadToCloudinary(buffer, contentType, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=wander-wisely/explore&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = sha1(toSign);
  const blob = new Blob([buffer], { type: contentType });

  const form = new FormData();
  form.append("file", blob, `${publicId}.jpg`);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", "wander-wisely/explore");
  form.append("public_id", publicId);
  form.append("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const res = await fetch(endpoint, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${data?.error?.message || res.statusText}`);
  return data.secure_url;
}

function buildBlock(ids, imagesById) {
  const lines = [];
  lines.push("const DESTINATION_IMAGES: Record<string, string[]> = {");
  for (const id of ids) {
    const urls = imagesById.get(id) || [];
    if (!urls.length) continue;
    const key = /^[a-z0-9-]+$/.test(id) ? id : `"${id}"`;
    lines.push(`  ${key}: [`);
    for (const u of urls) lines.push(`    "${u}",`);
    lines.push("  ],");
  }
  lines.push("};");
  return lines.join("\n");
}

async function main() {
  const content = await fs.readFile(TARGET_FILE, "utf8");
  const { start, end } = extractDestinationImageBlock(content);
  const oldBlock = content.slice(start, end);
  const existingById = parseExistingImagesById(oldBlock);
  const namesById = parseDestinationNames(content);
  const ids = [...existingById.keys()];

  console.log(`Processing ${ids.length} destinations.`);
  const replacements = new Map(existingById);

  let ok = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const placeName = namesById.get(id) || id.replace(/-/g, " ");
    process.stdout.write(`[${i + 1}/${ids.length}] ${id}: `);
    try {
      const source = await fetchWikipediaImageUrl(placeName);
      if (DRY_RUN) {
        const fake = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/wander-wisely/explore/${id}-dryrun`;
        replacements.set(id, [fake, fake, fake]);
      } else {
        const { buffer, contentType } = await downloadImage(source);
        const publicId = `${id}-${sha1(source).slice(0, 8)}`;
        const secure = await uploadToCloudinary(buffer, contentType, publicId);
        replacements.set(id, [secure, secure, secure]);
      }
      ok++;
      process.stdout.write("ok\n");
      await sleep(250);
    } catch (err) {
      process.stdout.write(`skip (${String(err)})\n`);
    }
  }

  const updatedBlock = buildBlock(ids, replacements);
  const updated = content.slice(0, start) + updatedBlock + content.slice(end);
  if (!DRY_RUN) {
    await fs.writeFile(TARGET_FILE, updated, "utf8");
    console.log(`Updated destinations.ts with ${ok} refreshed relevant images.`);
  } else {
    console.log(`Dry run complete. Would refresh ${ok} entries.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

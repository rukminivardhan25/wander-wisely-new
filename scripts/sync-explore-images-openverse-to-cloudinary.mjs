import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const TARGET_FILE = path.join(ROOT, "src", "lib", "destinations.ts");

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = Number(process.env.EXPLORE_SYNC_LIMIT || "9999");

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
  process.exit(1);
}

function sha1(input) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractDestinationImageBlock(content) {
  const start = content.indexOf("const DESTINATION_IMAGES: Record<string, string[]> = {");
  if (start < 0) throw new Error("Could not find DESTINATION_IMAGES block start.");
  const openBrace = content.indexOf("{", start);
  if (openBrace < 0) throw new Error("Could not find DESTINATION_IMAGES opening brace.");
  let depth = 0;
  let closeIdx = -1;
  for (let i = openBrace; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx < 0) throw new Error("Could not find DESTINATION_IMAGES block end.");
  return { start, end: closeIdx + 2 };
}

function extractDestinationIdsInOrder(blockContent) {
  const ids = [];
  const regex = /^\s*(?:"([^"]+)"|([a-z0-9-]+)):\s*\[/gm;
  let m;
  while ((m = regex.exec(blockContent))) {
    ids.push(m[1] || m[2]);
  }
  return ids;
}

function parseExistingImagesById(blockContent) {
  const out = new Map();
  const entryRegex = /^\s*(?:"([^"]+)"|([a-z0-9-]+)):\s*\[([\s\S]*?)\],/gm;
  let m;
  while ((m = entryRegex.exec(blockContent))) {
    const id = m[1] || m[2];
    const arrBody = m[3] || "";
    const urls = [...arrBody.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    if (id && urls.length) out.set(id, urls);
  }
  return out;
}

function queryFromId(id) {
  return id.replace(/-/g, " ");
}

async function fetchOpenverseImageUrl(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=15&license_type=commercial`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "wander-wisely-explore-sync/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Openverse failed (${res.status}) for query "${query}"`);
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  for (const r of results) {
    if (typeof r?.url === "string" && r.url.startsWith("http")) return r.url;
    if (typeof r?.thumbnail === "string" && r.thumbnail.startsWith("http")) return r.thumbnail;
  }
  throw new Error(`No Openverse image found for "${query}"`);
}

async function downloadImage(url, retries = 4) {
  let lastErr;
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "wander-wisely-explore-sync/1.0",
          Accept: "image/*,*/*;q=0.8",
        },
      });
      if (!res.ok) throw new Error(`Download failed (${res.status}) ${url}`);
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const ab = await res.arrayBuffer();
      return { buffer: Buffer.from(ab), contentType };
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(800 * i);
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
  form.append("file", blob, `${publicId.split("/").pop()}.jpg`);
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

function buildNewBlock(ids, imageById) {
  const lines = [];
  lines.push("const DESTINATION_IMAGES: Record<string, string[]> = {");
  for (const id of ids) {
    const urls = imageById.get(id);
    if (!urls || urls.length === 0) continue;
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
  const ids = extractDestinationIdsInOrder(oldBlock);
  const existingById = parseExistingImagesById(oldBlock);
  const bounded = ids.slice(0, LIMIT);
  console.log(`Found ${ids.length} destination keys. Processing ${bounded.length}.`);

  const imageById = new Map();
  let idx = 0;
  for (const id of bounded) {
    idx += 1;
    const query = queryFromId(id);
    process.stdout.write(`[${idx}/${bounded.length}] ${id}: finding image... `);
    try {
      const sourceUrl = await fetchOpenverseImageUrl(query);
      process.stdout.write("found, uploading... ");
      let secure;
      if (DRY_RUN) {
        secure = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/wander-wisely/explore/${id}`;
      } else {
        const { buffer, contentType } = await downloadImage(sourceUrl);
        const publicId = `wander-wisely/explore/${id}-${sha1(sourceUrl).slice(0, 8)}`;
        secure = await uploadToCloudinary(buffer, contentType, publicId);
        await sleep(250);
      }
      imageById.set(id, [secure, secure, secure]);
      process.stdout.write("ok\n");
    } catch (err) {
      console.log(`failed (${String(err)})`);
    }
  }

  if (imageById.size === 0) {
    throw new Error("No images were uploaded. Aborting.");
  }

  const finalById = new Map(existingById);
  for (const id of ids) {
    if (imageById.has(id)) finalById.set(id, imageById.get(id));
  }

  const newBlock = buildNewBlock(ids, finalById);
  const updated = content.slice(0, start) + newBlock + content.slice(end);
  if (!DRY_RUN) {
    await fs.writeFile(TARGET_FILE, updated, "utf8");
    console.log(`Updated ${TARGET_FILE}. Uploaded entries: ${imageById.size}`);
  } else {
    console.log(`Dry run complete. Would update ${imageById.size} entries.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

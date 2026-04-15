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

function parseDestinationMeta(content) {
  const out = new Map();
  const regex = /id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?category:\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(content))) {
    out.set(m[1], { name: m[2], category: m[3] });
  }
  return out;
}

function buildCategoryQueries(meta, id) {
  const place = (meta?.name || queryFromId(id)).split(",")[0].trim();
  const category = meta?.category || "";
  const base = [
    `${place} famous landmark`,
    `${place} travel destination`,
  ];
  const byCategory = {
    Beaches: `${place} beach coastline`,
    Spiritual: `${place} temple church mosque spiritual site`,
    Mountains: `${place} mountains hills scenic`,
    Nature: `${place} nature landscape river lake waterfall`,
    History: `${place} historical monument heritage site`,
    Cities: `${place} city skyline architecture`,
    Adventure: `${place} adventure trekking scenic`,
  };
  const specific = byCategory[category] ? [byCategory[category]] : [];
  return [...specific, ...base];
}

function scoreCandidate(result, tokens, categoryQuery) {
  const title = String(result?.title || "").toLowerCase();
  const tags = Array.isArray(result?.tags) ? result.tags.join(" ").toLowerCase() : "";
  const text = `${title} ${tags}`;

  let score = 0;
  for (const t of tokens) if (text.includes(t)) score += 6;
  for (const t of categoryQuery.split(/\s+/)) if (t.length > 3 && text.includes(t.toLowerCase())) score += 2;
  if ((result?.width || 0) >= 1200) score += 4;
  if ((result?.height || 0) >= 800) score += 4;

  // Avoid human-centric results.
  if (/\b(person|people|portrait|man|woman|selfie|face|model)\b/i.test(text)) score -= 12;
  if (/\b(landmark|temple|church|mosque|cathedral|fort|palace|beach|mountain|waterfall|river|lake|forest|skyline|city)\b/i.test(text)) score += 5;

  return score;
}

function isUsableSourceUrl(url) {
  if (!url || !url.startsWith("http")) return false;
  if (url.includes("api.openverse.org/v1/images/")) return false;
  if (url.includes("upload.wikimedia.org") || url.includes("commons.wikimedia.org")) return false;
  return true;
}

async function fetchOpenverseCandidates(query) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=15&license_type=commercial`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "wander-wisely-explore-sync/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Openverse failed (${res.status}) for query "${query}"`);
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

async function fetchOpenverseBestImage(meta, id) {
  const queries = buildCategoryQueries(meta, id);
  const tokens = (meta?.name || queryFromId(id))
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

  let bestUrl = null;
  let bestThumb = null;
  let bestScore = -Infinity;
  for (const query of queries) {
    const results = await fetchOpenverseCandidates(query);
    for (const r of results) {
      const candidateUrl =
        (typeof r?.url === "string" && r.url.startsWith("http") && r.url) ||
        (typeof r?.thumbnail === "string" && r.thumbnail.startsWith("http") && r.thumbnail) ||
        null;
      if (!isUsableSourceUrl(candidateUrl)) continue;
      const score = scoreCandidate(r, tokens, query);
      if (score > bestScore) {
        bestScore = score;
        bestUrl = candidateUrl;
        bestThumb = typeof r?.thumbnail === "string" && isUsableSourceUrl(r.thumbnail) ? r.thumbnail : null;
      }
    }
  }
  if (!bestUrl) throw new Error(`No Openverse image found for "${id}"`);
  return { sourceUrl: bestUrl, thumbnailUrl: bestThumb };
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
    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id) ? id : `"${id}"`;
    lines.push(`  ${key}: [`);
    for (const u of urls) lines.push(`    "${u}",`);
    lines.push("  ],");
  }
  lines.push("};");
  return lines.join("\n");
}

async function main() {
  const content = await fs.readFile(TARGET_FILE, "utf8");
  const metaById = parseDestinationMeta(content);
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
    const meta = metaById.get(id);
    process.stdout.write(`[${idx}/${bounded.length}] ${id}: selecting best image... `);
    try {
      const { sourceUrl, thumbnailUrl } = await fetchOpenverseBestImage(meta, id);
      process.stdout.write("found, uploading... ");
      let secure;
      if (DRY_RUN) {
        secure = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/wander-wisely/explore/${id}`;
      } else {
        const publicId = `wander-wisely/explore/${id}-${sha1(sourceUrl).slice(0, 8)}`;
        try {
          const { buffer, contentType } = await downloadImage(sourceUrl);
          secure = await uploadToCloudinary(buffer, contentType, publicId);
        } catch (err) {
          const msg = String(err);
          const canFallback = msg.includes("File size too large") && thumbnailUrl && thumbnailUrl !== sourceUrl;
          if (!canFallback) throw err;
          const { buffer, contentType } = await downloadImage(thumbnailUrl);
          secure = await uploadToCloudinary(buffer, contentType, `${publicId}-thumb`);
        }
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

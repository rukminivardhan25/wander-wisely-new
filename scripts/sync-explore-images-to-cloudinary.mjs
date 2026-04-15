import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const TARGET_FILE = path.join(ROOT, "src", "lib", "destinations.ts");
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const DRY_RUN = process.argv.includes("--dry-run");
const FETCH_PROXY_MODE = process.argv.includes("--fetch-proxy");

if (!CLOUDINARY_CLOUD_NAME) {
  console.error("Missing CLOUDINARY_CLOUD_NAME.");
  process.exit(1);
}

if (!FETCH_PROXY_MODE && (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET)) {
  console.error(
    "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
  );
  process.exit(1);
}

function extractWikimediaUrls(content) {
  const regex = /https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[^\s"'`]+/g;
  return [...new Set(content.match(regex) || [])];
}

function sha1(input) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function makePublicId(url) {
  const hash = sha1(url).slice(0, 12);
  return `wander-wisely/explore/${hash}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadWithRetry(sourceUrl, retries = 4) {
  const candidates = [sourceUrl];
  const alt = toWikimediaFilePathUrl(sourceUrl);
  if (alt && alt !== sourceUrl) candidates.push(alt);

  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "wander-wisely-image-sync/1.0",
            Accept: "image/*,*/*;q=0.8",
          },
        });
        if (!res.ok) {
          throw new Error(`Download failed (${res.status}) from ${url}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return { buffer: Buffer.from(arrayBuffer), contentType };
      } catch (err) {
        lastErr = err;
      }
    }
    if (attempt < retries) await sleep(1200 * attempt);
  }
  throw lastErr;
}

function toWikimediaFilePathUrl(sourceUrl) {
  if (!sourceUrl.includes("upload.wikimedia.org/wikipedia/commons/")) return null;
  const lastSegment = sourceUrl.split("/").pop();
  if (!lastSegment) return null;
  const filename = decodeURIComponent(lastSegment.replace(/^\d+px-/, ""));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=1600`;
}

async function uploadToCloudinary(sourceUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=wander-wisely/explore&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = sha1(paramsToSign);
  const { buffer, contentType } = await downloadWithRetry(sourceUrl);
  const blob = new Blob([buffer], { type: contentType });

  const form = new FormData();
  form.append("file", blob, `${publicId.split("/").pop() || "image"}.jpg`);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", "wander-wisely/explore");
  form.append("public_id", publicId);
  form.append("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const res = await fetch(endpoint, { method: "POST", body: form });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Cloudinary upload failed for ${sourceUrl}: ${data?.error?.message || res.statusText}`);
  }
  return data.secure_url;
}

async function main() {
  const original = await fs.readFile(TARGET_FILE, "utf8");
  const urls = extractWikimediaUrls(original);

  if (urls.length === 0) {
    console.log("No Wikimedia URLs found in destinations.ts");
    return;
  }

  console.log(`Found ${urls.length} Wikimedia URLs.`);
  const replacements = new Map();

  if (FETCH_PROXY_MODE) {
    for (const url of urls) {
      const encoded = encodeURIComponent(url);
      const cloudinaryFetch = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/f_auto,q_auto/${encoded}`;
      replacements.set(url, cloudinaryFetch);
    }
    let updated = original;
    for (const [from, to] of replacements.entries()) {
      updated = updated.split(from).join(to);
    }
    if (!DRY_RUN) {
      await fs.writeFile(TARGET_FILE, updated, "utf8");
      console.log(`Updated ${TARGET_FILE} with Cloudinary fetch URLs.`);
    } else {
      console.log("Dry run complete (fetch-proxy mode). No file changes written.");
    }
    return;
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const publicId = makePublicId(url);
    process.stdout.write(`[${i + 1}/${urls.length}] ${DRY_RUN ? "Would upload" : "Uploading"}... `);

    if (DRY_RUN) {
      const fake = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
      replacements.set(url, fake);
      process.stdout.write("ok (dry run)\n");
      continue;
    }

    try {
      const secureUrl = await uploadToCloudinary(url, publicId);
      replacements.set(url, secureUrl);
      process.stdout.write("ok\n");
      await sleep(500);
    } catch (err) {
      process.stdout.write("failed\n");
      console.error(String(err));
      throw err;
    }
  }

  let updated = original;
  for (const [from, to] of replacements.entries()) {
    updated = updated.split(from).join(to);
  }

  if (!DRY_RUN) {
    await fs.writeFile(TARGET_FILE, updated, "utf8");
    console.log(`Updated ${TARGET_FILE} with Cloudinary URLs.`);
  } else {
    console.log("Dry run complete. No file changes written.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Unsplash API: get photo URLs for places (realistic photos). Tries multiple queries with fallbacks.
 * Get access key at https://unsplash.com/oauth/applications
 */

const UNSPLASH_SEARCH = "https://api.unsplash.com/search/photos";
const UNSPLASH_TIMEOUT_MS = 8000;

export async function getPhotoForPlace(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    query: query.trim() || "travel destination",
    per_page: "1",
    orientation: "landscape",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UNSPLASH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${UNSPLASH_SEARCH}?${params}`, {
      signal: controller.signal,
      headers: { Authorization: `Client-ID ${key}` },
    });
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
  clearTimeout(timeoutId);

  if (!res.ok) return null;
  const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string } }> };
  return data.results?.[0]?.urls?.regular ?? null;
}

/** Try multiple queries in order; return first successful URL. Reduces blank images. */
export async function getPhotoWithFallbacks(queries: string[]): Promise<string | null> {
  for (const q of queries) {
    if (!q.trim()) continue;
    const url = await getPhotoForPlace(q.trim());
    if (url) return url;
  }
  return null;
}

/** Get up to maxUrls images for a day (e.g. main place + destination) to use as hero and background. */
export async function getDayImages(mainPlace: string, destination: string, maxUrls = 2): Promise<string[]> {
  const querySets = [
    [mainPlace, `${mainPlace} ${destination}`, destination],
    [destination, `${destination} travel`, mainPlace],
  ];

  const settled = await Promise.allSettled(
    querySets.slice(0, maxUrls).map((queries) => getPhotoWithFallbacks(queries))
  );
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of settled) {
    if (item.status !== "fulfilled" || !item.value || seen.has(item.value)) continue;
    seen.add(item.value);
    urls.push(item.value);
  }
  return urls;
}

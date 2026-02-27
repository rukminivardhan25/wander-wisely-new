/**
 * Shared Overpass API fetch with fallbacks for CORS / "unable to fetch".
 * Tries: POST → GET (no preflight) → GET via CORS proxy.
 */

// Official Overpass API (reference implementation); fallback to CORS-friendly instance
const OVERPASS_PRIMARY = "https://overpass-api.de/api/interpreter";
const OVERPASS_FALLBACK = "https://overpass.kumi.systems/api/interpreter";
const CORS_PROXY = "https://corsproxy.io/?";

export type OverpassFetchOptions = {
  userAgent?: string;
  timeoutMs?: number;
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/** Run an Overpass query; throws on non-OK or network error. Returns parsed JSON. */
export async function overpassFetch<T = { elements?: unknown[] }>(
  query: string,
  options: OverpassFetchOptions = {}
): Promise<T> {
  const { userAgent = "Wanderly/1.0", timeoutMs = 30000 } = options;
  const body = `data=${encodeURIComponent(query)}`;
  const headers: HeadersInit = { "User-Agent": userAgent };

  const endpoints = [OVERPASS_PRIMARY, OVERPASS_FALLBACK];
  let lastError: unknown;
  for (const base of endpoints) {
    const getUrl = `${base}?data=${encodeURIComponent(query)}`;
    for (const attempt of [
      () =>
        fetchWithTimeout(
          base,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
            body,
          },
          timeoutMs
        ),
      () => fetchWithTimeout(getUrl, { method: "GET", headers }, timeoutMs),
    ]) {
      try {
        const res = await attempt();
        if (!res.ok) {
          throw new Error(
            res.status === 400
              ? "Restaurant data isn't available for this spot right now. Try again in a moment or another area."
              : res.status === 429
                ? "Too many requests. Please wait a moment and try again."
                : `Map service error (${res.status}). Try again later.`
          );
        }
        return (await res.json()) as T;
      } catch (err) {
        lastError = err;
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("Request timed out. Try again.");
        }
      }
    }
  }
  // Last resort: CORS proxy with fallback endpoint
  try {
    const getUrl = `${OVERPASS_FALLBACK}?data=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(
      CORS_PROXY + encodeURIComponent(getUrl),
      { method: "GET", headers: { "User-Agent": userAgent } },
      timeoutMs
    );
    if (res.ok) return (await res.json()) as T;
  } catch {
    // ignore
  }

  if (lastError instanceof Error) {
    if (lastError.message.includes("fetch") || lastError.message.includes("Failed to fetch")) {
      throw new Error("Unable to reach map service. Check your connection and try again.");
    }
    if (lastError.message.startsWith("Map service")) throw lastError;
    throw new Error("Map data is temporarily unavailable for this area. Try another location or use your current location.");
  }
  throw new Error("Map data is temporarily unavailable. Try another location or use your current location.");
}

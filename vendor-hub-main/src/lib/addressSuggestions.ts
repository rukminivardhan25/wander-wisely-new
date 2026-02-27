/**
 * Address suggestions for partner portal (e.g. Exact Location on Create Experience).
 * Uses Nominatim (OpenStreetMap) only; no current location, no API key.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PartnerPortal-Experience/1.0 (listing form)";

export type AddressSuggestion = {
  lat: number;
  lon: number;
  displayName: string;
};

/** Fetch address suggestions as user types. No backend required. */
export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "8",
    addressdetails: "1",
  });
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { "Accept-Language": "en", "User-Agent": USER_AGENT },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const items = Array.isArray(data) ? data : [];
    return items
      .filter((item) => item?.lat != null && item?.lon != null)
      .slice(0, 8)
      .map((item) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name ?? `${item.lat}, ${item.lon}`,
      }));
  } catch {
    return [];
  }
}

/** Geocode a single query to lat/lon + display name (e.g. when user selects or blurs). */
export async function geocodeAddress(query: string): Promise<AddressSuggestion | null> {
  const q = query.trim();
  if (!q) return null;
  const params = new URLSearchParams({ q, format: "json", limit: "1" });
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { "Accept-Language": "en", "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) return null;
    return {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      displayName: first.display_name ?? q,
    };
  } catch {
    return null;
  }
}

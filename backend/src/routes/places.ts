/**
 * Places API – 100% free, OpenStreetMap only (Nominatim + Overpass).
 * No API key or payment. All requests proxied from backend for reliability.
 */
import { Router, Request, Response } from "express";

const router = Router();
const USER_AGENT = "Wanderly-NearbyRestaurants/1.0 (travel app; backend proxy)";
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const OVERPASS_PRIMARY = "https://overpass-api.de/api/interpreter";
const OVERPASS_ALT = "https://overpass.kumi.systems/api/interpreter";

const headers = { "Accept-Language": "en", "User-Agent": USER_AGENT };

/** Fallback sample restaurants when Overpass fails – so Indian cities always show results. */
const FALLBACK_RESTAURANTS: Array<{ id: string; name: string; address: string; lat: number; lon: number; cuisine?: string }> = [
  { id: "fb-1", name: "Chutneys", address: "Ameerpet, Hyderabad", lat: 17.4378, lon: 78.4736, cuisine: "South Indian" },
  { id: "fb-2", name: "Paradise Biryani", address: "Ameerpet, Hyderabad", lat: 17.4382, lon: 78.4741, cuisine: "Biryani" },
  { id: "fb-3", name: "Cafe Coffee Day", address: "Ameerpet, Hyderabad", lat: 17.4365, lon: 78.4722, cuisine: "Cafe" },
  { id: "fb-4", name: "Bikanervala", address: "Ameerpet, Hyderabad", lat: 17.4391, lon: 78.4755, cuisine: "North Indian" },
  { id: "fb-5", name: "McDonald's", address: "Ameerpet, Hyderabad", lat: 17.4358, lon: 78.4710, cuisine: "Fast food" },
  { id: "fb-6", name: "Ohri's", address: "Banjara Hills, Hyderabad", lat: 17.4231, lon: 78.4732, cuisine: "Multi-cuisine" },
  { id: "fb-7", name: "Taj Mahal Restaurant", address: "Banjara Hills, Hyderabad", lat: 17.4245, lon: 78.4748, cuisine: "North Indian" },
  { id: "fb-8", name: "Barbeque Nation", address: "Jubilee Hills, Hyderabad", lat: 17.4178, lon: 78.4720, cuisine: "Barbeque" },
  { id: "fb-9", name: "Cafe Niloufer", address: "Banjara Hills, Hyderabad", lat: 17.4220, lon: 78.4715, cuisine: "Bakery, Cafe" },
  { id: "fb-10", name: "Pista House", address: "Gachibowli, Hyderabad", lat: 17.4402, lon: 78.3821, cuisine: "Biryani" },
  { id: "fb-11", name: "Dine Hill", address: "Madhapur, Hyderabad", lat: 17.4482, lon: 78.3902, cuisine: "Multi-cuisine" },
  { id: "fb-12", name: "Minerva Coffee Shop", address: "Ameerpet, Hyderabad", lat: 17.4368, lon: 78.4730, cuisine: "South Indian" },
  { id: "fb-13", name: "LMB (Laxmi Misthan Bhandar)", address: "Johari Bazaar, Jaipur", lat: 26.9234, lon: 75.8196, cuisine: "Rajasthani" },
  { id: "fb-14", name: "Tapri Central", address: "C-Scheme, Jaipur", lat: 26.9024, lon: 75.7962, cuisine: "Cafe" },
  { id: "fb-15", name: "Spice Court", address: "MI Road, Jaipur", lat: 26.9089, lon: 75.8012, cuisine: "North Indian" },
  { id: "fb-16", name: "Peshawri", address: "Jaipur", lat: 26.9261, lon: 75.8095, cuisine: "North Indian" },
  { id: "fb-17", name: "Anokhi Cafe", address: "C-Scheme, Jaipur", lat: 26.9012, lon: 75.7945, cuisine: "Cafe" },
  { id: "fb-18", name: "Handi Restaurant", address: "MI Road, Jaipur", lat: 26.9078, lon: 75.7998, cuisine: "Mughlai" },
  { id: "fb-19", name: "Surya Mahal", address: "Bani Park, Jaipur", lat: 26.9156, lon: 75.7854, cuisine: "Rajasthani" },
  { id: "fb-20", name: "Niros", address: "MI Road, Jaipur", lat: 26.9095, lon: 75.8025, cuisine: "Multi-cuisine" },
];

/** Rough bounding box for India – use fallback when Overpass fails inside this region. */
function isInIndia(lat: number, lon: number): boolean {
  return lat >= 8 && lat <= 35 && lon >= 68 && lon <= 97;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** GET /api/places/geocode?q=... — Geocode using Nominatim (OSM). */
router.get("/geocode", async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string)?.trim();
  if (!q) {
    res.status(400).json({ error: "Missing query parameter: q" });
    return;
  }
  try {
    const params = new URLSearchParams({ q, format: "json", limit: "1" });
    const resp = await fetch(`${NOMINATIM_SEARCH}?${params}`, { headers });
    if (!resp.ok) {
      res.status(resp.status).json({ error: "Geocoding failed. Try again." });
      return;
    }
    const data = (await resp.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.json({
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      displayName: first.display_name ?? q,
    });
  } catch (e) {
    console.error("Places geocode error:", e);
    res.status(502).json({ error: "Geocoding failed. Try again." });
  }
});

/** GET /api/places/reverse?lat=&lon= — Reverse geocode using Nominatim (OSM). */
router.get("/reverse", async (req: Request, res: Response): Promise<void> => {
  const lat = parseFloat((req.query.lat as string) ?? "");
  const lon = parseFloat((req.query.lon as string) ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({ error: "Valid lat and lon required" });
    return;
  }
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "json", zoom: "18" });
    const resp = await fetch(`${NOMINATIM_REVERSE}?${params}`, { headers });
    if (!resp.ok) {
      res.status(resp.status).json({ error: "Reverse geocoding failed." });
      return;
    }
    const data = (await resp.json()) as { display_name?: string; address?: Record<string, string> };
    let displayName = data?.display_name;
    if (!displayName && data?.address) {
      const a = data.address;
      displayName = [a.road, a.suburb, a.neighbourhood, a.city, a.town, a.state, a.country].filter(Boolean).join(", ");
    }
    res.json({ lat, lon, displayName: displayName ?? `${lat}, ${lon}` });
  } catch (e) {
    console.error("Places reverse error:", e);
    res.status(502).json({ error: "Reverse geocoding failed. Try again." });
  }
});

/** GET /api/places/suggestions?q=... — Location suggestions using Nominatim (OSM). */
router.get("/suggestions", async (req: Request, res: Response): Promise<void> => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }
  try {
    const params = new URLSearchParams({ q, format: "json", limit: "8", addressdetails: "1" });
    const resp = await fetch(`${NOMINATIM_SEARCH}?${params}`, { headers });
    if (!resp.ok) {
      res.json({ suggestions: [] });
      return;
    }
    const data = (await resp.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const items = Array.isArray(data) ? data : [];
    const suggestions = items
      .filter((item) => item?.lat != null && item?.lon != null)
      .slice(0, 8)
      .map((item) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name ?? `${item.lat}, ${item.lon}`,
      }));
    res.json({ suggestions });
  } catch (e) {
    console.error("Places suggestions error:", e);
    res.json({ suggestions: [] });
  }
});

/** GET /api/places/nearby-restaurants?lat=&lon=&radius=... — Nearby restaurants via Overpass (OSM). POST only, small radius, multiple endpoints. */
router.get("/nearby-restaurants", async (req: Request, res: Response): Promise<void> => {
  const lat = parseFloat((req.query.lat as string) ?? "");
  const lng = parseFloat((req.query.lon as string) ?? "");
  const requestedRadius = Math.min(400, Math.max(150, parseInt((req.query.radius as string) ?? "250", 10) || 250));
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "Valid lat and lon required" });
    return;
  }
  const endpoints = [OVERPASS_PRIMARY, OVERPASS_ALT];
  let data: { elements?: Array<{ id: string; type: string; lat?: number; lon?: number; tags?: Record<string, unknown> }> } | null = null;
  const radii = [requestedRadius, Math.floor(requestedRadius / 2)].filter((r) => r >= 150);
  for (const baseUrl of endpoints) {
    for (const r of radii) {
      const around = `(around:${r},${lat},${lng})`;
      const query = `[out:json][timeout:8];(node${around}["amenity"="restaurant"];node${around}["amenity"="fast_food"];node${around}["amenity"="cafe"]);out 25;`;
      const body = `data=${encodeURIComponent(query)}`;
      try {
        const resp = await fetch(baseUrl, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
          body,
          signal: AbortSignal.timeout(15000),
        });
        if (resp.ok) {
          data = (await resp.json()) as typeof data;
          break;
        }
        const errText = await resp.text().catch(() => "");
        if (errText && errText.length < 500) console.warn("Overpass non-OK", baseUrl, resp.status, errText.slice(0, 200));
      } catch (e) {
        console.warn("Overpass fetch failed", baseUrl, r, e);
      }
      if (data?.elements) break;
    }
    if (data?.elements) break;
  }
  try {
    if (!data || !Array.isArray(data.elements) || data.elements.length === 0) {
      if (isInIndia(lat, lng)) {
        const fallbackList = FALLBACK_RESTAURANTS.map((r) => ({
          id: r.id,
          name: r.name,
          address: r.address,
          lat: r.lat,
          lon: r.lon,
          distanceKm: Math.round(distanceKm(lat, lng, r.lat, r.lon) * 100) / 100,
          cuisine: r.cuisine,
        }));
        fallbackList.sort((a, b) => a.distanceKm - b.distanceKm);
        res.json({ restaurants: fallbackList, fallback: true });
        return;
      }
      res.status(502).json({ error: "Restaurant data isn't available for this spot right now. Try again in a moment or another area." });
      return;
    }
    const elements = data.elements;
    const seen = new Set<string>();
    const restaurants: Array<{
      id: string;
      name: string;
      address: string;
      lat: number;
      lon: number;
      distanceKm: number;
      cuisine?: string;
      imageUrl?: string;
    }> = [];
    for (const el of elements) {
      const name = el.tags?.name;
      if (!name || typeof name !== "string") continue;
      const plat = typeof el.lat === "number" ? el.lat : el.lat != null ? parseFloat(String(el.lat)) : NaN;
      const plon = typeof el.lon === "number" ? el.lon : el.lon != null ? parseFloat(String(el.lon)) : NaN;
      if (Number.isNaN(plat) || Number.isNaN(plon) || plat < -90 || plat > 90 || plon < -180 || plon > 180) continue;
      const id = `${el.type}-${el.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const addressParts = [
        el.tags?.["addr:street"],
        el.tags?.["addr:suburb"],
        el.tags?.["addr:city"],
        el.tags?.["addr:state"],
        el.tags?.["addr:postcode"],
      ].filter(Boolean) as string[];
      const address = addressParts.length > 0 ? addressParts.join(", ") : "";
      let imageUrl: string | undefined;
      const imgTag = el.tags?.image ?? el.tags?.["image:url"];
      if (typeof imgTag === "string" && (imgTag.startsWith("http://") || imgTag.startsWith("https://"))) {
        imageUrl = imgTag;
      }
      const cuisine = typeof el.tags?.cuisine === "string"
        ? el.tags.cuisine
        : Array.isArray(el.tags?.cuisine)
          ? (el.tags.cuisine as string[]).join(", ")
          : (el.tags?.diet as string) ?? undefined;
      restaurants.push({
        id,
        name,
        address,
        lat: plat,
        lon: plon,
        distanceKm: Math.round(distanceKm(lat, lng, plat, plon) * 100) / 100,
        cuisine,
        imageUrl,
      });
    }
    restaurants.sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ restaurants: restaurants.slice(0, 50) });
  } catch (e) {
    console.error("Places nearby-restaurants error:", e);
    res.status(502).json({ error: "Restaurant data isn't available for this spot right now. Try again in a moment or another area." });
  }
});

export default router;

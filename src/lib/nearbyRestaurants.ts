/**
 * Nearby Restaurants – 100% free OpenStreetMap (Nominatim + Overpass).
 * Uses backend /api/places when available (more reliable); falls back to direct OSM from browser.
 */

import { getApiUrl } from "@/lib/api";
import { overpassFetch } from "@/lib/overpassFetch";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Wanderlust-NearbyRestaurants/1.0 (travel app)";

export type GeoResult = {
  lat: number;
  lon: number;
  displayName: string;
};

export type RestaurantResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  distanceKm: number;
  cuisine?: string;
  rating?: number;
  reviewCount?: number;
  /** When set, rating/reviewCount are from this source (e.g. Google) */
  ratingSource?: "google" | "osm";
  /** Image URL from OSM tags when available; otherwise use placeholder */
  imageUrl?: string;
  openNow?: boolean;
};

/** Reverse geocode coordinates to an address. Tries Google (backend) first, then Nominatim. */
export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  try {
    const res = await fetch(getApiUrl(`/api/places/reverse?lat=${lat}&lon=${lon}`));
    if (res.ok) {
      const data = await res.json();
      if (data?.lat != null && data?.lon != null && data?.displayName) {
        return { lat: data.lat, lon: data.lon, displayName: data.displayName };
      }
    }
  } catch {
    // fall back to Nominatim
  }
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "json",
    zoom: "18",
  });
  const res = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
    headers: { "Accept-Language": "en", "User-Agent": USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  let displayName = data?.display_name;
  if (!displayName && data?.address) {
    const a = data.address;
    displayName = [a.road, a.suburb, a.neighbourhood, a.city, a.town, a.state, a.country].filter(Boolean).join(", ");
  }
  if (!displayName) return null;
  return {
    lat: Number(lat),
    lon: Number(lon),
    displayName: String(displayName),
  };
}

/** Geocode a place name to lat/lon. Tries Google (backend) first, then Nominatim. */
export async function geocode(query: string): Promise<GeoResult | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const res = await fetch(getApiUrl(`/api/places/geocode?q=${encodeURIComponent(q)}`));
    if (res.ok) {
      const data = await res.json();
      if (data?.lat != null && data?.lon != null) {
        return {
          lat: data.lat,
          lon: data.lon,
          displayName: data.displayName ?? q,
        };
      }
    }
  } catch {
    // fall back to Nominatim
  }
  const params = new URLSearchParams({
    q: query.trim(),
    format: "json",
    limit: "1",
  });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "Accept-Language": "en", "User-Agent": USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first?.lat || !first?.lon) return null;
  return {
    lat: parseFloat(first.lat),
    lon: parseFloat(first.lon),
    displayName: first.display_name ?? q,
  };
}

/** Fetch location suggestions for autocomplete. Tries Google (backend) first, then Nominatim. */
export async function searchLocationSuggestions(query: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  try {
    const res = await fetch(getApiUrl(`/api/places/suggestions?q=${encodeURIComponent(q)}`));
    if (res.ok) {
      const data = await res.json();
      const list = data?.suggestions ?? [];
      if (Array.isArray(list) && list.length > 0) {
        return list
          .filter((s: { lat?: number; lon?: number; displayName?: string }) => s?.lat != null && s?.lon != null && s?.displayName)
          .map((s: { lat: number; lon: number; displayName: string }) => ({
            lat: s.lat,
            lon: s.lon,
            displayName: s.displayName,
          }));
      }
    }
  } catch {
    // fall back to Nominatim
  }
  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "8",
    addressdetails: "1",
  });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "Accept-Language": "en", "User-Agent": USER_AGENT },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data) ? data : [];
  return items
    .filter((item: { lat?: string; lon?: string }) => item?.lat != null && item?.lon != null)
    .map((item: { lat: string; lon: string; display_name?: string }) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name ?? `${item.lat}, ${item.lon}`,
    }));
}

/** Haversine distance in km. */
function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type FetchNearbyRestaurantsResult = { list: RestaurantResult[]; fallback?: boolean };

/** Fetch nearby restaurants. Uses backend (OSM) or direct Overpass; backend may return sample list when live data unavailable. */
export async function fetchNearbyRestaurants(
  lat: number,
  lon: number,
  radiusMetres: number = 250
): Promise<FetchNearbyRestaurantsResult> {
  const radius = Math.min(radiusMetres, 400);
  try {
    const res = await fetch(getApiUrl(`/api/places/nearby-restaurants?lat=${lat}&lon=${lon}&radius=${radius}`));
    if (res.ok) {
      const data = await res.json();
      const list = data?.restaurants ?? [];
      if (Array.isArray(list)) {
        return { list: list.slice(0, 50), fallback: data?.fallback === true };
      }
    }
    if (res.status === 502) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error ?? "Restaurant data isn't available for this spot right now. Try again in a moment or another area.";
      throw new Error(msg);
    }
  } catch (e) {
    if (e instanceof Error && e.message.length > 0) throw e;
    // fall back to Overpass
  }

  const radiusOSM = Math.min(radiusMetres, 400);
  const around = `(around:${radiusOSM},${lat},${lon})`;
  const query = `[out:json][timeout:6];(node${around}["amenity"="restaurant"];node${around}["amenity"="fast_food"];node${around}["amenity"="cafe"]);out 30;`;

  const data = await overpassFetch<{ elements?: unknown[] }>(query, {
    userAgent: USER_AGENT,
  });
  const elements = data?.elements ?? [];
  const results: RestaurantResult[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const name = el.tags?.name;
    if (!name || typeof name !== "string") continue;
    // Overpass nodes have top-level lat/lon (latitude, longitude in that order)
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
    ].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(", ") : "";

    let imageUrl: string | undefined;
    const imgTag = el.tags?.image ?? el.tags?.["image:url"];
    if (typeof imgTag === "string" && (imgTag.startsWith("http://") || imgTag.startsWith("https://"))) {
      imageUrl = imgTag;
    }

    results.push({
      id,
      name,
      address,
      lat: plat,
      lon: plon,
      distanceKm: distanceKm(lat, lon, plat, plon),
      cuisine: typeof el.tags?.cuisine === "string" ? el.tags.cuisine : Array.isArray(el.tags?.cuisine) ? el.tags.cuisine.join(", ") : el.tags?.diet ?? undefined,
      imageUrl,
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return { list: results.slice(0, 50) };
}

/** OpenStreetMap link for a point (latitude, longitude). */
export function osmMapUrl(lat: number, lon: number, zoom: number = 17): string {
  return `https://www.openstreetmap.org/?mlat=${fmtCoord(lat)}&mlon=${fmtCoord(lon)}&zoom=${zoom}`;
}

/** Format lat/lon for URLs (avoid locale/string issues). */
function fmtCoord(n: number): string {
  return Number(n).toFixed(6);
}

/** Google Maps directions from user/search center to restaurant. Origin and destination are latitude,longitude. */
export function googleMapsDirectionsUrl(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${fmtCoord(fromLat)},${fmtCoord(fromLon)}&destination=${fmtCoord(toLat)},${fmtCoord(toLon)}`;
}

/** Google Maps directions from current location (auto-detected by Google) to destination. Use this so "From" is filled automatically. */
export function googleMapsDirectionsFromCurrentUrl(toLat: number, toLon: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${fmtCoord(toLat)},${fmtCoord(toLon)}`;
}

/** Google Maps link that centers the map on exact coordinates (so the correct pin shows, not a search result). */
export function googleMapsPlaceUrl(lat: number, lon: number, placeName?: string): string {
  const latStr = fmtCoord(lat);
  const lonStr = fmtCoord(lon);
  if (placeName && placeName.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName.trim())}+@${latStr},${lonStr}`;
  }
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${latStr},${lonStr}&zoom=17`;
}

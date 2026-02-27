/**
 * Nearby Utilities & Essentials – OpenStreetMap (Nominatim + Overpass).
 * Discovery-only: ATMs, hospitals, pharmacy, police, fuel, EV charging,
 * bus stop, railway, airport, restroom, parking. No vendors, no bookings.
 */

import {
  geocode,
  reverseGeocode,
  googleMapsPlaceUrl,
  googleMapsDirectionsFromCurrentUrl,
  type GeoResult,
} from "@/lib/nearbyRestaurants";
import { overpassFetch } from "@/lib/overpassFetch";

const USER_AGENT = "Wanderly-NearbyUtilities/1.0 (travel app)";

export { geocode, reverseGeocode, googleMapsPlaceUrl, googleMapsDirectionsFromCurrentUrl, type GeoResult };

/** Utility categories – one selection at a time. */
export const UTILITY_CATEGORIES = [
  { value: "atm", label: "ATM", icon: "atm" },
  { value: "hospital", label: "Hospital", icon: "hospital" },
  { value: "pharmacy", label: "Pharmacy", icon: "pharmacy" },
  { value: "police", label: "Police Station", icon: "police" },
  { value: "fuel", label: "Petrol Pump", icon: "fuel" },
  { value: "ev_charging", label: "EV Charging", icon: "ev" },
  { value: "bus_stop", label: "Bus Stop", icon: "bus" },
  { value: "railway", label: "Railway Station", icon: "railway" },
  { value: "airport", label: "Airport", icon: "airport" },
  { value: "toilets", label: "Public Restroom", icon: "toilets" },
  { value: "parking", label: "Parking", icon: "parking" },
] as const;

export type UtilityCategory = (typeof UTILITY_CATEGORIES)[number]["value"];

export type UtilityResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  distanceKm: number;
  category: UtilityCategory;
  imageUrl?: string;
  openNow?: boolean;
  phone?: string;
};

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
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Build Overpass query. Format per wiki: [out:json][timeout:N];node(around:r,lat,lon)["k"="v"];out; */
function buildOverpassQuery(
  lat: number,
  lon: number,
  radiusMetres: number,
  category: UtilityCategory
): string {
  const r = Math.min(radiusMetres, 10000);
  const latStr = String(Number(lat));
  const lonStr = String(Number(lon));
  const around = `(around:${r},${latStr},${lonStr})`;
  const prefix = "[out:json][timeout:15];";
  const suffix = ";out;";
  const one = (filter: string) => `${prefix}node${around}${filter}${suffix}`;
  switch (category) {
    case "atm":
      return one(`["amenity"="atm"]`);
    case "hospital":
      return one(`["amenity"="hospital"]`);
    case "pharmacy":
      return `${prefix}(node${around}["amenity"="pharmacy"];node${around}["healthcare"="pharmacy"])${suffix}`;
    case "police":
      return one(`["amenity"="police"]`);
    case "fuel":
      return one(`["amenity"="fuel"]`);
    case "ev_charging":
      return one(`["amenity"="charging_station"]`);
    case "bus_stop":
      return `${prefix}(node${around}["highway"="bus_stop"];node${around}["public_transport"="stop_position"]["bus"="yes"])${suffix}`;
    case "railway":
      return one(`["railway"="station"]`);
    case "airport":
      return `${prefix}(node${around}["aeroway"="aerodrome"];node${around}["aeroway"="terminal"])${suffix}`;
    case "toilets":
      return one(`["amenity"="toilets"]`);
    case "parking":
      return one(`["amenity"="parking"]`);
    default:
      return one(`["amenity"]`);
  }
}

/** Fetch nearby places for one utility category. */
export async function fetchNearbyUtilities(
  lat: number,
  lon: number,
  radiusMetres: number,
  category: UtilityCategory
): Promise<UtilityResult[]> {
  const query = buildOverpassQuery(lat, lon, radiusMetres, category);
  const data = await overpassFetch<{ elements?: unknown[] }>(query, {
    userAgent: USER_AGENT,
  });
  const elements = data?.elements ?? [];
  const results: UtilityResult[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const plat = typeof el.lat === "number" ? el.lat : el.lat != null ? parseFloat(String(el.lat)) : NaN;
    const plon = typeof el.lon === "number" ? el.lon : el.lon != null ? parseFloat(String(el.lon)) : NaN;
    if (Number.isNaN(plat) || Number.isNaN(plon) || plat < -90 || plat > 90 || plon < -180 || plon > 180) continue;

    const name = el.tags?.name ?? el.tags?.ref ?? `${category} ${el.id}`;
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
    const phone = el.tags?.["contact:phone"] ?? el.tags?.phone;

    let imageUrl: string | undefined;
    const img = el.tags?.image ?? el.tags?.["image:url"];
    if (typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))) imageUrl = img;

    results.push({
      id,
      name: String(name),
      address,
      lat: plat,
      lon: plon,
      distanceKm: distanceKm(lat, lon, plat, plon),
      category,
      imageUrl,
      phone,
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results.slice(0, 50);
}

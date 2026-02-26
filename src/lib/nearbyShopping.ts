/**
 * Nearby Shopping – OpenStreetMap (Nominatim + Overpass).
 * Discovery-only: no vendors, no bookings. Data from OSM.
 */

import {
  geocode,
  reverseGeocode,
  googleMapsPlaceUrl,
  googleMapsDirectionsFromCurrentUrl,
  type GeoResult,
} from "@/lib/nearbyRestaurants";
import { overpassFetch } from "@/lib/overpassFetch";

const USER_AGENT = "Wanderlust-NearbyShopping/1.0 (travel app)";

export { geocode, reverseGeocode, googleMapsPlaceUrl, googleMapsDirectionsFromCurrentUrl, type GeoResult };

/** Where to shop – area/place type */
export const SHOP_AREA_TYPES = [
  { value: "mall", label: "Mall" },
  { value: "street", label: "Street shopping" },
  { value: "local_market", label: "Local market" },
  { value: "shopping_complex", label: "Shopping complex" },
  { value: "flea_market", label: "Flea market" },
  { value: "wholesale", label: "Wholesale market" },
] as const;
export type ShopAreaType = (typeof SHOP_AREA_TYPES)[number]["value"];

/** What to buy – product category (maps to OSM shop=* and related) */
export const SHOP_CATEGORIES = [
  { value: "clothes", label: "Clothes" },
  { value: "shoes", label: "Shoes / Footwear" },
  { value: "accessories", label: "Accessories" },
  { value: "electronics", label: "Electronics" },
  { value: "handicrafts", label: "Handicrafts" },
  { value: "souvenirs", label: "Souvenirs" },
  { value: "groceries", label: "Groceries" },
  { value: "jewelry", label: "Jewelry" },
] as const;
export type ShopCategory = (typeof SHOP_CATEGORIES)[number]["value"];

/** OSM shop=* values we query; category value -> OSM shop tags */
const CATEGORY_TO_OSM_SHOP: Record<ShopCategory, string[]> = {
  clothes: ["clothes", "fashion", "boutique"],
  shoes: ["shoes", "footwear"],
  accessories: ["bag", "jewelry", "watches", "optician"],
  electronics: ["electronics", "mobile_phone", "computer", "hifi"],
  handicrafts: ["craft", "art", "gallery"],
  souvenirs: ["gift", "souvenirs", "craft"],
  groceries: ["supermarket", "convenience", "greengrocer", "bakery", "butcher", "deli"],
  jewelry: ["jewelry", "watches"],
};

/** Area type -> OSM filter (building, amenity, or broad shop for "any") */
function areaTypeToOverpassFilter(areaType: ShopAreaType): string {
  const radius = "{{radius}}";
  const lat = "{{lat}}";
  const lon = "{{lon}}";
  const base = `(around:${radius},${lat},${lon})`;
  switch (areaType) {
    case "mall":
      return `node["building"="mall"]${base}; node["shop"="mall"]${base};`;
    case "street":
      return `node["shop"]${base};`;
    case "local_market":
      return `node["amenity"="marketplace"]${base}; node["shop"="market"]${base};`;
    case "shopping_complex":
      return `node["building"="retail"]${base}; node["shop"]${base};`;
    case "flea_market":
      return `node["amenity"="marketplace"]${base}; node["shop"="second_hand"]${base};`;
    case "wholesale":
      return `node["shop"="wholesale"]${base}; node["wholesale"]${base};`;
    default:
      return `node["shop"]${base}; node["amenity"="marketplace"]${base};`;
  }
}

export type ShopResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  distanceKm: number;
  /** e.g. mall, street, local_market */
  areaType?: string;
  /** e.g. clothes, electronics */
  category?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  openNow?: boolean;
};

/** Fallback sample shops when Overpass fails (India). */
const FALLBACK_SHOPS: Array<{ id: string; name: string; address: string; lat: number; lon: number; areaType: ShopAreaType; category: ShopCategory }> = [
  { id: "fs-1", name: "Chandpole Bazaar", address: "Chandpole, Jaipur", lat: 26.9189, lon: 75.8123, areaType: "street", category: "handicrafts" },
  { id: "fs-2", name: "Johari Bazaar", address: "Johari Bazaar, Jaipur", lat: 26.9234, lon: 75.8196, areaType: "street", category: "jewelry" },
  { id: "fs-3", name: "Pink Square Mall", address: "Malviya Nagar, Jaipur", lat: 26.8601, lon: 75.8067, areaType: "mall", category: "clothes" },
  { id: "fs-4", name: "Bapu Bazaar", address: "Bapu Bazaar, Jaipur", lat: 26.9089, lon: 75.8012, areaType: "street", category: "souvenirs" },
  { id: "fs-5", name: "Tripolia Bazaar", address: "Tripolia Bazaar, Jaipur", lat: 26.9261, lon: 75.8095, areaType: "street", category: "handicrafts" },
  { id: "fs-6", name: "GVK One Mall", address: "Banjara Hills, Hyderabad", lat: 17.4231, lon: 78.4732, areaType: "mall", category: "electronics" },
  { id: "fs-7", name: "Shilparamam", address: "Madhapur, Hyderabad", lat: 17.4482, lon: 78.3902, areaType: "local_market", category: "handicrafts" },
  { id: "fs-8", name: "Abids Market", address: "Abids, Hyderabad", lat: 17.3922, lon: 78.4745, areaType: "street", category: "clothes" },
  { id: "fs-9", name: "Sultan Bazaar", address: "Koti, Hyderabad", lat: 17.3856, lon: 78.4789, areaType: "street", category: "shoes" },
  { id: "fs-10", name: "Forum Mall", address: "Kukatpally, Hyderabad", lat: 17.4912, lon: 78.3923, areaType: "mall", category: "clothes" },
  { id: "fs-11", name: "MI Road Footwear", address: "MI Road, Jaipur", lat: 26.9078, lon: 75.7998, areaType: "street", category: "shoes" },
  { id: "fs-12", name: "Kishanpole Bazaar", address: "Kishanpole, Jaipur", lat: 26.9201, lon: 75.8156, areaType: "street", category: "clothes" },
];

function isInIndia(lat: number, lon: number): boolean {
  return lat >= 8 && lat <= 35 && lon >= 68 && lon <= 97;
}

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

function getCategoryFromTags(tags: Record<string, unknown>): string | undefined {
  const shop = tags?.shop;
  if (typeof shop !== "string") return undefined;
  for (const [cat, osmValues] of Object.entries(CATEGORY_TO_OSM_SHOP)) {
    if (osmValues.some((v) => shop === v || shop.includes(v))) return cat;
  }
  return shop;
}

function getAreaTypeFromTags(tags: Record<string, unknown>): string | undefined {
  if (tags?.building === "mall" || tags?.shop === "mall") return "mall";
  if (tags?.amenity === "marketplace" || tags?.shop === "market") return "local_market";
  if (tags?.shop === "wholesale" || tags?.wholesale) return "wholesale";
  if (tags?.shop === "second_hand") return "flea_market";
  if (tags?.building === "retail") return "shopping_complex";
  if (tags?.shop) return "street";
  return undefined;
}

/** Fetch nearby shops from Overpass. Optional areaType/category filter in app layer. Falls back to sample data in India when Overpass fails. */
export async function fetchNearbyShops(
  lat: number,
  lon: number,
  radiusMetres: number = 2500,
  areaType?: ShopAreaType,
  category?: ShopCategory
): Promise<ShopResult[]> {
  const radius = Math.min(radiusMetres, 5000);
  const around = `(around:${radius},${lat},${lon})`;
  const query = `[out:json][timeout:15];(node${around}["shop"];node${around}["amenity"="marketplace"];node${around}["building"="mall"];node${around}["building"="retail"]);out;`;

  let data: { elements?: unknown[] };
  try {
    data = await overpassFetch<{ elements?: unknown[] }>(query, {
      userAgent: USER_AGENT,
    });
  } catch {
    if (isInIndia(lat, lon)) {
      const categoryShopValues = category ? CATEGORY_TO_OSM_SHOP[category] ?? [] : [];
      const fallback = FALLBACK_SHOPS.filter((s) => {
        if (areaType && s.areaType !== areaType) return false;
        if (category && categoryShopValues.length && s.category !== category) return false;
        return true;
      }).map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lon: s.lon,
        distanceKm: Math.round(distanceKm(lat, lon, s.lat, s.lon) * 100) / 100,
        areaType: s.areaType,
        category: s.category,
      }));
      fallback.sort((a, b) => a.distanceKm - b.distanceKm);
      return fallback.slice(0, 50);
    }
    throw new Error("Map data is temporarily unavailable for this area. Try another location or use your current location.");
  }

  const elements = data?.elements ?? [];
  const results: ShopResult[] = [];
  const seen = new Set<string>();

  const categoryShopValues = category ? CATEGORY_TO_OSM_SHOP[category] ?? [] : [];

  for (const el of elements) {
    const name = el.tags?.name;
    if (!name || typeof name !== "string") continue;
    const plat = typeof el.lat === "number" ? el.lat : el.lat != null ? parseFloat(String(el.lat)) : NaN;
    const plon = typeof el.lon === "number" ? el.lon : el.lon != null ? parseFloat(String(el.lon)) : NaN;
    if (Number.isNaN(plat) || Number.isNaN(plon) || plat < -90 || plat > 90 || plon < -180 || plon > 180) continue;
    const id = `${el.type}-${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const elAreaType = getAreaTypeFromTags(el.tags ?? {});
    const elCategory = getCategoryFromTags(el.tags ?? {});

    if (areaType && elAreaType !== areaType) continue;
    if (category && categoryShopValues.length) {
      const shopTag = el.tags?.shop;
      const match = typeof shopTag === "string" && categoryShopValues.some((v) => shopTag === v || shopTag.includes(v));
      if (!match && elCategory !== category) continue;
    }

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
      areaType: elAreaType,
      category: elCategory,
      imageUrl,
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results.slice(0, 50);
}

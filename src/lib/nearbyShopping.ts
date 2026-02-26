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

/** Fetch nearby shops from Overpass. Optional areaType/category filter in app layer. */
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

  const data = await overpassFetch<{ elements?: unknown[] }>(query, {
    userAgent: USER_AGENT,
  });
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

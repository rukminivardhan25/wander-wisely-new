import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  ShoppingBag,
  Search,
  Navigation,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import {
  geocode,
  reverseGeocode,
  fetchNearbyShops,
  googleMapsPlaceUrl,
  googleMapsDirectionsFromCurrentUrl,
  SHOP_AREA_TYPES,
  SHOP_CATEGORIES,
  type GeoResult,
  type ShopResult,
  type ShopAreaType,
  type ShopCategory,
} from "@/lib/nearbyShopping";

/** Varied Indian shopping / market / store placeholders – different per shop by id. */
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&h=300&fit=crop", // Indian market spices
  "https://images.unsplash.com/photo-1562583072-6d3c2d21abf2?w=400&h=300&fit=crop", // Street market
  "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=400&h=300&fit=crop", // Indian bazaar
  "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop", // Retail display
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop", // Shopping bags
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop", // Store interior
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=300&fit=crop", // Mall/shopping
  "https://images.unsplash.com/photo-1604719312866-7e0c884ed5e8?w=400&h=300&fit=crop", // Fashion store
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop", // Shop window
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=300&fit=crop", // Shopping
  "https://images.unsplash.com/photo-1441984904996-e0b6ba685e02?w=400&h=300&fit=crop", // Store
  "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop", // Retail
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&h=300&fit=crop", // Textiles / fabric
  "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&h=300&fit=crop", // Jewelry
  "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop", // Shopping street
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop", // Handicrafts
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop", // Shoes / accessories
];

function getPlaceholderImage(id: string, index?: number): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  if (index != null) hash = (hash << 3) + index;
  const idx = (Math.abs(hash) >>> 0) % PLACEHOLDER_IMAGES.length;
  return PLACEHOLDER_IMAGES[idx];
}

function getShopImage(r: { id: string; imageUrl?: string }, index?: number): string {
  return r.imageUrl ?? getPlaceholderImage(r.id, index);
}

export type NearbyShoppingContentProps = {
  showBackLink?: boolean;
  defaultLocation?: string;
  compact?: boolean;
};

export function NearbyShoppingContent({
  showBackLink = true,
  defaultLocation = "",
  compact = false,
}: NearbyShoppingContentProps) {
  const [locationQuery, setLocationQuery] = useState(defaultLocation);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [areaType, setAreaType] = useState<ShopAreaType | "">("");
  const [category, setCategory] = useState<ShopCategory | "">("");
  const [shops, setShops] = useState<ShopResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailShop, setDetailShop] = useState<ShopResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const runSearch = useCallback(
    async (lat: number, lon: number) => {
      setLoading(true);
      setError("");
      setShops([]);
      try {
        const list = await fetchNearbyShops(
          lat,
          lon,
          2500,
          areaType || undefined,
          category || undefined
        );
        setShops(list);
        if (list.length === 0) setError("No shops found nearby. Try another area or filters.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load shops. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [areaType, category]
  );

  const searchLocation = useCallback(async () => {
    const query = locationQuery.trim();
    if (!query) {
      setError("Enter a city or area name.");
      return;
    }
    setError("");
    setGeo(null);
    try {
      const result = await geocode(query);
      if (!result) {
        setError("Could not find that location. Try a different name.");
        return;
      }
      setGeo(result);
      await runSearch(result.lat, result.lon);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shops. Try again.");
    }
  }, [locationQuery, runSearch]);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    setError("");
    setShops([]);
    setGeo(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserCoords({ lat, lon });
        setLocationQuery("Getting your address…");
        try {
          const reversed = await reverseGeocode(lat, lon);
          const addressForBar = reversed?.displayName ?? "Your location";
          setLocationQuery(addressForBar);
          setGeo(reversed ?? { lat, lon, displayName: "Your location" });
          await runSearch(lat, lon);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load shops.");
          setLocationQuery("Your location");
          setGeo({ lat, lon, displayName: "Your location" });
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setError("Could not get your location. Check permissions or enter a place name.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [runSearch]);

  const openDetail = (s: ShopResult) => {
    setDetailShop(s);
    setDetailOpen(true);
  };

  useEffect(() => {
    if (defaultLocation) setLocationQuery((q) => q || defaultLocation);
  }, [defaultLocation]);

  const areaTypeLabel = areaType ? SHOP_AREA_TYPES.find((a) => a.value === areaType)?.label : null;
  const categoryLabel = category ? SHOP_CATEGORIES.find((c) => c.value === category)?.label : null;

  return (
    <div>
      <div className={compact ? "" : "min-h-screen bg-slate-50/80 pt-20 pb-16"}>
        <div className={compact ? "" : "container max-w-4xl mx-auto px-4"}>
          {showBackLink && (
            <Link
              to="/my-trip"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Back to My Trip
            </Link>
          )}

          <div className={compact ? "mb-4" : "mb-8"}>
            <h2
              className={
                compact
                  ? "text-lg font-display font-semibold text-foreground flex items-center gap-2"
                  : "text-2xl font-display font-bold text-foreground flex items-center gap-2"
              }
            >
              <ShoppingBag
                className={compact ? "h-5 w-5 text-green-600" : "h-7 w-7 text-green-600"}
              />
              Nearby Shopping
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Discover shops, malls & markets. Data from OpenStreetMap — discovery only, no booking.
            </p>
          </div>

          {/* 1. Location */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 mb-4">
            <p className="text-sm font-medium text-foreground mb-2">Location</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="City or area (e.g. Jaipur, MG Road)"
                  className="pl-10 rounded-xl"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                />
              </div>
              <Button
                type="button"
                onClick={searchLocation}
                disabled={loading}
                className="rounded-xl gap-2 shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? "Searching…" : "Search"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={useMyLocation}
                disabled={locationLoading || loading}
                className="rounded-xl gap-2 shrink-0"
              >
                {locationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                Use my location
              </Button>
            </div>
            {geo && (
              <p className="text-sm text-muted-foreground mt-3">
                Showing results near:{" "}
                <span className="font-medium text-foreground">{geo.displayName}</span>
              </p>
            )}
          </div>

          {/* 2. Where to shop (Area type) + 3. What to buy (Category) – dropdowns */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 mb-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Where to shop</p>
                <p className="text-xs text-muted-foreground mb-2">Area type — optional filter</p>
                <Select
                  value={areaType || "any"}
                  onValueChange={(v) => setAreaType(v === "any" ? "" : (v as ShopAreaType))}
                >
                  <SelectTrigger className="w-full rounded-xl h-11">
                    <SelectValue placeholder="Choose area type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="any">Any</SelectItem>
                    {SHOP_AREA_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">What to buy</p>
                <p className="text-xs text-muted-foreground mb-2">Product category — optional filter</p>
                <Select
                  value={category || "any"}
                  onValueChange={(v) => setCategory(v === "any" ? "" : (v as ShopCategory))}
                >
                  <SelectTrigger className="w-full rounded-xl h-11">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="any">Any</SelectItem>
                    {SHOP_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(areaTypeLabel || categoryLabel) && (
              <p className="text-xs text-muted-foreground mt-3">
                Active filters: {[areaTypeLabel, categoryLabel].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {shops.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {shops.length} shop{shops.length !== 1 ? "s" : ""} found (closest first)
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shops.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openDetail(s)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left hover:border-green-300 hover:shadow-md transition-all"
                  >
                    <div className="aspect-[4/3] bg-slate-100 relative">
                      <img
                        src={getShopImage(s, i)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                        {s.distanceKm !== undefined && (
                          <span className="text-xs font-medium bg-black/60 text-white px-2 py-1 rounded">
                            {(s.distanceKm * 1000).toFixed(0)} m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground truncate">{s.name}</h3>
                      {(s.category || s.areaType) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[s.areaType, s.category].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {s.address && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{s.address}</p>
                      )}
                      {s.rating != null ? (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {s.rating}
                          {s.reviewCount != null && ` · ${s.reviewCount} reviews`}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Tap for details & map</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {!loading && shops.length === 0 && !error && geo && (
            <p className="text-muted-foreground text-center py-8">
              No shops found. Try another area or change filters.
            </p>
          )}
        </div>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOpen(false);
            setDetailShop(null);
          }
        }}
      >
        <DialogContent
          className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto"
          key={detailShop?.id}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold pr-8">
              {detailShop?.name}
            </DialogTitle>
          </DialogHeader>
          {detailShop && (
            <div className="space-y-4 mt-2" key={detailShop.id}>
              <div className="aspect-video rounded-xl bg-slate-100 overflow-hidden">
                <img
                  src={getShopImage(detailShop)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              {detailShop.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground">{detailShop.address}</span>
                </div>
              )}
              {(detailShop.category || detailShop.areaType) && (
                <p className="text-sm text-muted-foreground">
                  {[detailShop.areaType, detailShop.category].filter(Boolean).join(" · ")}
                </p>
              )}
              {detailShop.rating != null && (
                <p className="text-sm flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-600 fill-current" />
                  <span className="font-medium text-foreground">{detailShop.rating}</span>
                  {detailShop.reviewCount != null && (
                    <span className="text-muted-foreground">
                      · {detailShop.reviewCount} reviews
                    </span>
                  )}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Distance: {(detailShop.distanceKm * 1000).toFixed(0)} m
              </p>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  asChild
                >
                  <a
                    href={googleMapsPlaceUrl(
                      detailShop.lat,
                      detailShop.lon,
                      detailShop.name
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View on Google Maps
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl gap-1.5 bg-green-600 hover:bg-green-700"
                  asChild
                >
                  <a
                    href={googleMapsDirectionsFromCurrentUrl(detailShop.lat, detailShop.lon)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Get directions (from current location)
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NearbyShopping() {
  return (
    <Layout>
      <NearbyShoppingContent showBackLink={true} compact={false} />
    </Layout>
  );
}

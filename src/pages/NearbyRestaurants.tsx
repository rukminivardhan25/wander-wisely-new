import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  UtensilsCrossed,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import {
  geocode,
  reverseGeocode,
  fetchNearbyRestaurants,
  googleMapsPlaceUrl,
  googleMapsDirectionsFromCurrentUrl,
  type GeoResult,
  type RestaurantResult,
} from "@/lib/nearbyRestaurants";

/** Varied placeholder images when OSM has no image – different per restaurant by id. */
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop",
];

function getPlaceholderImage(restaurantId: string): string {
  let hash = 0;
  for (let i = 0; i < restaurantId.length; i++) hash = (hash << 5) - hash + restaurantId.charCodeAt(i);
  const index = Math.abs(hash) % PLACEHOLDER_IMAGES.length;
  return PLACEHOLDER_IMAGES[index];
}

function getRestaurantImage(r: { id: string; imageUrl?: string }): string {
  return r.imageUrl ?? getPlaceholderImage(r.id);
}

export type NearbyRestaurantsContentProps = {
  /** When false, hide "Back to My Trip" (e.g. when embedded in My Trip Restaurants tab) */
  showBackLink?: boolean;
  /** Pre-fill location input (e.g. trip destination) */
  defaultLocation?: string;
  /** When true, use compact heading for embedding in tab */
  compact?: boolean;
};

export function NearbyRestaurantsContent({
  showBackLink = true,
  defaultLocation = "",
  compact = false,
}: NearbyRestaurantsContentProps) {
  const [locationQuery, setLocationQuery] = useState(defaultLocation);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailRestaurant, setDetailRestaurant] = useState<RestaurantResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const searchLocation = useCallback(async () => {
    const query = locationQuery.trim();
    if (!query) {
      setError("Enter a city or area name.");
      return;
    }
    setLoading(true);
    setError("");
    setRestaurants([]);
    setGeo(null);
    try {
      const result = await geocode(query);
      if (!result) {
        setError("Could not find that location. Try a different name.");
        setLoading(false);
        return;
      }
      setGeo(result);
      const list = await fetchNearbyRestaurants(result.lat, result.lon, 2500);
      setRestaurants(list);
      if (list.length === 0) setError("No restaurants found nearby. Try another area.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load restaurants. Try again.");
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [locationQuery]);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    setError("");
    setRestaurants([]);
    setGeo(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserCoords({ lat, lon });
        setLocationQuery("Getting your address…");
        setLoading(true);
        try {
          const reversed = await reverseGeocode(lat, lon);
          const addressForBar = reversed?.displayName ?? "Your location";
          setLocationQuery(addressForBar);
          setGeo(reversed ?? { lat, lon, displayName: "Your location" });
          const list = await fetchNearbyRestaurants(lat, lon, 2500);
          setRestaurants(list);
          if (list.length === 0) setError("No restaurants found nearby.");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load restaurants.");
          setLocationQuery("Your location");
          setGeo({ lat, lon, displayName: "Your location" });
        } finally {
          setLoading(false);
          setLocationLoading(false);
        }
      },
      () => {
        setError("Could not get your location. Check permissions or enter a place name.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const openDetail = (r: RestaurantResult) => {
    setDetailRestaurant(r);
    setDetailOpen(true);
  };

  const centerLat = geo?.lat ?? userCoords?.lat;
  const centerLon = geo?.lon ?? userCoords?.lon;

  useEffect(() => {
    if (defaultLocation) setLocationQuery((q) => q || defaultLocation);
  }, [defaultLocation]);

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
          <h2 className={compact ? "text-lg font-display font-semibold text-foreground flex items-center gap-2" : "text-2xl font-display font-bold text-foreground flex items-center gap-2"}>
            <UtensilsCrossed className={compact ? "h-5 w-5 text-amber-600" : "h-7 w-7 text-amber-600"} />
            Nearby Restaurants
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter a city/area or use your location. Data from OpenStreetMap — read-only, no bookings.
          </p>
        </div>

          {/* Location input */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="City or area (e.g. Hyderabad, Gachibowli)"
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Searching…" : "Search"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={useMyLocation}
                disabled={locationLoading || loading}
                className="rounded-xl gap-2 shrink-0"
              >
                {locationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                Use my location
              </Button>
            </div>
            {geo && (
              <p className="text-sm text-muted-foreground mt-3">
                Showing results near: <span className="font-medium text-foreground">{geo.displayName}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {restaurants.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {restaurants.length} restaurant{restaurants.length !== 1 ? "s" : ""} found (sorted by distance)
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {restaurants.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openDetail(r)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left hover:border-amber-300 hover:shadow-md transition-all"
                  >
                    <div className="aspect-[4/3] bg-slate-100 relative">
                      <img
                        src={getRestaurantImage(r)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                        {r.distanceKm !== undefined && (
                          <span className="text-xs font-medium bg-black/60 text-white px-2 py-1 rounded">
                            {(r.distanceKm * 1000).toFixed(0)} m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground truncate">{r.name}</h3>
                      {r.cuisine && (
                        <p className="text-xs text-muted-foreground mt-0.5">{r.cuisine}</p>
                      )}
                      {r.address && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{r.address}</p>
                      )}
                      {r.rating != null ? (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 flex-wrap">
                          <Star className="h-3.5 w-3.5 fill-current shrink-0" />
                          <span>{r.rating}{r.reviewCount != null ? ` · ${r.reviewCount} reviews` : ""}</span>
                          {r.ratingSource === "google" && (
                            <span className="text-muted-foreground font-normal">(Google)</span>
                          )}
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

          {!loading && restaurants.length === 0 && !error && geo && (
            <p className="text-muted-foreground text-center py-8">No restaurants found. Try a different area or radius.</p>
          )}
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) { setDetailOpen(false); setDetailRestaurant(null); } }}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto" key={detailRestaurant?.id}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold pr-8">{detailRestaurant?.name}</DialogTitle>
          </DialogHeader>
          {detailRestaurant && (
            <div className="space-y-4 mt-2" key={detailRestaurant.id}>
              <div className="aspect-video rounded-xl bg-slate-100 overflow-hidden">
                <img
                  src={getRestaurantImage(detailRestaurant)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              {detailRestaurant.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground">{detailRestaurant.address}</span>
                </div>
              )}
              {detailRestaurant.cuisine && (
                <p className="text-sm text-muted-foreground">Cuisine: {detailRestaurant.cuisine}</p>
              )}
              {detailRestaurant.rating != null && (
                <p className="text-sm flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-600 fill-current" />
                  <span className="font-medium text-foreground">{detailRestaurant.rating}</span>
                  {detailRestaurant.reviewCount != null && (
                    <span className="text-muted-foreground">· {detailRestaurant.reviewCount} reviews</span>
                  )}
                  {detailRestaurant.ratingSource === "google" && (
                    <span className="text-xs text-muted-foreground">(Google rating)</span>
                  )}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Distance: {(detailRestaurant.distanceKm * 1000).toFixed(0)} m
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
                    href={googleMapsPlaceUrl(detailRestaurant.lat, detailRestaurant.lon, detailRestaurant.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl gap-1.5 bg-amber-600 hover:bg-amber-700"
                  asChild
                >
                  <a
                    href={googleMapsDirectionsFromCurrentUrl(detailRestaurant.lat, detailRestaurant.lon)}
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

export default function NearbyRestaurants() {
  return (
    <Layout>
      <NearbyRestaurantsContent showBackLink={true} compact={false} />
    </Layout>
  );
}

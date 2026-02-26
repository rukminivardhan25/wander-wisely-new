import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Search,
  Navigation,
  ExternalLink,
  ArrowLeft,
  Loader2,
  CreditCard,
  Stethoscope,
  Pill,
  Building2,
  Fuel,
  Zap,
  Bus,
  Train,
  Plane,
  Bath,
  Car,
  Phone,
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
  fetchNearbyUtilities,
  googleMapsPlaceUrl,
  googleMapsDirectionsFromCurrentUrl,
  UTILITY_CATEGORIES,
  type GeoResult,
  type UtilityResult,
  type UtilityCategory,
} from "@/lib/nearbyUtilities";

const CATEGORY_ICONS: Record<UtilityCategory, React.ReactNode> = {
  atm: <CreditCard className="h-5 w-5" />,
  hospital: <Stethoscope className="h-5 w-5" />,
  pharmacy: <Pill className="h-5 w-5" />,
  police: <Building2 className="h-5 w-5" />,
  fuel: <Fuel className="h-5 w-5" />,
  ev_charging: <Zap className="h-5 w-5" />,
  bus_stop: <Bus className="h-5 w-5" />,
  railway: <Train className="h-5 w-5" />,
  airport: <Plane className="h-5 w-5" />,
  toilets: <Bath className="h-5 w-5" />,
  parking: <Car className="h-5 w-5" />,
};

const PLACEHOLDER_IMAGES: Record<UtilityCategory, string> = {
  atm: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&h=300&fit=crop",
  hospital: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop",
  pharmacy: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=300&fit=crop",
  police: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop",
  fuel: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&h=300&fit=crop",
  ev_charging: "https://images.unsplash.com/photo-1593941707884-73cb928e3d2e?w=400&h=300&fit=crop",
  bus_stop: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop",
  railway: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=400&h=300&fit=crop",
  airport: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop",
  toilets: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop",
  parking: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=300&fit=crop",
};

function getPlaceImage(r: UtilityResult): string {
  return r.imageUrl ?? PLACEHOLDER_IMAGES[r.category];
}

export type NearbyUtilitiesContentProps = {
  showBackLink?: boolean;
  defaultLocation?: string;
  compact?: boolean;
};

export function NearbyUtilitiesContent({
  showBackLink = true,
  defaultLocation = "",
  compact = false,
}: NearbyUtilitiesContentProps) {
  const [locationQuery, setLocationQuery] = useState(defaultLocation);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<UtilityCategory | null>(null);
  const [places, setPlaces] = useState<UtilityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailPlace, setDetailPlace] = useState<UtilityResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const runSearch = useCallback(async (lat: number, lon: number) => {
    if (!selectedCategory) return;
    setLoading(true);
    setError("");
    setPlaces([]);
    try {
      const list = await fetchNearbyUtilities(lat, lon, 3000, selectedCategory);
      setPlaces(list);
      if (list.length === 0) setError(`No ${UTILITY_CATEGORIES.find((c) => c.value === selectedCategory)?.label ?? selectedCategory} found nearby. Try another area.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load places. Try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const searchLocation = useCallback(async () => {
    const query = locationQuery.trim();
    if (!query) {
      setError("Enter a city or area name.");
      return;
    }
    setError("");
    setGeo(null);
    setPlaces([]);
    try {
      const result = await geocode(query);
      if (!result) {
        setError("Could not find that location. Try a different name.");
        return;
      }
      setGeo(result);
      if (selectedCategory) await runSearch(result.lat, result.lon);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load places. Try again.");
    }
  }, [locationQuery, selectedCategory, runSearch]);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    setError("");
    setPlaces([]);
    setGeo(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocationQuery("Getting your address…");
        try {
          const reversed = await reverseGeocode(lat, lon);
          const addressForBar = reversed?.displayName ?? "Your location";
          setLocationQuery(addressForBar);
          setGeo(reversed ?? { lat, lon, displayName: "Your location" });
          if (selectedCategory) await runSearch(lat, lon);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to get location.");
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
  }, [selectedCategory, runSearch]);

  const onCategorySelect = useCallback((cat: UtilityCategory) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
    setPlaces([]);
    setError("");
  }, []);

  useEffect(() => {
    if (selectedCategory && geo) {
      runSearch(geo.lat, geo.lon);
    } else {
      setPlaces([]);
    }
  }, [selectedCategory, geo?.lat, geo?.lon]);

  useEffect(() => {
    if (defaultLocation) setLocationQuery((q) => q || defaultLocation);
  }, [defaultLocation]);

  const openDetail = (p: UtilityResult) => {
    setDetailPlace(p);
    setDetailOpen(true);
  };

  const categoryLabel = selectedCategory ? UTILITY_CATEGORIES.find((c) => c.value === selectedCategory)?.label : null;

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

          <div className={compact ? "mb-4" : "mb-6"}>
            <h2 className={compact ? "text-lg font-display font-semibold text-foreground flex items-center gap-2" : "text-2xl font-display font-bold text-foreground flex items-center gap-2"}>
              <MapPin className={compact ? "h-5 w-5 text-slate-600" : "h-7 w-7 text-slate-600"} />
              Nearby — Utilities & essentials
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              ATM, hospital, pharmacy, police, fuel, transport & more. Live map data — discovery & navigation only.
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
              <Button type="button" onClick={searchLocation} disabled={loading} className="rounded-xl gap-2 shrink-0">
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

          {/* 2. Category selection — icon cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 mb-6">
            <p className="text-sm font-medium text-foreground mb-1">Choose category</p>
            <p className="text-xs text-muted-foreground mb-3">Select one — then search or use my location</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {UTILITY_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onCategorySelect(c.value)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                    selectedCategory === c.value
                      ? "border-slate-700 bg-slate-100 text-foreground"
                      : "border-slate-200 bg-slate-50/50 text-muted-foreground hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-700">
                    {CATEGORY_ICONS[c.value]}
                  </span>
                  <span className="text-xs font-medium text-center leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
            {categoryLabel && (
              <p className="text-xs text-muted-foreground mt-3">Selected: {categoryLabel}</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 mb-6 text-sm">{error}</div>
          )}

          {/* Results */}
          {places.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {places.length} place{places.length !== 1 ? "s" : ""} found (nearest first)
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {places.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openDetail(p)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left hover:border-slate-400 hover:shadow-md transition-all"
                  >
                    <div className="aspect-[4/3] bg-slate-100 relative">
                      <img src={getPlaceImage(p)} alt="" className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2">
                        <span className="text-xs font-medium bg-black/60 text-white px-2 py-1 rounded">
                          {(p.distanceKm * 1000).toFixed(0)} m
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{categoryLabel ?? p.category}</p>
                      {p.address && <p className="text-xs text-muted-foreground mt-1 truncate">{p.address}</p>}
                      <p className="text-xs text-slate-500 mt-1">Tap for details & map</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {!loading && places.length === 0 && !error && geo && selectedCategory && (
            <p className="text-muted-foreground text-center py-8">No places found. Try another area or category.</p>
          )}

          {!selectedCategory && geo && (
            <p className="text-muted-foreground text-center py-6">Select a category above to see nearby places.</p>
          )}
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={(o) => { if (!o) { setDetailOpen(false); setDetailPlace(null); } }}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto" key={detailPlace?.id}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold pr-8">{detailPlace?.name}</DialogTitle>
          </DialogHeader>
          {detailPlace && (
            <div className="space-y-4 mt-2" key={detailPlace.id}>
              <div className="aspect-video rounded-xl bg-slate-100 overflow-hidden">
                <img src={getPlaceImage(detailPlace)} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm text-muted-foreground">
                {UTILITY_CATEGORIES.find((c) => c.value === detailPlace.category)?.label ?? detailPlace.category}
              </p>
              {detailPlace.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground">{detailPlace.address}</span>
                </div>
              )}
              {detailPlace.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${detailPlace.phone}`} className="text-foreground underline">{detailPlace.phone}</a>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Distance: {(detailPlace.distanceKm * 1000).toFixed(0)} m
              </p>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
                  <a href={googleMapsPlaceUrl(detailPlace.lat, detailPlace.lon, detailPlace.name)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> View on Google Maps
                  </a>
                </Button>
                <Button type="button" size="sm" className="rounded-xl gap-1.5 bg-slate-700 hover:bg-slate-800" asChild>
                  <a href={googleMapsDirectionsFromCurrentUrl(detailPlace.lat, detailPlace.lon)} target="_blank" rel="noopener noreferrer">
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

export default function NearbyUtilities() {
  return (
    <Layout>
      <NearbyUtilitiesContent showBackLink={true} compact={false} />
    </Layout>
  );
}

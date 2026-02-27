import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plane,
  MapPin,
  Pencil,
  Trash2,
  Wifi,
  Zap,
  Tv,
  Utensils,
  LayoutGrid,
  Plus,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Per-cabin seat layout (same as FlightListing). */
interface CabinConfig {
  rows: number;
  left_cols: number;
  right_cols: number;
}

const CABIN_ORDER = ["first", "business", "economy"] as const;
const CABIN_LABEL: Record<string, string> = {
  first: "First",
  business: "Business",
  economy: "Economy / Budget",
};

function seatLetter(index: number, leftCount: number, rightCount: number): string {
  if (index < leftCount) return String.fromCharCode(65 + index);
  return String.fromCharCode(65 + leftCount + (index - leftCount));
}

/** Build rows for seat map from cabin structure. */
function buildSeatRows(structure: {
  classes_enabled: { first: boolean; business: boolean; economy: boolean };
  cabin_first: CabinConfig;
  cabin_business: CabinConfig;
  cabin_economy: CabinConfig;
}): { cabin: string; globalRow: number; left_cols: number; right_cols: number }[] {
  const out: { cabin: string; globalRow: number; left_cols: number; right_cols: number }[] = [];
  let globalRow = 0;
  for (const cabin of CABIN_ORDER) {
    const enabled = cabin === "first" ? structure.classes_enabled.first : cabin === "business" ? structure.classes_enabled.business : structure.classes_enabled.economy;
    if (!enabled) continue;
    const config = cabin === "first" ? structure.cabin_first : cabin === "business" ? structure.cabin_business : structure.cabin_economy;
    for (let r = 0; r < config.rows; r++) {
      globalRow++;
      out.push({ cabin, globalRow, left_cols: config.left_cols, right_cols: config.right_cols });
    }
  }
  return out;
}

/** Flight row for detail view: API data + optional seat structure for display. */
interface FlightRow {
  id: string;
  flight_number: string;
  airline_name: string;
  route: string;
  aircraft_type: string;
  total_seats: number;
  status: string;
  verification_status?: string;
  flight_type?: string;
  base_fare_cents?: number;
  baggage_allowance?: string;
  has_wifi?: boolean;
  has_charging?: boolean;
  has_entertainment?: boolean;
  has_meal?: boolean;
  classes_enabled: { first: boolean; business: boolean; economy: boolean };
  cabin_first: CabinConfig;
  cabin_business: CabinConfig;
  cabin_economy: CabinConfig;
  /** When "saved", seat structure is from DB (vendor-created); when "default", fallback layout. */
  layoutSource?: "saved" | "default";
}

/** Default seat layout when API has no seat_layout: economy only. */
function defaultSeatLayout(totalSeats: number): { classes_enabled: { first: boolean; business: boolean; economy: boolean }; cabin_first: CabinConfig; cabin_business: CabinConfig; cabin_economy: CabinConfig } {
  const rows = Math.max(1, Math.floor(totalSeats / 6));
  return {
    classes_enabled: { first: false, business: false, economy: true },
    cabin_first: { rows: 0, left_cols: 0, right_cols: 0 },
    cabin_business: { rows: 0, left_cols: 0, right_cols: 0 },
    cabin_economy: { rows, left_cols: 3, right_cols: 3 },
  };
}

const ZERO_CABIN: CabinConfig = { rows: 0, left_cols: 0, right_cols: 0 };

function parseCabin(c: unknown): CabinConfig {
  if (!c || typeof c !== "object") return ZERO_CABIN;
  const x = c as Record<string, unknown>;
  return {
    rows: typeof x.rows === "number" ? x.rows : 0,
    left_cols: typeof x.left_cols === "number" ? x.left_cols : 0,
    right_cols: typeof x.right_cols === "number" ? x.right_cols : 0,
  };
}

/** Parse seat_layout from API (saved when vendor created flight in fleet). First, Business, Economy all supported; missing cabins default to zeros. */
function parseSeatLayoutFromApi(seatLayout: unknown): { classes_enabled: { first: boolean; business: boolean; economy: boolean }; cabin_first: CabinConfig; cabin_business: CabinConfig; cabin_economy: CabinConfig } | null {
  if (!seatLayout || typeof seatLayout !== "object") return null;
  const o = seatLayout as Record<string, unknown>;
  const ce = o.classes_enabled;
  const cen = ce && typeof ce === "object" ? (ce as Record<string, unknown>) : {};
  return {
    classes_enabled: {
      first: Boolean(cen.first),
      business: Boolean(cen.business),
      economy: Boolean(cen.economy),
    },
    cabin_first: parseCabin(o.cabin_first),
    cabin_business: parseCabin(o.cabin_business),
    cabin_economy: parseCabin(o.cabin_economy),
  };
}

const CABIN_COLOUR: Record<string, string> = {
  first: "bg-amber-500/80 text-white",
  business: "bg-blue-600/90 text-white",
  economy: "bg-slate-500/80 text-white",
};

function SeatStructureCard({
  flight,
}: {
  flight: {
    flight_type?: string;
    total_seats: number;
    classes_enabled: { first: boolean; business: boolean; economy: boolean };
    cabin_first: CabinConfig;
    cabin_business: CabinConfig;
    cabin_economy: CabinConfig;
    layoutSource?: "saved" | "default";
  };
}) {
  const seatRows = useMemo(
    () =>
      buildSeatRows({
        classes_enabled: flight.classes_enabled,
        cabin_first: flight.cabin_first,
        cabin_business: flight.cabin_business,
        cabin_economy: flight.cabin_economy,
      }),
    [flight.classes_enabled, flight.cabin_first, flight.cabin_business, flight.cabin_economy]
  );

  const totalFromLayout = useMemo(() => {
    return seatRows.reduce((sum, row) => sum + row.left_cols + row.right_cols, 0);
  }, [seatRows]);

  return (
    <Card className="rounded-xl border-[#E5E7EB] shadow-sm overflow-hidden max-w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutGrid className="h-4 w-4" /> Seat structure
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Flight type: {(flight.flight_type ?? "domestic").replace("_", " ")} · Total seats (from layout): {totalFromLayout}
          {flight.layoutSource === "saved" && " · From your saved cabin layout"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 max-w-full">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Cabin classes</p>
          <div className="flex flex-wrap gap-3">
            {CABIN_ORDER.map((cabin) => {
              if (!(cabin === "first" ? flight.classes_enabled.first : cabin === "business" ? flight.classes_enabled.business : flight.classes_enabled.economy))
                return null;
              const config = cabin === "first" ? flight.cabin_first : cabin === "business" ? flight.cabin_business : flight.cabin_economy;
              const seatsPerRow = config.left_cols + config.right_cols;
              const classTotal = config.rows * seatsPerRow;
              return (
                <span
                  key={cabin}
                  className={cn("text-xs font-medium px-2.5 py-1 rounded-md", CABIN_COLOUR[cabin] ?? "bg-slate-200")}
                >
                  {CABIN_LABEL[cabin]}: {config.rows} rows × {config.left_cols}-{config.right_cols} → {classTotal} seats
                </span>
              );
            })}
          </div>
        </div>
        <div className="space-y-2 w-full min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Seat map (front → back) — left of aisle | aisle | right of aisle. Scroll within box if needed.</p>
          <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-[#E5E7EB] p-3 bg-slate-50" style={{ maxWidth: "100%" }}>
            <div className="flex gap-1 items-end justify-start inline-flex">
              {seatRows.map((row) => {
                const leftCols = row.left_cols;
                const rightCols = row.right_cols;
                const colour = CABIN_COLOUR[row.cabin] ?? "bg-slate-400";
                const leftLetters = Array.from({ length: leftCols }, (_, i) => seatLetter(i, leftCols, rightCols));
                const rightLetters = Array.from({ length: rightCols }, (_, i) => seatLetter(leftCols + i, leftCols, rightCols));
                return (
                  <div key={`${row.globalRow}-${row.cabin}`} className="flex flex-col gap-0.5 flex-shrink-0 w-12 border border-[#E5E7EB]/80 rounded-md overflow-hidden bg-white" title={`Row ${row.globalRow}`}>
                    <div className="text-[10px] font-mono py-0.5 bg-slate-100 w-full text-center border-b border-[#E5E7EB]/50">{row.globalRow}</div>
                    <div className="flex flex-1 p-0.5 gap-0.5 min-h-[28px]">
                      <div className="flex flex-col gap-0.5 flex-1 items-center">
                        {leftLetters.map((letter, i) => (
                          <div
                            key={`l-${i}`}
                            className={cn(
                              "w-5 h-5 flex items-center justify-center text-[9px] font-mono rounded border border-slate-300/50",
                              colour
                            )}
                            title={`Row ${row.globalRow} ${letter} (left of aisle)`}
                          >
                            {letter}
                          </div>
                        ))}
                      </div>
                      <div className="w-0.5 bg-slate-400 rounded flex-shrink-0 self-stretch my-0.5" title="Aisle" />
                      <div className="flex flex-col gap-0.5 flex-1 items-center">
                        {rightLetters.map((letter, i) => (
                          <div
                            key={`r-${i}`}
                            className={cn(
                              "w-5 h-5 flex items-center justify-center text-[9px] font-mono rounded border border-slate-300/50",
                              colour
                            )}
                            title={`Row ${row.globalRow} ${letter} (right of aisle)`}
                          >
                            {letter}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Front ← rows (left | aisle | right) → Back</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FlightDetail() {
  const { listingId, flightId } = useParams<{ listingId: string; flightId: string }>();
  const navigate = useNavigate();
  const [listingName, setListingName] = useState("");
  const [flight, setFlight] = useState<FlightRow | null>(null);
  const [routes, setRoutes] = useState<{ id: string; from_place: string; to_place: string; fare_cents: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingFlightInfo, setEditingFlightInfo] = useState(false);
  const [flightEditForm, setFlightEditForm] = useState<Partial<FlightRow>>({});
  const [savingFlightInfo, setSavingFlightInfo] = useState(false);
  const [editingAmenities, setEditingAmenities] = useState(false);
  const [amenitiesForm, setAmenitiesForm] = useState({ has_wifi: false, has_charging: false, has_entertainment: false, has_meal: false });
  const [savingAmenities, setSavingAmenities] = useState(false);
  const [newRouteForm, setNewRouteForm] = useState({ from_place: "", to_place: "", fare_rupees: "" });
  const [routesSheetOpen, setRoutesSheetOpen] = useState(false);
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    route_id: "",
    schedule_date: "",
    departure_time: "06:00",
    arrival_time: "08:00",
  });
  const [flightSchedules, setFlightSchedules] = useState<{ id: string; route_from: string; route_to: string; start_date: string; end_date: string; departure_time: string; arrival_time: string; status: string }[]>([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    vendorFetch<{ name: string }>(`/api/listings/${listingId}`)
      .then((d) => setListingName(d?.name ?? ""))
      .catch(() => setListingName("…"));
  }, [listingId]);

  const loadFlight = () => {
    if (!listingId || !flightId) return;
    setLoading(true);
    setError("");
    Promise.all([
      vendorFetch<{ id: string; flightNumber: string; airlineName: string; aircraftType: string; flightType: string; totalSeats: number; status: string; verificationStatus?: string; baseFareCents?: number; baggageAllowance?: string; seatLayout?: unknown; hasWifi?: boolean; hasCharging?: boolean; hasEntertainment?: boolean; hasMeal?: boolean }>(`/api/listings/${listingId}/flights/${flightId}`),
      vendorFetch<{ routes: { id: string; fromPlace: string; toPlace: string; fareCents?: number }[] }>(`/api/listings/${listingId}/flights/${flightId}/routes`),
      vendorFetch<{ schedules: { id: string; fromPlace: string; toPlace: string; scheduleDate: string; departureTime: string; arrivalTime: string; status: string }[] }>(`/api/listings/${listingId}/flights/${flightId}/schedules`),
    ])
      .then(([flightRes, routesRes, schedRes]) => {
        const f = flightRes;
        const parsed = parseSeatLayoutFromApi(f.seatLayout);
        const totalFromParsed = parsed ? buildSeatRows(parsed).reduce((s, r) => s + r.left_cols + r.right_cols, 0) : 0;
        const useSavedLayout = parsed && totalFromParsed > 0;
        const layout = useSavedLayout ? parsed : defaultSeatLayout(f.totalSeats);
        setFlight({
          id: f.id,
          flight_number: f.flightNumber,
          airline_name: f.airlineName,
          aircraft_type: f.aircraftType,
          route: (routesRes.routes?.length ? `${routesRes.routes[0].fromPlace} → ${routesRes.routes[0].toPlace}` : "—") as string,
          total_seats: f.totalSeats,
          status: f.status,
          verification_status: f.verificationStatus ?? "no_request",
          flight_type: f.flightType,
          base_fare_cents: f.baseFareCents,
          baggage_allowance: f.baggageAllowance,
          has_wifi: f.hasWifi ?? false,
          has_charging: f.hasCharging ?? false,
          has_entertainment: f.hasEntertainment ?? false,
          has_meal: f.hasMeal ?? false,
          ...layout,
          layoutSource: useSavedLayout ? ("saved" as const) : ("default" as const),
        });
        setRoutes((routesRes.routes ?? []).map((r) => ({ id: r.id, from_place: r.fromPlace, to_place: r.toPlace, fare_cents: r.fareCents ?? 0 })));
        setFlightSchedules((schedRes.schedules ?? []).map((s) => ({
          id: s.id,
          route_from: s.fromPlace,
          route_to: s.toPlace,
          start_date: s.scheduleDate,
          end_date: s.scheduleDate,
          departure_time: s.departureTime ?? "",
          arrival_time: s.arrivalTime ?? "",
          status: s.status ?? "active",
        })));
      })
      .catch(() => {
        setFlight(null);
        setError("Flight not found");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!listingId || !flightId) return;
    loadFlight();
  }, [listingId, flightId]);

  const handleToggleStatus = async () => {
    if (!listingId || !flightId || !flight) return;
    const next = flight.status === "active" ? "inactive" : "active";
    setToggling(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/flights/${flightId}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      setFlight((prev) => (prev ? { ...prev, status: next } : null));
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!listingId || !flightId || !flight || !window.confirm("Remove this flight from the fleet? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/flights/${flightId}`, { method: "DELETE" });
      navigate(`/listings/${listingId}/transport`);
    } finally {
      setDeleting(false);
    }
  };

  const startEditFlightInfo = () => {
    if (flight) {
      setFlightEditForm({
        flight_number: flight.flight_number,
        airline_name: flight.airline_name,
        aircraft_type: flight.aircraft_type,
        total_seats: flight.total_seats,
        flight_type: flight.flight_type,
        base_fare_cents: flight.base_fare_cents,
        baggage_allowance: flight.baggage_allowance,
      });
      setEditingFlightInfo(true);
    }
  };

  const handleSaveFlightInfo = async () => {
    if (!listingId || !flightId || !flight) return;
    setSavingFlightInfo(true);
    try {
      const payload = {
        flight_number: (flightEditForm.flight_number ?? flight.flight_number).trim() || flight.flight_number,
        airline_name: (flightEditForm.airline_name ?? flight.airline_name).trim() || flight.airline_name,
        aircraft_type: flightEditForm.aircraft_type ?? flight.aircraft_type,
        total_seats: Number(flightEditForm.total_seats) || flight.total_seats,
        flight_type: (flightEditForm.flight_type as string) ?? flight.flight_type,
        base_fare_cents: flightEditForm.base_fare_cents ?? flight.base_fare_cents,
        baggage_allowance: (flightEditForm.baggage_allowance ?? flight.baggage_allowance) || null,
      };
      await vendorFetch(`/api/listings/${listingId}/flights/${flightId}`, { method: "PATCH", body: JSON.stringify(payload) });
      setFlight((prev) =>
        prev
          ? {
              ...prev,
              flight_number: payload.flight_number,
              airline_name: payload.airline_name,
              aircraft_type: payload.aircraft_type,
              total_seats: payload.total_seats,
              flight_type: payload.flight_type,
              base_fare_cents: payload.base_fare_cents,
              baggage_allowance: payload.baggage_allowance ?? undefined,
              verification_status: "no_request",
              status: "inactive",
            }
          : null
      );
      setEditingFlightInfo(false);
    } finally {
      setSavingFlightInfo(false);
    }
  };

  const startEditAmenities = () => {
    if (flight) {
      setAmenitiesForm({
        has_wifi: flight.has_wifi ?? false,
        has_charging: flight.has_charging ?? false,
        has_entertainment: flight.has_entertainment ?? false,
        has_meal: flight.has_meal ?? false,
      });
      setEditingAmenities(true);
    }
  };

  const handleSaveAmenities = async () => {
    if (!flight || !listingId || !flightId) return;
    setSavingAmenities(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/flights/${flightId}`, {
        method: "PATCH",
        body: JSON.stringify({
          has_wifi: amenitiesForm.has_wifi,
          has_charging: amenitiesForm.has_charging,
          has_entertainment: amenitiesForm.has_entertainment,
          has_meal: amenitiesForm.has_meal,
        }),
      });
      setFlight((prev) =>
        prev
          ? {
              ...prev,
              has_wifi: amenitiesForm.has_wifi,
              has_charging: amenitiesForm.has_charging,
              has_entertainment: amenitiesForm.has_entertainment,
              has_meal: amenitiesForm.has_meal,
              verification_status: "no_request",
              status: "inactive",
            }
          : null
      );
      setEditingAmenities(false);
    } finally {
      setSavingAmenities(false);
    }
  };

  const addRoute = async () => {
    const from = newRouteForm.from_place.trim();
    const to = newRouteForm.to_place.trim();
    const fare = Number(newRouteForm.fare_rupees);
    if (!listingId || !flightId || !from || !to || !Number.isFinite(fare) || fare < 0) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/flights/${flightId}/routes`, {
        method: "POST",
        body: JSON.stringify({ from_place: from, to_place: to, fare_cents: Math.round(fare * 100) }),
      });
      const { routes: next } = await vendorFetch<{ routes: { id: string; fromPlace: string; toPlace: string; fareCents?: number }[] }>(`/api/listings/${listingId}/flights/${flightId}/routes`);
      setRoutes((next ?? []).map((r) => ({ id: r.id, from_place: r.fromPlace, to_place: r.toPlace, fare_cents: r.fareCents ?? 0 })));
      setNewRouteForm({ from_place: "", to_place: "", fare_rupees: "" });
      setRoutesSheetOpen(false);
      setFlight((prev) => (prev ? { ...prev, verification_status: "no_request", status: "inactive" } : null));
    } catch {
      // keep form open on error
    }
  };

  const removeRoute = async (id: string) => {
    if (!listingId || !flightId) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/flights/${flightId}/routes/${id}`, { method: "DELETE" });
      const { routes: next } = await vendorFetch<{ routes: { id: string; fromPlace: string; toPlace: string; fareCents?: number }[] }>(`/api/listings/${listingId}/flights/${flightId}/routes`);
      setRoutes((next ?? []).map((r) => ({ id: r.id, from_place: r.fromPlace, to_place: r.toPlace, fare_cents: r.fareCents ?? 0 })));
      setFlight((prev) => (prev ? { ...prev, verification_status: "no_request", status: "inactive" } : null));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (error && !flight) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/listings/${listingId}/transport`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }
  if (!flight) return null;

  const statusClass =
    flight.status === "active" ? "bg-[#22C55E]/10 text-[#22C55E]" : flight.status === "inactive" ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#F59E0B]/10 text-[#F59E0B]";
  const displayRoute = routes.length ? `${routes[0].from_place} → ${routes[0].to_place}` : "—";

  return (
    <div className="space-y-6 p-6 min-w-0 overflow-x-hidden" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/listings/${listingId}/transport`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground font-mono">{flight.flight_number}</h1>
            <p className="text-sm text-muted-foreground">
              {listingName && `${listingName} · `}Transport · Flight detail
            </p>
          </div>
          <span className="text-sm text-muted-foreground border border-[#E5E7EB] rounded-lg px-3 py-1">
            {flight.airline_name}
          </span>
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-lg capitalize", statusClass)}>
            {flight.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] min-w-0">
        {/* Left: Cards */}
        <div className="space-y-6 min-w-0">
          <Card className="rounded-xl border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><Plane className="h-4 w-4" /> Flight information</span>
                {!editingFlightInfo ? (
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={startEditFlightInfo}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditingFlightInfo(false)}>Cancel</Button>
                    <Button size="sm" className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={savingFlightInfo} onClick={handleSaveFlightInfo}>{savingFlightInfo ? "Saving…" : "Save"}</Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!editingFlightInfo ? (
                <>
                  <p><span className="text-muted-foreground">Route:</span> {displayRoute}</p>
                  <p><span className="text-muted-foreground">Aircraft:</span> {flight.aircraft_type}</p>
                  <p><span className="text-muted-foreground">Seats:</span> {flight.total_seats}</p>
                  <p><span className="text-muted-foreground">Type:</span> {(flight.flight_type ?? "domestic").replace("_", " ")}</p>
                  {flight.base_fare_cents != null && (
                    <p><span className="text-muted-foreground">Base fare:</span> ₹ {(flight.base_fare_cents / 100).toLocaleString("en-IN")}</p>
                  )}
                  {flight.baggage_allowance && (
                    <p><span className="text-muted-foreground">Baggage:</span> {flight.baggage_allowance}</p>
                  )}
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Flight number</Label><Input className="mt-1 rounded-lg" value={String(flightEditForm.flight_number ?? "")} onChange={(e) => setFlightEditForm((f) => ({ ...f, flight_number: e.target.value }))} /></div>
                  <div><Label className="text-xs">Airline</Label><Input className="mt-1 rounded-lg" value={String(flightEditForm.airline_name ?? "")} onChange={(e) => setFlightEditForm((f) => ({ ...f, airline_name: e.target.value }))} /></div>
                  <div><Label className="text-xs">Aircraft type</Label><Input className="mt-1 rounded-lg" value={String(flightEditForm.aircraft_type ?? "")} onChange={(e) => setFlightEditForm((f) => ({ ...f, aircraft_type: e.target.value }))} /></div>
                  <div><Label className="text-xs">Total seats</Label><Input type="number" min={1} className="mt-1 rounded-lg" value={String(flightEditForm.total_seats ?? "")} onChange={(e) => setFlightEditForm((f) => ({ ...f, total_seats: Number(e.target.value) }))} /></div>
                  <div><Label className="text-xs">Base fare (₹)</Label><Input type="number" min={0} className="mt-1 rounded-lg" value={flightEditForm.base_fare_cents != null ? String(flightEditForm.base_fare_cents / 100) : ""} onChange={(e) => setFlightEditForm((f) => ({ ...f, base_fare_cents: Math.round((Number(e.target.value) || 0) * 100) }))} /></div>
                  <div><Label className="text-xs">Baggage</Label><Input className="mt-1 rounded-lg" value={String(flightEditForm.baggage_allowance ?? "")} onChange={(e) => setFlightEditForm((f) => ({ ...f, baggage_allowance: e.target.value }))} /></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seat structure – full fleet design (classes, layout, horizontal map with seat numbers) */}
          <SeatStructureCard flight={flight} />

          <Card className="rounded-xl border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Routes & pricing</span>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setRoutesSheetOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">From → To and fare for each route. Open Edit to add or change routes.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {routes.length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {routes.map((r) => (
                    <li key={r.id} className="py-1.5 border-b border-[#E5E7EB] last:border-0">
                      <span>{r.from_place} → {r.to_place} · ₹ {(r.fare_cents / 100).toLocaleString("en-IN")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No routes yet. Click Edit to add from–to and fare.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick actions & Amenities */}
        <div className="space-y-4">
          <Card className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
              {flight.verification_status !== "approved" && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  After any add or edit to flight info, routes & pricing, or amenities, re-verification is required and status is set to inactive. Verify this flight (Verification → Vehicles → Flights) to use Quick actions below.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-10"
                disabled={flight.verification_status !== "approved"}
                onClick={() => setScheduleDrawerOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add schedule
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full border-[#E5E7EB] h-10"
                disabled={toggling || flight.verification_status !== "approved"}
                onClick={handleToggleStatus}
              >
                {toggling ? "Updating…" : flight.status === "active" ? "Set Inactive" : "Set Active"}
              </Button>
              <Button
                className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white h-10"
                disabled={deleting || flight.verification_status !== "approved"}
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete flight
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
                Amenities
                {!editingAmenities ? (
                  <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={startEditAmenities}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={() => setEditingAmenities(false)}>Cancel</Button>
                    <Button size="sm" className="rounded-lg h-8 bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={savingAmenities} onClick={handleSaveAmenities}>{savingAmenities ? "Saving…" : "Save"}</Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!editingAmenities ? (
                <div className="flex flex-wrap gap-4">
                  {flight.has_wifi && <span className="flex items-center gap-1.5"><Wifi className="h-4 w-4 text-muted-foreground" /> WiFi</span>}
                  {flight.has_charging && <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-muted-foreground" /> USB / Power</span>}
                  {flight.has_entertainment && <span className="flex items-center gap-1.5"><Tv className="h-4 w-4 text-muted-foreground" /> Entertainment</span>}
                  {flight.has_meal && <span className="flex items-center gap-1.5"><Utensils className="h-4 w-4 text-muted-foreground" /> Meal</span>}
                  {!flight.has_wifi && !flight.has_charging && !flight.has_entertainment && !flight.has_meal && <span className="text-muted-foreground">None set</span>}
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_wifi} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_wifi: e.target.checked }))} className="rounded" /><Wifi className="h-4 w-4" /> WiFi</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_charging} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_charging: e.target.checked }))} className="rounded" /><Zap className="h-4 w-4" /> Power</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_entertainment} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_entertainment: e.target.checked }))} className="rounded" /><Tv className="h-4 w-4" /> Entertainment</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_meal} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_meal: e.target.checked }))} className="rounded" /><Utensils className="h-4 w-4" /> Meal</label>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Routes & pricing sidebar (Edit) */}
      <Sheet open={routesSheetOpen} onOpenChange={setRoutesSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Routes & pricing</SheetTitle>
            <p className="text-sm text-muted-foreground">Add, edit or remove routes and fares for this flight.</p>
          </SheetHeader>
          <div className="space-y-4 py-6">
            {routes.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {routes.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2 border-b border-[#E5E7EB] last:border-0">
                    <span>{r.from_place} → {r.to_place} · ₹ {(r.fare_cents / 100).toLocaleString("en-IN")}</span>
                    <Button variant="ghost" size="sm" className="text-muted-foreground h-8" onClick={() => removeRoute(r.id)}>Remove</Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No routes yet. Add one below.</p>
            )}
            <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
              <Label className="text-sm font-medium">Add route</Label>
              <div className="flex flex-wrap items-end gap-2">
                <Input className="rounded-lg max-w-[120px] h-9" placeholder="From" value={newRouteForm.from_place} onChange={(e) => setNewRouteForm((f) => ({ ...f, from_place: e.target.value }))} />
                <Input className="rounded-lg max-w-[120px] h-9" placeholder="To" value={newRouteForm.to_place} onChange={(e) => setNewRouteForm((f) => ({ ...f, to_place: e.target.value }))} />
                <Input type="number" min={0} className="rounded-lg w-24 h-9" placeholder="₹" value={newRouteForm.fare_rupees} onChange={(e) => setNewRouteForm((f) => ({ ...f, fare_rupees: e.target.value }))} />
                <Button size="sm" className="rounded-lg h-9 bg-[#2563EB] hover:bg-[#1D4ED8]" onClick={addRoute}>Add</Button>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={() => setRoutesSheetOpen(false)} className="rounded-xl">Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add schedule sidebar (like buses) */}
      <Sheet open={scheduleDrawerOpen} onOpenChange={setScheduleDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Add schedule</SheetTitle>
            <p className="text-sm text-muted-foreground">Set route, dates and times for this flight. Schedules appear in bookings.</p>
          </SheetHeader>
          <div className="space-y-4 py-6">
            {routes.length > 0 ? (
              <div>
                <Label>Route</Label>
                <Select
                  value={scheduleForm.route_id}
                  onValueChange={(v) => setScheduleForm((f) => ({ ...f, route_id: v }))}
                >
                  <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Select route" /></SelectTrigger>
                  <SelectContent>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.from_place} → {r.to_place}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Add routes in Routes & pricing first, then add a schedule.</p>
            )}
            <div>
              <Label>Schedule date</Label>
              <Input type="date" className="mt-1 rounded-lg" value={scheduleForm.schedule_date} onChange={(e) => setScheduleForm((f) => ({ ...f, schedule_date: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Departure time</Label>
                <Input type="time" className="mt-1 rounded-lg" value={scheduleForm.departure_time} onChange={(e) => setScheduleForm((f) => ({ ...f, departure_time: e.target.value }))} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Arrival time</Label>
                <Input type="time" className="mt-1 rounded-lg" value={scheduleForm.arrival_time} onChange={(e) => setScheduleForm((f) => ({ ...f, arrival_time: e.target.value }))} />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setScheduleDrawerOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8]"
              disabled={scheduleSaving || routes.length === 0 || !scheduleForm.route_id || !scheduleForm.schedule_date}
              onClick={async () => {
                if (!listingId || !flightId || !scheduleForm.route_id || !scheduleForm.schedule_date) return;
                setScheduleSaving(true);
                try {
                  await vendorFetch(`/api/listings/${listingId}/flights/${flightId}/schedules`, {
                    method: "POST",
                    body: JSON.stringify({
                      route_id: scheduleForm.route_id,
                      schedule_date: scheduleForm.schedule_date,
                      departure_time: scheduleForm.departure_time,
                      arrival_time: scheduleForm.arrival_time,
                      status: "active",
                    }),
                  });
                  const { schedules } = await vendorFetch<{ schedules: { id: string; fromPlace: string; toPlace: string; scheduleDate: string; departureTime: string; arrivalTime: string; status: string }[] }>(`/api/listings/${listingId}/flights/${flightId}/schedules`);
                  setFlightSchedules((schedules ?? []).map((s) => ({
                    id: s.id,
                    route_from: s.fromPlace,
                    route_to: s.toPlace,
                    start_date: s.scheduleDate,
                    end_date: s.scheduleDate,
                    departure_time: s.departureTime ?? "",
                    arrival_time: s.arrivalTime ?? "",
                    status: s.status ?? "active",
                  })));
                  setScheduleForm({ route_id: "", schedule_date: "", departure_time: "06:00", arrival_time: "08:00" });
                  setScheduleDrawerOpen(false);
                } finally {
                  setScheduleSaving(false);
                }
              }}
            >
              {scheduleSaving ? "Saving…" : "Save schedule"}
            </Button>
          </SheetFooter>

          <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
            <Label className="text-sm font-medium text-muted-foreground">Existing schedules</Label>
            {flightSchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No schedules yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-[#E5E7EB]">
                <table className="w-full min-w-[400px] text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-muted/40">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Route</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Start date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">End date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Departure</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Arrival</th>
                      <th className="w-12 py-3 px-2" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {flightSchedules.map((s) => (
                      <tr key={s.id} className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-muted/20">
                        <td className="py-3 px-4 font-medium">{s.route_from} → {s.route_to}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{s.start_date || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{s.end_date || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{s.departure_time}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{s.arrival_time}</td>
                        <td className="py-3 px-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setFlightSchedules((prev) => prev.filter((x) => x.id !== s.id))} title="Delete schedule">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

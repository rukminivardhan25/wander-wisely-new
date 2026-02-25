import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plane,
  Check,
  Eye,
  Wifi,
  Zap,
  Tv,
  Utensils,
  LayoutGrid,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const CABIN_ORDER = ["first", "business", "economy"] as const;
const CABIN_LABEL: Record<string, string> = {
  first: "First",
  business: "Business",
  economy: "Economy / Budget",
};

/** Per-cabin: rows and left/right seats per row (e.g. Business 1-1, Economy 3-3) */
export interface CabinConfig {
  rows: number;
  left_cols: number;
  right_cols: number;
}

/** Flight details + class-wise seat structure. */
export interface FlightFormState {
  flight_number: string;
  airline_name: string;
  aircraft_type: string;
  flight_type: "domestic" | "international";
  /** Which cabin classes exist on this flight */
  classes_enabled: { first: boolean; business: boolean; economy: boolean };
  /** Per-class layout (only used when class is enabled) */
  cabin_first: CabinConfig;
  cabin_business: CabinConfig;
  cabin_economy: CabinConfig;
  base_fare_cents: number;
  status: "active" | "inactive";
  has_wifi: boolean;
  has_charging: boolean;
  has_entertainment: boolean;
  has_meal: boolean;
  baggage_allowance: string;
}

const AIRCRAFT_TYPES = [
  "A320",
  "A321",
  "B737",
  "B787",
  "ATR 72",
  "Embraer E190",
  "Other",
];

const defaultCabin = (rows: number, left: number, right: number): CabinConfig => ({
  rows,
  left_cols: left,
  right_cols: right,
});

const defaultForm = (): FlightFormState => ({
  flight_number: "",
  airline_name: "",
  aircraft_type: "A320",
  flight_type: "domestic",
  classes_enabled: { first: false, business: true, economy: true },
  cabin_first: defaultCabin(2, 1, 1),
  cabin_business: defaultCabin(6, 1, 1),
  cabin_economy: defaultCabin(28, 3, 3),
  base_fare_cents: 500000,
  status: "inactive",
  has_wifi: true,
  has_charging: true,
  has_entertainment: true,
  has_meal: false,
  baggage_allowance: "15 kg",
});

/** Build list of { class, rowIndex (global), leftCols, rightCols } for each physical row, front to back. */
function buildRows(form: FlightFormState): { cabin: string; globalRow: number; left_cols: number; right_cols: number }[] {
  const out: { cabin: string; globalRow: number; left_cols: number; right_cols: number }[] = [];
  let globalRow = 0;
  for (const cabin of CABIN_ORDER) {
    const enabled = cabin === "first" ? form.classes_enabled.first : cabin === "business" ? form.classes_enabled.business : form.classes_enabled.economy;
    if (!enabled) continue;
    const config = form.cabin_first && cabin === "first" ? form.cabin_first : cabin === "business" ? form.cabin_business : form.cabin_economy;
    for (let r = 0; r < config.rows; r++) {
      globalRow++;
      out.push({ cabin, globalRow, left_cols: config.left_cols, right_cols: config.right_cols });
    }
  }
  return out;
}

/** Seat letter for position (0-based). A,B,C... left side, then D,E,F... right. */
function seatLetter(index: number, leftCount: number, rightCount: number): string {
  if (index < leftCount) return String.fromCharCode(65 + index);
  return String.fromCharCode(65 + leftCount + (index - leftCount));
}

/** One route this flight can operate: from → to with fare. */
export interface FlightRouteRow {
  id: string;
  from_place: string;
  to_place: string;
  fare_cents: number;
}

function generateRouteId(): string {
  return `route-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ExistingFlightRow {
  id: string;
  flightNumber: string;
  airlineName: string;
  aircraftType: string;
  totalSeats: number;
  status: string;
}

function FlightListing() {
  const { listingId } = useParams<{ listingId: string }>();
  const [listingName, setListingName] = useState("");
  const [form, setForm] = useState<FlightFormState>(defaultForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  /** Routes this flight can take (city/airport to city/airport) with fare. */
  const [flightRoutes, setFlightRoutes] = useState<FlightRouteRow[]>([]);
  const [routeForm, setRouteForm] = useState({ from_place: "", to_place: "", fare_rupees: "" });
  const [existingFlights, setExistingFlights] = useState<ExistingFlightRow[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(true);

  useEffect(() => {
    if (!listingId) return;
    vendorFetch<{ name: string }>(`/api/listings/${listingId}`)
      .then((d) => setListingName(d?.name ?? ""))
      .catch(() => setListingName("…"));
  }, [listingId]);

  useEffect(() => {
    if (!listingId) return;
    setLoadingFlights(true);
    vendorFetch<{ flights: { id: string; flightNumber: string; airlineName: string; aircraftType: string; totalSeats: number; status: string }[] }>(`/api/listings/${listingId}/flights`)
      .then((d) => setExistingFlights(d.flights ?? []))
      .catch(() => setExistingFlights([]))
      .finally(() => setLoadingFlights(false));
  }, [listingId]);

  const rows = useMemo(() => buildRows(form), [form]);
  const totalSeatsFromLayout = useMemo(
    () => rows.reduce((sum, r) => sum + r.left_cols + r.right_cols, 0),
    [rows]
  );

  const validate = (): boolean => {
    if (!form.flight_number.trim()) {
      setFormError("Flight number is required.");
      return false;
    }
    if (!form.airline_name.trim()) {
      setFormError("Airline name is required.");
      return false;
    }
    const anyEnabled = form.classes_enabled.first || form.classes_enabled.business || form.classes_enabled.economy;
    if (!anyEnabled) {
      setFormError("Enable at least one cabin class.");
      return false;
    }
    setFormError("");
    return true;
  };

  const loadExistingFlights = () => {
    if (!listingId) return;
    vendorFetch<{ flights: { id: string; flightNumber: string; airlineName: string; aircraftType: string; totalSeats: number; status: string }[] }>(`/api/listings/${listingId}/flights`)
      .then((d) => setExistingFlights(d.flights ?? []))
      .catch(() => {});
  };

  const handleSave = async () => {
    if (!validate() || !listingId) return;
    setSaving(true);
    setFormError("");
    try {
      const totalSeats = totalSeatsFromLayout;
      const payload = {
        flight_number: form.flight_number.trim(),
        airline_name: form.airline_name.trim(),
        aircraft_type: form.aircraft_type,
        flight_type: form.flight_type,
        total_seats: totalSeats,
        status: form.status,
        base_fare_cents: form.base_fare_cents || null,
        baggage_allowance: form.baggage_allowance.trim() || null,
        seat_layout: {
          classes_enabled: form.classes_enabled,
          cabin_first: form.cabin_first,
          cabin_business: form.cabin_business,
          cabin_economy: form.cabin_economy,
        },
      };
      const created = await vendorFetch<{ id: string }>(`/api/listings/${listingId}/flights`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const flightId = created.id;
      for (const r of flightRoutes) {
        await vendorFetch(`/api/listings/${listingId}/flights/${flightId}/routes`, {
          method: "POST",
          body: JSON.stringify({ from_place: r.from_place, to_place: r.to_place, fare_cents: r.fare_cents }),
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setForm(defaultForm());
      setFlightRoutes([]);
      setRouteForm({ from_place: "", to_place: "", fare_rupees: "" });
      loadExistingFlights();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save flight";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const setCabin = (cabin: "first" | "business" | "economy", patch: Partial<CabinConfig>) => {
    const key = cabin === "first" ? "cabin_first" : cabin === "business" ? "cabin_business" : "cabin_economy";
    setForm((f) => ({
      ...f,
      [key]: { ...f[key], ...patch },
    }));
  };

  const addRoute = () => {
    const from = routeForm.from_place.trim();
    const to = routeForm.to_place.trim();
    const fareRupees = Number(routeForm.fare_rupees);
    if (!from || !to) {
      setFormError("From and To are required for a route.");
      return;
    }
    if (from === to) {
      setFormError("From and To must be different.");
      return;
    }
    if (!Number.isFinite(fareRupees) || fareRupees < 0) {
      setFormError("Enter a valid fare (₹).");
      return;
    }
    setFormError("");
    setFlightRoutes((prev) => [
      ...prev,
      { id: generateRouteId(), from_place: from, to_place: to, fare_cents: Math.round(fareRupees * 100) },
    ]);
    setRouteForm({ from_place: "", to_place: "", fare_rupees: "" });
  };

  const removeRoute = (id: string) => {
    setFlightRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/listings/${listingId}/transport`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {listingName || "…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Transport · Flight details & structure
          </p>
        </div>
      </div>

      {formError && (
        <div className="rounded-xl bg-destructive/10 text-destructive text-sm p-3 flex items-center justify-between gap-2">
          <span>{formError}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setFormError("")}>
            Dismiss
          </Button>
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm p-3 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          Flight saved. You can add another below or go back to Fleet.
        </div>
      )}

      {/* Existing flights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" /> Your flights
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage schedules and routes for each flight from the detail page.
          </p>
        </CardHeader>
        <CardContent>
          {loadingFlights ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : existingFlights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flights yet. Add your first flight using the form below.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-medium py-2 px-3">Flight</th>
                    <th className="text-left font-medium py-2 px-3">Airline</th>
                    <th className="text-left font-medium py-2 px-3">Aircraft</th>
                    <th className="text-left font-medium py-2 px-3">Seats</th>
                    <th className="text-left font-medium py-2 px-3">Status</th>
                    <th className="text-right font-medium py-2 px-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {existingFlights.map((f) => (
                    <tr key={f.id} className="border-b border-border hover:bg-muted/20">
                      <td className="py-2 px-3 font-mono font-medium">{f.flightNumber}</td>
                      <td className="py-2 px-3 text-muted-foreground">{f.airlineName}</td>
                      <td className="py-2 px-3 text-muted-foreground">{f.aircraftType}</td>
                      <td className="py-2 px-3 text-muted-foreground">{f.totalSeats}</td>
                      <td className="py-2 px-3">
                        <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full capitalize", f.status === "active" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-muted text-muted-foreground")}>
                          {f.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild title="View / manage flight">
                          <Link to={`/listings/${listingId}/transport/flight/${f.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. Flight details (add new) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" /> Flight details
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Basic identity and flight type.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Flight number</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.flight_number}
                onChange={(e) => setForm((f) => ({ ...f, flight_number: e.target.value }))}
                placeholder="e.g. 6E-201"
              />
            </div>
            <div>
              <Label>Airline name</Label>
              <Input
                className="mt-1 rounded-xl"
                value={form.airline_name}
                onChange={(e) => setForm((f) => ({ ...f, airline_name: e.target.value }))}
                placeholder="e.g. IndiGo"
              />
            </div>
            <div>
              <Label>Flight type</Label>
              <Select
                value={form.flight_type}
                onValueChange={(v: "domestic" | "international") => setForm((f) => ({ ...f, flight_type: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestic">Domestic</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aircraft type</Label>
              <Select
                value={form.aircraft_type}
                onValueChange={(v) => setForm((f) => ({ ...f, aircraft_type: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AIRCRAFT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Available classes & class-wise seat structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" /> Seat structure
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which cabin classes this flight has, then set rows and seat arrangement per class (e.g. Business 1-1, Economy 3-3). Preview updates as you design.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="block mb-3">Available cabin classes</Label>
            <div className="flex flex-wrap gap-6">
              {CABIN_ORDER.map((cabin) => (
                <label key={cabin} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={cabin === "first" ? form.classes_enabled.first : cabin === "business" ? form.classes_enabled.business : form.classes_enabled.economy}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({
                        ...f,
                        classes_enabled: {
                          ...f.classes_enabled,
                          [cabin]: !!checked,
                        },
                      }))
                    }
                  />
                  <span className="text-sm font-medium">{CABIN_LABEL[cabin]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Per-class configuration */}
          <div className="space-y-6">
            {form.classes_enabled.first && (
              <div className="rounded-xl border border-border p-4 bg-amber-50/50 dark:bg-amber-950/20">
                <h4 className="font-medium text-foreground mb-3">First class</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Rows</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      className="mt-1 rounded-xl"
                      value={form.cabin_first.rows}
                      onChange={(e) => setCabin("first", { rows: Math.max(1, Math.min(20, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div>
                    <Label>Seats left of aisle</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      className="mt-1 rounded-xl"
                      value={form.cabin_first.left_cols}
                      onChange={(e) => setCabin("first", { left_cols: Math.max(1, Math.min(4, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div>
                    <Label>Seats right of aisle</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      className="mt-1 rounded-xl"
                      value={form.cabin_first.right_cols}
                      onChange={(e) => setCabin("first", { right_cols: Math.max(1, Math.min(4, Number(e.target.value) || 0)) })}
                    />
                  </div>
                </div>
              </div>
            )}
            {form.classes_enabled.business && (
              <div className="rounded-xl border border-border p-4 bg-sky-50/50 dark:bg-sky-950/20">
                <h4 className="font-medium text-foreground mb-3">Business class</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Rows</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      className="mt-1 rounded-xl"
                      value={form.cabin_business.rows}
                      onChange={(e) => setCabin("business", { rows: Math.max(1, Math.min(30, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div>
                    <Label>Seats left of aisle (e.g. 1)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      className="mt-1 rounded-xl"
                      value={form.cabin_business.left_cols}
                      onChange={(e) => setCabin("business", { left_cols: Math.max(1, Math.min(4, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div>
                    <Label>Seats right of aisle (e.g. 1)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      className="mt-1 rounded-xl"
                      value={form.cabin_business.right_cols}
                      onChange={(e) => setCabin("business", { right_cols: Math.max(1, Math.min(4, Number(e.target.value) || 0)) })}
                    />
                  </div>
                </div>
              </div>
            )}
            {form.classes_enabled.economy && (
              <div className="rounded-xl border border-border p-4 bg-slate-50/50 dark:bg-slate-900/30">
                <h4 className="font-medium text-foreground mb-3">Economy / Budget</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Rows</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      className="mt-1 rounded-xl"
                      value={form.cabin_economy.rows}
                      onChange={(e) => setCabin("economy", { rows: Math.max(1, Math.min(60, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div>
                    <Label>Seats left of aisle (e.g. 3)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      className="mt-1 rounded-xl"
                      value={form.cabin_economy.left_cols}
                      onChange={(e) => setCabin("economy", { left_cols: Math.max(1, Math.min(5, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div>
                    <Label>Seats right of aisle (e.g. 3)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      className="mt-1 rounded-xl"
                      value={form.cabin_economy.right_cols}
                      onChange={(e) => setCabin("economy", { right_cols: Math.max(1, Math.min(5, Number(e.target.value) || 0)) })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Total seats from layout: <strong>{totalSeatsFromLayout}</strong>
          </p>

          {/* Horizontal seat map: front = left, each column = one row, with seat numbers */}
          <div>
            <Label className="block mb-2">Preview — horizontal (front left, rear right)</Label>
            <div className="rounded-xl border border-border bg-muted/20 p-4 overflow-x-auto">
              <div className="flex gap-1 items-stretch min-w-max">
                {/* Cockpit */}
                <div className="flex flex-col items-center justify-center w-14 shrink-0 rounded-lg bg-slate-600 text-slate-200 text-[10px] font-medium px-1 py-2">
                  Cockpit
                </div>
                {/* Each physical row = one column (horizontal flow) */}
                {rows.map((r, idx) => {
                  const totalInRow = r.left_cols + r.right_cols;
                  const letters: string[] = [];
                  for (let i = 0; i < r.left_cols; i++) letters.push(seatLetter(i, r.left_cols, r.right_cols));
                  for (let i = 0; i < r.right_cols; i++) letters.push(seatLetter(r.left_cols + i, r.left_cols, r.right_cols));
                  const cabinColor =
                    r.cabin === "first"
                      ? "bg-amber-500/80"
                      : r.cabin === "business"
                        ? "bg-sky-500/80"
                        : "bg-slate-500/80";
                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-0.5 shrink-0 w-12 border border-border/50 rounded-lg overflow-hidden bg-background"
                      title={`Row ${r.globalRow} (${CABIN_LABEL[r.cabin]})`}
                    >
                      <div className="text-[10px] font-medium text-center py-0.5 bg-muted/50 border-b border-border/50">
                        {r.globalRow}
                      </div>
                      <div className="flex flex-1 p-0.5 gap-0.5">
                        <div className="flex flex-col gap-0.5 flex-1">
                          {Array.from({ length: r.left_cols }, (_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "min-h-[22px] flex items-center justify-center text-[10px] font-mono font-medium rounded text-white",
                                cabinColor
                              )}
                            >
                              {r.globalRow}{letters[i]}
                            </div>
                          ))}
                        </div>
                        <div className="w-0.5 bg-slate-300 rounded flex-shrink-0 self-stretch my-0.5" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          {Array.from({ length: r.right_cols }, (_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "min-h-[22px] flex items-center justify-center text-[10px] font-mono font-medium rounded text-white",
                                cabinColor
                              )}
                            >
                              {r.globalRow}{letters[r.left_cols + i]}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                {form.classes_enabled.first && <span><span className="inline-block w-3 h-3 rounded bg-amber-500/80 align-middle mr-1" /> First</span>}
                {form.classes_enabled.business && <span><span className="inline-block w-3 h-3 rounded bg-sky-500/80 align-middle mr-1" /> Business</span>}
                {form.classes_enabled.economy && <span><span className="inline-block w-3 h-3 rounded bg-slate-500/80 align-middle mr-1" /> Economy</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Routes & pricing (city/airport to city/airport, fare per route) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Routes & pricing
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add the routes this flight can take (from city/airport to city/airport) and the fare for each journey. Like bus routes: define which connections are available and the price between those two points.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-muted/30 border border-border">
            <div className="min-w-[140px]">
              <Label className="text-xs">From (city or airport)</Label>
              <Input
                className="mt-1 rounded-lg"
                value={routeForm.from_place}
                onChange={(e) => setRouteForm((f) => ({ ...f, from_place: e.target.value }))}
                placeholder="e.g. Hyderabad (HYD)"
              />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs">To (city or airport)</Label>
              <Input
                className="mt-1 rounded-lg"
                value={routeForm.to_place}
                onChange={(e) => setRouteForm((f) => ({ ...f, to_place: e.target.value }))}
                placeholder="e.g. Bangalore (BLR)"
              />
            </div>
            <div className="w-28">
              <Label className="text-xs">Fare (₹)</Label>
              <Input
                type="number"
                min={0}
                className="mt-1 rounded-lg"
                value={routeForm.fare_rupees}
                onChange={(e) => setRouteForm((f) => ({ ...f, fare_rupees: e.target.value }))}
                placeholder="3500"
              />
            </div>
            <Button type="button" size="sm" className="rounded-lg gap-1.5" onClick={addRoute}>
              <Plus className="h-4 w-4" /> Add route
            </Button>
          </div>
          {flightRoutes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 text-center text-sm text-muted-foreground">
              No routes yet. Add from–to and fare above to define which journeys this flight can serve.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">From</th>
                    <th className="text-left p-3 font-medium">To</th>
                    <th className="text-left p-3 font-medium">Fare (₹)</th>
                    <th className="text-right p-3 font-medium w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flightRoutes.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3 font-medium">{r.from_place}</td>
                      <td className="p-3 font-medium">{r.to_place}</td>
                      <td className="p-3">{(r.fare_cents / 100).toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => removeRoute(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Amenities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Amenities</CardTitle>
          <p className="text-sm text-muted-foreground">
            Onboard services and allowances.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_wifi}
                onChange={(e) => setForm((f) => ({ ...f, has_wifi: e.target.checked }))}
                className="rounded"
              />
              <Wifi className="h-4 w-4 text-muted-foreground" />
              WiFi
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_charging}
                onChange={(e) => setForm((f) => ({ ...f, has_charging: e.target.checked }))}
                className="rounded"
              />
              <Zap className="h-4 w-4 text-muted-foreground" />
              USB / Power
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_entertainment}
                onChange={(e) => setForm((f) => ({ ...f, has_entertainment: e.target.checked }))}
                className="rounded"
              />
              <Tv className="h-4 w-4 text-muted-foreground" />
              In-flight entertainment
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_meal}
                onChange={(e) => setForm((f) => ({ ...f, has_meal: e.target.checked }))}
                className="rounded"
              />
              <Utensils className="h-4 w-4 text-muted-foreground" />
              Meal
            </label>
          </div>
          <div>
            <Label>Baggage allowance</Label>
            <Input
              className="mt-1 rounded-xl max-w-xs"
              value={form.baggage_allowance}
              onChange={(e) => setForm((f) => ({ ...f, baggage_allowance: e.target.value }))}
              placeholder="e.g. 15 kg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl gap-2"
        >
          {saving ? "Saving…" : "Save flight details"}
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default FlightListing;

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bus,
  Plane,
  Train,
  Hotel,
  Ticket,
  Car,
  Bike,
  MapPin,
  Users,
  Search,
  ArrowLeft,
  SlidersHorizontal,
  Wifi,
  Battery,
  Tv,
  Droplets,
  Snowflake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

const CATEGORIES = [
  { id: "bus", label: "Bus", icon: Bus },
  { id: "flight", label: "Flight", icon: Plane },
  { id: "train", label: "Train", icon: Train },
  { id: "hotel", label: "Hotel", icon: Hotel },
  { id: "experience", label: "Experiences", icon: Ticket },
  { id: "car", label: "Car Rental", icon: Car },
  { id: "bike", label: "Bike Rental", icon: Bike },
  { id: "tours", label: "Local Tours", icon: MapPin },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

/** API bus option (one schedule per row). */
type ApiBusOption = {
  listingId: string;
  listingName: string;
  busId: string;
  busName: string;
  registrationNumber?: string | null;
  busNumber: string | null;
  totalSeats: number;
  driverName?: string | null;
  driverPhone?: string | null;
  availableSeats?: number;
  rows?: number;
  leftCols?: number;
  rightCols?: number;
  hasAisle?: boolean;
  layoutType?: string | null;
  busType?: string | null;
  acType?: string | null;
  hasWifi?: boolean;
  hasCharging?: boolean;
  hasEntertainment?: boolean;
  hasToilet?: boolean;
  scheduleId: string;
  departureTime: string;
  arrivalTime: string;
  routeFrom: string | null;
  routeTo: string | null;
  pricePerSeatCents: number | null;
};

/** Format Date to YYYY-MM-DD in local time. */
function dateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const todayDate = () => new Date();

function formatBusType(t: string | null | undefined): string {
  if (!t) return "";
  const map: Record<string, string> = { seater: "Seater", sleeper: "Sleeper", semi_sleeper: "Semi-sleeper" };
  return map[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAcType(t: string | null | undefined): string {
  if (!t) return "";
  return String(t).toLowerCase().replace(/-/g, "_") === "ac" ? "AC" : "Non-AC";
}

const BookingMarketplace = () => {
  const [tripOrigin, setTripOrigin] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState<Date | undefined>(todayDate);
  const [passengers, setPassengers] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [bookedSeatNumbers, setBookedSeatNumbers] = useState<number[]>([]);
  const [busList, setBusList] = useState<ApiBusOption[]>([]);
  const [busLoading, setBusLoading] = useState(false);
  const [busError, setBusError] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [filterPriceMin, setFilterPriceMin] = useState<string>("");
  const [filterPriceMax, setFilterPriceMax] = useState<string>("");
  const [filterDeparture, setFilterDeparture] = useState<string>("any");
  const [filterAc, setFilterAc] = useState(false);
  const [filterNonAc, setFilterNonAc] = useState(false);
  const [filterSleeper, setFilterSleeper] = useState(false);
  const [filterSeater, setFilterSeater] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    apiFetch<{ trip: { origin: string; destination: string } }>("/api/trips/active", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      if (data?.trip) {
        setTripOrigin(data.trip.origin);
        setTripDestination(data.trip.destination);
        setFrom(data.trip.origin);
        setTo(data.trip.destination);
      }
    });
  }, [token]);

  // Load cities for From/To dropdowns when Bus is selected
  useEffect(() => {
    if (selectedCategory !== "bus") return;
    apiFetch<{ cities: string[] }>("/api/transport/cities").then(({ data }) => {
      const list = data?.cities ?? [];
      setCities(list);
      // If trip already set from/to, match to a city in the list (case-insensitive) so dropdown shows it
      setFrom((prev) => {
        if (!prev) return prev;
        const match = list.find((c) => c.toLowerCase().trim() === prev.toLowerCase().trim());
        return match ?? prev;
      });
      setTo((prev) => {
        if (!prev) return prev;
        const match = list.find((c) => c.toLowerCase().trim() === prev.toLowerCase().trim());
        return match ?? prev;
      });
    });
  }, [selectedCategory]);

  /** Parse "HH:MM" to minutes since midnight; invalid returns -1. */
  const departureMinutes = (bus: ApiBusOption): number => {
    const t = bus.departureTime?.trim() ?? "";
    const [h, m] = t.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
    return h * 60 + m;
  };

  const filteredBusList = useMemo(() => {
    let list = busList;
    const priceMin = filterPriceMin.trim() !== "" ? Number(filterPriceMin) : NaN;
    const priceMax = filterPriceMax.trim() !== "" ? Number(filterPriceMax) : NaN;
    if (Number.isFinite(priceMin) || Number.isFinite(priceMax)) {
      list = list.filter((bus) => {
        const p = bus.pricePerSeatCents != null ? bus.pricePerSeatCents / 100 : NaN;
        if (!Number.isFinite(p)) return false;
        if (Number.isFinite(priceMin) && p < priceMin) return false;
        if (Number.isFinite(priceMax) && p > priceMax) return false;
        return true;
      });
    }
    if (filterDeparture !== "any") {
      const [start, end] =
        filterDeparture === "before_6"
          ? [0, 6 * 60]
          : filterDeparture === "6_12"
            ? [6 * 60, 12 * 60]
            : filterDeparture === "12_18"
              ? [12 * 60, 18 * 60]
              : [18 * 60, 24 * 60];
      list = list.filter((bus) => {
        const min = departureMinutes(bus);
        if (min < 0) return false;
        if (end <= 24 * 60) return min >= start && min < end;
        return min >= start;
      });
    }
    if (filterAc || filterNonAc) {
      list = list.filter((bus) => {
        const ac = String(bus.acType ?? "non_ac").toLowerCase().replace(/-/g, "_");
        const isAc = ac === "ac";
        const isNonAc = ac === "non_ac" || ac === "nonac";
        if (filterAc && filterNonAc) return true;
        if (filterAc) return isAc;
        if (filterNonAc) return isNonAc;
        return false;
      });
    }
    if (filterSleeper || filterSeater) {
      list = list.filter((bus) => {
        const t = bus.busType ?? "";
        if (filterSleeper && (t === "sleeper" || t === "semi_sleeper")) return true;
        if (filterSeater && t === "seater") return true;
        return false;
      });
    }
    return list;
  }, [
    busList,
    filterPriceMin,
    filterPriceMax,
    filterDeparture,
    filterAc,
    filterNonAc,
    filterSleeper,
    filterSeater,
  ]);

  const runBusSearch = () => {
    if (selectedCategory !== "bus" || !date) return;
    setBusLoading(true);
    setBusError("");
    setSearchDone(true);
    const dateStr = dateToYYYYMMDD(date);
    const params = new URLSearchParams({ date: dateStr, passengers: String(passengers) });
    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());
    apiFetch<{ date: string; buses: ApiBusOption[] }>(`/api/transport/available-buses?${params.toString()}`)
      .then(({ data, error }) => {
        if (error) {
          setBusList([]);
          setBusError(error);
          return;
        }
        setBusList(data?.buses ?? []);
      })
      .finally(() => setBusLoading(false));
  };

  const toggleSeat = (n: number) => {
    setSelectedSeats((prev) => (prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n]));
  };

  const selectedBus = selectedBusId ? busList.find((b) => b.scheduleId === selectedBusId) : null;
  const totalSeats = selectedBus?.totalSeats ?? 28;
  const busRows = selectedBus?.rows ?? Math.ceil(totalSeats / 4);
  const leftCols = selectedBus?.leftCols ?? 2;
  const rightCols = selectedBus?.rightCols ?? 2;
  const hasAisle = selectedBus?.hasAisle ?? true;
  const colsPerRow = leftCols + rightCols;
  const bookedSet = useMemo(() => new Set(bookedSeatNumbers), [bookedSeatNumbers]);
  const pricePerSeat = selectedBus?.pricePerSeatCents ?? 0;

  // Load already-booked seats when seat modal opens for a bus/date so they show as unavailable
  useEffect(() => {
    if (!seatModalOpen || !selectedBus?.busId || !date) {
      setBookedSeatNumbers([]);
      return;
    }
    const travelDate = dateToYYYYMMDD(date);
    apiFetch<{ bookedSeats?: number[] }>(
      `/api/bookings/booked-seats?bus_id=${encodeURIComponent(selectedBus.busId)}&date=${encodeURIComponent(travelDate)}`
    ).then(({ data }) => {
      setBookedSeatNumbers(data?.bookedSeats ?? []);
    });
  }, [seatModalOpen, selectedBus?.busId, date]);
  const layoutLabel = selectedBus?.layoutType
    ? `${selectedBus.layoutType} seater layout`
    : `${leftCols}+${rightCols} seater layout`;

  if (!token) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Sign in to book.</p>
            <Button asChild variant="hero">
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/80 pt-20 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          <Link
            to="/my-trip"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Trip
          </Link>

          {/* Category cards - first */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">What do you want to book?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    selectedCategory === cat.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-slate-200 bg-white hover:border-slate-300 text-foreground"
                  }`}
                >
                  <cat.icon className="h-8 w-8" />
                  <span className="text-xs font-medium text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search bookings - only after selecting a transport type */}
          {selectedCategory && ["bus", "flight", "train", "car", "bike"].includes(selectedCategory) && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-6 mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Search bookings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs">From</Label>
                  <Select value={from || "_"} onValueChange={(v) => setFrom(v === "_" ? "" : v)}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Select city</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Select value={to || "_"} onValueChange={(v) => setTo(v === "_" ? "" : v)}>
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Select city</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={date ? dateToYYYYMMDD(date) : ""}
                    onChange={(e) => setDate(e.target.value ? new Date(e.target.value + "T12:00:00") : todayDate())}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Passengers</Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={passengers}
                    onChange={(e) => setPassengers(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full rounded-xl gap-2"
                    size="lg"
                    onClick={runBusSearch}
                    disabled={!date}
                  >
                    <Search className="h-4 w-4" /> Search
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Category content: Bus */}
          {selectedCategory === "bus" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-3">
                  {searchDone
                    ? `Available buses${from && to ? ` ${from} → ${to}` : ""}${date ? ` · ${dateToYYYYMMDD(date)}` : ""} (${passengers} passenger${passengers !== 1 ? "s" : ""})`
                    : "Available buses"}
                </h3>
                {busError && (
                  <div
                    className={`mb-4 rounded-xl border p-4 text-sm ${
                      busError.includes("not running") || busError.includes("vendor hub")
                        ? "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                        : "border-destructive/50 bg-destructive/5 text-destructive"
                    }`}
                  >
                    <p className="font-medium">{busError}</p>
                    {(busError.includes("3002") || busError.includes("vendor hub")) && (
                      <p className="mt-2 text-xs opacity-90">
                        In a separate terminal run: <code className="rounded bg-black/10 px-1 py-0.5">cd vendor-hub-main/backend && npm run dev</code>
                      </p>
                    )}
                  </div>
                )}
                {!searchDone && !busLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Select From, To, Date and Passengers, then click Search to see buses with enough seats.
                  </p>
                ) : busLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading buses…</p>
                ) : busList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No buses found for this route and date with at least {passengers} seat(s) available. Try another date or route.
                  </p>
                ) : filteredBusList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No buses match the selected filters. Clear filters to see all {busList.length} result(s).
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredBusList.map((bus) => (
                      <div
                        key={bus.scheduleId}
                        className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{bus.listingName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            {bus.busName}
                            {bus.busNumber && ` · ${bus.busNumber}`}
                            {bus.routeFrom && bus.routeTo && ` · ${bus.routeFrom} → ${bus.routeTo}`}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm">
                            <span>{bus.departureTime} → {bus.arrivalTime}</span>
                            <span className="text-muted-foreground">
                              {(bus.availableSeats ?? bus.totalSeats)} seats available
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {bus.busType && (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {formatBusType(bus.busType)}
                              </span>
                            )}
                            {bus.acType && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <Snowflake className="h-3 w-3 opacity-70" />
                                {formatAcType(bus.acType)}
                              </span>
                            )}
                            {(bus.hasWifi || bus.hasCharging || bus.hasEntertainment || bus.hasToilet) && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                {bus.hasWifi && <Wifi className="h-3.5 w-3" title="WiFi" />}
                                {bus.hasCharging && <Battery className="h-3.5 w-3" title="Charging" />}
                                {bus.hasEntertainment && <Tv className="h-3.5 w-3" title="Entertainment" />}
                                {bus.hasToilet && <Droplets className="h-3.5 w-3" title="Toilet" />}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div>
                            <p className="text-lg font-semibold text-foreground">
                              ₹ {bus.pricePerSeatCents != null ? (bus.pricePerSeatCents / 100).toLocaleString("en-IN") : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">per seat</p>
                          </div>
                          <Button
                            size="sm"
                            variant="hero"
                            className="rounded-xl"
                            onClick={() => {
                              setSelectedBusId(bus.scheduleId);
                              setSelectedSeats([]);
                              setSeatModalOpen(true);
                            }}
                          >
                            View seats
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 h-fit">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <Label className="text-xs">Price range (₹)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Min"
                        className="rounded-lg"
                        value={filterPriceMin}
                        onChange={(e) => setFilterPriceMin(e.target.value)}
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Max"
                        className="rounded-lg"
                        value={filterPriceMax}
                        onChange={(e) => setFilterPriceMax(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Departure</Label>
                    <select
                      className="w-full mt-1 rounded-lg border border-input px-3 py-2 text-sm bg-background"
                      value={filterDeparture}
                      onChange={(e) => setFilterDeparture(e.target.value)}
                    >
                      <option value="any">Any</option>
                      <option value="before_6">Before 6 AM</option>
                      <option value="6_12">6 AM - 12 PM</option>
                      <option value="12_18">12 PM - 6 PM</option>
                      <option value="after_18">After 6 PM</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={filterAc}
                        onChange={(e) => setFilterAc(e.target.checked)}
                      />
                      AC
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={filterNonAc}
                        onChange={(e) => setFilterNonAc(e.target.checked)}
                      />
                      Non-AC
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={filterSleeper}
                        onChange={(e) => setFilterSleeper(e.target.checked)}
                      />
                      Sleeper
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={filterSeater}
                        onChange={(e) => setFilterSeater(e.target.checked)}
                      />
                      Seater
                    </label>
                  </div>
                  {(filterPriceMin !== "" ||
                    filterPriceMax !== "" ||
                    filterDeparture !== "any" ||
                    filterAc ||
                    filterNonAc ||
                    filterSleeper ||
                    filterSeater) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full rounded-lg text-xs"
                      onClick={() => {
                        setFilterPriceMin("");
                        setFilterPriceMax("");
                        setFilterDeparture("any");
                        setFilterAc(false);
                        setFilterNonAc(false);
                        setFilterSleeper(false);
                        setFilterSeater(false);
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other categories */}
          {selectedCategory && selectedCategory !== "bus" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground">
              <p>{CATEGORIES.find((c) => c.id === selectedCategory)?.label} booking coming soon.</p>
              <p className="text-sm mt-2">Use the categories above or go back to My Trip.</p>
            </div>
          )}
        </div>
      </div>

      {/* Seat layout modal - bus style 2+2 with aisle */}
      <Dialog open={seatModalOpen} onOpenChange={setSeatModalOpen}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select seats</DialogTitle>
            <DialogDescription>
              Click on a green seat to select. Window and aisle seats are marked.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Front of bus - driver */}
            <div className="bg-slate-700 text-slate-200 rounded-t-xl py-3 px-4 text-center text-sm font-medium border-b-2 border-slate-600">
              Driver · Front
            </div>

            {/* Bus body - dynamic layout from bus config */}
            <div className="bg-slate-100 rounded-b-xl p-3 border border-t-0 border-slate-200">
              {Array.from({ length: busRows }, (_, rowIndex) => (
                <div key={rowIndex} className="flex items-stretch gap-1 mb-2 last:mb-0">
                  <div className="flex gap-1 flex-1">
                    {Array.from({ length: leftCols }, (_, col) => {
                      const n = rowIndex * colsPerRow + col + 1;
                      if (n > totalSeats) return <div key={`l-${col}`} className="flex-1" />;
                      const booked = bookedSet.has(n);
                      const selected = selectedSeats.includes(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={booked}
                          onClick={() => !booked && toggleSeat(n)}
                          title={`Seat ${n}`}
                          className={`flex-1 min-w-[2.5rem] py-2.5 rounded-md text-xs font-semibold transition-all ${
                            booked
                              ? "bg-slate-400 cursor-not-allowed text-slate-600"
                              : selected
                                ? "bg-blue-500 text-white ring-2 ring-blue-300"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  {hasAisle && <div className="w-3 bg-slate-300 rounded flex-shrink-0 self-stretch" aria-hidden />}
                  <div className="flex gap-1 flex-1">
                    {Array.from({ length: rightCols }, (_, col) => {
                      const n = rowIndex * colsPerRow + leftCols + col + 1;
                      if (n > totalSeats) return <div key={`r-${col}`} className="flex-1" />;
                      const booked = bookedSet.has(n);
                      const selected = selectedSeats.includes(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={booked}
                          onClick={() => !booked && toggleSeat(n)}
                          title={`Seat ${n}`}
                          className={`flex-1 min-w-[2.5rem] py-2.5 rounded-md text-xs font-semibold transition-all ${
                            booked
                              ? "bg-slate-400 cursor-not-allowed text-slate-600"
                              : selected
                                ? "bg-blue-500 text-white ring-2 ring-blue-300"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-2 text-center">↑ Front &nbsp; · &nbsp; {layoutLabel}</p>

            <div className="flex gap-4 mt-4 text-xs justify-center flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-slate-400" /> Booked</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-blue-500" /> Selected</span>
            </div>
          </div>
          <DialogFooter>
            <p className="text-sm text-muted-foreground mr-auto">
              {selectedSeats.length} seat(s) selected
              {pricePerSeat > 0 && ` · ₹ ${((selectedSeats.length * pricePerSeat) / 100).toLocaleString("en-IN")}`}
            </p>
            <Button variant="outline" className="rounded-xl" onClick={() => setSeatModalOpen(false)}>Cancel</Button>
            <Button
              variant="hero"
              className="rounded-xl"
              disabled={selectedSeats.length === 0}
              onClick={() => {
                if (selectedSeats.length === 0 || !selectedBus) return;
                setSeatModalOpen(false);
                navigate("/my-trip/payment", {
                  state: {
                    bus: {
                      busId: selectedBus.busId,
                      listingId: selectedBus.listingId,
                      listingName: selectedBus.listingName,
                      busName: selectedBus.busName,
                      registrationNumber: selectedBus.registrationNumber ?? null,
                      busNumber: selectedBus.busNumber ?? null,
                      departureTime: selectedBus.departureTime,
                      routeFrom: selectedBus.routeFrom,
                      routeTo: selectedBus.routeTo,
                      pricePerSeatCents: selectedBus.pricePerSeatCents,
                      driverName: selectedBus.driverName ?? null,
                      driverPhone: selectedBus.driverPhone ?? null,
                    },
                    selectedSeats: [...selectedSeats].sort((a, b) => a - b),
                    travelDate: date ? dateToYYYYMMDD(date) : "",
                    routeFrom: from || selectedBus.routeFrom || "",
                    routeTo: to || selectedBus.routeTo || "",
                    pricePerSeatCents: pricePerSeat,
                    totalCents: selectedSeats.length * pricePerSeat,
                  },
                });
              }}
            >
              Continue to payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BookingMarketplace;

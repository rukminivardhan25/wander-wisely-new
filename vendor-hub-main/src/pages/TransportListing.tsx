import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bus, MapPin, Calendar, DollarSign, Clock, Plus, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Listing {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
}

interface DriverRow {
  id: string;
  listing_id: string;
  name: string | null;
  phone: string | null;
  license_no: string | null;
  created_at: string;
}

interface BusRow {
  id: string;
  name: string;
  bus_type: string;
  layout_type: string;
  rows: number;
  left_cols: number;
  right_cols: number;
  has_aisle: boolean;
  total_seats: number;
  base_price_per_seat_cents: number;
  status: string;
}

interface RouteRow {
  id: string;
  from_place: string;
  to_place: string;
  distance_km: number | null;
  duration_minutes: number | null;
  price_per_seat_cents: number | null;
}

const LAYOUT_OPTIONS = [
  { value: "2+2", label: "2+2 Seater" },
  { value: "2+1", label: "2+1 Seater" },
  { value: "sleeper", label: "Sleeper" },
  { value: "custom", label: "Custom" },
];

const BUS_TYPES = [
  { value: "seater", label: "Seater" },
  { value: "semi_sleeper", label: "Semi Sleeper" },
  { value: "sleeper", label: "Sleeper" },
];

export default function TransportListing() {
  const { listingId } = useParams<{ listingId: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busModalOpen, setBusModalOpen] = useState(false);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [seatPreview, setSeatPreview] = useState({ rows: 7, left: 2, right: 2, aisle: true });
  const [busForm, setBusForm] = useState({
    name: "",
    bus_type: "seater",
    layout_type: "2+2",
    rows: 7,
    left_cols: 2,
    right_cols: 2,
    has_aisle: true,
    base_price_per_seat_cents: 0,
  });
  const [routeForm, setRouteForm] = useState({
    from_place: "",
    to_place: "",
    distance_km: "",
    duration_minutes: "",
    price_per_seat_rupees: "",
  });
  const [schedulesByRoute, setSchedulesByRoute] = useState<Record<string, { id: string; bus_id: string; departure_time: string; arrival_time: string; operating_days: string[] }[]>>({});
  const [availability, setAvailability] = useState<{ id: string; date: string; status: string; note: string | null }[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleRouteId, setScheduleRouteId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ bus_id: "", departure_time: "22:00", arrival_time: "06:00", operating_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] });
  const [availabilityForm, setAvailabilityForm] = useState({ date: "", status: "available" as "available" | "cancelled" | "holiday" });
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [driverForm, setDriverForm] = useState({ name: "", phone: "", license_no: "" });
  const [driverSaving, setDriverSaving] = useState(false);
  const [addRouteForBusId, setAddRouteForBusId] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;
    setError("");
    (async () => {
      try {
        const [listResult, busesResult, routesResult, availResult, driversResult] = await Promise.allSettled([
          vendorFetch<Listing>(`/api/listings/${listingId}`),
          vendorFetch<{ buses: BusRow[] }>(`/api/listings/${listingId}/buses`),
          vendorFetch<{ routes: RouteRow[] }>(`/api/listings/${listingId}/routes`),
          vendorFetch<{ availability: { id: string; date: string; status: string; note: string | null }[] }>(`/api/listings/${listingId}/availability`),
          vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/drivers`),
        ]);
        const errs: string[] = [];
        if (listResult.status === "fulfilled") setListing(listResult.value);
        else errs.push(listResult.reason?.message ?? "Failed to load listing");
        if (busesResult.status === "fulfilled") setBuses(busesResult.value.buses ?? []);
        else errs.push(busesResult.reason?.message ?? "Failed to load buses");
        if (routesResult.status === "fulfilled") setRoutes(routesResult.value.routes ?? []);
        else errs.push(routesResult.reason?.message ?? "Failed to load routes");
        if (availResult.status === "fulfilled") setAvailability(availResult.value.availability ?? []);
        else errs.push(availResult.reason?.message ?? "Failed to load availability");
        if (driversResult.status === "fulfilled") setDrivers(driversResult.value.drivers ?? []);
        if (errs.length > 0) setError(errs[0]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId]);

  useEffect(() => {
    if (routes.length === 0) {
      setSchedulesByRoute({});
      return;
    }
    (async () => {
      const out: Record<string, { id: string; bus_id: string; departure_time: string; arrival_time: string; operating_days: string[] }[]> = {};
      await Promise.all(
        routes.map(async (r) => {
          try {
            const res = await vendorFetch<{ schedules: { id: string; bus_id: string; departure_time: string; arrival_time: string; operating_days: string[] }[] }>(`/api/routes/${r.id}/schedules`);
            out[r.id] = res.schedules ?? [];
          } catch {
            out[r.id] = [];
          }
        })
      );
      setSchedulesByRoute(out);
    })();
  }, [routes]);

  const totalSeatsPreview = seatPreview.rows * (seatPreview.left + seatPreview.right);

  const openAddBus = () => {
    setEditingBusId(null);
    setBusForm({ name: "", bus_type: "seater", layout_type: "2+2", rows: 7, left_cols: 2, right_cols: 2, has_aisle: true, base_price_per_seat_cents: 0 });
    setSeatPreview({ rows: 7, left: 2, right: 2, aisle: true });
    setBusModalOpen(true);
  };

  const openEditBus = (bus: BusRow) => {
    setEditingBusId(bus.id);
    setBusForm({
      name: bus.name,
      bus_type: bus.bus_type,
      layout_type: bus.layout_type,
      rows: bus.rows,
      left_cols: bus.left_cols,
      right_cols: bus.right_cols,
      has_aisle: bus.has_aisle,
      base_price_per_seat_cents: bus.base_price_per_seat_cents,
    });
    setSeatPreview({ rows: bus.rows, left: bus.left_cols, right: bus.right_cols, aisle: bus.has_aisle });
    setBusModalOpen(true);
  };

  const handleSaveBus = async () => {
    if (!listingId) return;
    const payload = {
      name: busForm.name || "New Bus",
      bus_type: busForm.bus_type,
      layout_type: busForm.layout_type,
      rows: busForm.rows,
      left_cols: busForm.left_cols,
      right_cols: busForm.right_cols,
      has_aisle: busForm.has_aisle,
      base_price_per_seat_cents: 0,
    };
    try {
      if (editingBusId) {
        await vendorFetch(`/api/listings/${listingId}/buses/${editingBusId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await vendorFetch(`/api/listings/${listingId}/buses`, { method: "POST", body: JSON.stringify(payload) });
      }
      const { buses: next } = await vendorFetch<{ buses: BusRow[] }>(`/api/listings/${listingId}/buses`);
      setBuses(next);
      setBusModalOpen(false);
      setEditingBusId(null);
      setBusForm({ name: "", bus_type: "seater", layout_type: "2+2", rows: 7, left_cols: 2, right_cols: 2, has_aisle: true, base_price_per_seat_cents: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save bus");
    }
  };

  const handleSaveRoute = async () => {
    if (!listingId) return;
    const busIdToAssign = addRouteForBusId;
    try {
      const created = await vendorFetch<{ id: string }>(`/api/listings/${listingId}/routes`, {
        method: "POST",
        body: JSON.stringify({
          from_place: routeForm.from_place,
          to_place: routeForm.to_place,
          distance_km: routeForm.distance_km ? Number(routeForm.distance_km) : null,
          duration_minutes: routeForm.duration_minutes ? Number(routeForm.duration_minutes) : null,
          price_per_seat_cents: routeForm.price_per_seat_rupees ? Math.round(Number(routeForm.price_per_seat_rupees) * 100) : null,
        }),
      });
      const { routes: next } = await vendorFetch<{ routes: RouteRow[] }>(`/api/listings/${listingId}/routes`);
      setRoutes(next);
      if (busIdToAssign && created?.id) {
        await vendorFetch(`/api/routes/${created.id}/schedules`, {
          method: "POST",
          body: JSON.stringify({
            bus_id: busIdToAssign,
            departure_time: "08:00",
            arrival_time: "12:00",
            operating_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
          }),
        });
        const schedRes = await vendorFetch<{ schedules: { id: string; bus_id: string; departure_time: string; arrival_time: string; operating_days: string[] }[] }>(`/api/routes/${created.id}/schedules`);
        setSchedulesByRoute((prev) => ({ ...prev, [created.id]: schedRes.schedules ?? [] }));
      }
      setRouteModalOpen(false);
      setAddRouteForBusId(null);
      setRouteForm({ from_place: "", to_place: "", distance_km: "", duration_minutes: "", price_per_seat_rupees: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save route");
    }
  };

  const openAddRoute = (busId?: string) => {
    setAddRouteForBusId(busId ?? null);
    setRouteModalOpen(true);
  };

  const routesForBus = (busId: string) =>
    routes.filter((r) => (schedulesByRoute[r.id] ?? []).some((s) => s.bus_id === busId));

  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  const openAddSchedule = (routeId: string) => {
    setScheduleRouteId(routeId);
    setScheduleForm({ bus_id: buses[0]?.id ?? "", departure_time: "22:00", arrival_time: "06:00", operating_days: [...DAYS] });
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleRouteId || !scheduleForm.bus_id) return;
    try {
      await vendorFetch(`/api/routes/${scheduleRouteId}/schedules`, {
        method: "POST",
        body: JSON.stringify({
          bus_id: scheduleForm.bus_id,
          departure_time: scheduleForm.departure_time,
          arrival_time: scheduleForm.arrival_time,
          operating_days: scheduleForm.operating_days,
        }),
      });
      const res = await vendorFetch<{ schedules: { id: string; bus_id: string; departure_time: string; arrival_time: string; operating_days: string[] }[] }>(`/api/routes/${scheduleRouteId}/schedules`);
      setSchedulesByRoute((prev) => ({ ...prev, [scheduleRouteId]: res.schedules ?? [] }));
      setScheduleModalOpen(false);
      setScheduleRouteId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save schedule");
    }
  };

  const handleSaveAvailability = async () => {
    if (!listingId || !availabilityForm.date) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/availability`, {
        method: "POST",
        body: JSON.stringify({ date: availabilityForm.date, status: availabilityForm.status }),
      });
      const res = await vendorFetch<{ availability: { id: string; date: string; status: string; note: string | null }[] }>(`/api/listings/${listingId}/availability`);
      setAvailability(res.availability ?? []);
      setAvailabilityModalOpen(false);
      setAvailabilityForm({ date: "", status: "available" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save availability");
    }
  };

  const handleSaveDriver = async () => {
    if (!listingId) return;
    setDriverSaving(true);
    setError("");
    try {
      await vendorFetch(`/api/listings/${listingId}/drivers`, {
        method: "POST",
        body: JSON.stringify({
          name: driverForm.name.trim() || null,
          phone: driverForm.phone.trim() || null,
          license_no: driverForm.license_no.trim() || null,
        }),
      });
      const { drivers: next } = await vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/drivers`);
      setDrivers(next);
      setDriverForm({ name: "", phone: "", license_no: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save driver");
    } finally {
      setDriverSaving(false);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!listingId || !window.confirm("Remove this driver?")) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/drivers/${driverId}`, { method: "DELETE" });
      const { drivers: next } = await vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/drivers`);
      setDrivers(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete driver");
    }
  };

  const handleDeleteBus = async (busId: string) => {
    if (!listingId || !window.confirm("Remove this bus from the fleet? This cannot be undone.")) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/buses/${busId}`, { method: "DELETE" });
      const { buses: next } = await vendorFetch<{ buses: BusRow[] }>(`/api/listings/${listingId}/buses`);
      setBuses(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete bus");
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error && !listing) return <div className="p-6 text-destructive">{error}</div>;
  if (!listing) return null;
  if (listing.type !== "transport") {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="icon" asChild><Link to="/listings"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <p className="text-muted-foreground">This listing is not a transport listing. Fleet management is only for transport type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/listings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{listing.name}</h1>
          <p className="text-sm text-muted-foreground">Transport · Manage fleet, routes & pricing</p>
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setError("")}>Dismiss</Button>
          {error.includes("not a transport listing") && (
            <Link to="/listings" className="text-xs font-medium underline">Go to My Listings</Link>
          )}
        </div>
      )}

      <Tabs defaultValue="fleet" className="w-full">
        <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="operator" className="rounded-lg data-[state=active]:bg-white">Driver Info</TabsTrigger>
          <TabsTrigger value="fleet" className="rounded-lg data-[state=active]:bg-white">Fleet</TabsTrigger>
          <TabsTrigger value="routes" className="rounded-lg data-[state=active]:bg-white">Routes</TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-white">Schedule</TabsTrigger>
          <TabsTrigger value="availability" className="rounded-lg data-[state=active]:bg-white">Availability</TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-lg data-[state=active]:bg-white">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="operator" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Driver Info</CardTitle>
              <p className="text-sm text-muted-foreground">Add drivers for this transport listing. Each driver is stored separately.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {drivers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Drivers</p>
                  <ul className="space-y-2">
                    {drivers.map((d) => (
                      <li key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 text-sm">
                        <div>
                          <span className="font-medium">{d.name || "—"}</span>
                          {d.phone && <span className="text-muted-foreground ml-2">{d.phone}</span>}
                          {d.license_no && <span className="text-muted-foreground ml-2">· {d.license_no}</span>}
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteDriver(d.id)}>Remove</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Add driver</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Name</Label>
                    <Input className="mt-1 rounded-xl" value={driverForm.name} onChange={(e) => setDriverForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramesh Kumar" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input className="mt-1 rounded-xl" value={driverForm.phone} onChange={(e) => setDriverForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 9876543210" />
                  </div>
                  <div>
                    <Label>License (optional)</Label>
                    <Input className="mt-1 rounded-xl" value={driverForm.license_no} onChange={(e) => setDriverForm((f) => ({ ...f, license_no: e.target.value }))} placeholder="e.g. DL 01 2020 1234567" />
                  </div>
                </div>
                <Button type="button" onClick={handleSaveDriver} disabled={driverSaving} className="mt-3 rounded-xl">Add driver</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display font-semibold text-lg">Buses</h2>
            <Button onClick={openAddBus} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Add New Bus
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {buses.map((bus) => {
              const busRoutes = routesForBus(bus.id);
              return (
                <Card key={bus.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{bus.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{bus.bus_type.replace("_", " ")} · {bus.layout_type}</p>
                        <p className="text-xs text-muted-foreground mt-1">{bus.total_seats} seats</p>
                      </div>
                      <span className={cn("text-xs font-medium px-2 py-1 rounded-full", bus.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                        {bus.status}
                      </span>
                    </div>
                    {busRoutes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Routes & price for this bus</p>
                        <ul className="space-y-1">
                          {busRoutes.map((r) => (
                            <li key={r.id} className="text-xs text-foreground">
                              {r.from_place} → {r.to_place}
                              {r.price_per_seat_cents != null && <span className="text-muted-foreground"> · ₹{r.price_per_seat_cents / 100}/seat</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => openEditBus(bus)}>Edit / Seat config</Button>
                      <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => openAddRoute(bus.id)}>Add route & price</Button>
                      <Button variant="ghost" size="sm" className="rounded-lg text-xs text-destructive hover:text-destructive" onClick={() => handleDeleteBus(bus.id)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {buses.length === 0 && (
            <p className="text-sm text-muted-foreground">No buses yet. Add one to get started.</p>
          )}

          {/* Seat configuration modal */}
          <Dialog open={busModalOpen} onOpenChange={(open) => { setBusModalOpen(open); if (!open) setEditingBusId(null); }}>
            <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBusId ? "Edit bus · Seat configuration" : "Add bus · Seat configuration"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label>Bus name</Label>
                    <Input className="mt-1 rounded-xl" value={busForm.name} onChange={(e) => setBusForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Volvo AC 1" />
                  </div>
                  <div>
                    <Label>Bus type</Label>
                    <Select value={busForm.bus_type} onValueChange={(v) => setBusForm((f) => ({ ...f, bus_type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BUS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Layout</Label>
                    <Select value={busForm.layout_type} onValueChange={(v) => {
                      setBusForm((f) => ({ ...f, layout_type: v }));
                      if (v === "2+2") setSeatPreview((s) => ({ ...s, left: 2, right: 2 }));
                      if (v === "2+1") setSeatPreview((s) => ({ ...s, left: 2, right: 1 }));
                    }}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LAYOUT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Rows</Label>
                      <Input type="number" min={1} max={50} value={busForm.rows} onChange={(e) => {
                        const v = Number(e.target.value) || 1;
                        setBusForm((f) => ({ ...f, rows: v }));
                        setSeatPreview((s) => ({ ...s, rows: v }));
                      }} className="rounded-xl" />
                    </div>
                    <div>
                      <Label>Left cols</Label>
                      <Input type="number" min={0} max={5} value={busForm.left_cols} onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        setBusForm((f) => ({ ...f, left_cols: v }));
                        setSeatPreview((s) => ({ ...s, left: v }));
                      }} className="rounded-xl" />
                    </div>
                    <div>
                      <Label>Right cols</Label>
                      <Input type="number" min={0} max={5} value={busForm.right_cols} onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        setBusForm((f) => ({ ...f, right_cols: v }));
                        setSeatPreview((s) => ({ ...s, right: v }));
                      }} className="rounded-xl" />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="block mb-2">Layout preview · {totalSeatsPreview} seats</Label>
                  <div className="bg-slate-100 rounded-xl p-3 border border-slate-200">
                    <div className="bg-slate-700 text-slate-200 rounded-t-lg py-2 text-center text-xs font-medium mb-2">Driver · Front</div>
                    {Array.from({ length: seatPreview.rows }, (_, rowIndex) => (
                      <div key={rowIndex} className="flex items-stretch gap-1 mb-1">
                        <div className="flex gap-0.5 flex-1">
                          {Array.from({ length: seatPreview.left }, (_, col) => (
                            <div key={col} className="flex-1 min-w-[1.25rem] py-1.5 rounded bg-emerald-500 text-[10px] font-bold text-white text-center" />
                          ))}
                        </div>
                        {seatPreview.aisle && <div className="w-1.5 bg-slate-300 rounded flex-shrink-0" />}
                        <div className="flex gap-0.5 flex-1">
                          {Array.from({ length: seatPreview.right }, (_, col) => (
                            <div key={col} className="flex-1 min-w-[1.25rem] py-1.5 rounded bg-emerald-500 text-[10px] font-bold text-white text-center" />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBusModalOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="button" onClick={handleSaveBus} className="rounded-xl">Save bus</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="routes" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display font-semibold text-lg">Routes</h2>
            <Button onClick={() => openAddRoute()} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Add Route
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Routes and prices are tied to each bus. Add routes from the Fleet tab per bus, or add a route here and assign a bus in Schedule.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {routes.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <p className="font-semibold text-foreground">{r.from_place} → {r.to_place}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.distance_km != null && `${r.distance_km} km`}
                    {r.duration_minutes != null && ` · ${r.duration_minutes} min`}
                    {r.price_per_seat_cents != null && ` · ₹${r.price_per_seat_cents / 100}/seat`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {routes.length === 0 && <p className="text-sm text-muted-foreground">No routes yet.</p>}

          <Dialog open={routeModalOpen} onOpenChange={(open) => { setRouteModalOpen(open); if (!open) setAddRouteForBusId(null); }}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {addRouteForBusId ? `Add route & price for ${buses.find((b) => b.id === addRouteForBusId)?.name ?? "this bus"}` : "Add route"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>From</Label>
                  <Input className="mt-1 rounded-xl" value={routeForm.from_place} onChange={(e) => setRouteForm((f) => ({ ...f, from_place: e.target.value }))} placeholder="City or station" />
                </div>
                <div>
                  <Label>To</Label>
                  <Input className="mt-1 rounded-xl" value={routeForm.to_place} onChange={(e) => setRouteForm((f) => ({ ...f, to_place: e.target.value }))} placeholder="City or station" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Distance (km)</Label>
                    <Input type="number" min={0} className="mt-1 rounded-xl" value={routeForm.distance_km} onChange={(e) => setRouteForm((f) => ({ ...f, distance_km: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Duration (min)</Label>
                    <Input type="number" min={0} className="mt-1 rounded-xl" value={routeForm.duration_minutes} onChange={(e) => setRouteForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Price per seat (₹)</Label>
                  <Input type="number" min={0} className="mt-1 rounded-xl" value={routeForm.price_per_seat_rupees} onChange={(e) => setRouteForm((f) => ({ ...f, price_per_seat_rupees: e.target.value }))} placeholder="Price for this route" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRouteModalOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSaveRoute} className="rounded-xl">Save route</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Assign buses to routes and set departure/arrival times. Add schedules per route below.</p>
            {routes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add routes in the Routes tab first.</p>
            ) : (
              routes.map((route) => (
                <Card key={route.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">{route.from_place} → {route.to_place}</CardTitle>
                      <Button size="sm" className="rounded-lg gap-1" onClick={() => openAddSchedule(route.id)} disabled={buses.length === 0}>
                        <Plus className="h-3 w-3" /> Add schedule
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(schedulesByRoute[route.id] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No schedules. Add one to set departure/arrival and operating days.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(schedulesByRoute[route.id] ?? []).map((s) => (
                          <li key={s.id} className="flex items-center gap-3 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{s.departure_time} → {s.arrival_time}</span>
                            <span className="text-muted-foreground">· {buses.find((b) => b.id === s.bus_id)?.name ?? s.bus_id}</span>
                            <span className="text-xs text-muted-foreground">({(s.operating_days ?? []).join(", ")})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Add schedule</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Bus</Label>
                  <Select value={scheduleForm.bus_id} onValueChange={(v) => setScheduleForm((f) => ({ ...f, bus_id: v }))}>
                    <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select bus" /></SelectTrigger>
                    <SelectContent>
                      {buses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Departure time</Label>
                    <Input type="time" className="rounded-xl mt-1" value={scheduleForm.departure_time} onChange={(e) => setScheduleForm((f) => ({ ...f, departure_time: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Arrival time</Label>
                    <Input type="time" className="rounded-xl mt-1" value={scheduleForm.arrival_time} onChange={(e) => setScheduleForm((f) => ({ ...f, arrival_time: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Operating days</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS.map((d) => (
                      <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="checkbox" checked={scheduleForm.operating_days.includes(d)} onChange={(e) => setScheduleForm((f) => ({ ...f, operating_days: e.target.checked ? [...f.operating_days, d] : f.operating_days.filter((x) => x !== d) }))} className="rounded" />
                        <span className="capitalize">{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleModalOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSaveSchedule} className="rounded-xl" disabled={!scheduleForm.bus_id}>Save schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display font-semibold text-lg">Availability</h2>
            <Button onClick={() => { setAvailabilityForm({ date: "", status: "available" }); setAvailabilityModalOpen(true); }} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Mark dates as available, cancelled, or holiday.</p>
          {availability.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dates set. Add a date to control availability.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {availability.map((a) => (
                <Card key={a.id}>
                  <CardContent className="pt-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-foreground">{a.date}</p>
                      <p className="text-xs text-muted-foreground capitalize">{a.status}{a.note ? ` · ${a.note}` : ""}</p>
                    </div>
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full", a.status === "available" ? "bg-success/10 text-success" : a.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                      {a.status}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Dialog open={availabilityModalOpen} onOpenChange={setAvailabilityModalOpen}>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Add availability</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" className="rounded-xl mt-1" value={availabilityForm.date} onChange={(e) => setAvailabilityForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={availabilityForm.status} onValueChange={(v: "available" | "cancelled" | "holiday") => setAvailabilityForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAvailabilityModalOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSaveAvailability} className="rounded-xl" disabled={!availabilityForm.date}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Pricing</CardTitle>
              <p className="text-sm text-muted-foreground">Prices and routes are per bus. Set price per seat when you add a route for a bus (Fleet → Add route & price). When a customer selects a bus and route, that price is shown and the booking continues through to payment.</p>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

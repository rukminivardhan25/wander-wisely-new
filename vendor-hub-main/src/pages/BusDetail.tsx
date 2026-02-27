import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Bus,
  MapPin,
  User,
  Trash2,
  Plus,
  Calendar,
  Clock,
  Pencil,
  Wifi,
  Zap,
  Tv,
  Bath,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BusDetailRow {
  id: string;
  name: string;
  bus_number: string | null;
  bus_type: string;
  ac_type: string | null;
  registration_number: string | null;
  manufacturer: string | null;
  model: string | null;
  has_wifi: boolean;
  has_charging: boolean;
  has_entertainment: boolean;
  has_toilet: boolean;
  photo_url: string | null;
  layout_type: string;
  rows: number;
  left_cols: number;
  right_cols: number;
  has_aisle: boolean;
  total_seats: number;
  base_price_per_seat_cents: number;
  status: string;
  verification_status?: string;
}

interface DriverRow {
  id: string;
  bus_id: string | null;
  name: string | null;
  phone: string | null;
  license_no: string | null;
}

interface RouteRow {
  id: string;
  from_place: string;
  to_place: string;
  distance_km: number | null;
  duration_minutes: number | null;
  price_per_seat_cents: number | null;
  bus_id: string | null;
}

interface ScheduleRow {
  id: string;
  route_id: string | null;
  route_from_place: string | null;
  route_to_place: string | null;
  start_date: string | null;
  end_date: string | null;
  departure_time: string;
  arrival_time: string;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
  price_override_cents: number | null;
  seat_availability: number | null;
  status: string;
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export default function BusDetail() {
  const { listingId, busId } = useParams<{ listingId: string; busId: string }>();
  const navigate = useNavigate();
  const [bus, setBus] = useState<BusDetailRow | null>(null);
  const [listingName, setListingName] = useState("");
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    route_id: "" as string,
    start_date: "",
    end_date: "",
    departure_time: "",
    arrival_time: "",
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
    sun: false,
    price_override_rupees: "" as string | number,
    seat_availability: "" as string | number,
    status: "active",
  });
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [assigningRoute, setAssigningRoute] = useState<string | null>(null);
  const [editingBusInfo, setEditingBusInfo] = useState(false);
  const [busEditForm, setBusEditForm] = useState<Partial<BusDetailRow>>({});
  const [savingBusInfo, setSavingBusInfo] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverEditForm, setDriverEditForm] = useState({ name: "", phone: "", license_no: "" });
  const [savingDriverEdit, setSavingDriverEdit] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeEditForm, setRouteEditForm] = useState({ from_place: "", to_place: "", distance_km: "", duration_minutes: "", price_per_seat_cents: "" });
  const [savingRouteEdit, setSavingRouteEdit] = useState(false);
  const [newRouteForm, setNewRouteForm] = useState({ from_place: "", to_place: "", distance_km: "", duration_minutes: "", price_per_seat_rupees: "" });
  const [addingRoute, setAddingRoute] = useState(false);
  const [editingAmenities, setEditingAmenities] = useState(false);
  const [amenitiesForm, setAmenitiesForm] = useState({ has_wifi: false, has_charging: false, has_entertainment: false, has_toilet: false });
  const [savingAmenities, setSavingAmenities] = useState(false);

  const isVerified = bus?.verification_status === "approved";
  const busDrivers = drivers;
  const busRoutes = routes;
  const busRoutesDeduped = useMemo(() => {
    const seen = new Set<string>();
    return busRoutes.filter((r) => {
      const key = `${r.from_place}|${r.to_place}|${r.distance_km ?? ""}|${r.price_per_seat_cents ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [busRoutes]);

  const refreshBus = async () => {
    if (!listingId || !busId) return;
    try {
      const next = await vendorFetch<BusDetailRow>(`/api/listings/${listingId}/buses/${busId}`);
      setBus(next);
    } catch (_) {}
  };
  const refreshDrivers = async () => {
    if (!listingId || !busId) return;
    try {
      const { drivers: next } = await vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/buses/${busId}/drivers`);
      setDrivers(next);
    } catch (_) {}
  };
  const refreshRoutes = async () => {
    if (!listingId || !busId) return;
    try {
      const { routes: next } = await vendorFetch<{ routes: RouteRow[] }>(`/api/listings/${listingId}/buses/${busId}/routes`);
      setRoutes(next);
    } catch (_) {}
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!listingId || !driverId) return;
    setAssigningDriver(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/drivers/${driverId}`, {
        method: "PATCH",
        body: JSON.stringify({ bus_id: busId }),
      });
      await refreshDrivers();
      await refreshBus();
    } catch (_) {}
    setAssigningDriver(false);
  };
  const handleUnassignDriver = async (driverId: string) => {
    if (!listingId) return;
    setAssigningDriver(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/drivers/${driverId}`, {
        method: "PATCH",
        body: JSON.stringify({ bus_id: null }),
      });
      await refreshDrivers();
      await refreshBus();
    } catch (_) {}
    setAssigningDriver(false);
  };
  const handleAssignRoute = async (routeId: string) => {
    if (!listingId) return;
    setAssigningRoute(routeId);
    try {
      await vendorFetch(`/api/listings/${listingId}/routes/${routeId}`, {
        method: "PATCH",
        body: JSON.stringify({ bus_id: busId }),
      });
      await refreshRoutes();
      await refreshBus();
    } catch (_) {}
    setAssigningRoute(null);
  };
  const handleUnassignRoute = async (routeId: string) => {
    if (!listingId) return;
    setAssigningRoute(routeId);
    try {
      await vendorFetch(`/api/listings/${listingId}/routes/${routeId}`, {
        method: "PATCH",
        body: JSON.stringify({ bus_id: null }),
      });
      await refreshRoutes();
      await refreshBus();
    } catch (_) {}
    setAssigningRoute(null);
  };

  const startEditBusInfo = () => {
    if (bus) {
      setBusEditForm({
        name: bus.name,
        bus_number: bus.bus_number ?? "",
        registration_number: bus.registration_number ?? "",
        bus_type: bus.bus_type,
        ac_type: bus.ac_type ?? "non_ac",
        manufacturer: bus.manufacturer ?? "",
        model: bus.model ?? "",
        layout_type: bus.layout_type,
        rows: bus.rows,
        left_cols: bus.left_cols,
        right_cols: bus.right_cols,
        has_aisle: bus.has_aisle,
        base_price_per_seat_cents: bus.base_price_per_seat_cents,
        has_wifi: bus.has_wifi,
        has_charging: bus.has_charging,
        has_entertainment: bus.has_entertainment,
        has_toilet: bus.has_toilet,
      });
      setEditingBusInfo(true);
    }
  };

  const handleSaveBusInfo = async () => {
    if (!listingId || !busId || !bus) return;
    setSavingBusInfo(true);
    try {
      const payload = {
        name: (busEditForm.name ?? bus.name).trim() || bus.name,
        bus_number: (busEditForm.bus_number as string)?.trim() || null,
        registration_number: (busEditForm.registration_number as string)?.trim() || null,
        bus_type: busEditForm.bus_type ?? bus.bus_type,
        ac_type: (busEditForm.ac_type as string) ?? bus.ac_type,
        manufacturer: (busEditForm.manufacturer as string)?.trim() || null,
        model: (busEditForm.model as string)?.trim() || null,
        layout_type: busEditForm.layout_type ?? bus.layout_type,
        rows: Number(busEditForm.rows) || bus.rows,
        left_cols: Number(busEditForm.left_cols) ?? bus.left_cols,
        right_cols: Number(busEditForm.right_cols) ?? bus.right_cols,
        has_aisle: busEditForm.has_aisle ?? bus.has_aisle,
        base_price_per_seat_cents: Number(busEditForm.base_price_per_seat_cents) ?? bus.base_price_per_seat_cents,
        has_wifi: busEditForm.has_wifi ?? bus.has_wifi,
        has_charging: busEditForm.has_charging ?? bus.has_charging,
        has_entertainment: busEditForm.has_entertainment ?? bus.has_entertainment,
        has_toilet: busEditForm.has_toilet ?? bus.has_toilet,
      };
      await vendorFetch(`/api/listings/${listingId}/buses/${busId}`, { method: "PATCH", body: JSON.stringify(payload) });
      await refreshBus();
      setEditingBusInfo(false);
    } catch (_) {}
    setSavingBusInfo(false);
  };

  const startEditDriver = (d: DriverRow) => {
    setEditingDriverId(d.id);
    setDriverEditForm({ name: d.name ?? "", phone: d.phone ?? "", license_no: d.license_no ?? "" });
  };
  const handleSaveDriverEdit = async () => {
    if (!listingId || !editingDriverId) return;
    setSavingDriverEdit(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/drivers/${editingDriverId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: driverEditForm.name.trim() || null, phone: driverEditForm.phone.trim() || null, license_no: driverEditForm.license_no.trim() || null }),
      });
      await refreshDrivers();
      await refreshBus();
      setEditingDriverId(null);
    } catch (_) {}
    setSavingDriverEdit(false);
  };

  const startEditRoute = (r: RouteRow) => {
    setEditingRouteId(r.id);
    setRouteEditForm({
      from_place: r.from_place ?? "",
      to_place: r.to_place ?? "",
      distance_km: r.distance_km != null ? String(r.distance_km) : "",
      duration_minutes: r.duration_minutes != null ? String(r.duration_minutes) : "",
      price_per_seat_cents: r.price_per_seat_cents != null ? String(r.price_per_seat_cents / 100) : "",
    });
  };
  const handleSaveRouteEdit = async () => {
    if (!listingId || !editingRouteId) return;
    setSavingRouteEdit(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/routes/${editingRouteId}`, {
        method: "PATCH",
        body: JSON.stringify({
          from_place: routeEditForm.from_place.trim() || undefined,
          to_place: routeEditForm.to_place.trim() || undefined,
          distance_km: routeEditForm.distance_km === "" ? null : Number(routeEditForm.distance_km),
          duration_minutes: routeEditForm.duration_minutes === "" ? null : Number(routeEditForm.duration_minutes),
          price_per_seat_cents: routeEditForm.price_per_seat_cents === "" ? null : Math.round(Number(routeEditForm.price_per_seat_cents) * 100),
        }),
      });
      await refreshRoutes();
      await refreshBus();
      setEditingRouteId(null);
    } catch (_) {}
    setSavingRouteEdit(false);
  };

  const handleAddRoute = async () => {
    if (!listingId || !busId) return;
    setAddingRoute(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/routes`, {
        method: "POST",
        body: JSON.stringify({
          from_place: newRouteForm.from_place.trim() || null,
          to_place: newRouteForm.to_place.trim() || null,
          distance_km: newRouteForm.distance_km === "" ? null : Number(newRouteForm.distance_km),
          duration_minutes: newRouteForm.duration_minutes === "" ? null : Number(newRouteForm.duration_minutes),
          price_per_seat_cents: newRouteForm.price_per_seat_rupees === "" ? null : Math.round(Number(newRouteForm.price_per_seat_rupees) * 100),
          bus_id: busId,
        }),
      });
      await refreshRoutes();
      await refreshBus();
      setNewRouteForm({ from_place: "", to_place: "", distance_km: "", duration_minutes: "", price_per_seat_rupees: "" });
    } catch (_) {}
    setAddingRoute(false);
  };

  const startEditAmenities = () => {
    if (bus) setAmenitiesForm({ has_wifi: bus.has_wifi ?? false, has_charging: bus.has_charging ?? false, has_entertainment: bus.has_entertainment ?? false, has_toilet: bus.has_toilet ?? false });
    setEditingAmenities(true);
  };
  const handleSaveAmenities = async () => {
    if (!listingId || !busId || !bus) return;
    setSavingAmenities(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/buses/${busId}`, {
        method: "PATCH",
        body: JSON.stringify({
          has_wifi: amenitiesForm.has_wifi,
          has_charging: amenitiesForm.has_charging,
          has_entertainment: amenitiesForm.has_entertainment,
          has_toilet: amenitiesForm.has_toilet,
        }),
      });
      await refreshBus();
      setEditingAmenities(false);
    } catch (_) {}
    setSavingAmenities(false);
  };

  useEffect(() => {
    if (!listingId || !busId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [busRes, listingRes, driversRes, routesRes, schedulesRes] = await Promise.allSettled([
          vendorFetch<BusDetailRow>(`/api/listings/${listingId}/buses/${busId}`),
          vendorFetch<{ name?: string }>(`/api/listings/${listingId}`).catch(() => ({ name: "" })),
          vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/buses/${busId}/drivers`),
          vendorFetch<{ routes: RouteRow[] }>(`/api/listings/${listingId}/buses/${busId}/routes`),
          vendorFetch<{ schedules: ScheduleRow[] }>(`/api/listings/${listingId}/buses/${busId}/schedules`),
        ]);
        if (busRes.status === "fulfilled") setBus(busRes.value);
        else setError("Bus not found");
        if (listingRes.status === "fulfilled" && listingRes.value?.name) setListingName(listingRes.value.name);
        if (driversRes.status === "fulfilled") setDrivers(driversRes.value.drivers ?? []);
        if (routesRes.status === "fulfilled") setRoutes(routesRes.value.routes ?? []);
        if (schedulesRes.status === "fulfilled") setSchedules(schedulesRes.value.schedules ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load bus");
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId, busId]);

  const refreshSchedules = async () => {
    if (!listingId || !busId) return;
    try {
      const { schedules: next } = await vendorFetch<{ schedules: ScheduleRow[] }>(`/api/listings/${listingId}/buses/${busId}/schedules`);
      setSchedules(next);
    } catch (_) {}
  };

  const handleSaveSchedule = async () => {
    if (!listingId || !busId) return;
    if (!scheduleForm.route_id) return;
    setScheduleSaving(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/buses/${busId}/schedules`, {
        method: "POST",
        body: JSON.stringify({
          route_id: scheduleForm.route_id,
          start_date: scheduleForm.start_date || null,
          end_date: scheduleForm.end_date || null,
          departure_time: scheduleForm.departure_time,
          arrival_time: scheduleForm.arrival_time,
          mon: scheduleForm.mon,
          tue: scheduleForm.tue,
          wed: scheduleForm.wed,
          thu: scheduleForm.thu,
          fri: scheduleForm.fri,
          sat: scheduleForm.sat,
          sun: scheduleForm.sun,
          price_override_cents: scheduleForm.price_override_rupees === "" ? null : Math.round(Number(scheduleForm.price_override_rupees) * 100),
          seat_availability: scheduleForm.seat_availability === "" ? null : Number(scheduleForm.seat_availability),
          status: scheduleForm.status,
        }),
      });
      setScheduleForm({
        route_id: "",
        start_date: "",
        end_date: "",
        departure_time: "",
        arrival_time: "",
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
        sun: false,
        price_override_rupees: "",
        seat_availability: "",
        status: "active",
      });
      await refreshSchedules();
      setScheduleDrawerOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!listingId || !busId || !bus) return;
    setToggling(true);
    setError("");
    try {
      const next = bus.status === "active" ? "inactive" : "active";
      await vendorFetch(`/api/listings/${listingId}/buses/${busId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await refreshBus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteBus = async () => {
    if (!listingId || !busId || !window.confirm("Remove this bus from the fleet? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/buses/${busId}`, { method: "DELETE" });
      navigate(`/listings/${listingId}/transport?view=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete bus");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!listingId || !busId || !window.confirm("Delete this schedule?")) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/buses/${busId}/schedules/${scheduleId}`, { method: "DELETE" });
      await refreshSchedules();
    } catch (_) {}
  };

  const formatTime = (t: string) => (t ? t.slice(0, 5) : "");
  const daysStr = (s: ScheduleRow) =>
    DAYS.filter((d) => s[d]).map((d) => DAY_LABELS[d]).join(", ") || "—";

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (error && !bus) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to={listingId ? `/listings/${listingId}/transport` : "/listings"}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }
  if (!bus) return null;

  const statusClass =
    bus.status === "active"
      ? "bg-[#22C55E]/10 text-[#22C55E]"
      : bus.status === "inactive"
        ? "bg-[#EF4444]/10 text-[#EF4444]"
        : "bg-[#F59E0B]/10 text-[#F59E0B]";

  return (
    <div className="space-y-6 p-6" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={listingId ? `/listings/${listingId}/transport` : "/listings"}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{bus.name}</h1>
            <p className="text-sm text-muted-foreground">
              {listingName && `${listingName} · `}Transport · Bus detail
            </p>
          </div>
          {bus.registration_number && (
            <span className="text-sm text-muted-foreground border border-[#E5E7EB] rounded-lg px-3 py-1">
              Reg: {bus.registration_number}
            </span>
          )}
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-lg capitalize", statusClass)}>
            {bus.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: 70% - Cards */}
        <div className="space-y-6">
          <Card className="rounded-xl border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><Bus className="h-4 w-4" /> Bus information</span>
                {!editingBusInfo ? (
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={startEditBusInfo}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditingBusInfo(false)}>Cancel</Button>
                    <Button size="sm" className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={savingBusInfo} onClick={handleSaveBusInfo}>{savingBusInfo ? "Saving…" : "Save"}</Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!editingBusInfo ? (
                <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                  <div className="shrink-0">
                    <p className="text-muted-foreground text-xs font-medium mb-2">Bus structure · {bus.total_seats} seats</p>
                    <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 w-[200px]">
                      <div className="bg-slate-700 text-slate-200 rounded-t-lg py-2 text-center text-xs font-medium mb-2">Driver · Front</div>
                      {Array.from({ length: bus.rows }, (_, rowIndex) => (
                        <div key={rowIndex} className="flex items-stretch gap-1 mb-1">
                          <div className="flex gap-0.5 flex-1">
                            {Array.from({ length: bus.left_cols }, (_, col) => (
                              <div key={col} className="flex-1 min-w-[1.25rem] py-1.5 rounded bg-emerald-500 text-[10px] font-bold text-white text-center" />
                            ))}
                          </div>
                          {bus.has_aisle && <div className="w-1.5 bg-slate-300 rounded flex-shrink-0" />}
                          <div className="flex gap-0.5 flex-1">
                            {Array.from({ length: bus.right_cols }, (_, col) => (
                              <div key={col} className="flex-1 min-w-[1.25rem] py-1.5 rounded bg-emerald-500 text-[10px] font-bold text-white text-center" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    {bus.photo_url && (
                      <img src={bus.photo_url} alt={bus.name} className="rounded-lg object-cover h-32 w-full max-w-xs mb-2" />
                    )}
                    {bus.bus_number && <p><span className="text-muted-foreground">Bus number:</span> {bus.bus_number}</p>}
                    <p><span className="text-muted-foreground">Type:</span> {bus.bus_type.replace("_", " ")} · {bus.ac_type === "ac" ? "AC" : "Non-AC"}</p>
                    {(bus.manufacturer || bus.model) && (
                      <p><span className="text-muted-foreground">Manufacturer / Model:</span> {[bus.manufacturer, bus.model].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Bus name</Label><Input className="mt-1 rounded-lg" value={String(busEditForm.name ?? "")} onChange={(e) => setBusEditForm((f) => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label className="text-xs">Bus number</Label><Input className="mt-1 rounded-lg" value={String(busEditForm.bus_number ?? "")} onChange={(e) => setBusEditForm((f) => ({ ...f, bus_number: e.target.value }))} /></div>
                  <div><Label className="text-xs">Registration</Label><Input className="mt-1 rounded-lg" value={String(busEditForm.registration_number ?? "")} onChange={(e) => setBusEditForm((f) => ({ ...f, registration_number: e.target.value }))} /></div>
                  <div><Label className="text-xs">Manufacturer</Label><Input className="mt-1 rounded-lg" value={String(busEditForm.manufacturer ?? "")} onChange={(e) => setBusEditForm((f) => ({ ...f, manufacturer: e.target.value }))} /></div>
                  <div><Label className="text-xs">Model</Label><Input className="mt-1 rounded-lg" value={String(busEditForm.model ?? "")} onChange={(e) => setBusEditForm((f) => ({ ...f, model: e.target.value }))} /></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Drivers</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Loaded from the database for this bus (from Driver Info on the fleet page). Edit or remove below; add drivers on the fleet page.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {busDrivers.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {busDrivers.map((d) => (
                    <li key={d.id} className="flex flex-col gap-2">
                      {editingDriverId === d.id ? (
                        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#E5E7EB] p-2">
                          <Input className="rounded-lg max-w-[120px] h-8" placeholder="Name" value={driverEditForm.name} onChange={(e) => setDriverEditForm((f) => ({ ...f, name: e.target.value }))} />
                          <Input className="rounded-lg max-w-[100px] h-8" placeholder="Phone" value={driverEditForm.phone} onChange={(e) => setDriverEditForm((f) => ({ ...f, phone: e.target.value }))} />
                          <Input className="rounded-lg max-w-[100px] h-8" placeholder="License" value={driverEditForm.license_no} onChange={(e) => setDriverEditForm((f) => ({ ...f, license_no: e.target.value }))} />
                          <Button size="sm" className="rounded-lg h-8 bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={savingDriverEdit} onClick={handleSaveDriverEdit}>Save</Button>
                          <Button size="sm" variant="ghost" className="rounded-lg h-8" disabled={savingDriverEdit} onClick={() => setEditingDriverId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span>{d.name ?? "—"} {d.phone && `· ${d.phone}`} {d.license_no && `· ${d.license_no}`}</span>
                          <span className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => startEditDriver(d)}>Edit</Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={assigningDriver} onClick={() => handleUnassignDriver(d.id)}>Remove</Button>
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No drivers for this bus yet. Add and assign drivers on the fleet page (Driver Info tab).</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Routes (this bus)</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Routes for this bus. Edit or remove below, or add more routes for this bus.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {busRoutesDeduped.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {busRoutesDeduped.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2">
                      {editingRouteId === r.id ? (
                        <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-2">
                          <div className="flex flex-wrap gap-2">
                            <Input className="rounded-lg max-w-[120px] h-8" placeholder="From" value={routeEditForm.from_place} onChange={(e) => setRouteEditForm((f) => ({ ...f, from_place: e.target.value }))} />
                            <Input className="rounded-lg max-w-[120px] h-8" placeholder="To" value={routeEditForm.to_place} onChange={(e) => setRouteEditForm((f) => ({ ...f, to_place: e.target.value }))} />
                            <Input type="number" min={0} className="rounded-lg w-20 h-8" placeholder="km" value={routeEditForm.distance_km} onChange={(e) => setRouteEditForm((f) => ({ ...f, distance_km: e.target.value }))} />
                            <Input type="number" min={0} className="rounded-lg w-20 h-8" placeholder="min" value={routeEditForm.duration_minutes} onChange={(e) => setRouteEditForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
                            <Input type="number" min={0} step={0.01} className="rounded-lg w-20 h-8" placeholder="₹/seat" value={routeEditForm.price_per_seat_cents} onChange={(e) => setRouteEditForm((f) => ({ ...f, price_per_seat_cents: e.target.value }))} />
                          </div>
                          <span className="flex gap-2">
                            <Button size="sm" className="rounded-lg h-8 bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={savingRouteEdit} onClick={handleSaveRouteEdit}>Save</Button>
                            <Button size="sm" variant="ghost" className="rounded-lg h-8" disabled={savingRouteEdit} onClick={() => setEditingRouteId(null)}>Cancel</Button>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span>{r.from_place} → {r.to_place} {r.distance_km != null && `· ${r.distance_km} km`} {r.price_per_seat_cents != null && `· ₹${r.price_per_seat_cents / 100}/seat`}</span>
                          <span className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => startEditRoute(r)}>Edit</Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={assigningRoute === r.id} onClick={() => handleUnassignRoute(r.id)}>Remove</Button>
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No routes for this bus yet. Add one below.</p>
              )}
              <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Add route for this bus</Label>
                <div className="flex flex-wrap items-end gap-2">
                  <Input className="rounded-lg max-w-[100px] h-8" placeholder="From" value={newRouteForm.from_place} onChange={(e) => setNewRouteForm((f) => ({ ...f, from_place: e.target.value }))} />
                  <Input className="rounded-lg max-w-[100px] h-8" placeholder="To" value={newRouteForm.to_place} onChange={(e) => setNewRouteForm((f) => ({ ...f, to_place: e.target.value }))} />
                  <Input type="number" min={0} className="rounded-lg w-16 h-8" placeholder="km" value={newRouteForm.distance_km} onChange={(e) => setNewRouteForm((f) => ({ ...f, distance_km: e.target.value }))} />
                  <Input type="number" min={0} className="rounded-lg w-16 h-8" placeholder="min" value={newRouteForm.duration_minutes} onChange={(e) => setNewRouteForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
                  <Input type="number" min={0} step={0.01} className="rounded-lg w-20 h-8" placeholder="₹/seat" value={newRouteForm.price_per_seat_rupees} onChange={(e) => setNewRouteForm((f) => ({ ...f, price_per_seat_rupees: e.target.value }))} />
                  <Button size="sm" className="rounded-lg h-8 bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={addingRoute} onClick={handleAddRoute}>Add route</Button>
                </div>
                <p className="text-xs text-muted-foreground">You can add multiple routes for this bus; each will appear in the list above.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick actions (panel style) */}
        <div className="space-y-4">
          <Card className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isVerified && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Verify this bus to use quick actions (Verification → Vehicles → Buses).
                </p>
              )}
              <Button
                className="w-full rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-10"
                disabled={!isVerified}
                onClick={() => setScheduleDrawerOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Schedule
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full border-[#E5E7EB] h-10"
                disabled={!isVerified || toggling}
                onClick={handleToggleStatus}
              >
                {toggling ? "Updating…" : bus.status === "active" ? "Set Inactive" : "Set Active"}
              </Button>
              <Button
                className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white h-10"
                disabled={!isVerified || deleting}
                onClick={handleDeleteBus}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete bus
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
                Amenities
                {!editingAmenities ? (
                  <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={startEditAmenities}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={() => setEditingAmenities(false)}>Cancel</Button>
                    <Button size="sm" className="rounded-lg h-8 bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={savingAmenities} onClick={handleSaveAmenities}>{savingAmenities ? "Saving…" : "Save"}</Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingAmenities ? (
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_wifi} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_wifi: e.target.checked }))} className="rounded" /><Wifi className="h-4 w-4 text-muted-foreground" /> WiFi</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_charging} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_charging: e.target.checked }))} className="rounded" /><Zap className="h-4 w-4 text-muted-foreground" /> Charging</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_entertainment} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_entertainment: e.target.checked }))} className="rounded" /><Tv className="h-4 w-4 text-muted-foreground" /> Entertainment</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_toilet} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_toilet: e.target.checked }))} className="rounded" /><Bath className="h-4 w-4 text-muted-foreground" /> Toilet</label>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 text-sm">
                  {bus.has_wifi && <span className="flex items-center gap-1.5"><Wifi className="h-4 w-4 text-muted-foreground" /> WiFi</span>}
                  {bus.has_charging && <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-muted-foreground" /> Charging</span>}
                  {bus.has_entertainment && <span className="flex items-center gap-1.5"><Tv className="h-4 w-4 text-muted-foreground" /> Entertainment</span>}
                  {bus.has_toilet && <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-muted-foreground" /> Toilet</span>}
                  {!bus.has_wifi && !bus.has_charging && !bus.has_entertainment && !bus.has_toilet && (
                    <span className="text-muted-foreground">None listed</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule drawer */}
      <Sheet open={scheduleDrawerOpen} onOpenChange={setScheduleDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Add Schedule
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-6">
            {busRoutes.length > 0 && (
              <div>
                <Label>Route</Label>
                <Select
                  value={scheduleForm.route_id}
                  onValueChange={(v) => {
                    const route = busRoutes.find((r) => r.id === v);
                    const priceRupees = route?.price_per_seat_cents != null ? String(route.price_per_seat_cents / 100) : "";
                    setScheduleForm((f) => ({ ...f, route_id: v, price_override_rupees: priceRupees }));
                  }}
                >
                  <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Select route" /></SelectTrigger>
                  <SelectContent>
                    {busRoutes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.from_place} → {r.to_place}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start date (optional)</Label>
                <Input type="date" className="mt-1 rounded-lg" value={scheduleForm.start_date} onChange={(e) => setScheduleForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>End date (optional)</Label>
                <Input type="date" className="mt-1 rounded-lg" value={scheduleForm.end_date} onChange={(e) => setScheduleForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price override (₹, optional)</Label>
                <Input type="number" min={0} step={0.01} className="mt-1 rounded-lg" value={scheduleForm.price_override_rupees} onChange={(e) => setScheduleForm((f) => ({ ...f, price_override_rupees: e.target.value === "" ? "" : e.target.value }))} placeholder="Leave empty for default" />
              </div>
              <div>
                <Label>Seat availability (optional)</Label>
                <Input type="number" min={0} className="mt-1 rounded-lg" value={scheduleForm.seat_availability} onChange={(e) => setScheduleForm((f) => ({ ...f, seat_availability: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder={String(bus.total_seats)} />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setScheduleDrawerOpen(false)} className="rounded-xl">Cancel</Button>
            <Button className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={scheduleSaving} onClick={handleSaveSchedule}>
              {scheduleSaving ? "Saving…" : "Save schedule"}
            </Button>
          </SheetFooter>

          {/* Existing schedules table */}
          <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
            <Label className="text-sm font-medium text-muted-foreground">Existing schedules</Label>
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No schedules yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-[#E5E7EB]">
                <table className="w-full min-w-[520px] text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-muted/40">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Route</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Start date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">End date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Departure</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Arrival</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="w-12 py-3 px-2" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium">{s.route_from_place && s.route_to_place ? `${s.route_from_place} → ${s.route_to_place}` : "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{s.start_date ? s.start_date : "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{s.end_date ? s.end_date : "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{formatTime(s.departure_time)}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{formatTime(s.arrival_time)}</td>
                        <td className="py-3 px-4">
                          <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full capitalize", s.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSchedule(s.id)} title="Delete schedule">
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

import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Car,
  MapPin,
  User,
  Trash2,
  Shield,
  Building2,
  Route,
  Wifi,
  Zap,
  Baby,
  Plus,
  Pencil,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CarRow {
  id: string;
  name: string;
  registration_number: string | null;
  category: string;
  car_type: string;
  seats: number;
  ac_type: string | null;
  manufacturer: string | null;
  model: string | null;
  has_wifi: boolean;
  has_charging: boolean;
  has_child_seat: boolean;
  status: string;
  verification_status?: string;
}

interface CarDriverRow {
  id: string;
  car_id: string;
  name: string | null;
  phone: string | null;
  license_number: string;
}

interface CarAreaRow {
  id: string;
  car_id: string;
  area_type: string;
  city_name?: string | null;
  from_city?: string | null;
  to_city?: string | null;
  base_fare_cents: number | null;
  price_per_km_cents: number | null;
  minimum_fare_cents?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  days_available?: string | null;
  estimated_duration_minutes?: number | null;
}

interface CityRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const CATEGORY_LABEL: Record<string, string> = { local: "Local", intercity: "Intercity" };
const CAR_TYPE_LABEL: Record<string, string> = { sedan: "Sedan", suv: "SUV", hatchback: "Hatchback", luxury: "Luxury" };

export default function CarDetail() {
  const { listingId, carId } = useParams<{ listingId: string; carId: string }>();
  const [car, setCar] = useState<CarRow | null>(null);
  const [listingName, setListingName] = useState("");
  const [drivers, setDrivers] = useState<CarDriverRow[]>([]);
  const [areas, setAreas] = useState<CarAreaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [addScheduleMode, setAddScheduleMode] = useState<"city" | "from_to">("city");
  const [addScheduleForm, setAddScheduleForm] = useState({
    city_name: "",
    from_city: "",
    to_city: "",
    price_per_km_rupees: "",
    from_date: "",
    to_date: "",
    start_time: "",
    end_time: "",
  });
  const [addScheduleSaving, setAddScheduleSaving] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [addScheduleSheetOpen, setAddScheduleSheetOpen] = useState(false);
  const [scheduleSheetMode, setScheduleSheetMode] = useState<"city" | "from_to">("city");
  const [scheduleSheetForm, setScheduleSheetForm] = useState({
    city_name: "",
    selected_route_id: "",
    from_date: "",
    to_date: "",
    start_time: "",
    end_time: "",
  });
  const [scheduleSheetSaving, setScheduleSheetSaving] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);
  const [editingCarInfo, setEditingCarInfo] = useState(false);
  const [carEditForm, setCarEditForm] = useState<Partial<CarRow>>({});
  const [savingCarInfo, setSavingCarInfo] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverEditForm, setDriverEditForm] = useState({ name: "", phone: "", license_number: "" });
  const [savingDriverEdit, setSavingDriverEdit] = useState(false);
  const [editingAmenities, setEditingAmenities] = useState(false);
  const [amenitiesForm, setAmenitiesForm] = useState({ has_wifi: false, has_charging: false, has_child_seat: false });
  const [savingAmenities, setSavingAmenities] = useState(false);

  const isVerified = car?.verification_status === "approved";

  const refreshCar = async () => {
    if (!listingId || !carId) return;
    try {
      const next = await vendorFetch<CarRow>(`/api/listings/${listingId}/cars/${carId}`);
      setCar(next);
    } catch (_) {}
  };
  const refreshDrivers = async () => {
    if (!listingId || !carId) return;
    try {
      const { drivers: next } = await vendorFetch<{ drivers: CarDriverRow[] }>(`/api/listings/${listingId}/cars/${carId}/drivers`);
      setDrivers(next);
    } catch (_) {}
  };

  const refreshAreas = async () => {
    if (!listingId || !carId) return;
    try {
      const { areas: next } = await vendorFetch<{ areas: CarAreaRow[] }>(`/api/listings/${listingId}/cars/${carId}/operating-areas`);
      setAreas(next);
    } catch (_) {}
  };

  useEffect(() => {
    if (!listingId || !carId) return;
    (async () => {
      try {
        const [listingRes, carRes, driversRes, areasRes, citiesRes] = await Promise.all([
          vendorFetch<{ name: string }>(`/api/listings/${listingId}`).catch(() => ({ name: "" })),
          vendorFetch<CarRow>(`/api/listings/${listingId}/cars/${carId}`),
          vendorFetch<{ drivers: CarDriverRow[] }>(`/api/listings/${listingId}/cars/${carId}/drivers`),
          vendorFetch<{ areas: CarAreaRow[] }>(`/api/listings/${listingId}/cars/${carId}/operating-areas`),
          vendorFetch<{ cities: CityRow[] }>(`/api/cities`).catch(() => ({ cities: [] })),
        ]);
        setListingName(listingRes?.name ?? "");
        setCar(carRes);
        setDrivers(driversRes?.drivers ?? []);
        setAreas(areasRes?.areas ?? []);
        setCities(citiesRes?.cities ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Car not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId, carId]);

  const handleGenerateToken = async () => {
    if (!listingId || !carId) return;
    setGeneratingToken(true);
    try {
      const data = await vendorFetch<{ verification_token: string }>(
        `/api/listings/${listingId}/cars/${carId}/generate-verification-token`,
        { method: "POST" }
      );
      setVerifyToken(data.verification_token);
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToken = () => {
    if (!verifyToken) return;
    navigator.clipboard.writeText(verifyToken).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  };

  const handleSetStatus = async (status: "active" | "inactive") => {
    if (!listingId || !carId) return;
    setToggling(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setCar((c) => (c ? { ...c, status } : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!listingId || !carId || !confirm("Delete this car? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}`, { method: "DELETE" });
      window.location.href = `/listings/${listingId}/transport`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!listingId || !carId || !window.confirm("Remove this operating area?")) return;
    setDeletingAreaId(areaId);
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}/operating-areas/${areaId}`, { method: "DELETE" });
      await refreshAreas();
      if (editingAreaId === areaId) {
        setEditingAreaId(null);
        setAddScheduleForm({ city_name: "", from_city: "", to_city: "", price_per_km_rupees: "", from_date: "", to_date: "", start_time: "", end_time: "" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove area");
    } finally {
      setDeletingAreaId(null);
    }
  };

  const startEditArea = (a: CarAreaRow) => {
    setError("");
    setEditingAreaId(a.id);
    setAddScheduleMode(a.area_type === "local" ? "city" : "from_to");
    const price = a.price_per_km_cents != null ? String((a.price_per_km_cents / 100).toFixed(2)) : "";
    setAddScheduleForm({
      city_name: a.area_type === "local" ? (a.city_name ?? "") : "",
      from_city: a.area_type === "intercity" ? (a.from_city ?? "") : "",
      to_city: a.area_type === "intercity" ? (a.to_city ?? "") : "",
      price_per_km_rupees: price,
      from_date: "",
      to_date: "",
      start_time: "",
      end_time: "",
    });
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const cancelEditArea = () => {
    setEditingAreaId(null);
    setAddScheduleForm({ city_name: "", from_city: "", to_city: "", price_per_km_rupees: "", from_date: "", to_date: "", start_time: "", end_time: "" });
  };

  const handleAddScheduleFromSheet = async () => {
    if (!listingId || !carId) return;
    let areaId: string | null = null;
    if (scheduleSheetMode === "city") {
      if (!scheduleSheetForm.city_name.trim()) {
        setError("Select a city.");
        return;
      }
      const local = areas.find((a) => a.area_type === "local" && a.city_name === scheduleSheetForm.city_name.trim());
      areaId = local?.id ?? null;
      if (!areaId) {
        setError("Selected city not found. Add it in the form above first.");
        return;
      }
    } else {
      if (!scheduleSheetForm.selected_route_id.trim()) {
        setError("Select a route.");
        return;
      }
      areaId = scheduleSheetForm.selected_route_id.trim();
    }
    if (!areaId) return;
    setScheduleSheetSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {};
      if (scheduleSheetForm.from_date?.trim() && scheduleSheetForm.to_date?.trim()) {
        payload.days_available = `${scheduleSheetForm.from_date.trim()} to ${scheduleSheetForm.to_date.trim()}`;
        payload.from_date = scheduleSheetForm.from_date.trim();
        payload.to_date = scheduleSheetForm.to_date.trim();
      }
      if (scheduleSheetForm.start_time?.trim()) payload.start_time = scheduleSheetForm.start_time.trim();
      if (scheduleSheetForm.end_time?.trim()) payload.end_time = scheduleSheetForm.end_time.trim();
      if (Object.keys(payload).length === 0) {
        setError("Set at least from date, to date, or times.");
        setScheduleSheetSaving(false);
        return;
      }
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}/operating-areas/${areaId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await refreshAreas();
      setAddScheduleSheetOpen(false);
      setScheduleSheetForm({ city_name: "", selected_route_id: "", from_date: "", to_date: "", start_time: "", end_time: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update schedule");
    } finally {
      setScheduleSheetSaving(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!listingId || !carId) return;
    if (addScheduleMode === "city") {
      if (!addScheduleForm.city_name.trim() || !addScheduleForm.price_per_km_rupees.trim()) {
        setError("Select city and enter price per km.");
        return;
      }
    } else {
      if (!addScheduleForm.from_city.trim() || !addScheduleForm.to_city.trim()) {
        setError("Select From and To cities.");
        return;
      }
      if (addScheduleForm.from_city.trim() === addScheduleForm.to_city.trim()) {
        setError("From and To must be different.");
        return;
      }
      if (!addScheduleForm.price_per_km_rupees.trim()) {
        setError("Enter price per km.");
        return;
      }
    }
    setAddScheduleSaving(true);
    setError("");
    const isEdit = !!editingAreaId;
    try {
      const pricePerKmCents = Math.round(Number(addScheduleForm.price_per_km_rupees) * 100);
      if (addScheduleMode === "city") {
        const city = cities.find((c) => c.name === addScheduleForm.city_name.trim());
        const localPayload: Record<string, unknown> = {
          city_name: addScheduleForm.city_name.trim(),
          price_per_km_cents: pricePerKmCents,
        };
        if (city != null) {
          localPayload.city_lat = Number(city.lat);
          localPayload.city_lng = Number(city.lng);
        }
        if (addScheduleForm.from_date?.trim() && addScheduleForm.to_date?.trim()) {
          localPayload.from_date = addScheduleForm.from_date.trim();
          localPayload.to_date = addScheduleForm.to_date.trim();
        }
        if (addScheduleForm.start_time?.trim()) localPayload.start_time = addScheduleForm.start_time.trim();
        if (addScheduleForm.end_time?.trim()) localPayload.end_time = addScheduleForm.end_time.trim();
        if (isEdit && editingAreaId) {
          await vendorFetch(`/api/listings/${listingId}/cars/${carId}/operating-areas/${editingAreaId}`, {
            method: "PATCH",
            body: JSON.stringify(localPayload),
          });
        } else {
          (localPayload as Record<string, unknown>).area_type = "local";
          await vendorFetch(`/api/listings/${listingId}/cars/${carId}/operating-areas`, {
            method: "POST",
            body: JSON.stringify(localPayload),
          });
        }
      } else {
        const fromCity = cities.find((c) => c.name === addScheduleForm.from_city.trim());
        const toCity = cities.find((c) => c.name === addScheduleForm.to_city.trim());
        const intercityPayload: Record<string, unknown> = {
          from_city: addScheduleForm.from_city.trim(),
          to_city: addScheduleForm.to_city.trim(),
          price_per_km_cents: pricePerKmCents,
        };
        if (fromCity != null) {
          intercityPayload.from_lat = Number(fromCity.lat);
          intercityPayload.from_lng = Number(fromCity.lng);
        }
        if (toCity != null) {
          intercityPayload.to_lat = Number(toCity.lat);
          intercityPayload.to_lng = Number(toCity.lng);
        }
        if (addScheduleForm.from_date?.trim() && addScheduleForm.to_date?.trim()) {
          intercityPayload.from_date = addScheduleForm.from_date.trim();
          intercityPayload.to_date = addScheduleForm.to_date.trim();
        }
        if (isEdit && editingAreaId) {
          await vendorFetch(`/api/listings/${listingId}/cars/${carId}/operating-areas/${editingAreaId}`, {
            method: "PATCH",
            body: JSON.stringify(intercityPayload),
          });
        } else {
          (intercityPayload as Record<string, unknown>).area_type = "intercity";
          await vendorFetch(`/api/listings/${listingId}/cars/${carId}/operating-areas`, {
            method: "POST",
            body: JSON.stringify(intercityPayload),
          });
        }
      }
      await refreshAreas();
      setEditingAreaId(null);
      setAddScheduleForm({ city_name: "", from_city: "", to_city: "", price_per_km_rupees: "", from_date: "", to_date: "", start_time: "", end_time: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : isEdit ? "Failed to update" : "Failed to add");
    } finally {
      setAddScheduleSaving(false);
    }
  };

  const startEditCarInfo = () => {
    if (car) {
      setCarEditForm({
        name: car.name,
        registration_number: car.registration_number ?? "",
        car_type: car.car_type,
        seats: car.seats,
        ac_type: car.ac_type ?? "ac",
        manufacturer: car.manufacturer ?? "",
        model: car.model ?? "",
      });
      setEditingCarInfo(true);
    }
  };

  const handleSaveCarInfo = async () => {
    if (!listingId || !carId || !car) return;
    setSavingCarInfo(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: (carEditForm.name ?? car.name).trim() || car.name,
          registration_number: (carEditForm.registration_number as string)?.trim() || null,
          car_type: carEditForm.car_type ?? car.car_type,
          seats: Number(carEditForm.seats) || car.seats,
          ac_type: (carEditForm.ac_type as string) ?? car.ac_type,
          manufacturer: (carEditForm.manufacturer as string)?.trim() || null,
          model: (carEditForm.model as string)?.trim() || null,
        }),
      });
      await refreshCar();
      setEditingCarInfo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update car");
    } finally {
      setSavingCarInfo(false);
    }
  };

  const startEditDriver = (d: CarDriverRow) => {
    setEditingDriverId(d.id);
    setDriverEditForm({ name: d.name ?? "", phone: d.phone ?? "", license_number: d.license_number ?? "" });
  };

  const handleSaveDriverEdit = async () => {
    if (!listingId || !carId || !editingDriverId) return;
    setSavingDriverEdit(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}/drivers/${editingDriverId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: driverEditForm.name.trim() || null,
          phone: driverEditForm.phone.trim() || null,
          license_number: driverEditForm.license_number.trim() || null,
        }),
      });
      await refreshDrivers();
      setEditingDriverId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update driver");
    } finally {
      setSavingDriverEdit(false);
    }
  };

  const handleRemoveDriver = async (driverId: string) => {
    if (!listingId || !carId || !window.confirm("Remove this driver from this car?")) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}/drivers/${driverId}`, { method: "DELETE" });
      await refreshDrivers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove driver");
    }
  };

  const startEditAmenities = () => {
    if (car) {
      setAmenitiesForm({
        has_wifi: car.has_wifi ?? false,
        has_charging: car.has_charging ?? false,
        has_child_seat: car.has_child_seat ?? false,
      });
      setEditingAmenities(true);
    }
  };

  const handleSaveAmenities = async () => {
    if (!listingId || !carId || !car) return;
    setSavingAmenities(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}`, {
        method: "PATCH",
        body: JSON.stringify({
          has_wifi: amenitiesForm.has_wifi,
          has_charging: amenitiesForm.has_charging,
          has_child_seat: amenitiesForm.has_child_seat,
        }),
      });
      await refreshCar();
      setEditingAmenities(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update amenities");
    } finally {
      setSavingAmenities(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (error && !car) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="icon" asChild><Link to={listingId ? `/listings/${listingId}/transport` : "/listings"}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }
  if (!car) return null;

  const statusClass =
    car.status === "active"
      ? "bg-[#22C55E]/10 text-[#22C55E]"
      : car.status === "inactive"
        ? "bg-[#EF4444]/10 text-[#EF4444]"
        : "bg-[#F59E0B]/10 text-[#F59E0B]";

  const localAreas = areas.filter((a) => a.area_type === "local");
  const intercityAreas = areas.filter((a) => a.area_type === "intercity");
  const vendorSelectedCityNames = [...new Set([
    ...localAreas.map((a) => a.city_name).filter(Boolean),
    ...intercityAreas.flatMap((a) => [a.from_city, a.to_city]).filter(Boolean),
  ] as string[])].sort();

  const formatScheduleDisplay = (a: CarAreaRow): string => {
    const timeStr = (t: string | null | undefined) => (t ? String(t).slice(0, 5) : "");
    const st = timeStr(a.start_time);
    const et = timeStr(a.end_time);
    const days = (a.days_available || "").trim();
    if (days && (st || et)) return `${days}${st && et ? `, ${st}–${et}` : st || et ? `, ${st || et}` : ""}`;
    if (days) return days;
    if (st && et) return `${st}–${et}`;
    if (st || et) return st || et;
    return "—";
  };
  const areasWithSchedule = areas.filter((a) => (a.days_available && a.days_available.trim()) || a.start_time || a.end_time);
  const citiesWithSchedule = areasWithSchedule.filter((a) => a.area_type === "local");
  const routesWithSchedule = areasWithSchedule.filter((a) => a.area_type === "intercity");

  return (
    <div className="space-y-6 p-6" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/listings/${listingId}/transport`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{car.name}</h1>
            <p className="text-sm text-muted-foreground">
              {listingName && `${listingName} · `}Transport · Car detail
            </p>
          </div>
          {car.registration_number && (
            <span className="text-sm text-muted-foreground border border-[#E5E7EB] rounded-lg px-3 py-1">
              Reg: {car.registration_number}
            </span>
          )}
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-lg capitalize", statusClass)}>
            {car.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setError("")}>Dismiss</Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Cards */}
        <div className="space-y-6">
          <Card className="rounded-xl border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><Car className="h-4 w-4" /> Car information</span>
                {!editingCarInfo ? (
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={startEditCarInfo}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditingCarInfo(false)}>Cancel</Button>
                    <Button size="sm" className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={savingCarInfo} onClick={handleSaveCarInfo}>{savingCarInfo ? "Saving…" : "Save"}</Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!editingCarInfo ? (
                <>
                  <p><span className="text-muted-foreground">Registration:</span> {car.registration_number || "—"}</p>
                  <p><span className="text-muted-foreground">Type:</span> {CAR_TYPE_LABEL[car.car_type] ?? car.car_type}</p>
                  <p><span className="text-muted-foreground">Seats:</span> {car.seats}</p>
                  <p><span className="text-muted-foreground">AC:</span> {car.ac_type === "ac" ? "AC" : "Non-AC"}</p>
                  {(car.manufacturer || car.model) && (
                    <p><span className="text-muted-foreground">Manufacturer / Model:</span> {[car.manufacturer, car.model].filter(Boolean).join(" · ") || "—"}</p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Verification:</span>{" "}
                    <span className="capitalize">{car.verification_status ?? "no_request"}</span>
                  </p>
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label className="text-xs">Car name</Label><Input className="mt-1 rounded-lg" value={String(carEditForm.name ?? "")} onChange={(e) => setCarEditForm((f) => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label className="text-xs">Registration</Label><Input className="mt-1 rounded-lg" value={String(carEditForm.registration_number ?? "")} onChange={(e) => setCarEditForm((f) => ({ ...f, registration_number: e.target.value }))} /></div>
                  <div><Label className="text-xs">Type</Label><Select value={carEditForm.car_type ?? car.car_type} onValueChange={(v) => setCarEditForm((f) => ({ ...f, car_type: v }))}><SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CAR_TYPE_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="text-xs">Seats</Label><Input type="number" min={1} max={20} className="mt-1 rounded-lg" value={String(carEditForm.seats ?? car.seats)} onChange={(e) => setCarEditForm((f) => ({ ...f, seats: Number(e.target.value) || car.seats }))} /></div>
                  <div><Label className="text-xs">AC</Label><Select value={carEditForm.ac_type ?? car.ac_type ?? "ac"} onValueChange={(v) => setCarEditForm((f) => ({ ...f, ac_type: v }))}><SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ac">AC</SelectItem><SelectItem value="non_ac">Non-AC</SelectItem></SelectContent></Select></div>
                  <div><Label className="text-xs">Manufacturer</Label><Input className="mt-1 rounded-lg" value={String(carEditForm.manufacturer ?? "")} onChange={(e) => setCarEditForm((f) => ({ ...f, manufacturer: e.target.value }))} /></div>
                  <div className="sm:col-span-2"><Label className="text-xs">Model</Label><Input className="mt-1 rounded-lg" value={String(carEditForm.model ?? "")} onChange={(e) => setCarEditForm((f) => ({ ...f, model: e.target.value }))} /></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Drivers</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Edit or remove drivers below. Add new drivers from fleet page (Car setup → Driver Info).</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {drivers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No drivers assigned. Add from fleet page (Car setup → Driver Info).</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {drivers.map((d) => (
                    <li key={d.id} className="flex flex-col gap-2">
                      {editingDriverId === d.id ? (
                        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#E5E7EB] p-2">
                          <Input className="rounded-lg max-w-[120px] h-8" placeholder="Name" value={driverEditForm.name} onChange={(e) => setDriverEditForm((f) => ({ ...f, name: e.target.value }))} />
                          <Input className="rounded-lg max-w-[100px] h-8" placeholder="Phone" value={driverEditForm.phone} onChange={(e) => setDriverEditForm((f) => ({ ...f, phone: e.target.value }))} />
                          <Input className="rounded-lg max-w-[100px] h-8" placeholder="License" value={driverEditForm.license_number} onChange={(e) => setDriverEditForm((f) => ({ ...f, license_number: e.target.value }))} />
                          <Button size="sm" className="rounded-lg h-8 bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={savingDriverEdit} onClick={handleSaveDriverEdit}>Save</Button>
                          <Button size="sm" variant="ghost" className="rounded-lg h-8" disabled={savingDriverEdit} onClick={() => setEditingDriverId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#E5E7EB] last:border-0">
                          <span>{d.name ?? "—"} {d.phone && `· ${d.phone}`} {d.license_number && `· ${d.license_number}`}</span>
                          <span className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" className="rounded-lg h-8 border-[#E5E7EB]" onClick={() => startEditDriver(d)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-lg h-8 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleRemoveDriver(d.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                            </Button>
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Operating cities & From → To with schedule tables */}
          <Card className="rounded-xl border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Operating cities & routes</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Cities and From → To routes with price per km. Add them below.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div ref={addFormRef} className="rounded-xl border border-[#E5E7EB] bg-muted/30 p-4 space-y-4">
                  {editingAreaId && (
                    <p className="text-sm font-medium text-muted-foreground">Editing city/route — update below and save, or cancel.</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant={addScheduleMode === "city" ? "default" : "outline"} size="sm" className="rounded-lg" onClick={() => setAddScheduleMode("city")} disabled={!!editingAreaId}>
                      Within city
                    </Button>
                    <Button type="button" variant={addScheduleMode === "from_to" ? "default" : "outline"} size="sm" className="rounded-lg" onClick={() => setAddScheduleMode("from_to")} disabled={!!editingAreaId}>
                      From → To
                    </Button>
                  </div>
                  {addScheduleMode === "city" ? (
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="min-w-[140px]">
                        <Label className="text-xs">City</Label>
                        <Select value={addScheduleForm.city_name} onValueChange={(v) => setAddScheduleForm((f) => ({ ...f, city_name: v }))}>
                          <SelectTrigger className="mt-1 rounded-lg h-9"><SelectValue placeholder="Choose city" /></SelectTrigger>
                          <SelectContent>
                            {cities.map((c) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28">
                        <Label className="text-xs">Price/km (₹)</Label>
                        <Input type="number" min={0} step={0.01} className="mt-1 rounded-lg h-9" value={addScheduleForm.price_per_km_rupees} onChange={(e) => setAddScheduleForm((f) => ({ ...f, price_per_km_rupees: e.target.value }))} placeholder="e.g. 20" />
                      </div>
                      <Button type="button" size="sm" className="rounded-lg h-9 bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={addScheduleSaving} onClick={handleAddSchedule}>
                        {addScheduleSaving ? (editingAreaId ? "Updating…" : "Adding…") : editingAreaId ? "Update city" : "Add city"}
                      </Button>
                      {editingAreaId && (
                        <Button type="button" variant="outline" size="sm" className="rounded-lg h-9" disabled={addScheduleSaving} onClick={cancelEditArea}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="min-w-[120px]">
                        <Label className="text-xs">From</Label>
                        <Select value={addScheduleForm.from_city} onValueChange={(v) => setAddScheduleForm((f) => ({ ...f, from_city: v }))}>
                          <SelectTrigger className="mt-1 rounded-lg h-9"><SelectValue placeholder="City" /></SelectTrigger>
                          <SelectContent>
                            {cities.map((c) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[120px]">
                        <Label className="text-xs">To</Label>
                        <Select value={addScheduleForm.to_city} onValueChange={(v) => setAddScheduleForm((f) => ({ ...f, to_city: v }))}>
                          <SelectTrigger className="mt-1 rounded-lg h-9"><SelectValue placeholder="City" /></SelectTrigger>
                          <SelectContent>
                            {cities.map((c) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28">
                        <Label className="text-xs">Price/km (₹)</Label>
                        <Input type="number" min={0} step={0.01} className="mt-1 rounded-lg h-9" value={addScheduleForm.price_per_km_rupees} onChange={(e) => setAddScheduleForm((f) => ({ ...f, price_per_km_rupees: e.target.value }))} placeholder="e.g. 10" />
                      </div>
                      <Button type="button" size="sm" className="rounded-lg h-9 bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={addScheduleSaving} onClick={handleAddSchedule}>
                        {addScheduleSaving ? (editingAreaId ? "Updating…" : "Adding…") : editingAreaId ? "Update route" : "Add route"}
                      </Button>
                      {editingAreaId && (
                        <Button type="button" variant="outline" size="sm" className="rounded-lg h-9" disabled={addScheduleSaving} onClick={cancelEditArea}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              {areas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No operating areas yet. Add a city or From → To route above.</p>
              ) : (
                <>
                  {localAreas.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Building2 className="h-3.5 w-3.5" /> Cities (within city)
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                        <table className="w-full min-w-[320px] text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-[#E5E7EB] bg-muted/40">
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">City</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Price/km</th>
                              <th className="w-12 py-3 px-2" aria-label="Actions" />
                            </tr>
                          </thead>
                          <tbody>
                            {localAreas.map((a) => (
                              <tr key={a.id} className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4 font-medium">{a.city_name ?? "—"}</td>
                                <td className="py-3 px-4 text-muted-foreground">₹{((a.price_per_km_cents ?? 0) / 100).toFixed(2)}/km</td>
                                <td className="py-3 px-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteArea(a.id)} disabled={deletingAreaId === a.id} title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {intercityAreas.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Route className="h-3.5 w-3.5" /> From → To routes
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                        <table className="w-full min-w-[320px] text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-[#E5E7EB] bg-muted/40">
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Route</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Price/km</th>
                              <th className="w-12 py-3 px-2" aria-label="Actions" />
                            </tr>
                          </thead>
                          <tbody>
                            {intercityAreas.map((a) => (
                              <tr key={a.id} className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4 font-medium">{a.from_city ?? "—"} → {a.to_city ?? "—"}</td>
                                <td className="py-3 px-4 text-muted-foreground">₹{((a.price_per_km_cents ?? 0) / 100).toFixed(2)}/km</td>
                                <td className="py-3 px-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteArea(a.id)} disabled={deletingAreaId === a.id} title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Use the form above to add more.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick actions */}
        <div className="space-y-4">
          <Card className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isVerified && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  After any add or edit to car info, drivers, amenities, or operating cities & routes, re-verification is required. Verify this car (Verification → Vehicles → Cars) to use Quick actions below.
                </p>
              )}
              <Button
                variant="outline"
                className="w-full rounded-full border-[#E5E7EB] h-10"
                disabled={!isVerified}
                onClick={() => { setError(""); setAddScheduleSheetOpen(true); }}
              >
                <Calendar className="h-4 w-4 mr-2" /> Add schedule
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full border-[#E5E7EB] h-10"
                disabled={!isVerified || toggling}
                onClick={() => handleSetStatus(car.status === "active" ? "inactive" : "active")}
              >
                {toggling ? "Updating…" : car.status === "active" ? "Set Inactive" : "Set Active"}
              </Button>
              <Button
                className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white h-10"
                disabled={!isVerified || deleting}
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete car
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
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={amenitiesForm.has_child_seat} onChange={(e) => setAmenitiesForm((f) => ({ ...f, has_child_seat: e.target.checked }))} className="rounded" /><Baby className="h-4 w-4 text-muted-foreground" /> Child seat</label>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 text-sm">
                  {car.has_wifi && <span className="flex items-center gap-1.5"><Wifi className="h-4 w-4 text-muted-foreground" /> WiFi</span>}
                  {car.has_charging && <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-muted-foreground" /> Charging</span>}
                  {car.has_child_seat && <span className="flex items-center gap-1.5"><Baby className="h-4 w-4 text-muted-foreground" /> Child seat</span>}
                  {!car.has_wifi && !car.has_charging && !car.has_child_seat && (
                    <span className="text-muted-foreground">None listed</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {(citiesWithSchedule.length > 0 || routesWithSchedule.length > 0) && (
            <Card className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-4 w-4" /> Schedules (added below)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {citiesWithSchedule.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Cities</h4>
                    <ul className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg overflow-hidden text-sm">
                      {citiesWithSchedule.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 bg-background">
                          <span className="font-medium">{a.city_name ?? "—"}</span>
                          <span className="text-muted-foreground text-xs">{formatScheduleDisplay(a)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {routesWithSchedule.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">From → To routes</h4>
                    <div className="max-h-[200px] overflow-y-auto overflow-x-auto border border-[#E5E7EB] rounded-lg">
                      <ul className="divide-y divide-[#E5E7EB] text-sm min-w-[280px]">
                        {routesWithSchedule.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 px-3 bg-background">
                            <span className="font-medium shrink-0">{a.from_city ?? "—"} → {a.to_city ?? "—"}</span>
                            <span className="text-muted-foreground text-xs">₹{((a.price_per_km_cents ?? 0) / 100).toFixed(2)}/km</span>
                            <span className="text-muted-foreground text-xs">{formatScheduleDisplay(a)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Sheet open={addScheduleSheetOpen} onOpenChange={(open) => { if (!open) setAddScheduleSheetOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Add schedule
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <p className="text-sm text-muted-foreground">Add a city or From → To route with price per km and when it’s available (dates and time).</p>
            <div className="flex gap-2">
              <Button type="button" variant={scheduleSheetMode === "city" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setScheduleSheetMode("city")}>
                Within city
              </Button>
              <Button type="button" variant={scheduleSheetMode === "from_to" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setScheduleSheetMode("from_to")}>
                From → To
              </Button>
            </div>
            {scheduleSheetMode === "city" ? (
              localAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add cities in the form above first. Then you can set schedules for them here.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>City</Label>
                    <Select value={scheduleSheetForm.city_name} onValueChange={(v) => setScheduleSheetForm((f) => ({ ...f, city_name: v }))}>
                      <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Choose city" /></SelectTrigger>
                      <SelectContent>
                        {localAreas.map((a) => (
                          <SelectItem key={a.id} value={a.city_name ?? ""}>{a.city_name ?? "—"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            ) : intercityAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add From → To routes in the form above first. Then you can set schedules for them here.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Route</Label>
                  <Select value={scheduleSheetForm.selected_route_id} onValueChange={(v) => setScheduleSheetForm((f) => ({ ...f, selected_route_id: v }))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Choose route" /></SelectTrigger>
                    <SelectContent>
                      {intercityAreas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.from_city ?? "—"} → {a.to_city ?? "—"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {(scheduleSheetMode === "city" ? localAreas.length > 0 : intercityAreas.length > 0) && (
              <div className="pt-3 border-t space-y-4">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" /> Available on selected dates
                </p>
                {scheduleSheetMode === "city" ? (
                  <p className="text-xs text-muted-foreground">Select the days and time window when this city service is available.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Select dates and start time / time to reach destination for this route.</p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>From date</Label>
                    <Input type="date" className="mt-1 rounded-lg" value={scheduleSheetForm.from_date} onChange={(e) => setScheduleSheetForm((f) => ({ ...f, from_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>To date</Label>
                    <Input type="date" className="mt-1 rounded-lg" value={scheduleSheetForm.to_date} onChange={(e) => setScheduleSheetForm((f) => ({ ...f, to_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {scheduleSheetMode === "city" ? "Available from time" : "Start time"}</Label>
                    <Input type="time" className="mt-1 rounded-lg" value={scheduleSheetForm.start_time} onChange={(e) => setScheduleSheetForm((f) => ({ ...f, start_time: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {scheduleSheetMode === "city" ? "Available to time" : "Time to reach destination"}</Label>
                    <Input type="time" className="mt-1 rounded-lg" value={scheduleSheetForm.end_time} onChange={(e) => setScheduleSheetForm((f) => ({ ...f, end_time: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAddScheduleSheetOpen(false)} className="rounded-xl">Cancel</Button>
            <Button className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={scheduleSheetSaving || (scheduleSheetMode === "city" ? localAreas.length === 0 : intercityAreas.length === 0)} onClick={handleAddScheduleFromSheet}>
              {scheduleSheetSaving ? "Adding…" : "Add"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Car verification</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Use this token on Verification → Vehicles → Cars to submit documents and send request.</p>
          {!verifyToken && (
            <Button onClick={handleGenerateToken} disabled={generatingToken} className="rounded-xl">Generate token</Button>
          )}
          {verifyToken && (
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 rounded-lg bg-muted text-sm break-all">{verifyToken}</code>
              <Button variant="outline" size="sm" onClick={copyToken}>{tokenCopied ? "Copied" : "Copy"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

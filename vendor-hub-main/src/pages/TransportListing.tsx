import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Bus, MapPin, DollarSign, Plus, Settings2, Check, Eye, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  bus_id: string | null;
  name: string | null;
  phone: string | null;
  license_no: string | null;
  created_at: string;
}

interface BusRow {
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

const MANUFACTURERS = [
  { value: "Volvo", label: "Volvo" },
  { value: "Tata", label: "Tata" },
  { value: "Scania", label: "Scania" },
  { value: "Ashok Leyland", label: "Ashok Leyland" },
  { value: "Eicher", label: "Eicher" },
  { value: "Marcopolo", label: "Marcopolo" },
  { value: "Other", label: "Other" },
];

const MODELS = [
  { value: "9400 XL", label: "9400 XL" },
  { value: "Multi-axle", label: "Multi-axle" },
  { value: "Luxury", label: "Luxury" },
  { value: "Standard", label: "Standard" },
  { value: "Sleeper", label: "Sleeper" },
  { value: "Other", label: "Other" },
];

export default function TransportListing() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.get("view") === "1";
  const [listing, setListing] = useState<Listing | null>(null);
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busModalOpen, setBusModalOpen] = useState(false);
  const [busSaving, setBusSaving] = useState(false);
  const [busModalError, setBusModalError] = useState("");
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [seatPreview, setSeatPreview] = useState({ rows: 7, left: 2, right: 2, aisle: true });
  const [busForm, setBusForm] = useState({
    name: "",
    bus_number: "",
    bus_type: "seater",
    ac_type: "non_ac" as "ac" | "non_ac",
    registration_number: "",
    manufacturer: "",
    model: "",
    manufacturer_other: "",
    model_other: "",
    has_wifi: false,
    has_charging: false,
    has_entertainment: false,
    has_toilet: false,
    photo_url: "",
    layout_type: "2+2",
    rows: 7,
    left_cols: 2,
    right_cols: 2,
    has_aisle: true,
    base_price_per_seat_cents: 0,
  });
  const [busPhotoUploading, setBusPhotoUploading] = useState(false);
  const [routeForm, setRouteForm] = useState({
    from_place: "",
    to_place: "",
    distance_km: "",
    duration_minutes: "",
    price_per_seat_rupees: "",
  });
  const [routeAssignBusId, setRouteAssignBusId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [driverForm, setDriverForm] = useState({ name: "", phone: "", license_no: "" });
  const [driverAssignBusId, setDriverAssignBusId] = useState<string | null>(null);
  const [driverSaving, setDriverSaving] = useState(false);
  const [addRouteForBusId, setAddRouteForBusId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("fleet");
  const [openAddBusOnFleetLoad, setOpenAddBusOnFleetLoad] = useState(false);
  const [openAddRouteOnRoutesLoad, setOpenAddRouteOnRoutesLoad] = useState(false);
  const [fleetStatusFilter, setFleetStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [fleetSort, setFleetSort] = useState<"name" | "status" | "seats">("name");
  const [busJustAddedId, setBusJustAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;
    setError("");
    (async () => {
      try {
        // Load listing first; only load buses, drivers, routes if listing exists and is transport
        const listingData = await vendorFetch<Listing>(`/api/listings/${listingId}`);
        setListing(listingData);
        if ((listingData?.type || "").toLowerCase() !== "transport") {
          setLoading(false);
          return;
        }
        const [busesResult, routesResult, driversResult] = await Promise.allSettled([
          vendorFetch<{ buses: BusRow[] }>(`/api/listings/${listingId}/buses`),
          vendorFetch<{ routes: RouteRow[] }>(`/api/listings/${listingId}/routes`),
          vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/drivers`),
        ]);
        if (busesResult.status === "fulfilled") setBuses(busesResult.value.buses ?? []);
        if (routesResult.status === "fulfilled") setRoutes(routesResult.value.routes ?? []);
        if (driversResult.status === "fulfilled") setDrivers(driversResult.value.drivers ?? []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Listing not found or not a transport listing.";
        setError(msg);
        if (msg.toLowerCase().includes("listing not found")) {
          navigate("/listings", { state: { message: "Listing not found. It may have been deleted." }, replace: true });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId]);

  // When there are buses, default new drivers and routes to the first bus so data is stored per-bus and shows on bus detail
  useEffect(() => {
    if (buses.length > 0) {
      setDriverAssignBusId((prev) => (prev ? prev : buses[0].id));
      setRouteAssignBusId((prev) => (prev ? prev : buses[0].id));
    } else {
      setDriverAssignBusId(null);
      setRouteAssignBusId(null);
    }
  }, [buses]);

  const totalSeatsPreview = seatPreview.rows * (seatPreview.left + seatPreview.right);

  // Fleet list: filter by status and sort for scalability (100+ buses)
  const filteredAndSortedBuses = useMemo(() => {
    let list = buses;
    if (fleetStatusFilter === "active") list = list.filter((b) => b.status === "active");
    else if (fleetStatusFilter === "inactive") list = list.filter((b) => b.status === "inactive");
    return [...list].sort((a, b) => {
      if (fleetSort === "name") return (a.name || "").localeCompare(b.name || "");
      if (fleetSort === "status") return (a.status || "").localeCompare(b.status || "");
      return (a.total_seats ?? 0) - (b.total_seats ?? 0);
    });
  }, [buses, fleetStatusFilter, fleetSort]);

  // When landing on Fleet from wizard (after adding driver), form is already visible inline
  useEffect(() => {
    if (activeTab === "fleet" && openAddBusOnFleetLoad && listing) {
      setOpenAddBusOnFleetLoad(false);
      setEditingBusId(null);
      setBusForm({ name: "", bus_number: "", bus_type: "seater", ac_type: "non_ac", registration_number: "", manufacturer: "", model: "", manufacturer_other: "", model_other: "", has_wifi: false, has_charging: false, has_entertainment: false, has_toilet: false, photo_url: "", layout_type: "2+2", rows: 7, left_cols: 2, right_cols: 2, has_aisle: true, base_price_per_seat_cents: 0 });
      setSeatPreview({ rows: 7, left: 2, right: 2, aisle: true });
    }
  }, [activeTab, openAddBusOnFleetLoad, listing]);

  useEffect(() => {
    if (activeTab === "routes" && openAddRouteOnRoutesLoad) {
      setOpenAddRouteOnRoutesLoad(false);
    }
  }, [activeTab, openAddRouteOnRoutesLoad]);

  useEffect(() => {
    if (busJustAddedId && activeTab === "operator") setDriverAssignBusId(busJustAddedId);
  }, [busJustAddedId, activeTab]);
  useEffect(() => {
    if (busJustAddedId && activeTab === "routes") setRouteAssignBusId(busJustAddedId);
  }, [busJustAddedId, activeTab]);

  const openAddBus = () => {
    setBusJustAddedId(null);
    setEditingBusId(null);
    setBusForm({ name: "", bus_number: "", bus_type: "seater", ac_type: "non_ac", registration_number: "", manufacturer: "", model: "", manufacturer_other: "", model_other: "", has_wifi: false, has_charging: false, has_entertainment: false, has_toilet: false, photo_url: "", layout_type: "2+2", rows: 7, left_cols: 2, right_cols: 2, has_aisle: true, base_price_per_seat_cents: 0 });
    setSeatPreview({ rows: 7, left: 2, right: 2, aisle: true });
    setActiveTab("businfo");
  };

  const openEditBus = (bus: BusRow) => {
    setEditingBusId(bus.id);
    const man = bus.manufacturer ?? "";
    const mod = bus.model ?? "";
    const manInList = MANUFACTURERS.some((m) => m.value === man);
    const modInList = MODELS.some((m) => m.value === mod);
    setBusForm({
      name: bus.name,
      bus_number: bus.bus_number ?? "",
      bus_type: bus.bus_type,
      ac_type: (bus.ac_type === "ac" ? "ac" : "non_ac") as "ac" | "non_ac",
      registration_number: bus.registration_number ?? "",
      manufacturer: manInList ? man : (man ? "Other" : ""),
      model: modInList ? mod : (mod ? "Other" : ""),
      manufacturer_other: manInList ? "" : man,
      model_other: modInList ? "" : mod,
      has_wifi: bus.has_wifi ?? false,
      has_charging: bus.has_charging ?? false,
      has_entertainment: bus.has_entertainment ?? false,
      has_toilet: bus.has_toilet ?? false,
      photo_url: bus.photo_url ?? "",
      layout_type: bus.layout_type,
      rows: bus.rows,
      left_cols: bus.left_cols,
      right_cols: bus.right_cols,
      has_aisle: bus.has_aisle,
      base_price_per_seat_cents: bus.base_price_per_seat_cents,
    });
    setSeatPreview({ rows: bus.rows, left: bus.left_cols, right: bus.right_cols, aisle: bus.has_aisle });
    setActiveTab("businfo");
  };

  const handleSaveBus = async () => {
    if (!listingId) return;
    setBusModalError("");
    if (!busForm.registration_number.trim()) {
      setBusModalError("Registration number is required. It uniquely identifies the bus in this listing.");
      return;
    }
    setBusSaving(true);
    const payload = {
      name: busForm.name || "New Bus",
      bus_number: busForm.bus_number.trim() || null,
      bus_type: busForm.bus_type,
      ac_type: busForm.ac_type,
      registration_number: busForm.registration_number.trim() || null,
      manufacturer: (busForm.manufacturer === "Other" ? (busForm.manufacturer_other?.trim() || null) : (busForm.manufacturer?.trim() || null)) ?? null,
      model: (busForm.model === "Other" ? (busForm.model_other?.trim() || null) : (busForm.model?.trim() || null)) ?? null,
      has_wifi: busForm.has_wifi,
      has_charging: busForm.has_charging,
      has_entertainment: busForm.has_entertainment,
      has_toilet: busForm.has_toilet,
      photo_url: busForm.photo_url.trim() || null,
      layout_type: busForm.layout_type,
      rows: busForm.rows,
      left_cols: busForm.left_cols,
      right_cols: busForm.right_cols,
      has_aisle: busForm.has_aisle,
      base_price_per_seat_cents: busForm.base_price_per_seat_cents ?? 0,
    };
    try {
      if (editingBusId) {
        await vendorFetch(`/api/listings/${listingId}/buses/${editingBusId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await vendorFetch(`/api/listings/${listingId}/buses`, { method: "POST", body: JSON.stringify(payload) });
      }
      const wasAddingNewBus = !editingBusId;
      const { buses: next } = await vendorFetch<{ buses: BusRow[] }>(`/api/listings/${listingId}/buses`);
      const newBusId = wasAddingNewBus ? (next.find((b) => !buses.some((o) => o.id === b.id))?.id ?? null) : null;
      setBuses(next);
      setBusModalError("");
      setEditingBusId(null);
      setBusForm({ name: "", bus_number: "", bus_type: "seater", ac_type: "non_ac", registration_number: "", manufacturer: "", model: "", manufacturer_other: "", model_other: "", has_wifi: false, has_charging: false, has_entertainment: false, has_toilet: false, photo_url: "", layout_type: "2+2", rows: 7, left_cols: 2, right_cols: 2, has_aisle: true, base_price_per_seat_cents: 0 });
      setSeatPreview({ rows: 7, left: 2, right: 2, aisle: true });
      if (newBusId) setBusJustAddedId(newBusId);
      setActiveTab(wasAddingNewBus ? "operator" : "fleet");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save bus";
      const userMsg = msg.includes("Listing not found") ? "Listing not found. Open this listing from My Listings and try again." : msg;
      setBusModalError(userMsg);
      setError(userMsg);
    } finally {
      setBusSaving(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!listingId) return;
    try {
      await vendorFetch<{ id: string }>(`/api/listings/${listingId}/routes`, {
        method: "POST",
        body: JSON.stringify({
          from_place: routeForm.from_place,
          to_place: routeForm.to_place,
          distance_km: routeForm.distance_km ? Number(routeForm.distance_km) : null,
          duration_minutes: routeForm.duration_minutes ? Number(routeForm.duration_minutes) : null,
          price_per_seat_cents: routeForm.price_per_seat_rupees ? Math.round(Number(routeForm.price_per_seat_rupees) * 100) : null,
          bus_id: routeAssignBusId || null,
        }),
      });
      const { routes: next } = await vendorFetch<{ routes: RouteRow[] }>(`/api/listings/${listingId}/routes`);
      setRoutes(next);
      setAddRouteForBusId(null);
      setRouteForm({ from_place: "", to_place: "", distance_km: "", duration_minutes: "", price_per_seat_rupees: "" });
      setRouteAssignBusId(buses.length > 0 ? buses[0].id : null);
      setActiveTab("routes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save route");
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
          bus_id: driverAssignBusId || null,
        }),
      });
      const { drivers: next } = await vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/drivers`);
      setDrivers(next);
      setDriverForm({ name: "", phone: "", license_no: "" });
      setDriverAssignBusId(buses.length > 0 ? buses[0].id : null);
      setActiveTab("routes");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save driver";
      setError(msg.includes("Listing not found") ? "Listing not found. Open this listing from My Listings and try again." : msg);
    } finally {
      setDriverSaving(false);
    }
  };

  const handleAssignDriverToBus = async (driverId: string, busId: string | null) => {
    if (!listingId) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/drivers/${driverId}`, {
        method: "PATCH",
        body: JSON.stringify({ bus_id: busId }),
      });
      const { drivers: next } = await vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/drivers`);
      setDrivers(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update driver");
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
  if (error && !listing) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="icon" asChild><Link to="/listings"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <span>{error}</span>
          <Link to="/listings" className="text-xs font-medium underline">Go to My Listings</Link>
        </div>
      </div>
    );
  }
  if (!listing) return null;
  if (listing.type !== "transport") {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="icon" asChild><Link to="/listings"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <p className="text-muted-foreground">This listing is not a transport listing. Fleet management is only for transport type.</p>
      </div>
    );
  }

  if (isViewMode) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/listings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{listing.name}</h1>
            <p className="text-sm text-muted-foreground">Transport · View fleet</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bus className="h-4 w-4" /> Fleet</CardTitle>
            {buses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Select value={fleetStatusFilter} onValueChange={(v: "all" | "active" | "inactive") => setFleetStatusFilter(v)}>
                  <SelectTrigger className="w-[130px] rounded-lg h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={fleetSort} onValueChange={(v: "name" | "status" | "seats") => setFleetSort(v)}>
                  <SelectTrigger className="w-[140px] rounded-lg h-9"><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name A–Z</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="seats">Seats</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {buses.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No buses added. Use Edit to add buses.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-muted/30">
                      <th className="text-left font-medium py-3 px-4">Bus Name</th>
                      <th className="text-left font-medium py-3 px-4">Registered Number</th>
                      <th className="text-left font-medium py-3 px-4">Bus Number</th>
                      <th className="text-left font-medium py-3 px-4">Status</th>
                      <th className="text-right font-medium py-3 px-4 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedBuses.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-[#E5E7EB] hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">{b.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{b.registration_number || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground">{b.bus_number || "—"}</td>
                        <td className="py-3 px-4">
                          <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full capitalize", b.status === "active" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-muted text-muted-foreground")}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild title="View bus">
                              <Link to={`/listings/${listingId}/transport/bus/${b.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete bus" onClick={() => handleDeleteBus(b.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
          {(error.includes("not a transport listing") || error.includes("Listing not found")) && (
            <Link to="/listings" className="text-xs font-medium underline">Go to My Listings</Link>
          )}
        </div>
      )}

      {(() => {
        const driverDone = drivers.length >= 1;
        const fleetDone = buses.length >= 1;
        const routesDone = routes.length >= 1;
        const isAddingNewBus = editingBusId === null && activeTab === "businfo";
        const newBusHasDriver = !busJustAddedId || drivers.some((d) => d.bus_id === busJustAddedId);
        const newBusHasRoute = !busJustAddedId || routes.some((r) => r.bus_id === busJustAddedId);
        const driverDoneForFlow = busJustAddedId ? newBusHasDriver : driverDone;
        const routesDoneForFlow = busJustAddedId ? newBusHasRoute : routesDone;
        return (
      <>
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "fleet") setBusJustAddedId(null); }} className="w-full">
        <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="fleet" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            Fleet {fleetDone && <Check className="h-3.5 w-3.5 text-success" />}
          </TabsTrigger>
          <TabsTrigger value="businfo" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            Bus info {!isAddingNewBus && buses.length >= 1 && <Check className="h-3.5 w-3.5 text-success" />}
          </TabsTrigger>
          <TabsTrigger value="operator" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            Driver Info {!isAddingNewBus && driverDoneForFlow && <Check className="h-3.5 w-3.5 text-success" />}
          </TabsTrigger>
          <TabsTrigger value="routes" className="rounded-lg data-[state=active]:bg-white gap-1.5">
            Routes and Pricing {!isAddingNewBus && routesDoneForFlow && <Check className="h-3.5 w-3.5 text-success" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" /> Fleet</CardTitle>
              <p className="text-sm text-muted-foreground">Your buses for this listing. Add a bus, then fill its details in the Bus info tab.</p>
              {buses.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Select value={fleetStatusFilter} onValueChange={(v: "all" | "active" | "inactive") => setFleetStatusFilter(v)}>
                    <SelectTrigger className="w-[130px] rounded-lg h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={fleetSort} onValueChange={(v: "name" | "status" | "seats") => setFleetSort(v)}>
                    <SelectTrigger className="w-[140px] rounded-lg h-9"><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name A–Z</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="seats">Seats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {buses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No buses yet. Add your first bus, then fill its details in the next tab.</p>
                  <Button type="button" onClick={openAddBus} className="rounded-xl">
                    Add bus
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-muted/30">
                          <th className="text-left font-medium py-3 px-4">Bus Name</th>
                          <th className="text-left font-medium py-3 px-4">Registered Number</th>
                          <th className="text-left font-medium py-3 px-4">Bus Number</th>
                          <th className="text-left font-medium py-3 px-4">Status</th>
                          <th className="text-right font-medium py-3 px-4 w-24" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedBuses.map((b) => (
                          <tr key={b.id} className="border-b border-[#E5E7EB] hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-medium text-foreground">{b.name}</td>
                            <td className="py-3 px-4 text-muted-foreground">{b.registration_number || "—"}</td>
                            <td className="py-3 px-4 text-muted-foreground">{b.bus_number || "—"}</td>
                            <td className="py-3 px-4">
                              <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full capitalize", b.status === "active" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-muted text-muted-foreground")}>
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild title="View bus">
                                  <Link to={`/listings/${listingId}/transport/bus/${b.id}`}><Eye className="h-4 w-4" /></Link>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete bus" onClick={() => handleDeleteBus(b.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button type="button" variant="outline" onClick={openAddBus} className="rounded-xl">
                    Add another bus
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="businfo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" /> Bus info</CardTitle>
              <p className="text-sm text-muted-foreground">Enter bus details and seat configuration. Save to add the bus to your fleet, then continue to Driver Info and Routes and Pricing.</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-6">
              {busModalError && (
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-2">
                  <span>{busModalError}</span>
                  <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setBusModalError("")}>Dismiss</Button>
                </div>
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label>Bus name</Label>
                    <Input className="mt-1 rounded-xl" value={busForm.name} onChange={(e) => setBusForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Volvo AC 1" />
                  </div>
                  <div>
                    <Label>Bus number</Label>
                    <Input className="mt-1 rounded-xl" value={busForm.bus_number} onChange={(e) => setBusForm((f) => ({ ...f, bus_number: e.target.value }))} placeholder="e.g. AP 28 AB 1234" />
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
                    <Label>AC / Non-AC</Label>
                    <Select value={busForm.ac_type} onValueChange={(v: "ac" | "non_ac") => setBusForm((f) => ({ ...f, ac_type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ac">AC</SelectItem>
                        <SelectItem value="non_ac">Non-AC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Registration number (required, unique per bus)</Label>
                    <Input className="mt-1 rounded-xl" value={busForm.registration_number} onChange={(e) => setBusForm((f) => ({ ...f, registration_number: e.target.value }))} placeholder="e.g. AP 28 AB 1234" />
                    <p className="text-xs text-muted-foreground mt-1">This uniquely identifies the bus in this listing. Drivers and routes are linked to a bus by this.</p>
                  </div>
                  <div>
                    <Label>Manufacturer</Label>
                    <Select
                      value={busForm.manufacturer || ""}
                      onValueChange={(v) => setBusForm((f) => ({ ...f, manufacturer: v }))}
                    >
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select manufacturer" /></SelectTrigger>
                      <SelectContent>
                        {MANUFACTURERS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {busForm.manufacturer === "Other" && (
                      <Input className="mt-2 rounded-xl" placeholder="Enter manufacturer" value={busForm.manufacturer_other ?? ""} onChange={(e) => setBusForm((f) => ({ ...f, manufacturer_other: e.target.value }))} />
                    )}
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Select
                      value={busForm.model || ""}
                      onValueChange={(v) => setBusForm((f) => ({ ...f, model: v }))}
                    >
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select model" /></SelectTrigger>
                      <SelectContent>
                        {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {busForm.model === "Other" && (
                      <Input className="mt-2 rounded-xl" placeholder="Enter model" value={busForm.model_other ?? ""} onChange={(e) => setBusForm((f) => ({ ...f, model_other: e.target.value }))} />
                    )}
                  </div>
                  <div>
                    <Label>Amenities</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={busForm.has_wifi} onChange={(e) => setBusForm((f) => ({ ...f, has_wifi: e.target.checked }))} className="rounded" />
                        WiFi
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={busForm.has_charging} onChange={(e) => setBusForm((f) => ({ ...f, has_charging: e.target.checked }))} className="rounded" />
                        Charging
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={busForm.has_entertainment} onChange={(e) => setBusForm((f) => ({ ...f, has_entertainment: e.target.checked }))} className="rounded" />
                        Entertainment
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={busForm.has_toilet} onChange={(e) => setBusForm((f) => ({ ...f, has_toilet: e.target.checked }))} className="rounded" />
                        Toilet
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Rows</Label>
                      <Input type="number" min={1} max={50} className="mt-1 rounded-xl" value={busForm.rows} onChange={(e) => { const v = Number(e.target.value); setBusForm((f) => ({ ...f, rows: v })); setSeatPreview((s) => ({ ...s, rows: v })); }} />
                    </div>
                    <div>
                      <Label>Left cols</Label>
                      <Input type="number" min={0} max={5} className="mt-1 rounded-xl" value={busForm.left_cols} onChange={(e) => { const v = Number(e.target.value); setBusForm((f) => ({ ...f, left_cols: v })); setSeatPreview((s) => ({ ...s, left: v })); }} />
                    </div>
                    <div>
                      <Label>Right cols</Label>
                      <Input type="number" min={0} max={5} className="mt-1 rounded-xl" value={busForm.right_cols} onChange={(e) => { const v = Number(e.target.value); setBusForm((f) => ({ ...f, right_cols: v })); setSeatPreview((s) => ({ ...s, right: v })); }} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Preview: {totalSeatsPreview} seats</p>
                  <div>
                    <Label className="block mb-2">Bus structure</Label>
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
                  <div>
                    <Label>Photo URL</Label>
                    {busForm.photo_url ? (
                        <div className="flex flex-col gap-2">
                          <img src={busForm.photo_url} alt="Bus" className="rounded-lg object-cover max-h-32 w-full" />
                          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setBusForm((f) => ({ ...f, photo_url: "" }))}>Remove photo</Button>
                        </div>
                      ) : null}
                      <input
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                        disabled={busPhotoUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setBusPhotoUploading(true);
                          try {
                            const dataUrl = await new Promise<string>((resolve, reject) => {
                              const r = new FileReader();
                              r.onload = () => resolve(r.result as string);
                              r.onerror = reject;
                              r.readAsDataURL(file);
                            });
                            const { url } = await vendorFetch<{ url: string }>("/api/upload", { method: "POST", body: JSON.stringify({ image: dataUrl }) });
                            setBusForm((f) => ({ ...f, photo_url: url }));
                          } catch (err) {
                            setBusModalError(err instanceof Error ? err.message : "Photo upload failed");
                          } finally {
                            setBusPhotoUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">Or paste URL below</p>
                      <Input className="rounded-xl" value={busForm.photo_url} onChange={(e) => setBusForm((f) => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." />
                    </div>
                  </div>
                </div>
              <Button type="button" onClick={handleSaveBus} className="rounded-xl" disabled={busSaving}>
                {busSaving ? "Saving…" : "Save bus"}
              </Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operator" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Driver Info</CardTitle>
              <p className="text-sm text-muted-foreground">Drivers are managed per bus. Open a bus from the Fleet table (eye icon) to add or edit drivers for that bus. You can also add a driver below and assign them to a bus.</p>
            </CardHeader>
            <CardContent className="space-y-4">
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
              {buses.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Assign to bus (by registration number)</Label>
                  <Select value={driverAssignBusId ?? "none"} onValueChange={(v) => setDriverAssignBusId(v === "none" ? null : v)}>
                    <SelectTrigger className="mt-1 rounded-xl w-full max-w-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {buses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>Reg: {b.registration_number || "—"} · {b.name || b.bus_number || "Bus"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Assigned drivers show on that bus&apos;s detail page (eye icon).</p>
                </div>
              )}
              <Button type="button" onClick={handleSaveDriver} disabled={driverSaving} className="rounded-xl">Add driver</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Routes and Pricing</CardTitle>
              <p className="text-sm text-muted-foreground">Add routes (from, to, distance, duration, price per seat) for your buses. After adding bus info, add routes and set price per seat here. Routes are visible on each bus&apos;s detail page.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {routesDoneForFlow ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-success/10 text-success">
                    <Check className="h-5 w-5 shrink-0" />
                    <span className="font-medium">Completed</span>
                  </div>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setActiveTab("fleet")}>
                    Back to Fleet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>From</Label>
                      <Input className="mt-1 rounded-xl" value={routeForm.from_place} onChange={(e) => setRouteForm((f) => ({ ...f, from_place: e.target.value }))} placeholder="City or station" />
                    </div>
                    <div>
                      <Label>To</Label>
                      <Input className="mt-1 rounded-xl" value={routeForm.to_place} onChange={(e) => setRouteForm((f) => ({ ...f, to_place: e.target.value }))} placeholder="City or station" />
                    </div>
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
                  {buses.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Assign to bus (by registration number)</Label>
                      <Select value={routeAssignBusId ?? "none"} onValueChange={(v) => setRouteAssignBusId(v === "none" ? null : v)}>
                        <SelectTrigger className="mt-1 rounded-xl w-full max-w-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {buses.map((b) => (
                            <SelectItem key={b.id} value={b.id}>Reg: {b.registration_number || "—"} · {b.name || b.bus_number || "Bus"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Each bus is identified by its registration number. Assigned routes and prices show on that bus&apos;s detail page.</p>
                    </div>
                  )}
                  <Button type="button" onClick={handleSaveRoute} className="rounded-xl">Save route</Button>
                </div>
              )}
              {routes.length === 0 && (
                <p className="text-sm text-muted-foreground">No routes yet. Add a route above and set price per seat in the form.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </>
        );
      })()}
    </div>
  );
}

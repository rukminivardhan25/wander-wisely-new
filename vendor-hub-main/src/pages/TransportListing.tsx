import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Bus, Car, MapPin, DollarSign, Plus, Settings2, Check, Eye, Trash2, Shield, Calendar, Clock } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { vendorFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Listing {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  verification_status?: string;
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
  verification_token?: string | null;
  verification_status?: string | null;
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

interface CarRow {
  id: string;
  name: string;
  registration_number: string | null;
  category: string;
  car_type: string;
  seats: number;
  ac_type: string | null;
  status: string;
  verification_token?: string | null;
  verification_status?: string | null;
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

const CAR_CATEGORIES = [{ value: "local", label: "Local (within one city)" }, { value: "intercity", label: "Intercity (between cities)" }] as const;
const CAR_TYPES = [{ value: "sedan", label: "Sedan" }, { value: "suv", label: "SUV" }, { value: "hatchback", label: "Hatchback" }, { value: "luxury", label: "Luxury" }] as const;
const CAR_SEAT_OPTIONS = [
  { value: 4, label: "4 Seater", desc: "Compact" },
  { value: 5, label: "5 Seater", desc: "Sedan" },
  { value: 6, label: "6 Seater", desc: "SUV" },
  { value: 7, label: "7 Seater", desc: "Innova / XL" },
] as const;

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

const FLEET_VEHICLE_TYPES = [
  { value: "all", label: "All" },
  { value: "bus", label: "Bus" },
  { value: "car", label: "Car" },
  { value: "bike", label: "Bike" },
  { value: "cycle", label: "Cycle" },
  { value: "train", label: "Train" },
  { value: "flight", label: "Flight" },
] as const;
type FleetVehicleType = (typeof FLEET_VEHICLE_TYPES)[number]["value"];

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
  const [fleetVehicleTypeFilter, setFleetVehicleTypeFilter] = useState<FleetVehicleType>("bus");
  const [addVehicleTypeModalOpen, setAddVehicleTypeModalOpen] = useState(false);
  const [showBusSetupFlow, setShowBusSetupFlow] = useState(false);
  const [busJustAddedId, setBusJustAddedId] = useState<string | null>(null);
  const [verifyBusModal, setVerifyBusModal] = useState<BusRow | null>(null);
  const [busVerifyToken, setBusVerifyToken] = useState<string | null>(null);
  const [generatingBusToken, setGeneratingBusToken] = useState(false);
  const [busTokenCopied, setBusTokenCopied] = useState(false);

  // Car fleet and setup flow
  const [cars, setCars] = useState<CarRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [showCarSetupFlow, setShowCarSetupFlow] = useState(false);
  const [carJustAddedId, setCarJustAddedId] = useState<string | null>(null);
  const [activeCarTab, setActiveCarTab] = useState<"carinfo" | "operator" | "cities">("carinfo");
  const [carForm, setCarForm] = useState({
    name: "",
    registration_number: "",
    category: "local" as "local" | "intercity",
    car_type: "sedan",
    ac_type: "ac" as "ac" | "non_ac",
    seats: 4,
    manufacturer: "",
    model: "",
    photo_url: "",
    has_wifi: false,
    has_charging: false,
    has_child_seat: false,
  });
  const [carModalError, setCarModalError] = useState("");
  const [carSaving, setCarSaving] = useState(false);
  const [carPhotoUploading, setCarPhotoUploading] = useState(false);
  const [carDrivers, setCarDrivers] = useState<CarDriverRow[]>([]);
  const [carDriverAssignCarId, setCarDriverAssignCarId] = useState<string | null>(null);
  const [carDriverForm, setCarDriverForm] = useState({ name: "", phone: "", license_number: "" });
  const [carDriverSaving, setCarDriverSaving] = useState(false);
  const [carAreas, setCarAreas] = useState<CarAreaRow[]>([]);
  const [carAreaAddMode, setCarAreaAddMode] = useState<"city" | "from_to">("city");
  const [carAreaForm, setCarAreaForm] = useState<{
    city_name: string;
    base_fare_rupees: string;
    price_per_km_rupees: string;
    minimum_fare_rupees: string;
    from_city: string;
    to_city: string;
    from_date: string;
    to_date: string;
    start_time: string;
    end_time: string;
  }>({
    city_name: "",
    base_fare_rupees: "",
    price_per_km_rupees: "",
    minimum_fare_rupees: "",
    from_city: "",
    to_city: "",
    from_date: "",
    to_date: "",
    start_time: "",
    end_time: "",
  });
  const [carAreaSaving, setCarAreaSaving] = useState(false);
  const [verifyCarModal, setVerifyCarModal] = useState<CarRow | null>(null);
  const [carVerifyToken, setCarVerifyToken] = useState<string | null>(null);
  const [generatingCarToken, setGeneratingCarToken] = useState(false);
  const [carTokenCopied, setCarTokenCopied] = useState(false);
  const [fleetCarStatusFilter, setFleetCarStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [fleetCarSort, setFleetCarSort] = useState<"name" | "status" | "seats">("name");

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
        const [busesResult, routesResult, driversResult, carsResult, citiesResult] = await Promise.allSettled([
          vendorFetch<{ buses: BusRow[] }>(`/api/listings/${listingId}/buses`),
          vendorFetch<{ routes: RouteRow[] }>(`/api/listings/${listingId}/routes`),
          vendorFetch<{ drivers: DriverRow[] }>(`/api/listings/${listingId}/drivers`),
          vendorFetch<{ cars: CarRow[] }>(`/api/listings/${listingId}/cars`),
          vendorFetch<{ cities: CityRow[] }>(`/api/cities`),
        ]);
        if (busesResult.status === "fulfilled") setBuses(busesResult.value.buses ?? []);
        if (routesResult.status === "fulfilled") setRoutes(routesResult.value.routes ?? []);
        if (driversResult.status === "fulfilled") setDrivers(driversResult.value.drivers ?? []);
        if (carsResult.status === "fulfilled") setCars(carsResult.value.cars ?? []);
        if (citiesResult.status === "fulfilled") setCities(citiesResult.value.cities ?? []);
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

  const filteredAndSortedCars = useMemo(() => {
    let list = cars;
    if (fleetCarStatusFilter === "active") list = list.filter((c) => c.status === "active");
    else if (fleetCarStatusFilter === "inactive") list = list.filter((c) => c.status === "inactive");
    return [...list].sort((a, b) => {
      if (fleetCarSort === "name") return (a.name || "").localeCompare(b.name || "");
      if (fleetCarSort === "status") return (a.status || "").localeCompare(b.status || "");
      return (a.seats ?? 0) - (b.seats ?? 0);
    });
  }, [cars, fleetCarStatusFilter, fleetCarSort]);

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

  const openAddCar = () => {
    setCarForm({
      name: "",
      registration_number: "",
      category: "local",
      car_type: "sedan",
      ac_type: "ac",
      seats: 4,
      manufacturer: "",
      model: "",
      photo_url: "",
      has_wifi: false,
      has_charging: false,
      has_child_seat: false,
    });
    setCarJustAddedId(null);
    setCarModalError("");
    setActiveCarTab("carinfo");
  };

  const handleAddVehicleTypeSelect = (type: FleetVehicleType) => {
    setAddVehicleTypeModalOpen(false);
    if (type === "bus") {
      setShowBusSetupFlow(true);
      openAddBus();
    } else if (type === "car") {
      setShowCarSetupFlow(true);
      openAddCar();
    } else {
      navigate(`/listings/${listingId}/transport/vehicle/${type}`);
    }
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
      status: "inactive",
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
      setActiveTab(wasAddingNewBus ? "operator" : "businfo");
      if (!wasAddingNewBus) setShowBusSetupFlow(false);
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
      if (verifyBusModal?.id === busId) setVerifyBusModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete bus");
    }
  };

  const openVerifyBusModal = (bus: BusRow) => {
    setVerifyBusModal(bus);
    setBusVerifyToken(bus.verification_token ?? null);
    setBusTokenCopied(false);
  };

  const handleGenerateBusToken = async () => {
    if (!listingId || !verifyBusModal) return;
    setGeneratingBusToken(true);
    try {
      const data = await vendorFetch<{ verification_token: string; verification_status?: string }>(
        `/api/listings/${listingId}/buses/${verifyBusModal.id}/generate-verification-token`,
        { method: "POST" }
      );
      setBusVerifyToken(data.verification_token);
      const { buses: next } = await vendorFetch<{ buses: BusRow[] }>(`/api/listings/${listingId}/buses`);
      setBuses(next);
    } finally {
      setGeneratingBusToken(false);
    }
  };

  const copyBusToken = () => {
    const token = busVerifyToken ?? verifyBusModal?.verification_token;
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setBusTokenCopied(true);
      setTimeout(() => setBusTokenCopied(false), 2000);
    });
  };

  // When we land on car driver tab, default "Assign to car" to the car we're setting up
  useEffect(() => {
    if (carJustAddedId) setCarDriverAssignCarId(carJustAddedId);
  }, [carJustAddedId]);

  // Load car drivers for selected car (or current car in flow); load areas for carJustAddedId only
  useEffect(() => {
    const carIdForDrivers = carDriverAssignCarId ?? carJustAddedId;
    if (!listingId || !carJustAddedId) {
      setCarDrivers([]);
      setCarAreas([]);
      return;
    }
    (async () => {
      try {
        const [drRes, arRes] = await Promise.all([
          carIdForDrivers
            ? vendorFetch<{ drivers: CarDriverRow[] }>(`/api/listings/${listingId}/cars/${carIdForDrivers}/drivers`)
            : Promise.resolve({ drivers: [] as CarDriverRow[] }),
          vendorFetch<{ areas: CarAreaRow[] }>(`/api/listings/${listingId}/cars/${carJustAddedId}/operating-areas`),
        ]);
        setCarDrivers(carIdForDrivers ? (drRes.drivers ?? []) : []);
        setCarAreas(arRes.areas ?? []);
      } catch {
        setCarDrivers([]);
        setCarAreas([]);
      }
    })();
  }, [listingId, carJustAddedId, carDriverAssignCarId]);

  const handleSaveCar = async () => {
    if (!listingId) return;
    setCarModalError("");
    if (!carForm.registration_number.trim()) {
      setCarModalError("Registration number is required.");
      return;
    }
    setCarSaving(true);
    try {
      const res = await vendorFetch<{ id: string }>(`/api/listings/${listingId}/cars`, {
        method: "POST",
        body: JSON.stringify({
          name: carForm.name || "New Car",
          registration_number: carForm.registration_number.trim(),
          category: carForm.category,
          car_type: carForm.car_type,
          ac_type: carForm.ac_type,
          seats: carForm.seats,
          manufacturer: carForm.manufacturer.trim() || null,
          model: carForm.model.trim() || null,
          photo_url: carForm.photo_url.trim() || null,
          has_wifi: carForm.has_wifi,
          has_charging: carForm.has_charging,
          has_child_seat: carForm.has_child_seat,
        }),
      });
      const { cars: next } = await vendorFetch<{ cars: CarRow[] }>(`/api/listings/${listingId}/cars`);
      setCars(next);
      setCarJustAddedId(res.id);
      setActiveCarTab("operator");
    } catch (e) {
      setCarModalError(e instanceof Error ? e.message : "Failed to save car");
    } finally {
      setCarSaving(false);
    }
  };

  const handleSaveCarDriver = async () => {
    const carId = carDriverAssignCarId ?? carJustAddedId;
    if (!listingId || !carId) return;
    if (!carDriverForm.license_number.trim()) {
      setCarModalError("License number is required.");
      return;
    }
    setCarDriverSaving(true);
    setCarModalError("");
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carId}/drivers`, {
        method: "POST",
        body: JSON.stringify({
          name: carDriverForm.name.trim() || null,
          phone: carDriverForm.phone.trim() || null,
          license_number: carDriverForm.license_number.trim(),
        }),
      });
      const { drivers: next } = await vendorFetch<{ drivers: CarDriverRow[] }>(`/api/listings/${listingId}/cars/${carId}/drivers`);
      setCarDrivers(next);
      setCarDriverForm({ name: "", phone: "", license_number: "" });
    } catch (e) {
      setCarModalError(e instanceof Error ? e.message : "Failed to add driver");
    } finally {
      setCarDriverSaving(false);
    }
  };

  const handleSaveCarArea = async () => {
    if (!listingId || !carJustAddedId) return;
    if (carAreaAddMode === "city") {
      if (!carAreaForm.city_name.trim()) {
        setCarModalError("Select a city.");
        return;
      }
      if (!carAreaForm.price_per_km_rupees.trim() || Number(carAreaForm.price_per_km_rupees) < 0) {
        setCarModalError("Enter price per km for this city.");
        return;
      }
    } else {
      if (!carAreaForm.from_city.trim() || !carAreaForm.to_city.trim()) {
        setCarModalError("Select From and To cities.");
        return;
      }
      if (carAreaForm.from_city.trim() === carAreaForm.to_city.trim()) {
        setCarModalError("From and To must be different cities.");
        return;
      }
      if (!carAreaForm.price_per_km_rupees.trim() || Number(carAreaForm.price_per_km_rupees) < 0) {
        setCarModalError("Enter price per km for this route.");
        return;
      }
    }
    setCarAreaSaving(true);
    setCarModalError("");
    try {
      const pricePerKmCents = carAreaForm.price_per_km_rupees ? Math.round(Number(carAreaForm.price_per_km_rupees) * 100) : null;
      const baseCents = carAreaForm.base_fare_rupees ? Math.round(Number(carAreaForm.base_fare_rupees) * 100) : null;
      const minCents = carAreaForm.minimum_fare_rupees ? Math.round(Number(carAreaForm.minimum_fare_rupees) * 100) : null;
      if (carAreaAddMode === "city") {
        const city = cities.find((c) => c.name === carAreaForm.city_name.trim());
        const localPayload: Record<string, unknown> = {
          area_type: "local",
          city_name: carAreaForm.city_name.trim(),
          price_per_km_cents: pricePerKmCents,
        };
        if (city != null) {
          localPayload.city_lat = Number(city.lat);
          localPayload.city_lng = Number(city.lng);
        }
        if (carAreaForm.from_date?.trim() && carAreaForm.to_date?.trim()) {
          localPayload.days_available = `${carAreaForm.from_date.trim()} to ${carAreaForm.to_date.trim()}`;
          localPayload.from_date = carAreaForm.from_date.trim();
          localPayload.to_date = carAreaForm.to_date.trim();
        }
        if (carAreaForm.start_time?.trim()) localPayload.start_time = carAreaForm.start_time.trim();
        if (carAreaForm.end_time?.trim()) localPayload.end_time = carAreaForm.end_time.trim();
        await vendorFetch(`/api/listings/${listingId}/cars/${carJustAddedId}/operating-areas`, {
          method: "POST",
          body: JSON.stringify(localPayload),
        });
      } else {
        const fromCity = cities.find((c) => c.name === carAreaForm.from_city.trim());
        const toCity = cities.find((c) => c.name === carAreaForm.to_city.trim());
        const intercityPayload: Record<string, unknown> = {
          area_type: "intercity",
          from_city: carAreaForm.from_city.trim(),
          to_city: carAreaForm.to_city.trim(),
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
        if (baseCents != null) intercityPayload.base_fare_cents = baseCents;
        if (carAreaForm.from_date?.trim() && carAreaForm.to_date?.trim()) {
          let dateRange = `${carAreaForm.from_date.trim()} to ${carAreaForm.to_date.trim()}`;
          if (carAreaForm.start_time?.trim() && carAreaForm.end_time?.trim()) {
            dateRange += `, ${carAreaForm.start_time.trim()}-${carAreaForm.end_time.trim()}`;
          }
          intercityPayload.days_available = dateRange;
          intercityPayload.from_date = carAreaForm.from_date.trim();
          intercityPayload.to_date = carAreaForm.to_date.trim();
        } else if (carAreaForm.start_time?.trim() && carAreaForm.end_time?.trim()) {
          intercityPayload.days_available = `${carAreaForm.start_time.trim()}-${carAreaForm.end_time.trim()}`;
        }
        await vendorFetch(`/api/listings/${listingId}/cars/${carJustAddedId}/operating-areas`, {
          method: "POST",
          body: JSON.stringify(intercityPayload),
        });
      }
      const { areas: next } = await vendorFetch<{ areas: CarAreaRow[] }>(`/api/listings/${listingId}/cars/${carJustAddedId}/operating-areas`);
      setCarAreas(next);
      setCarAreaForm((f) => ({ ...f, city_name: "", from_city: "", to_city: "", base_fare_rupees: "", price_per_km_rupees: "", minimum_fare_rupees: "", from_date: "", to_date: "", start_time: "", end_time: "" }));
    } catch (e) {
      setCarModalError(e instanceof Error ? e.message : "Failed to add operating area");
    } finally {
      setCarAreaSaving(false);
    }
  };

  const handleDeleteCarArea = async (areaId: string) => {
    if (!listingId || !carJustAddedId || !window.confirm("Remove this operating area?")) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carJustAddedId}/operating-areas/${areaId}`, { method: "DELETE" });
      const { areas: next } = await vendorFetch<{ areas: CarAreaRow[] }>(`/api/listings/${listingId}/cars/${carJustAddedId}/operating-areas`);
      setCarAreas(next);
    } catch (e) {
      setCarModalError(e instanceof Error ? e.message : "Failed to remove operating area");
    }
  };

  const handleDeleteCar = async (carIdToDelete: string) => {
    if (!listingId || !window.confirm("Remove this car from the fleet? This cannot be undone.")) return;
    try {
      await vendorFetch(`/api/listings/${listingId}/cars/${carIdToDelete}`, { method: "DELETE" });
      const { cars: next } = await vendorFetch<{ cars: CarRow[] }>(`/api/listings/${listingId}/cars`);
      setCars(next);
      if (verifyCarModal?.id === carIdToDelete) setVerifyCarModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete car");
    }
  };

  const openVerifyCarModal = (car: CarRow) => {
    setVerifyCarModal(car);
    setCarVerifyToken(car.verification_token ?? null);
    setCarTokenCopied(false);
  };

  const handleGenerateCarToken = async () => {
    if (!listingId || !verifyCarModal) return;
    setGeneratingCarToken(true);
    try {
      const data = await vendorFetch<{ verification_token: string }>(
        `/api/listings/${listingId}/cars/${verifyCarModal.id}/generate-verification-token`,
        { method: "POST" }
      );
      setCarVerifyToken(data.verification_token);
      const { cars: next } = await vendorFetch<{ cars: CarRow[] }>(`/api/listings/${listingId}/cars`);
      setCars(next);
    } finally {
      setGeneratingCarToken(false);
    }
  };

  const copyCarToken = () => {
    const token = carVerifyToken ?? verifyCarModal?.verification_token;
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setCarTokenCopied(true);
      setTimeout(() => setCarTokenCopied(false), 2000);
    });
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

  const isVerified = listing.verification_status === "approved" || listing.verification_status === "verified";
  if (!isVerified) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/listings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 max-w-lg">
          <h2 className="font-display font-semibold text-lg text-foreground mb-2">Company verification required</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You can add buses, routes, and manage your fleet only after this company is verified. Complete verification from the Verification page, then return here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-xl">
              <Link to="/verification">Go to Verification</Link>
            </Button>
            <Button variant="outline" asChild className="rounded-xl">
              <Link to="/listings">Back to My Listings</Link>
            </Button>
          </div>
        </div>
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
        <Tabs value={fleetVehicleTypeFilter} onValueChange={(v) => setFleetVehicleTypeFilter(v as FleetVehicleType)} className="w-full">
          <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1.5 rounded-xl w-full sm:w-auto">
            <TabsTrigger value="bus" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Bus className="h-4 w-4" /> Bus
            </TabsTrigger>
            <TabsTrigger value="car" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Car className="h-4 w-4" /> Car
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bus className="h-4 w-4" /> Fleet</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {(fleetVehicleTypeFilter === "bus" || fleetVehicleTypeFilter === "all") && buses.length > 0 && (
                <>
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
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {fleetVehicleTypeFilter === "car" ? (
              cars.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6">No cars added yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-muted/30">
                        <th className="text-left font-medium py-3 px-4">Car Name</th>
                        <th className="text-left font-medium py-3 px-4">Registration Number</th>
                        <th className="text-left font-medium py-3 px-4">Car Category</th>
                        <th className="text-left font-medium py-3 px-4">Seats</th>
                        <th className="text-left font-medium py-3 px-4">Status</th>
                        <th className="text-right font-medium py-3 px-4 w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedCars.map((c) => (
                        <tr key={c.id} className="border-b border-[#E5E7EB] hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{c.registration_number || "—"}</td>
                          <td className="py-3 px-4 text-muted-foreground">{c.category === "local" ? "Local" : "Intercity"}</td>
                          <td className="py-3 px-4 text-muted-foreground">{c.seats}</td>
                          <td className="py-3 px-4">
                            <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full capitalize", c.status === "active" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-muted text-muted-foreground")}>{c.status}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild title="View car">
                              <Link to={`/listings/${listingId}/transport/car/${c.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : fleetVehicleTypeFilter !== "bus" && fleetVehicleTypeFilter !== "all" ? (
              <p className="text-sm text-muted-foreground p-6">No {fleetVehicleTypeFilter}s yet. Vehicle setup coming soon.</p>
            ) : buses.length === 0 ? (
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Verify bus" onClick={() => openVerifyBusModal(b)}>
                              <Shield className="h-4 w-4" />
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

      {/* Vehicle-type bar: Bus | Car | All */}
      {!showBusSetupFlow && !showCarSetupFlow && (
        <Tabs value={fleetVehicleTypeFilter} onValueChange={(v) => setFleetVehicleTypeFilter(v as FleetVehicleType)} className="w-full">
          <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1.5 rounded-xl w-full sm:w-auto">
            <TabsTrigger value="bus" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Bus className="h-4 w-4" /> Bus
            </TabsTrigger>
            <TabsTrigger value="car" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Car className="h-4 w-4" /> Car
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {!showBusSetupFlow && !showCarSetupFlow && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" /> Fleet</CardTitle>
              <p className="text-sm text-muted-foreground">
                {fleetVehicleTypeFilter === "bus" && "Your buses for this listing. Add a bus, then fill its details in Bus info, Driver info, and Routes & pricing."}
                {fleetVehicleTypeFilter === "car" && "Your cars for this listing. Add a car, then complete Car info, Driver info, and Operating Cities & pricing."}
                {fleetVehicleTypeFilter === "all" && "Your buses and cars. Select Bus or Car above to filter, or add a vehicle below."}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 justify-between">
                <div className="flex flex-wrap gap-2">
                  {(fleetVehicleTypeFilter === "bus" || fleetVehicleTypeFilter === "all") && buses.length > 0 && (
                    <>
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
                    </>
                  )}
                  {fleetVehicleTypeFilter === "car" && cars.length > 0 && (
                    <>
                      <Select value={fleetCarStatusFilter} onValueChange={(v: "all" | "active" | "inactive") => setFleetCarStatusFilter(v)}>
                        <SelectTrigger className="w-[130px] rounded-lg h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={fleetCarSort} onValueChange={(v: "name" | "status" | "seats") => setFleetCarSort(v)}>
                        <SelectTrigger className="w-[140px] rounded-lg h-9"><SelectValue placeholder="Sort by" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name A–Z</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="seats">Seats</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
                <Button type="button" variant="outline" onClick={() => setAddVehicleTypeModalOpen(true)} className="rounded-xl shrink-0">
                  Add Vehicle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fleetVehicleTypeFilter === "car" ? (
                cars.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <p className="text-sm text-muted-foreground">No cars yet. Add your first car using Add Vehicle → Car above, then complete Car info, Driver info, and Operating Cities & pricing.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-muted/30">
                          <th className="text-left font-medium py-3 px-4">Car Name</th>
                          <th className="text-left font-medium py-3 px-4">Registration Number</th>
                          <th className="text-left font-medium py-3 px-4">Car Category</th>
                          <th className="text-left font-medium py-3 px-4">Seats</th>
                          <th className="text-left font-medium py-3 px-4">Status</th>
                          <th className="text-right font-medium py-3 px-4 w-24" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedCars.map((c) => (
                          <tr key={c.id} className="border-b border-[#E5E7EB] hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                            <td className="py-3 px-4 text-muted-foreground">{c.registration_number || "—"}</td>
                            <td className="py-3 px-4 text-muted-foreground">{c.category === "local" ? "Local" : "Intercity"}</td>
                            <td className="py-3 px-4 text-muted-foreground">{c.seats}</td>
                            <td className="py-3 px-4">
                              <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full capitalize", c.status === "active" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-muted text-muted-foreground")}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild title="View car">
                                  <Link to={`/listings/${listingId}/transport/car/${c.id}`}><Eye className="h-4 w-4" /></Link>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Verify car" onClick={() => openVerifyCarModal(c)}>
                                  <Shield className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete car" onClick={() => handleDeleteCar(c.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : fleetVehicleTypeFilter !== "bus" && fleetVehicleTypeFilter !== "all" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No {fleetVehicleTypeFilter}s yet. Vehicle setup coming soon.</p>
                </div>
              ) : buses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No buses yet. Add your first bus using the Add Vehicle button above, then fill its details in Bus info, Driver info, and Routes & pricing.</p>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Verify bus" onClick={() => openVerifyBusModal(b)}>
                                  <Shield className="h-4 w-4" />
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
                </>
              )}
            </CardContent>
          </Card>
          <Dialog open={addVehicleTypeModalOpen} onOpenChange={setAddVehicleTypeModalOpen}>
            <DialogContent className="rounded-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle>Select Vehicle Type</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2 pt-2">
                {FLEET_VEHICLE_TYPES.map(({ value, label }) => (
                  <Button key={value} variant="outline" className="justify-start rounded-lg" onClick={() => handleAddVehicleTypeSelect(value)}>
                    {label}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {showBusSetupFlow && (() => {
        const driverDone = drivers.length >= 1;
        const fleetDone = buses.length >= 1;
        const isAddingNewBus = editingBusId === null && activeTab === "businfo";
        const newBusHasDriver = !busJustAddedId || drivers.some((d) => d.bus_id === busJustAddedId);
        const driverDoneForFlow = busJustAddedId ? newBusHasDriver : driverDone;
        // Only show Routes and Pricing as completed when this bus has at least one route (not just any route in the listing)
        const routesDoneForFlow = busJustAddedId ? routes.some((r) => r.bus_id === busJustAddedId) : false;
        return (
      <>
      <Tabs value={activeTab === "fleet" ? "businfo" : activeTab} onValueChange={(v) => setActiveTab(v)} className="w-full">
        <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
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
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowBusSetupFlow(false)}>
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

      {showCarSetupFlow && (
        <Tabs value={activeCarTab} onValueChange={(v) => setActiveCarTab(v as "carinfo" | "operator" | "cities")} className="w-full">
          <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="carinfo" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              Car info {carJustAddedId && <Check className="h-3.5 w-3.5 text-success" />}
            </TabsTrigger>
            <TabsTrigger value="operator" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              Driver Info {carJustAddedId && carDrivers.length >= 1 && <Check className="h-3.5 w-3.5 text-success" />}
            </TabsTrigger>
            <TabsTrigger value="cities" className="rounded-lg data-[state=active]:bg-white gap-1.5">
              Operating Cities & Pricing {carJustAddedId && carAreas.length >= 1 && <Check className="h-3.5 w-3.5 text-success" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="carinfo" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" /> Car info</CardTitle>
                <p className="text-sm text-muted-foreground">Enter car details. Save to add the car to your fleet, then continue to Driver Info and Operating Cities & Pricing.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {carModalError && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-2">
                    <span>{carModalError}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCarModalError("")}>Dismiss</Button>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Car name</Label>
                    <Input className="mt-1 rounded-xl" value={carForm.name} onChange={(e) => setCarForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. My White Innova" />
                    <p className="text-xs text-muted-foreground mt-1">Your own label for this vehicle in the fleet (e.g. &quot;Car 1&quot;, &quot;Innova – White&quot;).</p>
                  </div>
                  <div>
                    <Label>Registration number (required, unique)</Label>
                    <Input className="mt-1 rounded-xl" value={carForm.registration_number} onChange={(e) => setCarForm((f) => ({ ...f, registration_number: e.target.value }))} placeholder="e.g. AP 28 AB 1234" />
                  </div>
                  <div>
                    <Label>Car type</Label>
                    <Select value={carForm.car_type} onValueChange={(v) => setCarForm((f) => ({ ...f, car_type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CAR_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>AC / Non-AC</Label>
                    <Select value={carForm.ac_type} onValueChange={(v: "ac" | "non_ac") => setCarForm((f) => ({ ...f, ac_type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ac">AC</SelectItem>
                        <SelectItem value="non_ac">Non-AC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Seating capacity</Label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {CAR_SEAT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCarForm((f) => ({ ...f, seats: opt.value }))}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border-2 px-4 py-3 transition-colors",
                            carForm.seats === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted/30 hover:border-primary/50 text-foreground"
                          )}
                        >
                          <Car className="h-5 w-5 shrink-0" />
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">({opt.desc})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Manufacturer (brand)</Label>
                    <Input className="mt-1 rounded-xl" value={carForm.manufacturer} onChange={(e) => setCarForm((f) => ({ ...f, manufacturer: e.target.value }))} placeholder="e.g. Toyota, Maruti, Honda" />
                    <p className="text-xs text-muted-foreground mt-1">Brand that makes the car.</p>
                  </div>
                  <div>
                    <Label>Model (product name)</Label>
                    <Input className="mt-1 rounded-xl" value={carForm.model} onChange={(e) => setCarForm((f) => ({ ...f, model: e.target.value }))} placeholder="e.g. Innova, Swift, Creta" />
                    <p className="text-xs text-muted-foreground mt-1">Specific model or product line.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Car photo</Label>
                    {carForm.photo_url ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <img src={carForm.photo_url} alt="Car" className="rounded-lg object-cover max-h-32 w-full max-w-xs" />
                        <Button type="button" variant="outline" size="sm" className="rounded-xl w-fit" onClick={() => setCarForm((f) => ({ ...f, photo_url: "" }))}>Remove photo</Button>
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground mt-1"
                      disabled={carPhotoUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCarPhotoUploading(true);
                        try {
                          const dataUrl = await new Promise<string>((resolve, reject) => {
                            const r = new FileReader();
                            r.onload = () => resolve(r.result as string);
                            r.onerror = reject;
                            r.readAsDataURL(file);
                          });
                          const { url } = await vendorFetch<{ url: string }>("/api/upload", { method: "POST", body: JSON.stringify({ image: dataUrl }) });
                          setCarForm((f) => ({ ...f, photo_url: url }));
                        } catch (err) {
                          setCarModalError(err instanceof Error ? err.message : "Photo upload failed");
                        } finally {
                          setCarPhotoUploading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Or paste image URL below</p>
                    <Input className="mt-1 rounded-xl" value={carForm.photo_url} onChange={(e) => setCarForm((f) => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Amenities</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={carForm.has_wifi} onChange={(e) => setCarForm((f) => ({ ...f, has_wifi: e.target.checked }))} className="rounded" />
                        WiFi
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={carForm.has_charging} onChange={(e) => setCarForm((f) => ({ ...f, has_charging: e.target.checked }))} className="rounded" />
                        Charging
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={carForm.has_child_seat} onChange={(e) => setCarForm((f) => ({ ...f, has_child_seat: e.target.checked }))} className="rounded" />
                        Child seat
                      </label>
                    </div>
                  </div>
                </div>
                <Button type="button" onClick={handleSaveCar} className="rounded-xl" disabled={carSaving}>
                  {carSaving ? "Saving…" : "Save car"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operator" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Driver Info</CardTitle>
                <p className="text-sm text-muted-foreground">Drivers are managed per car. Open a car from the Fleet table (eye icon) to add or edit drivers for that car. You can also add a driver below and assign them to a car.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {!carJustAddedId ? (
                  <p className="text-sm text-muted-foreground">Save the car in Car info first, then add drivers here.</p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label>Name</Label>
                        <Input className="mt-1 rounded-xl" value={carDriverForm.name} onChange={(e) => setCarDriverForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramesh Kumar" />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input className="mt-1 rounded-xl" value={carDriverForm.phone} onChange={(e) => setCarDriverForm((f) => ({ ...f, phone: e.target.value }))} placeholder="e.g. 9876543210" />
                      </div>
                      <div>
                        <Label>License number (required)</Label>
                        <Input className="mt-1 rounded-xl" value={carDriverForm.license_number} onChange={(e) => setCarDriverForm((f) => ({ ...f, license_number: e.target.value }))} placeholder="e.g. DL 01 2020 1234567" />
                      </div>
                    </div>
                    {cars.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">Assign to car (by registration number)</Label>
                        <Select value={carDriverAssignCarId ?? carJustAddedId ?? cars[0]?.id} onValueChange={(v) => setCarDriverAssignCarId(v)}>
                          <SelectTrigger className="mt-1 rounded-xl w-full max-w-xs"><SelectValue placeholder="Select car" /></SelectTrigger>
                          <SelectContent>
                            {cars.map((c) => (
                              <SelectItem key={c.id} value={c.id}>Reg: {c.registration_number || "—"} · {c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">Assigned drivers show on that car&apos;s detail page (eye icon).</p>
                      </div>
                    )}
                    <Button type="button" onClick={handleSaveCarDriver} disabled={carDriverSaving} className="rounded-xl">Add driver</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cities" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Operating Cities & Pricing</CardTitle>
                <p className="text-sm text-muted-foreground">Add cities where this car runs (within city) and/or From → To routes. Set price per km; optionally set available dates and time window.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {!carJustAddedId ? (
                  <p className="text-sm text-muted-foreground">Save the car in Car info first, then add operating cities here.</p>
                ) : (
                  <>
                    {carModalError && (
                      <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-2">
                        <span>{carModalError}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setCarModalError("")}>Dismiss</Button>
                      </div>
                    )}
                    {/* Upper: Add city or From → To with pricing */}
                    <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                      <div className="flex gap-2">
                        <Button type="button" variant={carAreaAddMode === "city" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setCarAreaAddMode("city")}>
                          Within city
                        </Button>
                        <Button type="button" variant={carAreaAddMode === "from_to" ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => setCarAreaAddMode("from_to")}>
                          From → To
                        </Button>
                      </div>
                      {carAreaAddMode === "city" ? (
                        <div className="grid gap-4 sm:grid-cols-2 items-end">
                          <div>
                            <Label>City</Label>
                            <Select value={carAreaForm.city_name} onValueChange={(v) => setCarAreaForm((f) => ({ ...f, city_name: v }))}>
                              <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Choose city" /></SelectTrigger>
                              <SelectContent>
                                {cities.map((c) => (
                                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Price per km (₹)</Label>
                            <Input type="number" min={0} step={0.01} className="mt-1 rounded-xl" value={carAreaForm.price_per_km_rupees} onChange={(e) => setCarAreaForm((f) => ({ ...f, price_per_km_rupees: e.target.value }))} placeholder="e.g. 15" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-3 items-end">
                          <div>
                            <Label>From city</Label>
                            <Select value={carAreaForm.from_city} onValueChange={(v) => setCarAreaForm((f) => ({ ...f, from_city: v }))}>
                              <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="From" /></SelectTrigger>
                              <SelectContent>
                                {cities.map((c) => (
                                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>To city</Label>
                            <Select value={carAreaForm.to_city} onValueChange={(v) => setCarAreaForm((f) => ({ ...f, to_city: v }))}>
                              <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="To" /></SelectTrigger>
                              <SelectContent>
                                {cities.map((c) => (
                                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Price per km (₹)</Label>
                            <Input type="number" min={0} step={0.01} className="mt-1 rounded-xl" value={carAreaForm.price_per_km_rupees} onChange={(e) => setCarAreaForm((f) => ({ ...f, price_per_km_rupees: e.target.value }))} placeholder="e.g. 12" />
                          </div>
                        </div>
                      )}
                      <div className="pt-3 border-t space-y-4">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-muted-foreground" /> Available on selected dates
                        </p>
                        <p className="text-xs text-muted-foreground">Optionally set the date range and time window when this is available.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label>From date</Label>
                            <Input type="date" className="mt-1 rounded-xl" value={carAreaForm.from_date} onChange={(e) => setCarAreaForm((f) => ({ ...f, from_date: e.target.value }))} />
                          </div>
                          <div>
                            <Label>To date</Label>
                            <Input type="date" className="mt-1 rounded-xl" value={carAreaForm.to_date} onChange={(e) => setCarAreaForm((f) => ({ ...f, to_date: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Available from time</Label>
                            <Input type="time" className="mt-1 rounded-xl" value={carAreaForm.start_time} onChange={(e) => setCarAreaForm((f) => ({ ...f, start_time: e.target.value }))} />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Available to time</Label>
                            <Input type="time" className="mt-1 rounded-xl" value={carAreaForm.end_time} onChange={(e) => setCarAreaForm((f) => ({ ...f, end_time: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                      <Button type="button" onClick={handleSaveCarArea} className="rounded-xl" disabled={carAreaSaving}>
                        {carAreaSaving ? "Saving…" : carAreaAddMode === "city" ? "Add city" : "Add From → To"}
                      </Button>
                    </div>

                    {/* Lower: Lists of cities and from-to pairs with prices */}
                    <div className="space-y-6">
                      {carAreas.filter((a) => a.area_type === "local").length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Cities (within city) — price per km</h4>
                          <ul className="border rounded-xl divide-y overflow-hidden">
                            {carAreas.filter((a) => a.area_type === "local").map((a) => (
                              <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2 bg-background">
                                <span className="font-medium">{a.city_name ?? "—"}</span>
                                <span className="text-muted-foreground">₹{((a.price_per_km_cents ?? 0) / 100).toFixed(2)}/km</span>
                                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive rounded-lg" onClick={() => handleDeleteCarArea(a.id)}>
                                  Remove
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {carAreas.filter((a) => a.area_type === "intercity").length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">From → To routes — price per km</h4>
                          <ul className="border rounded-xl divide-y overflow-hidden">
                            {carAreas.filter((a) => a.area_type === "intercity").map((a) => (
                              <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2 bg-background">
                                <span className="font-medium">{a.from_city ?? "—"} → {a.to_city ?? "—"}</span>
                                <span className="text-muted-foreground">₹{((a.price_per_km_cents ?? 0) / 100).toFixed(2)}/km</span>
                                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive rounded-lg" onClick={() => handleDeleteCarArea(a.id)}>
                                  Remove
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {carAreas.length === 0 && (
                        <p className="text-sm text-muted-foreground">No cities or routes yet. Use the form above to add within-city cities and/or From → To pairs with price per km.</p>
                      )}
                    </div>

                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowCarSetupFlow(false)}>
                      Back to Fleet
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!verifyBusModal} onOpenChange={(open) => !open && setVerifyBusModal(null)}>
        <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden">
          {verifyBusModal && (
            <>
              <div className="bg-sidebar text-sidebar-foreground px-5 py-4">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Bus Verification</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-sidebar-foreground/80 mt-0.5">{verifyBusModal.name} · {verifyBusModal.registration_number || "—"}</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</h4>
                  <p className="text-sm font-medium capitalize">
                    {verifyBusModal.verification_status === "pending" && "Pending request"}
                    {verifyBusModal.verification_status === "approved" && "Approved"}
                    {verifyBusModal.verification_status === "rejected" && "Rejected"}
                    {(!verifyBusModal.verification_status || verifyBusModal.verification_status === "no_request") && "No request"}
                  </p>
                  {(verifyBusModal.verification_status === "pending" || verifyBusModal.verification_status === "approved" || verifyBusModal.verification_status === "rejected") && (
                    <span className={cn(
                      "inline-flex text-xs font-medium px-2 py-0.5 rounded-full mt-1",
                      verifyBusModal.verification_status === "approved" && "bg-emerald-500/20 text-emerald-800",
                      verifyBusModal.verification_status === "pending" && "bg-amber-500/20 text-amber-800",
                      verifyBusModal.verification_status === "rejected" && "bg-red-500/20 text-red-800"
                    )}>
                      {verifyBusModal.verification_status === "pending" ? "Pending request" : verifyBusModal.verification_status}
                    </span>
                  )}
                </div>
                {!(busVerifyToken ?? verifyBusModal.verification_token) ? (
                  <Button type="button" onClick={handleGenerateBusToken} disabled={generatingBusToken} className="rounded-lg w-full">
                    {generatingBusToken ? "Generating…" : "Generate verification token"}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Token</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-foreground break-all flex-1 min-w-0">{busVerifyToken ?? verifyBusModal.verification_token}</p>
                      <Button type="button" variant="outline" size="sm" onClick={copyBusToken} className="rounded-lg shrink-0">
                        {busTokenCopied ? <Check size={14} /> : "Copy"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Token generated. Copy and share with admin for verification. Status will update when reviewed.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!verifyCarModal} onOpenChange={(open) => !open && setVerifyCarModal(null)}>
        <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden">
          {verifyCarModal && (
            <>
              <div className="bg-sidebar text-sidebar-foreground px-5 py-4">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Car Verification</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-sidebar-foreground/80 mt-0.5">{verifyCarModal.name} · {verifyCarModal.registration_number || "—"}</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</h4>
                  <p className="text-sm font-medium capitalize">
                    {verifyCarModal.verification_status === "pending" && "Pending request"}
                    {verifyCarModal.verification_status === "approved" && "Approved"}
                    {verifyCarModal.verification_status === "rejected" && "Rejected"}
                    {(!verifyCarModal.verification_status || verifyCarModal.verification_status === "no_request") && "No request"}
                  </p>
                </div>
                {!(carVerifyToken ?? verifyCarModal.verification_token) ? (
                  <Button onClick={handleGenerateCarToken} disabled={generatingCarToken} className="rounded-xl">Generate token</Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Verification token (use on Verification → Vehicles → Cars)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-foreground break-all flex-1 min-w-0">{carVerifyToken ?? verifyCarModal.verification_token}</p>
                      <Button type="button" variant="outline" size="sm" onClick={copyCarToken} className="rounded-lg shrink-0">
                        {carTokenCopied ? <Check size={14} /> : "Copy"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

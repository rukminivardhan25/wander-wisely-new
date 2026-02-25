import { useState, useEffect } from "react";
import { Building2, Bus, Car, Plane, ChevronDown, ShieldCheck, Check, X, Eye, FileText, User, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/api";

const CATEGORIES = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "vehicles", label: "Vehicles", icon: Bus },
] as const;

const COMPANY_TYPES = [
  "Transport",
  "Restaurant",
  "Hotel",
  "Shop",
  "Experience",
  "Rental",
  "Event",
  "Guide",
  "Emergency",
] as const;

const VEHICLE_TYPES = ["Buses", "Cars", "Flights"] as const;

type RequestRow = {
  id: string;
  name: string;
  type: string;
  token: string;
  requestedAt: string;
  status: string;
  ownerName?: string;
  ownerEmail?: string;
  address?: string;
  documents?: { type: string; fileName: string; url?: string }[];
  experienceInfo?: { category: string; city: string; duration_text: string; price_per_person_cents: number; cancellation_policy: string | null };
};

type BusRequestRow = {
  id: string;
  name: string;
  listingName: string;
  registration_number: string | null;
  bus_number: string | null;
  token: string;
  requestedAt: string;
  status: string;
  ownerName?: string;
  ownerEmail?: string;
  drivers?: { id: string; name: string | null; phone: string | null; license_no: string | null }[];
  routes?: { id: string; from_place: string; to_place: string; distance_km: number | null; duration_minutes: number | null; price_per_seat_cents: number | null }[];
  documents?: { document_type: string; file_name: string; file_url: string }[];
};

type CarRequestRow = {
  id: string;
  name: string;
  listingName: string;
  registration_number: string | null;
  category: string;
  token: string;
  requestedAt: string;
  status: string;
  ownerName?: string;
  ownerEmail?: string;
  drivers?: { id: string; name: string | null; phone: string | null; license_number: string }[];
  operatingAreas?: { id: string; area_type: string; city_name?: string | null; from_city?: string | null; to_city?: string | null; base_fare_cents: number | null; price_per_km_cents: number | null }[];
  documents?: { document_type: string; file_name: string; file_url: string }[];
};

type FlightRequestRow = {
  id: string;
  flight_number: string;
  airline_name: string;
  listingName: string;
  token: string;
  requestedAt: string;
  status: string;
  ownerName?: string;
  ownerEmail?: string;
  aircraft_type?: string;
  routes?: { id: string; from_place: string; to_place: string; fare_cents: number }[];
  documents?: { document_type: string; file_name: string; file_url: string }[];
};

function formatRequestedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

export function Verification() {
  const [category, setCategory] = useState<string>("company");
  const [companyType, setCompanyType] = useState<string>("");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [vehicleType, setVehicleType] = useState<string>("");
  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRequest, setViewRequest] = useState<RequestRow | null>(null);
  const [listingDetail, setListingDetail] = useState<RequestRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [busRequests, setBusRequests] = useState<BusRequestRow[]>([]);
  const [viewBusRequest, setViewBusRequest] = useState<BusRequestRow | null>(null);
  const [busRequestDetail, setBusRequestDetail] = useState<BusRequestRow | null>(null);
  const [carRequests, setCarRequests] = useState<CarRequestRow[]>([]);
  const [viewCarRequest, setViewCarRequest] = useState<CarRequestRow | null>(null);
  const [carRequestDetail, setCarRequestDetail] = useState<CarRequestRow | null>(null);
  const [flightRequests, setFlightRequests] = useState<FlightRequestRow[]>([]);
  const [viewFlightRequest, setViewFlightRequest] = useState<FlightRequestRow | null>(null);
  const [flightRequestDetail, setFlightRequestDetail] = useState<FlightRequestRow | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      if (category === "company") {
        const typeParam = companyType ? `?type=${encodeURIComponent(companyType.toLowerCase())}` : "";
        const data = await adminFetch<{ listings: { id: string; name: string; type: string; verification_token: string | null; verification_status: string | null; updated_at: string }[] }>(
          `/api/verification/pending${typeParam}`
        );
        setRequests(
          (data.listings || []).map((l) => ({
            id: l.id,
            name: l.name,
            type: l.type.charAt(0).toUpperCase() + l.type.slice(1),
            token: l.verification_token || "—",
            requestedAt: formatRequestedAt(l.updated_at),
            status: l.verification_status || "Pending",
          }))
        );
      } else if (category === "vehicles" && (vehicleType === "Buses" || !vehicleType)) {
        setCarRequests([]);
        setFlightRequests([]);
        const data = await adminFetch<{ buses: { id: string; name: string; listing_name: string; registration_number: string | null; bus_number: string | null; verification_token: string | null; verification_status: string | null; updated_at: string }[] }>(
          "/api/verification/pending-buses"
        );
        setBusRequests(
          (data.buses || []).map((b) => ({
            id: b.id,
            name: b.name,
            listingName: b.listing_name || "—",
            registration_number: b.registration_number,
            bus_number: b.bus_number,
            token: b.verification_token || "—",
            requestedAt: formatRequestedAt(b.updated_at),
            status: b.verification_status || "Pending",
          }))
        );
      } else if (category === "vehicles" && vehicleType === "Cars") {
        setBusRequests([]);
        setFlightRequests([]);
        const data = await adminFetch<{ cars: { id: string; name: string; listing_name: string; registration_number: string | null; category: string; verification_token: string | null; verification_status: string | null; updated_at: string }[] }>(
          "/api/verification/pending-cars"
        );
        setCarRequests(
          (data.cars || []).map((c) => ({
            id: c.id,
            name: c.name,
            listingName: c.listing_name || "—",
            registration_number: c.registration_number,
            category: c.category,
            token: c.verification_token || "—",
            requestedAt: formatRequestedAt(c.updated_at),
            status: c.verification_status || "Pending",
          }))
        );
      } else if (category === "vehicles" && vehicleType === "Flights") {
        setBusRequests([]);
        setCarRequests([]);
        try {
          const data = await adminFetch<{ flights: { id: string; flight_number: string; airline_name: string; listing_name: string; verification_token: string | null; verification_status: string | null; updated_at: string }[] }>(
            "/api/verification/pending-flights"
          );
          setFlightRequests(
            (data.flights || []).map((f) => ({
              id: f.id,
              flight_number: f.flight_number || "—",
              airline_name: f.airline_name || "—",
              listingName: f.listing_name || "—",
              token: f.verification_token || "—",
              requestedAt: formatRequestedAt(f.updated_at),
              status: f.verification_status || "Pending",
            }))
          );
        } catch {
          setFlightRequests([]);
        }
      } else if (category === "vehicles") {
        setBusRequests([]);
        setCarRequests([]);
        setFlightRequests([]);
      }
    } catch {
      if (category === "company") setRequests([]);
      if (category === "vehicles") {
        setBusRequests([]);
        if (vehicleType === "Flights") setFlightRequests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [category, companyType, vehicleType]);

  useEffect(() => {
    if (!viewRequest) {
      setListingDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await adminFetch<{
          id: string;
          name: string;
          type: string;
          verification_token: string | null;
          verification_status: string | null;
          updated_at: string;
          address: string | null;
          ownerName: string | null;
          ownerEmail: string | null;
          experienceInfo?: { category: string; city: string; duration_text: string; price_per_person_cents: number; cancellation_policy: string | null };
          documents: { type: string; fileName: string; url?: string }[];
        }>(`/api/verification/listing/${viewRequest.id}`);
        if (!cancelled) {
          setListingDetail({
            ...viewRequest,
            ownerName: detail.ownerName ?? undefined,
            ownerEmail: detail.ownerEmail ?? undefined,
            address: detail.address ?? undefined,
            experienceInfo: detail.experienceInfo,
            documents: detail.documents || [],
            requestedAt: formatRequestedAt(detail.updated_at),
          });
        }
      } catch {
        if (!cancelled) setListingDetail({ ...viewRequest });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewRequest?.id]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/verification/${id}/approve`, { method: "POST" });
      await fetchPending();
      if (viewRequest?.id === id) setViewRequest(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/verification/${id}/reject`, { method: "POST" });
      await fetchPending();
      if (viewRequest?.id === id) setViewRequest(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveBus = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/verification/bus/${id}/approve`, { method: "POST" });
      await fetchPending();
      if (viewBusRequest?.id === id) setViewBusRequest(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBus = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/verification/bus/${id}/reject`, { method: "POST" });
      await fetchPending();
      if (viewBusRequest?.id === id) setViewBusRequest(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveCar = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/verification/car/${id}/approve`, { method: "POST" });
      await fetchPending();
      if (viewCarRequest?.id === id) setViewCarRequest(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectCar = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/verification/car/${id}/reject`, { method: "POST" });
      await fetchPending();
      if (viewCarRequest?.id === id) setViewCarRequest(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveFlight = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/verification/flight/${id}/approve`, { method: "POST" });
      await fetchPending();
      if (viewFlightRequest?.id === id) setViewFlightRequest(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFlight = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch(`/api/verification/flight/${id}/reject`, { method: "POST" });
      await fetchPending();
      if (viewFlightRequest?.id === id) setViewFlightRequest(null);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!viewBusRequest || category !== "vehicles") {
      setBusRequestDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await adminFetch<{
          id: string;
          name: string;
          registrationNumber: string | null;
          busNumber: string | null;
          listingName: string | null;
          ownerName: string | null;
          ownerEmail: string | null;
          updated_at: string;
          drivers?: { id: string; name: string | null; phone: string | null; license_no: string | null }[];
          routes?: { id: string; from_place: string; to_place: string; distance_km: number | null; duration_minutes: number | null; price_per_seat_cents: number | null }[];
          documents?: { document_type: string; file_name: string; file_url: string }[];
        }>(`/api/verification/bus/${viewBusRequest.id}`);
        if (!cancelled) {
          setBusRequestDetail({
            ...viewBusRequest,
            ownerName: detail.ownerName ?? undefined,
            ownerEmail: detail.ownerEmail ?? undefined,
            requestedAt: formatRequestedAt(detail.updated_at),
            drivers: detail.drivers ?? [],
            routes: detail.routes ?? [],
            documents: detail.documents ?? [],
          });
        }
      } catch {
        if (!cancelled) setBusRequestDetail({ ...viewBusRequest });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewBusRequest?.id, category]);

  useEffect(() => {
    if (!viewCarRequest || category !== "vehicles") {
      setCarRequestDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await adminFetch<{
          id: string;
          name: string;
          registrationNumber: string | null;
          category: string;
          listingName: string | null;
          ownerName: string | null;
          ownerEmail: string | null;
          updated_at: string;
          drivers?: { id: string; name: string | null; phone: string | null; license_number: string }[];
          operatingAreas?: { id: string; area_type: string; city_name?: string | null; from_city?: string | null; to_city?: string | null; base_fare_cents: number | null; price_per_km_cents: number | null }[];
          documents?: { document_type: string; file_name: string; file_url: string }[];
        }>(`/api/verification/car/${viewCarRequest.id}`);
        if (!cancelled) {
          setCarRequestDetail({
            ...viewCarRequest,
            ownerName: detail.ownerName ?? undefined,
            ownerEmail: detail.ownerEmail ?? undefined,
            requestedAt: formatRequestedAt(detail.updated_at),
            drivers: detail.drivers ?? [],
            operatingAreas: detail.operatingAreas ?? [],
            documents: detail.documents ?? [],
          });
        }
      } catch {
        if (!cancelled) setCarRequestDetail({ ...viewCarRequest });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewCarRequest?.id, category]);

  useEffect(() => {
    if (!viewFlightRequest || category !== "vehicles") {
      setFlightRequestDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await adminFetch<{
          id: string;
          flight_number: string;
          airline_name: string;
          listingName: string | null;
          ownerName: string | null;
          ownerEmail: string | null;
          aircraft_type?: string;
          updated_at: string;
          routes?: { id: string; from_place: string; to_place: string; fare_cents: number }[];
          documents?: { document_type: string; file_name: string; file_url: string }[];
        }>(`/api/verification/flight/${viewFlightRequest.id}`);
        if (!cancelled) {
          setFlightRequestDetail({
            ...viewFlightRequest,
            ownerName: detail.ownerName ?? undefined,
            ownerEmail: detail.ownerEmail ?? undefined,
            aircraft_type: detail.aircraft_type,
            requestedAt: formatRequestedAt(detail.updated_at),
            routes: detail.routes ?? [],
            documents: detail.documents ?? [],
          });
        }
      } catch {
        if (!cancelled) setFlightRequestDetail({ ...viewFlightRequest });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewFlightRequest?.id, category]);

  const filteredRequests = category === "company" ? requests : [];
  const displayDetail = listingDetail ?? viewRequest;
  const displayBusDetail = busRequestDetail ?? viewBusRequest;
  const displayCarDetail = carRequestDetail ?? viewCarRequest;
  const displayFlightDetail = flightRequestDetail ?? viewFlightRequest;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Verification</h1>
        <p className="text-muted-foreground mt-1">Review verification requests from vendors. Filter by category and type.</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-forest-200 p-5 shadow-card space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">Category</span>
          <div className="flex gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                    category === c.id
                      ? "bg-forest-600 text-white border-forest-600"
                      : "bg-white border-forest-200 text-foreground hover:border-forest-400 hover:bg-forest-50"
                  )}
                >
                  <Icon size={18} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {category === "company" && (
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-forest-200">
            <span className="text-sm text-muted-foreground">Company type</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypeDropdownOpen((o) => !o)}
                className="flex items-center gap-2 min-w-[180px] px-4 py-2.5 rounded-xl border border-forest-200 bg-white text-sm font-medium text-foreground hover:border-forest-400"
              >
                {companyType || "All types"}
                <ChevronDown size={16} className={cn("ml-auto transition-transform", typeDropdownOpen && "rotate-180")} />
              </button>
              {typeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setTypeDropdownOpen(false)} />
                  <ul className="absolute left-0 top-full mt-1 z-20 w-full rounded-xl border border-forest-200 bg-white py-1 shadow-lg max-h-60 overflow-auto">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyType("");
                          setTypeDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm",
                          !companyType ? "bg-forest-100 text-forest-700 font-medium" : "hover:bg-forest-50"
                        )}
                      >
                        All types
                      </button>
                    </li>
                    {COMPANY_TYPES.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => {
                            setCompanyType(t);
                            setTypeDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-sm",
                            companyType === t ? "bg-forest-100 text-forest-700 font-medium" : "hover:bg-forest-50"
                          )}
                        >
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {category === "vehicles" && (
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-forest-200">
            <span className="text-sm text-muted-foreground">Vehicle type</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setVehicleTypeDropdownOpen((o) => !o)}
                className="flex items-center gap-2 min-w-[180px] px-4 py-2.5 rounded-xl border border-forest-200 bg-white text-sm font-medium text-foreground hover:border-forest-400"
              >
                {vehicleType || "All types"}
                <ChevronDown size={16} className={cn("ml-auto transition-transform", vehicleTypeDropdownOpen && "rotate-180")} />
              </button>
              {vehicleTypeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setVehicleTypeDropdownOpen(false)} />
                  <ul className="absolute left-0 top-full mt-1 z-20 w-full rounded-xl border border-forest-200 bg-white py-1 shadow-lg max-h-60 overflow-auto">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleType("");
                          setVehicleTypeDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm",
                          !vehicleType ? "bg-forest-100 text-forest-700 font-medium" : "hover:bg-forest-50"
                        )}
                      >
                        All types
                      </button>
                    </li>
                    {VEHICLE_TYPES.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => {
                            setVehicleType(t);
                            setVehicleTypeDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-sm",
                            vehicleType === t ? "bg-forest-100 text-forest-700 font-medium" : "hover:bg-forest-50"
                          )}
                        >
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Requests list */}
      <div className="bg-card rounded-2xl border border-forest-200 overflow-hidden shadow-card">
        <div className="px-6 py-4 border-b border-forest-200 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {category === "company" ? "Company requests" : category === "vehicles" ? (vehicleType ? `${vehicleType} requests` : "Vehicle requests") : ""}
          </h2>
          {category === "company" && companyType && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-forest-100 text-forest-700">{companyType}</span>
          )}
          {category === "vehicles" && vehicleType && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-forest-100 text-forest-700">{vehicleType}</span>
          )}
        </div>

        {category === "company" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest-200 bg-forest-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Company / Name</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Token</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Requested</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No requests match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="border-b border-forest-200/70 hover:bg-forest-50/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{req.name}</td>
                      <td className="px-6 py-3.5 text-foreground">{req.type}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{req.token}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{req.requestedAt}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          <ShieldCheck size={12} />
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewRequest(req)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 text-xs font-medium hover:bg-forest-100 transition-colors"
                            title="View details & documents"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(req.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-600 text-white text-xs font-medium hover:bg-forest-700 disabled:opacity-60 transition-colors"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 text-xs font-medium hover:bg-forest-100 disabled:opacity-60 transition-colors"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {category === "vehicles" && (vehicleType === "Buses" || !vehicleType) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest-200 bg-forest-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Bus name</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Registration</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Listing</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Requested</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : busRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No bus verification requests.</td>
                  </tr>
                ) : (
                  busRequests.map((req) => (
                    <tr key={req.id} className="border-b border-forest-200/70 hover:bg-forest-50/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{req.name}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{req.registration_number || "—"}</td>
                      <td className="px-6 py-3.5 text-foreground">{req.listingName}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{req.requestedAt}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          <ShieldCheck size={12} />
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setViewBusRequest(req)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 text-xs font-medium hover:bg-forest-100">
                            <Eye size={14} /> View
                          </button>
                          <button type="button" onClick={() => handleApproveBus(req.id)} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-600 text-white text-xs font-medium hover:bg-forest-700 disabled:opacity-60">
                            <Check size={14} /> Approve
                          </button>
                          <button type="button" onClick={() => handleRejectBus(req.id)} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 text-xs font-medium hover:bg-forest-100 disabled:opacity-60">
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {category === "vehicles" && vehicleType === "Cars" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest-200 bg-forest-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Car name</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Registration</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Listing</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Requested</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : carRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No car verification requests.</td>
                  </tr>
                ) : (
                  carRequests.map((req) => (
                    <tr key={req.id} className="border-b border-forest-200/70 hover:bg-forest-50/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{req.name}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{req.registration_number || "—"}</td>
                      <td className="px-6 py-3.5 text-foreground">{req.category === "local" ? "Local" : "Intercity"}</td>
                      <td className="px-6 py-3.5 text-foreground">{req.listingName}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{req.requestedAt}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          <ShieldCheck size={12} />
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setViewCarRequest(req)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 text-xs font-medium hover:bg-forest-100">
                            <Eye size={14} /> View
                          </button>
                          <button type="button" onClick={() => handleApproveCar(req.id)} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-600 text-white text-xs font-medium hover:bg-forest-700 disabled:opacity-60">
                            <Check size={14} /> Approve
                          </button>
                          <button type="button" onClick={() => handleRejectCar(req.id)} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 text-xs font-medium hover:bg-forest-100 disabled:opacity-60">
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {category === "vehicles" && vehicleType === "Flights" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest-200 bg-forest-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Flight number</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Airline</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Listing</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Requested</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading…</td>
                  </tr>
                ) : flightRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No flight verification requests.</td>
                  </tr>
                ) : (
                  flightRequests.map((req) => (
                    <tr key={req.id} className="border-b border-forest-200/70 hover:bg-forest-50/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground font-mono">{req.flight_number}</td>
                      <td className="px-6 py-3.5 text-foreground">{req.airline_name}</td>
                      <td className="px-6 py-3.5 text-foreground">{req.listingName}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{req.requestedAt}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          <ShieldCheck size={12} />
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setViewFlightRequest(req)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 text-xs font-medium hover:bg-forest-100">
                            <Eye size={14} /> View
                          </button>
                          <button type="button" onClick={() => handleApproveFlight(req.id)} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-600 text-white text-xs font-medium hover:bg-forest-700 disabled:opacity-60">
                            <Check size={14} /> Approve
                          </button>
                          <button type="button" onClick={() => handleRejectFlight(req.id)} disabled={!!actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 text-xs font-medium hover:bg-forest-100 disabled:opacity-60">
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View details & documents modal (company) */}
      {viewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={() => setViewRequest(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto bg-card rounded-2xl border border-forest-200 shadow-xl">
            <div className="sticky top-0 bg-card border-b border-forest-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Request details</h3>
              <button
                type="button"
                onClick={() => setViewRequest(null)}
                className="p-2 rounded-lg hover:bg-forest-100 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 size={18} className="text-forest-600" />
                  Company & owner
                </h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Company name</dt>
                    <dd className="font-medium text-foreground mt-0.5">{viewRequest.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium text-foreground mt-0.5">{viewRequest.type}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Verification token</dt>
                    <dd className="font-mono text-foreground mt-0.5">{viewRequest.token}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Requested</dt>
                    <dd className="text-foreground mt-0.5">{viewRequest.requestedAt}</dd>
                  </div>
                  {displayDetail?.ownerName != null && (
                    <div className="sm:col-span-2 flex items-start gap-2">
                      <User size={18} className="text-forest-600 shrink-0 mt-0.5" />
                      <div>
                        <dt className="text-muted-foreground">Owner</dt>
                        <dd className="font-medium text-foreground mt-0.5">{displayDetail.ownerName}</dd>
                        {displayDetail.ownerEmail && (
                          <dd className="text-muted-foreground text-xs mt-0.5">{displayDetail.ownerEmail}</dd>
                        )}
                      </div>
                    </div>
                  )}
                  {displayDetail?.address != null && displayDetail.address !== "" && (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Address</dt>
                      <dd className="text-foreground mt-0.5">{displayDetail.address}</dd>
                    </div>
                  )}
                  {!listingDetail && viewRequest && (
                    <div className="sm:col-span-2 text-muted-foreground text-xs py-2">Loading details…</div>
                  )}
                </dl>
              </section>

              {displayDetail?.type?.toLowerCase() === "experience" && displayDetail?.experienceInfo && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MapPin size={18} className="text-forest-600" />
                    Experience details
                  </h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="font-medium text-foreground mt-0.5 capitalize">{displayDetail.experienceInfo.category}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">City</dt>
                      <dd className="text-foreground mt-0.5">{displayDetail.experienceInfo.city}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="text-foreground mt-0.5">{displayDetail.experienceInfo.duration_text}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Price per person</dt>
                      <dd className="text-foreground mt-0.5">₹{(displayDetail.experienceInfo.price_per_person_cents / 100).toLocaleString()}</dd>
                    </div>
                    {displayDetail.experienceInfo.cancellation_policy && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Cancellation policy</dt>
                        <dd className="text-foreground mt-0.5">{displayDetail.experienceInfo.cancellation_policy}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              <section>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-forest-600" />
                  Documents submitted
                </h4>
                {listingDetail?.documents == null ? (
                  <p className="text-sm text-muted-foreground py-4">Loading documents…</p>
                ) : displayDetail?.documents && displayDetail.documents.length > 0 ? (
                  <ul className="space-y-2">
                    {displayDetail.documents.map((doc, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-4 py-2.5 px-4 rounded-xl bg-forest-50 border border-forest-200"
                      >
                        <span className="text-sm font-medium text-foreground shrink-0">{doc.type}</span>
                        <span className="text-xs text-muted-foreground font-mono truncate min-w-0">{doc.fileName}</span>
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-forest-600 hover:underline shrink-0"
                          >
                            Open
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">No documents submitted.</p>
                )}
              </section>
            </div>
            <div className="sticky bottom-0 border-t border-forest-200 px-6 py-4 bg-card flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewRequest(null)}
                className="px-4 py-2 rounded-lg border border-forest-300 text-forest-700 text-sm font-medium hover:bg-forest-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => viewRequest && handleApprove(viewRequest.id)}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 disabled:opacity-60"
              >
                <Check size={16} />
                Approve
              </button>
              <button
                type="button"
                onClick={() => viewRequest && handleReject(viewRequest.id)}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-forest-300 text-forest-700 text-sm font-medium hover:bg-forest-100 disabled:opacity-60"
              >
                <X size={16} />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View bus details modal */}
      {viewBusRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={() => setViewBusRequest(null)} />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-auto bg-card rounded-2xl border border-forest-200 shadow-xl">
            <div className="sticky top-0 bg-card border-b border-forest-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Bus verification</h3>
              <button type="button" onClick={() => setViewBusRequest(null)} className="p-2 rounded-lg hover:bg-forest-100 text-muted-foreground hover:text-foreground" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Bus size={18} className="text-forest-600" /> Bus & listing</h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Bus name</dt>
                    <dd className="font-medium text-foreground mt-0.5">{viewBusRequest.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registration</dt>
                    <dd className="font-mono text-foreground mt-0.5">{viewBusRequest.registration_number || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Bus number</dt>
                    <dd className="text-foreground mt-0.5">{viewBusRequest.bus_number || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Listing</dt>
                    <dd className="text-foreground mt-0.5">{viewBusRequest.listingName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Token</dt>
                    <dd className="font-mono text-foreground mt-0.5">{viewBusRequest.token}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Requested</dt>
                    <dd className="text-foreground mt-0.5">{displayBusDetail?.requestedAt ?? viewBusRequest.requestedAt}</dd>
                  </div>
                  {displayBusDetail?.ownerName != null && (
                    <div className="sm:col-span-2 flex items-start gap-2">
                      <User size={18} className="text-forest-600 shrink-0 mt-0.5" />
                      <div>
                        <dt className="text-muted-foreground">Vendor</dt>
                        <dd className="font-medium text-foreground mt-0.5">{displayBusDetail.ownerName}</dd>
                        {displayBusDetail.ownerEmail && <dd className="text-muted-foreground text-xs mt-0.5">{displayBusDetail.ownerEmail}</dd>}
                      </div>
                    </div>
                  )}
                </dl>
              </section>

              {(displayBusDetail?.drivers?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><User size={18} className="text-forest-600" /> Drivers</h4>
                  <ul className="space-y-2 text-sm">
                    {displayBusDetail!.drivers!.map((d) => (
                      <li key={d.id} className="rounded-lg border border-forest-200 p-3 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="font-medium text-foreground">{d.name ?? "—"}</span>
                        {d.phone && <span className="text-muted-foreground">Phone: {d.phone}</span>}
                        {d.license_no && <span className="text-muted-foreground">License: {d.license_no}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(displayBusDetail?.routes?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText size={18} className="text-forest-600" /> Routes & pricing</h4>
                  <div className="overflow-x-auto rounded-lg border border-forest-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-forest-200">
                          <th className="text-left p-2 font-medium text-foreground">From</th>
                          <th className="text-left p-2 font-medium text-foreground">To</th>
                          <th className="text-right p-2 text-muted-foreground">Distance</th>
                          <th className="text-right p-2 text-muted-foreground">Duration</th>
                          <th className="text-right p-2 font-medium text-foreground">Price/seat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayBusDetail!.routes!.map((r) => (
                          <tr key={r.id} className="border-b border-forest-100 last:border-0">
                            <td className="p-2 text-foreground">{r.from_place}</td>
                            <td className="p-2 text-foreground">{r.to_place}</td>
                            <td className="p-2 text-right text-muted-foreground">{r.distance_km != null ? `${r.distance_km} km` : "—"}</td>
                            <td className="p-2 text-right text-muted-foreground">{r.duration_minutes != null ? `${r.duration_minutes} min` : "—"}</td>
                            <td className="p-2 text-right font-medium text-foreground">{r.price_per_seat_cents != null ? `₹${(r.price_per_seat_cents / 100).toFixed(2)}` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {(displayBusDetail?.documents?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText size={18} className="text-forest-600" /> Documents</h4>
                  <ul className="space-y-2 text-sm">
                    {displayBusDetail!.documents!.map((doc, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-lg border border-forest-200 p-3">
                        <span className="text-muted-foreground">{doc.document_type}</span>
                        <span className="text-foreground truncate flex-1">{doc.file_name}</span>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2 py-1 rounded bg-forest-100 text-forest-700 text-xs font-medium hover:bg-forest-200">Open</a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <div className="sticky bottom-0 border-t border-forest-200 px-6 py-4 bg-card flex justify-end gap-2">
              <button type="button" onClick={() => setViewBusRequest(null)} className="px-4 py-2 rounded-lg border border-forest-300 text-forest-700 text-sm font-medium hover:bg-forest-100">Close</button>
              <button type="button" onClick={() => viewBusRequest && handleApproveBus(viewBusRequest.id)} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 disabled:opacity-60">
                <Check size={16} /> Approve
              </button>
              <button type="button" onClick={() => viewBusRequest && handleRejectBus(viewBusRequest.id)} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-forest-300 text-forest-700 text-sm font-medium hover:bg-forest-100 disabled:opacity-60">
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View car details modal */}
      {viewCarRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={() => setViewCarRequest(null)} />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-auto bg-card rounded-2xl border border-forest-200 shadow-xl">
            <div className="sticky top-0 bg-card border-b border-forest-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Car verification</h3>
              <button type="button" onClick={() => setViewCarRequest(null)} className="p-2 rounded-lg hover:bg-forest-100 text-muted-foreground hover:text-foreground" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Car size={18} className="text-forest-600" /> Car & listing</h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Car name</dt>
                    <dd className="font-medium text-foreground mt-0.5">{viewCarRequest.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registration</dt>
                    <dd className="font-mono text-foreground mt-0.5">{viewCarRequest.registration_number || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="text-foreground mt-0.5">{viewCarRequest.category === "local" ? "Local" : "Intercity"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Listing</dt>
                    <dd className="text-foreground mt-0.5">{viewCarRequest.listingName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Token</dt>
                    <dd className="font-mono text-foreground mt-0.5">{viewCarRequest.token}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Requested</dt>
                    <dd className="text-foreground mt-0.5">{displayCarDetail?.requestedAt ?? viewCarRequest.requestedAt}</dd>
                  </div>
                  {displayCarDetail?.ownerName != null && (
                    <div className="sm:col-span-2 flex items-start gap-2">
                      <User size={18} className="text-forest-600 shrink-0 mt-0.5" />
                      <div>
                        <dt className="text-muted-foreground">Vendor</dt>
                        <dd className="font-medium text-foreground mt-0.5">{displayCarDetail.ownerName}</dd>
                        {displayCarDetail.ownerEmail && <dd className="text-muted-foreground text-xs mt-0.5">{displayCarDetail.ownerEmail}</dd>}
                      </div>
                    </div>
                  )}
                </dl>
              </section>

              {(displayCarDetail?.drivers?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><User size={18} className="text-forest-600" /> Drivers</h4>
                  <ul className="space-y-2 text-sm">
                    {displayCarDetail!.drivers!.map((d) => (
                      <li key={d.id} className="rounded-lg border border-forest-200 p-3 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="font-medium text-foreground">{d.name ?? "—"}</span>
                        {d.phone && <span className="text-muted-foreground">Phone: {d.phone}</span>}
                        {d.license_number && <span className="text-muted-foreground">License: {d.license_number}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(displayCarDetail?.operatingAreas?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin size={18} className="text-forest-600" /> Operating cities & pricing</h4>
                  <ul className="space-y-2 text-sm">
                    {displayCarDetail!.operatingAreas!.map((a) => (
                      <li key={a.id} className="rounded-lg border border-forest-200 p-3">
                        {a.area_type === "local" ? (
                          <span>Local: {a.city_name ?? "—"} · Base ₹{((a.base_fare_cents ?? 0) / 100).toFixed(0)} · ₹{(a.price_per_km_cents ?? 0) / 100}/km</span>
                        ) : (
                          <span>{a.from_city} → {a.to_city} · Base ₹{((a.base_fare_cents ?? 0) / 100).toFixed(0)} · ₹{(a.price_per_km_cents ?? 0) / 100}/km</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(displayCarDetail?.documents?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText size={18} className="text-forest-600" /> Documents</h4>
                  <ul className="space-y-2 text-sm">
                    {displayCarDetail!.documents!.map((doc, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-lg border border-forest-200 p-3">
                        <span className="text-muted-foreground">{doc.document_type}</span>
                        <span className="text-foreground truncate flex-1">{doc.file_name}</span>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2 py-1 rounded bg-forest-100 text-forest-700 text-xs font-medium hover:bg-forest-200">Open</a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <div className="sticky bottom-0 border-t border-forest-200 px-6 py-4 bg-card flex justify-end gap-2">
              <button type="button" onClick={() => setViewCarRequest(null)} className="px-4 py-2 rounded-lg border border-forest-300 text-forest-700 text-sm font-medium hover:bg-forest-100">Close</button>
              <button type="button" onClick={() => viewCarRequest && handleApproveCar(viewCarRequest.id)} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 disabled:opacity-60">
                <Check size={16} /> Approve
              </button>
              <button type="button" onClick={() => viewCarRequest && handleRejectCar(viewCarRequest.id)} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-forest-300 text-forest-700 text-sm font-medium hover:bg-forest-100 disabled:opacity-60">
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View flight details modal */}
      {viewFlightRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={() => setViewFlightRequest(null)} />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-auto bg-card rounded-2xl border border-forest-200 shadow-xl">
            <div className="sticky top-0 bg-card border-b border-forest-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Flight verification</h3>
              <button type="button" onClick={() => setViewFlightRequest(null)} className="p-2 rounded-lg hover:bg-forest-100 text-muted-foreground hover:text-foreground" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Plane size={18} className="text-forest-600" /> Flight & listing</h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Flight number</dt>
                    <dd className="font-medium font-mono text-foreground mt-0.5">{viewFlightRequest.flight_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Airline</dt>
                    <dd className="font-medium text-foreground mt-0.5">{viewFlightRequest.airline_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Listing</dt>
                    <dd className="text-foreground mt-0.5">{viewFlightRequest.listingName}</dd>
                  </div>
                  {displayFlightDetail?.aircraft_type && (
                    <div>
                      <dt className="text-muted-foreground">Aircraft type</dt>
                      <dd className="text-foreground mt-0.5">{displayFlightDetail.aircraft_type}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Token</dt>
                    <dd className="font-mono text-foreground mt-0.5">{viewFlightRequest.token}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Requested</dt>
                    <dd className="text-foreground mt-0.5">{displayFlightDetail?.requestedAt ?? viewFlightRequest.requestedAt}</dd>
                  </div>
                  {displayFlightDetail?.ownerName != null && (
                    <div className="sm:col-span-2 flex items-start gap-2">
                      <User size={18} className="text-forest-600 shrink-0 mt-0.5" />
                      <div>
                        <dt className="text-muted-foreground">Vendor</dt>
                        <dd className="font-medium text-foreground mt-0.5">{displayFlightDetail.ownerName}</dd>
                        {displayFlightDetail.ownerEmail && <dd className="text-muted-foreground text-xs mt-0.5">{displayFlightDetail.ownerEmail}</dd>}
                      </div>
                    </div>
                  )}
                </dl>
              </section>

              {(displayFlightDetail?.routes?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin size={18} className="text-forest-600" /> Routes & pricing</h4>
                  <ul className="space-y-2 text-sm">
                    {displayFlightDetail!.routes!.map((r) => (
                      <li key={r.id} className="rounded-lg border border-forest-200 p-3">
                        <span className="text-foreground">{r.from_place} → {r.to_place}</span>
                        <span className="text-muted-foreground ml-2">₹{(r.fare_cents / 100).toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(displayFlightDetail?.documents?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText size={18} className="text-forest-600" /> Documents</h4>
                  <ul className="space-y-2 text-sm">
                    {displayFlightDetail!.documents!.map((doc, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-lg border border-forest-200 p-3">
                        <span className="text-muted-foreground">{doc.document_type}</span>
                        <span className="text-foreground truncate flex-1">{doc.file_name}</span>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2 py-1 rounded bg-forest-100 text-forest-700 text-xs font-medium hover:bg-forest-200">Open</a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {displayFlightDetail?.documents?.length === 0 && !viewFlightRequest.documents?.length && (
                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText size={18} className="text-forest-600" /> Documents</h4>
                  <p className="text-sm text-muted-foreground py-2">No documents submitted.</p>
                </section>
              )}
            </div>
            <div className="sticky bottom-0 border-t border-forest-200 px-6 py-4 bg-card flex justify-end gap-2">
              <button type="button" onClick={() => setViewFlightRequest(null)} className="px-4 py-2 rounded-lg border border-forest-300 text-forest-700 text-sm font-medium hover:bg-forest-100">Close</button>
              <button type="button" onClick={() => viewFlightRequest && handleApproveFlight(viewFlightRequest.id)} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 disabled:opacity-60">
                <Check size={16} /> Approve
              </button>
              <button type="button" onClick={() => viewFlightRequest && handleRejectFlight(viewFlightRequest.id)} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-forest-300 text-forest-700 text-sm font-medium hover:bg-forest-100 disabled:opacity-60">
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

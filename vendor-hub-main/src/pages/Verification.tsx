import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, XCircle, Send, AlertCircle, Building2, Bus, Car, Plane, Train, Bed } from "lucide-react";
import { cn } from "@/lib/utils";
import { vendorFetch } from "@/lib/api";

const VERIFICATION_CATEGORIES = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "vehicles", label: "Vehicles", icon: Bus },
  { id: "hotel_branch", label: "Hotel Branch", icon: Bed },
] as const;

const VEHICLE_TYPES = [
  { id: "buses", label: "Buses", icon: Bus },
  { id: "car", label: "Car", icon: Car },
  { id: "flight", label: "Flight", icon: Plane },
  { id: "train", label: "Train", icon: Train },
] as const;

const COMPANY_TYPES = [
  "transport",
  "hotel",
  "experience",
  "event",
] as const;

const DOCUMENT_TYPES = [
  { label: "Business License", type: "business_license" },
  { label: "Owner ID", type: "owner_id" },
  { label: "Tax Document", type: "tax_document" },
  { label: "Health & Safety Certificate", type: "health_safety" },
] as const;

const EVENT_DOCUMENT_TYPES = [
  { label: "Government Permission / NOC", type: "government_permission_noc" },
  { label: "Business Registration Certificate", type: "business_registration_certificate" },
  { label: "Venue Authorization Proof", type: "venue_authorization_proof" },
  { label: "Insurance / Liability Document", type: "insurance_liability" },
  { label: "Event Permit", type: "event_permit" },
  { label: "Fire Safety Certificate", type: "fire_safety_certificate" },
  { label: "Other document", type: "other" },
] as const;

const EXPERIENCE_DOCUMENT_TYPES = [
  { label: "Government ID", type: "government_id" },
  { label: "Business / Activity Proof", type: "business_activity_proof" },
  { label: "Location Authorization", type: "location_authorization" },
  { label: "Digital Declaration", type: "digital_declaration" },
] as const;

const HOTEL_DOCUMENT_TYPES = [
  { label: "Business Registration Certificate", type: "business_registration_certificate" },
  { label: "Government Trade License", type: "government_trade_license" },
  { label: "Tax Registration Proof", type: "tax_registration_proof" },
  { label: "Bank Account Proof", type: "bank_account_proof" },
  { label: "Authorized Person ID", type: "authorized_person_id" },
] as const;

const HOTEL_BRANCH_DOCUMENT_TYPES = [
  { label: "Local Trade License for this property", type: "local_trade_license" },
  { label: "Property Ownership / Rental Agreement", type: "property_ownership" },
  { label: "Fire Safety Certificate", type: "fire_safety" },
  { label: "Hotel Operating License", type: "hotel_operating_license" },
] as const;

const BUS_DOCUMENT_TYPES = [
  { label: "Insurance", type: "insurance" },
  { label: "Other document", type: "other" },
] as const;

const CAR_DOCUMENT_TYPES = [
  { label: "Insurance", type: "insurance" },
  { label: "RC (Registration Certificate)", type: "rc" },
  { label: "Driver license", type: "driver_license" },
] as const;

const FLIGHT_DOCUMENT_TYPES = [
  { label: "AOC (Air Operator Certificate)", type: "aoc" },
  { label: "Aircraft Insurance", type: "insurance" },
  { label: "Aircraft Registration", type: "aircraft_registration" },
  { label: "Airworthiness Certificate", type: "airworthiness" },
  { label: "Other document", type: "other" },
] as const;

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string }> = {
  Uploaded: { icon: CheckCircle, color: "text-success" },
  "Not Uploaded": { icon: XCircle, color: "text-muted-foreground" },
  Pending: { icon: CheckCircle, color: "text-warning" },
  Rejected: { icon: XCircle, color: "text-destructive" },
  Approved: { icon: CheckCircle, color: "text-success" },
};

type ResolvedListing = {
  listing_id: string;
  name: string;
  type: string;
  verification_status: string;
};

type Doc = {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

function typeLabel(t: string) {
  if (t === "hotel_branch") return "Hotel Branch";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ResolvedBus = {
  bus_id: string;
  name: string;
  registration_number: string | null;
  listing_id: string;
  listing_name: string;
  verification_status: string;
};

type ResolvedCar = {
  car_id: string;
  name: string;
  registration_number: string | null;
  listing_id: string;
  listing_name: string;
  verification_status: string;
};

type ResolvedFlight = {
  flight_id: string;
  flight_number: string;
  airline_name: string;
  listing_id: string;
  listing_name: string;
  verification_status: string;
};

type ResolvedHotelBranch = {
  hotel_branch_id: string;
  listing_id: string;
  name: string;
  verification_status: string;
};

export default function Verification() {
  const [category, setCategory] = useState<"company" | "vehicles" | "hotel_branch">("company");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [hotelBranchTokenInput, setHotelBranchTokenInput] = useState("");
  const [resolvedListing, setResolvedListing] = useState<ResolvedListing | null>(null);
  const [resolvedHotelBranch, setResolvedHotelBranch] = useState<ResolvedHotelBranch | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [validating, setValidating] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [selectedVehicleType, setSelectedVehicleType] = useState<string | null>(null);
  const [busTokenInput, setBusTokenInput] = useState("");
  const [resolvedBus, setResolvedBus] = useState<ResolvedBus | null>(null);
  const [busValidating, setBusValidating] = useState(false);
  const [busSending, setBusSending] = useState(false);
  const [busDocuments, setBusDocuments] = useState<Doc[]>([]);
  const [busUploadingType, setBusUploadingType] = useState<string | null>(null);
  const busFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [carTokenInput, setCarTokenInput] = useState("");
  const [resolvedCar, setResolvedCar] = useState<ResolvedCar | null>(null);
  const [carValidating, setCarValidating] = useState(false);
  const [carSending, setCarSending] = useState(false);
  const [carDocuments, setCarDocuments] = useState<Doc[]>([]);
  const [carUploadingType, setCarUploadingType] = useState<string | null>(null);
  const carFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [flightTokenInput, setFlightTokenInput] = useState("");
  const [resolvedFlight, setResolvedFlight] = useState<ResolvedFlight | null>(null);
  const [flightValidating, setFlightValidating] = useState(false);
  const [flightSending, setFlightSending] = useState(false);
  const [flightDocuments, setFlightDocuments] = useState<Doc[]>([]);
  const [flightUploadingType, setFlightUploadingType] = useState<string | null>(null);
  const flightFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const listingId = (category === "hotel_branch" ? resolvedHotelBranch?.listing_id : resolvedListing?.listing_id) ?? null;
  const hotelBranchId = resolvedHotelBranch?.hotel_branch_id ?? null;
  const verificationStatus = (category === "hotel_branch" ? resolvedHotelBranch?.verification_status : resolvedListing?.verification_status) ?? "no_request";
  const resolvedForCompany = category === "hotel_branch" ? !!resolvedHotelBranch : !!resolvedListing;
  const resolvedName = (category === "hotel_branch" ? resolvedHotelBranch?.name : resolvedListing?.name) ?? "";
  const canSendRequest = resolvedForCompany && (verificationStatus === "no_request" || verificationStatus === "rejected") && (category === "hotel_branch" ? !!hotelBranchId : !!resolvedListing?.listing_id);
  const companyDocTypes =
    category === "hotel_branch"
      ? HOTEL_BRANCH_DOCUMENT_TYPES
      : selectedType === "experience"
        ? EXPERIENCE_DOCUMENT_TYPES
        : selectedType === "event"
          ? EVENT_DOCUMENT_TYPES
          : selectedType === "hotel"
            ? HOTEL_DOCUMENT_TYPES
            : DOCUMENT_TYPES;
  const uploadedCount = documents.length;
  const progress = companyDocTypes.length ? (uploadedCount / companyDocTypes.length) * 100 : 0;

  useEffect(() => {
    if (category === "hotel_branch" && hotelBranchId && listingId) {
      let cancelled = false;
      (async () => {
        try {
          const data = await vendorFetch<{ documents: Doc[] }>(
            `/api/verification/hotel-branch-documents/${hotelBranchId}?listing_id=${encodeURIComponent(listingId)}`
          );
          if (!cancelled) setDocuments(data.documents || []);
        } catch {
          if (!cancelled) setDocuments([]);
        }
      })();
      return () => { cancelled = true; };
    }
    if (category === "company" && listingId) {
      let cancelled = false;
      (async () => {
        try {
          const data = await vendorFetch<{ documents: Doc[] }>(`/api/verification/documents/${listingId}`);
          if (!cancelled) setDocuments(data.documents || []);
        } catch {
          if (!cancelled) setDocuments([]);
        }
      })();
      return () => { cancelled = true; };
    }
    setDocuments([]);
  }, [category, hotelBranchId, listingId]);

  useEffect(() => {
    if (!resolvedBus?.bus_id || !resolvedBus?.listing_id) {
      setBusDocuments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await vendorFetch<{ documents: Doc[] }>(
          `/api/verification/bus-documents/${resolvedBus.bus_id}?listing_id=${encodeURIComponent(resolvedBus.listing_id)}`
        );
        if (!cancelled) setBusDocuments(data.documents || []);
      } catch {
        if (!cancelled) setBusDocuments([]);
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedBus?.bus_id, resolvedBus?.listing_id]);

  useEffect(() => {
    if (!resolvedCar?.car_id || !resolvedCar?.listing_id) {
      setCarDocuments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await vendorFetch<{ documents: Doc[] }>(
          `/api/verification/car-documents/${resolvedCar.car_id}?listing_id=${encodeURIComponent(resolvedCar.listing_id)}`
        );
        if (!cancelled) setCarDocuments(data.documents || []);
      } catch {
        if (!cancelled) setCarDocuments([]);
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedCar?.car_id, resolvedCar?.listing_id]);

  useEffect(() => {
    if (!resolvedFlight?.flight_id || !resolvedFlight?.listing_id) {
      setFlightDocuments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await vendorFetch<{ documents: Doc[] }>(
          `/api/verification/flight-documents/${resolvedFlight.flight_id}?listing_id=${encodeURIComponent(resolvedFlight.listing_id)}`
        );
        if (!cancelled) setFlightDocuments(data.documents || []);
      } catch {
        if (!cancelled) setFlightDocuments([]);
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedFlight?.flight_id, resolvedFlight?.listing_id]);

  const getBusDocByType = (type: string) => busDocuments.find((d) => d.document_type === type);
  const getCarDocByType = (type: string) => carDocuments.find((d) => d.document_type === type);
  const getFlightDocByType = (type: string) => flightDocuments.find((d) => d.document_type === type);

  const handleBusFileChange = async (documentType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resolvedBus) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setMessage({ type: "error", text: "Please upload an image (JPEG, PNG, etc.) or PDF (max 10MB)." });
      return;
    }
    setMessage(null);
    setBusUploadingType(documentType);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const payload = isImage ? { image: dataUrl } : { file: dataUrl };
        const { url } = await vendorFetch<{ url: string }>("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await vendorFetch("/api/verification/bus-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bus_id: resolvedBus.bus_id,
            listing_id: resolvedBus.listing_id,
            document_type: documentType,
            file_name: file.name,
            file_url: url,
          }),
        });
        const data = await vendorFetch<{ documents: Doc[] }>(
          `/api/verification/bus-documents/${resolvedBus.bus_id}?listing_id=${encodeURIComponent(resolvedBus.listing_id)}`
        );
        setBusDocuments(data.documents || []);
        setMessage({ type: "success", text: "Document uploaded." });
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      } finally {
        setBusUploadingType(null);
      }
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Failed to read file." });
      setBusUploadingType(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleValidateToken = async () => {
    const token = tokenInput.trim();
    if (!token || !selectedType) {
      setMessage({ type: "error", text: "Select a company type and paste your verification token." });
      return;
    }
    setValidating(true);
    setMessage(null);
    setResolvedListing(null);
    try {
      const data = await vendorFetch<ResolvedListing>(`/api/verification/resolve-token?token=${encodeURIComponent(token)}`);
      if (data.type !== selectedType) {
        setMessage({ type: "error", text: `This token is for a ${typeLabel(data.type)} listing, not ${typeLabel(selectedType)}. Select "${typeLabel(data.type)}" above or paste the token for your ${typeLabel(selectedType)} listing.` });
        return;
      }
      setResolvedListing(data);
      setMessage({ type: "success", text: `Token valid for "${data.name}". Upload documents and send request below.` });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setValidating(false);
    }
  };

  const handleValidateHotelBranchToken = async () => {
    const token = hotelBranchTokenInput.trim();
    if (!token) {
      setMessage({ type: "error", text: "Paste your hotel branch verification token." });
      return;
    }
    setValidating(true);
    setMessage(null);
    setResolvedHotelBranch(null);
    try {
      const data = await vendorFetch<ResolvedHotelBranch>(`/api/verification/resolve-hotel-branch-token?token=${encodeURIComponent(token)}`);
      setResolvedHotelBranch(data);
      setMessage({ type: "success", text: `Token valid for hotel branch "${data.name}". Upload documents and send request below.` });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setValidating(false);
    }
  };

  const getDocByType = (type: string) => documents.find((d) => d.document_type === type);

  const handleFileChange = async (documentType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (category === "hotel_branch") {
      if (!resolvedHotelBranch) return;
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        setMessage({ type: "error", text: "Please upload an image (JPEG, PNG, etc.) or PDF (max 10MB)." });
        return;
      }
      setMessage(null);
      setUploadingType(documentType);
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const payload = isImage ? { image: dataUrl } : { file: dataUrl };
          const { url } = await vendorFetch<{ url: string }>("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          await vendorFetch("/api/verification/hotel-branch-documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hotel_branch_id: resolvedHotelBranch.hotel_branch_id,
              listing_id: resolvedHotelBranch.listing_id,
              document_type: documentType,
              file_name: file.name,
              file_url: url,
            }),
          });
          const data = await vendorFetch<{ documents: Doc[] }>(
            `/api/verification/hotel-branch-documents/${resolvedHotelBranch.hotel_branch_id}?listing_id=${encodeURIComponent(resolvedHotelBranch.listing_id)}`
          );
          setDocuments(data.documents || []);
          setMessage({ type: "success", text: "Document uploaded." });
        } catch (err) {
          setMessage({ type: "error", text: (err as Error).message });
        } finally {
          setUploadingType(null);
        }
      };
      reader.onerror = () => {
        setMessage({ type: "error", text: "Failed to read file." });
        setUploadingType(null);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
      return;
    }
    if (!listingId) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setMessage({ type: "error", text: "Please upload an image (JPEG, PNG, etc.) or PDF (max 10MB)." });
      return;
    }
    setMessage(null);
    setUploadingType(documentType);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const payload = isImage ? { image: dataUrl } : { file: dataUrl };
        const { url } = await vendorFetch<{ url: string }>("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await vendorFetch("/api/verification/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing_id: listingId,
            document_type: documentType,
            file_name: file.name,
            file_url: url,
          }),
        });
        const data = await vendorFetch<{ documents: Doc[] }>(`/api/verification/documents/${listingId}`);
        setDocuments(data.documents || []);
        setMessage({ type: "success", text: "Document uploaded." });
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      } finally {
        setUploadingType(null);
      }
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Failed to read file." });
      setUploadingType(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendRequest = async () => {
    if (!canSendRequest) return;
    setSending(true);
    setMessage(null);
    try {
      if (category === "hotel_branch" && resolvedHotelBranch) {
        const data = await vendorFetch<{ message: string; verification_status: string }>("/api/verification/send-hotel-branch-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotel_branch_id: resolvedHotelBranch.hotel_branch_id,
            listing_id: resolvedHotelBranch.listing_id,
          }),
        });
        setResolvedHotelBranch((prev) => (prev ? { ...prev, verification_status: "pending" } : null));
        setMessage({ type: "success", text: data?.message ?? "Verification request sent. Admin will review and respond." });
      } else {
        if (category === "company" && !tokenInput.trim()) return;
        const data = await vendorFetch<{ message: string; verification_status: string }>("/api/verification/send-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenInput.trim() }),
        });
        setResolvedListing((prev) => (prev ? { ...prev, verification_status: "pending" } : null));
        setMessage({ type: "success", text: data?.message ?? "Verification request sent. Admin will review and respond." });
      }
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const handleValidateBusToken = async () => {
    const token = busTokenInput.trim();
    if (!token) {
      setMessage({ type: "error", text: "Paste your bus verification token." });
      return;
    }
    setBusValidating(true);
    setMessage(null);
    setResolvedBus(null);
    try {
      const data = await vendorFetch<ResolvedBus>(`/api/verification/resolve-bus-token?token=${encodeURIComponent(token)}`);
      setResolvedBus(data);
      setMessage({ type: "success", text: `Token valid for bus "${data.name}". You can send the verification request below.` });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setBusValidating(false);
    }
  };

  const handleSendBusRequest = async () => {
    if (!resolvedBus || (resolvedBus.verification_status !== "no_request" && resolvedBus.verification_status !== "rejected")) return;
    setBusSending(true);
    setMessage(null);
    try {
      const data = await vendorFetch<{ message: string; verification_status: string }>("/api/verification/send-bus-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bus_id: resolvedBus.bus_id, listing_id: resolvedBus.listing_id }),
      });
      setResolvedBus((prev) => (prev ? { ...prev, verification_status: "pending" } : null));
      setMessage({ type: "success", text: data?.message ?? "Verification request sent. Admin will review and respond." });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setBusSending(false);
    }
  };

  const handleValidateCarToken = async () => {
    const token = carTokenInput.trim();
    if (!token) {
      setMessage({ type: "error", text: "Paste your car verification token." });
      return;
    }
    setCarValidating(true);
    setMessage(null);
    setResolvedCar(null);
    try {
      const data = await vendorFetch<ResolvedCar>(`/api/verification/resolve-car-token?token=${encodeURIComponent(token)}`);
      setResolvedCar(data);
      setMessage({ type: "success", text: `Token valid for car "${data.name}". Upload documents and send request below.` });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setCarValidating(false);
    }
  };

  const handleCarFileChange = async (documentType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resolvedCar) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setMessage({ type: "error", text: "Please upload an image (JPEG, PNG, etc.) or PDF (max 10MB)." });
      return;
    }
    setMessage(null);
    setCarUploadingType(documentType);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const payload = isImage ? { image: dataUrl } : { file: dataUrl };
        const { url } = await vendorFetch<{ url: string }>("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await vendorFetch("/api/verification/car-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            car_id: resolvedCar.car_id,
            listing_id: resolvedCar.listing_id,
            document_type: documentType,
            file_name: file.name,
            file_url: url,
          }),
        });
        const data = await vendorFetch<{ documents: Doc[] }>(
          `/api/verification/car-documents/${resolvedCar.car_id}?listing_id=${encodeURIComponent(resolvedCar.listing_id)}`
        );
        setCarDocuments(data.documents || []);
        setMessage({ type: "success", text: "Document uploaded." });
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      } finally {
        setCarUploadingType(null);
      }
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Failed to read file." });
      setCarUploadingType(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendCarRequest = async () => {
    if (!resolvedCar || (resolvedCar.verification_status !== "no_request" && resolvedCar.verification_status !== "rejected")) return;
    setCarSending(true);
    setMessage(null);
    try {
      const data = await vendorFetch<{ message: string; verification_status: string }>("/api/verification/send-car-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ car_id: resolvedCar.car_id, listing_id: resolvedCar.listing_id }),
      });
      setResolvedCar((prev) => (prev ? { ...prev, verification_status: "pending" } : null));
      setMessage({ type: "success", text: data?.message ?? "Verification request sent. Admin will review and respond." });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setCarSending(false);
    }
  };

  const handleValidateFlightToken = async () => {
    const token = flightTokenInput.trim();
    if (!token) {
      setMessage({ type: "error", text: "Paste your flight verification token." });
      return;
    }
    setFlightValidating(true);
    setMessage(null);
    setResolvedFlight(null);
    try {
      const data = await vendorFetch<ResolvedFlight>(`/api/verification/resolve-flight-token?token=${encodeURIComponent(token)}`);
      setResolvedFlight(data);
      setMessage({ type: "success", text: `Token valid for flight "${data.flight_number}". Upload required documents and send request below.` });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Invalid token or flight not found." });
    } finally {
      setFlightValidating(false);
    }
  };

  const handleFlightFileChange = async (documentType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resolvedFlight) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setMessage({ type: "error", text: "Please upload an image (JPEG, PNG, etc.) or PDF (max 10MB)." });
      return;
    }
    setMessage(null);
    setFlightUploadingType(documentType);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const payload = isImage ? { image: dataUrl } : { file: dataUrl };
        const { url } = await vendorFetch<{ url: string }>("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await vendorFetch("/api/verification/flight-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flight_id: resolvedFlight.flight_id,
            listing_id: resolvedFlight.listing_id,
            document_type: documentType,
            file_name: file.name,
            file_url: url,
          }),
        });
        const data = await vendorFetch<{ documents: Doc[] }>(
          `/api/verification/flight-documents/${resolvedFlight.flight_id}?listing_id=${encodeURIComponent(resolvedFlight.listing_id)}`
        );
        setFlightDocuments(data.documents || []);
        setMessage({ type: "success", text: "Document uploaded." });
      } catch {
        setFlightDocuments((prev) => [
          ...prev.filter((d) => d.document_type !== documentType),
          { id: `doc-${Date.now()}`, document_type: documentType, file_name: file.name, file_url: "", created_at: new Date().toISOString() },
        ]);
        setMessage({ type: "success", text: "Document added (demo). Backend integration pending." });
      } finally {
        setFlightUploadingType(null);
      }
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Failed to read file." });
      setFlightUploadingType(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendFlightRequest = async () => {
    if (!resolvedFlight || (resolvedFlight.verification_status !== "no_request" && resolvedFlight.verification_status !== "rejected")) return;
    setFlightSending(true);
    setMessage(null);
    try {
      const data = await vendorFetch<{ message: string; verification_status: string }>("/api/verification/send-flight-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight_id: resolvedFlight.flight_id, listing_id: resolvedFlight.listing_id }),
      });
      setResolvedFlight((prev) => (prev ? { ...prev, verification_status: "pending" } : null));
      setMessage({ type: "success", text: data?.message ?? "Verification request sent. Admin will review and respond." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to send verification request." });
    } finally {
      setFlightSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Verification</h1>
        <p className="text-muted-foreground mt-1">Choose a category, then paste your token, add documents (for company), and send the verification request to admin.</p>
      </div>

      {/* Category: Company | Vehicles */}
      <div className="flex flex-wrap gap-2">
        {VERIFICATION_CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategory(c.id);
                setMessage(null);
                setResolvedListing(null);
                setResolvedHotelBranch(null);
                setResolvedBus(null);
                setSelectedVehicleType(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors",
                category === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/50 text-foreground"
              )}
            >
              <Icon size={18} />
              {c.label}
            </button>
          );
        })}
      </div>

      {message && (
        <div className={cn("rounded-lg border p-4", message.type === "error" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400")}>
          {message.text}
        </div>
      )}

      {category === "company" && (
        <>
      {/* Step 1: Select company type (listings types: Transport, Restaurant, etc.) */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
        <label className="block text-sm font-medium text-foreground mb-3">Company type</label>
        <p className="text-xs text-muted-foreground mb-4">Select the type of company you want to verify (Transport, Hotel, Experience, or Event).</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COMPANY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedType(t);
                setTokenInput("");
                setResolvedListing(null);
                setResolvedHotelBranch(null);
                setMessage(null);
              }}
              className={cn(
                "rounded-xl border-2 p-4 text-left font-medium capitalize transition-colors",
                selectedType === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/50 text-foreground"
              )}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Paste generated token */}
      {selectedType && (
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
          <label className="block text-sm font-medium text-foreground">Paste verification token</label>
          <p className="text-xs text-muted-foreground">
            Generate a token in <strong>My Listings</strong> → open a listing → <strong>Verify</strong> → <strong>Generate token</strong>, then copy and paste it here.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="e.g. CMP-XXXX-XXXX"
              className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono placeholder:text-muted-foreground"
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setResolvedListing(null);
              }}
            />
            <button
              type="button"
              disabled={validating || !tokenInput.trim()}
              onClick={handleValidateToken}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validating ? "Validating…" : "Validate token"}
            </button>
          </div>
        </div>
      )}

      {selectedType && !resolvedForCompany && !validating && tokenInput.trim() && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-amber-700 dark:text-amber-400">
          <AlertCircle size={20} />
          <span>Paste your token and click <strong>Validate token</strong> to continue.</span>
        </div>
      )}
        </>
      )}

      {category === "hotel_branch" && (
        <>
          <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
            <label className="block text-sm font-medium text-foreground">Paste verification token</label>
            <p className="text-xs text-muted-foreground">
              Generate a token in <strong>My Listings</strong> → open your hotel company → <strong>Your hotels</strong> → <strong>Verify</strong> → <strong>Generate token</strong>, then copy and paste it here.
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="e.g. HBR-XXXX-XXXX"
                className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono placeholder:text-muted-foreground"
                value={hotelBranchTokenInput}
                onChange={(e) => {
                  setHotelBranchTokenInput(e.target.value);
                  setResolvedHotelBranch(null);
                }}
              />
              <button
                type="button"
                disabled={validating || !hotelBranchTokenInput.trim()}
                onClick={handleValidateHotelBranchToken}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? "Validating…" : "Validate token"}
              </button>
            </div>
          </div>
          {!resolvedForCompany && !validating && hotelBranchTokenInput.trim() && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-amber-700 dark:text-amber-400">
              <AlertCircle size={20} />
              <span>Click <strong>Validate token</strong> to continue.</span>
            </div>
          )}
        </>
      )}

      {(category === "company" || category === "hotel_branch") && resolvedForCompany && (
        <>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-4">
            <CheckCircle size={20} className="text-success" />
            <span className="text-sm font-medium">Verified for: <strong>{resolvedName}</strong> ({category === "hotel_branch" ? "Hotel Branch" : typeLabel(selectedType || "")})</span>
          </div>

          {/* Status: Make request (before sending), Pending, Approved, or Rejected */}
          <div className={cn(
            "rounded-lg border p-4 flex items-center gap-2",
            verificationStatus === "no_request" && "bg-muted/50 border-border text-muted-foreground",
            verificationStatus === "approved" && "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
            verificationStatus === "rejected" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
            verificationStatus === "pending" && "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
          )}>
            <span className="font-medium">
              Status: {verificationStatus === "no_request"
                ? "Make request"
                : verificationStatus === "pending"
                  ? "Pending request"
                  : verificationStatus === "approved"
                    ? "Approved"
                    : "Rejected"}
            </span>
            {verificationStatus === "no_request" && (
              <span className="text-sm opacity-90">— Upload documents below and click &quot;Send verification request&quot;</span>
            )}
            {verificationStatus === "rejected" && (
              <span className="text-sm opacity-90">— You can add or replace documents below and re-request verification.</span>
            )}
          </div>

          {(verificationStatus === "no_request" || verificationStatus === "rejected") && (
            <>
              {/* Progress */}
              <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">
                    {category === "hotel_branch" ? "Documents for this hotel branch" : selectedType === "event" ? "Documents for this event" : selectedType === "hotel" ? "Documents for this hotel company" : "Documents for this company"}
                  </p>
                  <p className="text-sm font-semibold text-accent">{Math.round(progress)}%</p>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full rounded-full gold-gradient"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{uploadedCount} of {companyDocTypes.length} documents uploaded</p>
              </div>

              {/* Documents */}
              <div className="space-y-3">
                {companyDocTypes.map((doc, i) => {
                  const uploaded = getDocByType(doc.type);
                  const status = uploaded ? "Uploaded" : "Not Uploaded";
                  const cfg = statusConfig[status];
                  const StatusIcon = cfg.icon;
                  return (
                    <motion.div
                      key={doc.type}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="bg-card rounded-2xl shadow-card border border-border/50 p-5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <StatusIcon size={20} className={cfg.color} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.label}</p>
                          <p className="text-xs text-muted-foreground">{uploaded?.file_name ?? "No file uploaded"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-medium", cfg.color)}>{status}</span>
                        {!uploaded && (
                          <>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[doc.type] = el; }}
                              onChange={(e) => handleFileChange(doc.type, e)}
                            />
                            <button
                              type="button"
                              disabled={!!uploadingType}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
                              onClick={() => fileInputRefs.current[doc.type]?.click()}
                            >
                              <Upload size={14} />
                              {uploadingType === doc.type ? "Uploading…" : "Upload"}
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Send verification request */}
              <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  {category === "hotel_branch"
                    ? "Upload the hotel branch documents above (Local Trade License, Property Ownership, Fire Safety, Hotel Operating License), then send the verification request to admin. Once approved, this branch will be visible to users."
                    : selectedType === "event"
                      ? "Upload the event-related documents above (Government NOC, venue authorization, insurance, etc.), then send the verification request to admin. They will review and approve or reject."
                      : selectedType === "hotel"
                        ? "Upload the hotel company documents above (Business Registration, Trade License, Tax Proof, Bank Proof, Authorized Person ID), then send the verification request to admin. Once approved, you can add hotels from My Listings."
                        : "Upload the related documents for this company above, then send the verification request to admin. They will review and approve or reject."}
                </p>
                <button
                  type="button"
                  disabled={!canSendRequest || sending}
                  onClick={handleSendRequest}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <Send size={18} />
                  {sending ? "Sending…" : "Send verification request"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {category === "vehicles" && (
        <>
          {/* Step 1: Select vehicle type (like company type) */}
          <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
            <label className="block text-sm font-medium text-foreground mb-3">Vehicle type</label>
            <p className="text-xs text-muted-foreground mb-4">Select the type of vehicle you want to verify (e.g. Buses, Car, Flight, Train).</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {VEHICLE_TYPES.map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVehicleType(v.id);
                      setBusTokenInput("");
                      setResolvedBus(null);
                      setCarTokenInput("");
                      setResolvedCar(null);
                      setFlightTokenInput("");
                      setResolvedFlight(null);
                      setMessage(null);
                    }}
                    className={cn(
                      "rounded-xl border-2 p-4 flex flex-col items-center gap-2 font-medium capitalize transition-colors",
                      selectedVehicleType === v.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:border-primary/50 text-foreground"
                    )}
                  >
                    <Icon size={28} className={selectedVehicleType === v.id ? "text-primary" : "text-muted-foreground"} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Paste token for Buses, or Coming soon for other types */}
          {selectedVehicleType === "buses" && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">Paste bus verification token</label>
              <p className="text-xs text-muted-foreground">
                Generate a token in <strong>My Listings</strong> → open a transport listing → <strong>Manage Fleet</strong> → <strong>Verify</strong> → Generate token, then copy and paste it here.
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="e.g. BUS-XXXX-XXXX"
                  className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono placeholder:text-muted-foreground"
                  value={busTokenInput}
                  onChange={(e) => {
                    setBusTokenInput(e.target.value);
                    setResolvedBus(null);
                  }}
                />
                <button
                  type="button"
                  disabled={busValidating || !busTokenInput.trim()}
                  onClick={handleValidateBusToken}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busValidating ? "Validating…" : "Validate token"}
                </button>
              </div>
            </div>
          )}

          {selectedVehicleType === "car" && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">Paste car verification token</label>
              <p className="text-xs text-muted-foreground">
                Generate a token in <strong>My Listings</strong> → open a transport listing → <strong>Manage Fleet</strong> → filter <strong>Car</strong> → <strong>Verify</strong> (shield) → Generate token, then copy and paste it here.
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="e.g. CAR-XXXX-XXXX"
                  className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono placeholder:text-muted-foreground"
                  value={carTokenInput}
                  onChange={(e) => {
                    setCarTokenInput(e.target.value);
                    setResolvedCar(null);
                  }}
                />
                <button
                  type="button"
                  disabled={carValidating || !carTokenInput.trim()}
                  onClick={handleValidateCarToken}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {carValidating ? "Validating…" : "Validate token"}
                </button>
              </div>
            </div>
          )}

          {selectedVehicleType === "flight" && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">Paste flight verification token</label>
              <p className="text-xs text-muted-foreground">
                Generate a token in <strong>My Listings</strong> → open a transport listing → <strong>Manage Fleet</strong> → <strong>Flight</strong> tab → <strong>Verify</strong> (shield) → Generate token, then copy and paste it here.
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="e.g. FLIGHT-XXXX-XXXX"
                  className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono placeholder:text-muted-foreground"
                  value={flightTokenInput}
                  onChange={(e) => {
                    setFlightTokenInput(e.target.value);
                    setResolvedFlight(null);
                  }}
                />
                <button
                  type="button"
                  disabled={flightValidating || !flightTokenInput.trim()}
                  onClick={handleValidateFlightToken}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {flightValidating ? "Validating…" : "Validate token"}
                </button>
              </div>
            </div>
          )}

          {selectedVehicleType === "flight" && resolvedFlight && (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-4">
                <CheckCircle size={20} className="text-success" />
                <span className="text-sm font-medium">Flight: <strong>{resolvedFlight.flight_number}</strong> ({resolvedFlight.airline_name}) · Listing: {resolvedFlight.listing_name}</span>
              </div>

              <div className={cn(
                "rounded-lg border p-4 flex items-center gap-2",
                resolvedFlight.verification_status === "no_request" && "bg-muted/50 border-border text-muted-foreground",
                resolvedFlight.verification_status === "approved" && "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
                resolvedFlight.verification_status === "rejected" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
                resolvedFlight.verification_status === "pending" && "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
              )}>
                <span className="font-medium">
                  Status: {resolvedFlight.verification_status === "no_request"
                    ? "No request"
                    : resolvedFlight.verification_status === "pending"
                      ? "Pending request"
                      : resolvedFlight.verification_status === "approved"
                        ? "Approved"
                        : "Rejected"}
                </span>
                {resolvedFlight.verification_status === "no_request" && (
                  <span className="text-sm opacity-90">— Add required documents below, then click &quot;Send verification request&quot;.</span>
                )}
                {resolvedFlight.verification_status === "rejected" && (
                  <span className="text-sm opacity-90">— Add or replace documents and click &quot;Send verification request&quot; to re-request.</span>
                )}
              </div>

              {(resolvedFlight.verification_status === "no_request" || resolvedFlight.verification_status === "rejected") && (
                <>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                    <h4 className="font-medium text-foreground mb-2">Flight documents (required)</h4>
                    <p className="text-sm text-muted-foreground mb-4">Upload AOC, Aircraft Insurance, Aircraft Registration, Airworthiness Certificate, and any other docs. These will be sent with your verification request.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {FLIGHT_DOCUMENT_TYPES.map(({ label, type }) => {
                        const doc = getFlightDocByType(type);
                        const uploading = flightUploadingType === type;
                        return (
                          <div key={type} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                            <input
                              ref={(el) => { flightFileInputRefs.current[type] = el; }}
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => handleFlightFileChange(type, e)}
                            />
                            <button
                              type="button"
                              disabled={!!uploading}
                              onClick={() => flightFileInputRefs.current[type]?.click()}
                              className="flex-shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                            >
                              {uploading ? "Uploading…" : doc ? "Replace" : "Upload"}
                            </button>
                            <span className="text-sm text-muted-foreground truncate">{doc ? doc.file_name : label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                    <p className="text-sm text-muted-foreground mb-4">Send this flight for verification. Admin will see flight details, routes & pricing, seat structure, and all uploaded documents.</p>
                    <button
                      type="button"
                      disabled={flightSending}
                      onClick={handleSendFlightRequest}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      <Send size={18} />
                      {flightSending ? "Sending…" : "Send verification request"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {selectedVehicleType === "train" && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 text-center">
              <p className="text-sm font-medium text-foreground">Verification for Train is coming soon.</p>
              <p className="text-xs text-muted-foreground mt-1">Select Buses, Car, or Flight above to verify your fleet.</p>
            </div>
          )}

          {selectedVehicleType === "buses" && resolvedBus && (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-4">
                <CheckCircle size={20} className="text-success" />
                <span className="text-sm font-medium">Bus: <strong>{resolvedBus.name}</strong> {resolvedBus.registration_number && `(${resolvedBus.registration_number})`} · Listing: {resolvedBus.listing_name}</span>
              </div>

              <div className={cn(
                "rounded-lg border p-4 flex items-center gap-2",
                resolvedBus.verification_status === "no_request" && "bg-muted/50 border-border text-muted-foreground",
                resolvedBus.verification_status === "approved" && "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
                resolvedBus.verification_status === "rejected" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
                resolvedBus.verification_status === "pending" && "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
              )}>
                <span className="font-medium">
                  Status: {resolvedBus.verification_status === "no_request"
                    ? "No request"
                    : resolvedBus.verification_status === "pending"
                      ? "Pending request"
                      : resolvedBus.verification_status === "approved"
                        ? "Approved"
                        : "Rejected"}
                </span>
              {resolvedBus.verification_status === "no_request" && (
                <span className="text-sm opacity-90">— Add documents below, then click &quot;Send verification request&quot; to submit for admin review.</span>
                )}
              {resolvedBus.verification_status === "rejected" && (
                <span className="text-sm opacity-90">— Add or replace documents below and click &quot;Send verification request&quot; to re-request.</span>
                )}
              </div>

              {(resolvedBus.verification_status === "no_request" || resolvedBus.verification_status === "rejected") && (
                <>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                    <h4 className="font-medium text-foreground mb-2">Bus documents</h4>
                    <p className="text-sm text-muted-foreground mb-4">Driver and route details are already shared from your fleet. Upload insurance or other docs here; these will be sent with your verification request.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {BUS_DOCUMENT_TYPES.map(({ label, type }) => {
                        const doc = getBusDocByType(type);
                        const uploading = busUploadingType === type;
                        return (
                          <div key={type} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                            <input
                              ref={(el) => { busFileInputRefs.current[type] = el; }}
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => handleBusFileChange(type, e)}
                            />
                            <button
                              type="button"
                              disabled={!!uploading}
                              onClick={() => busFileInputRefs.current[type]?.click()}
                              className="flex-shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                            >
                              {uploading ? "Uploading…" : doc ? "Replace" : "Upload"}
                            </button>
                            <span className="text-sm text-muted-foreground truncate">{doc ? doc.file_name : label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                    <p className="text-sm text-muted-foreground mb-4">Send this bus for verification. Admin will see bus details, drivers, routes & pricing, and all uploaded documents.</p>
                    <button
                    type="button"
                    disabled={busSending}
                    onClick={handleSendBusRequest}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    <Send size={18} />
                    {busSending ? "Sending…" : "Send verification request"}
                  </button>
                </div>
                </>
              )}
            </>
          )}

          {selectedVehicleType === "car" && resolvedCar && (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border p-4">
                <CheckCircle size={20} className="text-success" />
                <span className="text-sm font-medium">Car: <strong>{resolvedCar.name}</strong> {resolvedCar.registration_number && `(${resolvedCar.registration_number})`} · Listing: {resolvedCar.listing_name}</span>
              </div>

              <div className={cn(
                "rounded-lg border p-4 flex items-center gap-2",
                resolvedCar.verification_status === "no_request" && "bg-muted/50 border-border text-muted-foreground",
                resolvedCar.verification_status === "approved" && "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
                resolvedCar.verification_status === "rejected" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
                resolvedCar.verification_status === "pending" && "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
              )}>
                <span className="font-medium">
                  Status: {resolvedCar.verification_status === "no_request"
                    ? "No request"
                    : resolvedCar.verification_status === "pending"
                      ? "Pending request"
                      : resolvedCar.verification_status === "approved"
                        ? "Approved"
                        : "Rejected"}
                </span>
                {resolvedCar.verification_status === "no_request" && (
                  <span className="text-sm opacity-90">— Add documents below, then click &quot;Send verification request&quot;.</span>
                )}
                {resolvedCar.verification_status === "rejected" && (
                  <span className="text-sm opacity-90">— Add or replace documents and click &quot;Send verification request&quot; to re-request.</span>
                )}
              </div>

              {(resolvedCar.verification_status === "no_request" || resolvedCar.verification_status === "rejected") && (
                <>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                    <h4 className="font-medium text-foreground mb-2">Car documents</h4>
                    <p className="text-sm text-muted-foreground mb-4">Upload Insurance, RC (Registration Certificate), and Driver license. These will be sent with your verification request.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CAR_DOCUMENT_TYPES.map(({ label, type }) => {
                        const doc = getCarDocByType(type);
                        const uploading = carUploadingType === type;
                        return (
                          <div key={type} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                            <input
                              ref={(el) => { carFileInputRefs.current[type] = el; }}
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => handleCarFileChange(type, e)}
                            />
                            <button
                              type="button"
                              disabled={!!uploading}
                              onClick={() => carFileInputRefs.current[type]?.click()}
                              className="flex-shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                            >
                              {uploading ? "Uploading…" : doc ? "Replace" : "Upload"}
                            </button>
                            <span className="text-sm text-muted-foreground truncate">{doc ? doc.file_name : label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                    <p className="text-sm text-muted-foreground mb-4">Send this car for verification. Admin will see car details, drivers, operating cities & pricing, and all uploaded documents.</p>
                    <button
                      type="button"
                      disabled={carSending}
                      onClick={handleSendCarRequest}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      <Send size={18} />
                      {carSending ? "Sending…" : "Send verification request"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {selectedVehicleType === "car" && !resolvedCar && carTokenInput.trim() && !carValidating && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-amber-700 dark:text-amber-400">
              <AlertCircle size={20} />
              <span>Paste your car token and click <strong>Validate token</strong> to continue.</span>
            </div>
          )}

          {selectedVehicleType === "buses" && !resolvedBus && busTokenInput.trim() && !busValidating && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-amber-700 dark:text-amber-400">
              <AlertCircle size={20} />
              <span>Paste your bus token and click <strong>Validate token</strong> to continue.</span>
            </div>
          )}

          {selectedVehicleType === "flight" && !resolvedFlight && flightTokenInput.trim() && !flightValidating && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-amber-700 dark:text-amber-400">
              <AlertCircle size={20} />
              <span>Paste your flight token and click <strong>Validate token</strong> to continue.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bus,
  Plane,
  Train,
  Hotel,
  Ticket,
  Car,
  Bike,
  CalendarDays,
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
  Clock,
  CheckCircle2,
  ChevronRight,
  Info,
  Upload,
  FileText,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, getApiUrl } from "@/lib/api";

const CATEGORIES = [
  { id: "bus", label: "Bus", icon: Bus },
  { id: "flight", label: "Flight", icon: Plane },
  { id: "train", label: "Train", icon: Train },
  { id: "hotel", label: "Hotel", icon: Hotel },
  { id: "experience", label: "Experiences", icon: Ticket },
  { id: "car", label: "Car Rental", icon: Car },
  { id: "bike", label: "Bike Rental", icon: Bike },
  { id: "events", label: "Events", icon: CalendarDays },
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

/** API response for GET /api/transport/available-cars */
type ApiCarOption = {
  listingId: string;
  listingName: string;
  carId: string;
  carName: string;
  registrationNumber: string | null;
  carType: string;
  seats: number;
  acType: string | null;
  areaId: string;
  baseFareCents: number | null;
  pricePerKmCents: number | null;
  minimumFareCents: number | null;
  estimatedDurationMinutes?: number | null;
};

const todayDate = () => new Date();

/** Fallback cities for Car Local ride when API returns none (static UI). */
const CAR_LOCAL_CITIES_FALLBACK = ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi", "Pune", "Kolkata"];

/** Experience card from GET /api/experiences?city= */
type ApiExperienceCard = {
  id: string;
  listingId: string;
  name: string;
  category: string;
  city: string;
  durationText: string;
  pricePerPersonCents: number;
  maxParticipantsPerSlot: number;
  shortDescription?: string;
  coverUrl?: string;
  availableDays: string;
  timeRange: string;
};

/** Experience slot from GET /api/experiences/:id/slots */
type ApiExperienceSlot = {
  id: string;
  slotDate: string;
  slotTime: string;
  capacity: number;
  booked: number;
  available: number;
};

/** Event card from GET /api/events?city=&date= */
type ApiEventCard = {
  id: string;
  listingId: string;
  name: string;
  category: string;
  city: string;
  venueName: string;
  venueAddress?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  organizerName: string;
  description?: string;
  coverUrl?: string;
};

/** Event detail from GET /api/events/:id (with ticket types and available) */
type ApiEventTicketType = {
  id: string;
  name: string;
  priceCents: number;
  quantityTotal: number;
  available: number;
  maxPerUser: number;
};
type ApiEventDetail = ApiEventCard & {
  ticketTypes: ApiEventTicketType[];
};

/** Flight option from search (API or static). listingId/flightId required for real booking. */
type StaticFlightOption = {
  id: string;
  scheduleId: string;
  flightNumber: string;
  airlineName: string;
  aircraftType: string;
  fromPlace: string;
  toPlace: string;
  departureTime: string;
  arrivalTime: string;
  fareCents: number;
  availableSeats: number;
  totalSeats: number;
  baggageAllowance: string;
  hasWifi: boolean;
  hasMeal: boolean;
  /** From API; required for POST /api/flight-bookings */
  listingId?: string;
  flightId?: string;
};

const STATIC_FLIGHT_OPTIONS: StaticFlightOption[] = [
  { id: "fl-1", scheduleId: "s1", flightNumber: "6E-201", airlineName: "IndiGo", aircraftType: "A320", fromPlace: "Hyderabad", toPlace: "Bangalore", departureTime: "06:00", arrivalTime: "07:15", fareCents: 350000, availableSeats: 24, totalSeats: 180, baggageAllowance: "15 kg", hasWifi: true, hasMeal: false },
  { id: "fl-2", scheduleId: "s2", flightNumber: "6E-405", airlineName: "IndiGo", aircraftType: "A321", fromPlace: "Hyderabad", toPlace: "Bangalore", departureTime: "14:30", arrivalTime: "15:45", fareCents: 420000, availableSeats: 12, totalSeats: 220, baggageAllowance: "15 kg", hasWifi: true, hasMeal: true },
  { id: "fl-3", scheduleId: "s3", flightNumber: "UK-812", airlineName: "Vistara", aircraftType: "B787", fromPlace: "Hyderabad", toPlace: "Bangalore", departureTime: "18:00", arrivalTime: "19:20", fareCents: 850000, availableSeats: 8, totalSeats: 300, baggageAllowance: "20 kg", hasWifi: true, hasMeal: true },
];

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
  const [busDetailsOpen, setBusDetailsOpen] = useState(false);
  const [selectedBusForDetails, setSelectedBusForDetails] = useState<ApiBusOption | null>(null);
  const [carDetailsOpen, setCarDetailsOpen] = useState(false);
  const [selectedCarForDetails, setSelectedCarForDetails] = useState<ApiCarOption | null>(null);
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
  // Car Rental (static flow): Local | Intercity
  const [carRideType, setCarRideType] = useState<"local" | "intercity" | null>(null);
  const [carLocalCity, setCarLocalCity] = useState("");
  const [carLocalPickup, setCarLocalPickup] = useState("");
  const [carLocalDrop, setCarLocalDrop] = useState("");
  const [carIntercityFrom, setCarIntercityFrom] = useState("");
  const [carIntercityTo, setCarIntercityTo] = useState("");
  const [carDate, setCarDate] = useState<Date | undefined>(todayDate);
  const [carTime, setCarTime] = useState("10:00");
  const [carPassengers, setCarPassengers] = useState(1);
  const [carSearchDone, setCarSearchDone] = useState(false);
  const [carRequestSent, setCarRequestSent] = useState(false);
  const [carRequestedName, setCarRequestedName] = useState<string | null>(null);
  const [carVendorAccepted, setCarVendorAccepted] = useState(false);
  const [carPaymentDone, setCarPaymentDone] = useState(false);
  const [carBookingOtp, setCarBookingOtp] = useState<string | null>(null);
  const [carList, setCarList] = useState<ApiCarOption[]>([]);
  const [carLoading, setCarLoading] = useState(false);
  const [carError, setCarError] = useState("");
  const [carBookingId, setCarBookingId] = useState<string | null>(null);
  // Flight
  const [flightSearchDone, setFlightSearchDone] = useState(false);
  const [flightList, setFlightList] = useState<StaticFlightOption[]>([]);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState("");
  const [flightDetailsOpen, setFlightDetailsOpen] = useState(false);
  const [selectedFlightForDetails, setSelectedFlightForDetails] = useState<StaticFlightOption | null>(null);
  const [flightBookOpen, setFlightBookOpen] = useState(false);
  const [selectedFlightForBook, setSelectedFlightForBook] = useState<StaticFlightOption | null>(null);
  type FlightPassengerForm = { fullName: string; idType: string; idNumber: string; docFileName: string; docUrl?: string };
  const [flightPassengerForms, setFlightPassengerForms] = useState<FlightPassengerForm[]>([]);
  const [flightRequestSubmitted, setFlightRequestSubmitted] = useState(false);
  const [flightSubmitError, setFlightSubmitError] = useState("");
  // Experiences
  const [experienceCities, setExperienceCities] = useState<string[]>([]);
  const [experienceCity, setExperienceCity] = useState("");
  const [experienceList, setExperienceList] = useState<ApiExperienceCard[]>([]);
  const [experienceLoading, setExperienceLoading] = useState(false);
  const [experienceError, setExperienceError] = useState("");
  const [experienceDetailOpen, setExperienceDetailOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<ApiExperienceCard | null>(null);
  const [experienceSlots, setExperienceSlots] = useState<ApiExperienceSlot[]>([]);
  const [experienceSlotsLoading, setExperienceSlotsLoading] = useState(false);
  const [experienceSlotsFrom, setExperienceSlotsFrom] = useState("");
  const [experienceSlotsTo, setExperienceSlotsTo] = useState("");
  const [selectedExperienceSlot, setSelectedExperienceSlot] = useState<ApiExperienceSlot | null>(null);
  const [experienceParticipants, setExperienceParticipants] = useState(1);
  const [experienceBookOpen, setExperienceBookOpen] = useState(false);
  const [experienceBookingId, setExperienceBookingId] = useState<string | null>(null);
  const [experienceBookingRef, setExperienceBookingRef] = useState<string | null>(null);
  const [experiencePaymentDone, setExperiencePaymentDone] = useState(false);
  const [experiencePayLoading, setExperiencePayLoading] = useState(false);
  // Events (city + date, cards, book → pay → ticket)
  const [eventCities, setEventCities] = useState<string[]>([]);
  const [eventCity, setEventCity] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventList, setEventList] = useState<ApiEventCard[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState("");
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ApiEventDetail | null>(null);
  const [eventTicketSelections, setEventTicketSelections] = useState<Record<string, number>>({});
  const [eventBookOpen, setEventBookOpen] = useState(false);
  const [eventBookingRef, setEventBookingRef] = useState<string | null>(null);
  const [eventBookingId, setEventBookingId] = useState<string | null>(null);
  const [eventPaymentDone, setEventPaymentDone] = useState(false);
  const [eventPayLoading, setEventPayLoading] = useState(false);
  // Hotel: city → list → select hotel → dates, guest details, requirements, docs → submit
  type ApiHotelCard = { id: string; name: string; city: string | null; areaLocality: string | null; fullAddress: string | null; description: string | null; listingId: string; listingName: string };
  type HotelRoomType = { name: string; maxOccupancy?: string; pricePerNight?: string; totalRooms?: string; amenities?: string; cancellationPolicy?: string };
  type ApiHotelDetail = ApiHotelCard & { pincode: string | null; landmark: string | null; contactNumber: string | null; email: string | null; roomTypes: HotelRoomType[] };
  const [hotelCity, setHotelCity] = useState("");
  const [hotelList, setHotelList] = useState<ApiHotelCard[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState("");
  const [hotelDetailOpen, setHotelDetailOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<ApiHotelDetail | null>(null);
  const [hotelCheckIn, setHotelCheckIn] = useState("");
  const [hotelNights, setHotelNights] = useState(1);
  const [hotelGuestName, setHotelGuestName] = useState("");
  const [hotelGuestPhone, setHotelGuestPhone] = useState("");
  const [hotelGuestEmail, setHotelGuestEmail] = useState("");
  const [hotelRequirements, setHotelRequirements] = useState("");
  const [hotelDocUrls, setHotelDocUrls] = useState<{ label: string; url: string }[]>([]);
  const [hotelSelectedRoomType, setHotelSelectedRoomType] = useState<HotelRoomType | null>(null);
  const [hotelBookOpen, setHotelBookOpen] = useState(false);
  const [hotelSubmitLoading, setHotelSubmitLoading] = useState(false);
  const [hotelSubmitError, setHotelSubmitError] = useState("");
  const [hotelBookingId, setHotelBookingId] = useState<string | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Restore car booking flow when navigating from My Trip with carBookingId in state
  useEffect(() => {
    const id = (location.state as { carBookingId?: string } | null)?.carBookingId;
    if (!id || !token) return;
    setCarBookingId(id);
    setSelectedCategory("car");
    setCarRequestSent(true);
    apiFetch<{ status: string; carName?: string; otp?: string }>(`/api/car-bookings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      if (data?.carName) setCarRequestedName(data.carName);
      if (data?.status === "approved_awaiting_payment") setCarVendorAccepted(true);
      if (data?.status === "confirmed") {
        setCarVendorAccepted(true);
        setCarPaymentDone(true);
        setCarBookingOtp(data.otp ?? null);
      }
    }).catch(() => {});
    navigate(location.pathname, { replace: true, state: {} });
  }, [token, location.state, location.pathname, navigate]);

  // Restore hotel booking when navigating from My Trip with hotelBookingId in state
  useEffect(() => {
    const id = (location.state as { hotelBookingId?: string } | null)?.hotelBookingId;
    if (!id || !token) return;
    setHotelBookingId(id);
    setSelectedCategory("hotel");
    navigate(location.pathname, { replace: true, state: {} });
  }, [token, location.state, location.pathname, navigate]);

  // Load experience cities when Experiences is selected
  useEffect(() => {
    if (selectedCategory !== "experience") return;
    setExperienceError("");
    apiFetch<{ cities: string[] }>("/api/experiences/cities").then(({ data, error, status, networkError }) => {
      if (error || status !== 200 || networkError) {
        setExperienceCities([]);
        setExperienceError(
          networkError
            ? "Could not reach the API. Start the main app backend (npm run dev:backend from project root) and ensure it uses the same DATABASE_URL as VendorHub."
            : (error || "Could not load cities. Ensure the main app backend is running and uses the same database as VendorHub.")
        );
        return;
      }
      const list = data?.cities ?? [];
      setExperienceCities(list);
      if (list.length > 0 && !experienceCity) setExperienceCity(list[0]);
    });
  }, [selectedCategory]);

  // Load experiences when city is selected (experience flow)
  useEffect(() => {
    if (selectedCategory !== "experience" || !experienceCity.trim()) {
      setExperienceList([]);
      return;
    }
    setExperienceLoading(true);
    setExperienceError("");
    apiFetch<{ experiences: ApiExperienceCard[] }>(`/api/experiences?city=${encodeURIComponent(experienceCity.trim())}`)
      .then(({ data, error }) => {
        setExperienceList(data?.experiences ?? []);
        if (error) setExperienceError(error);
      })
      .finally(() => setExperienceLoading(false));
  }, [selectedCategory, experienceCity]);

  // Load event cities when Events is selected
  useEffect(() => {
    if (selectedCategory !== "events") return;
    setEventError("");
    apiFetch<{ cities: string[] }>("/api/events/cities").then(({ data, error, status, networkError }) => {
      if (error || status !== 200 || networkError) {
        setEventCities([]);
        setEventError(networkError ? "Could not reach the API. Start the main app backend." : (error || "Could not load cities."));
        return;
      }
      const list = data?.cities ?? [];
      setEventCities(list);
      if (list.length > 0 && !eventCity) setEventCity(list[0]);
      if (!eventDate) setEventDate(dateToYYYYMMDD(new Date()));
    });
  }, [selectedCategory]);

  // Load events when city and date selected (date must be within event start_date..end_date)
  useEffect(() => {
    if (selectedCategory !== "events" || !eventCity.trim() || !eventDate.trim()) {
      setEventList([]);
      return;
    }
    setEventLoading(true);
    setEventError("");
    apiFetch<{ events: ApiEventCard[] }>(
      `/api/events?city=${encodeURIComponent(eventCity.trim())}&date=${encodeURIComponent(eventDate.slice(0, 10))}`
    )
      .then(({ data, error }) => {
        setEventList(data?.events ?? []);
        if (error) setEventError(error);
      })
      .finally(() => setEventLoading(false));
  }, [selectedCategory, eventCity, eventDate]);

  // Load cities for From/To dropdowns when Bus, Car or Flight is selected
  useEffect(() => {
    if (selectedCategory !== "bus" && selectedCategory !== "car" && selectedCategory !== "flight") return;
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

  // Reset Car Rental flow only when user explicitly switches to a different category (not on initial mount)
  useEffect(() => {
    if (selectedCategory != null && selectedCategory !== "car") {
      setCarRideType(null);
      setCarLocalCity("");
      setCarSearchDone(false);
      setCarRequestSent(false);
      setCarRequestedName(null);
      setCarVendorAccepted(false);
      setCarPaymentDone(false);
      setCarBookingOtp(null);
      setCarList([]);
      setCarError("");
      setCarBookingId(null);
    }
  }, [selectedCategory]);

  const runCarSearch = async () => {
    setCarError("");
    setCarLoading(true);
    setCarSearchDone(false);
    try {
      if (carRideType === "local") {
        if (!carLocalCity.trim()) {
          setCarError("Please select a city.");
          return;
        }
        const { data, error } = await apiFetch<{ type: string; date: string; cars: ApiCarOption[] }>(
          `/api/transport/available-cars?type=local&city=${encodeURIComponent(carLocalCity.trim())}&passengers=${carPassengers}`
        );
        if (error) {
          setCarError(error || "Failed to load cars");
          setCarList([]);
          return;
        }
        setCarList(data?.cars ?? []);
      } else {
        const fromCity = carIntercityFrom.trim();
        const toCity = carIntercityTo.trim();
        const travelDate = carDate ? dateToYYYYMMDD(carDate) : "";
        if (!fromCity || !toCity || !travelDate) {
          setCarError("Please enter from city, to city, and date.");
          return;
        }
        const { data, error } = await apiFetch<{ type: string; date: string; cars: ApiCarOption[] }>(
          `/api/transport/available-cars?type=intercity&from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&date=${travelDate}&passengers=${carPassengers}`
        );
        if (error) {
          setCarError(error || "Failed to load cars");
          setCarList([]);
          return;
        }
        setCarList(data?.cars ?? []);
      }
      setCarSearchDone(true);
    } finally {
      setCarLoading(false);
    }
  };

  const handleCarBook = async (car: ApiCarOption) => {
    if (!token) return;
    setCarError("");
    const travelDate =
      carRideType === "local"
        ? dateToYYYYMMDD(new Date())
        : (carDate ? dateToYYYYMMDD(carDate) : "");
    if (carRideType === "intercity" && !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      setCarError("Please select a travel date for intercity ride.");
      return;
    }
    const now = new Date();
    const travelTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const passengers = Number(carPassengers);
    const body = {
      listingId: car.listingId,
      carId: car.carId,
      areaId: car.areaId,
      bookingType: carRideType!,
      travelDate,
      passengers: Number.isFinite(passengers) && passengers >= 1 && passengers <= 20 ? passengers : 1,
      totalCents: car.baseFareCents ?? undefined,
      ...(carRideType === "local"
        ? { city: carLocalCity.trim() || undefined, pickupPoint: carLocalPickup.trim() || undefined, dropPoint: carLocalDrop.trim() || undefined, travelTime }
        : { fromCity: carIntercityFrom.trim() || undefined, toCity: carIntercityTo.trim() || undefined }),
    };
    const { data, error } = await apiFetch<{ id: string; bookingRef: string; status: string }>("/api/car-bookings", {
      method: "POST",
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error || !data?.id) {
      const msg = error || "Failed to send booking request";
      setCarError(typeof msg === "string" ? msg : "Validation failed. Check date (YYYY-MM-DD) and passengers.");
      return;
    }
    setCarBookingId(data.id);
    setCarRequestedName(car.carName);
    setCarRequestSent(true);
  };

  const handleCarCheckStatus = async () => {
    if (!carBookingId || !token) return;
    const { data } = await apiFetch<{ status: string }>(`/api/car-bookings/${carBookingId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (data?.status === "approved_awaiting_payment") setCarVendorAccepted(true);
  };

  const handleCarCancelBooking = async () => {
    if (!carBookingId || !token) return;
    const { error } = await apiFetch<{ ok: boolean }>(`/api/car-bookings/${carBookingId}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) {
      setCarError(error);
      return;
    }
    setCarRequestSent(false);
    setCarRequestedName(null);
    setCarBookingId(null);
  };

  const handleCarPayNow = async () => {
    if (!carBookingId || !token) return;
    const { data, error } = await apiFetch<{ ok: boolean; status: string; otp: string }>(`/api/car-bookings/${carBookingId}/pay`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error || !data?.otp) {
      setCarError(error || "Payment failed");
      return;
    }
    setCarPaymentDone(true);
    setCarBookingOtp(data.otp);
  };

  // Experience: fetch slots for selected experience and date range
  const fetchExperienceSlots = async () => {
    if (!selectedExperience) return;
    const from = experienceSlotsFrom || dateToYYYYMMDD(new Date());
    const d = new Date(from);
    d.setDate(d.getDate() + 13);
    const to = experienceSlotsTo || dateToYYYYMMDD(d);
    setExperienceSlotsLoading(true);
    const { data, error } = await apiFetch<{ slots: ApiExperienceSlot[] }>(
      `/api/experiences/${selectedExperience.id}/slots?from=${from}&to=${to}`
    );
    setExperienceSlots(data?.slots ?? []);
    if (error) setExperienceError(error);
    setExperienceSlotsLoading(false);
  };

  const openExperienceDetail = (exp: ApiExperienceCard) => {
    setSelectedExperience(exp);
    setExperienceDetailOpen(true);
    setSelectedExperienceSlot(null);
    const today = dateToYYYYMMDD(new Date());
    const end = new Date();
    end.setDate(end.getDate() + 13);
    setExperienceSlotsFrom(today);
    setExperienceSlotsTo(dateToYYYYMMDD(end));
    setExperienceSlots([]);
  };

  const handleExperienceBook = async () => {
    if (!token || !selectedExperience || !selectedExperienceSlot) return;
    const participants = Math.min(selectedExperience.maxParticipantsPerSlot, Math.max(1, experienceParticipants));
    const totalCents = selectedExperience.pricePerPersonCents * participants;
    setExperienceError("");
    const { data, error } = await apiFetch<{ id: string; bookingRef: string; status: string }>("/api/experience-bookings", {
      method: "POST",
      body: {
        experienceId: selectedExperience.id,
        experienceSlotId: selectedExperienceSlot.id,
        participantsCount: participants,
        totalCents,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error || !data?.id) {
      setExperienceError(error || "Failed to create booking");
      return;
    }
    setExperienceBookingId(data.id);
    setExperienceBookingRef(data.bookingRef);
    setExperienceBookOpen(true);
  };

  const handleExperiencePay = async () => {
    if (!experienceBookingId || !token) return;
    setExperiencePayLoading(true);
    setExperienceError("");
    const { error } = await apiFetch(`/api/experience-bookings/${experienceBookingId}/pay`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setExperiencePayLoading(false);
    if (error) {
      setExperienceError(error);
      return;
    }
    setExperiencePaymentDone(true);
  };

  const closeExperienceFlow = () => {
    setExperienceBookOpen(false);
    setExperienceBookingId(null);
    setExperienceBookingRef(null);
    setExperiencePaymentDone(false);
    setExperienceDetailOpen(false);
    setSelectedExperience(null);
    setSelectedExperienceSlot(null);
    setExperienceSlots([]);
  };

  const openEventDetail = async (ev: ApiEventCard) => {
    setEventDetailOpen(true);
    setSelectedEvent(null);
    setEventTicketSelections({});
    setEventError("");
    const { data, error } = await apiFetch<ApiEventDetail>(`/api/events/${ev.id}`);
    if (error || !data) {
      setEventError(error || "Failed to load event");
      return;
    }
    setSelectedEvent(data);
  };

  const handleEventBook = async () => {
    if (!token || !selectedEvent) return;
    const tickets = selectedEvent.ticketTypes
      .map((t) => ({ eventTicketTypeId: t.id, quantity: Math.min(t.maxPerUser, Math.max(0, eventTicketSelections[t.id] ?? 0)) }))
      .filter((t) => t.quantity > 0);
    if (tickets.length === 0) {
      setEventError("Select at least one ticket.");
      return;
    }
    setEventError("");
    const { data, error } = await apiFetch<{ id: string; bookingRef: string; status: string; totalCents: number }>("/api/event-bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { eventId: selectedEvent.id, tickets },
    });
    if (error || !data?.id) {
      setEventError(error || "Failed to create booking");
      return;
    }
    setEventBookingId(data.id);
    setEventBookingRef(data.bookingRef);
    setEventBookOpen(true);
  };

  const handleEventPay = async () => {
    if (!eventBookingId || !token) return;
    setEventPayLoading(true);
    setEventError("");
    const { error } = await apiFetch(`/api/event-bookings/${eventBookingId}/pay`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setEventPayLoading(false);
    if (error) {
      setEventError(error);
      return;
    }
    setEventPaymentDone(true);
  };

  const closeEventFlow = () => {
    setEventBookOpen(false);
    setEventBookingId(null);
    setEventBookingRef(null);
    setEventPaymentDone(false);
    setEventDetailOpen(false);
    setSelectedEvent(null);
    setEventTicketSelections({});
  };

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

  const runFlightSearch = async () => {
    if (selectedCategory !== "flight" || !date) return;
    setFlightError("");
    setFlightLoading(true);
    setFlightSearchDone(true);
    const dateStr = dateToYYYYMMDD(date);
    const params = new URLSearchParams({ date: dateStr, passengers: String(passengers) });
    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());
    try {
      const { data, error } = await apiFetch<{ flights: Array<{
        scheduleId: string; flightId: string; listingId: string; listingName?: string;
        flightNumber: string; airlineName: string; aircraftType: string; flightType?: string;
        fromPlace: string; toPlace: string; departureTime: string; arrivalTime: string;
        totalSeats: number; availableSeats: number; fareCents?: number; seatLayout?: unknown;
      }> }>(`/api/flights/search?${params.toString()}`);
      if (error) {
        setFlightError(error || "Failed to load flights");
        setFlightList([]);
        return;
      }
      const list = (data?.flights ?? []).map((f) => ({
        id: f.scheduleId,
        scheduleId: f.scheduleId,
        listingId: f.listingId,
        flightId: f.flightId,
        flightNumber: f.flightNumber,
        airlineName: f.airlineName,
        aircraftType: f.aircraftType,
        fromPlace: f.fromPlace,
        toPlace: f.toPlace,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        fareCents: f.fareCents ?? 0,
        availableSeats: f.availableSeats,
        totalSeats: f.totalSeats,
        baggageAllowance: "15 kg",
        hasWifi: false,
        hasMeal: false,
      }));
      setFlightList(list);
      if (list.length === 0) setFlightError("No flights found for this route and date.");
    } catch {
      setFlightError("Failed to search flights.");
      setFlightList([]);
    } finally {
      setFlightLoading(false);
    }
  };

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

  /** Map API hotel row (snake_case) to ApiHotelCard */
  const mapHotelRow = (r: { id: string; name: string; city: string | null; area_locality: string | null; full_address: string | null; description: string | null; listing_id: string; listing_name: string }) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    areaLocality: r.area_locality,
    fullAddress: r.full_address,
    description: r.description,
    listingId: r.listing_id,
    listingName: r.listing_name,
  });

  const runHotelSearch = () => {
    const city = hotelCity.trim();
    if (!city) {
      setHotelError("Enter a city to search.");
      return;
    }
    setHotelLoading(true);
    setHotelError("");
    apiFetch<{ hotels: { id: string; name: string; city: string | null; area_locality: string | null; full_address: string | null; description: string | null; listing_id: string; listing_name: string }[] }>(
      `/api/hotels?city=${encodeURIComponent(city)}`
    )
      .then(({ data, error }) => {
        if (error) {
          setHotelList([]);
          setHotelError(error);
          return;
        }
        setHotelList((data?.hotels ?? []).map(mapHotelRow));
      })
      .finally(() => setHotelLoading(false));
  };

  const openHotelDetail = (hotel: ApiHotelCard) => {
    setHotelError("");
    apiFetch<{ id: string; name: string; city: string | null; area_locality: string | null; full_address: string | null; pincode: string | null; landmark: string | null; contact_number: string | null; email: string | null; description: string | null; listing_id: string; listing_name: string; extra_details?: { room_types?: HotelRoomType[] } }>(
      `/api/hotels/${hotel.id}`,
      {}
    ).then(({ data, error }) => {
      if (error || !data) {
        setHotelError(error || "Could not load hotel details.");
        return;
      }
      const extra = data.extra_details as { room_types?: HotelRoomType[] } | undefined;
      const roomTypes = Array.isArray(extra?.room_types) ? extra.room_types : [];
      setSelectedHotel({
        ...mapHotelRow(data),
        pincode: data.pincode ?? null,
        landmark: data.landmark ?? null,
        contactNumber: data.contact_number ?? null,
        email: data.email ?? null,
        roomTypes,
      });
      setHotelDetailOpen(true);
    });
  };

  const openHotelBook = () => {
    setHotelDetailOpen(false);
    setHotelCheckIn(hotelCheckIn || dateToYYYYMMDD(new Date()));
    setHotelSelectedRoomType(null);
    setHotelBookOpen(true);
  };

  const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + days);
    return dateToYYYYMMDD(d);
  };

  const submitHotelBooking = () => {
    if (!selectedHotel || !token) return;
    const checkIn = hotelCheckIn || dateToYYYYMMDD(new Date());
    const checkOut = addDays(checkIn, hotelNights);
    if (!hotelGuestName.trim()) {
      setHotelSubmitError("Guest name is required.");
      return;
    }
    const roomTypes = selectedHotel.roomTypes ?? [];
    if (roomTypes.length > 0 && !hotelSelectedRoomType) {
      setHotelSubmitError("Please select a room type.");
      return;
    }
    const pricePerNight = hotelSelectedRoomType?.pricePerNight ? parseFloat(hotelSelectedRoomType.pricePerNight) : NaN;
    const totalCents = !Number.isNaN(pricePerNight) && pricePerNight >= 0 ? Math.round(pricePerNight * hotelNights * 100) : undefined;
    setHotelSubmitLoading(true);
    setHotelSubmitError("");
    apiFetch<{ id: string; bookingRef: string; status: string }>("/api/hotel-bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        hotelBranchId: selectedHotel.id,
        listingId: selectedHotel.listingId,
        checkIn,
        checkOut,
        nights: hotelNights,
        guestName: hotelGuestName.trim(),
        guestPhone: hotelGuestPhone.trim() || null,
        guestEmail: hotelGuestEmail.trim() || null,
        requirementsText: hotelRequirements.trim() || null,
        documentUrls: hotelDocUrls.filter((d) => d.label.trim() && d.url.trim()),
        roomType: hotelSelectedRoomType?.name?.trim() || null,
        totalCents: totalCents ?? null,
      },
    })
      .then(({ data, error }) => {
        if (error) {
          setHotelSubmitError(error);
          return;
        }
        if (data?.id) {
          setHotelBookingId(data.id);
          setHotelBookOpen(false);
          setSelectedHotel(null);
          setHotelSelectedRoomType(null);
          setHotelGuestName("");
          setHotelGuestPhone("");
          setHotelGuestEmail("");
          setHotelRequirements("");
          setHotelDocUrls([]);
        }
      })
      .finally(() => setHotelSubmitLoading(false));
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

          {/* Search bookings - only for bus / flight / train / bike (car has its own form below) */}
          {selectedCategory && ["bus", "flight", "train", "bike"].includes(selectedCategory) && (
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
                    onClick={() => selectedCategory === "flight" ? runFlightSearch() : runBusSearch()}
                    disabled={!date}
                  >
                    <Search className="h-4 w-4" /> Search
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Category content: Flight (static UI) */}
          {selectedCategory === "flight" && (
            <div className="space-y-6">
              <h3 className="font-semibold text-foreground">
                {flightSearchDone ? `Available flights${from && to ? ` ${from} → ${to}` : ""}${date ? ` · ${dateToYYYYMMDD(date!)}` : ""} (${passengers} passenger${passengers !== 1 ? "s" : ""})` : "Available flights"}
              </h3>
              {flightError && (
                <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-medium">{flightError}</p>
                </div>
              )}
              {!flightSearchDone && !flightLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Select From, To, Date and Passengers, then click Search to see flights.
                </p>
              ) : flightLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading flights…</p>
              ) : flightList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No flights found for this route and date.</p>
              ) : (
                <div className="space-y-4">
                  {flightList.map((f) => (
                    <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground font-mono">{f.flightNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.airlineName} · {f.aircraftType}</p>
                        <p className="text-sm font-medium text-foreground mt-1">{f.fromPlace} → {f.toPlace}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <span>{f.departureTime} → {f.arrivalTime}</span>
                          <span>{f.availableSeats} of {f.totalSeats} seats available</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-semibold text-foreground">₹ {(f.fareCents / 100).toLocaleString("en-IN")}</span>
                          <span className="text-xs text-muted-foreground">per person</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:justify-center">
                        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setSelectedFlightForDetails(f); setFlightDetailsOpen(true); }}>
                          <Info className="h-4 w-4 mr-2" /> View details
                        </Button>
                        <Button size="sm" className="rounded-xl gap-2" onClick={() => { setSelectedFlightForBook(f); setFlightPassengerForms(Array.from({ length: passengers }, () => ({ fullName: "", idType: "aadhaar", idNumber: "", docFileName: "" }))); setFlightRequestSubmitted(false); setFlightBookOpen(true); }}>
                          <Plane className="h-4 w-4" /> Book
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                            variant="outline"
                            className="rounded-xl gap-1"
                            onClick={() => {
                              setSelectedBusForDetails(bus);
                              setBusDetailsOpen(true);
                            }}
                          >
                            <Info className="h-3.5 w-3.5" /> View details
                          </Button>
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

          {/* Car Rental — static flow: Local | Intercity → form → results → request sent */}
          {selectedCategory === "car" && (
            <div className="space-y-6">
              {/* Step 1: Choose ride type */}
              {carRideType === null && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">Choose your ride type</h2>
                  <p className="text-sm text-muted-foreground mb-4">Within the same city or between cities?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setCarRideType("local")}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-accent hover:bg-accent/5 transition-all text-left"
                    >
                      <MapPin className="h-10 w-10 text-accent" />
                      <div>
                        <p className="font-semibold text-foreground">Local Ride</p>
                        <p className="text-xs text-muted-foreground mt-1">Pickup → Drop within one city. Price by distance.</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCarRideType("intercity")}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-accent hover:bg-accent/5 transition-all text-left"
                    >
                      <Car className="h-10 w-10 text-accent" />
                      <div>
                        <p className="font-semibold text-foreground">Intercity Ride</p>
                        <p className="text-xs text-muted-foreground mt-1">From one city to another. Fixed route & fare.</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Form + optional results */}
              {carRideType !== null && !carRequestSent && (
                <>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCarRideType(null);
                          setCarSearchDone(false);
                          setCarRequestSent(false);
                          setCarRequestedName(null);
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        ← Change ride type
                      </button>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {carRideType === "local" ? "Search local ride" : "Search intercity ride"}
                    </h2>
                    {carRideType === "local" ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Select your city first, then pickup and drop points within the city.</p>
                        <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-200 rounded-lg px-3 py-2">
                          Local rides are for <strong>today only</strong> at <strong>current time</strong>. No date or time selection.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs">City</Label>
                            <Select value={carLocalCity || "_"} onValueChange={(v) => setCarLocalCity(v === "_" ? "" : v)}>
                              <SelectTrigger className="mt-1 rounded-xl">
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_">Select city</SelectItem>
                                {(cities.length > 0 ? cities : CAR_LOCAL_CITIES_FALLBACK).map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Pickup point</Label>
                            <Input
                              placeholder="e.g. Gachibowli"
                              value={carLocalPickup}
                              onChange={(e) => setCarLocalPickup(e.target.value)}
                              className="mt-1 rounded-xl"
                              disabled={!carLocalCity}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Drop / destination</Label>
                            <Input
                              placeholder="e.g. Secunderabad"
                              value={carLocalDrop}
                              onChange={(e) => setCarLocalDrop(e.target.value)}
                              className="mt-1 rounded-xl"
                              disabled={!carLocalCity}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Passengers</Label>
                            <Input
                              type="number"
                              min={1}
                              max={9}
                              value={carPassengers}
                              onChange={(e) => setCarPassengers(Math.max(1, Number(e.target.value) || 1))}
                              className="mt-1 rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">From city</Label>
                          <Input
                            placeholder="e.g. Hyderabad"
                            value={carIntercityFrom}
                            onChange={(e) => setCarIntercityFrom(e.target.value)}
                            className="mt-1 rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">To city</Label>
                          <Input
                            placeholder="e.g. Bangalore"
                            value={carIntercityTo}
                            onChange={(e) => setCarIntercityTo(e.target.value)}
                            className="mt-1 rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Date</Label>
                          <Input
                            type="date"
                            value={carDate ? dateToYYYYMMDD(carDate) : ""}
                            onChange={(e) => setCarDate(e.target.value ? new Date(e.target.value + "T12:00:00") : undefined)}
                            className="mt-1 rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Passengers</Label>
                          <Input
                            type="number"
                            min={1}
                            max={9}
                            value={carPassengers}
                            onChange={(e) => setCarPassengers(Math.max(1, Number(e.target.value) || 1))}
                            className="mt-1 rounded-xl"
                          />
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        className="rounded-xl gap-2"
                        size="lg"
                        onClick={runCarSearch}
                        disabled={carLoading}
                      >
                        <Search className="h-4 w-4" /> {carLoading ? "Searching…" : "Search"}
                      </Button>
                    </div>
                  </div>

                  {carError && (
                    <p className="text-sm text-destructive rounded-xl bg-destructive/10 px-4 py-2">{carError}</p>
                  )}

                  {/* Results after Search */}
                  {carSearchDone && (
                    <div className="space-y-4">
                      {carRideType === "local" && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-4">
                          <h3 className="font-semibold text-foreground mb-2">Route & estimated fare</h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            Ride for: <strong>Today</strong>, {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} (local ride – today & current time only)
                          </p>
                          <div className="h-32 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm text-muted-foreground">
                            Map placeholder — {carLocalCity ? `${carLocalCity}: ` : ""}{carLocalPickup || "Pickup"} → {carLocalDrop || "Drop"} · Distance-based fare
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Estimated fare will be calculated from distance. Final fare subject to vendor confirmation.</p>
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground">Available cars</h3>
                      {carList.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                          No cars available for this search. Try another city/route or date, or add cars and schedules in the vendor hub.
                        </p>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {carList.map((car) => {
                            const fareCents = car.baseFareCents ?? 0;
                            const fareStr = fareCents > 0 ? `₹ ${(fareCents / 100).toLocaleString("en-IN")}` : "—";
                            const desc = carRideType === "local" ? "Estimated" : "Fixed";
                            return (
                              <div
                                key={car.carId + car.areaId}
                                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col"
                              >
                                <p className="font-semibold text-foreground">{car.carName}</p>
                                <p className="text-xs text-muted-foreground mt-1">{car.carType} · {car.seats} seats</p>
                                <div className="mt-3 flex items-end justify-between gap-2">
                                  <div>
                                    <p className="text-lg font-semibold text-foreground">{fareStr}</p>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-xl gap-1"
                                      onClick={() => {
                                        setSelectedCarForDetails(car);
                                        setCarDetailsOpen(true);
                                      }}
                                    >
                                      <Info className="h-3.5 w-3.5" /> View details
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="hero"
                                      className="rounded-xl"
                                      onClick={() => handleCarBook(car)}
                                    >
                                      Book
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Step 3a: Booking request sent – pending vendor acceptance */}
              {carRequestSent && !carVendorAccepted && !carPaymentDone && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-600 mb-4">
                    <Clock className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Booking request sent</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    Your request for <strong>{carRequestedName ?? "this car"}</strong> is now pending vendor approval.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    No payment yet. When the vendor accepts, you will see a &quot;Pay now&quot; button. After payment you will get your ticket with a booking OTP.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      variant="secondary"
                      className="rounded-xl"
                      onClick={handleCarCheckStatus}
                    >
                      Check status
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                      onClick={handleCarCancelBooking}
                    >
                      Cancel booking
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3b: Vendor accepted – Pay now */}
              {carRequestSent && carVendorAccepted && !carPaymentDone && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Vendor accepted – Pay now</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    Your request for <strong>{carRequestedName ?? "this car"}</strong> has been accepted. Complete payment to get your ticket with OTP.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">After payment, your ride will be confirmed and you will receive a booking OTP for the driver.</p>
                  <Button
                    className="rounded-xl gap-2"
                    size="lg"
                    onClick={handleCarPayNow}
                  >
                    Pay now
                  </Button>
                </div>
              )}

              {/* Step 3c: Payment done – Ticket with OTP */}
              {carRequestSent && carPaymentDone && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4 mx-auto flex">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 text-center">Booking confirmed</h3>
                  <p className="text-sm text-muted-foreground mb-6 text-center">Your ticket is below. Share the OTP with the driver at pickup.</p>
                  <div className="max-w-sm mx-auto border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Booking OTP</p>
                    <p className="text-3xl font-mono font-bold text-foreground tracking-[0.3em] text-center">{carBookingOtp ?? "——"}</p>
                    <p className="text-xs text-muted-foreground mt-3 text-center">Show this to the driver when you board</p>
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Car:</span> <strong>{carRequestedName ?? "—"}</strong></p>
                      <p><span className="text-muted-foreground">Ride:</span> {carRideType === "local"
                        ? `${carLocalCity || "—"} · ${carLocalPickup || "—"} → ${carLocalDrop || "—"} (Today, current time)`
                        : `${carIntercityFrom || "—"} → ${carIntercityTo || "—"} · ${carDate ? dateToYYYYMMDD(carDate) : "—"}`}
                      </p>
                      <p><span className="text-muted-foreground">Passengers:</span> {carPassengers}</p>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setCarRequestSent(false);
                        setCarRequestedName(null);
                        setCarSearchDone(false);
                        setCarVendorAccepted(false);
                        setCarPaymentDone(false);
                        setCarBookingOtp(null);
                        setCarBookingId(null);
                      }}
                    >
                      Book another ride
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Experiences: city filter + cards with days/time, then book → pay → ticket */}
          {selectedCategory === "experience" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-foreground font-medium">City</Label>
                <Select value={experienceCity} onValueChange={setExperienceCity}>
                  <SelectTrigger className="w-[220px] rounded-xl min-w-[180px]">
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceCities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {experienceCities.length > 0 && (
                  <p className="text-sm text-muted-foreground">Choose a city to see experiences you can book.</p>
                )}
              </div>
              {experienceCities.length === 0 && !experienceLoading && !experienceError && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground">
                  <p className="font-medium text-foreground">No cities with experiences yet.</p>
                  <p className="text-sm mt-2">To see a city here: in <strong>VendorHub</strong> go to My Listings → open the experience → <strong>Manage</strong> → click <strong>Active</strong>. The experience must be Active for its city to appear. Also run the main app backend with the same database (npm run dev:backend).</p>
                </div>
              )}
              {experienceError && <p className="text-sm text-destructive">{experienceError}</p>}
              {experienceLoading && <p className="text-sm text-muted-foreground">Loading experiences…</p>}
              {!experienceLoading && experienceList.length === 0 && experienceCity && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground">
                  <p>No experiences in this city yet.</p>
                </div>
              )}
              {!experienceLoading && experienceList.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">Click an experience to view details, choose a slot, and book → pay → get your ticket.</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {experienceList.map((exp) => (
                      <div
                        key={exp.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-emerald-400 hover:shadow-md transition-all flex flex-col"
                      >
                        <button
                          type="button"
                          onClick={() => openExperienceDetail(exp)}
                          className="text-left flex-1"
                        >
                          <div className="aspect-video rounded-xl bg-slate-100 overflow-hidden mb-3">
                            {exp.coverUrl ? (
                              <img src={exp.coverUrl.startsWith("http") ? exp.coverUrl : getApiUrl(exp.coverUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400"><Ticket className="h-12 w-12" /></div>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground">{exp.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{exp.category} · {exp.city}</p>
                          {exp.availableDays && <p className="text-xs text-foreground mt-1 flex items-center gap-1"><Clock size={12} /> {exp.availableDays}</p>}
                          {exp.timeRange && <p className="text-xs text-foreground">{exp.timeRange}</p>}
                          <p className="text-sm font-medium text-emerald-600 mt-2">₹{(exp.pricePerPersonCents / 100).toFixed(0)} per person</p>
                        </button>
                        <Button
                          type="button"
                          className="w-full rounded-xl mt-3 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => openExperienceDetail(exp)}
                        >
                          View details & Book
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Events: city + date, cards, book → pay → ticket */}
          {selectedCategory === "events" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-foreground font-medium">City</Label>
                <Select value={eventCity} onValueChange={setEventCity}>
                  <SelectTrigger className="w-[200px] rounded-xl min-w-[160px]">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventCities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="text-foreground font-medium">Date</Label>
                <Input
                  type="date"
                  className="w-[180px] rounded-xl"
                  value={eventDate.slice(0, 10)}
                  onChange={(e) => setEventDate(e.target.value || dateToYYYYMMDD(new Date()))}
                />
                {eventCities.length > 0 && (
                  <p className="text-sm text-muted-foreground">Events on this date (from start to end date) in this city.</p>
                )}
              </div>
              {eventCities.length === 0 && !eventLoading && !eventError && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground">
                  <p className="font-medium text-foreground">No cities with events yet.</p>
                  <p className="text-sm mt-2">In VendorHub add an event listing, verify it, and set it Active. Use the same database for the main app backend.</p>
                </div>
              )}
              {eventError && <p className="text-sm text-destructive">{eventError}</p>}
              {eventLoading && <p className="text-sm text-muted-foreground">Loading events…</p>}
              {!eventLoading && eventList.length === 0 && eventCity && eventDate && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground">
                  <p>No events on this date in this city.</p>
                </div>
              )}
              {!eventLoading && eventList.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">Click an event to view details, choose tickets, and book → pay → get your ticket.</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {eventList.map((ev) => (
                      <div
                        key={ev.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-violet-400 hover:shadow-md transition-all flex flex-col"
                      >
                        <button type="button" onClick={() => openEventDetail(ev)} className="text-left flex-1">
                          <div className="aspect-video rounded-xl bg-slate-100 overflow-hidden mb-3">
                            {ev.coverUrl ? (
                              <img src={ev.coverUrl.startsWith("http") ? ev.coverUrl : getApiUrl(ev.coverUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400"><CalendarDays className="h-12 w-12" /></div>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground">{ev.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.category} · {ev.city}</p>
                          <p className="text-xs text-foreground mt-1 flex items-center gap-1"><MapPin size={12} /> {ev.venueName}</p>
                          <p className="text-xs text-foreground mt-0.5">{ev.startDate}{ev.endDate !== ev.startDate ? ` – ${ev.endDate}` : ""} · {ev.startTime} – {ev.endTime}</p>
                        </button>
                        <Button type="button" className="w-full rounded-xl mt-3 bg-violet-600 hover:bg-violet-700" onClick={() => openEventDetail(ev)}>
                          View details & Book
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Hotel: location → list → select hotel → dates, guest details, requirements → submit */}
          {selectedCategory === "hotel" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-foreground font-medium">City / Location</Label>
                <Input
                  placeholder="e.g. Hyderabad"
                  className="w-[200px] rounded-xl min-w-[160px]"
                  value={hotelCity}
                  onChange={(e) => setHotelCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runHotelSearch())}
                />
                <Button type="button" onClick={runHotelSearch} disabled={hotelLoading} className="rounded-xl">
                  {hotelLoading ? "Searching…" : "Search hotels"}
                </Button>
              </div>
              {hotelError && <p className="text-sm text-destructive">{hotelError}</p>}
              {hotelBookingId && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <p className="text-foreground font-medium">Request sent. The hotel will confirm and allot a room. There is no bill yet — you’ll see your bill and can pay once they approve.</p>
                  <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <Link to="/my-trip">Check status on My Trip</Link>
                  </Button>
                </div>
              )}
              {!hotelLoading && hotelList.length === 0 && hotelCity.trim() && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground">
                  <p>No verified hotels found in this city. Try another city or add hotels in VendorHub and get them verified.</p>
                </div>
              )}
              {!hotelLoading && hotelList.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">Select a hotel to view details and submit a booking request. The hotel will approve and allot a room.</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {hotelList.map((h) => (
                      <div
                        key={h.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-amber-400 hover:shadow-md transition-all flex flex-col"
                      >
                        <button type="button" onClick={() => openHotelDetail(h)} className="text-left flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Hotel className="h-6 w-6 text-amber-600" />
                            <h3 className="font-semibold text-foreground">{h.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">{h.listingName}</p>
                          {h.areaLocality && <p className="text-xs text-foreground mt-1 flex items-center gap-1"><MapPin size={12} /> {h.areaLocality}</p>}
                          {h.city && <p className="text-xs text-foreground">{h.city}</p>}
                          {h.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{h.description}</p>}
                        </button>
                        <Button type="button" className="w-full rounded-xl mt-3 bg-amber-600 hover:bg-amber-700" onClick={() => openHotelDetail(h)}>
                          View details & Book
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Placeholder for other categories (train, bike) */}
          {selectedCategory && selectedCategory !== "bus" && selectedCategory !== "car" && selectedCategory !== "flight" && selectedCategory !== "experience" && selectedCategory !== "events" && selectedCategory !== "hotel" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground">
              <p>{CATEGORIES.find((c) => c.id === selectedCategory)?.label} booking coming soon.</p>
              <p className="text-sm mt-2">Use the categories above or go back to My Trip.</p>
            </div>
          )}
        </div>
      </div>

      {/* Experience detail + slot selection */}
      <Sheet open={experienceDetailOpen} onOpenChange={(o) => !o && (setExperienceDetailOpen(false), setSelectedExperience(null), setSelectedExperienceSlot(null), setExperienceSlots([]))}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Ticket className="h-5 w-5" /> Experience details
            </SheetTitle>
          </SheetHeader>
          {selectedExperience && (
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{selectedExperience.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedExperience.category} · {selectedExperience.city}</p>
                {selectedExperience.shortDescription && (
                  <p className="text-sm text-foreground mt-2">{selectedExperience.shortDescription}</p>
                )}
                {selectedExperience.availableDays && <p className="text-xs text-foreground mt-1"><Clock size={12} className="inline mr-1" />{selectedExperience.availableDays}</p>}
                {selectedExperience.timeRange && <p className="text-xs text-foreground">{selectedExperience.timeRange}</p>}
                <p className="text-sm font-medium text-emerald-600 mt-1">₹{(selectedExperience.pricePerPersonCents / 100).toFixed(0)} per person</p>
              </div>
              <div>
                <Label className="text-foreground">1. Pick a date range and load slots</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="date" value={experienceSlotsFrom} onChange={(e) => setExperienceSlotsFrom(e.target.value)} className="rounded-xl" />
                  <Input type="date" value={experienceSlotsTo} onChange={(e) => setExperienceSlotsTo(e.target.value)} className="rounded-xl" />
                </div>
                <Button type="button" variant="outline" className="rounded-xl mt-2" onClick={fetchExperienceSlots} disabled={experienceSlotsLoading}>
                  {experienceSlotsLoading ? "Loading…" : "Show available slots"}
                </Button>
              </div>
              {experienceSlots.length > 0 && (
                <div>
                  <Label className="text-foreground">2. Select a slot (date & time)</Label>
                  <div className="mt-1 max-h-48 overflow-y-auto space-y-1">
                    {experienceSlots.filter((s) => s.available > 0).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedExperienceSlot(s)}
                        className={`w-full text-left rounded-xl border px-3 py-2 text-sm ${selectedExperienceSlot?.id === s.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
                      >
                        {s.slotDate} · {s.slotTime} — {s.available} left
                      </button>
                    ))}
                  </div>
                  {experienceSlots.filter((s) => s.available > 0).length === 0 && <p className="text-sm text-muted-foreground">No slots available in this range.</p>}
                </div>
              )}
              {selectedExperienceSlot && (
                <div>
                  <Label className="text-foreground">3. Participants & book</Label>
                  <Input type="number" min={1} max={selectedExperience.maxParticipantsPerSlot} value={experienceParticipants} onChange={(e) => setExperienceParticipants(parseInt(e.target.value, 10) || 1)} className="rounded-xl mt-1 w-24" />
                  <p className="text-xs text-muted-foreground mt-1">Total: ₹{((selectedExperience.pricePerPersonCents * experienceParticipants) / 100).toFixed(0)}</p>
                  <Button type="button" className="rounded-xl mt-3 w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleExperienceBook} disabled={!token}>
                    {token ? "Book this slot (then pay & get ticket)" : "Sign in to book"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Hotel detail + proceed to book */}
      <Sheet open={hotelDetailOpen} onOpenChange={(o) => !o && (setHotelDetailOpen(false), setSelectedHotel(null))}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Hotel className="h-5 w-5 text-amber-600" /> Hotel details
            </SheetTitle>
          </SheetHeader>
          {selectedHotel && (
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{selectedHotel.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedHotel.listingName}</p>
                {selectedHotel.fullAddress && <p className="text-sm text-foreground mt-1 flex items-center gap-1"><MapPin size={12} /> {selectedHotel.fullAddress}</p>}
                {selectedHotel.areaLocality && selectedHotel.fullAddress !== selectedHotel.areaLocality && <p className="text-xs text-muted-foreground">{selectedHotel.areaLocality}</p>}
                {selectedHotel.city && <p className="text-xs text-foreground">{selectedHotel.city}</p>}
                {selectedHotel.landmark && <p className="text-xs text-foreground">Landmark: {selectedHotel.landmark}</p>}
                {selectedHotel.contactNumber && <p className="text-xs text-foreground">Contact: {selectedHotel.contactNumber}</p>}
                {selectedHotel.email && <p className="text-xs text-foreground">Email: {selectedHotel.email}</p>}
                {selectedHotel.description && <p className="text-sm text-muted-foreground mt-2">{selectedHotel.description}</p>}
              </div>
              <Button type="button" className="w-full rounded-xl bg-amber-600 hover:bg-amber-700" onClick={openHotelBook}>
                Proceed to book (dates, guest details & requirements)
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Hotel book: dates, guest details, requirements, document links → submit */}
      <Dialog open={hotelBookOpen} onOpenChange={(o) => !o && (setHotelBookOpen(false), setHotelSubmitError(""))}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Hotel className="h-5 w-5 text-amber-600" /> Hotel booking request</DialogTitle>
            <DialogDescription>
              {selectedHotel && <>Request a stay at {selectedHotel.name}. Enter dates, your details and any requirements. The hotel will approve and allot a room.</>}
            </DialogDescription>
          </DialogHeader>
          {selectedHotel && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground">Check-in date</Label>
                  <Input type="date" className="rounded-xl mt-1" value={hotelCheckIn || dateToYYYYMMDD(new Date())} onChange={(e) => setHotelCheckIn(e.target.value)} />
                </div>
                <div>
                  <Label className="text-foreground">Nights</Label>
                  <Input type="number" min={1} max={90} className="rounded-xl mt-1" value={hotelNights} onChange={(e) => setHotelNights(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Check-out: {hotelCheckIn ? addDays(hotelCheckIn, hotelNights) : "—"}</p>
              {/* Room type selection (from hotel's configured room types) */}
              {(selectedHotel.roomTypes?.length ?? 0) > 0 ? (
                <div>
                  <Label className="text-foreground">Room type *</Label>
                  <p className="text-xs text-muted-foreground mt-1">Select the type of room you want. Price is per night.</p>
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                    {selectedHotel.roomTypes.map((room) => {
                      const price = room.pricePerNight ? parseFloat(room.pricePerNight) : NaN;
                      const total = !Number.isNaN(price) && price >= 0 ? price * hotelNights : null;
                      const isSelected = hotelSelectedRoomType?.name === room.name;
                      return (
                        <button
                          key={room.name}
                          type="button"
                          onClick={() => setHotelSelectedRoomType(room)}
                          className={`w-full text-left rounded-xl border p-3 transition-colors ${isSelected ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-medium text-foreground">{room.name}</p>
                              {room.maxOccupancy && <p className="text-xs text-muted-foreground">Max occupancy: {room.maxOccupancy}</p>}
                              {room.amenities && <p className="text-xs text-muted-foreground mt-0.5">{room.amenities}</p>}
                            </div>
                            <div className="shrink-0 text-right">
                              {!Number.isNaN(price) && price >= 0 && (
                                <>
                                  <p className="text-sm font-medium text-foreground">₹{price.toLocaleString("en-IN")}/night</p>
                                  {total != null && <p className="text-xs text-muted-foreground">₹{total.toLocaleString("en-IN")} for {hotelNights} night(s)</p>}
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {hotelSelectedRoomType && hotelSelectedRoomType.pricePerNight && (
                    <p className="text-sm font-medium text-foreground mt-2">
                      Total: ₹{(parseFloat(hotelSelectedRoomType.pricePerNight) * hotelNights).toLocaleString("en-IN")} for {hotelNights} night(s)
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No room types added by this hotel yet. You can still send a request and the hotel will confirm.</p>
              )}
              <div>
                <Label className="text-foreground">Guest name *</Label>
                <Input className="rounded-xl mt-1" placeholder="Full name" value={hotelGuestName} onChange={(e) => setHotelGuestName(e.target.value)} />
              </div>
              <div>
                <Label className="text-foreground">Phone</Label>
                <Input className="rounded-xl mt-1" placeholder="Contact number" value={hotelGuestPhone} onChange={(e) => setHotelGuestPhone(e.target.value)} />
              </div>
              <div>
                <Label className="text-foreground">Email</Label>
                <Input type="email" className="rounded-xl mt-1" placeholder="Email" value={hotelGuestEmail} onChange={(e) => setHotelGuestEmail(e.target.value)} />
              </div>
              <div>
                <Label className="text-foreground">Requirements / special requests</Label>
                <textarea className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm mt-1 resize-y" placeholder="e.g. early check-in, accessibility, diet" value={hotelRequirements} onChange={(e) => setHotelRequirements(e.target.value)} />
              </div>
              <div>
                <Label className="text-foreground flex items-center gap-1"><FileText className="h-4 w-4" /> Document links (if hotel asked for ID, etc.)</Label>
                <p className="text-xs text-muted-foreground mt-1">Add label and URL for each document (e.g. upload elsewhere and paste link).</p>
                <div className="space-y-2 mt-2">
                  {hotelDocUrls.map((d, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input className="rounded-xl flex-1" placeholder="Label" value={d.label} onChange={(e) => setHotelDocUrls((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                      <Input className="rounded-xl flex-1" placeholder="URL" value={d.url} onChange={(e) => setHotelDocUrls((prev) => prev.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                      <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setHotelDocUrls((prev) => prev.filter((_, j) => j !== i))}>Remove</Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setHotelDocUrls((prev) => [...prev, { label: "", url: "" }])}>
                    <Upload className="h-4 w-4 mr-1" /> Add document link
                  </Button>
                </div>
              </div>
              {hotelSubmitError && <p className="text-sm text-destructive">{hotelSubmitError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setHotelBookOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="button" className="rounded-xl bg-amber-600 hover:bg-amber-700" onClick={submitHotelBooking} disabled={hotelSubmitLoading || !token}>
                  {!token ? "Sign in to send request" : hotelSubmitLoading ? "Sending…" : "Send booking request"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Event detail + ticket selection */}
      <Sheet open={eventDetailOpen} onOpenChange={(o) => !o && (setEventDetailOpen(false), setSelectedEvent(null), setEventTicketSelections({}))}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Event details
            </SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{selectedEvent.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedEvent.category} · {selectedEvent.city}</p>
                <p className="text-xs text-foreground mt-1 flex items-center gap-1"><MapPin size={12} /> {selectedEvent.venueName}{selectedEvent.venueAddress ? ` · ${selectedEvent.venueAddress}` : ""}</p>
                <p className="text-xs text-foreground mt-0.5">{selectedEvent.startDate}{selectedEvent.endDate !== selectedEvent.startDate ? ` – ${selectedEvent.endDate}` : ""} · {selectedEvent.startTime} – {selectedEvent.endTime}</p>
                {selectedEvent.description && <p className="text-sm text-foreground mt-2">{selectedEvent.description}</p>}
              </div>
              <div>
                <Label className="text-foreground">Select tickets</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose quantity per ticket type (max per type shown).</p>
                <div className="space-y-3">
                  {selectedEvent.ticketTypes.filter((t) => t.available > 0).map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                      <div>
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">₹{(t.priceCents / 100).toFixed(0)} each · {t.available} left · max {t.maxPerUser} per user</p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={Math.min(t.maxPerUser, t.available)}
                        value={eventTicketSelections[t.id] ?? 0}
                        onChange={(e) => setEventTicketSelections((prev) => ({ ...prev, [t.id]: Math.max(0, Math.min(t.maxPerUser, t.available, parseInt(e.target.value, 10) || 0)) }))}
                        className="w-20 rounded-lg text-center"
                      />
                    </div>
                  ))}
                </div>
                {selectedEvent.ticketTypes.filter((t) => t.available > 0).length === 0 && (
                  <p className="text-sm text-muted-foreground">No tickets available.</p>
                )}
                {selectedEvent.ticketTypes.some((t) => (eventTicketSelections[t.id] ?? 0) > 0) && (
                  <>
                    <p className="text-sm font-medium text-foreground mt-3">
                      Total: ₹{(selectedEvent.ticketTypes.reduce((sum, t) => sum + (eventTicketSelections[t.id] ?? 0) * t.priceCents, 0) / 100).toFixed(0)}
                    </p>
                    <Button type="button" className="rounded-xl mt-3 w-full bg-violet-600 hover:bg-violet-700" onClick={handleEventBook} disabled={!token}>
                      {token ? "Book tickets (then pay & get ticket)" : "Sign in to book"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Event: Book → Pay → Ticket dialog */}
      <Dialog open={eventBookOpen} onOpenChange={(o) => !o && closeEventFlow()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{eventPaymentDone ? "Your ticket" : "Complete payment"}</DialogTitle>
            <DialogDescription>
              {eventPaymentDone ? "Your event booking is confirmed. Download or print your ticket below." : "Pay now to confirm your booking and get your ticket."}
            </DialogDescription>
          </DialogHeader>
          {eventError && <p className="text-sm text-destructive">{eventError}</p>}
          {!eventPaymentDone && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Booking ref: <strong>{eventBookingRef ?? "—"}</strong>
              </p>
              {selectedEvent && (
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.name} · Total ₹{(selectedEvent.ticketTypes.reduce((sum, t) => sum + (eventTicketSelections[t.id] ?? 0) * t.priceCents, 0) / 100).toFixed(0)}
                </p>
              )}
              <Button className="w-full rounded-xl bg-violet-600 hover:bg-violet-700" onClick={handleEventPay} disabled={eventPayLoading}>
                {eventPayLoading ? "Processing…" : "Pay now"}
              </Button>
            </div>
          )}
          {eventPaymentDone && selectedEvent && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking reference</p>
                <p className="text-xl font-mono font-bold text-foreground mt-0.5">{eventBookingRef ?? "—"}</p>
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Event:</span> <strong>{selectedEvent.name}</strong></p>
                  <p><span className="text-muted-foreground">Venue:</span> {selectedEvent.venueName}</p>
                  <p><span className="text-muted-foreground">Date:</span> {selectedEvent.startDate}{selectedEvent.endDate !== selectedEvent.startDate ? ` – ${selectedEvent.endDate}` : ""}</p>
                  <p><span className="text-muted-foreground">Time:</span> {selectedEvent.startTime} – {selectedEvent.endTime}</p>
                  <p><span className="text-muted-foreground">Tickets:</span> {selectedEvent.ticketTypes.filter((t) => (eventTicketSelections[t.id] ?? 0) > 0).map((t) => `${t.name} × ${eventTicketSelections[t.id]}`).join(", ")}</p>
                  <p><span className="text-muted-foreground">Total paid:</span> ₹{(selectedEvent.ticketTypes.reduce((sum, t) => sum + (eventTicketSelections[t.id] ?? 0) * t.priceCents, 0) / 100).toFixed(0)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl flex-1"
                  onClick={() => {
                    const w = window.open("", "_blank", "width=420,height=520");
                    if (!w || !selectedEvent) return;
                    const ref = (eventBookingRef ?? "—").replace(/</g, "&lt;").replace(/&/g, "&amp;");
                    const name = selectedEvent.name.replace(/</g, "&lt;").replace(/&/g, "&amp;");
                    const venue = selectedEvent.venueName.replace(/</g, "&lt;").replace(/&/g, "&amp;");
                    const dateStr = selectedEvent.startDate + (selectedEvent.endDate !== selectedEvent.startDate ? ` – ${selectedEvent.endDate}` : "");
                    const timeStr = `${selectedEvent.startTime} – ${selectedEvent.endTime}`;
                    const amt = (selectedEvent.ticketTypes.reduce((sum, t) => sum + (eventTicketSelections[t.id] ?? 0) * t.priceCents, 0) / 100).toFixed(0);
                    const content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket ${ref}</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,sans-serif;background:#f1f5f9;padding:24px;min-height:100vh;display:flex;align-items:center;justify-content:center}
.ticket{max-width:360px;background:#fff;border:2px solid #0f172a;border-radius:12px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.12)}
.ticket-head{background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);color:#fff;padding:16px 20px;text-align:center}
.ticket-head .brand{font-size:11px;letter-spacing:.2em;opacity:.9}
.ticket-head .title{font-size:18px;font-weight:700;margin:4px 0 0}
.perf{border:none;border-top:2px dashed #cbd5e1;margin:0}
.ticket-body{padding:20px}
.ref-box{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:12px;text-align:center;margin-bottom:16px}
.ref-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#5b21b6;margin:0}
.ref-value{font-size:16px;font-weight:700;font-family:ui-monospace,monospace;color:#0f172a;margin:4px 0 0}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
.row .l{color:#64748b}
.row .r{font-weight:600;color:#0f172a}
.amount{font-size:18px;color:#7c3aed;margin-top:4px}
.barcode{height:36px;background:repeating-linear-gradient(90deg,#0f172a 0,#0f172a 2px,transparent 2px,transparent 6px);margin:16px 0 0}
.ticket-foot{background:#f8fafc;padding:12px 20px;text-align:center;font-size:11px;color:#64748b}
</style></head><body>
<div class="ticket">
  <div class="ticket-head"><div class="brand">WANDERLUST</div><div class="title">Event ticket</div></div>
  <hr class="perf"/>
  <div class="ticket-body">
    <div class="ref-box"><p class="ref-label">Booking reference</p><p class="ref-value">${ref}</p></div>
    <div class="row"><span class="l">Event</span><span class="r">${name}</span></div>
    <div class="row"><span class="l">Venue</span><span class="r">${venue}</span></div>
    <div class="row"><span class="l">Date</span><span class="r">${dateStr}</span></div>
    <div class="row"><span class="l">Time</span><span class="r">${timeStr}</span></div>
    <div class="row"><span class="l">Amount paid</span><span class="r amount">₹${amt}</span></div>
    <div class="barcode" aria-hidden="true"></div>
  </div>
  <div class="ticket-foot">Print or save as PDF · Wanderlust</div>
</div>
</body></html>`;
                    w.document.write(content);
                    w.document.close();
                    w.focus();
                    setTimeout(() => w.print(), 300);
                  }}
                >
                  Download / Print ticket
                </Button>
                <Button className="rounded-xl flex-1" onClick={closeEventFlow}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Experience: Book → Pay → Ticket dialog */}
      <Dialog open={experienceBookOpen} onOpenChange={(o) => !o && closeExperienceFlow()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{experiencePaymentDone ? "Your ticket" : "Complete payment"}</DialogTitle>
            <DialogDescription>
              {experiencePaymentDone ? "Your experience booking is confirmed. Download or print your ticket below." : "Pay now to confirm your booking and get your ticket."}
            </DialogDescription>
          </DialogHeader>
          {experienceError && <p className="text-sm text-destructive">{experienceError}</p>}
          {!experiencePaymentDone && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Booking ref: <strong>{experienceBookingRef ?? "—"}</strong>
              </p>
              <Button className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={handleExperiencePay} disabled={experiencePayLoading}>
                {experiencePayLoading ? "Processing…" : "Pay now"}
              </Button>
            </div>
          )}
          {experiencePaymentDone && selectedExperience && selectedExperienceSlot && (
            <div id="experience-ticket" className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking reference</p>
                <p className="text-xl font-mono font-bold text-foreground mt-0.5">{experienceBookingRef ?? "—"}</p>
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Experience:</span> <strong>{selectedExperience.name}</strong></p>
                  <p><span className="text-muted-foreground">Date:</span> {selectedExperienceSlot.slotDate}</p>
                  <p><span className="text-muted-foreground">Time:</span> {selectedExperienceSlot.slotTime}</p>
                  <p><span className="text-muted-foreground">Participants:</span> {experienceParticipants}</p>
                  <p><span className="text-muted-foreground">Total:</span> ₹{((selectedExperience.pricePerPersonCents * experienceParticipants) / 100).toFixed(0)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl flex-1"
                  onClick={() => {
                    const w = window.open("", "_blank", "width=420,height=520");
                    if (!w) return;
                    const ref = (experienceBookingRef ?? "—").replace(/</g, "&lt;").replace(/&/g, "&amp;");
                    const name = (selectedExperience?.name ?? "").replace(/</g, "&lt;").replace(/&/g, "&amp;");
                    const date = (selectedExperienceSlot?.slotDate ?? "—").replace(/</g, "&lt;");
                    const time = (selectedExperienceSlot?.slotTime ?? "—").replace(/</g, "&lt;");
                    const amt = ((selectedExperience ? selectedExperience.pricePerPersonCents * experienceParticipants : 0) / 100).toFixed(0);
                    const content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket ${ref}</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,sans-serif;background:#f1f5f9;padding:24px;min-height:100vh;display:flex;align-items:center;justify-content:center}
.ticket{max-width:360px;background:#fff;border:2px solid #0f172a;border-radius:12px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.12)}
.ticket-head{background:linear-gradient(135deg,#059669 0%,#047857 100%);color:#fff;padding:16px 20px;text-align:center}
.ticket-head .brand{font-size:11px;letter-spacing:.2em;opacity:.9}
.ticket-head .title{font-size:18px;font-weight:700;margin:4px 0 0}
.perf{border:none;border-top:2px dashed #cbd5e1;margin:0}
.ticket-body{padding:20px}
.ref-box{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;text-align:center;margin-bottom:16px}
.ref-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#166534;margin:0}
.ref-value{font-size:16px;font-weight:700;font-family:ui-monospace,monospace;color:#0f172a;margin:4px 0 0}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
.row:last-child{border-bottom:none}
.row .l{color:#64748b}
.row .r{font-weight:600;color:#0f172a}
.amount{font-size:18px;color:#059669;margin-top:4px}
.barcode{height:36px;background:repeating-linear-gradient(90deg,#0f172a 0,#0f172a 2px,transparent 2px,transparent 6px);margin:16px 0 0}
.ticket-foot{background:#f8fafc;padding:12px 20px;text-align:center;font-size:11px;color:#64748b}
</style></head><body>
<div class="ticket">
  <div class="ticket-head"><div class="brand">WANDERLUST</div><div class="title">Experience ticket</div></div>
  <hr class="perf"/>
  <div class="ticket-body">
    <div class="ref-box"><p class="ref-label">Booking reference</p><p class="ref-value">${ref}</p></div>
    <div class="row"><span class="l">Experience</span><span class="r">${name}</span></div>
    <div class="row"><span class="l">Date</span><span class="r">${date}</span></div>
    <div class="row"><span class="l">Time</span><span class="r">${time}</span></div>
    <div class="row"><span class="l">Participants</span><span class="r">${experienceParticipants}</span></div>
    <div class="row"><span class="l">Amount paid</span><span class="r amount">₹${amt}</span></div>
    <div class="barcode" aria-hidden="true"></div>
  </div>
  <div class="ticket-foot">Print or save as PDF · Wanderlust</div>
</div>
</body></html>`;
                    w.document.write(content);
                    w.document.close();
                    w.focus();
                    setTimeout(() => w.print(), 300);
                  }}
                >
                  Download / Print ticket
                </Button>
                <Button className="rounded-xl flex-1" onClick={closeExperienceFlow}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bus details sidebar */}
      <Sheet open={busDetailsOpen} onOpenChange={(o) => !o && setBusDetailsOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Bus className="h-5 w-5" /> Bus details
            </SheetTitle>
          </SheetHeader>
          {selectedBusForDetails && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selectedBusForDetails.listingName}</p>
                <p className="font-semibold text-foreground mt-0.5">{selectedBusForDetails.busName}</p>
                {(selectedBusForDetails.busNumber || selectedBusForDetails.registrationNumber) && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedBusForDetails.busNumber ?? selectedBusForDetails.registrationNumber ?? ""}
                  </p>
                )}
              </div>
              {(selectedBusForDetails.routeFrom || selectedBusForDetails.routeTo) && (
                <div>
                  <p className="text-xs text-muted-foreground">Route</p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedBusForDetails.routeFrom ?? "—"} → {selectedBusForDetails.routeTo ?? "—"}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Departure · Arrival</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedBusForDetails.departureTime} → {selectedBusForDetails.arrivalTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Seats</p>
                <p className="text-sm font-medium text-foreground">
                  {selectedBusForDetails.availableSeats ?? selectedBusForDetails.totalSeats} of {selectedBusForDetails.totalSeats} available
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedBusForDetails.busType && (
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {formatBusType(selectedBusForDetails.busType)}
                  </span>
                )}
                {selectedBusForDetails.acType && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    <Snowflake className="h-3 w-3" /> {formatAcType(selectedBusForDetails.acType)}
                  </span>
                )}
              </div>
              {(selectedBusForDetails.hasWifi || selectedBusForDetails.hasCharging || selectedBusForDetails.hasEntertainment || selectedBusForDetails.hasToilet) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {selectedBusForDetails.hasWifi && <Wifi className="h-4 w-4" title="WiFi" />}
                  {selectedBusForDetails.hasCharging && <Battery className="h-4 w-4" title="Charging" />}
                  {selectedBusForDetails.hasEntertainment && <Tv className="h-4 w-4" title="Entertainment" />}
                  {selectedBusForDetails.hasToilet && <Droplets className="h-4 w-4" title="Toilet" />}
                </div>
              )}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-muted-foreground">Price per seat</p>
                <p className="text-lg font-semibold text-foreground">
                  ₹ {selectedBusForDetails.pricePerSeatCents != null ? (selectedBusForDetails.pricePerSeatCents / 100).toLocaleString("en-IN") : "—"}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Car details sidebar */}
      <Sheet open={carDetailsOpen} onOpenChange={(o) => !o && setCarDetailsOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Car className="h-5 w-5" /> Car details
            </SheetTitle>
          </SheetHeader>
          {selectedCarForDetails && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selectedCarForDetails.listingName}</p>
                <p className="font-semibold text-foreground mt-0.5">{selectedCarForDetails.carName}</p>
                {selectedCarForDetails.registrationNumber && (
                  <p className="text-sm text-muted-foreground mt-0.5">{selectedCarForDetails.registrationNumber}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type · Seats</p>
                <p className="text-sm font-medium text-foreground capitalize">
                  {selectedCarForDetails.carType} · {selectedCarForDetails.seats} seats
                </p>
              </div>
              {selectedCarForDetails.acType && (
                <div>
                  <p className="text-xs text-muted-foreground">AC</p>
                  <p className="text-sm font-medium text-foreground capitalize">{selectedCarForDetails.acType}</p>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 space-y-1">
                {selectedCarForDetails.baseFareCents != null && selectedCarForDetails.baseFareCents > 0 && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Base fare: </span>
                    <span className="font-medium">₹{(selectedCarForDetails.baseFareCents / 100).toLocaleString("en-IN")}</span>
                  </p>
                )}
                {selectedCarForDetails.pricePerKmCents != null && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Price per km: </span>
                    <span className="font-medium">₹{(selectedCarForDetails.pricePerKmCents / 100).toFixed(2)}/km</span>
                  </p>
                )}
                {(!selectedCarForDetails.baseFareCents || selectedCarForDetails.baseFareCents === 0) && (!selectedCarForDetails.pricePerKmCents || selectedCarForDetails.pricePerKmCents === 0) && (
                  <p className="text-sm text-muted-foreground">Fare as per vendor</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Flight details sidebar (static) */}
      <Sheet open={flightDetailsOpen} onOpenChange={(o) => !o && setFlightDetailsOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Plane className="h-5 w-5" /> Flight details
            </SheetTitle>
          </SheetHeader>
          {selectedFlightForDetails && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="font-semibold text-foreground font-mono">{selectedFlightForDetails.flightNumber}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedFlightForDetails.airlineName} · {selectedFlightForDetails.aircraftType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Route</p>
                <p className="text-sm font-medium text-foreground">{selectedFlightForDetails.fromPlace} → {selectedFlightForDetails.toPlace}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Departure · Arrival</p>
                <p className="text-sm font-medium text-foreground">{selectedFlightForDetails.departureTime} → {selectedFlightForDetails.arrivalTime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Seats</p>
                <p className="text-sm font-medium text-foreground">{selectedFlightForDetails.availableSeats} of {selectedFlightForDetails.totalSeats} available</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {selectedFlightForDetails.hasWifi && <Wifi className="h-4 w-4" title="WiFi" />}
                {selectedFlightForDetails.hasMeal && <span className="text-xs">Meal included</span>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Baggage</p>
                <p className="text-sm font-medium text-foreground">{selectedFlightForDetails.baggageAllowance}</p>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-muted-foreground">Fare per person</p>
                <p className="text-lg font-semibold text-foreground">₹ {(selectedFlightForDetails.fareCents / 100).toLocaleString("en-IN")}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Flight book: passenger details + documents (static UI) */}
      <Dialog open={flightBookOpen} onOpenChange={setFlightBookOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" /> Add passenger details & documents
            </DialogTitle>
            <DialogDescription>
              Add details for all {flightPassengerForms.length} passenger(s). Each passenger needs ID type, number and document upload. You will wait for vendor approval after submitting.
            </DialogDescription>
          </DialogHeader>
          {flightRequestSubmitted ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-medium text-foreground">Request submitted (static UI)</p>
              <p className="text-sm text-muted-foreground mt-1">Backend integration coming soon. Once connected, you will see this booking under My Trip and vendor will see it in Bookings → Flight.</p>
              <Button className="mt-4 rounded-xl" onClick={() => { setFlightBookOpen(false); setSelectedFlightForBook(null); }}>Close</Button>
            </div>
          ) : selectedFlightForBook ? (
            <div className="space-y-6 py-4">
              <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <p className="text-sm font-medium text-foreground">{selectedFlightForBook.flightNumber} · {selectedFlightForBook.airlineName}</p>
                <p className="text-xs text-muted-foreground">{selectedFlightForBook.fromPlace} → {selectedFlightForBook.toPlace} · ₹ {(selectedFlightForBook.fareCents / 100).toLocaleString("en-IN")} × {flightPassengerForms.length} = ₹ {((selectedFlightForBook.fareCents * flightPassengerForms.length) / 100).toLocaleString("en-IN")}</p>
              </div>
              {flightPassengerForms.map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Passenger {index + 1}</p>
                  <div>
                    <Label className="text-xs">Full name</Label>
                    <Input className="mt-1 rounded-lg" placeholder="Full name" value={flightPassengerForms[index]?.fullName ?? ""} onChange={(e) => setFlightPassengerForms((prev) => { const n = [...prev]; n[index] = { ...n[index]!, fullName: e.target.value }; return n; })} />
                  </div>
                  <div>
                    <Label className="text-xs">ID type</Label>
                    <Select value={flightPassengerForms[index]?.idType ?? "aadhaar"} onValueChange={(v) => setFlightPassengerForms((prev) => { const n = [...prev]; n[index] = { ...n[index]!, idType: v }; return n; })}>
                      <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aadhaar">Aadhaar</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="voter_id">Voter ID</SelectItem>
                        <SelectItem value="driving_license">Driving License</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">ID number</Label>
                    <Input className="mt-1 rounded-lg" placeholder="ID number" value={flightPassengerForms[index]?.idNumber ?? ""} onChange={(e) => setFlightPassengerForms((prev) => { const n = [...prev]; n[index] = { ...n[index]!, idNumber: e.target.value }; return n; })} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Upload document (required)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        className="rounded-lg text-sm text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setFlightPassengerForms((prev) => { const n = [...prev]; n[index] = { ...n[index]!, docFileName: file ? file.name : "" }; return n; });
                        }}
                      />
                      {flightPassengerForms[index]?.docFileName && <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={flightPassengerForms[index]?.docFileName}>{flightPassengerForms[index]?.docFileName}</span>}
                    </div>
                  </div>
                </div>
              ))}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" className="rounded-xl" onClick={() => setFlightBookOpen(false)}>Cancel</Button>
                <Button
                  className="rounded-xl"
                  onClick={async () => {
                    const allFilled = flightPassengerForms.every((p) => p.fullName.trim() && p.idNumber.trim() && p.docFileName);
                    if (!allFilled) return;
                    setFlightSubmitError("");
                    const f = selectedFlightForBook!;
                    if (f.listingId && f.flightId && date && token) {
                      try {
                        const travelDate = dateToYYYYMMDD(date);
                        const totalCents = (f.fareCents ?? 0) * flightPassengerForms.length;
                        const passengerDetails = flightPassengerForms.map((p) => ({
                          name: p.fullName.trim(),
                          idType: p.idType,
                          idNumber: p.idNumber.trim(),
                        }));
                        const documents = flightPassengerForms.map((p, i) => ({
                          documentType: "id",
                          fileName: p.docFileName || `passenger-${i + 1}.pdf`,
                          fileUrl: p.docUrl || "https://placeholder.local/doc",
                        }));
                        const { data, error } = await apiFetch<{ id: string; bookingRef: string; status: string }>("/api/flight-bookings", {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                          body: {
                            listingId: f.listingId,
                            flightId: f.flightId,
                            scheduleId: f.scheduleId,
                            routeFrom: f.fromPlace,
                            routeTo: f.toPlace,
                            travelDate,
                            passengers: flightPassengerForms.length,
                            totalCents,
                            passengerDetails,
                            documents,
                          },
                        });
                        if (error || !data?.id) {
                          setFlightSubmitError(error || "Failed to submit booking request");
                          return;
                        }
                        setFlightRequestSubmitted(true);
                      } catch {
                        setFlightSubmitError("Failed to submit booking request");
                      }
                    } else {
                      setFlightRequestSubmitted(true);
                    }
                  }}
                  disabled={!flightPassengerForms.every((p) => p.fullName.trim() && p.idNumber.trim() && p.docFileName)}
                >
                  <Upload className="h-4 w-4 mr-2" /> Submit request
                </Button>
              </DialogFooter>
              {flightSubmitError && (
                <p className="text-sm text-destructive mt-2 text-center">{flightSubmitError}</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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

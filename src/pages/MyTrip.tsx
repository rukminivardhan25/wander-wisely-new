import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Clock,
  IndianRupee,
  Bus,
  Car,
  Plane,
  Utensils,
  Mountain,
  ShoppingBag,
  CalendarDays,
  Sparkle,
  Wrench,
  AlertCircle,
  Calendar as CalendarIcon,
  MapPin,
  Download,
  Wallet,
  Map as MapIcon,
  Plus,
  ChevronRight,
  Train,
  Stethoscope,
  Phone,
  Building2,
  Hotel,
  Play,
  Eye,
  CheckCircle,
  XCircle,
  Star,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredBusBookings, type StoredBusBooking } from "@/lib/bookingsStorage";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { NearbyRestaurantsContent } from "@/pages/NearbyRestaurants";
import { NearbyShoppingContent } from "@/pages/NearbyShopping";
import { NearbyUtilitiesContent } from "@/pages/NearbyUtilities";

/** Car booking from GET /api/car-bookings */
type CarBookingItem = {
  id: string;
  bookingRef: string;
  bookingType: string;
  fromCity?: string;
  toCity?: string;
  city?: string;
  travelDate: string;
  passengers: number;
  status: string;
};

/** Flight booking from GET /api/flight-bookings */
type FlightBookingItem = {
  id: string;
  bookingRef: string;
  listingId: string;
  flightId: string;
  scheduleId?: string;
  routeFrom: string;
  routeTo: string;
  travelDate: string;
  passengers: number;
  totalCents: number;
  status: string;
  otp?: string;
  paidAt?: string;
  createdAt: string;
  allSeatsAssigned?: boolean;
};

/** Experience booking from GET /api/experience-bookings */
type ExperienceBookingItem = {
  id: string;
  bookingRef: string;
  experienceId: string;
  experienceSlotId: string;
  participantsCount: number;
  totalCents: number;
  status: string;
  paidAt?: string;
  createdAt: string;
  slotDate: string;
  slotTime: string;
  experienceName: string;
  experienceCity: string;
};

/** Event booking from GET /api/event-bookings */
type EventBookingItem = {
  id: string;
  bookingRef: string;
  eventId: string;
  totalCents: number;
  status: string;
  paidAt?: string;
  createdAt: string;
  eventName: string;
  eventCity: string;
  venueName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

/** Hotel booking from GET /api/hotel-bookings */
type HotelBookingItem = {
  id: string;
  bookingRef: string;
  hotelBranchId: string;
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestName: string;
  status: string;
  roomNumber?: string;
  totalCents?: number;
  createdAt: string;
};

const CATEGORY_CONFIG: Record<ActivityType, { label: string; icon: JSX.Element; color: string; bg: string }> = {
  transport: { label: "Transport", icon: <Bus className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-500" },
  stay: { label: "Stay", icon: <Plane className="h-4 w-4" />, color: "text-violet-600", bg: "bg-violet-500" },
  food: { label: "Food", icon: <Utensils className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-500" },
  experience: { label: "Experience", icon: <Mountain className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-500" },
  shopping: { label: "Shopping", icon: <ShoppingBag className="h-4 w-4" />, color: "text-green-600", bg: "bg-green-500" },
  events: { label: "Events", icon: <CalendarDays className="h-4 w-4" />, color: "text-rose-600", bg: "bg-rose-500" },
  hidden_gem: { label: "Hidden Gem", icon: <Sparkle className="h-4 w-4" />, color: "text-yellow-600", bg: "bg-yellow-500" },
  local_service: { label: "Local Services", icon: <Wrench className="h-4 w-4" />, color: "text-slate-600", bg: "bg-slate-500" },
  emergency: { label: "Emergency", icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600", bg: "bg-red-500" },
};

type ActivityType =
  | "transport"
  | "stay"
  | "food"
  | "experience"
  | "shopping"
  | "events"
  | "hidden_gem"
  | "local_service"
  | "emergency";

type ActivityItem = {
  time?: string;
  title: string;
  description: string;
  place?: string;
  duration?: string;
  costEstimate?: string;
  activityType?: ActivityType;
};

type ItineraryDay = {
  id: string;
  trip_id: string;
  day_number: number;
  content: {
    summary?: string;
    activities?: ActivityItem[];
    imageUrl?: string;
    imageUrls?: string[];
  };
};

type ActivityStatusItem = { day_number: number; activity_index: number; status: "visited" | "missed" };

type ActiveTripResult = {
  trip: { id: string; origin: string; destination: string; days: number; status?: string; start_date?: string; budget?: string; budget_amount?: number };
  itineraries: ItineraryDay[];
  activity_status?: ActivityStatusItem[];
};

function getDateForDay(startDateStr: string, dayNumber: number): Date {
  const dateOnly = startDateStr.slice(0, 10);
  const d = new Date(dateOnly + "T12:00:00");
  if (Number.isNaN(d.getTime())) return d;
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type Expense = {
  id: string;
  trip_id: string;
  amount: number;
  category: string;
  day_number: number | null;
  note: string;
  created_at: string;
};

const EXPENSE_CATEGORIES = ["Transport", "Food", "Shopping", "Stay", "Experience", "Other"] as const;

/** Map expense category (API) to budget category key used in plan summary. */
function expenseCategoryToKey(category: string): string {
  const map: Record<string, string> = {
    Transport: "transport",
    Food: "food",
    Shopping: "shopping",
    Stay: "stay",
    Experience: "experience",
    Other: "other",
  };
  return map[category] ?? "other";
}

/** Sum actual expenses by category (key matches categoryOrder where possible). */
function sumExpensesByCategory(expenses: Expense[]): Record<string, number> {
  const byCat: Record<string, number> = {};
  expenses.forEach((e) => {
    const key = expenseCategoryToKey(e.category);
    byCat[key] = (byCat[key] ?? 0) + Number(e.amount);
  });
  return byCat;
}

function parseCost(s: string | undefined): number {
  if (!s) return 0;
  const num = s.replace(/[^0-9.]/g, "");
  return parseFloat(num) || 0;
}

/** Max sane cost per activity (1 crore) to avoid one misparsed string blowing up category totals. */
const MAX_SANE_COST_PER_ACTIVITY = 10_000_000;

/** Parse cost range string to [min, max] (for display). Handles "Free", "₹200–₹400", "₹1,000–₹1,500". Never merge digits (e.g. "500 1000" → [500,1000], not 5001000). */
function parseCostRange(s: string | undefined): [number, number] | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  if (/^free$/i.test(t)) return [0, 0];
  const rangeMatch = t.match(/(\d[\d,.]*)\s*[–\-]\s*(\d[\d,.]*)/);
  if (rangeMatch) {
    const min = Math.min(MAX_SANE_COST_PER_ACTIVITY, parseFloat(rangeMatch[1].replace(/,/g, "")) || 0);
    const max = Math.min(MAX_SANE_COST_PER_ACTIVITY, parseFloat(rangeMatch[2].replace(/,/g, "")) || 0);
    return [min, max];
  }
  const parts = t.match(/\d[\d,.]*/g);
  if (parts && parts.length >= 2) {
    const a = Math.min(MAX_SANE_COST_PER_ACTIVITY, parseFloat(parts[0].replace(/,/g, "")) || 0);
    const b = Math.min(MAX_SANE_COST_PER_ACTIVITY, parseFloat(parts[1].replace(/,/g, "")) || 0);
    return [Math.min(a, b), Math.max(a, b)];
  }
  if (parts && parts.length === 1) {
    const n = Math.min(MAX_SANE_COST_PER_ACTIVITY, parseFloat(parts[0].replace(/,/g, "")) || 0);
    return [n, n];
  }
  return null;
}

function sumCostsByCategory(itineraries: ItineraryDay[]): Record<string, number> {
  const byCat: Record<string, number> = {};
  itineraries.forEach((day) => {
    (day.content.activities ?? []).forEach((act) => {
      const cat = act.activityType ?? "experience";
      byCat[cat] = (byCat[cat] ?? 0) + parseCost(act.costEstimate);
    });
  });
  return byCat;
}

/** Per-category min–max from range strings (e.g. "₹200–₹400"). Planned = sum of activity ranges only. */
function rangesByCategory(itineraries: ItineraryDay[]): Record<string, { min: number; max: number }> {
  const byCat: Record<string, { min: number; max: number }> = {};
  itineraries.forEach((day) => {
    (day.content.activities ?? []).forEach((act) => {
      const cat = act.activityType ?? "experience";
      const range = parseCostRange(act.costEstimate);
      if (range) {
        if (!byCat[cat]) byCat[cat] = { min: range[0], max: range[1] };
        else {
          byCat[cat].min += range[0];
          byCat[cat].max += range[1];
        }
      }
    });
  });
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    let totalMin = 0, totalMax = 0;
    Object.values(byCat).forEach((r) => { totalMin += r.min; totalMax += r.max; });
    let activityMin = 0, activityMax = 0;
    itineraries.forEach((day) => {
      (day.content.activities ?? []).forEach((act) => {
        const r = parseCostRange(act.costEstimate);
        if (r) { activityMin += r[0]; activityMax += r[1]; }
      });
    });
    if (Math.abs(totalMin - activityMin) > 1 || Math.abs(totalMax - activityMax) > 1) {
      console.error("Invalid category budget calculation: category sums do not match activity sums", { totalMin, totalMax, activityMin, activityMax });
    }
  }
  return byCat;
}

function totalEstimatedCost(itineraries: ItineraryDay[]): number {
  let sum = 0;
  itineraries.forEach((day) => {
    (day.content.activities ?? []).forEach((act) => {
      sum += parseCost(act.costEstimate);
    });
  });
  return sum;
}

const MyTrip = () => {
  const { tripId: routeTripId } = useParams<{ tripId?: string }>();
  const location = useLocation();
  const isReadOnly = Boolean(routeTripId);
  const [data, setData] = useState<ActiveTripResult | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>("Food");
  const [expenseDay, setExpenseDay] = useState<string>("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(undefined);
  const [startDateSetting, setStartDateSetting] = useState(false);
  const [storedBusBookings, setStoredBusBookings] = useState<StoredBusBooking[]>([]);
  const [carBookings, setCarBookings] = useState<CarBookingItem[]>([]);
  const [carDetailModalOpen, setCarDetailModalOpen] = useState(false);
  const [carDetailData, setCarDetailData] = useState<{
    booking: { bookingRef: string; bookingType: string; fromCity?: string; toCity?: string; city?: string; pickupPoint?: string; dropPoint?: string; travelDate: string; passengers: number; totalCents?: number; status: string; otp?: string };
    car?: { name: string; registrationNumber?: string; carType?: string; seats?: number; acType?: string; manufacturer?: string; model?: string };
    drivers?: { name: string | null; phone: string | null; licenseNumber: string }[];
  } | null>(null);
  const [carDetailLoading, setCarDetailLoading] = useState(false);
  const [carDetailBookingId, setCarDetailBookingId] = useState<string | null>(null);
  const [carCancelId, setCarCancelId] = useState<string | null>(null);
  const [flightBookings, setFlightBookings] = useState<FlightBookingItem[]>([]);
  const [experienceBookings, setExperienceBookings] = useState<ExperienceBookingItem[]>([]);
  const [eventBookings, setEventBookings] = useState<EventBookingItem[]>([]);
  const [hotelBookings, setHotelBookings] = useState<HotelBookingItem[]>([]);
  const [flightSeatModalOpen, setFlightSeatModalOpen] = useState(false);
  const [flightSeatBookingId, setFlightSeatBookingId] = useState<string | null>(null);
  const [flightSeatMap, setFlightSeatMap] = useState<{
    seatLayout: { rows: number; colsPerRow: number; totalSeats: number; leftCols: number; rightCols: number; cabinClasses: Array<{ name: string; rowFrom: string; rowTo: string }> };
    seats: Array<{ rowLetter: string; colNumber: number; label: string; status: string }>;
  } | null>(null);
  const [flightSeatClass, setFlightSeatClass] = useState<string>("");
  const [flightSeatSelection, setFlightSeatSelection] = useState<Record<number, string>>({});
  const [flightSeatCurrentPassenger, setFlightSeatCurrentPassenger] = useState(0);
  const [flightSeatSaving, setFlightSeatSaving] = useState(false);
  const [flightTicketModalOpen, setFlightTicketModalOpen] = useState(false);
  const [flightTicketData, setFlightTicketData] = useState<{
    bookingRef: string;
    otp: string;
    verificationCode: string;
    flight: { flightNumber: string; airlineName: string; routeFrom: string; routeTo: string; travelDate: string; departureTime: string; arrivalTime: string };
    passengers: Array<{ name: string; seatNumber: string }>;
  } | null>(null);
  const [flightTicketLoading, setFlightTicketLoading] = useState(false);
  const [flightPayId, setFlightPayId] = useState<string | null>(null);
  const [flightPaymentModalOpen, setFlightPaymentModalOpen] = useState(false);
  const [flightPaymentBookingId, setFlightPaymentBookingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | null>(null);
  const [experiencePayId, setExperiencePayId] = useState<string | null>(null);
  const [eventPayId, setEventPayId] = useState<string | null>(null);
  const [hotelPayId, setHotelPayId] = useState<string | null>(null);
  const [experienceTicketModalOpen, setExperienceTicketModalOpen] = useState(false);
  const [experienceTicketData, setExperienceTicketData] = useState<ExperienceBookingItem | null>(null);
  const [eventTicketModalOpen, setEventTicketModalOpen] = useState(false);
  const [eventTicketData, setEventTicketData] = useState<EventBookingItem | null>(null);
  const [bookingsFilterDate, setBookingsFilterDate] = useState<string>("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ category: string; id: string; name: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const bookingsFilterDateNorm = bookingsFilterDate.trim().slice(0, 10) || null;
  const normDate = (s: string) => (s || "").slice(0, 10);
  const filteredEventBookings = bookingsFilterDateNorm
    ? eventBookings.filter((b) => normDate(b.startDate) <= bookingsFilterDateNorm && bookingsFilterDateNorm <= normDate(b.endDate))
    : eventBookings;
  const filteredExperienceBookings = bookingsFilterDateNorm
    ? experienceBookings.filter((b) => normDate(b.slotDate) === bookingsFilterDateNorm)
    : experienceBookings;
  const filteredFlightBookings = bookingsFilterDateNorm
    ? flightBookings.filter((b) => normDate(b.travelDate) === bookingsFilterDateNorm)
    : flightBookings;
  const filteredCarBookings = bookingsFilterDateNorm
    ? carBookings.filter((b) => normDate(b.travelDate) === bookingsFilterDateNorm)
    : carBookings;
  const filteredHotelBookings = bookingsFilterDateNorm
    ? hotelBookings.filter((b) => normDate(b.checkIn) <= bookingsFilterDateNorm && normDate(b.checkOut) >= bookingsFilterDateNorm)
    : hotelBookings;
  const filteredStoredBusBookings = bookingsFilterDateNorm
    ? storedBusBookings.filter((b) => normDate(b.travelDate) === bookingsFilterDateNorm)
    : storedBusBookings;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const url = isReadOnly && routeTripId ? `/api/trips/${routeTripId}` : "/api/trips/active";
    apiFetch<ActiveTripResult>(url, { headers: { Authorization: `Bearer ${token}` } }).then(({ data: resData, status }) => {
      if (!cancelled) {
        setLoading(false);
        if (status === 200 && resData) setData(resData);
      }
    });
    return () => { cancelled = true; };
  }, [token, isReadOnly, routeTripId]);

  useEffect(() => {
    const day = (location.state as { selectedDay?: number } | null)?.selectedDay;
    if (data && typeof day === "number" && day >= 1 && day <= (data.trip?.days ?? 1)) {
      setSelectedDay(day);
    }
  }, [data?.trip?.days, location.state]);

  useEffect(() => {
    if (!token || !data?.trip?.id) return;
    let cancelled = false;
    apiFetch<{ expenses: Expense[] }>(`/api/trips/${data.trip.id}/expenses`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: resData }) => {
      if (!cancelled && resData?.expenses) setExpenses(resData.expenses);
    });
    return () => { cancelled = true; };
  }, [token, data?.trip?.id]);

  const activeTripId = data?.trip?.id ?? null;

  const loadBookings = useCallback(() => {
    if (!token) {
      setStoredBusBookings(getStoredBusBookings());
      setCarBookings([]);
      setFlightBookings([]);
      setExperienceBookings([]);
      setEventBookings([]);
      setHotelBookings([]);
      return;
    }
    const tripQuery = activeTripId ? `?trip_id=${encodeURIComponent(activeTripId)}` : "";
    apiFetch<{ bookings: StoredBusBooking[] }>(`/api/bookings${tripQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: res }) => {
      setStoredBusBookings(res?.bookings ?? []);
    }).catch(() => setStoredBusBookings([]));
    apiFetch<{ bookings: HotelBookingItem[] }>(`/api/hotel-bookings${tripQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: res }) => {
      setHotelBookings(res?.bookings ?? []);
    }).catch(() => setHotelBookings([]));
    if (!activeTripId) {
      setCarBookings([]);
      setFlightBookings([]);
      setExperienceBookings([]);
      setEventBookings([]);
      return;
    }
    apiFetch<{ bookings: CarBookingItem[] }>(`/api/car-bookings${tripQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: res }) => {
      const list = res?.bookings ?? [];
      setCarBookings(
        list.map((b) => ({
          ...b,
          travelDate: typeof b.travelDate === "string" && b.travelDate.length >= 10 ? b.travelDate.slice(0, 10) : String(b.travelDate).slice(0, 10),
        }))
      );
    }).catch(() => setCarBookings([]));
    apiFetch<{ bookings: FlightBookingItem[] }>(`/api/flight-bookings${tripQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: res }) => {
      const list = res?.bookings ?? [];
      setFlightBookings(
        list.map((b) => ({
          ...b,
          travelDate: typeof b.travelDate === "string" && b.travelDate.length >= 10 ? b.travelDate.slice(0, 10) : String(b.travelDate).slice(0, 10),
        }))
      );
    }).catch(() => setFlightBookings([]));
    apiFetch<{ bookings: ExperienceBookingItem[] }>(`/api/experience-bookings${tripQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: res }) => {
      setExperienceBookings(res?.bookings ?? []);
    }).catch(() => setExperienceBookings([]));
    apiFetch<{ bookings: EventBookingItem[] }>(`/api/event-bookings${tripQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: res }) => {
      setEventBookings(res?.bookings ?? []);
    }).catch(() => setEventBookings([]));
  }, [token, activeTripId]);

  useEffect(() => {
    if (loading) return;
    loadBookings();
    window.addEventListener("focus", loadBookings);
    return () => window.removeEventListener("focus", loadBookings);
  }, [loadBookings, loading]);

  const openCarDetail = useCallback(
    (bookingId: string) => {
      if (!token) return;
      setCarDetailBookingId(bookingId);
      setCarDetailLoading(true);
      setCarDetailData(null);
      setCarDetailModalOpen(true);
      apiFetch<{
        bookingRef: string;
        bookingType: string;
        fromCity?: string;
        toCity?: string;
        city?: string;
        pickupPoint?: string;
        dropPoint?: string;
        travelDate: string;
        passengers: number;
        totalCents?: number;
        status: string;
        otp?: string;
        car?: { name: string; registrationNumber?: string; carType?: string; seats?: number; acType?: string; manufacturer?: string; model?: string };
        drivers?: { name: string | null; phone: string | null; licenseNumber: string }[];
      }>(`/api/car-bookings/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data: d }) => {
          if (d)
            setCarDetailData({
              booking: { bookingRef: d.bookingRef, bookingType: d.bookingType, fromCity: d.fromCity, toCity: d.toCity, city: d.city, pickupPoint: d.pickupPoint, dropPoint: d.dropPoint, travelDate: d.travelDate, passengers: d.passengers, totalCents: d.totalCents, status: d.status, otp: d.otp },
              car: d.car,
              drivers: d.drivers,
            });
        })
        .catch(() => setCarDetailData(null))
        .finally(() => setCarDetailLoading(false));
    },
    [token]
  );

  const cancelCarBooking = useCallback(
    async (bookingId: string) => {
      if (!token) return;
      setCarCancelId(bookingId);
      try {
        await apiFetch(`/api/car-bookings/${bookingId}/cancel`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
        setCarBookings((prev) => prev.filter((b) => b.id !== bookingId));
        setCarDetailModalOpen(false);
        setCarDetailData(null);
        setCarDetailBookingId(null);
        toast({ title: "Booking cancelled", description: "Your car booking request has been cancelled." });
      } catch {
        toast({ title: "Failed to cancel", description: "Could not cancel the booking.", variant: "destructive" });
      } finally {
        setCarCancelId(null);
      }
    },
    [token, toast]
  );

  const openFlightSeatModal = useCallback(
    async (bookingId: string) => {
      if (!token) return;
      setFlightSeatBookingId(bookingId);
      setFlightSeatMap(null);
      setFlightSeatSelection({});
      setFlightSeatCurrentPassenger(0);
      setFlightSeatClass("");
      setFlightSeatModalOpen(true);
      try {
        const { data } = await apiFetch<{
          seatLayout: {
            useVendorLayout?: boolean;
            rows?: number;
            colsPerRow?: number;
            totalSeats?: number;
            leftCols?: number;
            rightCols?: number;
            cabinClasses: Array<{ name: string; rowFrom: string; rowTo: string; leftCols?: number; rightCols?: number }>;
          };
          seats: Array<{ rowLetter?: string; rowNumber?: number; colNumber: number; label: string; status: string }>;
        }>(`/api/flight-bookings/${bookingId}/seat-map`, { headers: { Authorization: `Bearer ${token}` } });
        if (data) {
          setFlightSeatMap(data);
          setFlightSeatClass(data.seatLayout.cabinClasses?.[0]?.name ?? "Economy");
        }
      } catch {
        setFlightSeatMap(null);
      }
    },
    [token]
  );

  const saveFlightSeats = useCallback(async () => {
    if (!token || !flightSeatBookingId || !flightSeatMap) return;
    const arr = Object.entries(flightSeatSelection).map(([idx, label]) => ({
      passengerIndex: parseInt(idx, 10) + 1,
      label: String(label).trim().toUpperCase(),
    }));
    if (arr.length === 0) {
      toast({ title: "Select seats", description: "Click on available seats to assign each passenger.", variant: "destructive" });
      return;
    }
    setFlightSeatSaving(true);
    try {
      await apiFetch(`/api/flight-bookings/${flightSeatBookingId}/seats`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: { seats: arr },
      });
      toast({ title: "Seats saved", description: "You can now pay for your booking." });
      setFlightSeatModalOpen(false);
      setFlightSeatBookingId(null);
      setFlightSeatMap(null);
      setFlightSeatSelection({});
      loadBookings();
    } catch {
      toast({ title: "Failed to save seats", variant: "destructive" });
    } finally {
      setFlightSeatSaving(false);
    }
  }, [token, flightSeatBookingId, flightSeatMap, flightSeatSelection, loadBookings, toast]);

  const openFlightTicket = useCallback(
    async (bookingId: string) => {
      if (!token) return;
      setFlightTicketLoading(true);
      setFlightTicketData(null);
      setFlightTicketModalOpen(true);
      try {
        const { data } = await apiFetch<{
          bookingRef: string;
          otp: string;
          verificationCode: string;
          flight: { flightNumber: string; airlineName: string; routeFrom: string; routeTo: string; travelDate: string; departureTime: string; arrivalTime: string };
          passengers: Array<{ name: string; seatNumber: string }>;
        }>(`/api/flight-bookings/${bookingId}/ticket`, { headers: { Authorization: `Bearer ${token}` } });
        setFlightTicketData(data ?? null);
      } catch {
        setFlightTicketData(null);
      } finally {
        setFlightTicketLoading(false);
      }
    },
    [token]
  );

  const downloadFlightTicket = useCallback((data: {
    bookingRef: string;
    otp: string;
    verificationCode: string;
    flight: { flightNumber: string; airlineName: string; routeFrom: string; routeTo: string; travelDate: string; departureTime: string; arrivalTime: string };
    passengers: Array<{ name: string; seatNumber: string }>;
  }) => {
    const passengersRows = data.passengers.map((p) => `<tr><td style="padding:8px 12px;font-weight:500">${escapeHtml(p.name)}</td><td style="padding:8px 12px;font-family:monospace;font-weight:600;color:#4338ca">${escapeHtml(p.seatNumber || "—")}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Flight ticket - ${escapeHtml(data.bookingRef)}</title><style>
      *{box-sizing:border-box} body{margin:0;font-family:system-ui,sans-serif;background:#f1f5f9;padding:24px;color:#0f172a}
      .ticket{max-width:420px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)}
      .head{background:linear-gradient(135deg,#4f46e5,#2563eb,#06b6d4);color:#fff;padding:24px 28px}
      .head h1{margin:0;font-size:1.5rem;font-weight:700} .head .ref{font-size:12px;opacity:.9;margin-top:8px;font-family:monospace}
      .route{display:flex;align-items:center;gap:16px;padding:20px;background:#f8fafc;border:1px solid #e2e8f0;margin:16px;border-radius:12px}
      .route .col{flex:1;text-align:center} .route .col small{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
      .route .col strong{display:block;margin-top:4px} .route .col span{font-size:14px;color:#64748b}
      .route .plane{width:40px;height:40px;border-radius:50%;background:#e0e7ff;color:#4338ca;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      table{width:100%;border-collapse:collapse;font-size:14px}
      th{text-align:left;padding:10px 16px;background:#f8fafc;color:#64748b;font-weight:500;border-bottom:1px solid #e2e8f0}
      td{border-bottom:1px solid #f1f5f9;padding:10px 16px}
      .otp{background:#fffbeb;border:2px solid #fcd34d;border-radius:12px;padding:20px;text-align:center;margin:16px}
      .otp small{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#92400e}
      .otp .code{font-size:28px;font-weight:700;font-family:monospace;letter-spacing:6px;color:#78350f;margin:8px 0}
      .otp .ver{font-size:11px;color:#a16207;word-break:break-all}
    </style></head><body><div class="ticket">
      <div class="head"><p style="margin:0;font-size:14px;opacity:.9">Boarding pass</p><h1>${escapeHtml(data.flight.airlineName)}</h1><p class="ref">Ref: ${escapeHtml(data.bookingRef)}</p></div>
      <div class="route"><div class="col"><small>From</small><strong>${escapeHtml(data.flight.routeFrom)}</strong><span>${escapeHtml(data.flight.departureTime)}</span></div><div class="plane">✈</div><div class="col"><small>To</small><strong>${escapeHtml(data.flight.routeTo)}</strong><span>${escapeHtml(data.flight.arrivalTime)}</span></div></div>
      <div style="margin:0 16px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><div style="padding:12px 16px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:600">Flight ${escapeHtml(data.flight.flightNumber)} · ${escapeHtml(data.flight.travelDate)}</div><table><thead><tr><th>Passenger</th><th>Seat</th></tr></thead><tbody>${passengersRows}</tbody></table></div>
      <div class="otp"><small>Show at gate</small><div class="code">${escapeHtml(data.otp)}</div><p class="ver">Verification: ${escapeHtml(data.verificationCode)}</p></div>
    </div></body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 300);
    } else {
      document.body.removeChild(iframe);
      toast({ title: "Download failed", description: "Could not open print preview.", variant: "destructive" });
    }
  }, [toast]);

  function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  const downloadExperienceTicket = useCallback((data: ExperienceBookingItem) => {
    const ref = escapeHtml(data.bookingRef);
    const name = escapeHtml(data.experienceName);
    const date = escapeHtml(data.slotDate);
    const time = escapeHtml(data.slotTime);
    const amt = (data.totalCents / 100).toFixed(0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket ${ref}</title>
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
  <div class="ticket-head"><div class="brand">WANDERLY</div><div class="title">Experience ticket</div></div>
  <hr class="perf"/>
  <div class="ticket-body">
    <div class="ref-box"><p class="ref-label">Booking reference</p><p class="ref-value">${ref}</p></div>
    <div class="row"><span class="l">Experience</span><span class="r">${name}</span></div>
    <div class="row"><span class="l">Date</span><span class="r">${date}</span></div>
    <div class="row"><span class="l">Time</span><span class="r">${time}</span></div>
    <div class="row"><span class="l">Participants</span><span class="r">${data.participantsCount}</span></div>
    <div class="row"><span class="l">Amount paid</span><span class="r amount">₹${amt}</span></div>
    <div class="barcode" aria-hidden="true"></div>
  </div>
  <div class="ticket-foot">Print or save as PDF · Wanderly</div>
</div>
</body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 300);
    } else {
      document.body.removeChild(iframe);
      toast({ title: "Download failed", description: "Could not open print preview.", variant: "destructive" });
    }
  }, [toast]);

  const flightPay = useCallback(
    async (bookingId: string) => {
      if (!token) return;
      setFlightPayId(bookingId);
      try {
        const { data, error } = await apiFetch<{ ok: boolean; status: string; otp: string }>(`/api/flight-bookings/${bookingId}/pay`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!error && data?.status === "confirmed") {
          toast({ title: "Payment confirmed", description: "Your flight booking is confirmed." });
          loadBookings();
        } else {
          toast({ title: "Payment failed", description: error ?? "Try again.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Payment failed", variant: "destructive" });
      } finally {
        setFlightPayId(null);
      }
    },
    [token, loadBookings, toast]
  );

  const experiencePay = useCallback(
    async (bookingId: string) => {
      if (!token) return;
      setExperiencePayId(bookingId);
      try {
        const { error } = await apiFetch(`/api/experience-bookings/${bookingId}/pay`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!error) {
          toast({ title: "Payment confirmed", description: "Your experience booking is confirmed. You can view your ticket below." });
          loadBookings();
        } else {
          toast({ title: "Payment failed", description: error, variant: "destructive" });
        }
      } catch {
        toast({ title: "Payment failed", variant: "destructive" });
      } finally {
        setExperiencePayId(null);
      }
    },
    [token, loadBookings, toast]
  );

  const eventPay = useCallback(
    async (bookingId: string) => {
      if (!token) return;
      setEventPayId(bookingId);
      try {
        const { error } = await apiFetch(`/api/event-bookings/${bookingId}/pay`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!error) {
          toast({ title: "Payment confirmed", description: "Your event booking is confirmed. You can view your ticket below." });
          loadBookings();
        } else {
          toast({ title: "Payment failed", description: error, variant: "destructive" });
        }
      } catch {
        toast({ title: "Payment failed", variant: "destructive" });
      } finally {
        setEventPayId(null);
      }
    },
    [token, loadBookings, toast]
  );

  const downloadEventTicket = useCallback((data: EventBookingItem) => {
    const ref = escapeHtml(data.bookingRef);
    const name = escapeHtml(data.eventName);
    const venue = escapeHtml(data.venueName);
    const dateStr = data.startDate + (data.endDate !== data.startDate ? ` – ${data.endDate}` : "");
    const timeStr = `${data.startTime} – ${data.endTime}`;
    const amt = (data.totalCents / 100).toFixed(0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket ${ref}</title>
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
  <div class="ticket-head"><div class="brand">WANDERLY</div><div class="title">Event ticket</div></div>
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
  <div class="ticket-foot">Print or save as PDF · Wanderly</div>
</div>
</body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 300);
    } else {
      document.body.removeChild(iframe);
      toast({ title: "Download failed", description: "Could not open print preview.", variant: "destructive" });
    }
  }, [toast]);

  /** Delete car booking from database; it will not appear again when the page is reopened. */
  const deleteCarBooking = useCallback(
    async (bookingId: string) => {
      if (!token) return;
      setCarCancelId(bookingId);
      try {
        const { error, status } = await apiFetch(`/api/car-bookings/${bookingId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if (!error && (status === 200 || status === 204)) {
          setCarBookings((prev) => prev.filter((b) => b.id !== bookingId));
          setCarDetailModalOpen(false);
          setCarDetailData(null);
          setCarDetailBookingId(null);
          toast({ title: "Booking removed", description: "The booking has been deleted and will no longer appear in your list." });
        } else {
          toast({ title: "Failed to delete", description: error ?? "Could not delete the booking.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Failed to delete", description: "Could not delete the booking.", variant: "destructive" });
      } finally {
        setCarCancelId(null);
      }
    },
    [token, toast]
  );

  const setActivityStatus = useCallback(
    async (tripId: string, dayNumber: number, activityIndex: number, status: "visited" | "missed") => {
      if (!token) return;
      const { error } = await apiFetch(`/api/trips/${tripId}/activity-status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: { day_number: dayNumber, activity_index: activityIndex, status },
      });
      if (error) {
        toast({ title: "Could not update", description: error, variant: "destructive" });
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        const list = prev.activity_status ?? [];
        const rest = list.filter((a) => !(a.day_number === dayNumber && a.activity_index === activityIndex));
        return { ...prev, activity_status: [...rest, { day_number: dayNumber, activity_index: activityIndex, status }] };
      });
    },
    [token, toast]
  );

  if (!token) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center px-4">
            <p className="text-muted-foreground mb-4">Sign in to view your trip.</p>
            <Button asChild variant="hero">
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-muted-foreground">Loading your trip…</p>
        </section>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center px-4 max-w-md">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              {isReadOnly ? "Trip not found" : "No active trip"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isReadOnly ? "This trip may have been removed or you don’t have access." : "Plan a trip and choose \"Make This My Trip\" to see it here."}
            </p>
            <Button asChild variant="hero">
              <Link to={isReadOnly ? "/my-trips" : "/plan-trip"}>{isReadOnly ? "Back to My Trips" : "Plan a trip"}</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  if (!data.trip) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center px-4 max-w-md">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">No active trip</h2>
            <p className="text-muted-foreground mb-6">
              Plan a trip and choose &quot;Make This My Trip&quot; to see it here.
            </p>
            <Button asChild variant="hero">
              <Link to="/plan-trip">Plan a trip</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const totalDays = data.itineraries.length;
  const currentDayData = data.itineraries[selectedDay - 1] ?? data.itineraries[0];
  const dayImage = currentDayData ? (currentDayData.content.imageUrls?.[0] ?? currentDayData.content.imageUrl) : undefined;
  const totalBudget = Math.max(
    data.trip.budget_amount ?? totalEstimatedCost(data.itineraries),
    1
  );
  const spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = Math.max(0, totalBudget - spent);
  const budgetByCat = sumCostsByCategory(data.itineraries);
  const spentByCat = sumExpensesByCategory(expenses);
  const rangesByCat = rangesByCategory(data.itineraries);
  const categoryOrder: ActivityType[] = ["transport", "stay", "food", "experience", "shopping", "events", "emergency", "local_service", "hidden_gem"];
  const categoryOrderWithOther = [...categoryOrder, "other"] as (ActivityType | "other")[];

  const todayStr = toLocalDateString(new Date());
  const activityStatusMap: Record<string, "visited" | "missed"> = {};
  (data.activity_status ?? []).forEach((a) => {
    activityStatusMap[`${a.day_number}-${a.activity_index}`] = a.status;
  });
  const getActivityStatus = (dayNum: number, activityIndex: number): "visited" | "missed" | null =>
    activityStatusMap[`${dayNum}-${activityIndex}`] ?? null;

  type DayState = "past" | "today" | "upcoming";
  const getDayState = (dayNum: number): DayState | null => {
    const start = data.trip.start_date;
    if (!start) return null;
    const dayDate = getDateForDay(start, dayNum);
    const dateStr = toLocalDateString(dayDate);
    if (dateStr < todayStr) return "past";
    if (dateStr === todayStr) return "today";
    return "upcoming";
  };
  const currentDayState = getDayState(selectedDay);
  const isCurrentDay = currentDayState === "today";

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/80">
        {isReadOnly && (
          <div className="px-4 pt-20 pb-2 max-w-6xl mx-auto">
            <Link to="/my-trips" className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ChevronRight className="h-4 w-4 rotate-180" /> Back to My Trips
            </Link>
          </div>
        )}
        {/* ——— TOP SECTION: Trip Overview Header ——— */}
        <section className={cn("pb-6 px-4", isReadOnly ? "pt-2" : "pt-20")}>
          <div
            className="max-w-6xl mx-auto rounded-[20px] overflow-hidden shadow-lg bg-white border border-slate-200/80"
            style={{
              backgroundImage: dayImage ? `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%), url(${dayImage})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="p-6 md:p-8 bg-gradient-to-b from-black/50 to-black/30">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  {isReadOnly ? (
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-500/90 text-white text-xs font-semibold mb-2">Past Trip</span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold mb-2">Active</span>
                  )}
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-white drop-shadow-md">
                    {data.trip.destination}
                  </h1>
                  <p className="text-white/90 text-sm mt-1">
                    {data.trip.origin} → {data.trip.destination} · {data.trip.days}-day trip
                  </p>
                </div>
                {!isReadOnly && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className={`bg-white/90 text-slate-800 hover:bg-white shadow-md rounded-xl gap-1.5 ${!data.trip.start_date ? "opacity-80" : ""}`}
                      title={!data.trip.start_date ? "Set your trip start date first (use the calendar below)" : undefined}
                      onClick={() => {
                        if (!data.trip.start_date) {
                          toast({
                            title: "Select the date",
                            description: "Set your trip start date using the calendar below, then you can add expenses.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setExpenseAmount("");
                        setExpenseCategory("Food");
                        setExpenseDay("");
                        setExpenseNote("");
                        setAddExpenseOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add Expense
                    </Button>
                    <Button size="sm" variant="secondary" className="bg-white/90 text-slate-800 hover:bg-white shadow-md rounded-xl gap-1.5">
                      <MapIcon className="h-4 w-4" /> View Map
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-white/90" />
                    <span className="text-white/80 text-sm">Total budget</span>
                    <span className="font-semibold text-white">₹ {totalBudget.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/80 text-sm">Spent</span>
                    <span className="font-semibold text-white">₹ {spent.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/80 text-sm">Remaining</span>
                    <span className="font-semibold text-emerald-300">₹ {remaining.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (spent / totalBudget) * 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ——— MIDDLE SECTION: 60/40 Split ——— */}
        <section className="px-4 pb-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* LEFT: Calendar + Timeline */}
            <div className="space-y-4">
              <div className="bg-white rounded-[20px] shadow-md border border-slate-200/80 p-4 overflow-hidden">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-500" /> Trip days
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1 min-w-0 w-full sm:min-w-0">
                    <div className="grid grid-cols-5 gap-3 w-full">
                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                        const startDate = data.trip.start_date;
                        const dayDate = startDate ? getDateForDay(startDate, d) : null;
                        const dateLabel =
                          dayDate && !Number.isNaN(dayDate.getTime())
                            ? dayDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                            : null;
                        const state = getDayState(d);
                        const isSelected = selectedDay === d;
                        const cardBg =
                          !state
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : state === "past"
                              ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                              : state === "today"
                                ? "bg-orange-500 text-white"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDay(d)}
                            className={cn(
                              "w-full aspect-square min-w-[3.25rem] max-h-20 rounded-xl text-base font-semibold transition-all shadow-sm flex flex-col items-center justify-center gap-0.5",
                              cardBg,
                              isSelected && state !== "today" && "ring-2 ring-slate-400 dark:ring-slate-500 scale-105",
                              isSelected && state === "today" && "ring-2 ring-orange-300 scale-105"
                            )}
                          >
                            <span>{d}</span>
                            {dateLabel && <span className="text-[10px] opacity-90 leading-tight">{dateLabel}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-slate-400 mr-1 align-middle" /> Past &nbsp;
                      <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1 align-middle" /> Today &nbsp;
                      <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-1 align-middle" /> Upcoming
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-2 -mt-1 sm:-mt-2">
                    <p className="text-sm font-medium text-foreground text-center">Select the starting date of the trip</p>
                    <div className="scale-75 origin-top sm:scale-90">
                      <DateCalendar
                        mode="single"
                        selected={data.trip.start_date ? getDateForDay(data.trip.start_date, 1) : calendarSelectedDate}
                        onSelect={(date) => {
                          if (data.trip.start_date) return;
                          setCalendarSelectedDate(date);
                        }}
                        disabled={!!data.trip.start_date}
                        className="rounded-xl border border-slate-200 p-2"
                        classNames={{
                          months: "space-y-0",
                          month: "space-y-1",
                          caption_label: "text-xs",
                          head_cell: "w-7 text-[0.6rem] text-muted-foreground",
                          cell: "h-7 w-7 text-center p-0",
                          day: "h-7 w-7 p-0 text-[0.7rem]",
                          nav_button: "h-6 w-6",
                        }}
                      />
                    </div>
                    {!data.trip.start_date && calendarSelectedDate && (
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 w-full"
                        disabled={startDateSetting}
                        onClick={async () => {
                          if (!token || !data?.trip?.id) return;
                          const startDateStr = toLocalDateString(calendarSelectedDate);
                          setStartDateSetting(true);
                          const { error, status } = await apiFetch(`/api/trips/${data.trip.id}`, {
                            method: "PATCH",
                            headers: { Authorization: `Bearer ${token}` },
                            body: { start_date: startDateStr },
                          });
                          setStartDateSetting(false);
                          if (error || status !== 200) {
                            toast({ title: "Could not set start date", description: error ?? "Try again.", variant: "destructive" });
                            return;
                          }
                          setData((prev) =>
                            prev ? { ...prev, trip: { ...prev.trip, start_date: startDateStr } } : null
                          );
                          setCalendarSelectedDate(undefined);
                          toast({ title: "Trip started", description: `Your trip starts on ${calendarSelectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.` });
                        }}
                      >
                        <Play className="h-4 w-4" />
                        {startDateSetting ? "Starting…" : `Start trip from ${calendarSelectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </Button>
                    )}
                    {data.trip.start_date && (
                      <p className="text-xs text-muted-foreground text-center">
                        Started {getDateForDay(data.trip.start_date, 1).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[20px] shadow-md border border-slate-200/80 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-foreground">Day {selectedDay} — Activities</h3>
                </div>
                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 scrollbar-overlay">
                  {(currentDayData?.content.activities ?? []).map((act, j) => {
                    const type = (act.activityType && CATEGORY_CONFIG[act.activityType] ? act.activityType : "experience") as ActivityType;
                    const cfg = CATEGORY_CONFIG[type];
                    const status = getActivityStatus(selectedDay, j);
                    const displayStatus: "visited" | "missed" | null =
                      currentDayState === "past" && !status ? "missed" : status;
                    const isGreyed = displayStatus === "visited" || displayStatus === "missed";
                    return (
                      <button
                        key={j}
                        type="button"
                        onClick={() =>
                          navigate("/plan-trip/activity", {
                            state: {
                              trip: data.trip,
                              dayNumber: selectedDay,
                              activity: act,
                              activityIndex: j,
                              daySummary: currentDayData?.content.summary,
                              fullResult: { trip: data.trip, itineraries: data.itineraries },
                              returnTo: "my-plan",
                            },
                          })
                        }
                        className={cn(
                          "w-full flex items-center gap-4 p-4 text-left transition-colors rounded-xl mx-1 my-1 hover:opacity-90 cursor-pointer",
                          isGreyed && "bg-slate-100 dark:bg-slate-800/50"
                        )}
                      >
                        {displayStatus ? (
                          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                            {displayStatus === "visited" ? (
                              <CheckCircle className="h-6 w-6 text-emerald-600" />
                            ) : (
                              <XCircle className="h-6 w-6 text-red-600" />
                            )}
                          </div>
                        ) : (
                          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} text-white`}>
                            {cfg.icon}
                          </div>
                        )}
                        <span className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{act.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{act.time ?? "—"}</span>
                            {act.place && (
                              <>
                                <span>·</span>
                                <MapPin className="h-3 w-3 inline" /> {act.place}
                              </>
                            )}
                          </p>
                        </span>
                        <div className="shrink-0 text-right">
                          {act.costEstimate && (
                            <p className="text-sm font-medium text-foreground">{act.costEstimate}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {displayStatus === "visited" ? "Visited" : displayStatus === "missed" ? "Missed" : "Upcoming"}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground shrink-0 self-center">View details</span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: Two separate cards — Budget (trip-level) then Planner (day-level) */}
            <div className="lg:sticky lg:top-24 self-start space-y-4">
              {/* Card 1: Budget by Category — trip-level, does not change with day */}
              <div className="bg-white rounded-[20px] shadow-lg border border-slate-200/80 p-5 overflow-hidden">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Budget by category</h3>
                <p className="text-[10px] text-muted-foreground mb-3">Planned = AI estimated ranges. Spent = actual expenses added by you.</p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 scrollbar-overlay">
                  {categoryOrderWithOther.filter((c) => (rangesByCat[c]?.min !== undefined || (budgetByCat[c] ?? 0) > 0 || (spentByCat[c] ?? 0) > 0)).map((cat) => {
                    const cfg = cat === "other" ? { label: "Other", icon: <Wallet className="h-4 w-4" />, color: "text-slate-600", bg: "bg-slate-500" } : CATEGORY_CONFIG[cat];
                    const range = rangesByCat[cat];
                    const plannedMax = range ? range.max : 0;
                    const spentVal = spentByCat[cat] ?? 0;
                    const plannedLabel = range
                      ? range.min === 0 && range.max === 0
                        ? "Free"
                        : `₹${Math.round(range.min).toLocaleString("en-IN")}–₹${Math.round(range.max).toLocaleString("en-IN")}`
                      : "—";
                    const progressDenom = Math.max(plannedMax, 1);
                    const pct = Math.min(100, (spentVal / progressDenom) * 100);
                    const overBudget = plannedMax > 0 && spentVal > plannedMax;
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-1.5 text-xs mb-0.5">
                          <span className="text-muted-foreground flex items-center gap-1 shrink-0">{cfg.icon} {cfg.label}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
                          <span>Spent: <span className="font-medium text-foreground">₹{Math.round(spentVal).toLocaleString("en-IN")}</span></span>
                          <span>Planned: <span className="font-medium text-foreground">{plannedLabel}</span></span>
                        </div>
                        {(plannedMax > 0 || spentVal > 0) && (
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${overBudget ? "bg-orange-500" : cfg.bg}`}
                              style={{ width: `${overBudget ? 100 : pct}%` }}
                            />
                          </div>
                        )}
                        {overBudget && (
                          <p className="text-[10px] text-orange-600 font-medium mt-0.5">Over planned budget</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Planner Summary — day-specific */}
              <div className="bg-white rounded-[20px] shadow-lg border border-slate-200/80 overflow-hidden flex flex-col">
                <h3 className="font-semibold text-foreground mb-3 p-5 pb-0 shrink-0">Planner summary</h3>
                <div className="p-5 pt-3 max-h-80 overflow-y-auto scrollbar-overlay pr-1 flex-1 min-h-0">
                  <div className="mb-3">
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Day</label>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>Day {d}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {currentDayData?.content.summary ?? `${data.trip.days}-day trip from ${data.trip.origin} to ${data.trip.destination}.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                    className="text-sm font-medium text-accent hover:underline mb-2"
                  >
                    {summaryCollapsed ? "Show" : "Hide"} activities
                  </button>
                  {!summaryCollapsed && (
                    <ul className="space-y-2 pr-1">
                    {(currentDayData?.content.activities ?? []).map((act, i) => {
                      const status = getActivityStatus(selectedDay, i);
                      const displayStatus = currentDayState === "past" && !status ? "missed" : status;
                      const canTick = isCurrentDay && !displayStatus && !isReadOnly;
                      return (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                          {canTick ? (
                            <span className="shrink-0 flex gap-1">
                              <button
                                type="button"
                                aria-label="Mark visited"
                                className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                onClick={() => setActivityStatus(data.trip.id, selectedDay, i, "visited")}
                              >
                                Visited
                              </button>
                              <button
                                type="button"
                                aria-label="Mark missed"
                                className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                onClick={() => setActivityStatus(data.trip.id, selectedDay, i, "missed")}
                              >
                                Missed
                              </button>
                            </span>
                          ) : displayStatus ? (
                            <span className="shrink-0">
                              {displayStatus === "visited" ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </span>
                          ) : null}
                          <span className="truncate flex-1 min-w-0">
                            <span>{act.time ?? "—"}</span> {act.title}
                          </span>
                        </li>
                      );
                    })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ——— BOTTOM SECTION: Tabs ——— */}
        <section className="px-4 pb-16 max-w-6xl mx-auto">
          <div className="bg-white rounded-[20px] shadow-md border border-slate-200/80 overflow-hidden">
            <Tabs defaultValue="bookings" className="w-full">
              <div className="border-b border-slate-200 bg-slate-50/50 px-4 pt-2">
                <TabsList className="h-auto flex-wrap bg-transparent gap-1 p-0 border-0">
                  <TabsTrigger value="bookings" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Bookings</TabsTrigger>
                  <TabsTrigger value="restaurants" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Restaurants</TabsTrigger>
                  <TabsTrigger value="shopping" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Shopping</TabsTrigger>
                  <TabsTrigger value="nearby" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Nearby</TabsTrigger>
                </TabsList>
              </div>
              <div className="p-4">
                <TabsContent value="bookings" className="mt-0">
                  <div className="mb-6 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <h3 className="text-lg font-semibold text-foreground">My Bookings</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Label htmlFor="bookings-date-filter" className="text-xs text-muted-foreground whitespace-nowrap">Show for date</Label>
                        <Input
                          id="bookings-date-filter"
                          type="date"
                          value={bookingsFilterDate}
                          onChange={(e) => setBookingsFilterDate(e.target.value)}
                          className="w-[140px] rounded-lg h-9"
                        />
                        {bookingsFilterDate && (
                          <Button type="button" variant="ghost" size="sm" className="rounded-lg h-9 text-xs" onClick={() => setBookingsFilterDate("")}>
                            Clear
                          </Button>
                        )}
                        {!isReadOnly && (
                          <Button asChild variant="hero" size="sm" className="rounded-xl gap-2 shrink-0">
                            <Link to="/my-trip/book">
                              <Plus className="h-4 w-4" />
                              Book transport, stay & more
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                    {bookingsFilterDateNorm && (
                      <p className="text-sm text-muted-foreground">
                        Showing only bookings for <span className="font-medium text-foreground">{bookingsFilterDateNorm}</span>. Events: live on this date; others: travel/slot on this date.
                      </p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredStoredBusBookings.map((b) => {
                      const { bookedAt: _, ...stateForSuccess } = b;
                      const busName = `${b.routeFrom} → ${b.routeTo}`;
                      return (
                        <div key={b.bookingId} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex gap-3 relative">
                          <button
                            type="button"
                            onClick={() => { setReviewTarget({ category: "Bus", id: b.bookingId, name: busName }); setReviewModalOpen(true); }}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Leave a review for this booking"
                            aria-label="Leave a review"
                          >
                            <Star className="h-5 w-5" />
                          </button>
                          <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                            <Bus className="h-6 w-6 text-slate-600" />
                          </div>
                          <div className="min-w-0 flex-1 pr-8">
                            <p className="font-medium text-foreground truncate">{busName}</p>
                            <p className="text-xs text-muted-foreground">Bus · {b.travelDate}</p>
                            <p className="text-xs mt-1 text-amber-600">Confirmed</p>
                            <Button asChild size="sm" variant="outline" className="mt-2 rounded-lg text-xs">
                              <Link to="/my-trip/booking-success" state={stateForSuccess}>View ticket</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredCarBookings.map((b) => {
                      const title = b.bookingType === "intercity" && b.fromCity && b.toCity
                        ? `${b.fromCity} → ${b.toCity}`
                        : b.city ?? "Car rental";
                      const statusLabel =
                        b.status === "pending_vendor"
                          ? "Pending approval"
                          : b.status === "approved_awaiting_payment"
                            ? "Pay now"
                            : b.status === "confirmed"
                              ? "Completed"
                              : b.status === "rejected"
                                ? "Rejected"
                                : "Awaiting payment";
                      return (
                        <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex gap-3 relative">
                          <button
                            type="button"
                            onClick={() => { setReviewTarget({ category: "Car", id: b.id, name: title }); setReviewModalOpen(true); }}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Leave a review"
                            aria-label="Leave a review"
                          >
                            <Star className="h-5 w-5" />
                          </button>
                          <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                            <Car className="h-6 w-6 text-slate-600" />
                          </div>
                          <div className="min-w-0 flex-1 pr-8">
                            <p className="font-medium text-foreground truncate">{title}</p>
                            <p className="text-xs text-muted-foreground">Car · {b.travelDate}</p>
                            <p className={`text-xs mt-1 flex items-center gap-1 ${b.status === "confirmed" ? "text-emerald-600" : "text-amber-600"}`}>
                              {b.status === "confirmed" && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                              {statusLabel}
                            </p>
                            <Button type="button" size="sm" variant="outline" className="mt-2 rounded-lg text-xs" onClick={() => openCarDetail(b.id)}>
                              Check status
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredFlightBookings.map((b) => {
                      const statusLabel =
                        b.status === "pending_vendor"
                          ? "Pending approval"
                          : b.status === "approved_awaiting_payment"
                            ? (b.allSeatsAssigned ? "Seats selected — pay to confirm" : "Select seats, then pay")
                            : b.status === "confirmed"
                              ? "Confirmed"
                              : b.status === "rejected"
                                ? "Rejected"
                                : "Awaiting payment";
                      return (
                        <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex gap-3 relative">
                          <button
                            type="button"
                            onClick={() => { setReviewTarget({ category: "Flight", id: b.id, name: `${b.routeFrom} → ${b.routeTo}` }); setReviewModalOpen(true); }}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Leave a review"
                            aria-label="Leave a review"
                          >
                            <Star className="h-5 w-5" />
                          </button>
                          <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                            <Plane className="h-6 w-6 text-slate-600" />
                          </div>
                          <div className="min-w-0 flex-1 pr-8">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-foreground truncate">{b.routeFrom} → {b.routeTo}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Flight · {b.travelDate} · {b.passengers} passenger{b.passengers !== 1 ? "s" : ""}</p>
                            <p className={`text-xs mt-1 flex items-center gap-1 ${b.status === "confirmed" ? "text-emerald-600" : "text-amber-600"}`}>
                              {b.status === "confirmed" && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                              {statusLabel}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {!isReadOnly && b.status === "approved_awaiting_payment" && (
                                <Button type="button" size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => openFlightSeatModal(b.id)}>
                                  {b.allSeatsAssigned ? "Change seats" : "Select seats"}
                                </Button>
                              )}
                              {!isReadOnly && b.status === "approved_awaiting_payment" && (
                                <Button type="button" size="sm" variant="hero" className="rounded-lg text-xs" disabled={flightPayId === b.id || !b.allSeatsAssigned} onClick={() => { setFlightPaymentBookingId(b.id); setPaymentMethod(null); setFlightPaymentModalOpen(true); }} title={!b.allSeatsAssigned ? "Select seats for all passengers first" : undefined}>
                                  {flightPayId === b.id ? "Processing…" : "Pay now"}
                                </Button>
                              )}
                              {(b.status === "confirmed" || (isReadOnly && b.status === "approved_awaiting_payment")) && (
                                <Button type="button" size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => openFlightTicket(b.id)}>
                                  View ticket
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredExperienceBookings.map((b) => {
                      const isPaid = !!b.paidAt;
                      const statusLabel = b.status === "cancelled" ? "Cancelled" : b.status === "completed" ? "Completed" : isPaid ? "Confirmed" : "Pay to confirm";
                      return (
                        <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex gap-3 relative">
                          <button
                            type="button"
                            onClick={() => { setReviewTarget({ category: "Experience", id: b.id, name: b.experienceName }); setReviewModalOpen(true); }}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Leave a review"
                            aria-label="Leave a review"
                          >
                            <Star className="h-5 w-5" />
                          </button>
                          <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                            <Mountain className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1 pr-8">
                            <p className="font-medium text-foreground truncate">{b.experienceName}</p>
                            <p className="text-xs text-muted-foreground">Experience · {b.slotDate} · {b.slotTime} · {b.participantsCount} participant{b.participantsCount !== 1 ? "s" : ""}</p>
                            <p className={`text-xs mt-1 flex items-center gap-1 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                              {isPaid && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                              {statusLabel}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {!isReadOnly && !isPaid && b.status !== "cancelled" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="hero"
                                  className="rounded-lg text-xs"
                                  disabled={experiencePayId === b.id}
                                  onClick={() => experiencePay(b.id)}
                                >
                                  {experiencePayId === b.id ? "Processing…" : "Pay now"}
                                </Button>
                              )}
                              {isPaid && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg text-xs"
                                  onClick={() => {
                                    setExperienceTicketData(b);
                                    setExperienceTicketModalOpen(true);
                                  }}
                                >
                                  View ticket
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredEventBookings.map((b) => {
                      const isPaid = !!b.paidAt;
                      const statusLabel = b.status === "cancelled" ? "Cancelled" : b.status === "completed" ? "Completed" : isPaid ? "Confirmed" : "Pay to confirm";
                      return (
                        <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex gap-3 relative">
                          <button
                            type="button"
                            onClick={() => { setReviewTarget({ category: "Event", id: b.id, name: b.eventName }); setReviewModalOpen(true); }}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Leave a review"
                            aria-label="Leave a review"
                          >
                            <Star className="h-5 w-5" />
                          </button>
                          <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                            <CalendarDays className="h-6 w-6 text-violet-600" />
                          </div>
                          <div className="min-w-0 flex-1 pr-8">
                            <p className="font-medium text-foreground truncate">{b.eventName}</p>
                            <p className="text-xs text-muted-foreground">Event · {b.venueName} · {b.startDate}{b.endDate !== b.startDate ? ` – ${b.endDate}` : ""} · {b.startTime} – {b.endTime}</p>
                            <p className={`text-xs mt-1 flex items-center gap-1 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                              {isPaid && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                              {statusLabel}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {!isReadOnly && !isPaid && b.status !== "cancelled" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="hero"
                                  className="rounded-lg text-xs"
                                  disabled={eventPayId === b.id}
                                  onClick={() => eventPay(b.id)}
                                >
                                  {eventPayId === b.id ? "Processing…" : "Pay now"}
                                </Button>
                              )}
                              {isPaid && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg text-xs"
                                  onClick={() => {
                                    setEventTicketData(b);
                                    setEventTicketModalOpen(true);
                                  }}
                                >
                                  View ticket
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredHotelBookings.map((b) => {
                      const status = (b.status || "").trim().toLowerCase();
                      const canPay = status === "approved_awaiting_payment" || status === "approved" || (status.includes("approved") && status.includes("awaiting"));
                      const statusLabel =
                        status === "pending_vendor"
                          ? "Pending approval"
                          : canPay
                            ? "Bill ready — Pay now"
                            : status === "confirmed"
                              ? "Confirmed"
                              : status === "rejected"
                                ? "Rejected"
                                : "Awaiting payment";
                      return (
                        <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex gap-3 relative">
                          <button
                            type="button"
                            onClick={() => { setReviewTarget({ category: "Hotel", id: b.id, name: "Hotel stay" }); setReviewModalOpen(true); }}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Leave a review"
                            aria-label="Leave a review"
                          >
                            <Star className="h-5 w-5" />
                          </button>
                          <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <Hotel className="h-6 w-6 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1 pr-8">
                            <p className="font-medium text-foreground truncate">Hotel stay</p>
                            <p className="text-xs text-muted-foreground">Hotel · {normDate(b.checkIn)} – {normDate(b.checkOut)} · {b.nights} night{b.nights !== 1 ? "s" : ""}</p>
                            <p className={`text-xs mt-1 flex items-center gap-1 ${canPay ? "text-blue-600" : status === "confirmed" ? "text-emerald-600" : status === "rejected" ? "text-red-600" : "text-amber-600"}`}>
                              {(canPay || status === "confirmed") && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                              {statusLabel}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {status === "pending_vendor" && (
                                <Button asChild size="sm" variant="outline" className="rounded-lg text-xs">
                                  <Link to={`/my-trip/hotel-booking/${b.id}`}>View request</Link>
                                </Button>
                              )}
                              {canPay && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="hero"
                                    className="rounded-lg text-xs shrink-0 min-w-[7rem]"
                                    disabled={hotelPayId === b.id}
                                    onClick={async () => {
                                      if (!token || !b.id) return;
                                      setHotelPayId(b.id);
                                      try {
                                        await apiFetch(`/api/hotel-bookings/${b.id}/pay`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
                                        loadBookings();
                                        toast({ title: "Payment recorded", description: "Your hotel booking is confirmed." });
                                      } catch {
                                        toast({ title: "Payment failed", description: "Could not complete payment.", variant: "destructive" });
                                      } finally {
                                        setHotelPayId(null);
                                      }
                                    }}
                                  >
                                    {hotelPayId === b.id ? "Processing…" : "Pay now"}
                                  </Button>
                                  <Button asChild size="sm" variant="outline" className="rounded-lg text-xs">
                                    <Link to={`/my-trip/hotel-booking/${b.id}`}>View bill</Link>
                                  </Button>
                                </>
                              )}
                              {status === "confirmed" && (
                                <Button asChild size="sm" variant="hero" className="rounded-lg text-xs">
                                  <Link to={`/my-trip/hotel-booking/${b.id}`}>View receipt</Link>
                                </Button>
                              )}
                              {/* Fallback: if status is not pending/confirmed/rejected but user might need to pay, show link to bill/receipt page */}
                              {!status.startsWith("pending") && status !== "confirmed" && status !== "rejected" && !canPay && (
                                <Button asChild size="sm" variant="outline" className="rounded-lg text-xs">
                                  <Link to={`/my-trip/hotel-booking/${b.id}`}>View bill / receipt</Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredStoredBusBookings.length === 0 && filteredCarBookings.length === 0 && filteredFlightBookings.length === 0 && filteredExperienceBookings.length === 0 && filteredEventBookings.length === 0 && filteredHotelBookings.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-full">
                        {bookingsFilterDateNorm ? `No bookings for ${bookingsFilterDateNorm}. Try another date or clear the filter.` : "No bookings yet. Book transport, hotel, experiences, or events to see your tickets here."}
                      </p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="restaurants" className="mt-0">
                  <NearbyRestaurantsContent
                    showBackLink={false}
                    defaultLocation={data?.trip?.destination ?? ""}
                    compact={true}
                  />
                </TabsContent>
                <TabsContent value="shopping" className="mt-0">
                  <NearbyShoppingContent
                    showBackLink={false}
                    defaultLocation={data?.trip?.destination ?? ""}
                    compact={true}
                  />
                </TabsContent>
                <TabsContent value="nearby" className="mt-0">
                  <NearbyUtilitiesContent
                    showBackLink={false}
                    defaultLocation={data?.trip?.destination ?? ""}
                    compact={true}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </section>

        {/* Add Expense modal: two cards side by side */}
        <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
          <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row flex-1 min-h-0">
              {/* Side card: Your expenses */}
              <div className="w-full sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50/80 p-4 flex flex-col">
                <h3 className="text-sm font-semibold text-foreground mb-2">Your expenses</h3>
                {expenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No expenses yet. Add one on the right.</p>
                ) : (
                  <>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
                      {expenses.map((e) => (
                        <div key={e.id} className="flex justify-between gap-2 py-1.5 text-sm border-b border-slate-200/80 last:border-0">
                          <div className="min-w-0">
                            <span className="font-medium text-foreground">{e.category}</span>
                            {(e.note || e.day_number != null) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {e.note && e.note}
                                {e.note && e.day_number != null && " · "}
                                {e.day_number != null && `Day ${e.day_number}`}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-foreground shrink-0">₹ {Number(e.amount).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 mt-2 border-t border-slate-200">
                      Total spent: <span className="font-semibold text-foreground">₹ {spent.toLocaleString("en-IN")}</span>
                    </p>
                  </>
                )}
              </div>

              {/* Main card: Add expense form */}
              <div className="flex-1 p-6 flex flex-col min-w-0">
                <DialogHeader className="p-0 mb-4">
                  <DialogTitle>Add expense</DialogTitle>
                  <DialogDescription>Record spending for this trip. It will update your budget summary.</DialogDescription>
                </DialogHeader>
                <form
              onSubmit={async (e) => {
                e.preventDefault();
                const amount = parseFloat(expenseAmount.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(amount) || amount <= 0) {
                  toast({ title: "Invalid amount", description: "Enter a valid amount.", variant: "destructive" });
                  return;
                }
                if (!token || !data?.trip?.id) return;
                setExpenseSubmitting(true);
                const { data: resData, error, status } = await apiFetch<{ expense: Expense }>(
                  `/api/trips/${data.trip.id}/expenses`,
                  {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: {
                      amount,
                      category: expenseCategory,
                      day_number: expenseDay ? Number(expenseDay) : undefined,
                      note: expenseNote.trim() || undefined,
                    },
                  }
                );
                setExpenseSubmitting(false);
                if (error || status !== 201) {
                  toast({ title: "Could not add expense", description: error ?? "Try again.", variant: "destructive" });
                  return;
                }
                if (resData?.expense) setExpenses((prev) => [resData.expense, ...prev]);
                setAddExpenseOpen(false);
                setExpenseAmount("");
                setExpenseNote("");
                toast({ title: "Expense added", description: `₹ ${amount.toLocaleString("en-IN")} recorded.` });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="expense-amount">Amount (₹)</Label>
                <Input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 500"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="rounded-xl mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="expense-category">Category</Label>
                <select
                  id="expense-category"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as (typeof EXPENSE_CATEGORIES)[number])}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm mt-1"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="expense-day">Day (optional)</Label>
                <select
                  id="expense-day"
                  value={expenseDay}
                  onChange={(e) => setExpenseDay(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm mt-1"
                >
                  <option value="">Not linked to a day</option>
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>Day {d}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="expense-note">Note (optional)</Label>
                <Input
                  id="expense-note"
                  type="text"
                  placeholder="e.g. Lunch at café"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  className="rounded-xl mt-1"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddExpenseOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="hero" disabled={expenseSubmitting} className="rounded-xl">
                  {expenseSubmitting ? "Adding…" : "Add expense"}
                </Button>
              </DialogFooter>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Car booking details modal (ticket + car + drivers) — car service only */}
        <Dialog open={carDetailModalOpen} onOpenChange={(o) => !o && (setCarDetailModalOpen(false), setCarDetailData(null), setCarDetailBookingId(null))}>
          <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" /> Car booking details
              </DialogTitle>
            </DialogHeader>
            {carDetailLoading && <p className="text-sm text-muted-foreground py-4">Loading…</p>}
            {!carDetailLoading && carDetailData && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Ticket</h4>
                  <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Ref:</span> <span className="font-mono">{carDetailData.booking.bookingRef}</span></p>
                    <p><span className="text-muted-foreground">Date:</span> {carDetailData.booking.travelDate}</p>
                    <p><span className="text-muted-foreground">Route:</span>{" "}
                      {carDetailData.booking.bookingType === "intercity"
                        ? `${carDetailData.booking.fromCity ?? "—"} → ${carDetailData.booking.toCity ?? "—"}`
                        : carDetailData.booking.city ?? (carDetailData.booking.pickupPoint && carDetailData.booking.dropPoint ? `${carDetailData.booking.pickupPoint} → ${carDetailData.booking.dropPoint}` : "—")}
                    </p>
                    <p><span className="text-muted-foreground">Passengers:</span> {carDetailData.booking.passengers}</p>
                    <p><span className="text-muted-foreground">Amount:</span>{" "}
                      {carDetailData.booking.totalCents != null ? `₹ ${(carDetailData.booking.totalCents / 100).toLocaleString("en-IN")}` : "—"}
                    </p>
                    <p><span className="text-muted-foreground">Status:</span>{" "}
                      {carDetailData.booking.status === "confirmed"
                        ? "Completed"
                        : carDetailData.booking.status === "approved_awaiting_payment"
                          ? "Awaiting payment"
                          : carDetailData.booking.status === "pending_vendor"
                            ? "Pending approval"
                            : carDetailData.booking.status === "rejected"
                              ? "Rejected"
                              : carDetailData.booking.status.replace(/_/g, " ")}
                    </p>
                    {carDetailData.booking.otp && <p><span className="text-muted-foreground">OTP:</span> <span className="font-mono font-semibold">{carDetailData.booking.otp}</span></p>}
                  </div>
                </div>
                {carDetailData.car && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Car</h4>
                    <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Name:</span> {carDetailData.car.name}</p>
                      {carDetailData.car.registrationNumber && <p><span className="text-muted-foreground">Registration:</span> {carDetailData.car.registrationNumber}</p>}
                      {(carDetailData.car.carType || carDetailData.car.seats != null) && <p><span className="text-muted-foreground">Type / Seats:</span> {[carDetailData.car.carType, carDetailData.car.seats != null ? `${carDetailData.car.seats} seats` : ""].filter(Boolean).join(" · ")}</p>}
                      {carDetailData.car.acType && <p><span className="text-muted-foreground">AC:</span> {carDetailData.car.acType}</p>}
                      {(carDetailData.car.manufacturer || carDetailData.car.model) && <p><span className="text-muted-foreground">Model:</span> {[carDetailData.car.manufacturer, carDetailData.car.model].filter(Boolean).join(" ")}</p>}
                    </div>
                  </div>
                )}
                {carDetailData.drivers && carDetailData.drivers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Drivers</h4>
                    <div className="space-y-3">
                      {carDetailData.drivers.map((d, i) => (
                        <div key={i} className="rounded-xl bg-slate-50 p-4 space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Name:</span> {d.name ?? "—"}</p>
                          <p><span className="text-muted-foreground">Phone:</span> {d.phone ?? "—"}</p>
                          <p><span className="text-muted-foreground">License:</span> {d.licenseNumber}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(carDetailData.booking.status === "pending_vendor" || carDetailData.booking.status === "approved_awaiting_payment") && carDetailBookingId && (
                  <div className="pt-2 border-t">
                    <Button asChild size="sm" variant="outline" className="rounded-lg w-full">
                      <Link to="/my-trip/book" state={{ carBookingId: carDetailBookingId }} onClick={() => setCarDetailModalOpen(false)}>
                        Pay or manage on Book page
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
            {!carDetailLoading && !carDetailData && carDetailModalOpen && <p className="text-sm text-muted-foreground py-4">Could not load details.</p>}
          </DialogContent>
        </Dialog>

        {/* Flight seat selection modal */}
        <Dialog open={flightSeatModalOpen} onOpenChange={(o) => !o && (setFlightSeatModalOpen(false), setFlightSeatBookingId(null), setFlightSeatMap(null), setFlightSeatSelection({}), setFlightSeatClass(""))}>
          <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby={undefined}>
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-lg font-semibold">Select seats</DialogTitle>
              <DialogDescription>
                Choose cabin class, then click an available seat for each passenger. Layout: window · seats · aisle · seats · window.
              </DialogDescription>
            </DialogHeader>
            {flightSeatMap && flightSeatBookingId && (() => {
              const passengers = flightBookings.find((b) => b.id === flightSeatBookingId)?.passengers ?? 1;
              const currentPassenger = Math.min(flightSeatCurrentPassenger, passengers - 1);
              const assigned = Object.keys(flightSeatSelection).length;
              const layout = flightSeatMap.seatLayout;
              const cabinClasses = layout.cabinClasses ?? [{ name: "Economy", rowFrom: "A", rowTo: String.fromCharCode(64 + (layout.rows ?? 30)), leftCols: 3, rightCols: 3 }];
              const selectedClass = cabinClasses.find((c) => c.name === flightSeatClass) ?? cabinClasses[0];
              const useVendorLayout = layout.useVendorLayout && flightSeatMap.seats.some((s) => s.rowNumber != null);
              const leftCols = selectedClass.leftCols ?? layout.leftCols ?? Math.floor((layout.colsPerRow ?? 6) / 2);
              const rightCols = selectedClass.rightCols ?? layout.rightCols ?? (layout.colsPerRow ?? 6) - leftCols;

              let seatsByRow: Map<string, typeof flightSeatMap.seats>;
              let rowKeys: string[];
              if (useVendorLayout) {
                const rowFrom = parseInt(selectedClass.rowFrom, 10) || 1;
                const rowTo = parseInt(selectedClass.rowTo, 10) || 1;
                seatsByRow = new Map<string, typeof flightSeatMap.seats>();
                for (const s of flightSeatMap.seats) {
                  const rn = s.rowNumber ?? 0;
                  if (rn >= rowFrom && rn <= rowTo) {
                    const key = String(rn);
                    if (!seatsByRow.has(key)) seatsByRow.set(key, []);
                    seatsByRow.get(key)!.push(s);
                  }
                }
                rowKeys = Array.from(seatsByRow.keys()).sort((a, b) => Number(a) - Number(b));
              } else {
                const rowFromChar = selectedClass.rowFrom.charCodeAt(0);
                const rowToChar = selectedClass.rowTo.charCodeAt(0);
                seatsByRow = new Map<string, typeof flightSeatMap.seats>();
                for (const s of flightSeatMap.seats) {
                  const letter = s.rowLetter ?? "";
                  const code = letter.charCodeAt(0);
                  if (code >= rowFromChar && code <= rowToChar) {
                    if (!seatsByRow.has(letter)) seatsByRow.set(letter, []);
                    seatsByRow.get(letter)!.push(s);
                  }
                }
                rowKeys = Array.from(seatsByRow.keys()).sort();
              }

              return (
                <div className="flex flex-col min-h-0 flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Label htmlFor="flight-seat-class" className="text-sm font-medium text-foreground">Cabin class</Label>
                    <select
                      id="flight-seat-class"
                      value={flightSeatClass || cabinClasses[0]?.name}
                      onChange={(e) => setFlightSeatClass(e.target.value)}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {cabinClasses.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <span className="text-sm text-muted-foreground">
                      Passenger {currentPassenger + 1} of {passengers} · Assigned: {assigned}/{passengers}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-300 overflow-auto bg-slate-700 shadow-inner max-h-[50vh] min-h-[200px]">
                    <div className="p-3">
                      <div className="flex gap-1 items-stretch min-w-max">
                        <div
                          className="flex flex-col shrink-0 w-20 min-h-[100px] justify-center rounded-l-2xl rounded-r border border-slate-500/80 bg-slate-800"
                          style={{ borderLeftWidth: "3px" }}
                          title="Front of aircraft"
                        >
                          <div className="flex flex-1 items-center justify-center px-1 py-2 text-slate-200 text-center min-w-0">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] uppercase tracking-wider text-slate-300 font-medium">Front</span>
                              <span className="text-sm font-semibold text-white whitespace-nowrap">Cockpit</span>
                            </div>
                          </div>
                        </div>
                        {rowKeys.map((rowKey) => {
                          const rowSeats = seatsByRow.get(rowKey) ?? [];
                          const leftSeats = rowSeats.filter((s) => s.colNumber <= leftCols).sort((a, b) => a.colNumber - b.colNumber);
                          const rightSeats = rowSeats.filter((s) => s.colNumber > leftCols).sort((a, b) => a.colNumber - b.colNumber);
                          return (
                            <div
                              key={rowKey}
                              className="flex flex-col shrink-0 w-14 border border-slate-500/80 rounded-lg overflow-hidden bg-slate-600/50"
                            >
                              <div className="text-[10px] font-bold text-center py-1 bg-slate-700 text-slate-300 border-b border-slate-600">
                                {rowKey}
                              </div>
                              <div className="flex flex-1 p-1 gap-0.5">
                                <div className="flex flex-col gap-0.5 flex-1">
                                  {leftSeats.map((s) => {
                                    const isSelected = Object.values(flightSeatSelection).includes(s.label);
                                    const isYours = s.status === "yours";
                                    const isBooked = s.status === "booked";
                                    const available = s.status === "available" && !isSelected;
                                    return (
                                      <button
                                        key={s.label}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => {
                                          if (!available) return;
                                          setFlightSeatSelection((prev) => ({ ...prev, [currentPassenger]: s.label }));
                                          if (currentPassenger < passengers - 1) setFlightSeatCurrentPassenger((p) => p + 1);
                                        }}
                                        className={cn(
                                          "min-h-[28px] flex items-center justify-center text-[11px] font-semibold rounded transition-colors",
                                          isBooked && "bg-slate-500 text-slate-400 cursor-not-allowed",
                                          (isYours || isSelected) && "bg-blue-500 text-white",
                                          available && "bg-emerald-500 text-white hover:bg-emerald-400"
                                        )}
                                      >
                                        {s.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="w-1 bg-slate-500 rounded self-stretch my-0.5 shrink-0" aria-label="Aisle" />
                                <div className="flex flex-col gap-0.5 flex-1">
                                  {rightSeats.map((s) => {
                                    const isSelected = Object.values(flightSeatSelection).includes(s.label);
                                    const isYours = s.status === "yours";
                                    const isBooked = s.status === "booked";
                                    const available = s.status === "available" && !isSelected;
                                    return (
                                      <button
                                        key={s.label}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => {
                                          if (!available) return;
                                          setFlightSeatSelection((prev) => ({ ...prev, [currentPassenger]: s.label }));
                                          if (currentPassenger < passengers - 1) setFlightSeatCurrentPassenger((p) => p + 1);
                                        }}
                                        className={cn(
                                          "min-h-[28px] flex items-center justify-center text-[11px] font-semibold rounded transition-colors",
                                          isBooked && "bg-slate-500 text-slate-400 cursor-not-allowed",
                                          (isYours || isSelected) && "bg-blue-500 text-white",
                                          available && "bg-emerald-500 text-white hover:bg-emerald-400"
                                        )}
                                      >
                                        {s.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center py-1.5 border-t border-slate-600 shrink-0">
                      Window · Left {leftCols} · Aisle · Right {rightCols} · Window
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs shrink-0">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3.5 h-3.5 rounded bg-emerald-500" /> Available</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3.5 h-3.5 rounded bg-blue-500" /> Your selection</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3.5 h-3.5 rounded bg-slate-500" /> Booked</span>
                  </div>
                  <DialogFooter className="shrink-0">
                    <Button variant="outline" className="rounded-xl" onClick={() => setFlightSeatModalOpen(false)}>Cancel</Button>
                    <Button className="rounded-xl" disabled={flightSeatSaving || assigned < passengers} onClick={saveFlightSeats}>
                      {flightSeatSaving ? "Saving…" : "Save seats"}
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
            {!flightSeatMap && flightSeatModalOpen && <p className="text-sm text-muted-foreground py-4">Loading seat map…</p>}
          </DialogContent>
        </Dialog>

        {/* Flight ticket modal — redesigned with colours and download */}
        <Dialog open={flightTicketModalOpen} onOpenChange={(o) => !o && (setFlightTicketModalOpen(false), setFlightTicketData(null))}>
          <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto p-0" aria-describedby={undefined}>
            <DialogHeader className="sr-only">
              <DialogTitle>Flight ticket</DialogTitle>
            </DialogHeader>
            {flightTicketLoading && <p className="text-sm text-muted-foreground py-8 px-6">Loading…</p>}
            {!flightTicketLoading && flightTicketData && (
              <>
                <div className="rounded-t-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-6 py-5 text-white shadow-lg">
                  <p className="text-sm font-medium opacity-90">Boarding pass</p>
                  <p className="text-2xl font-bold tracking-tight mt-0.5">{flightTicketData.flight.airlineName}</p>
                  <p className="text-xs font-mono mt-2 opacity-90">Ref: {flightTicketData.bookingRef}</p>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex-1 text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From</p>
                      <p className="font-semibold text-foreground mt-0.5">{flightTicketData.flight.routeFrom}</p>
                      <p className="text-sm text-muted-foreground mt-1">{flightTicketData.flight.departureTime}</p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Plane className="h-5 w-5 text-indigo-600 rotate-90" />
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To</p>
                      <p className="font-semibold text-foreground mt-0.5">{flightTicketData.flight.routeTo}</p>
                      <p className="text-sm text-muted-foreground mt-1">{flightTicketData.flight.arrivalTime}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                      <p className="text-sm font-semibold text-foreground">Flight {flightTicketData.flight.flightNumber} · {flightTicketData.flight.travelDate}</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80">
                          <th className="text-left font-medium text-muted-foreground py-2.5 px-4">Passenger</th>
                          <th className="text-left font-medium text-muted-foreground py-2.5 px-4">Seat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flightTicketData.passengers.map((p, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 px-4 font-medium text-foreground">{p.name}</td>
                            <td className="py-2.5 px-4 font-mono font-semibold text-indigo-600">{p.seatNumber || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-4 text-center">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">Show at gate</p>
                    <p className="text-2xl font-mono font-bold text-amber-900 mt-1 tracking-widest">{flightTicketData.otp}</p>
                    <p className="text-xs text-amber-700 mt-1">Verification: {flightTicketData.verificationCode}</p>
                  </div>
                  <Button type="button" variant="outline" className="w-full rounded-xl gap-2" onClick={() => flightTicketData && downloadFlightTicket(flightTicketData)}>
                    <Download className="h-4 w-4" />
                    Download ticket
                  </Button>
                </div>
              </>
            )}
            {!flightTicketLoading && !flightTicketData && flightTicketModalOpen && <p className="text-sm text-muted-foreground py-8 px-6">Could not load ticket.</p>}
          </DialogContent>
        </Dialog>

        {/* Experience ticket modal — same page, with download */}
        <Dialog open={experienceTicketModalOpen} onOpenChange={(o) => !o && (setExperienceTicketModalOpen(false), setExperienceTicketData(null))}>
          <DialogContent className="rounded-2xl max-w-[400px] p-0 overflow-hidden" aria-describedby={undefined}>
            <DialogHeader className="sr-only">
              <DialogTitle>Experience ticket</DialogTitle>
            </DialogHeader>
            {experienceTicketData && (
              <>
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white px-5 py-4 text-center">
                  <p className="text-[11px] font-medium tracking-[0.2em] opacity-90">WANDERLY</p>
                  <p className="text-lg font-bold mt-1">Experience ticket</p>
                </div>
                <div className="border-t-2 border-dashed border-slate-200" />
                <div className="p-5 space-y-0">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-center mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-medium">Booking reference</p>
                    <p className="text-base font-bold font-mono text-foreground mt-1">{experienceTicketData.bookingRef}</p>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-semibold text-foreground">{experienceTicketData.experienceName}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-semibold text-foreground">{experienceTicketData.slotDate}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-semibold text-foreground">{experienceTicketData.slotTime}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-semibold text-foreground">{experienceTicketData.participantsCount}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">Amount paid</span>
                    <span className="font-semibold text-emerald-600">₹{(experienceTicketData.totalCents / 100).toFixed(0)}</span>
                  </div>
                  <div className="h-9 my-4 rounded" style={{ background: "repeating-linear-gradient(90deg, #0f172a 0, #0f172a 2px, transparent 2px, transparent 6px)" }} aria-hidden />
                  <Button type="button" variant="outline" className="w-full rounded-xl gap-2" onClick={() => downloadExperienceTicket(experienceTicketData)}>
                    <Download className="h-4 w-4" />
                    Download ticket
                  </Button>
                </div>
                <div className="bg-slate-50 px-5 py-3 text-center text-[11px] text-muted-foreground">
                  Print or save as PDF · Wanderly
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Event ticket modal — same page, with download */}
        <Dialog open={eventTicketModalOpen} onOpenChange={(o) => !o && (setEventTicketModalOpen(false), setEventTicketData(null))}>
          <DialogContent className="rounded-2xl max-w-[400px] p-0 overflow-hidden" aria-describedby={undefined}>
            <DialogHeader className="sr-only">
              <DialogTitle>Event ticket</DialogTitle>
            </DialogHeader>
            {eventTicketData && (
              <>
                <div className="bg-gradient-to-br from-violet-600 to-violet-800 text-white px-5 py-4 text-center">
                  <p className="text-[11px] font-medium tracking-[0.2em] opacity-90">WANDERLY</p>
                  <p className="text-lg font-bold mt-1">Event ticket</p>
                </div>
                <div className="border-t-2 border-dashed border-slate-200" />
                <div className="p-5 space-y-0">
                  <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 text-center mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-violet-800 font-medium">Booking reference</p>
                    <p className="text-base font-bold font-mono text-foreground mt-1">{eventTicketData.bookingRef}</p>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                    <span className="text-muted-foreground">Event</span>
                    <span className="font-semibold text-foreground">{eventTicketData.eventName}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                    <span className="text-muted-foreground">Venue</span>
                    <span className="font-semibold text-foreground">{eventTicketData.venueName}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-semibold text-foreground">{eventTicketData.startDate}{eventTicketData.endDate !== eventTicketData.startDate ? ` – ${eventTicketData.endDate}` : ""}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-semibold text-foreground">{eventTicketData.startTime} – {eventTicketData.endTime}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">Amount paid</span>
                    <span className="font-semibold text-violet-600">₹{(eventTicketData.totalCents / 100).toFixed(0)}</span>
                  </div>
                  <div className="h-9 my-4 rounded" style={{ background: "repeating-linear-gradient(90deg, #0f172a 0, #0f172a 2px, transparent 2px, transparent 6px)" }} aria-hidden />
                  <Button type="button" variant="outline" className="w-full rounded-xl gap-2" onClick={() => downloadEventTicket(eventTicketData)}>
                    <Download className="h-4 w-4" />
                    Download ticket
                  </Button>
                </div>
                <div className="bg-slate-50 px-5 py-3 text-center text-[11px] text-muted-foreground">
                  Print or save as PDF · Wanderly
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Flight payment modal: choose UPI/Card (mocked), show admin UPI details for UPI, then Pay now → ticket */}
        <Dialog
          open={flightPaymentModalOpen}
          onOpenChange={(o) => {
            if (!o) {
              setFlightPaymentModalOpen(false);
              setFlightPaymentBookingId(null);
              setPaymentMethod(null);
            }
          }}
        >
          <DialogContent className="rounded-2xl max-w-[420px]" aria-describedby="payment-dialog-desc">
            <DialogHeader>
              <DialogTitle>Complete payment</DialogTitle>
              <DialogDescription id="payment-dialog-desc">
                Choose a payment method. This is a mocked flow — no real charge.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {paymentMethod === null ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50/50 p-4 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <Smartphone className="h-8 w-8 text-primary" />
                    <span className="font-medium text-foreground">UPI</span>
                    <span className="text-xs text-muted-foreground">Pay via UPI ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50/50 p-4 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <CreditCard className="h-8 w-8 text-primary" />
                    <span className="font-medium text-foreground">Card</span>
                    <span className="text-xs text-muted-foreground">Debit / Credit card</span>
                  </button>
                </div>
              ) : paymentMethod === "upi" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Send payment to (admin details — mock)</p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">UPI ID</span>
                      <span className="font-mono font-medium text-foreground">payments@wanderwisely</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="text-foreground">Wander Wisely Payments</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Account</span>
                      <span className="font-mono text-foreground">XXXX XXXX 1234</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Open your UPI app and send the amount to the UPI ID above. Then click Pay now below to confirm (mocked).</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Card payment (mocked)</p>
                  <p className="text-xs text-muted-foreground">No card details required. Click Pay now to complete the mock payment.</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              {paymentMethod !== null && (
                <Button type="button" variant="ghost" onClick={() => setPaymentMethod(null)}>
                  Back
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFlightPaymentModalOpen(false);
                  setFlightPaymentBookingId(null);
                  setPaymentMethod(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="hero"
                disabled={!flightPaymentBookingId || !token || paymentMethod === null}
                onClick={async () => {
                  if (!flightPaymentBookingId || !token) return;
                  setFlightPayId(flightPaymentBookingId);
                  try {
                    const { data, error } = await apiFetch<{ ok: boolean; status: string; otp: string }>(`/api/flight-bookings/${flightPaymentBookingId}/pay`, {
                      method: "PATCH",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!error && data?.status === "confirmed") {
                      toast({ title: "Payment confirmed", description: "Your flight booking is confirmed. You can view your ticket below." });
                      setFlightPaymentModalOpen(false);
                      setFlightPaymentBookingId(null);
                      setPaymentMethod(null);
                      loadBookings();
                    } else {
                      toast({ title: "Payment failed", description: error ?? "Try again.", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Payment failed", variant: "destructive" });
                  } finally {
                    setFlightPayId(null);
                  }
                }}
              >
                Pay now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Leave review modal — review goes to the company/vendor for this booking */}
        <Dialog
          open={reviewModalOpen}
          onOpenChange={(o) => {
            if (!o) {
              setReviewModalOpen(false);
              setReviewTarget(null);
              setReviewRating(0);
              setReviewComment("");
            }
          }}
        >
          <DialogContent className="rounded-2xl max-w-[420px]" aria-describedby="review-dialog-desc">
            <DialogHeader>
              <DialogTitle>Leave a review</DialogTitle>
              <DialogDescription id="review-dialog-desc">
                {reviewTarget
                  ? `Your review will be shared with the company for this ${reviewTarget.category.toLowerCase()} booking. It won't go to admin — only to the vendor.`
                  : "Rate and optionally comment on this booking. Your review is shared with the company only."}
              </DialogDescription>
            </DialogHeader>
            {reviewTarget && (
              <div className="space-y-4 pt-2">
                <p className="text-sm font-medium text-foreground">{reviewTarget.name}</p>
                <div>
                  <Label className="text-xs text-muted-foreground">Rating</Label>
                  <div className="flex items-center gap-1 mt-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
                        onClick={() => setReviewRating(s)}
                        aria-label={`${s} star${s !== 1 ? "s" : ""}`}
                      >
                        <Star
                          className={cn("h-8 w-8 transition-colors", s <= reviewRating ? "text-amber-500 fill-amber-500" : "text-slate-300")}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="review-comment" className="text-xs text-muted-foreground">Comment (optional)</Label>
                  <Textarea
                    id="review-comment"
                    placeholder="Share your experience..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="mt-1.5 min-h-[80px] resize-none rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReviewModalOpen(false);
                  setReviewTarget(null);
                  setReviewRating(0);
                  setReviewComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="hero"
                disabled={!reviewTarget || reviewRating === 0 || !token}
                onClick={async () => {
                  if (!reviewTarget || reviewRating === 0 || !token) return;
                  const bookingTypeMap: Record<string, string> = {
                    Bus: "transport",
                    Car: "car",
                    Flight: "flight",
                    Hotel: "hotel",
                    Experience: "experience",
                    Event: "event",
                  };
                  const booking_type = bookingTypeMap[reviewTarget.category] ?? reviewTarget.category.toLowerCase();
                  const { data, error, status } = await apiFetch<{ id: string }>("/api/booking-reviews", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: {
                      booking_type,
                      booking_id: reviewTarget.id,
                      rating: reviewRating,
                      comment: reviewComment.trim() || undefined,
                    },
                  });
                  if (error && status === 409) {
                    toast({ title: "Already reviewed", description: "You have already submitted a review for this booking.", variant: "destructive" });
                    setReviewModalOpen(false);
                    setReviewTarget(null);
                    setReviewRating(0);
                    setReviewComment("");
                    return;
                  }
                  if (error) {
                    toast({ title: "Could not submit review", description: error || "Please try again.", variant: "destructive" });
                    return;
                  }
                  toast({ title: "Review submitted", description: "Your review has been sent to the company." });
                  setReviewModalOpen(false);
                  setReviewTarget(null);
                  setReviewRating(0);
                  setReviewComment("");
                }}
              >
                Submit review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MyTrip;

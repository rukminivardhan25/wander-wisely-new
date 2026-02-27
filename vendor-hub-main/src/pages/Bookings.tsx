import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { vendorFetch } from "@/lib/api";
import {
  Bus,
  Car,
  Plane,
  Hotel,
  Ticket,
  Calendar as CalendarIcon,
  ChevronRight,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// ─── Types ─────────────────────────────────────────────────────────────

type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed" | "checked_in";
type PaymentStatus = "paid" | "pending" | "refunded";

interface CustomerBooking {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  seats: string[];
  amount: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  bookedOn: string;
}

interface BusBookingCard {
  busId: string;
  listingId: string;
  busName: string;
  busNumber: string;
  route: string;
  date: string;
  departure: string;
  totalSeats: number;
  seatsBooked: number;
  revenue: number;
  status: "active" | "completed" | "cancelled";
  bookings: CustomerBooking[];
  listingName?: string;
  /** Vendor fleet layout (from bus config). */
  layoutType?: string | null;
  rows?: number;
  leftCols?: number;
  rightCols?: number;
  hasAisle?: boolean;
}

/** Static flight card for vendor Flight tab (seats, details, bookings in sidebar). */
interface FlightBookingRow {
  id: string;
  ref: string;
  customerName: string;
  passengers: number;
  amount: number;
  status: string;
}
/** Cabin class section (e.g. Business rows A–B, Economy rows C–E). */
interface SeatClassSection {
  name: string;
  rowFrom: string;
  rowTo: string;
  totalSeats: number;
  booked: number;
}
/** Full seat layout from fleet (vendor-created). When present, seat structure is built from this. */
interface FlightSeatLayout {
  classes_enabled: { first: boolean; business: boolean; economy: boolean };
  cabin_first: { rows: number; left_cols: number; right_cols: number };
  cabin_business: { rows: number; left_cols: number; right_cols: number };
  cabin_economy: { rows: number; left_cols: number; right_cols: number };
}

interface VendorFlightCard {
  flightNumber: string;
  airline: string;
  aircraft: string;
  route: string;
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  seatsBooked: number;
  pendingRequests: number;
  bookings: FlightBookingRow[];
  flightType: "domestic" | "international";
  seatClasses: SeatClassSection[];
  /** For fetching seat_layout when drawer opens */
  listingId?: string;
  flightId?: string;
  /** Vendor-created structure from fleet; when set, seat map uses this instead of fixed 3-3 */
  seatLayout?: FlightSeatLayout | null;
}

const ZERO_CABIN_BOOKINGS = { rows: 0, left_cols: 0, right_cols: 0 };

function parseCabinBookings(c: unknown): { rows: number; left_cols: number; right_cols: number } {
  if (!c || typeof c !== "object") return ZERO_CABIN_BOOKINGS;
  const x = c as Record<string, unknown>;
  return {
    rows: typeof x.rows === "number" ? x.rows : 0,
    left_cols: typeof x.left_cols === "number" ? x.left_cols : 0,
    right_cols: typeof x.right_cols === "number" ? x.right_cols : 0,
  };
}

/** Parse seat_layout from API (fleet structure). First, Business, Economy all supported; missing cabins default to zeros. */
function parseSeatLayoutInBookings(seatLayout: unknown): FlightSeatLayout | null {
  if (!seatLayout || typeof seatLayout !== "object") return null;
  const o = seatLayout as Record<string, unknown>;
  const ce = o.classes_enabled;
  const cen = ce && typeof ce === "object" ? (ce as Record<string, unknown>) : {};
  return {
    classes_enabled: { first: Boolean(cen.first), business: Boolean(cen.business), economy: Boolean(cen.economy) },
    cabin_first: parseCabinBookings(o.cabin_first),
    cabin_business: parseCabinBookings(o.cabin_business),
    cabin_economy: parseCabinBookings(o.cabin_economy),
  };
}

const BOOKINGS_CABIN_ORDER = ["first", "business", "economy"] as const;
const BOOKINGS_CABIN_LABEL: Record<string, string> = { first: "First", business: "Business", economy: "Economy / Budget" };
const BOOKINGS_CABIN_COLOUR: Record<string, string> = {
  first: "bg-amber-500/80 text-white",
  business: "bg-blue-600/90 text-white",
  economy: "bg-slate-500/80 text-white",
};

function buildSeatRowsBookings(layout: FlightSeatLayout): { cabin: string; globalRow: number; left_cols: number; right_cols: number }[] {
  const out: { cabin: string; globalRow: number; left_cols: number; right_cols: number }[] = [];
  let globalRow = 0;
  for (const cabin of BOOKINGS_CABIN_ORDER) {
    const enabled = cabin === "first" ? layout.classes_enabled.first : cabin === "business" ? layout.classes_enabled.business : layout.classes_enabled.economy;
    if (!enabled) continue;
    const config = cabin === "first" ? layout.cabin_first : cabin === "business" ? layout.cabin_business : layout.cabin_economy;
    for (let r = 0; r < config.rows; r++) {
      globalRow++;
      out.push({ cabin, globalRow, left_cols: config.left_cols, right_cols: config.right_cols });
    }
  }
  return out;
}

function seatLetterBookings(index: number, leftCount: number, rightCount: number): string {
  if (index < leftCount) return String.fromCharCode(65 + index);
  return String.fromCharCode(65 + leftCount + (index - leftCount));
}

// Static flights for vendor Flight tab (sidebar details + seat structure)
const STATIC_VENDOR_FLIGHTS: VendorFlightCard[] = [
  {
    flightNumber: "6E-201",
    airline: "IndiGo",
    aircraft: "A320",
    route: "HYD → BLR",
    departureTime: "06:00",
    arrivalTime: "07:15",
    totalSeats: 30,
    seatsBooked: 6,
    pendingRequests: 2,
    flightType: "domestic",
    seatClasses: [
      { name: "Economy", rowFrom: "A", rowTo: "E", totalSeats: 30, booked: 6 },
    ],
    bookings: [
      { id: "fb1", ref: "FLT-A1B2C3", customerName: "Ramesh K.", passengers: 2, amount: 7000, status: "Pending" },
      { id: "fb2", ref: "FLT-X9Y8Z7", customerName: "Priya S.", passengers: 1, amount: 3500, status: "Pending" },
    ],
  },
  {
    flightNumber: "6E-405",
    airline: "IndiGo",
    aircraft: "A321",
    route: "HYD → BLR",
    departureTime: "14:30",
    arrivalTime: "15:45",
    totalSeats: 28,
    seatsBooked: 16,
    pendingRequests: 0,
    flightType: "domestic",
    seatClasses: [
      { name: "Economy", rowFrom: "A", rowTo: "D", totalSeats: 28, booked: 16 },
    ],
    bookings: [
      { id: "fb3", ref: "FLT-M4N5P6", customerName: "Vikram R.", passengers: 3, amount: 10500, status: "Confirmed" },
    ],
  },
  {
    flightNumber: "UK-812",
    airline: "Vistara",
    aircraft: "B787",
    route: "HYD → BLR",
    departureTime: "18:00",
    arrivalTime: "19:20",
    totalSeats: 24,
    seatsBooked: 16,
    pendingRequests: 1,
    flightType: "international",
    seatClasses: [
      { name: "Business", rowFrom: "A", rowTo: "B", totalSeats: 12, booked: 4 },
      { name: "Economy", rowFrom: "C", rowTo: "D", totalSeats: 12, booked: 12 },
    ],
    bookings: [
      { id: "fb4", ref: "FLT-Q7R8S9", customerName: "Anita M.", passengers: 2, amount: 12000, status: "Pending" },
    ],
  },
  {
    flightNumber: "AI-127",
    airline: "Air India",
    aircraft: "B777",
    route: "DEL → BOM",
    departureTime: "09:00",
    arrivalTime: "11:25",
    totalSeats: 60,
    seatsBooked: 22,
    pendingRequests: 3,
    flightType: "domestic",
    seatClasses: [
      { name: "Business", rowFrom: "A", rowTo: "B", totalSeats: 12, booked: 2 },
      { name: "Economy", rowFrom: "C", rowTo: "J", totalSeats: 48, booked: 20 },
    ],
    bookings: [],
  },
];

// API response for GET /api/transport-bookings?date= (bookings/seatsBooked from main app)
interface TransportBusFromApi {
  busId: string;
  listingId: string;
  listingName: string;
  busName: string;
  registrationNumber: string | null;
  busNumber: string | null;
  totalSeats: number;
  layoutType?: string | null;
  rows?: number;
  leftCols?: number;
  rightCols?: number;
  hasAisle?: boolean;
  schedules: Array<{
    scheduleId: string;
    departureTime: string;
    arrivalTime: string;
    routeFrom: string | null;
    routeTo: string | null;
  }>;
  /** Filled by vendor backend from main app bookings API */
  bookings?: CustomerBooking[];
  seatsBooked?: number;
}

/** Car booking from GET /api/listings/:listingId/car-bookings */
interface CarBookingRow {
  id: string;
  bookingRef: string;
  userId: string;
  carId: string;
  areaId: string;
  carName?: string;
  bookingType: string;
  city?: string;
  pickupPoint?: string;
  dropPoint?: string;
  travelTime?: string;
  fromCity?: string;
  toCity?: string;
  travelDate: string;
  passengers: number;
  totalCents?: number;
  status: string;
  createdAt: string;
  listingId?: string;
  listingName?: string;
}

/** Scheduled car from GET /api/listings/:listingId/scheduled-cars?date= */
interface ScheduledCarArea {
  areaId: string;
  areaType: string;
  cityName?: string;
  fromCity?: string;
  toCity?: string;
  fromDate?: string;
  toDate?: string;
  startTime?: string;
  endTime?: string;
  baseFareCents?: number;
  pricePerKmCents?: number;
}
interface ScheduledCar {
  carId: string;
  carName: string;
  registrationNumber?: string;
  areas: ScheduledCarArea[];
  listingId?: string;
  listingName?: string;
}

/** One card in the scheduled cars grid: same layout as bus card (listing, name, registration, route, date, price, status, View Details). */
function ScheduledCarCard({
  car,
  area,
  onViewDetails,
}: {
  car: ScheduledCar;
  area: ScheduledCarArea;
  onViewDetails?: () => void;
}) {
  const isLocal = (area.areaType || "local").toLowerCase() === "local";
  const routeLabel = isLocal ? (area.cityName ?? "—") : `${area.fromCity ?? "—"} → ${area.toCity ?? "—"}`;
  const dateLabel = isLocal
    ? area.fromDate && area.toDate
      ? `${area.fromDate} to ${area.toDate}`
      : "—"
    : area.fromDate
      ? area.toDate
        ? `${area.fromDate} to ${area.toDate}`
        : area.fromDate
      : "—";
  const timeLabel =
    isLocal && area.startTime && area.endTime
      ? `${area.startTime.slice(0, 5)}–${area.endTime.slice(0, 5)}`
      : null;
  const priceLabel =
    area.pricePerKmCents != null
      ? `₹${(area.pricePerKmCents / 100).toFixed(2)}/km`
      : area.baseFareCents != null
        ? `₹${(area.baseFareCents / 100).toLocaleString("en-IN")}`
        : null;
  const regNum = (car.registrationNumber || "").trim() || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <Card className="border-0 shadow-none rounded-2xl">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Car className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                {car.listingName && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {car.listingName}
                  </p>
                )}
                <p className="font-semibold text-foreground">{car.carName}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {regNum ? `${regNum} · ` : ""}Route: {routeLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Date: {dateLabel}
                  {timeLabel ? ` · ${timeLabel}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <p className="text-sm text-muted-foreground capitalize">
                {area.areaType || "local"}
              </p>
              <p className="text-lg font-semibold text-foreground">
                {priceLabel ?? "—"}
              </p>
              <StatusBadge status="scheduled" type="car" />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full sm:w-auto rounded-xl gap-2"
            onClick={onViewDetails}
          >
            View Details
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Right sidebar content for a selected car schedule: date, schedule details, booking status, pending requests. */
function CarDetailSidebar({
  car,
  area,
  selectedDate,
  carBookings,
  onAccept,
  onReject,
  actionId,
}: {
  car: ScheduledCar;
  area: ScheduledCarArea;
  selectedDate: string;
  carBookings: CarBookingRow[];
  dateFilter?: string;
  onAccept: (listingId: string, bookingId: string) => void;
  onReject: (listingId: string, bookingId: string) => void;
  actionId: string | null;
  onClose?: () => void;
}) {
  const isLocal = (area.areaType || "local").toLowerCase() === "local";
  const routeLabel = isLocal ? (area.cityName ?? "—") : `${area.fromCity ?? "—"} → ${area.toCity ?? "—"}`;
  const dateRange =
    area.fromDate && area.toDate
      ? `${area.fromDate} to ${area.toDate}`
      : area.fromDate
        ? area.fromDate
        : "—";
  const timeRange =
    area.startTime && area.endTime
      ? `${String(area.startTime).slice(0, 5)}–${String(area.endTime).slice(0, 5)}`
      : null;
  const priceLabel =
    area.pricePerKmCents != null
      ? `₹${(area.pricePerKmCents / 100).toFixed(2)}/km`
      : area.baseFareCents != null
        ? `₹${(area.baseFareCents / 100).toLocaleString("en-IN")}`
        : "—";
  const pending = carBookings.filter((b) => b.status === "pending_vendor");
  const others = carBookings.filter((b) => b.status !== "pending_vendor");

  return (
    <div className="mt-6 space-y-6">
      {/* Schedule & date */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
        <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Schedule & date
        </p>
        <dl className="space-y-1.5 text-sm">
          <div>
            <dt className="text-muted-foreground">Viewing date</dt>
            <dd className="font-medium text-foreground">{selectedDate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date range</dt>
            <dd className="font-medium text-foreground">{dateRange}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Route</dt>
            <dd className="font-medium text-foreground">{routeLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium text-foreground capitalize">{area.areaType || "local"}</dd>
          </div>
          {timeRange && (
            <div>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium text-foreground">{timeRange}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Price</dt>
            <dd className="font-medium text-foreground">{priceLabel}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground mt-2">
          {car.listingName && <span>{car.listingName} · </span>}
          {car.carName}
          {car.registrationNumber && ` · ${car.registrationNumber}`}
        </p>
      </div>

      {/* Booking status summary */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">Booking status</p>
        <p className="text-sm text-muted-foreground">
          {carBookings.length === 0
            ? "No booking requests for this car on this date."
            : `${pending.length} pending, ${others.length} other (approved/rejected/confirmed).`}
        </p>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Pending requests</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Ref</TableHead>
                  <TableHead className="font-medium">Details</TableHead>
                  <TableHead className="font-medium">Amount</TableHead>
                  <TableHead className="font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="py-2 font-mono text-sm">{b.bookingRef}</TableCell>
                    <TableCell className="py-2 text-sm">
                      {b.bookingType === "local" ? (
                        <>{(b.pickupPoint || b.city) ?? "—"} → {(b.dropPoint || b.city) ?? "—"}</>
                      ) : (
                        <>{b.fromCity ?? "—"} → {b.toCity ?? "—"}</>
                      )}
                      <span className="text-muted-foreground ml-1">· {b.passengers} pax</span>
                    </TableCell>
                    <TableCell className="py-2 text-sm">
                      {b.totalCents != null ? `₹${(b.totalCents / 100).toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          disabled={actionId === b.id}
                          onClick={() => b.listingId && onAccept(b.listingId, b.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={actionId === b.id}
                          onClick={() => b.listingId && onReject(b.listingId, b.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* All requests for this car (non-pending) */}
      {others.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Other requests</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Ref</TableHead>
                  <TableHead className="font-medium">Details</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {others.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="py-2 font-mono text-sm">{b.bookingRef}</TableCell>
                    <TableCell className="py-2 text-sm">
                      {b.bookingType === "local" ? (
                        <>{(b.pickupPoint || b.city) ?? "—"} → {(b.dropPoint || b.city) ?? "—"}</>
                      ) : (
                        <>{b.fromCity ?? "—"} → {b.toCity ?? "—"}</>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <StatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(s: string): string {
  if (!s) return "—";
  const part = s.slice(0, 5);
  return part.length >= 5 ? part : s;
}

function apiBusToCard(bus: TransportBusFromApi, date: string): BusBookingCard {
  const first = bus.schedules[0];
  const route =
    first && (first.routeFrom || first.routeTo)
      ? `${first.routeFrom ?? "—"} → ${first.routeTo ?? "—"}`
      : bus.busName || "—";
  const rows = bus.rows ?? Math.ceil((bus.totalSeats || 28) / 4);
  const leftCols = bus.leftCols ?? 2;
  const rightCols = bus.rightCols ?? 2;
  const hasAisle = bus.hasAisle ?? true;
  const bookings = bus.bookings ?? [];
  const seatsBooked = bus.seatsBooked ?? bookings.reduce((s, b) => s + b.seats.length, 0);
  const revenue = bookings.reduce((s, b) => s + b.amount, 0);
  return {
    busId: bus.busId,
    listingId: bus.listingId,
    busName: bus.busName || bus.registrationNumber || bus.busNumber || "Bus",
    busNumber: bus.registrationNumber || bus.busNumber || bus.busId.slice(0, 8),
    route,
    date,
    departure: first ? formatTime(first.departureTime) : "—",
    totalSeats: bus.totalSeats,
    seatsBooked,
    revenue,
    status: "active",
    bookings,
    listingName: bus.listingName,
    layoutType: bus.layoutType ?? null,
    rows,
    leftCols,
    rightCols,
    hasAisle,
  };
}

// ─── Mock data (fallback when no API or for demo) ────────────────────────

const COMPANY_NAME = "Orange Travels";

const MOCK_TRANSPORT_BOOKINGS: BusBookingCard[] = [
  {
    busId: "1",
    listingId: "",
    busName: "Shivani Express",
    busNumber: "KA-09-1234",
    route: "Hyderabad → Bangalore",
    date: "2026-02-24",
    departure: "21:00",
    totalSeats: 40,
    seatsBooked: 14,
    revenue: 12600,
    status: "active",
    bookings: [
      {
        id: "BW12345",
        customerName: "Rahul Sharma",
        email: "rahul@gmail.com",
        phone: "9876543210",
        seats: ["A1", "A2"],
        amount: 1800,
        paymentStatus: "paid",
        status: "confirmed",
        bookedOn: "2026-02-20",
      },
      {
        id: "BW12346",
        customerName: "Anjali Mehta",
        email: "anjali@gmail.com",
        phone: "9123456789",
        seats: ["A3"],
        amount: 900,
        paymentStatus: "pending",
        status: "pending",
        bookedOn: "2026-02-21",
      },
      {
        id: "BW12347",
        customerName: "Vikram Singh",
        email: "vikram@gmail.com",
        phone: "9988776655",
        seats: ["B1", "B2", "B3"],
        amount: 2700,
        paymentStatus: "paid",
        status: "checked_in",
        bookedOn: "2026-02-19",
      },
    ],
  },
  {
    busId: "2",
    listingId: "",
    busName: "Luxury Coach",
    busNumber: "AP-02-5678",
    route: "Bangalore → Chennai",
    date: "2026-02-24",
    departure: "22:30",
    totalSeats: 40,
    seatsBooked: 8,
    revenue: 7200,
    status: "active",
    bookings: [
      {
        id: "BW12348",
        customerName: "Priya Reddy",
        email: "priya@gmail.com",
        phone: "9876123456",
        seats: ["A1", "A2"],
        amount: 1800,
        paymentStatus: "paid",
        status: "confirmed",
        bookedOn: "2026-02-22",
      },
    ],
  },
  {
    busId: "3",
    listingId: "",
    busName: "Orange Sleeper",
    busNumber: "KA-01-9999",
    route: "Hyderabad → Bangalore",
    date: "2026-02-23",
    departure: "20:00",
    totalSeats: 40,
    seatsBooked: 40,
    revenue: 36000,
    status: "completed",
    bookings: [],
  },
];

// Summary derived from mock (static)
const MOCK_SUMMARY = {
  bookingsToday: 12,
  revenueToday: 24500,
  upcomingTrips: 8,
  completedTrips: 4,
};

// ─── Status badge styles ────────────────────────────────────────────────

const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  pending: "bg-amber-500/15 text-amber-700 border-amber-200",
  cancelled: "bg-red-500/15 text-red-700 border-red-200",
  completed: "bg-blue-500/15 text-blue-700 border-blue-200",
  checked_in: "bg-violet-500/15 text-violet-700 border-violet-200",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: "text-emerald-600 font-medium",
  pending: "text-amber-600 font-medium",
  refunded: "text-muted-foreground",
};

const BUS_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  completed: "bg-blue-500/15 text-blue-700",
  cancelled: "bg-red-500/15 text-red-700",
  scheduled: "bg-emerald-500/15 text-emerald-700",
};

/** Convert seat label (A1, B2, ...) to 1-based seat number. colsPerRow = left + right. */
function seatLabelToNumber(label: string, colsPerRow: number = 4): number {
  const match = label.match(/^([A-Z])(\d+)$/i);
  if (!match || colsPerRow < 1) return 0;
  const row = match[1].toUpperCase().charCodeAt(0) - 65;
  const col = parseInt(match[2], 10);
  if (col < 1 || col > colsPerRow) return 0;
  return row * colsPerRow + col;
}

/** Build set of booked seat numbers and optional map for tooltip (seatNum -> customer name). */
function getBookedSeatsFromBookings(
  bookings: CustomerBooking[],
  colsPerRow: number = 4
): { bookedSet: Set<number>; seatToCustomer: Map<number, string> } {
  const bookedSet = new Set<number>();
  const seatToCustomer = new Map<number, string>();
  for (const b of bookings) {
    for (const seat of b.seats) {
      const n = seatLabelToNumber(seat, colsPerRow);
      if (n > 0) {
        bookedSet.add(n);
        seatToCustomer.set(n, b.customerName);
      }
    }
  }
  return { bookedSet, seatToCustomer };
}

// ─── Sub-components ────────────────────────────────────────────────────

function StatusBadge({
  status,
  type = "booking",
}: {
  status: string;
  type?: "booking" | "bus" | "car";
}) {
  const styles = type === "bus" || type === "car" ? BUS_STATUS_STYLES : BOOKING_STATUS_STYLES;
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status as keyof typeof styles] ?? "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function CompanySummaryCard({
  companyName = COMPANY_NAME,
  bookingsToday = MOCK_SUMMARY.bookingsToday,
  revenueToday = MOCK_SUMMARY.revenueToday,
  upcomingTrips = MOCK_SUMMARY.upcomingTrips,
  completedTrips = MOCK_SUMMARY.completedTrips,
}: {
  companyName?: string;
  bookingsToday?: number;
  revenueToday?: number;
  upcomingTrips?: number;
  completedTrips?: number;
}) {
  return (
    <Card className="rounded-2xl border border-slate-200/80 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-display font-bold text-foreground">
          {companyName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Bookings Today
            </p>
            <p className="text-2xl font-semibold text-foreground mt-0.5">
              {bookingsToday}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Revenue Today
            </p>
            <p className="text-2xl font-semibold text-foreground mt-0.5">
              ₹{revenueToday.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Upcoming Trips
            </p>
            <p className="text-2xl font-semibold text-foreground mt-0.5">
              {upcomingTrips}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Completed
            </p>
            <p className="text-2xl font-semibold text-foreground mt-0.5">
              {completedTrips}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BusBookingCard({
  bus,
  onViewDetails,
}: {
  bus: BusBookingCard;
  onViewDetails: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <Card className="border-0 shadow-none rounded-2xl">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Bus className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                {bus.listingName && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {bus.listingName}
                  </p>
                )}
                <p className="font-semibold text-foreground">
                  {bus.busName}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {bus.busNumber} · Route: {bus.route}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Date: {bus.date} · Departure: {bus.departure}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <p className="text-sm text-muted-foreground">
                Seats Booked: {bus.seatsBooked} / {bus.totalSeats}
              </p>
              <p className="text-lg font-semibold text-foreground">
                ₹{bus.revenue.toLocaleString("en-IN")}
              </p>
              <StatusBadge status={bus.status} type="bus" />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full sm:w-auto rounded-xl gap-2"
            onClick={onViewDetails}
          >
            View Details
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BusInfoHeader({ bus }: { bus: BusBookingCard }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-4">
      <p className="font-semibold text-foreground">{bus.busName}</p>
      <p className="text-sm text-muted-foreground mt-1">
        {bus.busNumber} · Route: {bus.route} · Date: {bus.date} · Departure: {bus.departure}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Total Seats: {bus.totalSeats}
      </p>
    </div>
  );
}

function BusSeatMap({ bus }: { bus: BusBookingCard }) {
  const totalSeats = bus.totalSeats;
  const rows = bus.rows ?? Math.ceil((bus.totalSeats || 28) / 4);
  const leftCols = bus.leftCols ?? 2;
  const rightCols = bus.rightCols ?? 2;
  const hasAisle = bus.hasAisle ?? true;
  const colsPerRow = leftCols + rightCols;
  const layoutLabel = bus.layoutType
    ? `${bus.layoutType} seater layout`
    : `${leftCols}+${rightCols} seater layout`;

  const { bookedSet, seatToCustomer } = getBookedSeatsFromBookings(bus.bookings, colsPerRow);

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-foreground mb-3">Seat layout</p>
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="bg-slate-700 text-slate-200 py-2.5 px-3 text-center text-xs font-medium border-b border-slate-600">
          Driver · Front
        </div>
        <div className="bg-slate-100 p-2.5 border-t-0">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div key={rowIndex} className="flex items-stretch gap-1 mb-1.5 last:mb-0">
              <div className="flex gap-1 flex-1">
                {Array.from({ length: leftCols }, (_, col) => {
                  const n = rowIndex * colsPerRow + col + 1;
                  if (n > totalSeats) return <div key={`l-${col}`} className="flex-1" />;
                  const booked = bookedSet.has(n);
                  const customer = seatToCustomer.get(n);
                  const rowLetter = String.fromCharCode(65 + rowIndex);
                  const seatLabel = `${rowLetter}${col + 1}`;
                  return (
                    <div
                      key={n}
                      title={booked && customer ? `${seatLabel} · ${customer}` : booked ? seatLabel : `${seatLabel} · Available`}
                      className={cn(
                        "flex-1 min-w-[2rem] py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors",
                        booked ? "bg-slate-400 text-slate-700 cursor-default" : "bg-emerald-500 text-white"
                      )}
                    >
                      {seatLabel}
                    </div>
                  );
                })}
              </div>
              {hasAisle && <div className="w-2 bg-slate-300 rounded flex-shrink-0 self-stretch" aria-hidden />}
              <div className="flex gap-1 flex-1">
                {Array.from({ length: rightCols }, (_, col) => {
                  const n = rowIndex * colsPerRow + leftCols + col + 1;
                  if (n > totalSeats) return <div key={`r-${col}`} className="flex-1" />;
                  const booked = bookedSet.has(n);
                  const customer = seatToCustomer.get(n);
                  const rowLetter = String.fromCharCode(65 + rowIndex);
                  const seatLabel = `${rowLetter}${leftCols + col + 1}`;
                  return (
                    <div
                      key={n}
                      title={booked && customer ? `${seatLabel} · ${customer}` : booked ? seatLabel : `${seatLabel} · Available`}
                      className={cn(
                        "flex-1 min-w-[2rem] py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors",
                        booked ? "bg-slate-400 text-slate-700 cursor-default" : "bg-emerald-500 text-white"
                      )}
                    >
                      {seatLabel}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">{layoutLabel}</p>
      <div className="flex gap-4 mt-2 text-xs justify-center flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-500" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-slate-400" /> Booked
        </span>
      </div>
    </div>
  );
}

function BookingTable({
  bookings,
  onViewCustomer,
}: {
  bookings: CustomerBooking[];
  onViewCustomer: (b: CustomerBooking) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-200 hover:bg-transparent">
          <TableHead className="font-medium text-muted-foreground">Customer</TableHead>
          <TableHead className="font-medium text-muted-foreground">Email</TableHead>
          <TableHead className="font-medium text-muted-foreground">Seats</TableHead>
          <TableHead className="font-medium text-muted-foreground">Amount</TableHead>
          <TableHead className="font-medium text-muted-foreground">Payment</TableHead>
          <TableHead className="font-medium text-muted-foreground">Status</TableHead>
          <TableHead className="font-medium text-muted-foreground text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              No bookings for this bus.
            </TableCell>
          </TableRow>
        ) : (
          bookings.map((b) => (
            <TableRow key={b.id} className="border-slate-100">
              <TableCell className="font-medium text-foreground">{b.customerName}</TableCell>
              <TableCell className="text-muted-foreground">{b.email}</TableCell>
              <TableCell className="text-foreground">{b.seats.join(", ")}</TableCell>
              <TableCell className="font-medium text-foreground">
                ₹{b.amount.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className={cn(PAYMENT_STATUS_STYLES[b.paymentStatus])}>
                {b.paymentStatus.charAt(0).toUpperCase() + b.paymentStatus.slice(1)}
              </TableCell>
              <TableCell>
                <StatusBadge status={b.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => onViewCustomer(b)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function FlightInfoHeader({ flight }: { flight: VendorFlightCard }) {
  const seatsLeft = flight.totalSeats - flight.seatsBooked;
  const classes = flight.seatClasses?.length ? flight.seatClasses : [{ name: "Economy", rowFrom: "A", rowTo: String.fromCharCode(64 + Math.ceil(flight.totalSeats / 6)), totalSeats: flight.totalSeats, booked: flight.seatsBooked }];
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-semibold text-foreground font-mono">{flight.flightNumber}</p>
        <span className={cn(
          "inline-flex text-xs font-medium px-2 py-0.5 rounded-full",
          flight.flightType === "international" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
        )}>
          {flight.flightType === "international" ? "International" : "Domestic"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {flight.airline} · {flight.aircraft} · {flight.route}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {flight.departureTime} – {flight.arrivalTime}
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Total seats: {flight.totalSeats} · Seats left: <span className="font-medium text-foreground">{seatsLeft}</span> · Booked: {flight.seatsBooked} · Pending requests: {flight.pendingRequests}
      </p>
      {classes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Class details</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {classes.map((c, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{c.name}</span>: rows {c.rowFrom}–{c.rowTo} · {c.booked}/{c.totalSeats} booked
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FlightSeatStructure({ flight }: { flight: VendorFlightCard }) {
  const total = flight.totalSeats;
  const booked = flight.seatsBooked;
  const seatLayout = flight.seatLayout ?? null;

  /** When using vendor layout: build rows and track global seat index for booked state */
  const seatRowsFromLayout = seatLayout ? buildSeatRowsBookings(seatLayout) : null;
  const totalFromLayout = seatRowsFromLayout ? seatRowsFromLayout.reduce((s, r) => s + r.left_cols + r.right_cols, 0) : 0;

  /** First N seats (by front-to-back order) are booked */
  const bookedSet = new Set<number>();
  if (seatRowsFromLayout) {
    let idx = 0;
    for (const row of seatRowsFromLayout) {
      const rowSeats = row.left_cols + row.right_cols;
      for (let i = 0; i < rowSeats && idx < total; i++) {
        idx++;
        if (idx <= booked) bookedSet.add(idx);
      }
    }
  } else {
    const colsPerRow = 6;
    const rows = Math.ceil(total / colsPerRow);
    for (let i = 0; i < booked && i < total; i++) bookedSet.add(i + 1);
  }

  const seatClasses = flight.seatClasses ?? [];
  const rowToClass = new Map<string, string>();
  seatClasses.forEach((sc) => {
    const start = sc.rowFrom.charCodeAt(0);
    const end = sc.rowTo.charCodeAt(0);
    for (let r = start; r <= end; r++) rowToClass.set(String.fromCharCode(r), sc.name);
  });

  const colsPerRow = 6;
  const rows = Math.ceil(total / colsPerRow);

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-foreground mb-3">Seat structure · Tickets booked: {booked} / {total}</p>
      {seatLayout && (
        <div className="flex flex-wrap gap-2 mb-3">
          {BOOKINGS_CABIN_ORDER.map((cabin) => {
            if (!(cabin === "first" ? seatLayout.classes_enabled.first : cabin === "business" ? seatLayout.classes_enabled.business : seatLayout.classes_enabled.economy)) return null;
            const config = cabin === "first" ? seatLayout.cabin_first : cabin === "business" ? seatLayout.cabin_business : seatLayout.cabin_economy;
            const classTotal = config.rows * (config.left_cols + config.right_cols);
            return (
              <span key={cabin} className={cn("text-xs font-medium px-2.5 py-1 rounded-md", BOOKINGS_CABIN_COLOUR[cabin] ?? "bg-slate-200")}>
                {BOOKINGS_CABIN_LABEL[cabin]}: {config.rows} rows × {config.left_cols}-{config.right_cols} → {classTotal} seats
              </span>
            );
          })}
        </div>
      )}
      <div className="rounded-2xl overflow-hidden bg-slate-600 border border-slate-500 shadow-inner">
        <div className="bg-slate-700 text-slate-200 py-2 px-4 text-center text-xs font-medium border-b border-slate-600">
          Front · Cockpit
        </div>
        <div className="max-h-64 overflow-y-auto overflow-x-auto bg-slate-600" style={{ minHeight: "80px" }}>
          <div className="p-3">
            {seatRowsFromLayout ? (() => {
              let globalSeatIndex = 0;
              return (
                <div className="flex gap-1 items-end justify-start min-w-max">
                  {seatRowsFromLayout.map((row) => {
                    const colour = BOOKINGS_CABIN_COLOUR[row.cabin] ?? "bg-slate-400";
                    const rowLetter = String.fromCharCode(64 + row.globalRow);
                    const leftLabels = Array.from({ length: row.left_cols }, (_, i) => `${rowLetter}${i + 1}`);
                    const rightLabels = Array.from({ length: row.right_cols }, (_, i) => `${rowLetter}${row.left_cols + i + 1}`);
                    return (
                      <div key={`${row.globalRow}-${row.cabin}`} className="flex flex-col gap-0.5 flex-shrink-0 w-12 border border-slate-500/80 rounded-md overflow-hidden bg-slate-600/50">
                        <div className="text-[10px] font-bold text-center py-1 bg-slate-700 text-slate-300 border-b border-slate-600">{row.globalRow}</div>
                        <div className="flex flex-1 p-0.5 gap-0.5">
                          <div className="flex flex-col gap-0.5 flex-1">
                            {leftLabels.map((label) => {
                              globalSeatIndex++;
                              const isBooked = bookedSet.has(globalSeatIndex);
                              return (
                                <div key={label} title={isBooked ? `${label} · Booked` : `${label} · Available`} className={cn("min-h-[22px] flex items-center justify-center text-[10px] font-semibold rounded", isBooked ? "bg-slate-400 text-slate-700" : "bg-emerald-500 text-white", colour)}>{label}</div>
                              );
                            })}
                          </div>
                          <div className="w-1 bg-slate-500 rounded self-stretch my-0.5 shrink-0" aria-label="Aisle" />
                          <div className="flex flex-col gap-0.5 flex-1">
                            {rightLabels.map((label) => {
                              globalSeatIndex++;
                              const isBooked = bookedSet.has(globalSeatIndex);
                              return (
                                <div key={label} title={isBooked ? `${label} · Booked` : `${label} · Available`} className={cn("min-h-[22px] flex items-center justify-center text-[10px] font-semibold rounded", isBooked ? "bg-slate-400 text-slate-700" : "bg-emerald-500 text-white", colour)}>{label}</div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              Array.from({ length: rows }, (_, rowIndex) => {
                const rowLetter = String.fromCharCode(65 + rowIndex);
                const classForRow = rowToClass.get(rowLetter);
                const showClassLabel = classForRow && (rowIndex === 0 || rowToClass.get(String.fromCharCode(64 + rowIndex)) !== classForRow);
                return (
                  <div key={rowIndex}>
                    {showClassLabel && (
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1 mt-1 first:mt-0">{classForRow}</div>
                    )}
                    <div className="flex items-center gap-1.5 mb-2 last:mb-0">
                      <span className="w-5 text-center text-xs font-semibold text-slate-300 shrink-0">{rowLetter}</span>
                      <div className="flex-1 flex items-center gap-1">
                        {[0, 1, 2].map((col) => {
                          const seatNum = rowIndex * colsPerRow + col + 1;
                          if (seatNum > total) return <div key={col} className="w-9 h-8 rounded flex-shrink-0" />;
                          const isBooked = bookedSet.has(seatNum);
                          const seatLabel = `${rowLetter}${col + 1}`;
                          return (
                            <div key={seatNum} title={isBooked ? `${seatLabel} · Booked` : `${seatLabel} · Available`} className={cn("w-9 h-8 rounded-md text-[11px] font-semibold flex items-center justify-center flex-shrink-0 transition-colors", isBooked ? "bg-slate-400 text-slate-700" : "bg-emerald-500 text-white")}>{seatLabel}</div>
                          );
                        })}
                      </div>
                      <div className="w-3 h-8 rounded bg-slate-500 flex-shrink-0" aria-label="Aisle" />
                      <div className="flex-1 flex items-center gap-1">
                        {[3, 4, 5].map((col) => {
                          const seatNum = rowIndex * colsPerRow + col + 1;
                          if (seatNum > total) return <div key={col} className="w-9 h-8 rounded flex-shrink-0" />;
                          const isBooked = bookedSet.has(seatNum);
                          const seatLabel = `${rowLetter}${col + 1}`;
                          return (
                            <div key={seatNum} title={isBooked ? `${seatLabel} · Booked` : `${seatLabel} · Available`} className={cn("w-9 h-8 rounded-md text-[11px] font-semibold flex items-center justify-center flex-shrink-0 transition-colors", isBooked ? "bg-slate-400 text-slate-700" : "bg-emerald-500 text-white")}>{seatLabel}</div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        {seatRowsFromLayout ? `Front ← rows (left | aisle | right) → Back · ${totalFromLayout} seats` : `Rows A–${String.fromCharCode(64 + rows)} · Left 1–3 · Aisle · Right 4–6`}
      </p>
      <div className="flex gap-4 mt-2 text-xs justify-center flex-wrap">
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3.5 h-3.5 rounded bg-emerald-500" /> Available</span>
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3.5 h-3.5 rounded bg-slate-400" /> Booked</span>
      </div>
    </div>
  );
}

function FlightBookingsTable({ bookings }: { bookings: FlightBookingRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-200 hover:bg-transparent">
          <TableHead className="font-medium text-muted-foreground">Ref</TableHead>
          <TableHead className="font-medium text-muted-foreground">Customer</TableHead>
          <TableHead className="font-medium text-muted-foreground">Passengers</TableHead>
          <TableHead className="font-medium text-muted-foreground">Amount</TableHead>
          <TableHead className="font-medium text-muted-foreground">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No bookings for this flight.
            </TableCell>
          </TableRow>
        ) : (
          bookings.map((b) => (
            <TableRow key={b.id} className="border-slate-100">
              <TableCell className="font-mono text-xs">{b.ref}</TableCell>
              <TableCell className="font-medium text-foreground">{b.customerName}</TableCell>
              <TableCell className="text-foreground">{b.passengers}</TableCell>
              <TableCell className="font-medium text-foreground">₹{b.amount.toLocaleString("en-IN")}</TableCell>
              <TableCell>
                <span className={cn(
                  "inline-flex text-xs font-medium px-2 py-0.5 rounded-full",
                  b.status === "Pending" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                )}>
                  {b.status}
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function BookingDetailModal({
  booking,
  open,
  onClose,
}: {
  booking: CustomerBooking | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!booking) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-display font-semibold">
            Booking {booking.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Customer Details
            </p>
            <div className="flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{booking.customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Mail className="h-4 w-4 shrink-0" />
              {booking.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Phone className="h-4 w-4 shrink-0" />
              {booking.phone}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Booking Details
            </p>
            <ul className="text-sm space-y-1">
              <li>
                <span className="text-muted-foreground">Seats:</span>{" "}
                {booking.seats.join(", ")}
              </li>
              <li>
                <span className="text-muted-foreground">Booking ID:</span>{" "}
                {booking.id}
              </li>
              <li>
                <span className="text-muted-foreground">Booked On:</span>{" "}
                {booking.bookedOn}
              </li>
              <li>
                <span className="text-muted-foreground">Payment Status:</span>{" "}
                <span className={cn(PAYMENT_STATUS_STYLES[booking.paymentStatus])}>
                  {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">Amount:</span>{" "}
                <span className="font-semibold text-foreground">
                  ₹{booking.amount.toLocaleString("en-IN")}
                </span>
              </li>
            </ul>
            <div className="mt-2">
              <StatusBadge status={booking.status} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="rounded-xl gap-2 w-full sm:w-auto"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark as Checked-in
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2 border-destructive text-destructive hover:bg-destructive/10 w-full sm:w-auto"
            onClick={onClose}
          >
            <XCircle className="h-4 w-4" />
            Cancel Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Hotel booking row from GET /api/listings/:listingId/hotel-bookings */
type HotelBookingRow = {
  id: string;
  bookingRef: string;
  userId: string;
  hotelBranchId: string;
  branchName?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  requirementsText?: string;
  documentUrls: { label?: string; url?: string }[] | string[];
  status: string;
  roomType?: string;
  roomNumber?: string;
  totalCents?: number;
  createdAt: string;
};

function HotelBookingsSection({ dateFilter }: { dateFilter: string }) {
  const [listings, setListings] = useState<{ id: string; name: string; type: string }[]>([]);
  const [bookingsByListing, setBookingsByListing] = useState<Record<string, { listingName: string; bookings: HotelBookingRow[] }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<(HotelBookingRow & { listingId: string; listingName: string }) | null>(null);
  const [hotelDetailOpen, setHotelDetailOpen] = useState(false);
  const [selectedHotelDetail, setSelectedHotelDetail] = useState<{
    listingId: string;
    listingName: string;
    hotelBranchId: string;
    branchName: string;
    bookings: (HotelBookingRow & { listingId: string; listingName: string })[];
  } | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveRoomNumber, setApproveRoomNumber] = useState("");
  const [approveVendorNotes, setApproveVendorNotes] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const loadHotelBookings = useCallback(() => {
    setLoading(true);
    setError("");
    vendorFetch<{ listings: { id: string; name: string; type: string }[] }>("/api/listings")
      .then((data) => {
        const hotelListings = (data.listings ?? []).filter((l) => (l.type || "").toLowerCase() === "hotel");
        setListings(hotelListings);
        if (hotelListings.length === 0) {
          setBookingsByListing({});
          return;
        }
        return Promise.all(
          hotelListings.map((listing) =>
            vendorFetch<{ bookings: HotelBookingRow[] }>(`/api/listings/${listing.id}/hotel-bookings`)
              .then((res) => ({ listing, bookings: res.bookings ?? [] }))
              .catch(() => ({ listing, bookings: [] as HotelBookingRow[] }))
          )
        );
      })
      .then((results) => {
        if (!results) return;
        const byListing: Record<string, { listingName: string; bookings: HotelBookingRow[] }> = {};
        results.forEach((r: { listing: { id: string; name: string }; bookings: HotelBookingRow[] }) => {
          byListing[r.listing.id] = { listingName: r.listing.name, bookings: r.bookings };
        });
        setBookingsByListing(byListing);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load hotel bookings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHotelBookings();
  }, [loadHotelBookings]);

  const allHotelBookingsRaw = Object.entries(bookingsByListing).flatMap(([listingId, { listingName, bookings }]) =>
    bookings.map((b) => ({ listingId, listingName, ...b }))
  );
  // Filter by date: show bookings where the selected date falls within stay (check-in <= date <= check-out)
  const allHotelBookings = dateFilter
    ? allHotelBookingsRaw.filter((b) => b.checkIn <= dateFilter && b.checkOut >= dateFilter)
    : allHotelBookingsRaw;
  const pendingCount = allHotelBookings.filter((b) => b.status === "pending_vendor").length;

  const openDetail = (b: HotelBookingRow & { listingId: string; listingName: string }) => {
    setSelectedBooking(b);
    setDetailOpen(true);
  };

  const openHotelDetail = (listingId: string, listingName: string, hotelBranchId: string, branchName: string) => {
    const forBranch = allHotelBookings.filter((b) => b.listingId === listingId && b.hotelBranchId === hotelBranchId);
    setSelectedHotelDetail({ listingId, listingName, hotelBranchId, branchName, bookings: forBranch });
    setHotelDetailOpen(true);
  };

  const openBookingFromHotelDetail = (b: HotelBookingRow & { listingId: string; listingName: string }) => {
    setHotelDetailOpen(false);
    setSelectedHotelDetail(null);
    setSelectedBooking(b);
    setDetailOpen(true);
  };

  const openApprove = () => {
    if (!selectedBooking) return;
    setApproveRoomNumber(selectedBooking.roomNumber ?? "");
    setApproveVendorNotes("");
    setApproveError("");
    setApproveOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedBooking || !approveRoomNumber.trim()) {
      setApproveError("Room number is required.");
      return;
    }
    setApproveLoading(true);
    setApproveError("");
    try {
      await vendorFetch(`/api/listings/${selectedBooking.listingId}/hotel-bookings/${selectedBooking.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: approveRoomNumber.trim(),
          vendorNotes: approveVendorNotes.trim() || undefined,
        }),
      });
      setApproveOpen(false);
      setDetailOpen(false);
      setSelectedBooking(null);
      loadHotelBookings();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBooking) return;
    if (!confirm("Reject this booking request? The guest will see the booking as rejected.")) return;
    setRejectLoading(true);
    try {
      await vendorFetch(`/api/listings/${selectedBooking.listingId}/hotel-bookings/${selectedBooking.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setDetailOpen(false);
      setSelectedBooking(null);
      loadHotelBookings();
    } catch {
      // ignore
    } finally {
      setRejectLoading(false);
    }
  };

  const docUrls = (b: HotelBookingRow): { label?: string; url?: string }[] => {
    const d = b.documentUrls;
    if (Array.isArray(d) && d.length > 0 && typeof d[0] === "object" && d[0] !== null) return d as { label?: string; url?: string }[];
    return [];
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading hotel bookings…</p>
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <Hotel className="h-5 w-5 text-amber-600" />
              Hotel booking requests
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              {dateFilter
                ? `Bookings for ${new Date(dateFilter + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} (stays that include this date). `
                : ""}
              {listings.length === 0
                ? "Add a hotel listing and get it verified to receive bookings."
                : pendingCount > 0
                  ? `${pendingCount} pending request(s). Allot room number to approve — the guest already saw the price when they selected the room.`
                  : "View requests below. Approve with room number so the guest gets their receipt."}
              {listings.length > 0 && allHotelBookings.length > 0 && " Click View details on a card to see that branch's bookings and open individual booking details."}
            </p>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no hotel listings. Add one from My Listings → Hotel.</p>
            ) : allHotelBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hotel booking requests yet.</p>
            ) : (
              <>
                {/* Hotel cards: one per branch (like fleet), View details opens sheet with that branch's bookings */}
                {(() => {
                  const branchMap = new Map<string, { listingId: string; listingName: string; hotelBranchId: string; branchName: string }>();
                  for (const b of allHotelBookings) {
                    const key = `${b.listingId}\t${b.hotelBranchId}`;
                    if (!branchMap.has(key)) {
                      branchMap.set(key, {
                        listingId: b.listingId,
                        listingName: b.listingName,
                        hotelBranchId: b.hotelBranchId,
                        branchName: (b.branchName && b.branchName.trim()) || b.hotelBranchId || "Branch",
                      });
                    }
                  }
                  const branches = Array.from(branchMap.values());
                  return (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                      {branches.map((branch) => {
                        const forBranch = allHotelBookings.filter(
                          (b) => b.listingId === branch.listingId && b.hotelBranchId === branch.hotelBranchId
                        );
                        const count = forBranch.length;
                        return (
                          <div
                            key={`${branch.listingId}-${branch.hotelBranchId}`}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                <Hotel className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">{branch.listingName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{branch.branchName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{count} booking{count !== 1 ? "s" : ""} for this {dateFilter ? "date" : "period"}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-3 rounded-lg gap-1.5 w-fit"
                              onClick={() => openHotelDetail(branch.listingId, branch.listingName, branch.hotelBranchId, branch.branchName)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View details
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <p className="text-sm text-muted-foreground mb-3">All hotel booking requests — click the icon to see full details and approve.</p>
                {dateFilter && (
                  <p className="text-sm font-medium text-foreground mb-2">
                    Bookings for {new Date(dateFilter + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )}
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-9">Details</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Hotel / Branch</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Nights</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Room / Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allHotelBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="w-9 p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100"
                          title="View details"
                          onClick={() => openDetail(b)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{b.bookingRef}</TableCell>
                      <TableCell>
                        <span className="font-medium">{b.listingName}</span>
                        {b.branchName && <span className="text-muted-foreground text-xs block">{b.branchName}</span>}
                      </TableCell>
                      <TableCell>{b.guestName}</TableCell>
                      <TableCell>{b.checkIn}</TableCell>
                      <TableCell>{b.nights}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            b.status === "pending_vendor" && "text-amber-600 font-medium",
                            b.status === "approved_awaiting_payment" && "text-blue-600",
                            b.status === "confirmed" && "text-emerald-600",
                            b.status === "rejected" && "text-red-600"
                          )}
                        >
                          {b.status === "pending_vendor" ? "Pending" : b.status === "approved_awaiting_payment" ? "Approved (await payment)" : b.status === "confirmed" ? "Confirmed" : "Rejected"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {b.roomNumber && <span className="font-mono">{b.roomNumber}</span>}
                        {b.roomNumber && b.totalCents != null && " · "}
                        {b.totalCents != null && `₹${(b.totalCents / 100).toFixed(0)}`}
                        {!b.roomNumber && !b.totalCents && "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={(o) => !o && (setDetailOpen(false), setSelectedBooking(null))}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-amber-600" /> Hotel booking
            </SheetTitle>
          </SheetHeader>
          {selectedBooking && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking ref</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{selectedBooking.bookingRef}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Listing / Branch</p>
                <p className="text-foreground mt-0.5">{selectedBooking.listingName}</p>
                {selectedBooking.branchName && <p className="text-sm text-muted-foreground">{selectedBooking.branchName}</p>}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Guest</p>
                <p className="text-foreground mt-0.5">{selectedBooking.guestName}</p>
                {selectedBooking.guestPhone && <p className="text-sm text-muted-foreground">{selectedBooking.guestPhone}</p>}
                {selectedBooking.guestEmail && <p className="text-sm text-muted-foreground">{selectedBooking.guestEmail}</p>}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stay</p>
                <p className="text-foreground mt-0.5">{selectedBooking.checkIn} → {selectedBooking.checkOut} ({selectedBooking.nights} night(s))</p>
                {selectedBooking.roomType && <p className="text-sm text-foreground mt-0.5">Room type requested: <strong>{selectedBooking.roomType}</strong></p>}
              </div>
              {selectedBooking.requirementsText && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Requirements</p>
                  <p className="text-sm text-foreground mt-0.5">{selectedBooking.requirementsText}</p>
                </div>
              )}
              {docUrls(selectedBooking).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documents</p>
                  <ul className="text-sm mt-0.5 space-y-0.5">
                    {docUrls(selectedBooking).map((d, i) => (
                      <li key={i}>
                        {d.label && <span>{d.label}: </span>}
                        {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{d.url}</a> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                <p className={cn(
                  "mt-0.5 font-medium",
                  selectedBooking.status === "pending_vendor" && "text-amber-600",
                  selectedBooking.status === "approved_awaiting_payment" && "text-blue-600",
                  selectedBooking.status === "confirmed" && "text-emerald-600",
                  selectedBooking.status === "rejected" && "text-red-600"
                )}>
                  {selectedBooking.status === "pending_vendor" ? "Pending" : selectedBooking.status === "approved_awaiting_payment" ? "Approved (await payment)" : selectedBooking.status === "confirmed" ? "Confirmed" : "Rejected"}
                </p>
                {selectedBooking.roomNumber && <p className="text-sm text-foreground mt-1">Room: {selectedBooking.roomNumber}</p>}
                {selectedBooking.totalCents != null && <p className="text-sm text-foreground">Total: ₹{(selectedBooking.totalCents / 100).toFixed(2)}</p>}
              </div>
              {selectedBooking.status === "pending_vendor" && (
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={handleReject} disabled={rejectLoading}>
                    {rejectLoading ? "Rejecting…" : "Reject"}
                  </Button>
                  <Button type="button" className="rounded-xl bg-amber-600 hover:bg-amber-700" onClick={openApprove}>
                    Allot room & approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Hotel detail sheet: hotel info + list of bookings with Eye to open individual booking */}
      <Sheet open={hotelDetailOpen} onOpenChange={(o) => !o && (setHotelDetailOpen(false), setSelectedHotelDetail(null))}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-amber-600" />
              {selectedHotelDetail ? `${selectedHotelDetail.listingName} — ${selectedHotelDetail.branchName}` : "Hotel details"}
            </SheetTitle>
            {selectedHotelDetail && (
              <p className="text-sm text-muted-foreground font-normal">
                {dateFilter ? `Bookings for ${new Date(dateFilter + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : "All bookings"} — click the icon to view and manage each booking.
              </p>
            )}
          </SheetHeader>
          {selectedHotelDetail && (
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Bookings</h4>
                {selectedHotelDetail.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings for this branch{dateFilter ? " on this date" : ""}.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-9">Details</TableHead>
                        <TableHead>Ref</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Nights</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Room / Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedHotelDetail.bookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="w-9 p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100"
                              title="View booking details"
                              onClick={() => openBookingFromHotelDetail(b)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{b.bookingRef}</TableCell>
                          <TableCell className="text-xs">{b.branchName || "—"}</TableCell>
                          <TableCell>{b.guestName}</TableCell>
                          <TableCell>{b.checkIn}</TableCell>
                          <TableCell>{b.nights}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                b.status === "pending_vendor" && "text-amber-600 font-medium",
                                (b.status === "approved_awaiting_payment" || b.status === "confirmed") && "text-emerald-600",
                                b.status === "rejected" && "text-red-600"
                              )}
                            >
                              {b.status === "pending_vendor" ? "Pending" : b.status === "approved_awaiting_payment" ? "Awaiting payment" : b.status === "confirmed" ? "Confirmed" : "Rejected"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {b.roomNumber && <span className="font-mono">{b.roomNumber}</span>}
                            {b.roomNumber && b.totalCents != null && " · "}
                            {b.totalCents != null && `₹${(b.totalCents / 100).toFixed(0)}`}
                            {!b.roomNumber && !b.totalCents && "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve dialog: room number, total, notes */}
      <Dialog open={approveOpen} onOpenChange={(o) => !o && (setApproveOpen(false), setApproveError(""))}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Allot room & approve</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">The guest already saw the price when they selected the room type. Enter the allotted room number and total; the guest will see the bill and can pay online to confirm.</p>
          <div className="space-y-3 mt-4">
            <div>
              <label className="text-sm font-medium text-foreground">Room number *</label>
              <Input className="rounded-xl mt-1" value={approveRoomNumber} onChange={(e) => setApproveRoomNumber(e.target.value)} placeholder="e.g. 101" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Message to guest (optional)</label>
              <Input className="rounded-xl mt-1" value={approveVendorNotes} onChange={(e) => setApproveVendorNotes(e.target.value)} placeholder="e.g. Early check-in arranged" />
            </div>
          </div>
          {approveError && <p className="text-sm text-destructive">{approveError}</p>}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setApproveOpen(false)} className="rounded-xl">Cancel</Button>
            <Button type="button" className="rounded-xl bg-amber-600 hover:bg-amber-700" onClick={handleApprove} disabled={approveLoading}>
              {approveLoading ? "Saving…" : "Approve & generate bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ExperienceBookingRow = {
  id: string;
  bookingRef: string;
  userId: string;
  participantsCount: number;
  totalCents: number;
  status: string;
  paidAt?: string;
  createdAt: string;
  slotDate: string;
  slotTime: string;
};

/** Experience details from GET /api/listings/:listingId/experience */
type ExperienceInfo = {
  name: string;
  category: string;
  city: string;
  location_address?: string | null;
  duration_text: string;
  short_description?: string | null;
  long_description?: string | null;
  max_participants_per_slot: number;
  price_per_person_cents: number;
  tax_included?: boolean;
  status: string;
};

function ExperienceBookingsSection({ dateFilter }: { dateFilter: string }) {
  const [listings, setListings] = useState<{ id: string; name: string; type: string }[]>([]);
  const [bookingsByListing, setBookingsByListing] = useState<Record<string, { experienceName: string; bookings: ExperienceBookingRow[] }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [experienceDetailOpen, setExperienceDetailOpen] = useState(false);
  const [selectedExperienceDetail, setSelectedExperienceDetail] = useState<{ listingId: string; experienceName: string; bookings: ExperienceBookingRow[] } | null>(null);
  const [experienceDetailsLoading, setExperienceDetailsLoading] = useState(false);
  const [selectedExperienceInfo, setSelectedExperienceInfo] = useState<ExperienceInfo | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<(ExperienceBookingRow & { listingId: string; experienceName: string }) | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    vendorFetch<{ listings: { id: string; name: string; type: string }[] }>("/api/listings")
      .then((data) => {
        if (cancelled) return;
        const expListings = (data.listings ?? []).filter((l) => (l.type || "").toLowerCase() === "experience");
        setListings(expListings);
        if (expListings.length === 0) {
          setBookingsByListing({});
          return;
        }
        return Promise.all(
          expListings.map((listing) =>
            vendorFetch<{ bookings: ExperienceBookingRow[] }>(
              `/api/listings/${listing.id}/experience/bookings?date=${encodeURIComponent(dateFilter)}`
            ).then((res) => ({ listing, bookings: res.bookings ?? [] }))
          )
        );
      })
      .then((results) => {
        if (cancelled || !results) return;
        const byListing: Record<string, { experienceName: string; bookings: ExperienceBookingRow[] }> = {};
        results.forEach((r: { listing: { id: string; name: string }; bookings: ExperienceBookingRow[] }) => {
          byListing[r.listing.id] = { experienceName: r.listing.name, bookings: r.bookings };
        });
        setBookingsByListing(byListing);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFilter]);

  if (loading) {
    return (
      <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading experience bookings for {dateFilter}…</p>
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const allEntries = Object.entries(bookingsByListing).flatMap(([listingId, { experienceName, bookings }]) =>
    bookings.map((b) => ({ listingId, experienceName, ...b }))
  );
  const hasAny = allEntries.length > 0;

  const openExperienceDetail = (listingId: string) => {
    const entry = bookingsByListing[listingId];
    if (entry) setSelectedExperienceDetail({ listingId, experienceName: entry.experienceName, bookings: entry.bookings });
    setSelectedExperienceInfo(null);
    setExperienceDetailOpen(true);
    setExperienceDetailsLoading(true);
    vendorFetch<ExperienceInfo>(`/api/listings/${listingId}/experience`)
      .then((data) => setSelectedExperienceInfo(data))
      .catch(() => setSelectedExperienceInfo(null))
      .finally(() => setExperienceDetailsLoading(false));
  };

  const closeExperienceDetail = () => {
    setExperienceDetailOpen(false);
    setSelectedExperienceDetail(null);
    setSelectedExperienceInfo(null);
  };
  const openBookingDetail = (b: typeof allEntries[0]) => {
    setSelectedBookingDetail(b);
    setBookingDetailOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Experience cards for this date */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Experiences for {dateFilter}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">Click View details on a card to see all bookings for that experience.</p>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no experience listings. Add one from My Listings.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => {
                  const entry = bookingsByListing[listing.id];
                  const count = entry?.bookings?.length ?? 0;
                  return (
                    <div
                      key={listing.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col"
                    >
                      <p className="font-medium text-foreground">{entry?.experienceName ?? listing.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{count} booking{count !== 1 ? "s" : ""} for this day</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-lg gap-1.5 w-fit"
                        onClick={() => openExperienceDetail(listing.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View details
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All bookings for this day (table with full details on click) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold">Bookings for {dateFilter}</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">Click the icon to see complete booking and payment details.</p>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? null : !hasAny ? (
              <p className="text-sm text-muted-foreground">No bookings for this date yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-9">Details</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEntries.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="w-9 p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100"
                          title="View full details"
                          onClick={() => openBookingDetail(b)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{b.bookingRef}</TableCell>
                      <TableCell>{b.experienceName}</TableCell>
                      <TableCell>{b.slotDate} · {b.slotTime}</TableCell>
                      <TableCell>{b.participantsCount}</TableCell>
                      <TableCell>₹{(b.totalCents / 100).toFixed(0)}</TableCell>
                      <TableCell>
                        <span className={b.paidAt ? "text-emerald-600" : "text-amber-600"}>
                          {b.paidAt ? "Paid" : "Pending payment"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sheet: experience details first, then bookings for one experience on this day */}
      <Sheet open={experienceDetailOpen} onOpenChange={(o) => !o && closeExperienceDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle>
              {selectedExperienceDetail ? `${selectedExperienceDetail.experienceName} — ${dateFilter}` : "Experience details"}
            </SheetTitle>
          </SheetHeader>
          {selectedExperienceDetail && (
            <div className="mt-6 space-y-6">
              {/* Experience details (fetched) */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Experience details</h4>
                {experienceDetailsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : selectedExperienceInfo ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> <strong>{selectedExperienceInfo.name}</strong></p>
                    <p><span className="text-muted-foreground">Category:</span> {selectedExperienceInfo.category}</p>
                    <p><span className="text-muted-foreground">City:</span> {selectedExperienceInfo.city}</p>
                    {selectedExperienceInfo.location_address && (
                      <p><span className="text-muted-foreground">Address:</span> {selectedExperienceInfo.location_address}</p>
                    )}
                    <p><span className="text-muted-foreground">Duration:</span> {selectedExperienceInfo.duration_text}</p>
                    <p><span className="text-muted-foreground">Max participants per slot:</span> {selectedExperienceInfo.max_participants_per_slot}</p>
                    <p><span className="text-muted-foreground">Price per person:</span> ₹{(selectedExperienceInfo.price_per_person_cents / 100).toFixed(0)}{selectedExperienceInfo.tax_included ? " (tax included)" : ""}</p>
                    {selectedExperienceInfo.short_description && (
                      <p><span className="text-muted-foreground">Description:</span> {selectedExperienceInfo.short_description}</p>
                    )}
                    <p><span className="text-muted-foreground">Status:</span> {selectedExperienceInfo.status}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Could not load experience details.</p>
                )}
              </div>

              {/* Bookings for this day */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Bookings for this day</h4>
                {selectedExperienceDetail.bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings for this experience on this date.</p>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-9" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedExperienceDetail.bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.bookingRef}</TableCell>
                        <TableCell>{b.slotDate} · {b.slotTime}</TableCell>
                        <TableCell>{b.participantsCount}</TableCell>
                        <TableCell>₹{(b.totalCents / 100).toFixed(0)}</TableCell>
                        <TableCell>
                          <span className={b.paidAt ? "text-emerald-600" : "text-amber-600"}>
                            {b.paidAt ? "Paid" : "Pending payment"}
                          </span>
                        </TableCell>
                        <TableCell className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View full details"
                            onClick={() => {
                              setExperienceDetailOpen(false);
                              setSelectedBookingDetail({ ...b, listingId: selectedExperienceDetail.listingId, experienceName: selectedExperienceDetail.experienceName });
                              setBookingDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet: single booking full details */}
      <Sheet open={bookingDetailOpen} onOpenChange={(o) => !o && (setBookingDetailOpen(false), setSelectedBookingDetail(null))}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle>Booking details</SheetTitle>
          </SheetHeader>
          {selectedBookingDetail && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking reference</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{selectedBookingDetail.bookingRef}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Experience</p>
                <p className="text-foreground mt-0.5">{selectedBookingDetail.experienceName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slot</p>
                <p className="text-foreground mt-0.5">{selectedBookingDetail.slotDate} · {selectedBookingDetail.slotTime}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Participants</p>
                <p className="text-foreground mt-0.5">{selectedBookingDetail.participantsCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</p>
                <p className="text-foreground mt-0.5">₹{(selectedBookingDetail.totalCents / 100).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment status</p>
                <p className={`mt-0.5 ${selectedBookingDetail.paidAt ? "text-emerald-600" : "text-amber-600"}`}>
                  {selectedBookingDetail.paidAt ? "Paid" : "Pending payment"}
                </p>
                {selectedBookingDetail.paidAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">Paid at: {new Date(selectedBookingDetail.paidAt).toLocaleString()}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booked on</p>
                <p className="text-foreground mt-0.5 text-sm">{new Date(selectedBookingDetail.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User</p>
                <p className="text-foreground mt-0.5 text-sm font-mono text-muted-foreground">ID: {selectedBookingDetail.userId?.slice(0, 8)}…</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

type EventBookingRow = {
  id: string;
  bookingRef: string;
  userId: string;
  totalCents: number;
  status: string;
  paidAt?: string;
  createdAt: string;
};

/** Event details from GET /api/listings/:listingId/event */
type EventInfo = {
  name: string;
  category: string;
  city: string;
  venue_name: string;
  venue_address?: string | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  organizer_name: string;
  description?: string | null;
  status: string;
  ticket_types?: { name: string; price_cents: number; quantity_total: number; max_per_user: number }[];
};

function EventBookingsSection({ dateFilter }: { dateFilter: string }) {
  const [listings, setListings] = useState<{ id: string; name: string; type: string }[]>([]);
  const [eventsByListing, setEventsByListing] = useState<Record<string, { eventName: string; startDate: string; endDate: string }>>({});
  const [bookingsByListing, setBookingsByListing] = useState<Record<string, { eventName: string; startDate: string; endDate: string; bookings: EventBookingRow[] }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<{ listingId: string; eventName: string; bookings: EventBookingRow[] } | null>(null);
  const [eventDetailsLoading, setEventDetailsLoading] = useState(false);
  const [selectedEventInfo, setSelectedEventInfo] = useState<EventInfo | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  type EventBookingEntry = EventBookingRow & { listingId: string; eventName: string; eventStartDate?: string; eventEndDate?: string };
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<EventBookingEntry | null>(null);

  useEffect(() => {
    if (!dateFilter || dateFilter.length < 10) {
      setBookingsByListing({});
      setLoading(false);
      return;
    }
    const selectedDate = dateFilter.slice(0, 10);
    let cancelled = false;
    setLoading(true);
    setError("");
    vendorFetch<{ listings: { id: string; name: string; type: string }[] }>("/api/listings")
      .then((data) => {
        if (cancelled) return;
        const eventListings = (data.listings ?? []).filter((l) => (l.type || "").toLowerCase() === "event");
        setListings(eventListings);
        if (eventListings.length === 0) {
          setEventsByListing({});
          setBookingsByListing({});
          return;
        }
        return Promise.all(
          eventListings.map((listing) =>
            vendorFetch<EventInfo>(`/api/listings/${listing.id}/event`).then((ev) => ({ listing, ev }))
          )
        );
      })
      .then((results) => {
        if (cancelled || !results) return;
        const eventMap: Record<string, { eventName: string; startDate: string; endDate: string }> = {};
        results.forEach((r: { listing: { id: string; name: string }; ev: EventInfo }) => {
          const start = (r.ev.start_date ?? "").slice(0, 10);
          const end = (r.ev.end_date ?? "").slice(0, 10);
          eventMap[r.listing.id] = { eventName: r.ev.name ?? r.listing.name, startDate: start, endDate: end };
        });
        setEventsByListing(eventMap);
        const liveOnDate = results.filter((r: { listing: { id: string }; ev: EventInfo }) => {
          const start = (r.ev.start_date ?? "").slice(0, 10);
          const end = (r.ev.end_date ?? "").slice(0, 10);
          return start && end && selectedDate >= start && selectedDate <= end;
        });
        const liveListingIds = liveOnDate.map((r: { listing: { id: string } }) => r.listing.id);
        if (liveListingIds.length === 0) {
          setBookingsByListing({});
          return;
        }
        return Promise.all(
          liveListingIds.map((listingId: string) =>
            vendorFetch<{ bookings: EventBookingRow[] }>(`/api/listings/${listingId}/event/bookings`).then((res) => ({
              listingId,
              eventName: eventMap[listingId]?.eventName ?? "",
              startDate: eventMap[listingId]?.startDate ?? "",
              endDate: eventMap[listingId]?.endDate ?? "",
              bookings: res.bookings ?? [],
            }))
          )
        );
      })
      .then((results) => {
        if (cancelled || !results) return;
        const byListing: Record<string, { eventName: string; startDate: string; endDate: string; bookings: EventBookingRow[] }> = {};
        results.forEach((r: { listingId: string; eventName: string; startDate: string; endDate: string; bookings: EventBookingRow[] }) => {
          byListing[r.listingId] = { eventName: r.eventName, startDate: r.startDate, endDate: r.endDate, bookings: r.bookings };
        });
        setBookingsByListing(byListing);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFilter]);

  if (loading) {
    return (
      <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading events for {dateFilter}…</p>
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const allEntries: EventBookingEntry[] = Object.entries(bookingsByListing).flatMap(([listingId, { eventName, startDate, endDate, bookings }]) =>
    bookings.map((b) => ({ ...b, listingId, eventName, eventStartDate: startDate, eventEndDate: endDate }))
  );

  const openEventDetail = (listingId: string) => {
    const entry = bookingsByListing[listingId];
    if (entry) setSelectedEventDetail({ listingId, eventName: entry.eventName, bookings: entry.bookings });
    setSelectedEventInfo(null);
    setEventDetailOpen(true);
    setEventDetailsLoading(true);
    vendorFetch<EventInfo>(`/api/listings/${listingId}/event`)
      .then((data) => setSelectedEventInfo(data))
      .catch(() => setSelectedEventInfo(null))
      .finally(() => setEventDetailsLoading(false));
  };

  const closeEventDetail = () => {
    setEventDetailOpen(false);
    setSelectedEventDetail(null);
    setSelectedEventInfo(null);
  };

  const openBookingDetail = (b: EventBookingEntry) => {
    setSelectedBookingDetail(b);
    setBookingDetailOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Events for {dateFilter}
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">Only events that are live on the selected date (between their start and end date) are shown. Click View details to see bookings.</p>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no event listings. Add one from My Listings.</p>
            ) : Object.keys(bookingsByListing).length === 0 ? (
              <p className="text-sm text-muted-foreground">No events are live on {dateFilter}. Change the date above or add events whose start–end range includes this date.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(bookingsByListing).map(([listingId, entry]) => {
                  const count = entry.bookings.length;
                  return (
                    <div key={listingId} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col">
                      <p className="font-medium text-foreground">{entry.eventName}</p>
                      <p className="text-xs text-muted-foreground mt-1">Event live: {entry.startDate}{entry.endDate !== entry.startDate ? ` – ${entry.endDate}` : ""}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{count} booking{count !== 1 ? "s" : ""}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-lg gap-1.5 w-fit"
                        onClick={() => openEventDetail(listingId)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View details
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {allEntries.length > 0 && (
          <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display font-semibold">All event bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Event dates (live)</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Booked on</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEntries.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-foreground">{b.bookingRef}</TableCell>
                      <TableCell>{b.eventName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{b.eventStartDate}{b.eventEndDate && b.eventStartDate !== b.eventEndDate ? ` – ${b.eventEndDate}` : ""}</TableCell>
                      <TableCell>₹{(b.totalCents / 100).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{b.status}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBookingDetail(b)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={eventDetailOpen} onOpenChange={(o) => !o && closeEventDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold">
              {selectedEventDetail ? `${selectedEventDetail.eventName} — ${dateFilter}` : "Event details"}
            </SheetTitle>
          </SheetHeader>
          {eventDetailsLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : selectedEventInfo ? (
            <div className="mt-6 space-y-4">
              <div>
                <p className="font-medium text-foreground">{selectedEventInfo.name}</p>
                <p className="text-sm text-muted-foreground">{selectedEventInfo.category} · {selectedEventInfo.city}</p>
                <p className="text-xs text-foreground mt-1">{selectedEventInfo.venue_name}{selectedEventInfo.venue_address ? ` · ${selectedEventInfo.venue_address}` : ""}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedEventInfo.start_date}{selectedEventInfo.end_date !== selectedEventInfo.start_date ? ` – ${selectedEventInfo.end_date}` : ""} · {selectedEventInfo.start_time} – {selectedEventInfo.end_time}</p>
                {selectedEventInfo.description && <p className="text-sm text-foreground mt-2">{selectedEventInfo.description}</p>}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Bookings for this event</h4>
                {selectedEventDetail?.bookings?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEventDetail?.bookings?.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <div>
                          <p className="font-mono text-sm text-foreground">{b.bookingRef}</p>
                          <p className="text-xs text-muted-foreground">₹{(b.totalCents / 100).toLocaleString()} · {b.status}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBookingDetail({ ...b, listingId: selectedEventDetail!.listingId, eventName: selectedEventDetail!.eventName })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load event details.</p>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={bookingDetailOpen} onOpenChange={setBookingDetailOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Event booking</DialogTitle>
          </DialogHeader>
          {selectedBookingDetail && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking ref</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{selectedBookingDetail.bookingRef}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</p>
                <p className="text-foreground mt-0.5">{selectedBookingDetail.eventName}</p>
              </div>
              {(selectedBookingDetail.eventStartDate || selectedBookingDetail.eventEndDate) && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event live (dates)</p>
                  <p className="text-foreground mt-0.5 text-sm">{selectedBookingDetail.eventStartDate}{selectedBookingDetail.eventEndDate && selectedBookingDetail.eventStartDate !== selectedBookingDetail.eventEndDate ? ` – ${selectedBookingDetail.eventEndDate}` : ""}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</p>
                <p className="text-foreground mt-0.5">₹{(selectedBookingDetail.totalCents / 100).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                <p className="capitalize text-foreground mt-0.5">{selectedBookingDetail.status}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment</p>
                <p className={`mt-0.5 ${selectedBookingDetail.paidAt ? "text-emerald-600" : "text-amber-600"}`}>{selectedBookingDetail.paidAt ? "Paid" : "Pending"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booked on</p>
                <p className="text-foreground mt-0.5 text-sm">{new Date(selectedBookingDetail.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Format a Date to YYYY-MM-DD in local time (avoids UTC date-shift bugs). */
function dateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayYYYYMMDD(): string {
  return dateToYYYYMMDD(new Date());
}

// ─── Main page ───────────────────────────────────────────────────────────

export default function Bookings() {
  const [selectedCategory, setSelectedCategory] = useState("transport");
  const [busDetailOpen, setBusDetailOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusBookingCard | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBooking | null>(null);
  const [dateFilter, setDateFilter] = useState(todayYYYYMMDD);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [transportVehicleType, setTransportVehicleType] = useState<"bus" | "car" | "flight">("bus");
  const [transportBuses, setTransportBuses] = useState<BusBookingCard[]>([]);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportError, setTransportError] = useState("");
  const [carBookings, setCarBookings] = useState<CarBookingRow[]>([]);
  const [carBookingsLoading, setCarBookingsLoading] = useState(false);
  const [carBookingsError, setCarBookingsError] = useState("");
  const [carBookingsActionId, setCarBookingsActionId] = useState<string | null>(null);
  const [scheduledCars, setScheduledCars] = useState<ScheduledCar[]>([]);
  const [scheduledCarsLoading, setScheduledCarsLoading] = useState(false);
  const [selectedCarDetail, setSelectedCarDetail] = useState<{ car: ScheduledCar; area: ScheduledCarArea } | null>(null);
  const [carBookingDetailModalOpen, setCarBookingDetailModalOpen] = useState(false);
  const [carBookingDetail, setCarBookingDetail] = useState<{
    booking: { id: string; bookingRef: string; bookingType: string; fromCity?: string; toCity?: string; city?: string; pickupPoint?: string; dropPoint?: string; travelTime?: string; travelDate: string; passengers: number; totalCents?: number; status: string; otp?: string; rejectedReason?: string; createdAt: string };
    car?: { name: string; registrationNumber?: string; category: string; carType: string; seats: number; acType?: string; manufacturer?: string; model?: string };
    drivers: { id: string; name: string | null; phone: string | null; licenseNumber: string }[];
  } | null>(null);
  const [carBookingDetailLoading, setCarBookingDetailLoading] = useState(false);
  const [flightDetailOpen, setFlightDetailOpen] = useState(false);
  const [selectedFlightForDetail, setSelectedFlightForDetail] = useState<VendorFlightCard | null>(null);
  const [flightSchedules, setFlightSchedules] = useState<Array<{
    id: string; flightId: string; flightNumber: string; airlineName: string; aircraftType: string; flightType: string;
    fromPlace: string; toPlace: string; scheduleDate: string; departureTime: string; arrivalTime: string;
    totalSeats: number; status: string; pendingCount?: number; listingId?: string;
  }>>([]);
  const [flightBookings, setFlightBookings] = useState<Array<{
    id: string; bookingRef: string; flightId: string; scheduleId: string | null; flightNumber?: string;
    routeFrom: string; routeTo: string; travelDate: string; passengers: number; totalCents: number;
    status: string; createdAt: string; listingId?: string;
  }>>([]);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState("");
  const [flightBookingsActionId, setFlightBookingsActionId] = useState<string | null>(null);
  const [flightBookingDetail, setFlightBookingDetail] = useState<{
    id: string; bookingRef: string; flightNumber?: string; airlineName?: string; routeFrom: string; routeTo: string;
    travelDate: string; passengers: number; totalCents: number; status: string; createdAt: string;
    passengerList: Array<{ name: string; idType: string; idNumber: string; seatNumber?: string }>;
    documents: Array<{ documentType: string; fileName: string; fileUrl: string }>;
  } | null>(null);
  const [flightBookingDetailOpen, setFlightBookingDetailOpen] = useState(false);
  const [flightBookingDetailLoading, setFlightBookingDetailLoading] = useState(false);

  useEffect(() => {
    if (selectedCategory !== "transport" || !dateFilter || transportVehicleType !== "bus") return;
    let cancelled = false;
    setTransportLoading(true);
    setTransportError("");
    vendorFetch<{ buses: TransportBusFromApi[]; date: string }>(
      `/api/transport-bookings?date=${encodeURIComponent(dateFilter)}`
    )
      .then((res) => {
        if (cancelled) return;
        const cards = res.buses.map((b) => apiBusToCard(b, res.date));
        setTransportBuses(cards);
      })
      .catch((err) => {
        if (cancelled) return;
        setTransportBuses([]);
        setTransportError(err instanceof Error ? err.message : "Failed to load buses");
      })
      .finally(() => {
        if (!cancelled) setTransportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, dateFilter, transportVehicleType]);

  // Fetch car bookings when Car tab is selected: get transport listings, then car-bookings per listing
  useEffect(() => {
    if (selectedCategory !== "transport" || transportVehicleType !== "car") return;
    let cancelled = false;
    setCarBookingsLoading(true);
    setCarBookingsError("");
    vendorFetch<{ listings: { id: string; name: string; type: string }[] }>("/api/listings")
      .then((data) => {
        if (cancelled) return;
        const transportListings = (data.listings ?? []).filter((l) => (l.type || "").toLowerCase() === "transport");
        return Promise.all(
          transportListings.map((listing) =>
            vendorFetch<{ bookings: CarBookingRow[] }>(`/api/listings/${listing.id}/car-bookings`).then((res) =>
              (res.bookings ?? []).map((b) => ({ ...b, listingId: listing.id, listingName: listing.name }))
            )
          )
        );
      })
      .then((arrays) => {
        if (cancelled) return;
        const merged = (arrays ?? []).flat();
        setCarBookings(merged);
      })
      .catch((err) => {
        if (!cancelled) {
          setCarBookings([]);
          setCarBookingsError(err instanceof Error ? err.message : "Failed to load car bookings");
        }
      })
      .finally(() => {
        if (!cancelled) setCarBookingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, dateFilter, transportVehicleType]);

  // Fetch scheduled cars (availability) for the selected date when Car tab is selected
  useEffect(() => {
    if (selectedCategory !== "transport" || transportVehicleType !== "car" || !dateFilter) return;
    let cancelled = false;
    setScheduledCarsLoading(true);
    vendorFetch<{ listings: { id: string; name: string; type: string }[] }>("/api/listings")
      .then((data) => {
        if (cancelled) return;
        const transportListings = (data.listings ?? []).filter((l) => (l.type || "").toLowerCase() === "transport");
        return Promise.all(
          transportListings.map((listing) =>
            vendorFetch<{ date: string; cars: ScheduledCar[] }>(
              `/api/listings/${listing.id}/scheduled-cars?date=${encodeURIComponent(dateFilter)}`
            ).then((res) =>
              (res.cars ?? []).map((c) => ({ ...c, listingId: listing.id, listingName: listing.name }))
            )
          )
        );
      })
      .then((arrays) => {
        if (cancelled) return;
        setScheduledCars((arrays ?? []).flat());
      })
      .catch(() => {
        if (!cancelled) setScheduledCars([]);
      })
      .finally(() => {
        if (!cancelled) setScheduledCarsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, transportVehicleType, dateFilter]);

  // Fetch flight schedules + bookings when Flight tab is selected and date is set
  useEffect(() => {
    if (selectedCategory !== "transport" || transportVehicleType !== "flight" || !dateFilter) return;
    let cancelled = false;
    setFlightLoading(true);
    setFlightError("");
    vendorFetch<{ listings: { id: string; name: string; type: string }[] }>("/api/listings")
      .then((data) => {
        if (cancelled) return;
        const transportListings = (data.listings ?? []).filter((l) => (l.type || "").toLowerCase() === "transport");
        return Promise.all(
          transportListings.map((listing) =>
            vendorFetch<{ schedules: Array<{ id: string; flightId: string; flightNumber: string; airlineName: string; aircraftType: string; flightType: string; fromPlace: string; toPlace: string; scheduleDate: string; departureTime: string; arrivalTime: string; totalSeats: number; status: string; pendingCount?: number }>; bookings: Array<{ id: string; bookingRef: string; flightId: string; scheduleId: string | null; flightNumber?: string; routeFrom: string; routeTo: string; travelDate: string; passengers: number; totalCents: number; status: string; createdAt: string }> }>(
              `/api/listings/${listing.id}/flight-bookings?date=${encodeURIComponent(dateFilter)}`
            ).then((res) => ({
              schedules: (res.schedules ?? []).map((s) => ({ ...s, listingId: listing.id })),
              bookings: (res.bookings ?? []).map((b) => ({ ...b, listingId: listing.id })),
            }))
          )
        );
      })
      .then((arrays) => {
        if (cancelled) return;
        const allSchedules = (arrays ?? []).flatMap((a) => a.schedules);
        const allBookings = (arrays ?? []).flatMap((a) => a.bookings);
        setFlightSchedules(allSchedules);
        setFlightBookings(allBookings);
      })
      .catch((err) => {
        if (!cancelled) {
          setFlightSchedules([]);
          setFlightBookings([]);
          setFlightError(err instanceof Error ? err.message : "Failed to load flight data");
        }
      })
      .finally(() => {
        if (!cancelled) setFlightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, transportVehicleType, dateFilter]);

  const handleViewBusDetails = (bus: BusBookingCard) => {
    setSelectedBus(bus);
    setBusDetailOpen(true);
    setSelectedCustomer(null);
  };

  const handleViewCarDetails = (car: ScheduledCar, area: ScheduledCarArea) => {
    setSelectedCarDetail({ car, area });
    setSelectedCustomer(null);
  };

  const closeCarDetail = () => setSelectedCarDetail(null);

  const handleViewCustomer = (b: CustomerBooking) => {
    setSelectedCustomer(b);
    setCustomerModalOpen(true);
  };

  const closeBusDetail = () => {
    setBusDetailOpen(false);
    setSelectedBus(null);
    setCustomerModalOpen(false);
    setSelectedCustomer(null);
  };

  /** Build a VendorFlightCard from API schedule + bookings for the detail drawer */
  const scheduleToVendorFlightCard = useCallback((
    s: { id: string; flightId: string; flightNumber: string; airlineName: string; aircraftType: string; flightType: string; fromPlace: string; toPlace: string; departureTime: string; arrivalTime: string; totalSeats: number; pendingCount?: number; listingId?: string },
    allBookings: Array<{ id: string; bookingRef: string; scheduleId: string | null; routeFrom: string; routeTo: string; travelDate: string; passengers: number; totalCents: number; status: string; listingId?: string }>
  ): VendorFlightCard => {
    const listingId = s.listingId;
    const forSchedule = allBookings.filter((b) => b.scheduleId === s.id && (listingId == null || b.listingId === listingId));
    const seatsBooked = forSchedule
      .filter((b) => b.status === "confirmed" || b.status === "approved_awaiting_payment")
      .reduce((sum, b) => sum + b.passengers, 0);
    const pendingRequests = forSchedule.filter((b) => b.status === "pending_vendor").length;
    const bookingsForTable: FlightBookingRow[] = forSchedule.map((b) => ({
      id: b.id,
      ref: b.bookingRef,
      customerName: "Guest",
      passengers: b.passengers,
      amount: b.totalCents / 100,
      status: b.status === "pending_vendor" ? "Pending" : b.status === "approved_awaiting_payment" ? "Approved" : b.status === "confirmed" ? "Confirmed" : b.status === "rejected" ? "Rejected" : b.status,
    }));
    const rows = Math.ceil(s.totalSeats / 6) || 1;
    return {
      flightNumber: s.flightNumber,
      airline: s.airlineName,
      aircraft: s.aircraftType,
      route: `${s.fromPlace} → ${s.toPlace}`,
      departureTime: s.departureTime,
      arrivalTime: s.arrivalTime,
      totalSeats: s.totalSeats,
      seatsBooked,
      pendingRequests: s.pendingCount ?? pendingRequests,
      flightType: (s.flightType === "international" ? "international" : "domestic") as "domestic" | "international",
      seatClasses: [{ name: "Economy", rowFrom: "A", rowTo: String.fromCharCode(64 + rows), totalSeats: s.totalSeats, booked: seatsBooked }],
      bookings: bookingsForTable,
      listingId: s.listingId,
      flightId: s.flightId,
    };
  }, []);

  const openFlightDetail = (flight: VendorFlightCard) => {
    setSelectedFlightForDetail(flight);
    setFlightDetailOpen(true);
  };
  const closeFlightDetail = () => {
    setFlightDetailOpen(false);
    setSelectedFlightForDetail(null);
  };

  /** Fetch flight seat_layout when drawer opens so seat structure matches vendor-created layout */
  useEffect(() => {
    if (!flightDetailOpen || !selectedFlightForDetail?.listingId || !selectedFlightForDetail?.flightId) return;
    if (selectedFlightForDetail.seatLayout !== undefined) return;
    const listingId = selectedFlightForDetail.listingId;
    const flightId = selectedFlightForDetail.flightId;
    let cancelled = false;
    vendorFetch<{ seatLayout?: unknown }>(`/api/listings/${listingId}/flights/${flightId}`)
      .then((res) => {
        if (cancelled) return;
        const parsed = parseSeatLayoutInBookings(res?.seatLayout);
        setSelectedFlightForDetail((prev) =>
          prev && prev.listingId === listingId && prev.flightId === flightId
            ? { ...prev, seatLayout: parsed ?? null }
            : prev
        );
      })
      .catch(() => {
        if (!cancelled) setSelectedFlightForDetail((prev) => (prev ? { ...prev, seatLayout: null } : prev));
      });
    return () => { cancelled = true; };
  }, [flightDetailOpen, selectedFlightForDetail?.listingId, selectedFlightForDetail?.flightId, selectedFlightForDetail?.seatLayout]);

  const handleFlightAccept = async (listingId: string, bookingId: string) => {
    setFlightBookingsActionId(bookingId);
    try {
      await vendorFetch(`/api/listings/${listingId}/flight-bookings/${bookingId}/accept`, { method: "PATCH" });
      setFlightBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "approved_awaiting_payment" as const } : b))
      );
    } finally {
      setFlightBookingsActionId(null);
    }
  };

  const handleFlightReject = async (listingId: string, bookingId: string) => {
    setFlightBookingsActionId(bookingId);
    try {
      await vendorFetch(`/api/listings/${listingId}/flight-bookings/${bookingId}/reject`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setFlightBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "rejected" as const } : b))
      );
    } finally {
      setFlightBookingsActionId(null);
    }
  };

  const openFlightBookingDetail = (b: { id: string; listingId?: string }) => {
    if (!b.listingId) return;
    setFlightBookingDetailOpen(true);
    setFlightBookingDetail(null);
    setFlightBookingDetailLoading(true);
    vendorFetch<{
      id: string; bookingRef: string; flightNumber?: string; airlineName?: string; routeFrom: string; routeTo: string;
      travelDate: string; passengers: number; totalCents: number; status: string; createdAt: string;
      passengerList: Array<{ name: string; idType: string; idNumber: string; seatNumber?: string }>;
      documents: Array<{ documentType: string; fileName: string; fileUrl: string }>;
    }>(`/api/listings/${b.listingId}/flight-bookings/${b.id}`)
      .then((data) => {
        setFlightBookingDetail(data);
      })
      .catch(() => {
        setFlightBookingDetail(null);
      })
      .finally(() => {
        setFlightBookingDetailLoading(false);
      });
  };

  const companyNameFromBuses =
    transportBuses.length > 0 && transportBuses[0].listingName
      ? transportBuses[0].listingName
      : COMPANY_NAME;

  const filteredBuses = transportBuses.filter((bus) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBus = bus.busName.toLowerCase().includes(q) || bus.busNumber.toLowerCase().includes(q) || bus.route.toLowerCase().includes(q);
      const matchCustomer = bus.bookings.some(
        (b) =>
          b.customerName.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)
      );
      if (!matchBus && !matchCustomer) return false;
    }
    if (statusFilter !== "all" && bus.status !== statusFilter) return false;
    return true;
  });

  const filteredCarBookings = carBookings.filter((b) => {
    if (dateFilter && b.travelDate !== dateFilter) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (b.carName ?? "").toLowerCase().includes(q) ||
        (b.bookingRef ?? "").toLowerCase().includes(q) ||
        (b.city ?? "").toLowerCase().includes(q) ||
        (b.pickupPoint ?? "").toLowerCase().includes(q) ||
        (b.dropPoint ?? "").toLowerCase().includes(q) ||
        (b.fromCity ?? "").toLowerCase().includes(q) ||
        (b.toCity ?? "").toLowerCase().includes(q) ||
        (b.listingName ?? "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleCarBookingAccept = async (listingId: string, bookingId: string) => {
    setCarBookingsActionId(bookingId);
    try {
      await vendorFetch(`/api/listings/${listingId}/car-bookings/${bookingId}/accept`, { method: "PATCH" });
      setCarBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "approved_awaiting_payment" } : b))
      );
    } catch (err) {
      setCarBookingsError(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setCarBookingsActionId(null);
    }
  };

  const handleCarBookingReject = async (listingId: string, bookingId: string, reason?: string) => {
    setCarBookingsActionId(bookingId);
    try {
      await vendorFetch(`/api/listings/${listingId}/car-bookings/${bookingId}/reject`, { method: "PATCH", body: JSON.stringify(reason != null ? { reason } : {}) });
      setCarBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "rejected" } : b))
      );
      setCarBookingDetailModalOpen(false);
      setCarBookingDetail(null);
    } catch (err) {
      setCarBookingsError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setCarBookingsActionId(null);
    }
  };

  const handleCarBookingViewDetails = async (listingId: string, bookingId: string) => {
    setCarBookingDetailLoading(true);
    setCarBookingDetail(null);
    setCarBookingDetailModalOpen(true);
    try {
      const res = await vendorFetch<{ booking: unknown; car?: unknown; drivers: unknown[] }>(
        `/api/listings/${listingId}/car-bookings/${bookingId}/details`
      );
      setCarBookingDetail({
        booking: res.booking as NonNullable<typeof carBookingDetail>["booking"],
        car: res.car as NonNullable<typeof carBookingDetail>["car"],
        drivers: (res.drivers ?? []) as NonNullable<typeof carBookingDetail>["drivers"],
      });
    } catch {
      setCarBookingDetail(null);
    } finally {
      setCarBookingDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your incoming and past bookings by category.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[180px] justify-start text-left font-normal rounded-xl h-9 pl-3"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                {dateFilter ? (
                  new Date(dateFilter + "T12:00:00").toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                ) : (
                  <span className="text-muted-foreground">Pick date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter ? new Date(dateFilter + "T12:00:00") : undefined}
                onSelect={(d) =>
                  setDateFilter(d ? dateToYYYYMMDD(d) : todayYYYYMMDD())
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Tabs
        value={selectedCategory}
        onValueChange={setSelectedCategory}
        className="w-full"
      >
        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 w-full flex-wrap h-auto gap-1">
          <TabsTrigger
            value="transport"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Bus className="h-4 w-4" />
            Transport
          </TabsTrigger>
          <TabsTrigger
            value="hotel"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Hotel className="h-4 w-4" />
            Hotel
          </TabsTrigger>
          <TabsTrigger
            value="experience"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Ticket className="h-4 w-4" />
            Experience
          </TabsTrigger>
          <TabsTrigger
            value="event"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Event
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transport" className="mt-6 space-y-6">
          {/* Vehicle-type bar: Bus | Car */}
          <Tabs
            value={transportVehicleType}
            onValueChange={(v) => setTransportVehicleType(v as "bus" | "car" | "flight")}
            className="w-full"
          >
            <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 w-full sm:w-auto flex-wrap h-auto gap-1">
              <TabsTrigger
                value="bus"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
                onClick={() => setStatusFilter("all")}
              >
                <Bus className="h-4 w-4" />
                Bus
              </TabsTrigger>
              <TabsTrigger
                value="car"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
                onClick={() => setStatusFilter("all")}
              >
                <Car className="h-4 w-4" />
                Car
              </TabsTrigger>
              <TabsTrigger
                value="flight"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
                onClick={() => setStatusFilter("all")}
              >
                <Plane className="h-4 w-4" />
                Flight
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {transportVehicleType === "bus" && (
                <>
                  {transportError && (
                    <p className="text-sm text-destructive mb-4">{transportError}</p>
                  )}
                  {transportLoading ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Loading buses for {dateFilter}…
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredBuses.map((bus) => (
                          <BusBookingCard
                            key={bus.busId}
                            bus={bus}
                            onViewDetails={() => handleViewBusDetails(bus)}
                          />
                        ))}
                      </div>
                      {filteredBuses.length === 0 && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                          {dateFilter
                            ? "No buses have a schedule on this date. Try another date or add schedules in Manage Fleet → Bus detail → Schedules."
                            : "Select a date above to see buses scheduled for that day."}
                        </p>
                      )}
                      {/* Bookings for this date — flat list at bottom */}
                      {dateFilter && transportBuses.length > 0 && (() => {
                        const allBusBookingsForDate = transportBuses.flatMap((bus) =>
                          (bus.bookings ?? []).map((b) => ({
                            ...b,
                            busName: bus.busName,
                            busNumber: bus.busNumber,
                            route: bus.route,
                            date: bus.date,
                            departure: bus.departure,
                            listingName: bus.listingName ?? "—",
                          }))
                        );
                        if (allBusBookingsForDate.length === 0) return null;
                        const formattedDate = new Date(dateFilter + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                        return (
                          <Card className="rounded-2xl border border-slate-200/80 shadow-sm mt-6">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                                <Bus className="h-5 w-5 text-slate-600" />
                                Bookings for {formattedDate}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground font-normal">
                                All bus bookings on this date. Use View details on a card above to manage a bus and its customers.
                              </p>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Ref</TableHead>
                                    <TableHead>Bus / Route</TableHead>
                                    <TableHead>Date · Departure</TableHead>
                                    <TableHead>Guest</TableHead>
                                    <TableHead>Seats</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {allBusBookingsForDate.map((b) => (
                                    <TableRow key={b.id}>
                                      <TableCell className="font-mono text-xs">{b.id}</TableCell>
                                      <TableCell>
                                        <p className="font-medium text-foreground text-sm">{b.busName}</p>
                                        <p className="text-xs text-muted-foreground">{b.route}</p>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {b.date} · {b.departure}
                                      </TableCell>
                                      <TableCell>{b.customerName}</TableCell>
                                      <TableCell>{(b.seats ?? []).join(", ") || "—"}</TableCell>
                                      <TableCell>₹{(b.amount ?? 0).toLocaleString("en-IN")}</TableCell>
                                      <TableCell>
                                        <span className={cn(
                                          "text-xs font-medium capitalize",
                                          b.status === "confirmed" && "text-emerald-600",
                                          b.status === "pending" && "text-amber-600",
                                          b.status === "cancelled" && "text-red-600"
                                        )}>
                                          {b.status}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </>
                  )}
                </>
              )}
              {transportVehicleType === "car" && (
                <>
                  {carBookingsError && (
                    <p className="text-sm text-destructive mb-4">{carBookingsError}</p>
                  )}
                  {!dateFilter ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Select a date above to see cars scheduled for that day and booking requests.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {/* Scheduled for [date] — cars that are available/scheduled for this day */}
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Scheduled for {dateFilter}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          Cars with operating areas that cover this date (only dates are used; times are ignored). User requests appear below.
                        </p>
                        {scheduledCarsLoading ? (
                          <p className="text-sm text-muted-foreground py-4">Loading scheduled cars…</p>
                        ) : scheduledCars.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 rounded-xl bg-muted/50 px-4">
                            No cars scheduled for this date. Add operating cities/routes and set From date–To date in Manage Fleet → Car → Operating cities & routes.
                          </p>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {scheduledCars.flatMap((car) =>
                              car.areas.map((area) => (
                                <ScheduledCarCard
                                  key={`${car.carId}-${area.areaId}`}
                                  car={car}
                                  area={area}
                                  onViewDetails={() => handleViewCarDetails(car, area)}
                                />
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Booking requests from users */}
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Booking requests</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          User requests for this date. Accept or Reject pending requests.
                        </p>
                        {carBookingsLoading ? (
                          <p className="text-sm text-muted-foreground py-4">Loading booking requests…</p>
                        ) : filteredCarBookings.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 rounded-xl bg-muted/50 px-4">
                            No booking requests for this date yet. Requests will appear here when users book.
                          </p>
                        ) : (
                          <div className="rounded-xl border border-slate-200 overflow-hidden">
                            <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-medium">Ref / Car</TableHead>
                            <TableHead className="font-medium">Type</TableHead>
                            <TableHead className="font-medium">Route / Details</TableHead>
                            <TableHead className="font-medium">Date</TableHead>
                            <TableHead className="font-medium">Passengers</TableHead>
                            <TableHead className="font-medium">Amount</TableHead>
                            <TableHead className="font-medium">Status</TableHead>
                            <TableHead className="text-right font-medium w-32">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCarBookings.map((b) => (
                            <TableRow key={b.id} className="align-top">
                              <TableCell className="py-3">
                                <span className="font-mono text-xs">{b.bookingRef}</span>
                                <p className="text-sm font-medium text-foreground mt-0.5">{b.carName ?? "—"}</p>
                                {b.listingName && (
                                  <p className="text-xs text-muted-foreground">{b.listingName}</p>
                                )}
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="capitalize">{b.bookingType}</span>
                              </TableCell>
                              <TableCell className="py-3 text-sm">
                                {b.bookingType === "local" ? (
                                  <>
                                    {b.city && <span>{b.city}</span>}
                                    {(b.pickupPoint || b.dropPoint) && (
                                      <p className="text-muted-foreground">
                                        {b.pickupPoint ?? "—"} → {b.dropPoint ?? "—"}
                                      </p>
                                    )}
                                    {b.travelTime && (
                                      <p className="text-xs text-muted-foreground">Time: {b.travelTime}</p>
                                    )}
                                  </>
                                ) : (
                                  <span>{b.fromCity ?? "—"} → {b.toCity ?? "—"}</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3 text-sm">{b.travelDate}</TableCell>
                              <TableCell className="py-3">{b.passengers}</TableCell>
                              <TableCell className="py-3">
                                {b.totalCents != null ? `₹ ${(b.totalCents / 100).toLocaleString("en-IN")}` : "—"}
                              </TableCell>
                              <TableCell className="py-3">
                                <span
                    className={cn(
                                    "inline-flex text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                                    b.status === "pending_vendor" && "bg-amber-100 text-amber-800",
                                    b.status === "approved_awaiting_payment" && "bg-blue-100 text-blue-800",
                                    b.status === "confirmed" && "bg-emerald-100 text-emerald-800",
                                    b.status === "rejected" && "bg-red-100 text-red-800"
                                  )}
                                >
                                  {b.status === "confirmed" ? "Completed" : b.status.replace(/_/g, " ")}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-lg h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
                                    title="View ticket & car details"
                                    onClick={() => b.listingId && handleCarBookingViewDetails(b.listingId, b.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {(b.status === "pending_vendor" || b.status === "rejected" || b.status === "confirmed") && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-lg h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                      title="Delete"
                                      disabled={carBookingsActionId === b.id}
                                      onClick={() => b.listingId && handleCarBookingReject(b.listingId, b.id, "Deleted by vendor")}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {b.status === "pending_vendor" && b.listingId && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-lg gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                        disabled={carBookingsActionId === b.id}
                                        onClick={() => handleCarBookingAccept(b.listingId!, b.id)}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-lg gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                        disabled={carBookingsActionId === b.id}
                                        onClick={() => handleCarBookingReject(b.listingId!, b.id)}
                                      >
                                        <XCircle className="h-3.5 w-3.5" /> Reject
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
          </div>
                        )}
        </div>
                    </div>
                  )}
                </>
              )}
              {transportVehicleType === "flight" && (
                <div className="space-y-6">
                  {flightError && (
                    <div className="rounded-xl border border-amber-500/50 bg-amber-50 p-4 text-sm text-amber-900">
                      {flightError}
                    </div>
                  )}
                  {!dateFilter ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Select a date above to see flights and requests for that day.</p>
                  ) : flightLoading ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Loading flights…</p>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          Flights for {dateFilter}
                        </h3>
                        {flightSchedules.length > 0 ? (
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2">
                            {flightSchedules.map((s) => (
                              <Card key={s.id} className="rounded-xl border border-slate-200 overflow-hidden">
                                <CardContent className="p-4 flex flex-col">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-mono font-semibold text-foreground">{s.flightNumber}</p>
                                        <span className={cn(
                                          "inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded",
                                          s.flightType === "international" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                                        )}>
                                          {s.flightType === "international" ? "Intl" : "Domestic"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">{s.airlineName} · {s.aircraftType}</p>
                                      <p className="text-sm mt-2">{s.fromPlace} → {s.toPlace} · {s.departureTime} – {s.arrivalTime}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {s.totalSeats} seats · {(s.pendingCount ?? 0)} pending request{(s.pendingCount ?? 0) !== 1 ? "s" : ""}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-lg h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 shrink-0"
                                      title="View flight details & bookings"
                                      onClick={() => openFlightDetail(scheduleToVendorFlightCard(s, flightBookings))}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
            </div>
                                </CardContent>
                              </Card>
                            ))}
            </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-6 text-center">
                            No flights scheduled for {dateFilter}. Schedules are shown from the database for the selected date.
                          </p>
                        )}
            </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Flight bookings</h3>
                        <p className="text-xs text-muted-foreground mb-2">All bookings for the selected date (requests and confirmed).</p>
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="font-medium">Ref</TableHead>
                                <TableHead className="font-medium">Flight</TableHead>
                                <TableHead className="font-medium">Route</TableHead>
                                <TableHead className="font-medium">Date</TableHead>
                                <TableHead className="font-medium">Passengers</TableHead>
                                <TableHead className="font-medium">Amount</TableHead>
                                <TableHead className="font-medium">Status</TableHead>
                                <TableHead className="text-right font-medium w-40">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {flightBookings.length > 0 ? (
                                flightBookings.map((b) => (
                                  <TableRow key={b.id}>
                                    <TableCell className="py-3 font-mono text-xs">{b.bookingRef}</TableCell>
                                    <TableCell className="py-3">{b.flightNumber ?? ""} · Flight</TableCell>
                                    <TableCell className="py-3">{b.routeFrom} → {b.routeTo}</TableCell>
                                    <TableCell className="py-3">{b.travelDate}</TableCell>
                                    <TableCell className="py-3">{b.passengers}</TableCell>
                                    <TableCell className="py-3">₹ {(b.totalCents / 100).toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="py-3">
                                      <span className={cn(
                                        "inline-flex text-xs font-medium px-2 py-0.5 rounded-full",
                                        b.status === "pending_vendor" ? "bg-amber-100 text-amber-800" : b.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : b.status === "rejected" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                                      )}>
                                        {b.status === "pending_vendor" ? "Pending" : b.status === "approved_awaiting_payment" ? "Approved" : b.status === "confirmed" ? "Confirmed" : "Rejected"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-3 text-right">
                                      <div className="flex items-center justify-end gap-1 flex-wrap">
                                        <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0 text-slate-600 hover:bg-slate-100" title="View booking & user details" onClick={() => openFlightBookingDetail(b)}>
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        {b.status === "pending_vendor" && b.listingId && (
                                          <>
                                            <Button size="sm" variant="outline" className="rounded-lg gap-1 text-emerald-700 border-emerald-300" disabled={flightBookingsActionId === b.id} onClick={() => handleFlightAccept(b.listingId!, b.id)}>
                                              <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                                            </Button>
                                            <Button size="sm" variant="outline" className="rounded-lg gap-1 text-red-600 border-red-200" disabled={flightBookingsActionId === b.id} onClick={() => handleFlightReject(b.listingId!, b.id)}>
                                              <XCircle className="h-3.5 w-3.5" /> Reject
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                                    No flight bookings for this date.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
      </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </Tabs>
        </TabsContent>

        <TabsContent value="hotel" className="mt-6">
          <HotelBookingsSection dateFilter={dateFilter} />
        </TabsContent>
        <TabsContent value="experience" className="mt-6">
          <ExperienceBookingsSection dateFilter={dateFilter} />
        </TabsContent>
        <TabsContent value="event" className="mt-6">
          <EventBookingsSection dateFilter={dateFilter} />
        </TabsContent>
      </Tabs>

      {/* Bus detail drawer */}
      <Sheet open={busDetailOpen} onOpenChange={(o) => !o && closeBusDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-display font-semibold">
              Bus booking details
            </SheetTitle>
          </SheetHeader>
          {selectedBus && (
            <div className="mt-6">
              <BusInfoHeader bus={selectedBus} />
              <BusSeatMap bus={selectedBus} />
              <p className="text-sm font-medium text-foreground mb-3">Bookings</p>
              <BookingTable
                bookings={selectedBus.bookings}
                onViewCustomer={handleViewCustomer}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Flight detail drawer: seats left, details, seat structure, bookings */}
      <Sheet open={flightDetailOpen} onOpenChange={(o) => !o && closeFlightDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-display font-semibold">
              Flight details
            </SheetTitle>
          </SheetHeader>
          {selectedFlightForDetail && (
            <div className="mt-6">
              <FlightInfoHeader flight={selectedFlightForDetail} />
              <FlightSeatStructure flight={selectedFlightForDetail} />
              <p className="text-sm font-medium text-foreground mb-3">Bookings</p>
              <FlightBookingsTable bookings={selectedFlightForDetail.bookings} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Flight booking detail sheet: full booking + user/passenger details */}
      <Sheet open={flightBookingDetailOpen} onOpenChange={(o) => !o && (setFlightBookingDetailOpen(false), setFlightBookingDetail(null))}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-display font-semibold">Flight booking details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {flightBookingDetailLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
            ) : flightBookingDetail ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <p className="font-mono text-sm font-medium text-foreground">{flightBookingDetail.bookingRef}</p>
                  <p className="text-sm text-muted-foreground">{flightBookingDetail.flightNumber ?? "Flight"} · {flightBookingDetail.routeFrom} → {flightBookingDetail.routeTo}</p>
                  <p className="text-xs text-muted-foreground">Travel date: {flightBookingDetail.travelDate}</p>
                  <p className="text-xs text-muted-foreground">Passengers: {flightBookingDetail.passengers} · Amount: ₹ {(flightBookingDetail.totalCents / 100).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">Booked at: {flightBookingDetail.createdAt ? new Date(flightBookingDetail.createdAt).toLocaleString() : "—"}</p>
                  <span className={cn(
                    "inline-flex text-xs font-medium px-2 py-0.5 rounded-full mt-1",
                    flightBookingDetail.status === "pending_vendor" ? "bg-amber-100 text-amber-800" : flightBookingDetail.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : flightBookingDetail.status === "rejected" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                  )}>
                    {flightBookingDetail.status === "pending_vendor" ? "Pending" : flightBookingDetail.status === "approved_awaiting_payment" ? "Approved" : flightBookingDetail.status === "confirmed" ? "Confirmed" : "Rejected"}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Passengers (user shared details)</h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-medium text-xs">Name</TableHead>
                          <TableHead className="font-medium text-xs">ID type</TableHead>
                          <TableHead className="font-medium text-xs">ID number</TableHead>
                          <TableHead className="font-medium text-xs">Seat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(flightBookingDetail.passengerList ?? []).map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-2 text-sm">{p.name}</TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">{p.idType}</TableCell>
                            <TableCell className="py-2 text-xs font-mono">{p.idNumber}</TableCell>
                            <TableCell className="py-2 text-xs">{p.seatNumber ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {(flightBookingDetail.documents?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Documents</h4>
                    <ul className="space-y-1 text-sm">
                      {flightBookingDetail.documents.map((d, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-muted-foreground shrink-0">{d.documentType}:</span>
                          {d.fileUrl ? (
                            <a
                              href={d.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate break-all"
                              title={`Open ${d.fileName}`}
                            >
                              {d.fileName}
                            </a>
                          ) : (
                            <span className="text-muted-foreground truncate" title="Document was not uploaded or link unavailable">{d.fileName}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Could not load booking details.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Car schedule detail drawer: date, schedule info, booking status, pending requests */}
      <Sheet open={!!selectedCarDetail} onOpenChange={(o) => !o && closeCarDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto rounded-l-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-display font-semibold">
              Car schedule details
            </SheetTitle>
          </SheetHeader>
          {selectedCarDetail && (
            <CarDetailSidebar
              car={selectedCarDetail.car}
              area={selectedCarDetail.area}
              selectedDate={dateFilter}
              carBookings={carBookings.filter(
                (b) =>
                  b.carId === selectedCarDetail.car.carId &&
                  b.travelDate === dateFilter &&
                  (b.listingId === selectedCarDetail.car.listingId || !selectedCarDetail.car.listingId)
              )}
              onAccept={handleCarBookingAccept}
              onReject={handleCarBookingReject}
              actionId={carBookingsActionId}
              onClose={closeCarDetail}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Per-customer booking detail modal */}
      <BookingDetailModal
        booking={selectedCustomer}
        open={customerModalOpen}
        onClose={() => {
          setCustomerModalOpen(false);
          setSelectedCustomer(null);
        }}
      />

      {/* Car booking details modal (ticket + car + drivers) */}
      <Dialog open={carBookingDetailModalOpen} onOpenChange={(o) => !o && (setCarBookingDetailModalOpen(false), setCarBookingDetail(null))}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5" /> Car booking details
            </DialogTitle>
          </DialogHeader>
          {carBookingDetailLoading && (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          )}
          {!carBookingDetailLoading && carBookingDetail && (
            <div className="space-y-6">
              {/* Ticket */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Ticket</h4>
                <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Ref:</span> <span className="font-mono">{carBookingDetail.booking.bookingRef}</span></p>
                  <p><span className="text-muted-foreground">Date:</span> {carBookingDetail.booking.travelDate}</p>
                  <p><span className="text-muted-foreground">Route:</span>{" "}
                    {carBookingDetail.booking.bookingType === "intercity"
                      ? `${carBookingDetail.booking.fromCity ?? "—"} → ${carBookingDetail.booking.toCity ?? "—"}`
                      : carBookingDetail.booking.city ?? (carBookingDetail.booking.pickupPoint && carBookingDetail.booking.dropPoint ? `${carBookingDetail.booking.pickupPoint} → ${carBookingDetail.booking.dropPoint}` : "—")}
                  </p>
                  <p><span className="text-muted-foreground">Passengers:</span> {carBookingDetail.booking.passengers}</p>
                  <p><span className="text-muted-foreground">Amount:</span>{" "}
                    {carBookingDetail.booking.totalCents != null ? `₹ ${(carBookingDetail.booking.totalCents / 100).toLocaleString("en-IN")}` : "—"}
                  </p>
                  <p><span className="text-muted-foreground">Status:</span>{" "}
                    <span className={cn(
                      "font-medium",
                      carBookingDetail.booking.status === "confirmed" && "text-emerald-600",
                      carBookingDetail.booking.status === "pending_vendor" && "text-amber-600",
                      carBookingDetail.booking.status === "approved_awaiting_payment" && "text-blue-600",
                      carBookingDetail.booking.status === "rejected" && "text-red-600"
                    )}>
                      {carBookingDetail.booking.status === "confirmed" ? "Completed" : carBookingDetail.booking.status.replace(/_/g, " ")}
                    </span>
                  </p>
                  {carBookingDetail.booking.otp && (
                    <p><span className="text-muted-foreground">OTP:</span> <span className="font-mono font-semibold">{carBookingDetail.booking.otp}</span></p>
                  )}
                  {carBookingDetail.booking.rejectedReason && (
                    <p><span className="text-muted-foreground">Reason:</span> {carBookingDetail.booking.rejectedReason}</p>
                  )}
                </div>
              </div>
              {/* Car */}
              {carBookingDetail.car && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Car</h4>
                  <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {carBookingDetail.car.name}</p>
                    {carBookingDetail.car.registrationNumber && <p><span className="text-muted-foreground">Registration:</span> {carBookingDetail.car.registrationNumber}</p>}
                    <p><span className="text-muted-foreground">Type:</span> {carBookingDetail.car.carType} · {carBookingDetail.car.category}</p>
                    <p><span className="text-muted-foreground">Seats:</span> {carBookingDetail.car.seats}</p>
                    {carBookingDetail.car.acType && <p><span className="text-muted-foreground">AC:</span> {carBookingDetail.car.acType}</p>}
                    {(carBookingDetail.car.manufacturer || carBookingDetail.car.model) && (
                      <p><span className="text-muted-foreground">Model:</span> {[carBookingDetail.car.manufacturer, carBookingDetail.car.model].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                </div>
              )}
              {/* Drivers */}
              {carBookingDetail.drivers && carBookingDetail.drivers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Drivers</h4>
                  <div className="space-y-3">
                    {carBookingDetail.drivers.map((d) => (
                      <div key={d.id} className="rounded-xl bg-slate-50 p-4 space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Name:</span> {d.name ?? "—"}</p>
                        <p><span className="text-muted-foreground">Phone:</span> {d.phone ?? "—"}</p>
                        <p><span className="text-muted-foreground">License:</span> {d.licenseNumber}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!carBookingDetailLoading && !carBookingDetail && carBookingDetailModalOpen && (
            <p className="text-sm text-muted-foreground py-4">Could not load details.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

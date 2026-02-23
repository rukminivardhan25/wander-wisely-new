import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { vendorFetch } from "@/lib/api";
import {
  Bus,
  UtensilsCrossed,
  Hotel,
  Ticket,
  Calendar as CalendarIcon,
  Search,
  ChevronRight,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Filter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  type?: "booking" | "bus";
}) {
  const styles = type === "bus" ? BUS_STATUS_STYLES : BOOKING_STATUS_STYLES;
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

// ─── Placeholder sections for other categories ───────────────────────────

function RestaurantBookingsSection() {
  return (
    <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
      <CardContent className="p-12 text-center">
        <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-medium text-foreground">Restaurant bookings</p>
        <p className="text-sm text-muted-foreground mt-1">Coming soon.</p>
      </CardContent>
    </Card>
  );
}

function HotelBookingsSection() {
  return (
    <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
      <CardContent className="p-12 text-center">
        <Hotel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-medium text-foreground">Hotel bookings</p>
        <p className="text-sm text-muted-foreground mt-1">Coming soon.</p>
      </CardContent>
    </Card>
  );
}

function ExperienceBookingsSection() {
  return (
    <Card className="rounded-2xl border border-slate-200/80 shadow-sm">
      <CardContent className="p-12 text-center">
        <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-medium text-foreground">Experience bookings</p>
        <p className="text-sm text-muted-foreground mt-1">Coming soon.</p>
      </CardContent>
    </Card>
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

  const [transportBuses, setTransportBuses] = useState<BusBookingCard[]>([]);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportError, setTransportError] = useState("");

  useEffect(() => {
    if (selectedCategory !== "transport" || !dateFilter) return;
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
  }, [selectedCategory, dateFilter]);

  const handleViewBusDetails = (bus: BusBookingCard) => {
    setSelectedBus(bus);
    setBusDetailOpen(true);
    setSelectedCustomer(null);
  };

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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] rounded-xl h-9">
              <Filter className="h-4 w-4 text-muted-foreground mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[160px] max-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search bus or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl h-9 text-sm"
            />
          </div>
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
            value="restaurant"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <UtensilsCrossed className="h-4 w-4" />
            Restaurant
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
        </TabsList>

        <TabsContent value="transport" className="mt-6 space-y-6">
          <div>
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
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="restaurant" className="mt-6">
          <RestaurantBookingsSection />
        </TabsContent>
        <TabsContent value="hotel" className="mt-6">
          <HotelBookingsSection />
        </TabsContent>
        <TabsContent value="experience" className="mt-6">
          <ExperienceBookingsSection />
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

      {/* Per-customer booking detail modal */}
      <BookingDetailModal
        booking={selectedCustomer}
        open={customerModalOpen}
        onClose={() => {
          setCustomerModalOpen(false);
          setSelectedCustomer(null);
        }}
      />
    </div>
  );
}

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const MAIN_APP_API_URL = process.env.MAIN_APP_API_URL ?? "http://localhost:3001";

/** Convert 1-based seat number to label (A1, B2, ...). colsPerRow = leftCols + rightCols. */
function seatNumberToLabel(seatNum: number, colsPerRow: number): string {
  if (colsPerRow < 1 || seatNum < 1) return String(seatNum);
  const row = Math.floor((seatNum - 1) / colsPerRow);
  const col = ((seatNum - 1) % colsPerRow) + 1;
  return String.fromCharCode(65 + row) + String(col);
}

type MainApiBooking = {
  id: string;
  passengerName: string;
  email: string;
  phone: string;
  selectedSeats: number[];
  totalCents: number;
  paymentStatus: string;
  createdAt: string;
};

async function fetchBookingsForBus(busId: string, date: string, listingName: string, busName: string): Promise<MainApiBooking[]> {
  const params = new URLSearchParams({ bus_id: busId, date });
  if (listingName) params.set("listing_name", listingName);
  if (busName) params.set("bus_name", busName);
  const url = `${MAIN_APP_API_URL}/api/bookings/for-bus?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[transport-bookings] for-bus failed:", res.status, res.statusText, url);
      return [];
    }
    const data = (await res.json()) as { bookings?: MainApiBooking[] };
    return Array.isArray(data.bookings) ? data.bookings : [];
  } catch (e) {
    console.warn("[transport-bookings] for-bus fetch error:", e instanceof Error ? e.message : e, "url:", url);
    return [];
  }
}

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/transport-bookings?date=YYYY-MM-DD&time=HH:MM
 * Returns buses that have at least one schedule where:
 * - schedule has start_date set
 * - selected calendar date equals schedule start_date (same date only, not in-between)
 * - when time is provided: schedule departure_time exactly matches that time (HH:MM).
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : null;
    const timeParam = typeof req.query.time === "string" ? req.query.time.trim() : null;

    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      res.status(400).json({
        error: "Query param 'date' is required and must be YYYY-MM-DD",
      });
      return;
    }

    // Compare calendar dates only (cast so timestamptz columns don't include wrong days)
    const selectedDate = dateParam; // YYYY-MM-DD

    // Time optional: if provided, must be HH:MM or HH:MM:SS; we match departure_time exactly (HH:MM)
    const matchDepartureTime =
      timeParam && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeParam)
        ? timeParam.slice(0, 5)
        : null;

    const result = await query<{
      listing_id: string;
      listing_name: string;
      bus_id: string;
      bus_name: string;
      registration_number: string | null;
      bus_number: string | null;
      total_seats: number;
      layout_type: string | null;
      rows: number;
      left_cols: number;
      right_cols: number;
      has_aisle: boolean;
      schedule_id: string;
      departure_time: string;
      arrival_time: string;
      route_from_place: string | null;
      route_to_place: string | null;
    }>(
      `select
        l.id as listing_id,
        l.name as listing_name,
        b.id as bus_id,
        b.name as bus_name,
        b.registration_number,
        b.bus_number,
        b.total_seats,
        b.layout_type,
        b.rows,
        b.left_cols,
        b.right_cols,
        b.has_aisle,
        s.id as schedule_id,
        s.departure_time::text as departure_time,
        s.arrival_time::text as arrival_time,
        r.from_place as route_from_place,
        r.to_place as route_to_place
       from listings l
       join buses b on b.listing_id = l.id
       join bus_schedules s on s.bus_id = b.id
       left join routes r on r.id = s.route_id
       where l.vendor_id = $1
         and lower(trim(l.type)) = 'transport'
         and coalesce(b.status, 'active') = 'active'
         and s.start_date is not null
         and (s.start_date)::date = ($2)::date
         and coalesce(s.status, 'active') = 'active'
         and ($3::text is null or s.departure_time::text like $3 || '%')
       order by l.name, b.registration_number, s.departure_time`,
      [vendorId, selectedDate, matchDepartureTime]
    );

    const rows = result.rows;

    type BusEntry = {
      busId: string;
      listingId: string;
      listingName: string;
      busName: string;
      registrationNumber: string | null;
      busNumber: string | null;
      totalSeats: number;
      layoutType: string | null;
      rows: number;
      leftCols: number;
      rightCols: number;
      hasAisle: boolean;
      schedules: Array<{
        scheduleId: string;
        departureTime: string;
        arrivalTime: string;
        routeFrom: string | null;
        routeTo: string | null;
      }>;
    };

    const busMap = new Map<string, BusEntry>();

    for (const row of rows) {
      const key = row.bus_id;
      if (!busMap.has(key)) {
        busMap.set(key, {
          busId: row.bus_id,
          listingId: row.listing_id,
          listingName: row.listing_name,
          busName: row.bus_name,
          registrationNumber: row.registration_number,
          busNumber: row.bus_number,
          totalSeats: row.total_seats,
          layoutType: row.layout_type ?? null,
          rows: row.rows ?? 0,
          leftCols: row.left_cols ?? 0,
          rightCols: row.right_cols ?? 0,
          hasAisle: row.has_aisle ?? false,
          schedules: [],
        });
      }
      busMap.get(key)!.schedules.push({
        scheduleId: row.schedule_id,
        departureTime: row.departure_time,
        arrivalTime: row.arrival_time,
        routeFrom: row.route_from_place,
        routeTo: row.route_to_place,
      });
    }

    const busesRaw = Array.from(busMap.values());

    // Fetch user bookings from main app for each bus and attach to response
    const buses = await Promise.all(
      busesRaw.map(async (bus) => {
        const colsPerRow = Math.max(1, (bus.leftCols ?? 0) + (bus.rightCols ?? 0)) || 4;
        let bookings: Array<{
          id: string;
          customerName: string;
          email: string;
          phone: string;
          seats: string[];
          amount: number;
          paymentStatus: "paid" | "pending" | "refunded";
          status: string;
          bookedOn: string;
        }> = [];
        try {
          const mainBookings = await fetchBookingsForBus(bus.busId, dateParam, bus.listingName ?? "", bus.busName ?? "");
          bookings = mainBookings.map((b) => ({
            id: b.id,
            customerName: b.passengerName,
            email: b.email,
            phone: b.phone,
            seats: (b.selectedSeats ?? []).map((n) => seatNumberToLabel(n, colsPerRow)),
            amount: Math.round(b.totalCents / 100),
            paymentStatus: (b.paymentStatus === "paid" || b.paymentStatus === "refunded" ? b.paymentStatus : "pending") as "paid" | "pending" | "refunded",
            status: "confirmed",
            bookedOn: b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "",
          }));
        } catch (e) {
          console.warn("Fetch bookings from main app failed for bus", bus.busId, dateParam, e);
          // ignore fetch errors; bus still returned with empty bookings
        }
        const seatsBooked = bookings.reduce((sum, b) => sum + b.seats.length, 0);
        return {
          ...bus,
          bookings,
          seatsBooked,
        };
      })
    );

    res.json({ buses, date: dateParam });
  } catch (err) {
    console.error("Transport bookings by date error:", err);
    res.status(500).json({ error: "Failed to fetch buses by date" });
  }
});

export default router;

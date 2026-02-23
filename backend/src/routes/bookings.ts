import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const createBookingSchema = z.object({
  bookingId: z.string().min(1),
  bus: z.object({
    busId: z.string().uuid().optional(),
    listingId: z.string().uuid().optional(),
    listingName: z.string().optional(),
    busName: z.string().optional(),
    registrationNumber: z.string().nullable().optional(),
    busNumber: z.string().nullable().optional(),
    departureTime: z.string(),
    driverName: z.string().nullable().optional(),
    driverPhone: z.string().nullable().optional(),
  }),
  selectedSeats: z.array(z.number().int().min(0)),
  travelDate: z.string().min(1),
  routeFrom: z.string().min(1),
  routeTo: z.string().min(1),
  totalCents: z.number().int().min(0),
  passengerName: z.string().optional(),
  passengerPhone: z.string().optional(),
  email: z.string().optional(),
});

/** GET /api/bookings/booked-seats?bus_id=uuid&date=YYYY-MM-DD - List seat numbers already booked (for user seat picker, no auth). */
router.get("/booked-seats", async (req: Request, res: Response): Promise<void> => {
  try {
    const busId = typeof req.query.bus_id === "string" ? req.query.bus_id.trim() : null;
    const date = typeof req.query.date === "string" ? req.query.date.trim() : null;
    if (!busId || !/^[0-9a-f-]{36}$/i.test(busId) || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "Query params bus_id (uuid) and date (YYYY-MM-DD) are required" });
      return;
    }
    const result = await query<{ selected_seats: number[] }>(
      `select selected_seats from transport_bookings where bus_id = $1 and travel_date = $2`,
      [busId, date]
    );
    const booked = new Set<number>();
    for (const row of result.rows) {
      for (const n of row.selected_seats ?? []) {
        if (Number.isInteger(n) && n > 0) booked.add(n);
      }
    }
    res.json({ bookedSeats: Array.from(booked).sort((a, b) => a - b) });
  } catch (err) {
    console.error("Booked-seats error:", err);
    res.status(500).json({ error: "Failed to fetch booked seats" });
  }
});

/** GET /api/bookings/for-bus-range?bus_id=uuid&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD - All bookings for a bus in date range (for vendor customer sync). */
router.get("/for-bus-range", async (req: Request, res: Response): Promise<void> => {
  try {
    const busId = typeof req.query.bus_id === "string" ? req.query.bus_id.trim() : null;
    const fromDate = typeof req.query.from_date === "string" ? req.query.from_date.trim() : null;
    const toDate = typeof req.query.to_date === "string" ? req.query.to_date.trim() : null;
    if (!busId || !/^[0-9a-f-]{36}$/i.test(busId) || !fromDate || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !toDate || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      res.status(400).json({ error: "Query params bus_id (uuid), from_date (YYYY-MM-DD), and to_date (YYYY-MM-DD) are required" });
      return;
    }
    const result = await query<{
      id: string;
      booking_id: string;
      passenger_name: string | null;
      passenger_phone: string | null;
      email: string | null;
      selected_seats: number[];
      total_cents: number;
      created_at: string;
    }>(
      `select id, booking_id, passenger_name, passenger_phone, email, selected_seats, total_cents, created_at
       from transport_bookings
       where bus_id = $1 and travel_date >= $2 and travel_date <= $3
       order by created_at asc`,
      [busId, fromDate, toDate]
    );
    const bookings = result.rows.map((r) => ({
      id: r.booking_id,
      bookingId: r.booking_id,
      passengerName: r.passenger_name ?? "Passenger",
      email: r.email ?? "",
      phone: r.passenger_phone ?? "",
      selectedSeats: r.selected_seats ?? [],
      totalCents: r.total_cents,
      paymentStatus: "paid" as const,
      createdAt: r.created_at,
    }));
    res.json({ bookings });
  } catch (err) {
    console.error("Bookings for-bus-range error:", err);
    res.status(500).json({ error: "Failed to fetch bookings for bus range" });
  }
});

/** GET /api/bookings/for-bus?bus_id=uuid&date=YYYY-MM-DD - For vendor: list bookings for a bus on a date (no auth). */
router.get("/for-bus", async (req: Request, res: Response): Promise<void> => {
  try {
    const busId = typeof req.query.bus_id === "string" ? req.query.bus_id.trim() : null;
    const date = typeof req.query.date === "string" ? req.query.date.trim() : null;
    if (!busId || !/^[0-9a-f-]{36}$/i.test(busId) || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "Query params bus_id (uuid) and date (YYYY-MM-DD) are required" });
      return;
    }
    const result = await query<{
      id: string;
      booking_id: string;
      passenger_name: string | null;
      passenger_phone: string | null;
      email: string | null;
      selected_seats: number[];
      total_cents: number;
      created_at: string;
    }>(
      `select id, booking_id, passenger_name, passenger_phone, email, selected_seats, total_cents, created_at
       from transport_bookings
       where bus_id = $1 and travel_date = $2
       order by created_at asc`,
      [busId, date]
    );
    const bookings = result.rows.map((r) => ({
      id: r.booking_id,
      bookingId: r.booking_id,
      passengerName: r.passenger_name ?? "Passenger",
      email: r.email ?? "",
      phone: r.passenger_phone ?? "",
      selectedSeats: r.selected_seats ?? [],
      totalCents: r.total_cents,
      paymentStatus: "paid" as const,
      createdAt: r.created_at,
    }));
    res.json({ bookings });
  } catch (err) {
    console.error("Bookings for-bus error:", err);
    res.status(500).json({ error: "Failed to fetch bookings for bus" });
  }
});

router.use(authMiddleware);

/** GET /api/bookings - List current user's transport bookings */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const result = await query<{
      id: string;
      booking_id: string;
      listing_name: string | null;
      bus_name: string | null;
      registration_number: string | null;
      bus_number: string | null;
      departure_time: string | null;
      driver_name: string | null;
      driver_phone: string | null;
      selected_seats: number[];
      travel_date: string;
      route_from: string;
      route_to: string;
      total_cents: number;
      passenger_name: string | null;
      passenger_phone: string | null;
      email: string | null;
      created_at: string;
    }>(
      `select id, booking_id, listing_name, bus_name, registration_number, bus_number,
       departure_time, driver_name, driver_phone, selected_seats, travel_date,
       route_from, route_to, total_cents, passenger_name, passenger_phone, email, created_at
       from transport_bookings where user_id = $1 order by created_at desc`,
      [userId]
    );
    const bookings = result.rows.map((r) => ({
      bookingId: r.booking_id,
      bus: {
        listingName: r.listing_name ?? undefined,
        busName: r.bus_name ?? undefined,
        registrationNumber: r.registration_number,
        busNumber: r.bus_number,
        departureTime: r.departure_time ?? "",
        driverName: r.driver_name,
        driverPhone: r.driver_phone,
      },
      selectedSeats: r.selected_seats ?? [],
      travelDate: r.travel_date,
      routeFrom: r.route_from,
      routeTo: r.route_to,
      totalCents: r.total_cents,
      passengerName: r.passenger_name ?? undefined,
      passengerPhone: r.passenger_phone ?? undefined,
      email: r.email ?? undefined,
      bookedAt: new Date(r.created_at).getTime(),
    }));
    res.json({ bookings });
  } catch (err) {
    console.error("List bookings error:", err);
    res.status(500).json({ error: "Failed to list bookings" });
  }
});

/** POST /api/bookings - Create a transport booking (after payment success) */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const body = createBookingSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid booking data", details: body.error.flatten() });
      return;
    }
    const b = body.data;
    await query(
      `insert into transport_bookings (
        user_id, booking_id, bus_id, listing_id, listing_name, bus_name, registration_number, bus_number,
        departure_time, driver_name, driver_phone, selected_seats, travel_date,
        route_from, route_to, total_cents, passenger_name, passenger_phone, email
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      on conflict (booking_id) do nothing`,
      [
        userId,
        b.bookingId,
        b.bus.busId ?? null,
        b.bus.listingId ?? null,
        b.bus.listingName ?? null,
        b.bus.busName ?? null,
        b.bus.registrationNumber ?? null,
        b.bus.busNumber ?? null,
        b.bus.departureTime,
        b.bus.driverName ?? null,
        b.bus.driverPhone ?? null,
        b.selectedSeats,
        b.travelDate,
        b.routeFrom,
        b.routeTo,
        b.totalCents,
        b.passengerName ?? null,
        b.passengerPhone ?? null,
        b.email ?? null,
      ]
    );
    res.status(201).json({ ok: true, bookingId: b.bookingId });
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Failed to save booking" });
  }
});

export default router;

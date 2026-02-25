import { Router, Request, Response } from "express";
import { z } from "zod";
import { getTransportPool } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const passengerSchema = z.object({
  name: z.string().min(1, "Name required"),
  idType: z.string().min(1, "ID type required"),
  idNumber: z.string().min(1, "ID number required"),
});

const createFlightBookingSchema = z.object({
  listingId: z.string().uuid(),
  flightId: z.string().uuid(),
  scheduleId: z.string().optional().nullable(),
  routeFrom: z.string().min(1),
  routeTo: z.string().min(1),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "travelDate must be YYYY-MM-DD"),
  passengers: z.coerce.number().int().min(1).max(20),
  totalCents: z.number().int().min(0),
  passengerDetails: z.array(passengerSchema).min(1, "At least one passenger required"),
  documents: z.array(z.object({ documentType: z.string(), fileUrl: z.string(), fileName: z.string() })).optional().default([]),
});

function bookingRef(): string {
  const s = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FLT-${s()}-${s()}`;
}

function otp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.use(authMiddleware);

function getDb() {
  return getTransportPool();
}

/** GET /api/flight-bookings — List current user's flight bookings */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const pool = getDb();
    const result = await pool.query<{
      id: string;
      booking_ref: string;
      listing_id: string;
      flight_id: string;
      schedule_id: string | null;
      route_from: string;
      route_to: string;
      travel_date: string;
      passengers: number;
      total_cents: number;
      status: string;
      otp: string | null;
      paid_at: string | null;
      created_at: string;
      all_seats_assigned: boolean | null;
    }>(
      `SELECT id, booking_ref, listing_id, flight_id, schedule_id, route_from, route_to,
       travel_date, passengers, total_cents, status, otp, paid_at, created_at,
       (SELECT COALESCE(BOOL_AND(fbp.seat_number IS NOT NULL AND trim(fbp.seat_number) <> ''), false)
        FROM flight_booking_passengers fbp WHERE fbp.flight_booking_id = flight_bookings.id) AS all_seats_assigned
       FROM flight_bookings WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const bookings = result.rows.map((r) => ({
      id: r.id,
      bookingRef: r.booking_ref,
      listingId: r.listing_id,
      flightId: r.flight_id,
      scheduleId: r.schedule_id ?? undefined,
      routeFrom: r.route_from,
      routeTo: r.route_to,
      travelDate: r.travel_date,
      passengers: r.passengers,
      totalCents: r.total_cents,
      status: r.status,
      otp: r.otp ?? undefined,
      paidAt: r.paid_at ?? undefined,
      createdAt: r.created_at,
      allSeatsAssigned: r.all_seats_assigned ?? false,
    }));
    res.json({ bookings });
  } catch (err) {
    console.error("List flight bookings error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("flight_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Flight bookings not set up. Run schema 033_flight_bookings.sql on transport DB." });
      return;
    }
    res.status(500).json({ error: "Failed to list flight bookings" });
  }
});

/** POST /api/flight-bookings — Create flight booking request */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const parsed = createFlightBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const msg = first ? `${first.path.join(".")}: ${first.message}` : "Validation failed";
      res.status(400).json({ error: msg, details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    if (d.passengerDetails.length !== d.passengers) {
      res.status(400).json({ error: `passengerDetails must have ${d.passengers} entries` });
      return;
    }
    const pool = getDb();
    const ref = bookingRef();
    const insertResult = await pool.query<{ id: string }>(
      `INSERT INTO flight_bookings (
        user_id, booking_ref, listing_id, flight_id, schedule_id,
        route_from, route_to, travel_date, passengers, total_cents, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, 'pending_vendor')
      RETURNING id`,
      [userId, ref, d.listingId, d.flightId, d.scheduleId ?? null, d.routeFrom, d.routeTo, d.travelDate, d.passengers, d.totalCents]
    );
    const bookingId = insertResult.rows[0]?.id;
    if (!bookingId) {
      res.status(500).json({ error: "Failed to create booking" });
      return;
    }
    for (const p of d.passengerDetails) {
      await pool.query(
        `INSERT INTO flight_booking_passengers (flight_booking_id, name, id_type, id_number)
         VALUES ($1, $2, $3, $4)`,
        [bookingId, p.name, p.idType, p.idNumber]
      );
    }
    for (const doc of d.documents) {
      await pool.query(
        `INSERT INTO flight_booking_documents (flight_booking_id, document_type, file_name, file_url)
         VALUES ($1, $2, $3, $4)`,
        [bookingId, doc.documentType, doc.fileName, doc.fileUrl]
      );
    }
    res.status(201).json({ id: bookingId, bookingRef: ref, status: "pending_vendor" });
  } catch (err) {
    console.error("Create flight booking error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("flight_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Flight bookings not set up. Run schema 033_flight_bookings.sql on transport DB." });
      return;
    }
    res.status(500).json({ error: "Failed to create flight booking" });
  }
});

const seatsSchema = z.object({
  seats: z.array(z.object({
    passengerIndex: z.number().int().min(1),
    rowLetter: z.string().min(1).optional(),
    colNumber: z.number().int().min(1).optional(),
    label: z.string().min(1).optional(),
  })).min(1).refine(
    (arr) => arr.every((s) => (s.label != null && s.label !== "") || (s.rowLetter != null && s.colNumber != null)),
    { message: "Each seat must have either label or rowLetter+colNumber" }
  ),
});

/** Vendor seat_layout shape: classes_enabled + cabin_first, cabin_business, cabin_economy (rows, left_cols, right_cols). */
function buildSeatMapFromVendorLayout(
  seatLayout: unknown,
  bookedSet: Set<string>,
  mySeats: Set<string>
): { cabinClasses: Array<{ name: string; rowFrom: string; rowTo: string; leftCols: number; rightCols: number }>; seats: Array<{ rowNumber: number; colNumber: number; label: string; status: "available" | "booked" | "yours" }>; useVendorLayout: true } | null {
  if (!seatLayout || typeof seatLayout !== "object") return null;
  const o = seatLayout as Record<string, unknown>;
  const ce = o.classes_enabled;
  if (!ce || typeof ce !== "object") return null;
  const cen = ce as Record<string, unknown>;
  const cabin = (c: unknown): { rows: number; left_cols: number; right_cols: number } | null => {
    if (!c || typeof c !== "object") return null;
    const x = c as Record<string, unknown>;
    const rows = typeof x.rows === "number" ? x.rows : 0;
    const left = typeof x.left_cols === "number" ? x.left_cols : 0;
    const right = typeof x.right_cols === "number" ? x.right_cols : 0;
    return { rows, left_cols: left, right_cols: right };
  };
  const first = cabin(o.cabin_first);
  const business = cabin(o.cabin_business);
  const economy = cabin(o.cabin_economy);
  if (!first || !business || !economy) return null;

  const cabinClasses: Array<{ name: string; rowFrom: string; rowTo: string; leftCols: number; rightCols: number }> = [];
  const seats: Array<{ rowNumber: number; colNumber: number; label: string; status: "available" | "booked" | "yours" }> = [];
  let globalRow = 0;

  const addCabin = (name: string, enabled: boolean, config: { rows: number; left_cols: number; right_cols: number }) => {
    if (!enabled || config.rows <= 0) return;
    const rowStart = globalRow + 1;
    const rowEnd = globalRow + config.rows;
    cabinClasses.push({
      name,
      rowFrom: String(rowStart),
      rowTo: String(rowEnd),
      leftCols: config.left_cols,
      rightCols: config.right_cols,
    });
    const colsPerRow = config.left_cols + config.right_cols;
    for (let r = 0; r < config.rows; r++) {
      globalRow++;
      for (let c = 0; c < colsPerRow; c++) {
        const letter = String.fromCharCode(65 + c);
        const label = `${globalRow}${letter}`;
        const status = mySeats.has(label) ? "yours" as const : bookedSet.has(label) ? "booked" as const : "available" as const;
        seats.push({ rowNumber: globalRow, colNumber: c + 1, label, status });
      }
    }
  };

  addCabin("First", Boolean(cen.first), first);
  addCabin("Business", Boolean(cen.business), business);
  addCabin("Economy / Budget", Boolean(cen.economy), economy);

  if (cabinClasses.length === 0) return null;
  return { cabinClasses, seats, useVendorLayout: true };
}

/** GET /api/flight-bookings/:id/seat-map — Seat map for this booking's schedule (only when approved_awaiting_payment) */
router.get("/:id/seat-map", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = getDb();
    const booking = await pool.query<{
      id: string;
      schedule_id: string | null;
      flight_id: string;
      status: string;
    }>(
      "SELECT id, schedule_id, flight_id, status FROM flight_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (booking.rows.length === 0) {
      res.status(404).json({ error: "Flight booking not found" });
      return;
    }
    const b = booking.rows[0];
    if (b.status !== "approved_awaiting_payment" && b.status !== "confirmed") {
      res.status(400).json({ error: "Seat map is only available after vendor approval." });
      return;
    }
    if (!b.schedule_id) {
      res.status(400).json({ error: "Booking has no schedule." });
      return;
    }
    const flight = await pool.query<{ total_seats: number; seat_layout: unknown }>(
      "SELECT total_seats, seat_layout FROM flights WHERE id = $1",
      [b.flight_id]
    );
    if (flight.rows.length === 0) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const totalSeats = flight.rows[0].total_seats;
    const rawLayout = flight.rows[0].seat_layout;

    const booked = await pool.query<{ seat_number: string }>(
      `SELECT p.seat_number FROM flight_booking_passengers p
       JOIN flight_bookings b ON b.id = p.flight_booking_id
       WHERE b.schedule_id = $1 AND b.status IN ('confirmed', 'approved_awaiting_payment') AND p.seat_number IS NOT NULL AND trim(p.seat_number) != ''`,
      [b.schedule_id]
    );
    const bookedSet = new Set(booked.rows.map((r) => (r.seat_number || "").trim().toUpperCase()));

    const myPassengers = await pool.query<{ seat_number: string | null }>(
      "SELECT seat_number FROM flight_booking_passengers WHERE flight_booking_id = $1 ORDER BY id",
      [id]
    );
    const mySeats = new Set(myPassengers.rows.map((r) => (r.seat_number || "").trim().toUpperCase()).filter(Boolean));

    const vendorResult = buildSeatMapFromVendorLayout(rawLayout, bookedSet, mySeats);
    if (vendorResult && vendorResult.cabinClasses.length > 0 && vendorResult.seats.length > 0) {
      const totalFromLayout = vendorResult.seats.length;
      res.json({
        seatLayout: {
          useVendorLayout: true,
          rows: Math.max(...vendorResult.seats.map((s) => s.rowNumber), 0),
          totalSeats: totalFromLayout,
          cabinClasses: vendorResult.cabinClasses,
        },
        seats: vendorResult.seats,
      });
      return;
    }

    const layout = rawLayout as { rows?: number; colsPerRow?: number; classes?: Array<{ name: string; rowFrom: string; rowTo: string }> } | null;
    const rows = layout?.rows ?? Math.ceil(totalSeats / 6);
    const colsPerRow = layout?.colsPerRow ?? 6;
    const leftCols = Math.floor(colsPerRow / 2);
    const rightCols = colsPerRow - leftCols;
    const cabinClasses = layout?.classes?.length
      ? layout.classes.map((c) => ({ name: c.name, rowFrom: c.rowFrom, rowTo: c.rowTo, leftCols, rightCols }))
      : [{ name: "Economy", rowFrom: "A", rowTo: String.fromCharCode(64 + rows), leftCols, rightCols }];

    const seats: { rowLetter: string; colNumber: number; label: string; status: "available" | "booked" | "yours" }[] = [];
    for (let r = 0; r < rows; r++) {
      const rowLetter = String.fromCharCode(65 + r);
      for (let c = 0; c < colsPerRow; c++) {
        const seatNum = r * colsPerRow + c + 1;
        if (seatNum > totalSeats) break;
        const label = `${rowLetter}${c + 1}`;
        const status = mySeats.has(label) ? "yours" as const : bookedSet.has(label) ? "booked" as const : "available" as const;
        seats.push({ rowLetter, colNumber: c + 1, label, status });
      }
    }
    res.json({
      seatLayout: { useVendorLayout: false, rows, colsPerRow, totalSeats, leftCols, rightCols, cabinClasses },
      seats,
    });
  } catch (err) {
    console.error("Seat map error:", err);
    res.status(500).json({ error: "Failed to load seat map" });
  }
});

/** PATCH /api/flight-bookings/:id/seats — Save seat selection (only when approved_awaiting_payment) */
router.patch("/:id/seats", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const parsed = seatsSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      res.status(400).json({ error: first ? `${first.path.join(".")}: ${first.message}` : "Validation failed" });
      return;
    }
    const pool = getDb();
    const current = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM flight_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Flight booking not found" });
      return;
    }
    if (current.rows[0].status !== "approved_awaiting_payment") {
      res.status(400).json({ error: "Seat selection only allowed after vendor approval." });
      return;
    }
    const passengerRows = await pool.query<{ id: string }>(
      "SELECT id FROM flight_booking_passengers WHERE flight_booking_id = $1 ORDER BY id",
      [id]
    );
    for (const seat of parsed.data.seats) {
      const idx = seat.passengerIndex - 1;
      if (idx < 0 || idx >= passengerRows.rows.length) continue;
      const passengerId = passengerRows.rows[idx].id;
      const seatNumber = seat.label != null && seat.label !== ""
        ? String(seat.label).trim().toUpperCase()
        : `${(seat.rowLetter || "").trim().toUpperCase()}${seat.colNumber ?? 1}`;
      await pool.query(
        "UPDATE flight_booking_passengers SET seat_number = $1 WHERE id = $2",
        [seatNumber, passengerId]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Update seats error:", err);
    res.status(500).json({ error: "Failed to save seats" });
  }
});

/** GET /api/flight-bookings/:id — Get one booking with passengers and documents */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = getDb();
    const row = await pool.query<{
      id: string;
      booking_ref: string;
      listing_id: string;
      flight_id: string;
      schedule_id: string | null;
      route_from: string;
      route_to: string;
      travel_date: string;
      passengers: number;
      total_cents: number;
      status: string;
      otp: string | null;
      paid_at: string | null;
      created_at: string;
    }>(
      "SELECT id, booking_ref, listing_id, flight_id, schedule_id, route_from, route_to, travel_date, passengers, total_cents, status, otp, paid_at, created_at FROM flight_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Flight booking not found" });
      return;
    }
    const b = row.rows[0];
    const passengers = await pool.query<{ name: string; id_type: string; id_number: string; seat_number: string | null }>(
      "SELECT name, id_type, id_number, seat_number FROM flight_booking_passengers WHERE flight_booking_id = $1 ORDER BY id",
      [id]
    );
    const docs = await pool.query<{ document_type: string; file_name: string; file_url: string }>(
      "SELECT document_type, file_name, file_url FROM flight_booking_documents WHERE flight_booking_id = $1",
      [id]
    );
    const travelDateStr = typeof b.travel_date === "string" && b.travel_date.length >= 10 ? b.travel_date.slice(0, 10) : String(b.travel_date).slice(0, 10);
    res.json({
      id: b.id,
      bookingRef: b.booking_ref,
      listingId: b.listing_id,
      flightId: b.flight_id,
      scheduleId: b.schedule_id ?? undefined,
      routeFrom: b.route_from,
      routeTo: b.route_to,
      travelDate: travelDateStr,
      passengers: b.passengers,
      totalCents: b.total_cents,
      status: b.status,
      otp: b.otp ?? undefined,
      paidAt: b.paid_at ?? undefined,
      createdAt: b.created_at,
      passengerDetails: passengers.rows.map((p) => ({
        name: p.name,
        idType: p.id_type,
        idNumber: p.id_number,
        seatNumber: p.seat_number ?? undefined,
      })),
      documents: docs.rows.map((d) => ({ documentType: d.document_type, fileName: d.file_name, fileUrl: d.file_url })),
    });
  } catch (err) {
    console.error("Get flight booking error:", err);
    res.status(500).json({ error: "Failed to fetch flight booking" });
  }
});

/** PATCH /api/flight-bookings/:id/pay — Confirm payment (after vendor accepted) */
router.patch("/:id/pay", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = getDb();
    const current = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM flight_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Flight booking not found" });
      return;
    }
    if (current.rows[0].status !== "approved_awaiting_payment") {
      res.status(400).json({ error: "Booking is not in approved state. Vendor must accept first." });
      return;
    }
    const seatCheck = await pool.query<{ missing: number }>(
      "SELECT COUNT(*)::int AS missing FROM flight_booking_passengers WHERE flight_booking_id = $1 AND (seat_number IS NULL OR trim(seat_number) = '')",
      [id]
    );
    const passengerCount = await pool.query<{ cnt: number }>(
      "SELECT COUNT(*)::int AS cnt FROM flight_booking_passengers WHERE flight_booking_id = $1",
      [id]
    );
    if (passengerCount.rows[0]?.cnt === 0 || (seatCheck.rows[0]?.missing ?? 0) > 0) {
      res.status(400).json({ error: "Please select seats for all passengers before payment." });
      return;
    }
    const newOtp = otp();
    await pool.query(
      `UPDATE flight_bookings SET status = 'confirmed', otp = $1, paid_at = now(), updated_at = now() WHERE id = $2 AND user_id = $3`,
      [newOtp, id, userId]
    );
    res.json({ ok: true, status: "confirmed", otp: newOtp });
  } catch (err) {
    console.error("Flight booking pay error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

/** GET /api/flight-bookings/:id/ticket — Ticket data for PDF/QR (confirmed bookings only) */
router.get("/:id/ticket", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = getDb();
    const row = await pool.query<{
      booking_ref: string;
      otp: string | null;
      route_from: string;
      route_to: string;
      travel_date: string;
      status: string;
      flight_id: string;
      schedule_id: string | null;
    }>(
      "SELECT booking_ref, otp, route_from, route_to, travel_date::text, status, flight_id, schedule_id FROM flight_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Flight booking not found" });
      return;
    }
    const b = row.rows[0];
    if (b.status !== "confirmed" || !b.otp) {
      res.status(400).json({ error: "Ticket available only after payment." });
      return;
    }
    const flight = await pool.query<{
      flight_number: string;
      airline_name: string;
      departure_time: string | null;
      arrival_time: string | null;
    }>(
      "SELECT flight_number, airline_name FROM flights WHERE id = $1",
      [b.flight_id]
    );
    let departureTime = "";
    let arrivalTime = "";
    if (b.schedule_id) {
      const sched = await pool.query<{ departure_time: string; arrival_time: string }>(
        "SELECT departure_time::text, arrival_time::text FROM flight_schedules WHERE id = $1",
        [b.schedule_id]
      );
      if (sched.rows[0]) {
        departureTime = sched.rows[0].departure_time ?? "";
        arrivalTime = sched.rows[0].arrival_time ?? "";
      }
    }
    const passengers = await pool.query<{ name: string; seat_number: string | null }>(
      "SELECT name, seat_number FROM flight_booking_passengers WHERE flight_booking_id = $1 ORDER BY id",
      [id]
    );
    const f = flight.rows[0];
    res.json({
      bookingRef: b.booking_ref,
      otp: b.otp,
      verificationCode: `FLIGHT-${b.booking_ref}-${b.otp}`,
      flight: {
        flightNumber: f?.flight_number ?? "",
        airlineName: f?.airline_name ?? "",
        routeFrom: b.route_from,
        routeTo: b.route_to,
        travelDate: typeof b.travel_date === "string" ? b.travel_date.slice(0, 10) : String(b.travel_date).slice(0, 10),
        departureTime,
        arrivalTime,
      },
      passengers: passengers.rows.map((p) => ({
        name: p.name,
        seatNumber: p.seat_number ?? "",
      })),
    });
  } catch (err) {
    console.error("Ticket error:", err);
    res.status(500).json({ error: "Failed to load ticket" });
  }
});

/** DELETE /api/flight-bookings/:id — User deletes booking */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = getDb();
    const current = await pool.query<{ id: string }>(
      "SELECT id FROM flight_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Flight booking not found" });
      return;
    }
    await pool.query("DELETE FROM flight_bookings WHERE id = $1 AND user_id = $2", [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Flight booking delete error:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { z } from "zod";
import { query, pool } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

/** Use same DB as bus (transport_bookings). Single DATABASE_URL only. */
const db = { query, pool };

const router = Router();

const createCarBookingSchema = z.object({
  tripId: z.string().uuid().optional(),
  listingId: z.string().uuid(),
  carId: z.string().uuid(),
  areaId: z.string().uuid(),
  bookingType: z.enum(["local", "intercity"]),
  city: z.string().optional().nullable(),
  pickupPoint: z.string().optional().nullable(),
  dropPoint: z.string().optional().nullable(),
  travelTime: z.string().optional().nullable(),
  fromCity: z.string().optional().nullable(),
  toCity: z.string().optional().nullable(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "travelDate must be YYYY-MM-DD"),
  passengers: z.coerce.number().int().min(1).max(20),
  totalCents: z.number().int().min(0).optional().nullable(),
});

function bookingRef(): string {
  const s = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CAR-${s()}-${s()}`;
}

function otp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.use(authMiddleware);

/** GET /api/car-bookings — List current user's car bookings. Optional ?trip_id=uuid to scope to a trip. */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tripId = typeof req.query.trip_id === "string" && /^[0-9a-f-]{36}$/i.test(req.query.trip_id.trim()) ? req.query.trip_id.trim() : null;
    const pool = db.pool;
    const result = await pool.query<{
      id: string;
      booking_ref: string;
      listing_id: string;
      car_id: string;
      area_id: string;
      booking_type: string;
      city: string | null;
      pickup_point: string | null;
      drop_point: string | null;
      travel_time: string | null;
      from_city: string | null;
      to_city: string | null;
      travel_date: string;
      passengers: number;
      total_cents: number | null;
      status: string;
      otp: string | null;
      paid_at: string | null;
      created_at: string;
    }>(
      tripId
        ? `SELECT id, booking_ref, listing_id, car_id, area_id, booking_type, city, pickup_point, drop_point,
       travel_time, from_city, to_city, travel_date, passengers, total_cents, status, otp, paid_at, created_at
       FROM car_bookings WHERE user_id = $1 AND trip_id = $2 ORDER BY created_at DESC`
        : `SELECT id, booking_ref, listing_id, car_id, area_id, booking_type, city, pickup_point, drop_point,
       travel_time, from_city, to_city, travel_date, passengers, total_cents, status, otp, paid_at, created_at
       FROM car_bookings WHERE user_id = $1 ORDER BY created_at DESC`,
      tripId ? [userId, tripId] : [userId]
    );
    const bookings = result.rows.map((r) => ({
      id: r.id,
      bookingRef: r.booking_ref,
      listingId: r.listing_id,
      carId: r.car_id,
      areaId: r.area_id,
      bookingType: r.booking_type,
      city: r.city ?? undefined,
      pickupPoint: r.pickup_point ?? undefined,
      dropPoint: r.drop_point ?? undefined,
      travelTime: r.travel_time ?? undefined,
      fromCity: r.from_city ?? undefined,
      toCity: r.to_city ?? undefined,
      travelDate: r.travel_date,
      passengers: r.passengers,
      totalCents: r.total_cents ?? undefined,
      status: r.status,
      otp: r.otp ?? undefined,
      paidAt: r.paid_at ?? undefined,
      createdAt: r.created_at,
    }));
    res.json({ bookings });
  } catch (err) {
    console.error("List car bookings error:", err);
    res.status(500).json({ error: "Failed to list car bookings" });
  }
});

/** POST /api/car-bookings — Create a car booking request (pending vendor) */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const parsed = createCarBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      const msg = first ? `${first.path.join(".")}: ${first.message}` : "Validation failed";
      res.status(400).json({ error: msg, details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const pool = db.pool;
    const ref = bookingRef();
    console.log("[CarBooking] Create payload:", {
      listingId: d.listingId,
      carId: d.carId,
      areaId: d.areaId,
      bookingType: d.bookingType,
      travelDate: d.travelDate,
      passengers: d.passengers,
      bookingRef: ref,
    });
    const travelTimeVal =
      d.bookingType === "local" && d.travelTime
        ? d.travelTime
        : null;
    await pool.query(
      `INSERT INTO car_bookings (
        user_id, trip_id, booking_ref, listing_id, car_id, area_id, booking_type,
        city, pickup_point, drop_point, travel_time, from_city, to_city,
        travel_date, passengers, total_cents, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::time, $12, $13, $14::date, $15, $16, 'pending_vendor')`,
      [
        userId,
        d.tripId ?? null,
        ref,
        d.listingId,
        d.carId,
        d.areaId,
        d.bookingType,
        d.city ?? null,
        d.pickupPoint ?? null,
        d.dropPoint ?? null,
        travelTimeVal,
        d.fromCity ?? null,
        d.toCity ?? null,
        d.travelDate,
        d.passengers,
        d.totalCents ?? null,
      ]
    );
    const row = await pool.query<{ id: string; booking_ref: string; status: string; listing_id: string; travel_date: string }>(
      "SELECT id, booking_ref, status, listing_id, travel_date FROM car_bookings WHERE booking_ref = $1",
      [ref]
    );
    const b = row.rows[0];
    console.log("[CarBooking] Inserted:", b ? { id: b.id, booking_ref: b.booking_ref, status: b.status, listing_id: b.listing_id, travel_date: b.travel_date } : "row not found");
    const verify = await pool.query(
      "SELECT id, booking_ref, listing_id, travel_date, status FROM car_bookings ORDER BY created_at DESC LIMIT 5"
    );
    console.log("[CarBooking] Verify latest 5 rows:", verify.rows.length, verify.rows.map((r) => ({ id: r.id, listing_id: r.listing_id, travel_date: r.travel_date, status: r.status })));
    res.status(201).json({
      id: b?.id,
      bookingRef: b?.booking_ref ?? ref,
      status: b?.status ?? "pending_vendor",
    });
  } catch (err) {
    console.error("Create car booking error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("car_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Car bookings not set up. Run vendor-hub schema 032_car_rental_bookings.sql on transport DB." });
      return;
    }
    res.status(500).json({ error: "Failed to create car booking" });
  }
});

/** PATCH /api/car-bookings/:id/pay — Confirm payment and set OTP (user paid) */
router.patch("/:id/pay", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = db.pool;
    const current = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM car_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Car booking not found" });
      return;
    }
    if (current.rows[0].status !== "approved_awaiting_payment") {
      res.status(400).json({ error: "Booking is not in approved state. Vendor must accept first." });
      return;
    }
    const newOtp = otp();
    await pool.query(
      `UPDATE car_bookings SET status = 'confirmed', otp = $1, paid_at = now(), updated_at = now() WHERE id = $2 AND user_id = $3`,
      [newOtp, id, userId]
    );
    res.json({ ok: true, status: "confirmed", otp: newOtp });
  } catch (err) {
    console.error("Car booking pay error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

/** DELETE /api/car-bookings/:id — User deletes a booking (removes from DB; booking will not appear again) */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = db.pool;
    const current = await pool.query<{ id: string }>(
      "SELECT id FROM car_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Car booking not found" });
      return;
    }
    await pool.query("DELETE FROM car_bookings WHERE id = $1 AND user_id = $2", [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Car booking delete error:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

/** PATCH /api/car-bookings/:id/cancel — User cancels a pending request (only when pending_vendor) */
router.patch("/:id/cancel", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = db.pool;
    const current = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM car_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Car booking not found" });
      return;
    }
    if (current.rows[0].status !== "pending_vendor") {
      res.status(400).json({ error: "Only pending requests can be cancelled." });
      return;
    }
    await pool.query(
      "UPDATE car_bookings SET status = 'rejected', rejected_reason = 'Cancelled by user', updated_at = now() WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    res.json({ ok: true, status: "rejected" });
  } catch (err) {
    console.error("Car booking cancel error:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

/** GET /api/car-bookings/:id — Get one booking with car + driver details (for ticket / eye modal) */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const pool = db.pool;
    const result = await pool.query<{
      id: string;
      booking_ref: string;
      listing_id: string;
      car_id: string;
      booking_type: string;
      city: string | null;
      pickup_point: string | null;
      drop_point: string | null;
      from_city: string | null;
      to_city: string | null;
      travel_date: string;
      travel_time: string | null;
      passengers: number;
      total_cents: number | null;
      status: string;
      otp: string | null;
      car_name: string | null;
      car_registration_number: string | null;
      car_type: string | null;
      car_seats: number | null;
      car_ac_type: string | null;
      car_manufacturer: string | null;
      car_model: string | null;
    }>(
      `SELECT b.id, b.booking_ref, b.listing_id, b.car_id, b.booking_type, b.city, b.pickup_point, b.drop_point,
       b.from_city, b.to_city, b.travel_date, b.travel_time::text, b.passengers, b.total_cents, b.status, b.otp,
       c.name AS car_name, c.registration_number AS car_registration_number, c.car_type AS car_type, c.seats AS car_seats,
       c.ac_type AS car_ac_type, c.manufacturer AS car_manufacturer, c.model AS car_model
       FROM car_bookings b
       LEFT JOIN cars c ON c.id = b.car_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Car booking not found" });
      return;
    }
    const r = result.rows[0];
    let drivers: { id: string; name: string | null; phone: string | null; licenseNumber: string }[] = [];
    try {
      const dr = await pool.query<{ id: string; name: string | null; phone: string | null; license_number: string }>(
        "SELECT id, name, phone, license_number FROM car_drivers WHERE car_id = $1",
        [r.car_id]
      );
      drivers = dr.rows.map((d) => ({ id: d.id, name: d.name, phone: d.phone, licenseNumber: d.license_number }));
    } catch {
      // car_drivers may not exist
    }
    const travelDateStr = typeof r.travel_date === "string" && r.travel_date.length >= 10 ? r.travel_date.slice(0, 10) : String(r.travel_date).slice(0, 10);
    res.json({
      id: r.id,
      bookingRef: r.booking_ref,
      listingId: r.listing_id,
      carId: r.car_id,
      carName: r.car_name ?? undefined,
      bookingType: r.booking_type,
      city: r.city ?? undefined,
      pickupPoint: r.pickup_point ?? undefined,
      dropPoint: r.drop_point ?? undefined,
      fromCity: r.from_city ?? undefined,
      toCity: r.to_city ?? undefined,
      travelDate: travelDateStr,
      travelTime: r.travel_time ?? undefined,
      passengers: r.passengers,
      totalCents: r.total_cents ?? undefined,
      status: r.status,
      otp: r.otp ?? undefined,
      car: r.car_name
        ? {
            name: r.car_name,
            registrationNumber: r.car_registration_number ?? undefined,
            carType: r.car_type ?? undefined,
            seats: r.car_seats ?? undefined,
            acType: r.car_ac_type ?? undefined,
            manufacturer: r.car_manufacturer ?? undefined,
            model: r.car_model ?? undefined,
          }
        : undefined,
      drivers,
    });
  } catch (err) {
    console.error("Get car booking error:", err);
    res.status(500).json({ error: "Failed to fetch car booking" });
  }
});

export default router;

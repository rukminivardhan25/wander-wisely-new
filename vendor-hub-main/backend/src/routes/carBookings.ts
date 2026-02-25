import { Router, Request, Response } from "express";
import { query, pool } from "../config/db.js";

/** Use same DB as listings (single DATABASE_URL only), so car bookings from main app are visible here. */
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function ensureListingOwned(listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "SELECT id FROM listings WHERE id = $1 AND vendor_id = $2",
    [listingId, vendorId]
  );
  return r.rows.length > 0;
}

/** GET /api/listings/:listingId/car-bookings — List car booking requests for this listing (uses same DB as main app car bookings) */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      console.log("[CarBookings] Vendor", vendorId, "does not own listing", listingId);
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const carPool = pool;
    console.log("[CarBookings] Fetch filters: listing_id =", listingId, "vendor_id (ownership) =", vendorId);
    const result = await carPool.query<{
      id: string;
      booking_ref: string;
      user_id: string;
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
      created_at: string;
      car_name: string | null;
    }>(
      `SELECT b.id, b.booking_ref, b.user_id, b.car_id, b.area_id, b.booking_type, b.city, b.pickup_point, b.drop_point,
       b.travel_time::text, b.from_city, b.to_city, to_char(b.travel_date, 'YYYY-MM-DD') AS travel_date, b.passengers, b.total_cents, b.status, b.created_at,
       c.name AS car_name
       FROM car_bookings b
       LEFT JOIN cars c ON c.id = b.car_id
       WHERE b.listing_id = $1
       ORDER BY b.created_at DESC`,
      [listingId]
    );
    console.log("[CarBookings] Query returned", result.rows.length, "rows for listing_id", listingId);
    const bookings = result.rows.map((r) => ({
      id: r.id,
      bookingRef: r.booking_ref,
      userId: r.user_id,
      carId: r.car_id,
      areaId: r.area_id,
      carName: r.car_name ?? undefined,
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
      createdAt: r.created_at,
    }));
    res.json({ bookings });
  } catch (err) {
    console.error("List car bookings error:", err);
    res.status(500).json({ error: "Failed to list car bookings" });
  }
});

/** GET /api/listings/:listingId/car-bookings/:bookingId/details — Full ticket + car + drivers (for eye modal) */
router.get("/:bookingId/details", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const { bookingId } = req.params;
    if (!listingId || !bookingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const carPool = pool;
    const booking = await carPool.query<{
      id: string; booking_ref: string; user_id: string; car_id: string; area_id: string; booking_type: string;
      city: string | null; pickup_point: string | null; drop_point: string | null; travel_time: string | null;
      from_city: string | null; to_city: string | null; travel_date: string; passengers: number; total_cents: number | null;
      status: string; otp: string | null; rejected_reason: string | null; created_at: string;
    }>(
      `SELECT id, booking_ref, user_id, car_id, area_id, booking_type, city, pickup_point, drop_point, travel_time::text,
       from_city, to_city, to_char(travel_date, 'YYYY-MM-DD') AS travel_date, passengers, total_cents, status, otp, rejected_reason, created_at
       FROM car_bookings WHERE id = $1 AND listing_id = $2`,
      [bookingId, listingId]
    );
    if (booking.rows.length === 0) {
      res.status(404).json({ error: "Car booking not found" });
      return;
    }
    const b = booking.rows[0];
    const carId = b.car_id;
    const car = await carPool.query<{
      id: string; name: string; registration_number: string | null; category: string; car_type: string;
      seats: number; ac_type: string | null; manufacturer: string | null; model: string | null;
    }>(
      `SELECT id, name, registration_number, category, car_type, seats, ac_type, manufacturer, model FROM cars WHERE id = $1`,
      [carId]
    );
    let drivers: { id: string; name: string | null; phone: string | null; licenseNumber: string }[] = [];
    try {
      const dr = await carPool.query<{ id: string; name: string | null; phone: string | null; license_number: string }>(
        `SELECT id, name, phone, license_number FROM car_drivers WHERE car_id = $1`,
        [carId]
      );
      drivers = dr.rows.map((r) => ({ id: r.id, name: r.name ?? null, phone: r.phone ?? null, licenseNumber: r.license_number }));
    } catch {
      // car_drivers table may not exist
    }
    res.json({
      booking: {
        id: b.id,
        bookingRef: b.booking_ref,
        userId: b.user_id,
        carId: b.car_id,
        areaId: b.area_id,
        bookingType: b.booking_type,
        city: b.city ?? undefined,
        pickupPoint: b.pickup_point ?? undefined,
        dropPoint: b.drop_point ?? undefined,
        travelTime: b.travel_time ?? undefined,
        fromCity: b.from_city ?? undefined,
        toCity: b.to_city ?? undefined,
        travelDate: b.travel_date,
        passengers: b.passengers,
        totalCents: b.total_cents ?? undefined,
        status: b.status,
        otp: b.otp ?? undefined,
        rejectedReason: b.rejected_reason ?? undefined,
        createdAt: b.created_at,
      },
      car: car.rows[0] ? {
        id: car.rows[0].id,
        name: car.rows[0].name,
        registrationNumber: car.rows[0].registration_number ?? undefined,
        category: car.rows[0].category,
        carType: car.rows[0].car_type,
        seats: car.rows[0].seats,
        acType: car.rows[0].ac_type ?? undefined,
        manufacturer: car.rows[0].manufacturer ?? undefined,
        model: car.rows[0].model ?? undefined,
      } : undefined,
      drivers,
    });
  } catch (err) {
    console.error("Car booking details error:", err);
    res.status(500).json({ error: "Failed to fetch details" });
  }
});

/** PATCH /api/listings/:listingId/car-bookings/:bookingId/accept — Vendor accepts request */
router.patch("/:bookingId/accept", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const { bookingId } = req.params;
    if (!listingId || !bookingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const carPool = pool;
    const current = await carPool.query<{ id: string; status: string }>(
      "SELECT id, status FROM car_bookings WHERE id = $1 AND listing_id = $2",
      [bookingId, listingId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Car booking not found" });
      return;
    }
    if (current.rows[0].status !== "pending_vendor") {
      res.status(400).json({ error: "Booking is not pending. Already accepted or rejected." });
      return;
    }
    await carPool.query(
      "UPDATE car_bookings SET status = 'approved_awaiting_payment', updated_at = now() WHERE id = $1 AND listing_id = $2",
      [bookingId, listingId]
    );
    res.json({ ok: true, status: "approved_awaiting_payment" });
  } catch (err) {
    console.error("Accept car booking error:", err);
    res.status(500).json({ error: "Failed to accept booking" });
  }
});

/** PATCH /api/listings/:listingId/car-bookings/:bookingId/reject — Vendor rejects request */
router.patch("/:bookingId/reject", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const { bookingId } = req.params;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : null;
    if (!listingId || !bookingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const carPool = pool;
    const current = await carPool.query<{ id: string; status: string }>(
      "SELECT id, status FROM car_bookings WHERE id = $1 AND listing_id = $2",
      [bookingId, listingId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Car booking not found" });
      return;
    }
    const newReason = reason ?? "Rejected by vendor";
    await carPool.query(
      "UPDATE car_bookings SET status = 'rejected', rejected_reason = $1, updated_at = now() WHERE id = $2 AND listing_id = $3",
      [newReason, bookingId, listingId]
    );
    res.json({ ok: true, status: "rejected" });
  } catch (err) {
    console.error("Reject car booking error:", err);
    res.status(500).json({ error: "Failed to reject booking" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
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

/** GET /api/listings/:listingId/car-bookings — List car booking requests for this listing */
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
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query<{
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
       b.travel_time::text, b.from_city, b.to_city, b.travel_date, b.passengers, b.total_cents, b.status, b.created_at,
       c.name AS car_name
       FROM car_bookings b
       LEFT JOIN cars c ON c.id = b.car_id
       WHERE b.listing_id = $1
       ORDER BY b.created_at DESC`,
      [listingId]
    );
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
    const current = await query<{ id: string; status: string }>(
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
    await query(
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
    const current = await query<{ id: string; status: string }>(
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
    await query(
      "UPDATE car_bookings SET status = 'rejected', rejected_reason = $1, updated_at = now() WHERE id = $2 AND listing_id = $3",
      [reason, bookingId, listingId]
    );
    res.json({ ok: true, status: "rejected" });
  } catch (err) {
    console.error("Reject car booking error:", err);
    res.status(500).json({ error: "Failed to reject booking" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function ensureListingOwned(listingId: string, vendorId: string): Promise<boolean> {
  try {
    const r = await query<{ id: string }>(
      "SELECT id FROM listings WHERE id = $1 AND vendor_id = $2",
      [listingId, vendorId]
    );
    if (r.rows.length > 0) return true;
  } catch (_) {}
  try {
    const vl = await query<{ listing_id: string }>(
      "SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2",
      [listingId, vendorId]
    );
    return vl.rows.length > 0;
  } catch (_) {
    return false;
  }
}

/** GET /api/listings/:listingId/flight-bookings?date=YYYY-MM-DD — Schedules for date + booking requests for this listing */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : null;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const schedules: Array<{
      id: string;
      flightId: string;
      flightNumber: string;
      airlineName: string;
      aircraftType: string;
      flightType: string;
      fromPlace: string;
      toPlace: string;
      scheduleDate: string;
      departureTime: string;
      arrivalTime: string;
      totalSeats: number;
      status: string;
      pendingCount?: number;
    }> = [];
    const bookings: Array<{
      id: string;
      bookingRef: string;
      flightId: string;
      scheduleId: string | null;
      flightNumber?: string;
      routeFrom: string;
      routeTo: string;
      travelDate: string;
      passengers: number;
      totalCents: number;
      status: string;
      createdAt: string;
    }> = [];

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      try {
        const schedResult = await query<{
          id: string;
          flight_id: string;
          flight_number: string;
          airline_name: string;
          aircraft_type: string;
          flight_type: string;
          from_place: string;
          to_place: string;
          schedule_date: string;
          departure_time: string;
          arrival_time: string;
          total_seats: number;
          status: string;
        }>(
          `SELECT s.id, s.flight_id, f.flight_number, f.airline_name, f.aircraft_type, f.flight_type,
            r.from_place, r.to_place, s.schedule_date::text, s.departure_time::text, s.arrival_time::text,
            f.total_seats, s.status
           FROM flight_schedules s
           JOIN flights f ON f.id = s.flight_id AND f.listing_id = $1
           JOIN flight_routes r ON r.id = s.route_id
           WHERE s.schedule_date = $2::date
           ORDER BY s.departure_time`,
          [listingId, dateParam]
        );
        for (const row of schedResult.rows) {
          const pendingResult = await query<{ cnt: string }>(
            `SELECT COUNT(*)::text AS cnt FROM flight_bookings
             WHERE listing_id = $1 AND schedule_id = $2 AND status = 'pending_vendor'`,
            [listingId, row.id]
          );
          schedules.push({
            id: row.id,
            flightId: row.flight_id,
            flightNumber: row.flight_number,
            airlineName: row.airline_name,
            aircraftType: row.aircraft_type,
            flightType: row.flight_type,
            fromPlace: row.from_place,
            toPlace: row.to_place,
            scheduleDate: row.schedule_date,
            departureTime: row.departure_time,
            arrivalTime: row.arrival_time,
            totalSeats: row.total_seats,
            status: row.status,
            pendingCount: parseInt(pendingResult.rows[0]?.cnt ?? "0", 10),
          });
        }
      } catch (e) {
        if (e && typeof e === "object" && "message" in e && String((e as Error).message).includes("flight_schedules")) {
          // Tables not migrated yet
        } else {
          throw e;
        }
      }

      try {
        const bookResult = await query<{
          id: string;
          booking_ref: string;
          flight_id: string;
          schedule_id: string | null;
          route_from: string;
          route_to: string;
          travel_date: string;
          passengers: number;
          total_cents: number;
          status: string;
          created_at: string;
          flight_number: string | null;
        }>(
          `SELECT b.id, b.booking_ref, b.flight_id, b.schedule_id, b.route_from, b.route_to,
            to_char(b.travel_date, 'YYYY-MM-DD') AS travel_date, b.passengers, b.total_cents, b.status, b.created_at,
            f.flight_number
           FROM flight_bookings b
           LEFT JOIN flights f ON f.id = b.flight_id
           WHERE b.listing_id = $1 AND b.travel_date = $2::date
           ORDER BY b.created_at DESC`,
          [listingId, dateParam]
        );
        for (const row of bookResult.rows) {
          bookings.push({
            id: row.id,
            bookingRef: row.booking_ref,
            flightId: row.flight_id,
            scheduleId: row.schedule_id,
            flightNumber: row.flight_number ?? undefined,
            routeFrom: row.route_from,
            routeTo: row.route_to,
            travelDate: row.travel_date,
            passengers: row.passengers,
            totalCents: row.total_cents,
            status: row.status,
            createdAt: row.created_at,
          });
        }
      } catch (e) {
        if (e && typeof e === "object" && "message" in e && String((e as Error).message).includes("flight_bookings")) {
          // Table not present
        } else {
          throw e;
        }
      }
    }

    res.json({ schedules, bookings });
  } catch (err) {
    console.error("List flight bookings error:", err);
    res.status(500).json({ error: "Failed to list flight bookings" });
  }
});

/** PATCH /api/listings/:listingId/flight-bookings/:bookingId/accept */
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
    const result = await query(
      `UPDATE flight_bookings SET status = 'approved_awaiting_payment', updated_at = now()
       WHERE id = $1 AND listing_id = $2 AND status = 'pending_vendor'
       RETURNING id`,
      [bookingId, listingId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Booking not found or not pending" });
      return;
    }
    res.json({ ok: true, status: "approved_awaiting_payment" });
  } catch (err) {
    console.error("Accept flight booking error:", err);
    if (err && typeof err === "object" && "message" in err && String((err as Error).message).includes("flight_bookings")) {
      res.status(503).json({ error: "Flight bookings table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to accept booking" });
  }
});

/** PATCH /api/listings/:listingId/flight-bookings/:bookingId/reject */
router.patch("/:bookingId/reject", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const { bookingId } = req.params;
    const reason = (req.body && typeof req.body === "object" && "rejectedReason" in req.body)
      ? String((req.body as { rejectedReason?: string }).rejectedReason ?? "")
      : "";
    if (!listingId || !bookingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query(
      `UPDATE flight_bookings SET status = 'rejected', rejected_reason = $3, updated_at = now()
       WHERE id = $1 AND listing_id = $2 AND status = 'pending_vendor'
       RETURNING id`,
      [bookingId, listingId, reason || null]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Booking not found or not pending" });
      return;
    }
    res.json({ ok: true, status: "rejected" });
  } catch (err) {
    console.error("Reject flight booking error:", err);
    if (err && typeof err === "object" && "message" in err && String((err as Error).message).includes("flight_bookings")) {
      res.status(503).json({ error: "Flight bookings table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to reject booking" });
  }
});

export default router;

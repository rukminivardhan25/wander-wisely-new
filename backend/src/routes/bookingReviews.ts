import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const BOOKING_TYPES = ["transport", "car", "flight", "hotel", "experience", "event"] as const;

type Resolved = { listing_id: string; scope_entity_type: string | null; scope_entity_id: string | null; booking_id_to_store?: string } | null;

async function resolveListingAndScope(
  bookingType: string,
  bookingId: string,
  userId: string
): Promise<Resolved> {
  switch (bookingType) {
    case "transport": {
      const isUuid = /^[0-9a-f-]{36}$/i.test(bookingId);
      const r = await pool.query<{ id: string; listing_id: string | null; bus_id: string | null }>(
        isUuid
          ? `SELECT tb.id, tb.listing_id, tb.bus_id FROM transport_bookings tb WHERE tb.id = $1 AND tb.user_id = $2`
          : `SELECT tb.id, tb.listing_id, tb.bus_id FROM transport_bookings tb WHERE tb.booking_id = $1 AND tb.user_id = $2`,
        [bookingId, userId]
      );
      if (r.rows.length === 0) return null;
      const row = r.rows[0];
      let listingId = row.listing_id;
      if (!listingId && row.bus_id) {
        const b = await pool.query<{ listing_id: string }>("SELECT listing_id FROM buses WHERE id = $1", [row.bus_id]);
        listingId = b.rows[0]?.listing_id ?? null;
      }
      if (!listingId) return null;
      return {
        listing_id: listingId,
        scope_entity_type: row.bus_id ? "bus" : null,
        scope_entity_id: row.bus_id,
        booking_id_to_store: row.id,
      };
    }
    case "car": {
      const r = await pool.query<{ listing_id: string; car_id: string }>(
        "SELECT listing_id, car_id FROM car_bookings WHERE id = $1 AND user_id = $2",
        [bookingId, userId]
      );
      if (r.rows.length === 0) return null;
      const row = r.rows[0];
      return {
        listing_id: row.listing_id,
        scope_entity_type: "car",
        scope_entity_id: row.car_id,
      };
    }
    case "flight": {
      const r = await pool.query<{ listing_id: string; flight_id: string }>(
        `SELECT f.listing_id, f.id AS flight_id FROM flight_bookings fb
         JOIN flights f ON f.id = fb.flight_id
         WHERE fb.id = $1 AND fb.user_id = $2`,
        [bookingId, userId]
      );
      if (r.rows.length === 0) return null;
      const row = r.rows[0];
      return { listing_id: row.listing_id, scope_entity_type: "flight", scope_entity_id: row.flight_id };
    }
    case "hotel": {
      const r = await pool.query<{ listing_id: string; hotel_branch_id: string }>(
        "SELECT listing_id, hotel_branch_id FROM hotel_bookings WHERE id = $1 AND user_id = $2",
        [bookingId, userId]
      );
      if (r.rows.length === 0) return null;
      const row = r.rows[0];
      return {
        listing_id: row.listing_id,
        scope_entity_type: "hotel_branch",
        scope_entity_id: row.hotel_branch_id,
      };
    }
    case "experience": {
      const r = await pool.query<{ listing_id: string }>(
        `SELECT e.listing_id FROM experience_bookings eb
         JOIN experiences e ON e.id = eb.experience_id
         WHERE eb.id = $1 AND eb.user_id = $2`,
        [bookingId, userId]
      );
      if (r.rows.length === 0) return null;
      return { listing_id: r.rows[0].listing_id, scope_entity_type: null, scope_entity_id: null };
    }
    case "event": {
      const r = await pool.query<{ listing_id: string }>(
        `SELECT ev.listing_id FROM event_bookings eb
         JOIN events ev ON ev.id = eb.event_id
         WHERE eb.id = $1 AND eb.user_id = $2`,
        [bookingId, userId]
      );
      if (r.rows.length === 0) return null;
      return { listing_id: r.rows[0].listing_id, scope_entity_type: null, scope_entity_id: null };
    }
    default:
      return null;
  }
}

/**
 * POST /api/booking-reviews
 * Create a review for a booking. Resolves listing_id and scope from the booking; user_id from auth.
 * Body: { booking_type, booking_id, rating, comment? }
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { userId?: string }).userId;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const booking_type = body.booking_type as string | undefined;
    const booking_id = typeof body.booking_id === "string" ? body.booking_id.trim() : undefined;
    const ratingRaw = body.rating;
    const rating = typeof ratingRaw === "number" ? ratingRaw : typeof ratingRaw === "string" ? parseInt(ratingRaw, 10) : undefined;
    const comment = typeof body.comment === "string" ? body.comment.trim() || null : null;

    if (!BOOKING_TYPES.includes(booking_type as (typeof BOOKING_TYPES)[number])) {
      res.status(400).json({ error: "booking_type must be one of: " + BOOKING_TYPES.join(", ") });
      return;
    }
    if (!booking_type || !booking_id) {
      res.status(400).json({ error: "booking_type and booking_id are required" });
      return;
    }
    // For transport we accept either UUID (row id) or booking_id (text); other types require UUID
    const mustBeUuid = booking_type !== "transport";
    if (mustBeUuid && !/^[0-9a-f-]{36}$/i.test(booking_id)) {
      res.status(400).json({ error: "booking_id must be a UUID for this booking type" });
      return;
    }
    if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: "rating must be 1–5" });
      return;
    }

    const resolved = await resolveListingAndScope(booking_type, booking_id, userId as string);
    if (!resolved) {
      res.status(404).json({ error: "Booking not found or you are not the owner" });
      return;
    }

    let user_name: string | null = null;
    try {
      const u = await pool.query<{ full_name: string | null }>(
        "SELECT full_name FROM users WHERE id = $1",
        [userId]
      );
      user_name = u.rows[0]?.full_name ?? null;
    } catch {
      // ignore
    }

    const bookingIdToInsert = resolved.booking_id_to_store ?? booking_id;
    const result = await pool.query(
      `INSERT INTO public.booking_reviews (
        user_id, user_name, listing_id, scope_entity_type, scope_entity_id, booking_type, booking_id, rating, comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (booking_type, booking_id) DO NOTHING
      RETURNING id, listing_id, scope_entity_type, scope_entity_id, booking_type, booking_id, rating, comment, created_at`,
      [
        userId,
        user_name,
        resolved.listing_id,
        resolved.scope_entity_type,
        resolved.scope_entity_id,
        booking_type,
        bookingIdToInsert,
        rating,
        comment,
      ]
    );

    if (result.rows.length === 0) {
      res.status(409).json({ error: "A review already exists for this booking" });
      return;
    }

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      listing_id: row.listing_id,
      scope_entity_type: row.scope_entity_type,
      scope_entity_id: row.scope_entity_id,
      booking_type: row.booking_type,
      booking_id: row.booking_id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit review";
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "42P01") {
      res.status(503).json({ error: "Booking reviews table not set up. Run schema 048_booking_reviews.sql on the database." });
      return;
    }
    console.error("booking-reviews POST error:", err);
    res.status(500).json({ error: msg });
  }
});

export default router;

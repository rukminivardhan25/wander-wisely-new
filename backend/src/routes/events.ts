import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();

/**
 * GET /api/events/cities
 * Distinct cities that have at least one live event (listing verified).
 */
router.get("/cities", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{ city: string }>(
      `SELECT DISTINCT COALESCE(NULLIF(trim(e.city), ''), 'Not set') AS city
       FROM events e
       JOIN listings l ON l.id = e.listing_id
       WHERE e.status = 'live'
         AND (l.verification_status IS NULL OR l.verification_status IN ('approved', 'verified'))
       ORDER BY 1`,
      []
    );
    res.json({ cities: result.rows.map((r) => r.city).filter(Boolean) });
  } catch (err) {
    console.error("Events cities error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("events") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Events table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

/**
 * GET /api/events?city=...&date=YYYY-MM-DD
 * List live events in the city where date is between start_date and end_date (inclusive).
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const cityParam = typeof req.query.city === "string" ? req.query.city.trim() : null;
    const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : null;
    if (!cityParam) {
      res.status(400).json({ error: "Query param 'city' is required" });
      return;
    }
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      res.status(400).json({ error: "Query param 'date' (YYYY-MM-DD) is required" });
      return;
    }

    const isNotSet = cityParam.toLowerCase() === "not set";
    const cityCondition = isNotSet
      ? `(e.city IS NULL OR trim(e.city) = '' OR lower(trim(e.city)) = 'not set')`
      : `lower(trim(COALESCE(e.city, ''))) = lower(trim($1))`;

    const params = isNotSet ? [dateParam] : [cityParam, dateParam];
    const evRows = await query<{
      id: string;
      listing_id: string;
      name: string;
      category: string;
      city: string;
      venue_name: string;
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
      organizer_name: string;
      description: string | null;
    }>(
      `SELECT e.id, e.listing_id, e.name, e.category, e.city, e.venue_name,
        e.start_date::text, e.end_date::text, e.start_time::text, e.end_time::text,
        e.organizer_name, e.description
       FROM events e
       JOIN listings l ON l.id = e.listing_id
       WHERE e.status = 'live'
         AND (l.verification_status IS NULL OR l.verification_status IN ('approved', 'verified'))
         AND e.start_date <= $${isNotSet ? 1 : 2}::date AND e.end_date >= $${isNotSet ? 1 : 2}::date
         AND ${cityCondition}
       ORDER BY e.start_date, e.start_time`,
      params
    );

    const ids = evRows.rows.map((r) => r.id);
    if (ids.length === 0) {
      res.json({ events: [] });
      return;
    }

    const posterRows = await query<{ event_id: string; file_url: string }>(
      `SELECT event_id, file_url FROM event_media WHERE event_id = ANY($1::uuid[]) AND is_poster = true`,
      [ids]
    );
    const posterByEvent = new Map(posterRows.rows.map((r) => [r.event_id, r.file_url]));

    const events = evRows.rows.map((e) => ({
      id: e.id,
      listingId: e.listing_id,
      name: e.name,
      category: e.category,
      city: e.city,
      venueName: e.venue_name,
      startDate: e.start_date,
      endDate: e.end_date,
      startTime: e.start_time?.slice(0, 5) ?? "",
      endTime: e.end_time?.slice(0, 5) ?? "",
      organizerName: e.organizer_name,
      description: e.description ?? undefined,
      coverUrl: posterByEvent.get(e.id),
    }));

    res.json({ events });
  } catch (err) {
    console.error("List events error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("events") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Events table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to list events" });
  }
});

/**
 * GET /api/events/:id
 * Single event detail with ticket types and sold count per type (for booking).
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const ev = await query<{
      id: string;
      listing_id: string;
      name: string;
      category: string;
      city: string;
      venue_name: string;
      venue_address: string | null;
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
      organizer_name: string;
      description: string | null;
    }>(
      `SELECT e.id, e.listing_id, e.name, e.category, e.city, e.venue_name, e.venue_address,
        e.start_date::text, e.end_date::text, e.start_time::text, e.end_time::text,
        e.organizer_name, e.description
       FROM events e
       JOIN listings l ON l.id = e.listing_id
       WHERE e.id = $1 AND e.status = 'live'
         AND (l.verification_status IS NULL OR l.verification_status IN ('approved', 'verified'))`,
      [id]
    );
    if (ev.rows.length === 0) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const row = ev.rows[0];

    const ticketTypes = await query<{ id: string; name: string; price_cents: number; quantity_total: number; max_per_user: number }>(
      "SELECT id, name, price_cents, quantity_total, max_per_user FROM event_ticket_types WHERE event_id = $1 ORDER BY created_at",
      [id]
    );

    const soldRows = await query<{ event_ticket_type_id: string; sold: string }>(
      `SELECT ebt.event_ticket_type_id, COALESCE(SUM(ebt.quantity), 0)::text AS sold
       FROM event_booking_tickets ebt
       JOIN event_bookings eb ON eb.id = ebt.event_booking_id AND eb.status != 'cancelled'
       WHERE ebt.event_ticket_type_id = ANY($1::uuid[])
       GROUP BY ebt.event_ticket_type_id`,
      [ticketTypes.rows.map((t) => t.id)]
    );
    const soldByType = new Map(soldRows.rows.map((r) => [r.event_ticket_type_id, parseInt(r.sold, 10)]));

    const media = await query<{ file_url: string; is_poster: boolean; sort_order: number }>(
      "SELECT file_url, is_poster, sort_order FROM event_media WHERE event_id = $1 ORDER BY sort_order, created_at",
      [id]
    );

    res.json({
      id: row.id,
      listingId: row.listing_id,
      name: row.name,
      category: row.category,
      city: row.city,
      venueName: row.venue_name,
      venueAddress: row.venue_address ?? undefined,
      startDate: row.start_date,
      endDate: row.end_date,
      startTime: row.start_time?.slice(0, 5) ?? "",
      endTime: row.end_time?.slice(0, 5) ?? "",
      organizerName: row.organizer_name,
      description: row.description ?? undefined,
      ticketTypes: ticketTypes.rows.map((t) => ({
        id: t.id,
        name: t.name,
        priceCents: t.price_cents,
        quantityTotal: t.quantity_total,
        maxPerUser: t.max_per_user,
        sold: soldByType.get(t.id) ?? 0,
        available: Math.max(0, t.quantity_total - (soldByType.get(t.id) ?? 0)),
      })),
      media: media.rows,
    });
  } catch (err) {
    console.error("Get event error:", err);
    res.status(500).json({ error: "Failed to load event" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

function bookingRef(): string {
  const s = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EVT-${s()}-${s()}`;
}

/** POST /api/event-bookings — Create event booking (tickets: [{ eventTicketTypeId, quantity }]) */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const body = req.body as {
      tripId?: string;
      eventId?: string;
      tickets?: { eventTicketTypeId: string; quantity: number }[];
    };
    const tripId = typeof body.tripId === "string" && /^[0-9a-f-]{36}$/i.test(body.tripId.trim()) ? body.tripId.trim() : null;
    const eventId = body.eventId;
    const tickets = Array.isArray(body.tickets) ? body.tickets : [];

    if (!eventId || tickets.length === 0) {
      res.status(400).json({ error: "eventId and tickets (array of { eventTicketTypeId, quantity }) are required" });
      return;
    }

    const ev = await query<{ id: string; status: string }>("SELECT id, status FROM events WHERE id = $1", [eventId]);
    if (ev.rows.length === 0) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (ev.rows[0].status !== "live") {
      res.status(400).json({ error: "Event is not available for booking" });
      return;
    }

    let totalCents = 0;
    const inserts: { eventTicketTypeId: string; quantity: number; unitPriceCents: number }[] = [];

    for (const t of tickets) {
      const qty = Math.min(50, Math.max(1, Number(t.quantity) || 0));
      if (qty < 1) continue;
      const typeRow = await query<{ id: string; event_id: string; price_cents: number; quantity_total: number; max_per_user: number }>(
        "SELECT id, event_id, price_cents, quantity_total, max_per_user FROM event_ticket_types WHERE id = $1 AND event_id = $2",
        [t.eventTicketTypeId, eventId]
      );
      if (typeRow.rows.length === 0) {
        res.status(400).json({ error: `Ticket type ${t.eventTicketTypeId} not found for this event` });
        return;
      }
      const type = typeRow.rows[0];
      if (qty > type.max_per_user) {
        res.status(400).json({ error: `Max ${type.max_per_user} tickets per user for ${type.id}` });
        return;
      }
      const sold = await query<{ sum: string }>(
        `SELECT COALESCE(SUM(ebt.quantity), 0)::text FROM event_booking_tickets ebt
         JOIN event_bookings eb ON eb.id = ebt.event_booking_id AND eb.status != 'cancelled'
         WHERE ebt.event_ticket_type_id = $1`,
        [type.id]
      );
      const soldCount = parseInt(sold.rows[0]?.sum ?? "0", 10);
      if (soldCount + qty > type.quantity_total) {
        res.status(400).json({ error: `Not enough tickets available for "${type.id}" (${type.quantity_total - soldCount} left)` });
        return;
      }
      totalCents += type.price_cents * qty;
      inserts.push({ eventTicketTypeId: type.id, quantity: qty, unitPriceCents: type.price_cents });
    }

    if (inserts.length === 0 || totalCents < 0) {
      res.status(400).json({ error: "Add at least one ticket with quantity >= 1" });
      return;
    }

    const ref = bookingRef();
    await query(
      `INSERT INTO event_bookings (booking_ref, event_id, user_id, trip_id, total_cents, status) VALUES ($1, $2, $3, $4, $5, 'confirmed')`,
      [ref, eventId, userId, tripId, totalCents]
    );
    const bookRow = await query<{ id: string }>("SELECT id FROM event_bookings WHERE booking_ref = $1", [ref]);
    const bookingId = bookRow.rows[0]?.id;
    if (!bookingId) {
      res.status(500).json({ error: "Failed to create booking" });
      return;
    }
    for (const ins of inserts) {
      await query(
        `INSERT INTO event_booking_tickets (event_booking_id, event_ticket_type_id, quantity, unit_price_cents) VALUES ($1, $2, $3, $4)`,
        [bookingId, ins.eventTicketTypeId, ins.quantity, ins.unitPriceCents]
      );
    }

    const created = await query<{ id: string; created_at: string }>("SELECT id, created_at::text FROM event_bookings WHERE id = $1", [bookingId]);
    res.status(201).json({
      id: bookingId,
      bookingRef: ref,
      status: "confirmed",
      totalCents,
      paidAt: null,
      createdAt: created.rows[0]?.created_at ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error("Create event booking error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("event_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Event bookings table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to create booking" });
  }
});

/** GET /api/event-bookings — List current user's event bookings. Optional ?trip_id=uuid to scope to a trip. */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tripId = typeof req.query.trip_id === "string" && /^[0-9a-f-]{36}$/i.test(req.query.trip_id.trim()) ? req.query.trip_id.trim() : null;
    const rows = await query<{
      id: string;
      booking_ref: string;
      event_id: string;
      total_cents: number;
      status: string;
      paid_at: string | null;
      created_at: string;
      ev_name: string;
      ev_city: string;
      ev_venue: string;
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
    }>(
      tripId
        ? `SELECT b.id, b.booking_ref, b.event_id, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
        e.name AS ev_name, e.city AS ev_city, e.venue_name AS ev_venue,
        e.start_date::text AS start_date, e.end_date::text AS end_date,
        e.start_time::text AS start_time, e.end_time::text AS end_time
       FROM event_bookings b
       JOIN events e ON e.id = b.event_id
       WHERE b.user_id = $1 AND b.trip_id = $2 ORDER BY b.created_at DESC`
        : `SELECT b.id, b.booking_ref, b.event_id, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
        e.name AS ev_name, e.city AS ev_city, e.venue_name AS ev_venue,
        e.start_date::text AS start_date, e.end_date::text AS end_date,
        e.start_time::text AS start_time, e.end_time::text AS end_time
       FROM event_bookings b
       JOIN events e ON e.id = b.event_id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      tripId ? [userId, tripId] : [userId]
    );

    res.json({
      bookings: rows.rows.map((r) => ({
        id: r.id,
        bookingRef: r.booking_ref,
        eventId: r.event_id,
        totalCents: r.total_cents,
        status: r.status,
        paidAt: r.paid_at ?? undefined,
        createdAt: r.created_at,
        eventName: r.ev_name,
        eventCity: r.ev_city,
        venueName: r.ev_venue,
        startDate: r.start_date,
        endDate: r.end_date,
        startTime: r.start_time?.slice(0, 5) ?? "",
        endTime: r.end_time?.slice(0, 5) ?? "",
      })),
    });
  } catch (err) {
    console.error("List event bookings error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("event_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Event bookings not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to list bookings" });
  }
});

/** GET /api/event-bookings/:id — Single booking */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id;
    const row = await query<{
      id: string;
      booking_ref: string;
      event_id: string;
      total_cents: number;
      status: string;
      paid_at: string | null;
      created_at: string;
      ev_name: string;
      ev_city: string;
      ev_venue: string;
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
    }>(
      `SELECT b.id, b.booking_ref, b.event_id, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
        e.name AS ev_name, e.city AS ev_city, e.venue_name AS ev_venue,
        e.start_date::text, e.end_date::text, e.start_time::text, e.end_time::text
       FROM event_bookings b
       JOIN events e ON e.id = b.event_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const r = row.rows[0];
    res.json({
      id: r.id,
      bookingRef: r.booking_ref,
      eventId: r.event_id,
      totalCents: r.total_cents,
      status: r.status,
      paidAt: r.paid_at ?? undefined,
      createdAt: r.created_at,
      eventName: r.ev_name,
      eventCity: r.ev_city,
      venueName: r.ev_venue,
      startDate: r.start_date,
      endDate: r.end_date,
      startTime: r.start_time?.slice(0, 5) ?? "",
      endTime: r.end_time?.slice(0, 5) ?? "",
    });
  } catch (err) {
    console.error("Get event booking error:", err);
    res.status(500).json({ error: "Failed to load booking" });
  }
});

/** PATCH /api/event-bookings/:id/pay — Mark as paid */
router.patch("/:id/pay", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id;
    const existing = await query<{ id: string; paid_at: string | null }>(
      "SELECT id, paid_at::text FROM event_bookings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    if (existing.rows[0].paid_at) {
      res.status(400).json({ error: "Booking already paid" });
      return;
    }
    await query(
      "UPDATE event_bookings SET paid_at = now(), updated_at = now() WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    const row = await query<{ id: string; booking_ref: string; total_cents: number; paid_at: string | null; ev_name: string; start_date: string; start_time: string }>(
      `SELECT b.id, b.booking_ref, b.total_cents, b.paid_at::text, e.name AS ev_name, e.start_date::text AS start_date, e.start_time::text AS start_time
       FROM event_bookings b JOIN events e ON e.id = b.event_id WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );
    const r = row.rows[0];
    res.json({
      id: r.id,
      bookingRef: r.booking_ref,
      totalCents: r.total_cents,
      paidAt: r.paid_at ?? new Date().toISOString(),
      eventName: r.ev_name,
      startDate: r.start_date,
      startTime: r.start_time?.slice(0, 5) ?? "",
      ticketReady: true,
    });
  } catch (err) {
    console.error("Pay event booking error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;

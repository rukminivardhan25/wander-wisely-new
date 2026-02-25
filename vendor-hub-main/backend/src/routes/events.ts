import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function vendorOwnsListing(listingId: string, vendorId: string): Promise<boolean> {
  try {
    const r = await query<{ id: string }>("SELECT id FROM listings WHERE id = $1 AND vendor_id = $2", [listingId, vendorId]);
    if (r.rows.length > 0) return true;
  } catch {
    //
  }
  try {
    const vl = await query<{ listing_id: string }>("SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2", [listingId, vendorId]);
    return vl.rows.length > 0;
  } catch {
    return false;
  }
}

/** GET /api/listings/:listingId/event/bookings — Event bookings for this listing (vendor). */
router.get("/bookings", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const evRow = await query<{ id: string }>("SELECT id FROM events WHERE listing_id = $1 LIMIT 1", [listingId]);
    if (evRow.rows.length === 0) {
      res.json({ bookings: [] });
      return;
    }
    const eventId = evRow.rows[0].id;
    const rows = await query<{
      id: string;
      booking_ref: string;
      user_id: string;
      total_cents: number;
      status: string;
      paid_at: string | null;
      created_at: string;
    }>(
      `SELECT b.id, b.booking_ref, b.user_id, b.total_cents, b.status, b.paid_at::text, b.created_at::text
       FROM event_bookings b
       WHERE b.event_id = $1 AND b.status != 'cancelled'
       ORDER BY b.created_at DESC`,
      [eventId]
    );
    res.json({
      bookings: rows.rows.map((r) => ({
        id: r.id,
        bookingRef: r.booking_ref,
        userId: r.user_id,
        totalCents: r.total_cents,
        status: r.status,
        paidAt: r.paid_at ?? undefined,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("Event bookings error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("event_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Event bookings table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to load event bookings" });
  }
});

/** GET event for this listing. One event per listing. */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const listingRow = await query<{ name: string; type: string }>("SELECT name, type FROM listings WHERE id = $1", [listingId]);
    if (listingRow.rows.length === 0) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (listingRow.rows[0].type?.toLowerCase() !== "event") {
      res.status(400).json({ error: "Listing is not an event" });
      return;
    }

    type EventRow = {
      id: string;
      listing_id: string;
      name: string;
      category: string;
      city: string;
      venue_name: string;
      venue_address: string | null;
      venue_lat: string | null;
      venue_lng: string | null;
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
      organizer_name: string;
      description: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    };

    const ev = await query<EventRow>(
      `SELECT id, listing_id, name, category, city, venue_name, venue_address, venue_lat::text, venue_lng::text,
        start_date::text, end_date::text, start_time::text, end_time::text, organizer_name, description, status, created_at, updated_at
       FROM events WHERE listing_id = $1 LIMIT 1`,
      [listingId]
    );

    if (ev.rows.length === 0) {
      res.status(404).json({ error: "Event not found. Save event details from Add Event first." });
      return;
    }

    const row = ev.rows[0];
    const ticketTypes = await query<{ id: string; name: string; price_cents: number; quantity_total: number; max_per_user: number }>(
      "SELECT id, name, price_cents, quantity_total, max_per_user FROM event_ticket_types WHERE event_id = $1 ORDER BY created_at",
      [row.id]
    ).catch(() => ({ rows: [] }));

    const media = await query<{ id: string; file_url: string; is_poster: boolean; sort_order: number }>(
      "SELECT id, file_url, is_poster, sort_order FROM event_media WHERE event_id = $1 ORDER BY sort_order, created_at",
      [row.id]
    ).catch(() => ({ rows: [] }));

    res.json({
      id: row.id,
      listing_id: row.listing_id,
      name: row.name,
      category: row.category,
      city: row.city,
      venue_name: row.venue_name,
      venue_address: row.venue_address,
      venue_lat: row.venue_lat,
      venue_lng: row.venue_lng,
      start_date: row.start_date,
      end_date: row.end_date,
      start_time: row.start_time?.slice(0, 5),
      end_time: row.end_time?.slice(0, 5),
      organizer_name: row.organizer_name,
      description: row.description,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      ticket_types: ticketTypes.rows.map((t) => ({
        id: t.id,
        name: t.name,
        price_cents: t.price_cents,
        quantity_total: t.quantity_total,
        max_per_user: t.max_per_user,
      })),
      media: media.rows,
    });
  } catch (err) {
    console.error("Get event error:", err);
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "42P01") {
      res.status(503).json({ error: "Events table not set up. Run db:experience-event schema." });
      return;
    }
    res.status(500).json({ error: "Failed to load event" });
  }
});

/** POST: create event + ticket types. Call after creating listing from Add Event. */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const listingRow = await query<{ name: string; type: string }>("SELECT name, type FROM listings WHERE id = $1", [listingId]);
    if (listingRow.rows.length === 0 || listingRow.rows[0].type?.toLowerCase() !== "event") {
      res.status(400).json({ error: "Listing is not an event" });
      return;
    }

    const body = req.body as {
      name?: string;
      category?: string;
      city?: string;
      venue_name?: string;
      venue_address?: string | null;
      venue_lat?: number | null;
      venue_lng?: number | null;
      start_date?: string;
      end_date?: string;
      start_time?: string;
      end_time?: string;
      organizer_name?: string;
      description?: string | null;
      ticket_types?: { name: string; price_cents: number; quantity_total: number; max_per_user: number }[];
      media?: { file_url: string; is_poster: boolean; sort_order: number }[];
    };

    const name = (body.name ?? listingRow.rows[0].name).trim() || listingRow.rows[0].name;
    const category = (body.category ?? "Other").trim() || "Other";
    const city = (body.city ?? "").trim() || "Not set";
    const venue_name = (body.venue_name ?? "").trim() || "TBA";
    const venue_address = body.venue_address?.trim() || null;
    const venue_lat = body.venue_lat != null ? Number(body.venue_lat) : null;
    const venue_lng = body.venue_lng != null ? Number(body.venue_lng) : null;
    const start_date = (body.start_date ?? "").trim() || new Date().toISOString().slice(0, 10);
    const end_date = (body.end_date ?? "").trim() || start_date;
    const start_time = (body.start_time ?? "09:00").trim().slice(0, 5) || "09:00";
    const end_time = (body.end_time ?? "18:00").trim().slice(0, 5) || "18:00";
    const organizer_name = (body.organizer_name ?? "").trim() || listingRow.rows[0].name;
    const description = body.description?.trim() || null;

    const ticketTypes = Array.isArray(body.ticket_types) && body.ticket_types.length > 0
      ? body.ticket_types
      : [{ name: "General", price_cents: 0, quantity_total: 100, max_per_user: 10 }];

    let ev = await query<{ id: string }>("SELECT id FROM events WHERE listing_id = $1 LIMIT 1", [listingId]);
    if (ev.rows.length === 0) {
      await query(
        `INSERT INTO events (listing_id, name, category, city, venue_name, venue_address, venue_lat, venue_lng, start_date, end_date, start_time, end_time, organizer_name, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::date, $11::time, $12::time, $13, $14, 'draft')`,
        [
          listingId, name, category, city, venue_name, venue_address, venue_lat, venue_lng,
          start_date, end_date, start_time, end_time, organizer_name, description,
        ]
      );
      ev = await query<{ id: string }>("SELECT id FROM events WHERE listing_id = $1 LIMIT 1", [listingId]);
    } else {
      await query(
        `UPDATE events SET name = $1, category = $2, city = $3, venue_name = $4, venue_address = $5, venue_lat = $6, venue_lng = $7,
          start_date = $8::date, end_date = $9::date, start_time = $10::time, end_time = $11::time, organizer_name = $12, description = $13, updated_at = now() WHERE id = $14`,
        [
          name, category, city, venue_name, venue_address, venue_lat, venue_lng,
          start_date, end_date, start_time, end_time, organizer_name, description,
          ev.rows[0].id,
        ]
      );
    }
    const eventId = ev.rows[0].id;

    await query("DELETE FROM event_ticket_types WHERE event_id = $1", [eventId]);
    for (const t of ticketTypes) {
      const qty = Math.max(0, Math.min(100000, Number(t.quantity_total) || 0));
      const maxPerUser = Math.max(1, Math.min(50, Number(t.max_per_user) || 5));
      const price = Math.max(0, Math.floor(Number(t.price_cents) ?? 0));
      const tName = (t.name ?? "Ticket").trim() || "Ticket";
      await query(
        "INSERT INTO event_ticket_types (event_id, name, price_cents, quantity_total, max_per_user) VALUES ($1, $2, $3, $4, $5)",
        [eventId, tName, price, qty, maxPerUser]
      );
    }

    if (Array.isArray(body.media) && body.media.length > 0) {
      await query("DELETE FROM event_media WHERE event_id = $1", [eventId]);
      for (let i = 0; i < body.media.length; i++) {
        const m = body.media[i];
        await query(
          "INSERT INTO event_media (event_id, file_url, is_poster, sort_order) VALUES ($1, $2, $3, $4)",
          [eventId, m.file_url ?? "", !!m.is_poster, m.sort_order ?? i]
        );
      }
    }

    const updated = await query<{ status: string; updated_at: string }>("SELECT status, updated_at::text FROM events WHERE id = $1", [eventId]);
    res.status(201).json({ id: eventId, status: updated.rows[0].status, updated_at: updated.rows[0].updated_at });
  } catch (err) {
    console.error("POST event error:", err);
    res.status(500).json({ error: "Failed to save event" });
  }
});

/** PATCH event: status only (live/draft/suspended) or full update. Full update sets listing verification_status to pending. */
router.patch("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const statusOnly = body.status !== undefined && Object.keys(body).length === 1;

    const ev = await query<{ id: string }>("SELECT id FROM events WHERE listing_id = $1 LIMIT 1", [listingId]);
    if (ev.rows.length === 0) {
      res.status(404).json({ error: "Event not found." });
      return;
    }
    const eventId = ev.rows[0].id;

    if (statusOnly && typeof body.status === "string") {
      const s = body.status.toLowerCase();
      if (!["live", "draft", "suspended", "submitted", "under_review", "approved", "rejected"].includes(s)) {
        res.status(400).json({ error: "status must be live, draft, or suspended" });
        return;
      }
      await query("UPDATE events SET status = $1, updated_at = now() WHERE id = $2", [s, eventId]);
      const updated = await query<{ status: string; updated_at: string }>("SELECT status, updated_at::text FROM events WHERE id = $1", [eventId]);
      res.json({ status: updated.rows[0].status, updated_at: updated.rows[0].updated_at });
      return;
    }

    const allowed = [
      "name", "category", "city", "venue_name", "venue_address", "venue_lat", "venue_lng",
      "start_date", "end_date", "start_time", "end_time", "organizer_name", "description", "status",
    ];
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === "venue_lat" || key === "venue_lng") {
        updates.push(`${key} = $${i++}`);
        values.push(body[key] === null ? null : Number(body[key]));
      } else if (key === "start_time" || key === "end_time") {
        updates.push(`${key} = $${i++}::time`);
        values.push(body[key] === null ? null : String(body[key]));
      } else if (key === "start_date" || key === "end_date") {
        updates.push(`${key} = $${i++}::date`);
        values.push(body[key] === null ? null : String(body[key]));
      } else {
        updates.push(`${key} = $${i++}`);
        values.push(body[key] === null ? null : String(body[key]));
      }
    }
    if (updates.length > 0) {
      updates.push("updated_at = now()");
      values.push(eventId);
      await query(`UPDATE events SET ${updates.join(", ")} WHERE id = $${i}`, values);
      await query("UPDATE listings SET verification_status = 'pending', updated_at = now() WHERE id = $1", [listingId]);
    }

    if (Array.isArray(body.ticket_types) && body.ticket_types.length > 0) {
      await query("DELETE FROM event_ticket_types WHERE event_id = $1", [eventId]);
      for (const t of body.ticket_types as { name: string; price_cents: number; quantity_total: number; max_per_user: number }[]) {
        const qty = Math.max(0, Math.min(100000, Number(t.quantity_total) || 0));
        const maxPerUser = Math.max(1, Math.min(50, Number(t.max_per_user) || 5));
        const price = Math.max(0, Math.floor(Number(t.price_cents) ?? 0));
        const tName = (t.name ?? "Ticket").trim() || "Ticket";
        await query(
          "INSERT INTO event_ticket_types (event_id, name, price_cents, quantity_total, max_per_user) VALUES ($1, $2, $3, $4, $5)",
          [eventId, tName, price, qty, maxPerUser]
        );
      }
      await query("UPDATE listings SET verification_status = 'pending', updated_at = now() WHERE id = $1", [listingId]);
    }

    if (Array.isArray(body.media)) {
      await query("DELETE FROM event_media WHERE event_id = $1", [eventId]);
      for (let j = 0; j < body.media.length; j++) {
        const m = body.media[j] as { file_url: string; is_poster?: boolean; sort_order?: number };
        await query(
          "INSERT INTO event_media (event_id, file_url, is_poster, sort_order) VALUES ($1, $2, $3, $4)",
          [eventId, m.file_url ?? "", !!m.is_poster, m.sort_order ?? j]
        );
      }
      await query("UPDATE listings SET verification_status = 'pending', updated_at = now() WHERE id = $1", [listingId]);
    }

    const updated = await query<{ status: string; updated_at: string }>("SELECT status, updated_at::text FROM events WHERE id = $1", [eventId]);
    res.json({ status: updated.rows[0].status, updated_at: updated.rows[0].updated_at, verification_required: true });
  } catch (err) {
    console.error("PATCH event error:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

export default router;

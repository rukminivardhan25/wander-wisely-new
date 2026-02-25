import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const scheduleSchema = z.object({
  route_id: z.string().uuid(),
  schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "schedule_date must be YYYY-MM-DD"),
  departure_time: z.string().min(1, "Departure time required"), // e.g. "06:00" or "06:00:00"
  arrival_time: z.string().min(1, "Arrival time required"),
  status: z.enum(["active", "cancelled"]).optional(),
});
const createSchema = scheduleSchema;
const updateSchema = scheduleSchema.partial();

interface ListingRow {
  id: string;
  vendor_id: string;
  type: string;
}

async function getTransportListing(listingId: string, vendorId: string): Promise<ListingRow | null> {
  try {
    const r = await query<ListingRow>(
      "SELECT id, vendor_id, type FROM listings WHERE id = $1 AND vendor_id = $2 AND LOWER(TRIM(type)) = 'transport'",
      [listingId, vendorId]
    );
    if (r.rows.length > 0) return r.rows[0];
  } catch (_) {}
  try {
    const vl = await query<{ listing_id: string }>(
      "SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2",
      [listingId, vendorId]
    );
    if (vl.rows.length > 0) {
      const l = await query<{ id: string; type: string }>("SELECT id, type FROM listings WHERE id = $1", [listingId]);
      if (l.rows.length > 0 && (l.rows[0].type || "").toLowerCase().trim() === "transport")
        return { id: l.rows[0].id, vendor_id: vendorId, type: l.rows[0].type };
    }
  } catch (_) {}
  return null;
}

async function ensureFlightOwned(flightId: string, listingId: string, vendorId: string): Promise<boolean> {
  const listing = await getTransportListing(listingId, vendorId);
  if (!listing) return false;
  const r = await query<{ id: string }>("SELECT id FROM flights WHERE id = $1 AND listing_id = $2", [flightId, listingId]);
  return r.rows.length > 0;
}

/** GET /api/listings/:listingId/flights/:flightId/schedules */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    if (!listingId || !flightId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    let sql = `SELECT s.id, s.route_id, s.schedule_date::text, s.departure_time::text, s.arrival_time::text, s.status, s.created_at,
       r.from_place, r.to_place, r.fare_cents
       FROM flight_schedules s
       JOIN flight_routes r ON r.id = s.route_id
       WHERE s.flight_id = $1`;
    const params: unknown[] = [flightId];
    if (fromDate) {
      params.push(fromDate);
      sql += ` AND s.schedule_date >= $${params.length}::date`;
    }
    if (toDate) {
      params.push(toDate);
      sql += ` AND s.schedule_date <= $${params.length}::date`;
    }
    sql += " ORDER BY s.schedule_date, s.departure_time";

    const result = await query<{
      id: string;
      route_id: string;
      schedule_date: string;
      departure_time: string;
      arrival_time: string;
      status: string;
      created_at: string;
      from_place: string;
      to_place: string;
      fare_cents: number | null;
    }>(sql, params);
    res.json({
      schedules: result.rows.map((r) => ({
        id: r.id,
        routeId: r.route_id,
        scheduleDate: r.schedule_date,
        departureTime: r.departure_time,
        arrivalTime: r.arrival_time,
        status: r.status,
        createdAt: r.created_at,
        fromPlace: r.from_place,
        toPlace: r.to_place,
        fareCents: r.fare_cents ?? undefined,
      })),
    });
  } catch (err) {
    console.error("List flight schedules error:", err);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

/** POST /api/listings/:listingId/flights/:flightId/schedules */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    if (!listingId || !flightId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    // Ensure route belongs to this flight
    const routeCheck = await query<{ id: string }>("SELECT id FROM flight_routes WHERE id = $1 AND flight_id = $2", [d.route_id, flightId]);
    if (routeCheck.rows.length === 0) {
      res.status(400).json({ error: "Route not found for this flight" });
      return;
    }
    const result = await query<{ id: string; schedule_date: string; departure_time: string }>(
      `INSERT INTO flight_schedules (flight_id, route_id, schedule_date, departure_time, arrival_time, status, updated_at)
       VALUES ($1, $2, $3::date, $4::time, $5::time, $6, now())
       RETURNING id, schedule_date::text, departure_time::text`,
      [flightId, d.route_id, d.schedule_date, d.departure_time, d.arrival_time, d.status ?? "active"]
    );
    const row = result.rows[0];
    if (!row) {
      res.status(500).json({ error: "Failed to create schedule" });
      return;
    }
    res.status(201).json({
      id: row.id,
      scheduleDate: row.schedule_date,
      departureTime: row.departure_time,
    });
  } catch (err) {
    console.error("Create flight schedule error:", err);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

/** PATCH /api/listings/:listingId/flights/:flightId/schedules/:scheduleId */
router.patch("/:scheduleId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    const scheduleId = req.params.scheduleId;
    if (!listingId || !flightId || !scheduleId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (d.route_id !== undefined) {
      const routeCheck = await query<{ id: string }>("SELECT id FROM flight_routes WHERE id = $1 AND flight_id = $2", [d.route_id, flightId]);
      if (routeCheck.rows.length === 0) {
        res.status(400).json({ error: "Route not found for this flight" });
        return;
      }
      updates.push(`route_id = $${idx++}`);
      values.push(d.route_id);
    }
    if (d.schedule_date !== undefined) {
      updates.push(`schedule_date = $${idx++}::date`);
      values.push(d.schedule_date);
    }
    if (d.departure_time !== undefined) {
      updates.push(`departure_time = $${idx++}::time`);
      values.push(d.departure_time);
    }
    if (d.arrival_time !== undefined) {
      updates.push(`arrival_time = $${idx++}::time`);
      values.push(d.arrival_time);
    }
    if (d.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(d.status);
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    updates.push("updated_at = now()");
    values.push(scheduleId, flightId);
    const whereIdx = idx;
    const result = await query(
      `UPDATE flight_schedules SET ${updates.join(", ")} WHERE id = $${whereIdx} AND flight_id = $${whereIdx + 1} RETURNING id`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Update flight schedule error:", err);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

/** GET /api/listings/:listingId/flights/:flightId/schedules/:scheduleId/seat-map — Seat map for this schedule (available vs booked) */
router.get("/:scheduleId/seat-map", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    const scheduleId = req.params.scheduleId;
    if (!listingId || !flightId || !scheduleId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const flight = await query<{ total_seats: number; seat_layout: unknown }>(
      "SELECT total_seats, seat_layout FROM flights WHERE id = $1",
      [flightId]
    );
    if (flight.rows.length === 0) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const totalSeats = flight.rows[0].total_seats;
    const layout = flight.rows[0].seat_layout as { rows?: number; colsPerRow?: number } | null;
    const rows = layout?.rows ?? Math.ceil(totalSeats / 6);
    const colsPerRow = layout?.colsPerRow ?? 6;
    const booked = await query<{ seat_number: string }>(
      `SELECT p.seat_number FROM flight_booking_passengers p
       JOIN flight_bookings b ON b.id = p.flight_booking_id
       WHERE b.schedule_id = $1 AND b.status IN ('confirmed', 'approved_awaiting_payment') AND p.seat_number IS NOT NULL AND trim(p.seat_number) != ''`,
      [scheduleId]
    );
    const bookedSet = new Set(booked.rows.map((r) => (r.seat_number || "").trim().toUpperCase()));
    const seats: { rowLetter: string; colNumber: number; label: string; status: "available" | "booked" }[] = [];
    for (let r = 0; r < rows; r++) {
      const rowLetter = String.fromCharCode(65 + r);
      for (let c = 0; c < colsPerRow; c++) {
        const seatNum = r * colsPerRow + c + 1;
        if (seatNum > totalSeats) break;
        const label = `${rowLetter}${c + 1}`;
        seats.push({ rowLetter, colNumber: c + 1, label, status: bookedSet.has(label) ? "booked" : "available" });
      }
    }
    res.json({
      seatLayout: { rows, colsPerRow, totalSeats },
      seats,
    });
  } catch (err) {
    console.error("Seat map error:", err);
    res.status(500).json({ error: "Failed to load seat map" });
  }
});

/** DELETE /api/listings/:listingId/flights/:flightId/schedules/:scheduleId */
router.delete("/:scheduleId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    const scheduleId = req.params.scheduleId;
    if (!listingId || !flightId || !scheduleId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const result = await query("DELETE FROM flight_schedules WHERE id = $1 AND flight_id = $2 RETURNING id", [scheduleId, flightId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete flight schedule error:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

export default router;

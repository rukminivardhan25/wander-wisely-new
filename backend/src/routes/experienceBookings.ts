import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

function bookingRef(): string {
  const s = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EXP-${s()}-${s()}`;
}

/** POST /api/experience-bookings — Create experience booking */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const body = req.body as {
      experienceId?: string;
      experienceSlotId?: string;
      participantsCount?: number;
      totalCents?: number;
      tripId?: string;
    };
    const experienceId = body.experienceId;
    const experienceSlotId = body.experienceSlotId;
    const participantsCount = Math.min(50, Math.max(1, Number(body.participantsCount) || 1));
    const totalCents = Math.max(0, Number(body.totalCents) ?? 0);
    const tripId = typeof body.tripId === "string" && /^[0-9a-f-]{36}$/i.test(body.tripId.trim()) ? body.tripId.trim() : null;

    if (!experienceId || !experienceSlotId) {
      res.status(400).json({ error: "experienceId and experienceSlotId are required" });
      return;
    }

    const exp = await query<{ id: string; status: string; price_per_person_cents: number }>(
      "SELECT id, status, price_per_person_cents FROM experiences WHERE id = $1",
      [experienceId]
    );
    if (exp.rows.length === 0) {
      res.status(404).json({ error: "Experience not found" });
      return;
    }
    if (exp.rows[0].status !== "live") {
      res.status(400).json({ error: "Experience is not available for booking" });
      return;
    }

    const slot = await query<{ id: string; experience_id: string; capacity: number }>(
      "SELECT id, experience_id, capacity FROM experience_slots WHERE id = $1 AND experience_id = $2",
      [experienceSlotId, experienceId]
    );
    if (slot.rows.length === 0) {
      res.status(404).json({ error: "Slot not found for this experience" });
      return;
    }

    const booked = await query<{ sum: string }>(
      `SELECT COALESCE(SUM(participants_count), 0)::text FROM experience_bookings WHERE experience_slot_id = $1 AND status != 'cancelled'`,
      [experienceSlotId]
    );
    const alreadyBooked = parseInt(booked.rows[0]?.sum ?? "0", 10);
    const capacity = slot.rows[0].capacity;
    if (alreadyBooked + participantsCount > capacity) {
      res.status(400).json({ error: "Not enough capacity in this slot" });
      return;
    }

    const expectedCents = exp.rows[0].price_per_person_cents * participantsCount;
    if (totalCents !== expectedCents) {
      res.status(400).json({ error: "Total amount does not match price × participants" });
      return;
    }

    const ref = bookingRef();
    await query(
      `INSERT INTO experience_bookings (booking_ref, experience_id, experience_slot_id, user_id, trip_id, participants_count, total_cents, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')`,
      [ref, experienceId, experienceSlotId, userId, tripId, participantsCount, totalCents]
    );

    const created = await query<{ id: string; booking_ref: string; created_at: string }>(
      "SELECT id, booking_ref, created_at::text FROM experience_bookings WHERE booking_ref = $1",
      [ref]
    );
    res.status(201).json({
      id: created.rows[0].id,
      bookingRef: created.rows[0].booking_ref,
      status: "confirmed",
      createdAt: created.rows[0].created_at,
    });
  } catch (err) {
    console.error("Create experience booking error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("experience_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Experience bookings not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to create booking" });
  }
});

/** GET /api/experience-bookings — List current user's experience bookings. Optional ?trip_id=uuid to scope to a trip. */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tripId = typeof req.query.trip_id === "string" && /^[0-9a-f-]{36}$/i.test(req.query.trip_id.trim()) ? req.query.trip_id.trim() : null;
    const rows = await query<{
      id: string;
      booking_ref: string;
      experience_id: string;
      experience_slot_id: string;
      participants_count: number;
      total_cents: number;
      status: string;
      paid_at: string | null;
      created_at: string;
      slot_date: string;
      slot_time: string;
      exp_name: string;
      exp_city: string;
    }>(
      tripId
        ? `SELECT b.id, b.booking_ref, b.experience_id, b.experience_slot_id, b.participants_count, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
           s.slot_date::text AS slot_date, s.slot_time::text AS slot_time,
           e.name AS exp_name, e.city AS exp_city
          FROM experience_bookings b
          JOIN experience_slots s ON s.id = b.experience_slot_id
          JOIN experiences e ON e.id = b.experience_id
          WHERE b.user_id = $1 AND b.trip_id = $2 ORDER BY b.created_at DESC`
        : `SELECT b.id, b.booking_ref, b.experience_id, b.experience_slot_id, b.participants_count, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
           s.slot_date::text AS slot_date, s.slot_time::text AS slot_time,
           e.name AS exp_name, e.city AS exp_city
          FROM experience_bookings b
          JOIN experience_slots s ON s.id = b.experience_slot_id
          JOIN experiences e ON e.id = b.experience_id
          WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      tripId ? [userId, tripId] : [userId]
    );

    res.json({
      bookings: rows.rows.map((r) => ({
        id: r.id,
        bookingRef: r.booking_ref,
        experienceId: r.experience_id,
        experienceSlotId: r.experience_slot_id,
        participantsCount: r.participants_count,
        totalCents: r.total_cents,
        status: r.status,
        paidAt: r.paid_at ?? undefined,
        createdAt: r.created_at,
        slotDate: r.slot_date,
        slotTime: r.slot_time?.slice(0, 5) ?? "",
        experienceName: r.exp_name,
        experienceCity: r.exp_city,
      })),
    });
  } catch (err) {
    console.error("List experience bookings error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("experience_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Experience bookings not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to list bookings" });
  }
});

/** GET /api/experience-bookings/:id — Single booking (for ticket) */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id;
    const row = await query<{
      id: string;
      booking_ref: string;
      experience_id: string;
      experience_slot_id: string;
      participants_count: number;
      total_cents: number;
      status: string;
      paid_at: string | null;
      created_at: string;
      slot_date: string;
      slot_time: string;
      exp_name: string;
      exp_city: string;
    }>(
      `SELECT b.id, b.booking_ref, b.experience_id, b.experience_slot_id, b.participants_count, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
         s.slot_date::text, s.slot_time::text,
         e.name AS exp_name, e.city AS exp_city
       FROM experience_bookings b
       JOIN experience_slots s ON s.id = b.experience_slot_id
       JOIN experiences e ON e.id = b.experience_id
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
      experienceId: r.experience_id,
      experienceSlotId: r.experience_slot_id,
      participantsCount: r.participants_count,
      totalCents: r.total_cents,
      status: r.status,
      paidAt: r.paid_at ?? undefined,
      createdAt: r.created_at,
      slotDate: r.slot_date,
      slotTime: r.slot_time?.slice(0, 5) ?? "",
      experienceName: r.exp_name,
      experienceCity: r.exp_city,
    });
  } catch (err) {
    console.error("Get experience booking error:", err);
    res.status(500).json({ error: "Failed to load booking" });
  }
});

/** PATCH /api/experience-bookings/:id/pay — Mark booking as paid (simulated payment); returns booking for ticket */
router.patch("/:id/pay", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const id = req.params.id;
    const existing = await query<{ id: string; paid_at: string | null }>(
      "SELECT id, paid_at::text FROM experience_bookings WHERE id = $1 AND user_id = $2",
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
    await query("UPDATE experience_bookings SET paid_at = now(), updated_at = now() WHERE id = $1 AND user_id = $2", [id, userId]);
    const row = await query<{
      id: string;
      booking_ref: string;
      experience_id: string;
      experience_slot_id: string;
      participants_count: number;
      total_cents: number;
      status: string;
      paid_at: string | null;
      created_at: string;
      slot_date: string;
      slot_time: string;
      exp_name: string;
      exp_city: string;
    }>(
      `SELECT b.id, b.booking_ref, b.experience_id, b.experience_slot_id, b.participants_count, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
         s.slot_date::text, s.slot_time::text,
         e.name AS exp_name, e.city AS exp_city
       FROM experience_bookings b
       JOIN experience_slots s ON s.id = b.experience_slot_id
       JOIN experiences e ON e.id = b.experience_id
       WHERE b.id = $1`,
      [id]
    );
    const r = row.rows[0];
    res.json({
      id: r.id,
      bookingRef: r.booking_ref,
      experienceId: r.experience_id,
      experienceSlotId: r.experience_slot_id,
      participantsCount: r.participants_count,
      totalCents: r.total_cents,
      status: r.status,
      paidAt: r.paid_at ?? undefined,
      createdAt: r.created_at,
      slotDate: r.slot_date,
      slotTime: r.slot_time?.slice(0, 5) ?? "",
      experienceName: r.exp_name,
      experienceCity: r.exp_city,
    });
  } catch (err) {
    console.error("Pay experience booking error:", err);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

export default router;

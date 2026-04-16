import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { generateItinerary } from "../services/groq.js";
import { getDayImages } from "../services/unsplash.js";

const router = Router();
const BUDGET = ["Budget", "Medium", "Luxury"] as const;
const TRAVEL_TYPE = ["Solo", "Couple", "Family", "Friends"] as const;
const TRANSPORT = ["Flight", "Train", "Bus", "Car"] as const;

const EXPENSE_CATEGORIES = ["Transport", "Food", "Shopping", "Stay", "Experience", "Other"] as const;

const createTripSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  days: z.number().int().min(1).max(30),
  budget: z.enum(BUDGET),
  travel_type: z.enum(TRAVEL_TYPE),
  interests: z.array(z.string()).default([]),
  transport_preference: z.enum(TRANSPORT).optional(),
  budget_amount: z.number().positive().optional(),
});

/** Generate endpoint: only budget_amount is required (no Budget/Medium/Luxury tier). */
const generateTripSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  days: z.number().int().min(1).max(30),
  budget: z.enum(BUDGET).optional(),
  travel_type: z.enum(TRAVEL_TYPE),
  interests: z.array(z.string()).default([]),
  transport_preference: z.enum(TRANSPORT).optional(),
  budget_amount: z.number().positive(),
});

function budgetTierFromAmount(amount: number, days: number): (typeof BUDGET)[number] {
  const perDay = amount / Math.max(1, days);
  if (perDay <= 1500) return "Budget";
  if (perDay <= 6000) return "Medium";
  return "Luxury";
}

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(EXPENSE_CATEGORIES),
  day_number: z.number().int().min(1).max(30).optional(),
  note: z.string().max(500).optional(),
});

router.use(authMiddleware);

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const result = await query<{
      id: string;
      origin: string;
      destination: string;
      days: number;
      budget: string;
      travel_type: string;
      interests: string[];
      transport_preference: string | null;
      status: string;
      created_at: string;
      start_date: string | null;
      budget_amount: number | null;
      selected_at: string | null;
      spent: string;
    }>(
      `select t.id, t.origin, t.destination, t.days, t.budget, t.travel_type, t.interests, t.transport_preference, t.status, t.created_at, t.start_date, t.budget_amount, t.selected_at,
       (select coalesce(sum(e.amount), 0)::bigint from expenses e where e.trip_id = t.id and e.user_id = t.user_id)::text as spent
       from trips t where t.user_id = $1 order by t.selected_at desc nulls last, t.created_at desc`,
      [userId]
    );
    res.json({
      trips: result.rows.map((r) => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        days: r.days,
        budget: r.budget,
        travel_type: r.travel_type,
        interests: r.interests,
        transport_preference: r.transport_preference,
        status: r.status,
        created_at: r.created_at,
        start_date: r.start_date,
        budget_amount: r.budget_amount != null ? Number(r.budget_amount) : null,
        selected_at: r.selected_at,
        spent: Number(r.spent) || 0,
      })),
    });
  } catch (err) {
    console.error("List trips error:", err);
    res.status(500).json({ error: "Failed to list trips" });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const userId = req.userId!;
    const {
      origin,
      destination,
      days,
      budget,
      travel_type,
      interests,
      transport_preference,
    } = parsed.data;

    const result = await query<{ id: string }>(
      `insert into trips (user_id, origin, destination, days, budget, travel_type, interests, transport_preference)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [userId, origin, destination, days, budget, travel_type, interests, transport_preference ?? null]
    );
    const trip = result.rows[0];
    res.status(201).json({ id: trip.id, message: "Trip created" });
  } catch (err) {
    console.error("Create trip error:", err);
    res.status(500).json({ error: "Failed to create trip" });
  }
});

router.post("/generate", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.GROQ_API_KEY?.trim()) {
      res.status(503).json({
        error: "Trip generation is not configured. The server is missing GROQ_API_KEY. Add it to backend .env (get a key at https://console.groq.com).",
      });
      return;
    }
    const parsed = generateTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const userId = req.userId!;
    const { origin, destination, days, travel_type, interests, transport_preference, budget_amount } = parsed.data;
    const budget = parsed.data.budget ?? budgetTierFromAmount(budget_amount, days);

    const tripInsert = await query<{ id: string }>(
      `insert into trips (user_id, origin, destination, days, budget, travel_type, interests, transport_preference, budget_amount, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'generating') returning id`,
      [userId, origin, destination, days, budget, travel_type, interests, transport_preference ?? null, budget_amount]
    );
    const tripId = tripInsert.rows[0].id;

    let plan;
    try {
      plan = await generateItinerary({
        origin,
        destination,
        days,
        budget,
        travel_type,
        interests,
        transport_preference: transport_preference ?? undefined,
        budget_amount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Groq generate error:", err);
      await query("update trips set status = 'failed' where id = $1", [tripId]);
      const isConfig = /API key|not set|invalid|unauthorized/i.test(message);
      res.status(502).json({
        error: isConfig
          ? "Failed to generate itinerary. Check that GROQ_API_KEY is set correctly in backend .env."
          : "Failed to generate itinerary. Please try again or check server logs.",
      });
      return;
    }

    const planDays = Array.isArray(plan?.days) ? plan.days : [];
    if (planDays.length === 0) {
      await query("update trips set status = 'failed' where id = $1", [tripId]);
      res.status(502).json({ error: "Failed to generate itinerary. No days returned. Please try again." });
      return;
    }

    const itineraryRows = await Promise.all(
      planDays.map(async (d) => {
        let imageUrls: string[] = [];
        try {
          imageUrls = await getDayImages(d.mainPlace || destination, destination, 2);
        } catch (imgErr) {
          console.warn("Day images fetch failed (continuing without images):", imgErr);
        }
        return {
          day: d.day,
          content: {
            summary: d.summary,
            activities: d.activities,
            imageUrl: imageUrls[0] ?? undefined,
            imageUrls: imageUrls.length ? imageUrls : undefined,
          },
        };
      })
    );

    await Promise.all(
      itineraryRows.map((row) =>
        query(
          "insert into itineraries (trip_id, day_number, content) values ($1, $2, $3)",
          [tripId, row.day, JSON.stringify(row.content)]
        )
      )
    );

    await query("update trips set status = 'ready' where id = $1", [tripId]);

    const itinerariesResult = await query(
      "select id, trip_id, day_number, content, created_at from itineraries where trip_id = $1 order by day_number",
      [tripId]
    );

    // Ensure content is always an object (pg returns jsonb as object; normalize for frontend)
    const itineraries = itinerariesResult.rows.map((row: { content?: unknown }) => ({
      ...row,
      content: typeof row.content === "string" ? JSON.parse(row.content) : row.content ?? {},
    }));

    res.status(201).json({
      trip: { id: tripId, origin, destination, days, status: "ready" },
      itineraries,
    });
  } catch (err) {
    console.error("Generate trip error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    const safeMsg = process.env.NODE_ENV !== "production" && msg
      ? msg
      : "Failed to generate trip. Check server logs or set GROQ_API_KEY in backend .env (see https://console.groq.com).";
    res.status(500).json({ error: safeMsg });
  }
});

/** Get the current user's active trip (status = 'active'). One per user. Returns 200 with trip: null if none. */
router.get("/active", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tripRow = await query<{ id: string; origin: string; destination: string; days: number; status: string; start_date: string | null; budget: string; budget_amount: number | null }>(
      "select id, origin, destination, days, status, start_date, budget, budget_amount from trips where user_id = $1 and status = 'active' limit 1",
      [userId]
    );
    if (tripRow.rows.length === 0) {
      res.status(200).json({ trip: null, itineraries: [], activity_status: [] });
      return;
    }
    const trip = tripRow.rows[0];
    const itinerariesResult = await query<{ id: string; trip_id: string; day_number: number; content: unknown; created_at: string }>(
      "select id, trip_id, day_number, content, created_at from itineraries where trip_id = $1 order by day_number",
      [trip.id]
    );
    const itineraries = itinerariesResult.rows.map((row) => ({
      ...row,
      content: typeof row.content === "string" ? JSON.parse(row.content) : row.content ?? {},
    }));

    const statusRows = await query<{ day_number: number; activity_index: number; status: string }>(
      "select day_number, activity_index, status from trip_activity_status where trip_id = $1",
      [trip.id]
    ).catch(() => ({ rows: [] }));
    const activity_status = statusRows.rows.map((r) => ({
      day_number: r.day_number,
      activity_index: r.activity_index,
      status: r.status as "visited" | "missed",
    }));

    res.json({
      trip: {
        id: trip.id,
        origin: trip.origin,
        destination: trip.destination,
        days: trip.days,
        status: trip.status,
        start_date: trip.start_date ?? undefined,
        budget: trip.budget,
        budget_amount: trip.budget_amount != null ? Number(trip.budget_amount) : undefined,
      },
      itineraries,
      activity_status,
    });
  } catch (err) {
    console.error("Get active trip error:", err);
    res.status(500).json({ error: "Failed to get active trip" });
  }
});

/** DELETE /api/trips/all — Permanently delete all trips for the current user and all related data. */
router.delete("/all", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    await query("delete from trips where user_id = $1", [userId]);
    res.status(204).send();
  } catch (err) {
    console.error("Delete all trips error:", err);
    res.status(500).json({ error: "Failed to delete all trips" });
  }
});

/** GET /api/trips/:id — Get one trip by id (same shape as /active). For read-only trip view. User must own trip. */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: tripId } = req.params;
    if (tripId === "active" || !tripId) {
      res.status(400).json({ error: "Use GET /api/trips/active for active trip" });
      return;
    }
    const tripRow = await query<{ id: string; origin: string; destination: string; days: number; status: string; start_date: string | null; budget: string; budget_amount: number | null; user_id: string }>(
      "select id, origin, destination, days, status, start_date, budget, budget_amount, user_id from trips where id = $1",
      [tripId]
    );
    if (tripRow.rows.length === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (tripRow.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const trip = tripRow.rows[0];
    const itinerariesResult = await query<{ id: string; trip_id: string; day_number: number; content: unknown; created_at: string }>(
      "select id, trip_id, day_number, content, created_at from itineraries where trip_id = $1 order by day_number",
      [trip.id]
    );
    const itineraries = itinerariesResult.rows.map((row) => ({
      ...row,
      content: typeof row.content === "string" ? JSON.parse(row.content) : row.content ?? {},
    }));
    const statusRows = await query<{ day_number: number; activity_index: number; status: string }>(
      "select day_number, activity_index, status from trip_activity_status where trip_id = $1",
      [trip.id]
    ).catch(() => ({ rows: [] }));
    const activity_status = statusRows.rows.map((r) => ({
      day_number: r.day_number,
      activity_index: r.activity_index,
      status: r.status as "visited" | "missed",
    }));
    res.json({
      trip: {
        id: trip.id,
        origin: trip.origin,
        destination: trip.destination,
        days: trip.days,
        status: trip.status,
        start_date: trip.start_date ?? undefined,
        budget: trip.budget,
        budget_amount: trip.budget_amount != null ? Number(trip.budget_amount) : undefined,
      },
      itineraries,
      activity_status,
    });
  } catch (err) {
    console.error("Get trip by id error:", err);
    res.status(500).json({ error: "Failed to get trip" });
  }
});

/** DELETE /api/trips/:id — Permanently delete a trip and all related data (itineraries, expenses, activity status). Bookings are unlinked (trip_id set null). User must own the trip. */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: tripId } = req.params;
    if (tripId === "active" || !tripId) {
      res.status(400).json({ error: "Invalid trip id" });
      return;
    }
    const tripCheck = await query<{ user_id: string }>("select user_id from trips where id = $1", [tripId]);
    if (tripCheck.rows.length === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (tripCheck.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await query("delete from trips where id = $1 and user_id = $2", [tripId, userId]);
    res.status(204).send();
  } catch (err) {
    console.error("Delete trip error:", err);
    res.status(500).json({ error: "Failed to delete trip" });
  }
});

/** Set this trip as the user's active trip. Clears any previous active trip. */
router.post("/:id/activate", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: tripId } = req.params;

    const tripCheck = await query<{ user_id: string }>("select user_id from trips where id = $1", [tripId]);
    if (tripCheck.rows.length === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (tripCheck.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const statusCheck = await query<{ status: string }>("select status from trips where id = $1", [tripId]);
    if (statusCheck.rows[0].status !== "ready") {
      res.status(400).json({ error: "Only a generated plan (ready) can be set as your trip" });
      return;
    }

    await query("update trips set status = 'ready' where user_id = $1 and status = 'active'", [userId]);
    await query("update trips set status = 'active', selected_at = now(), updated_at = now() where id = $1", [tripId]);

    res.status(200).json({ message: "Trip is now your active trip" });
  } catch (err) {
    console.error("Activate trip error:", err);
    res.status(500).json({ error: "Failed to set active trip" });
  }
});

const patchTripSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  budget_amount: z.number().positive().optional(),
}).refine((d) => d.start_date != null || d.budget_amount != null, { message: "Provide at least one of start_date, budget_amount" });

/** Set trip start date and/or confirmed total budget. */
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: tripId } = req.params;

    const tripCheck = await query<{ user_id: string }>("select user_id from trips where id = $1", [tripId]);
    if (tripCheck.rows.length === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (tripCheck.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const parsed = patchTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    if (parsed.data.start_date != null) {
      await query("update trips set start_date = $1::date, updated_at = now() where id = $2", [parsed.data.start_date, tripId]);
    }
    if (parsed.data.budget_amount != null) {
      await query("update trips set budget_amount = $1, updated_at = now() where id = $2", [parsed.data.budget_amount, tripId]);
    }
    res.status(200).json({
      message: "Trip updated",
      ...(parsed.data.start_date != null && { start_date: parsed.data.start_date }),
      ...(parsed.data.budget_amount != null && { budget_amount: parsed.data.budget_amount }),
    });
  } catch (err) {
    console.error("Patch trip error:", err);
    res.status(500).json({ error: "Failed to update trip" });
  }
});

/** List expenses for a trip. User must own the trip. */
router.get("/:id/expenses", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: tripId } = req.params;

    const tripCheck = await query<{ user_id: string; days: number }>("select user_id, days from trips where id = $1", [tripId]);
    if (tripCheck.rows.length === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (tripCheck.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const result = await query(
      "select id, trip_id, amount, category, day_number, note, created_at from expenses where trip_id = $1 and user_id = $2 order by created_at desc",
      [tripId, userId]
    );
    res.json({ expenses: result.rows });
  } catch (err) {
    console.error("List expenses error:", err);
    res.status(500).json({ error: "Failed to list expenses" });
  }
});

/** Add an expense to a trip. User must own the trip. */
router.post("/:id/expenses", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: tripId } = req.params;

    const tripCheck = await query<{ user_id: string; days: number }>("select user_id, days from trips where id = $1", [tripId]);
    if (tripCheck.rows.length === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (tripCheck.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { amount, category, day_number, note } = parsed.data;
    const days = tripCheck.rows[0].days;
    if (day_number != null && (day_number < 1 || day_number > days)) {
      res.status(400).json({ error: `day_number must be between 1 and ${days}` });
      return;
    }

    const result = await query<{ id: string; amount: number; category: string; day_number: number | null; note: string; created_at: string }>(
      `insert into expenses (trip_id, user_id, amount, category, day_number, note)
       values ($1, $2, $3, $4, $5, $6)
       returning id, amount, category, day_number, note, created_at`,
      [tripId, userId, amount, category, day_number ?? null, (note ?? "").trim()]
    );
    const row = result.rows[0];
    res.status(201).json({
      expense: {
        id: row.id,
        amount: Number(row.amount),
        category: row.category,
        day_number: row.day_number,
        note: row.note,
        created_at: row.created_at,
      },
    });
  } catch (err) {
    console.error("Create expense error:", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

const setActivityStatusSchema = z.object({
  day_number: z.number().int().min(1).max(30),
  activity_index: z.number().int().min(0),
  status: z.enum(["visited", "missed"]),
});

/** Set visit/miss status for one activity. User must own the trip. Only for current day (enforced client-side; server accepts any day). */
router.patch("/:id/activity-status", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: tripId } = req.params;

    const tripCheck = await query<{ user_id: string; days: number }>("select user_id, days from trips where id = $1", [tripId]);
    if (tripCheck.rows.length === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (tripCheck.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const parsed = setActivityStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { day_number, activity_index, status } = parsed.data;
    const days = tripCheck.rows[0].days;
    if (day_number < 1 || day_number > days) {
      res.status(400).json({ error: `day_number must be between 1 and ${days}` });
      return;
    }

    await query(
      `insert into trip_activity_status (trip_id, user_id, day_number, activity_index, status)
       values ($1, $2, $3, $4, $5)
       on conflict (trip_id, day_number, activity_index) do update set status = $5`,
      [tripId, userId, day_number, activity_index, status]
    );
    res.status(200).json({ message: "Status updated", day_number, activity_index, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Set activity status error:", err);
    if (/relation "trip_activity_status" does not exist|relation .*trip_activity_status.* does not exist/i.test(message)) {
      res.status(503).json({
        error: "Activity status is not set up. Run the database migration: backend/schema/015_trip_activity_status.sql",
      });
      return;
    }
    res.status(500).json({ error: "Failed to set activity status" });
  }
});

router.get("/:id/itineraries", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: tripId } = req.params;

    const tripCheck = await query<{ user_id: string }>("select user_id from trips where id = $1", [tripId]);
    if (tripCheck.rows.length === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (tripCheck.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const result = await query(
      "select id, trip_id, day_number, content, created_at from itineraries where trip_id = $1 order by day_number",
      [tripId]
    );
    res.json({ itineraries: result.rows });
  } catch (err) {
    console.error("List itineraries error:", err);
    res.status(500).json({ error: "Failed to list itineraries" });
  }
});

export default router;

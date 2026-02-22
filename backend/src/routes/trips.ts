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
    const result = await query(
      "select id, origin, destination, days, budget, travel_type, interests, transport_preference, status, created_at from trips where user_id = $1 order by created_at desc",
      [userId]
    );
    res.json({ trips: result.rows });
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
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const userId = req.userId!;
    const { origin, destination, days, budget, travel_type, interests, transport_preference, budget_amount } = parsed.data;

    const tripInsert = await query<{ id: string }>(
      `insert into trips (user_id, origin, destination, days, budget, travel_type, interests, transport_preference, budget_amount, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'generating') returning id`,
      [userId, origin, destination, days, budget, travel_type, interests, transport_preference ?? null, budget_amount ?? null]
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
        budget_amount: budget_amount ?? undefined,
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

    for (const d of plan.days) {
      const imageUrls = await getDayImages(d.mainPlace || destination, destination, 2);
      const content = {
        summary: d.summary,
        activities: d.activities,
        imageUrl: imageUrls[0] ?? undefined,
        imageUrls: imageUrls.length ? imageUrls : undefined,
      };
      await query(
        "insert into itineraries (trip_id, day_number, content) values ($1, $2, $3)",
        [tripId, d.day, JSON.stringify(content)]
      );
    }

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
    res.status(500).json({ error: "Failed to generate trip" });
  }
});

/** Get the current user's active trip (status = 'active'). One per user. Returns 404 if none. */
router.get("/active", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const tripRow = await query<{ id: string; origin: string; destination: string; days: number; status: string; start_date: string | null; budget: string; budget_amount: number | null }>(
      "select id, origin, destination, days, status, start_date, budget, budget_amount from trips where user_id = $1 and status = 'active' limit 1",
      [userId]
    );
    if (tripRow.rows.length === 0) {
      res.status(404).json({ error: "No active trip" });
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
    });
  } catch (err) {
    console.error("Get active trip error:", err);
    res.status(500).json({ error: "Failed to get active trip" });
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

const setStartDateSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

/** Set trip start date (when user starts the trip from a chosen day). */
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

    const parsed = setStartDateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    await query("update trips set start_date = $1::date, updated_at = now() where id = $2", [parsed.data.start_date, tripId]);
    res.status(200).json({ message: "Start date set", start_date: parsed.data.start_date });
  } catch (err) {
    console.error("Set start date error:", err);
    res.status(500).json({ error: "Failed to set start date" });
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

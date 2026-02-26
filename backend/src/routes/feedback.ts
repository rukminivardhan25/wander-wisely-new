import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { optionalAuthMiddleware } from "../middleware/auth.js";

const router = Router();

const createFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  type: z.enum(["review", "complaint"]),
  message: z.string().max(2000).optional(),
});

/** POST /api/feedback — Submit app feedback (review or complaint). Auth optional; if logged in, user_id is stored. */
router.post("/", optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const { rating, type, message } = parsed.data;
    const userId = req.userId ?? null;

    await query(
      `insert into app_feedback (user_id, rating, type, message) values ($1, $2, $3, $4)`,
      [userId, rating, type, (message ?? "").trim() || null]
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error("[feedback] POST", e);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

export default router;

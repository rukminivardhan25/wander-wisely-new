import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";

const router = Router();

// No auth: single admin only, same as vendor-admin; admin-main is the only consumer.

type Period = "month" | "year" | "all";

function periodCondition(period: Period): { sql: string; params: unknown[] } {
  const now = new Date();
  if (period === "month") {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 1);
    return { sql: " and f.created_at >= $1", params: [from.toISOString()] };
  }
  if (period === "year") {
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    return { sql: " and f.created_at >= $1", params: [from.toISOString()] };
  }
  return { sql: "", params: [] };
}

/** GET /api/admin/feedback — List all feedback with user info. Query: period=month|year|all (default all) */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as Period) || "all";
    const { sql: periodSql, params: periodParams } = periodCondition(period);

    const result = await query<{
      id: string;
      user_id: string | null;
      rating: number;
      type: string;
      message: string | null;
      created_at: string;
      email: string | null;
      full_name: string | null;
      admin_reply: string | null;
      admin_replied_at: string | null;
    }>(
      `select f.id, f.user_id, f.rating, f.type, f.message, f.created_at::text,
              u.email, u.full_name, f.admin_reply, f.admin_replied_at::text
       from app_feedback f
       left join users u on u.id = f.user_id
       where 1=1 ${periodSql}
       order by f.created_at desc`,
      periodParams
    );

    res.json({
      feedback: result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        rating: r.rating,
        type: r.type,
        message: r.message,
        createdAt: r.created_at,
        email: r.email,
        fullName: r.full_name,
        adminReply: r.admin_reply,
        adminRepliedAt: r.admin_replied_at,
      })),
    });
  } catch (e) {
    console.error("[admin/feedback] GET", e);
    res.status(500).json({ error: "Failed to list feedback" });
  }
});

/** GET /api/admin/feedback/users — List users who submitted feedback, with counts. */
router.get("/users", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{
      user_id: string | null;
      email: string | null;
      full_name: string | null;
      count: string;
    }>(
      `select f.user_id, u.email, u.full_name, count(*)::text as count
       from app_feedback f
       left join users u on u.id = f.user_id
       group by f.user_id, u.email, u.full_name
       order by count(*) desc`
    );

    res.json({
      users: result.rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        fullName: r.full_name,
        feedbackCount: parseInt(r.count, 10),
      })),
    });
  } catch (e) {
    console.error("[admin/feedback] GET /users", e);
    res.status(500).json({ error: "Failed to list users" });
  }
});

/** GET /api/admin/feedback/users/:userId — Feedback for one user. Query: period=month|year|all (default all). Use "anonymous" for null user_id. */
router.get("/users/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const period = (req.query.period as Period) || "all";
    const { sql: periodSql, params: periodParams } = periodCondition(period);

    const isAnonymous = userId === "anonymous" || userId === "null";
    const paramIndex = periodParams.length + 1;
    const userCondition = isAnonymous
      ? " and f.user_id is null"
      : ` and f.user_id = $${paramIndex}`;
    const params = [...periodParams];
    if (!isAnonymous) params.push(userId);

    const result = await query<{
      id: string;
      rating: number;
      type: string;
      message: string | null;
      created_at: string;
      admin_reply: string | null;
      admin_replied_at: string | null;
    }>(
      `select f.id, f.rating, f.type, f.message, f.created_at::text, f.admin_reply, f.admin_replied_at::text
       from app_feedback f
       where 1=1 ${periodSql} ${userCondition}
       order by f.created_at desc`,
      params
    );

    res.json({
      feedback: result.rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        type: r.type,
        message: r.message,
        createdAt: r.created_at,
        adminReply: r.admin_reply,
        adminRepliedAt: r.admin_replied_at,
      })),
    });
  } catch (e) {
    console.error("[admin/feedback] GET /users/:userId", e);
    res.status(500).json({ error: "Failed to get user feedback" });
  }
});

const replySchema = z.object({ reply: z.string().min(1).max(2000) });

/** PATCH /api/admin/feedback/:id/reply — Set admin reply for a feedback item. Admin only. */
router.patch("/:id/reply", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid reply", details: parsed.error.flatten() });
      return;
    }
    await query(
      `update app_feedback set admin_reply = $1, admin_replied_at = now() where id = $2`,
      [parsed.data.reply.trim(), id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("[admin/feedback] PATCH /:id/reply", e);
    res.status(500).json({ error: "Failed to save reply" });
  }
});

export default router;

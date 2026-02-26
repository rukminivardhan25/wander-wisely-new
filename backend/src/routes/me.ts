import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

/** GET /api/me/feedback — Feedback (reviews/complaints) submitted by the current user, including admin replies. */
router.get("/feedback", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { userId?: string }).userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const result = await query<{
      id: string;
      rating: number;
      type: string;
      message: string | null;
      created_at: string;
      admin_reply: string | null;
      admin_replied_at: string | null;
    }>(
      `select id, rating, type, message, created_at::text, admin_reply, admin_replied_at::text
       from app_feedback
       where user_id = $1
       order by created_at desc`,
      [userId]
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
  } catch (err) {
    console.error("List my feedback error:", err);
    res.status(500).json({ error: "Failed to load your feedback" });
  }
});

/** GET /api/me/comments — Comments the current user has made, with post info. */
router.get("/comments", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { userId?: string }).userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const result = await query(
      `select c.id, c.post_id, c.body, c.created_at,
              p.location as post_location, p.image_url as post_image_url, p.caption as post_caption
       from comments c
       join posts p on p.id = c.post_id
       where c.user_id = $1
       order by c.created_at desc
       limit 100`,
      [userId]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error("List my comments error:", err);
    res.status(500).json({ error: "Failed to load your comments" });
  }
});

export default router;

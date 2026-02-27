/**
 * POST /api/support — Submit a support ticket (vendor auth required).
 */

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

/** GET /api/support — List current vendor's tickets (with admin replies). */
router.get("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  if (!vendorId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const result = await query<{
      id: string;
      subject: string;
      message: string;
      created_at: string;
      admin_reply: string | null;
      admin_replied_at: string | null;
    }>(
      `select id, subject, message, created_at::text, admin_reply, admin_replied_at::text
       from support_tickets
       where vendor_id = $1
       order by created_at desc`,
      [vendorId]
    );
    res.json({
      tickets: result.rows.map((r) => ({
        id: r.id,
        subject: r.subject,
        message: r.message,
        createdAt: r.created_at,
        adminReply: r.admin_reply,
        adminRepliedAt: r.admin_replied_at,
      })),
    });
  } catch (e) {
    console.error("[support] GET", e);
    res.status(500).json({ error: "Failed to load your tickets" });
  }
});

/** POST /api/support — Submit ticket (subject, message). Vendor auth required. */
router.post("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  if (!vendorId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!subject || !message) {
    res.status(400).json({ error: "Subject and message are required" });
    return;
  }
  if (subject.length > 500) {
    res.status(400).json({ error: "Subject too long" });
    return;
  }
  if (message.length > 5000) {
    res.status(400).json({ error: "Message too long" });
    return;
  }
  try {
    await query(
      `insert into support_tickets (vendor_id, subject, message) values ($1, $2, $3)`,
      [vendorId, subject, message]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error("[support] POST", e);
    res.status(500).json({ error: "Failed to submit ticket" });
  }
});

export default router;
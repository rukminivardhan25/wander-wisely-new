/**
 * GET /api/admin/support-tickets — List all vendor support tickets.
 * PATCH /api/admin/support-tickets/:id/reply — Set admin reply.
 */

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

function requireAdminKey(req: Request, res: Response, next: () => void): void {
  const key = req.headers["x-admin-key"] as string | undefined;
  if (ADMIN_API_KEY && key !== ADMIN_API_KEY) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}

/** GET / — List all tickets with vendor info. */
router.get("/", requireAdminKey, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{
      id: string;
      vendor_id: string;
      subject: string;
      message: string;
      created_at: string;
      admin_reply: string | null;
      admin_replied_at: string | null;
      vendor_name: string | null;
      vendor_email: string | null;
    }>(
      `select t.id, t.vendor_id, t.subject, t.message, t.created_at::text,
              t.admin_reply, t.admin_replied_at::text,
              v.name as vendor_name, v.email as vendor_email
       from support_tickets t
       left join vendors v on v.id = t.vendor_id
       order by t.created_at desc`
    );
    res.json({
      tickets: result.rows.map((r) => ({
        id: r.id,
        vendorId: r.vendor_id,
        vendorName: r.vendor_name ?? "—",
        vendorEmail: r.vendor_email ?? "—",
        subject: r.subject,
        message: r.message,
        createdAt: r.created_at,
        adminReply: r.admin_reply,
        adminRepliedAt: r.admin_replied_at,
      })),
    });
  } catch (e) {
    console.error("[admin/support-tickets] GET", e);
    res.status(500).json({ error: "Failed to list tickets" });
  }
});

/** PATCH /:id/reply — Set admin reply. */
router.patch("/:id/reply", requireAdminKey, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const reply = typeof req.body?.reply === "string" ? req.body.reply.trim() : "";
  if (!reply) {
    res.status(400).json({ error: "Reply is required" });
    return;
  }
  try {
    const r = await query(
      `update support_tickets set admin_reply = $1, admin_replied_at = now() where id = $2 returning id`,
      [reply, id]
    );
    if (r.rowCount === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("[admin/support-tickets] PATCH reply", e);
    res.status(500).json({ error: "Failed to save reply" });
  }
});

export default router;

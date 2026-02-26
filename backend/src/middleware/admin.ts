import type { Request, Response, NextFunction } from "express";
import { query } from "../config/db.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();

/** Requires auth. Then checks that the current user's email matches ADMIN_EMAIL. Use after authMiddleware. */
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!ADMIN_EMAIL) {
    res.status(503).json({ error: "Admin access not configured" });
    return;
  }
  try {
    const r = await query<{ email: string }>(
      "select email from users where id = $1",
      [req.userId]
    );
    if (r.rows.length === 0 || r.rows[0].email.toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  } catch (e) {
    res.status(500).json({ error: "Failed to verify admin" });
  }
}

import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./auth.js";
import { adminMiddleware } from "./admin.js";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY?.trim();

/**
 * Admin access via either:
 * 1. X-Admin-Key header matching ADMIN_API_KEY (no login), or
 * 2. Bearer JWT + user email matches ADMIN_EMAIL.
 * Use for admin-main app when no auth is required (single admin, key-based).
 */
export function optionalAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (ADMIN_API_KEY && req.get("X-Admin-Key") === ADMIN_API_KEY) {
    next();
    return;
  }
  authMiddleware(req, res, () => {
    adminMiddleware(req, res, next);
  });
}

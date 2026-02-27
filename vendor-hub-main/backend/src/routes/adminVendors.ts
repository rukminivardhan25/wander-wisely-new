import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

function requireAdminKey(req: Request, res: Response, next: () => void): void {
  const key = req.headers["x-admin-key"] as string | undefined;
  // When ADMIN_API_KEY is set, require the header to match. When unset, allow (e.g. local dev).
  if (ADMIN_API_KEY && key !== ADMIN_API_KEY) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}

/** GET /api/admin/vendors — list all vendors with full profile (admin key required) */
router.get("/", requireAdminKey, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      aadhar_number: string | null;
      aadhar_name: string | null;
      bank_account_holder_name: string | null;
      bank_account_number: string | null;
      bank_ifsc: string | null;
      bank_name: string | null;
      bank_branch: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, name, email, phone,
        aadhar_number, aadhar_name,
        bank_account_holder_name, bank_account_number, bank_ifsc, bank_name, bank_branch,
        created_at, updated_at
       FROM vendors
       ORDER BY created_at DESC`
    );
    const vendors = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone ?? null,
      aadhar_number: row.aadhar_number ?? null,
      aadhar_name: row.aadhar_name ?? null,
      bank_account_holder_name: row.bank_account_holder_name ?? null,
      bank_account_number: row.bank_account_number ?? null,
      bank_ifsc: row.bank_ifsc ?? null,
      bank_name: row.bank_name ?? null,
      bank_branch: row.bank_branch ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
    res.json({ vendors });
  } catch (err) {
    console.error("Admin vendors list error:", err);
    res.status(500).json({ error: "Failed to list vendors" });
  }
});

export default router;

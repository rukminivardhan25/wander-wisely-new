import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  aadhar_number: z.string().max(12).nullable().optional(),
  aadhar_name: z.string().nullable().optional(),
  bank_account_holder_name: z.string().nullable().optional(),
  bank_account_number: z.string().nullable().optional(),
  bank_ifsc: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  bank_branch: z.string().nullable().optional(),
});

/** GET /api/profile — current vendor profile (auth required) */
router.get("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId;
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
       FROM vendors WHERE id = $1`,
      [vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      aadhar_number: row.aadhar_number ?? null,
      aadhar_name: row.aadhar_name ?? null,
      bank_account_holder_name: row.bank_account_holder_name ?? null,
      bank_account_number: row.bank_account_number ?? null,
      bank_ifsc: row.bank_ifsc ?? null,
      bank_name: row.bank_name ?? null,
      bank_branch: row.bank_branch ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (err) {
    console.error("Profile GET error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

/** PATCH /api/profile — update vendor profile (auth required) */
router.patch("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const vendorId = req.vendorId;
    const data = parsed.data;

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (data.aadhar_number !== undefined) {
      updates.push(`aadhar_number = $${idx++}`);
      values.push(data.aadhar_number);
    }
    if (data.aadhar_name !== undefined) {
      updates.push(`aadhar_name = $${idx++}`);
      values.push(data.aadhar_name);
    }
    if (data.bank_account_holder_name !== undefined) {
      updates.push(`bank_account_holder_name = $${idx++}`);
      values.push(data.bank_account_holder_name);
    }
    if (data.bank_account_number !== undefined) {
      updates.push(`bank_account_number = $${idx++}`);
      values.push(data.bank_account_number);
    }
    if (data.bank_ifsc !== undefined) {
      updates.push(`bank_ifsc = $${idx++}`);
      values.push(data.bank_ifsc);
    }
    if (data.bank_name !== undefined) {
      updates.push(`bank_name = $${idx++}`);
      values.push(data.bank_name);
    }
    if (data.bank_branch !== undefined) {
      updates.push(`bank_branch = $${idx++}`);
      values.push(data.bank_branch);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    if (data.email !== undefined) {
      const existing = await query<{ id: string }>("SELECT id FROM vendors WHERE email = $1 AND id != $2", [data.email, vendorId]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: "Email already in use by another account" });
        return;
      }
    }
    updates.push(`updated_at = now()`);
    values.push(vendorId);
    await query(
      `UPDATE vendors SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );

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
    }>(
      `SELECT id, name, email, phone,
        aadhar_number, aadhar_name,
        bank_account_holder_name, bank_account_number, bank_ifsc, bank_name, bank_branch
       FROM vendors WHERE id = $1`,
      [vendorId]
    );
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      aadhar_number: row.aadhar_number ?? null,
      aadhar_name: row.aadhar_name ?? null,
      bank_account_holder_name: row.bank_account_holder_name ?? null,
      bank_account_number: row.bank_account_number ?? null,
      bank_ifsc: row.bank_ifsc ?? null,
      bank_name: row.bank_name ?? null,
      bank_branch: row.bank_branch ?? null,
    });
  } catch (err) {
    console.error("Profile PATCH error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/** DELETE /api/profile — delete vendor account and all related data (auth required). Removes vendor's listings first (cascade to buses, cars, etc.), then vendor_listings, vendor_customers, then vendor. */
router.delete("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId;
    const listingIds = await query<{ listing_id: string }>(
      "SELECT listing_id FROM vendor_listings WHERE vendor_id = $1",
      [vendorId]
    );
    const ids = listingIds.rows.map((r) => r.listing_id);
    if (ids.length > 0) {
      await query("DELETE FROM listings WHERE id = ANY($1::uuid[])", [ids]);
    }
    await query("DELETE FROM vendor_listings WHERE vendor_id = $1", [vendorId]);
    await query("DELETE FROM vendors WHERE id = $1", [vendorId]);
    res.json({ message: "Account and all related data have been permanently deleted" });
  } catch (err) {
    console.error("Profile DELETE error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;

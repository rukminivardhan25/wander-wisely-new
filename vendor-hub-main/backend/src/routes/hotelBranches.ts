import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function vendorOwnsListing(listingId: string, vendorId: string): Promise<boolean> {
  try {
    const r = await query<{ id: string }>("SELECT id FROM listings WHERE id = $1 AND vendor_id = $2", [listingId, vendorId]);
    if (r.rows.length > 0) return true;
  } catch {
    //
  }
  try {
    const vl = await query<{ listing_id: string }>("SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2", [listingId, vendorId]);
    return vl.rows.length > 0;
  } catch {
    return false;
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  city: z.string().optional().nullable(),
  area_locality: z.string().optional().nullable(),
  full_address: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  extra_details: z.record(z.unknown()).optional(),
});

/** GET /api/listings/:listingId/hotel-branches — List hotel branches for this (hotel company) listing. */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = (req.params.listingId || (req as unknown as { listingId?: string }).listingId) as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const list = await query<{
      id: string;
      name: string;
      city: string | null;
      full_address: string | null;
      verification_token: string | null;
      verification_status: string | null;
      created_at: string;
    }>(
      `SELECT id, name, city, full_address, verification_token, verification_status, created_at
       FROM hotel_branches WHERE listing_id = $1 ORDER BY created_at DESC`,
      [listingId]
    );
    res.json({ branches: list.rows });
  } catch (err) {
    console.error("List hotel branches error:", err);
    const e = err as { code?: string };
    if (e.code === "42P01") {
      res.json({ branches: [] });
      return;
    }
    res.status(500).json({ error: "Failed to list hotel branches" });
  }
});

/** GET /api/listings/:listingId/hotel-branches/:branchId — Get one hotel branch (full details). */
router.get("/:branchId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = (req.params.listingId || (req as unknown as { listingId?: string }).listingId) as string;
    const { branchId } = req.params;
    if (!listingId || !branchId) {
      res.status(400).json({ error: "Missing listingId or branchId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const row = await query<{
      id: string;
      name: string;
      city: string | null;
      area_locality: string | null;
      full_address: string | null;
      pincode: string | null;
      landmark: string | null;
      contact_number: string | null;
      email: string | null;
      description: string | null;
      verification_token: string | null;
      verification_status: string | null;
      created_at: string;
      updated_at: string;
      extra_details: Record<string, unknown> | null;
    }>(
      `SELECT id, name, city, area_locality, full_address, pincode, landmark, contact_number, email, description,
              verification_token, verification_status, created_at, updated_at, COALESCE(extra_details, '{}'::jsonb) AS extra_details
       FROM hotel_branches WHERE id = $1 AND listing_id = $2`,
      [branchId, listingId]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Hotel branch not found" });
      return;
    }
    res.json(row.rows[0]);
  } catch (err) {
    console.error("Get hotel branch error:", err);
    res.status(500).json({ error: "Failed to fetch hotel branch" });
  }
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().optional().nullable(),
  area_locality: z.string().optional().nullable(),
  full_address: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  extra_details: z.record(z.unknown()).optional(),
});

/** PATCH /api/listings/:listingId/hotel-branches/:branchId — Update a hotel branch. */
router.patch("/:branchId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = (req.params.listingId || (req as unknown as { listingId?: string }).listingId) as string;
    const { branchId } = req.params;
    if (!listingId || !branchId) {
      res.status(400).json({ error: "Missing listingId or branchId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (d.name !== undefined) {
      updates.push(`name = $${i++}`);
      values.push(d.name.trim());
    }
    if (d.city !== undefined) {
      updates.push(`city = $${i++}`);
      values.push((d.city || "").trim() || null);
    }
    if (d.area_locality !== undefined) {
      updates.push(`area_locality = $${i++}`);
      values.push((d.area_locality || "").trim() || null);
    }
    if (d.full_address !== undefined) {
      updates.push(`full_address = $${i++}`);
      values.push((d.full_address || "").trim() || null);
    }
    if (d.pincode !== undefined) {
      updates.push(`pincode = $${i++}`);
      values.push((d.pincode || "").trim() || null);
    }
    if (d.landmark !== undefined) {
      updates.push(`landmark = $${i++}`);
      values.push((d.landmark || "").trim() || null);
    }
    if (d.contact_number !== undefined) {
      updates.push(`contact_number = $${i++}`);
      values.push((d.contact_number || "").trim() || null);
    }
    if (d.email !== undefined) {
      updates.push(`email = $${i++}`);
      values.push((d.email || "").trim() || null);
    }
    if (d.description !== undefined) {
      updates.push(`description = $${i++}`);
      values.push((d.description || "").trim() || null);
    }
    if (d.extra_details !== undefined) {
      const current = await query<{ extra_details: Record<string, unknown> | null }>(
        "SELECT extra_details FROM hotel_branches WHERE id = $1 AND listing_id = $2",
        [branchId, listingId]
      );
      const merged = { ...(current.rows[0]?.extra_details || {}), ...(d.extra_details as Record<string, unknown>) };
      updates.push(`extra_details = $${i++}`);
      values.push(JSON.stringify(merged));
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    values.push(branchId, listingId);
    updates.push(`updated_at = now()`);
    updates.push(`verification_status = 'no_request'`);
    await query(
      `UPDATE hotel_branches SET ${updates.join(", ")} WHERE id = $${i++} AND listing_id = $${i}`,
      values
    );
    const row = await query<{ id: string; name: string }>(
      "SELECT id, name FROM hotel_branches WHERE id = $1 AND listing_id = $2",
      [branchId, listingId]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Hotel branch not found" });
      return;
    }
    res.json({ id: row.rows[0].id, name: row.rows[0].name });
  } catch (err) {
    console.error("Update hotel branch error:", err);
    res.status(500).json({ error: "Failed to update hotel branch" });
  }
});

/** POST /api/listings/:listingId/hotel-branches — Create a hotel branch. */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = (req.params.listingId || (req as unknown as { listingId?: string }).listingId) as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const typeRow = await query<{ type: string }>("SELECT type FROM listings WHERE id = $1", [listingId]);
    if (typeRow.rows.length === 0 || (typeRow.rows[0].type || "").toLowerCase() !== "hotel") {
      res.status(400).json({ error: "Listing is not a hotel company" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const extraDetails = d.extra_details && typeof d.extra_details === "object" ? JSON.stringify(d.extra_details) : "{}";
    const ins = await query<{ id: string; name: string }>(
      `INSERT INTO hotel_branches (listing_id, name, city, area_locality, full_address, pincode, landmark, contact_number, email, description, extra_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
       RETURNING id, name`,
      [
        listingId,
        d.name.trim(),
        (d.city || "").trim() || null,
        (d.area_locality || "").trim() || null,
        (d.full_address || "").trim() || null,
        (d.pincode || "").trim() || null,
        (d.landmark || "").trim() || null,
        (d.contact_number || "").trim() || null,
        (d.email || "").trim() || null,
        (d.description || "").trim() || null,
        extraDetails,
      ]
    );
    const row = ins.rows[0];
    res.status(201).json({ id: row.id, name: row.name });
  } catch (err) {
    console.error("Create hotel branch error:", err);
    const e = err as { code?: string };
    if (e.code === "42P01") {
      res.status(503).json({ error: "Hotel branches not set up. Run schema 044_hotel_branches.sql" });
      return;
    }
    res.status(500).json({ error: "Failed to create hotel branch" });
  }
});

/** POST /api/listings/:listingId/hotel-branches/:branchId/generate-verification-token */
router.post("/:branchId/generate-verification-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = (req.params.listingId || (req as unknown as { listingId?: string }).listingId) as string;
    const { branchId } = req.params;
    if (!listingId || !branchId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const row = await query<{ verification_token: string | null; verification_status: string | null }>(
      "SELECT verification_token, verification_status FROM hotel_branches WHERE id = $1 AND listing_id = $2",
      [branchId, listingId]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Hotel branch not found" });
      return;
    }
    let token = row.rows[0].verification_token;
    const currentStatus = row.rows[0].verification_status ?? "no_request";
    if (token) {
      return void res.json({ verification_token: token, verification_status: currentStatus });
    }
    const slug = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    token = `HBR-${slug()}-${slug()}`;
    try {
      await query("UPDATE hotel_branches SET verification_token = $1, updated_at = now() WHERE id = $2 AND listing_id = $3", [token, branchId, listingId]);
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        const retry = await query<{ verification_token: string | null }>("SELECT verification_token FROM hotel_branches WHERE id = $1 AND listing_id = $2", [branchId, listingId]);
        token = retry.rows[0]?.verification_token ?? token;
      } else throw err;
    }
    res.json({ verification_token: token, verification_status: "no_request" });
  } catch (err) {
    console.error("Hotel branch generate token error:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

export default router;

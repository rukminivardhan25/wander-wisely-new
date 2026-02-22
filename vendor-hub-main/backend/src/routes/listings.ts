import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const listingTypes = ["restaurant", "event", "experience", "hotel", "transport", "other"] as const;
const statuses = ["draft", "pending_approval", "live"] as const;

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(listingTypes),
  status: z.enum(statuses).optional(),
  description: z.string().optional(),
  cover_image_url: z.string().url().optional().nullable(),
});

const updateSchema = createSchema.partial();

// List my listings (via vendor_listings: businesses linked to this vendor)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const result = await query<{
      id: string;
      name: string;
      type: string;
      status: string;
      description: string | null;
      cover_image_url: string | null;
      created_at: string;
    }>(
      `select l.id, l.name, l.type, l.status, l.description, l.cover_image_url, l.created_at
       from listings l
       join vendor_listings vl on l.id = vl.listing_id
       where vl.vendor_id = $1
       order by l.created_at desc`,
      [vendorId]
    );
    res.json({ listings: result.rows });
  } catch (err) {
    console.error("List listings error:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// Get one listing
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { id } = req.params;
    const result = await query<{
      id: string;
      name: string;
      type: string;
      status: string;
      description: string | null;
      cover_image_url: string | null;
      created_at: string;
    }>(
      `select l.id, l.name, l.type, l.status, l.description, l.cover_image_url, l.created_at
       from listings l
       join vendor_listings vl on l.id = vl.listing_id
       where l.id = $1 and vl.vendor_id = $2`,
      [id, vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get listing error:", err);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// Create listing (business) and link to vendor
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const { name, type, status, description, cover_image_url } = parsed.data;
    const insertResult = await query<{ id: string; name: string; type: string; status: string }>(
      "insert into listings (name, type, status, description, cover_image_url) values ($1, $2, $3, $4, $5) returning id, name, type, status",
      [name, type, status ?? "draft", description ?? null, cover_image_url ?? null]
    );
    const listingId = insertResult.rows[0].id;
    await query(
      "insert into vendor_listings (vendor_id, listing_id) values ($1, $2)",
      [vendorId, listingId]
    );
    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error("Create listing error:", err);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// Update listing
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { id } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const updates = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (updates.name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push(`type = $${i++}`);
      values.push(updates.type);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${i++}`);
      values.push(updates.status);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${i++}`);
      values.push(updates.description);
    }
    if (updates.cover_image_url !== undefined) {
      fields.push(`cover_image_url = $${i++}`);
      values.push(updates.cover_image_url);
    }
    if (fields.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    fields.push(`updated_at = now()`);
    values.push(id);
    const result = await query<{ id: string; name: string; type: string; status: string }>(
      `update listings set ${fields.join(", ")}
       where id = $${i}
       and id in (select listing_id from vendor_listings where vendor_id = $${i + 1})
       returning id, name, type, status`,
      [...values, vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update listing error:", err);
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// Delete listing
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { id } = req.params;
    const result = await query(
      "delete from listings where id = $1 and id in (select listing_id from vendor_listings where vendor_id = $2) returning id",
      [id, vendorId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete listing error:", err);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const statuses = ["draft", "pending_approval", "live"] as const;
const businessTypes = ["restaurant", "hotel", "shop", "transport", "experience", "rental", "event", "guide", "emergency"] as const;

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(businessTypes),
  status: z.enum(statuses).optional(),
  tagline: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  registered_address: z.string().optional().nullable(),
  service_area: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().nullable(),
});

const updateSchema = createSchema.partial();

/** Check if vendor owns the listing (supports vendor_id on listings or vendor_listings table). */
async function vendorOwnsListing(listingId: string, vendorId: string): Promise<boolean> {
  try {
    const r = await query<{ id: string }>("SELECT id FROM listings WHERE id = $1 AND vendor_id = $2", [listingId, vendorId]);
    if (r.rows.length > 0) return true;
  } catch {
    // vendor_id column may not exist
  }
  try {
    const vl = await query<{ listing_id: string }>("SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2", [listingId, vendorId]);
    return vl.rows.length > 0;
  } catch {
    return false;
  }
}

// List my listings (vendor can have multiple listings). Uses vendor_listings if present, else listings.vendor_id.
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    type Row = { id: string; vendor_id: string; type: string; name: string; tagline: string | null; description: string | null; registered_address: string | null; service_area: string | null; address: string | null; city: string | null; cover_image_url: string | null; status: string; created_at: string; updated_at: string };
    let result: { rows: Row[] };
    try {
      result = await query<Row>(`select id, vendor_id, type, name, tagline, description, registered_address, service_area, address, city, cover_image_url, status, created_at, updated_at from listings where vendor_id = $1 order by created_at desc`, [vendorId]);
    } catch {
      try {
        result = await query<Row & { vendor_id?: string }>(
          `select l.id, $1::uuid as vendor_id, l.type, l.name, l.tagline, l.description, l.registered_address, l.service_area, l.address, l.city, l.cover_image_url, l.status, l.created_at, l.updated_at from listings l inner join vendor_listings vl on vl.listing_id = l.id and vl.vendor_id = $1 order by l.created_at desc`,
          [vendorId]
        );
      } catch {
        result = { rows: [] };
      }
    }
    res.json({ listings: result.rows });
  } catch (err) {
    console.error("List listings error:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// Get one listing (supports vendor_listings and listings.vendor_id)
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { id } = req.params;
    type Row = { id: string; vendor_id: string; type: string; name: string; tagline: string | null; description: string | null; registered_address: string | null; service_area: string | null; address: string | null; city: string | null; cover_image_url: string | null; status: string; created_at: string; updated_at: string };
    let result: { rows: Row[] };
    try {
      result = await query<Row>(`select id, vendor_id, type, name, tagline, description, registered_address, service_area, address, city, cover_image_url, status, created_at, updated_at from listings where id = $1 and vendor_id = $2`, [id, vendorId]);
    } catch {
      try {
        const r = await query<Row & { vendor_id?: string }>(`select l.id, $2::uuid as vendor_id, l.type, l.name, l.tagline, l.description, l.registered_address, l.service_area, l.address, l.city, l.cover_image_url, l.status, l.created_at, l.updated_at from listings l inner join vendor_listings vl on vl.listing_id = l.id and vl.vendor_id = $2 where l.id = $1`, [id, vendorId]);
        result = { rows: r.rows as Row[] };
      } catch {
        result = { rows: [] };
      }
    }
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

// Create listing (all five steps: business type, basic info, location, photos, publish)
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    console.log("[Create listing] Vendor ID from JWT:", vendorId);
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const { name, type, status, tagline, description, registered_address, service_area, address, city, cover_image_url } = parsed.data;
    const insertResult = await query<{ id: string; vendor_id: string; name: string; type: string; status: string }>(
      `insert into listings (vendor_id, name, type, status, tagline, description, registered_address, service_area, address, city, cover_image_url)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning id, vendor_id, name, type, status`,
      [vendorId, name, type, status ?? "draft", tagline ?? null, description ?? null, registered_address ?? null, service_area ?? null, address ?? null, city ?? null, cover_image_url ?? null]
    );
    const row = insertResult.rows[0];
    console.log("[Create listing] Created:", { id: row.id, vendor_id: row.vendor_id, type: row.type });
    res.status(201).json({ id: row.id, name: row.name, type: row.type, status: row.status });
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
      values.push(updates.type); // only 'transport' allowed
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
    if (updates.tagline !== undefined) {
      fields.push(`tagline = $${i++}`);
      values.push(updates.tagline);
    }
    if (updates.registered_address !== undefined) {
      fields.push(`registered_address = $${i++}`);
      values.push(updates.registered_address);
    }
    if (updates.service_area !== undefined) {
      fields.push(`service_area = $${i++}`);
      values.push(updates.service_area);
    }
    if (updates.address !== undefined) {
      fields.push(`address = $${i++}`);
      values.push(updates.address);
    }
    if (updates.city !== undefined) {
      fields.push(`city = $${i++}`);
      values.push(updates.city);
    }
    if (fields.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    fields.push(`updated_at = now()`);
    values.push(id, vendorId);
    const result = await query<{ id: string; name: string; type: string; status: string }>(
      `update listings set ${fields.join(", ")} where id = $${i} and vendor_id = $${i + 1} returning id, name, type, status`,
      values
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

// Delete listing and all related data: explicit deletes for every related table.
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.id;
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    // Delete in dependency order; wrap each in try/catch so missing tables don't fail the whole delete
    const runIfExists = async (sql: string, params: string[]) => {
      try {
        await query(sql, params);
      } catch {
        // Table may not exist in this DB
      }
    };
    await runIfExists("DELETE FROM route_schedules WHERE route_id IN (SELECT id FROM routes WHERE listing_id = $1)", [listingId]);
    await runIfExists("DELETE FROM vendor_bookings WHERE listing_id = $1", [listingId]);
    await runIfExists("DELETE FROM bus_schedules WHERE bus_id IN (SELECT id FROM buses WHERE listing_id = $1)", [listingId]);
    await runIfExists("DELETE FROM routes WHERE listing_id = $1", [listingId]);
    await runIfExists("DELETE FROM buses WHERE listing_id = $1", [listingId]);
    await runIfExists("DELETE FROM drivers WHERE listing_id = $1", [listingId]);
    await runIfExists("DELETE FROM listing_availability WHERE listing_id = $1", [listingId]);
    await runIfExists("DELETE FROM vendor_listings WHERE listing_id = $1", [listingId]);
    const result = await query("DELETE FROM listings WHERE id = $1 RETURNING id", [listingId]);
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

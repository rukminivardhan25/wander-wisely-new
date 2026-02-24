import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  license_no: z.string().optional().nullable(),
  bus_id: z.string().uuid().nullable().optional(),
});

const updateSchema = createSchema.partial();

async function canAccessListing(listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "select id from listings where id = $1 and vendor_id = $2",
    [listingId, vendorId]
  );
  return r.rows.length > 0;
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const ok = await canAccessListing(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query<{
      id: string;
      listing_id: string;
      bus_id: string | null;
      name: string | null;
      phone: string | null;
      license_no: string | null;
      created_at: string;
    }>(
      "select id, listing_id, bus_id, name, phone, license_no, created_at from drivers where listing_id = $1 order by created_at desc",
      [listingId]
    );
    res.json({ drivers: result.rows });
  } catch (err) {
    console.error("List drivers error:", err);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const ok = await canAccessListing(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const { name, phone, license_no, bus_id } = parsed.data;
    const result = await query<{ id: string; name: string | null; phone: string | null; license_no: string | null; bus_id: string | null }>(
      "insert into drivers (listing_id, name, phone, license_no, bus_id) values ($1, $2, $3, $4, $5) returning id, name, phone, license_no, bus_id",
      [listingId, name ?? null, phone ?? null, license_no ?? null, bus_id ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create driver error:", err);
    res.status(500).json({ error: "Failed to create driver" });
  }
});

router.patch("/:driverId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { driverId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const ok = await canAccessListing(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
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
    if (updates.phone !== undefined) {
      fields.push(`phone = $${i++}`);
      values.push(updates.phone);
    }
    if (updates.license_no !== undefined) {
      fields.push(`license_no = $${i++}`);
      values.push(updates.license_no);
    }
    if (updates.bus_id !== undefined) {
      fields.push(`bus_id = $${i++}`);
      values.push(updates.bus_id);
    }
    if (fields.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    fields.push(`updated_at = now()`);
    values.push(driverId, listingId);
    const result = await query<{ id: string; name: string | null; phone: string | null; license_no: string | null; bus_id: string | null }>(
      `update drivers set ${fields.join(", ")} where id = $${i} and listing_id = $${i + 1} returning id, name, phone, license_no, bus_id`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    const busIdAssigned = result.rows[0].bus_id;
    if (busIdAssigned) {
      await query(
        "UPDATE buses SET verification_status = 'no_request', verified_at = NULL, status = 'inactive' WHERE id = $1",
        [busIdAssigned]
      ).catch(() => {});
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update driver error:", err);
    res.status(500).json({ error: "Failed to update driver" });
  }
});

router.delete("/:driverId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { driverId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const ok = await canAccessListing(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query(
      "delete from drivers where id = $1 and listing_id = $2 and listing_id in (select id from listings where vendor_id = $3) returning id",
      [driverId, listingId, vendorId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete driver error:", err);
    res.status(500).json({ error: "Failed to delete driver" });
  }
});

export default router;

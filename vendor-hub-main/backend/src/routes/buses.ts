import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const busTypes = ["seater", "sleeper", "semi_sleeper"] as const;
const layoutTypes = ["2+2", "2+1", "sleeper", "custom"] as const;

const busSchema = z.object({
  name: z.string().min(1),
  bus_type: z.enum(busTypes),
  layout_type: z.enum(layoutTypes),
  rows: z.number().int().min(1).max(50),
  left_cols: z.number().int().min(0).max(5),
  right_cols: z.number().int().min(0).max(5),
  has_aisle: z.boolean().optional(),
  base_price_per_seat_cents: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const createSchema = busSchema.refine((d) => d.rows * (d.left_cols + d.right_cols) >= 1 && d.rows * (d.left_cols + d.right_cols) <= 100, {
  message: "total_seats must be 1–100",
  path: ["rows"],
});

const updateSchema = busSchema.partial();

async function ensureListingIsTransport(listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ type: string }>(
    "select l.type from listings l join vendor_listings vl on l.id = vl.listing_id where l.id = $1 and vl.vendor_id = $2",
    [listingId, vendorId]
  );
  if (r.rows.length === 0) return false;
  const type = (r.rows[0].type || "").trim().toLowerCase();
  if (type !== "transport") return false;
  return true;
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { listingId } = req.params;
    const ok = await ensureListingIsTransport(listingId!, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    const result = await query<{
      id: string; name: string; bus_type: string; layout_type: string; rows: number;
      left_cols: number; right_cols: number; has_aisle: boolean; total_seats: number;
      base_price_per_seat_cents: number; status: string; created_at: string;
    }>(
      "select b.id, b.name, b.bus_type, b.layout_type, b.rows, b.left_cols, b.right_cols, b.has_aisle, b.total_seats, b.base_price_per_seat_cents, b.status, b.created_at from buses b join listings l on l.id = b.listing_id join vendor_listings vl on l.id = vl.listing_id where b.listing_id = $1 and vl.vendor_id = $2 order by b.created_at desc",
      [listingId, vendorId]
    );
    res.json({ buses: result.rows });
  } catch (err) {
    console.error("List buses error:", err);
    res.status(500).json({ error: "Failed to fetch buses" });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { listingId } = req.params;
    const ok = await ensureListingIsTransport(listingId!, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const has_aisle = d.has_aisle ?? true;
    const total_seats = d.rows * (d.left_cols + d.right_cols);
    const result = await query<{ id: string; name: string; total_seats: number; status: string }>(
      `insert into buses (listing_id, name, bus_type, layout_type, rows, left_cols, right_cols, has_aisle, total_seats, base_price_per_seat_cents, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning id, name, total_seats, status`,
      [listingId, d.name, d.bus_type, d.layout_type, d.rows, d.left_cols, d.right_cols, has_aisle, total_seats, d.base_price_per_seat_cents ?? 0, d.status ?? "active"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create bus error:", err);
    res.status(500).json({ error: "Failed to create bus" });
  }
});

router.get("/:busId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { listingId, busId } = req.params;
    const result = await query<{
      id: string; name: string; bus_type: string; layout_type: string; rows: number;
      left_cols: number; right_cols: number; has_aisle: boolean; total_seats: number;
      base_price_per_seat_cents: number; status: string; created_at: string;
    }>(
      "select b.id, b.name, b.bus_type, b.layout_type, b.rows, b.left_cols, b.right_cols, b.has_aisle, b.total_seats, b.base_price_per_seat_cents, b.status, b.created_at from buses b join listings l on l.id = b.listing_id join vendor_listings vl on l.id = vl.listing_id where b.id = $1 and b.listing_id = $2 and vl.vendor_id = $3",
      [busId, listingId, vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get bus error:", err);
    res.status(500).json({ error: "Failed to fetch bus" });
  }
});

router.patch("/:busId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { listingId, busId } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const ok = await ensureListingIsTransport(listingId!, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const d = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (d.name !== undefined) { updates.push(`name = $${i++}`); values.push(d.name); }
    if (d.bus_type !== undefined) { updates.push(`bus_type = $${i++}`); values.push(d.bus_type); }
    if (d.layout_type !== undefined) { updates.push(`layout_type = $${i++}`); values.push(d.layout_type); }
    if (d.rows !== undefined) { updates.push(`rows = $${i++}`); values.push(d.rows); }
    if (d.left_cols !== undefined) { updates.push(`left_cols = $${i++}`); values.push(d.left_cols); }
    if (d.right_cols !== undefined) { updates.push(`right_cols = $${i++}`); values.push(d.right_cols); }
    if (d.has_aisle !== undefined) { updates.push(`has_aisle = $${i++}`); values.push(d.has_aisle); }
    if (d.base_price_per_seat_cents !== undefined) { updates.push(`base_price_per_seat_cents = $${i++}`); values.push(d.base_price_per_seat_cents); }
    if (d.status !== undefined) { updates.push(`status = $${i++}`); values.push(d.status); }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    if (d.rows !== undefined || d.left_cols !== undefined || d.right_cols !== undefined) {
      const row = await query<{ rows: number; left_cols: number; right_cols: number }>("select rows, left_cols, right_cols from buses where id = $1 and listing_id = $2", [busId, listingId]);
      if (row.rows.length === 0) { res.status(404).json({ error: "Bus not found" }); return; }
      const r = row.rows[0];
      const rows = d.rows ?? r.rows, lc = d.left_cols ?? r.left_cols, rc = d.right_cols ?? r.right_cols;
      updates.push(`total_seats = $${i++}`);
      values.push(rows * (lc + rc));
    }
    updates.push(`updated_at = now()`);
    values.push(busId, listingId);
    const result = await query<{ id: string; name: string; total_seats: number; status: string }>(
      `update buses set ${updates.join(", ")} where id = $${i} and listing_id = $${i + 1} returning id, name, total_seats, status`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update bus error:", err);
    res.status(500).json({ error: "Failed to update bus" });
  }
});

router.delete("/:busId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { listingId, busId } = req.params;
    const result = await query("delete from buses where id = $1 and listing_id = $2 and listing_id in (select listing_id from vendor_listings where vendor_id = $3) returning id", [busId, listingId, vendorId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete bus error:", err);
    res.status(500).json({ error: "Failed to delete bus" });
  }
});

export default router;

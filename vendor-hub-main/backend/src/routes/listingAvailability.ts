import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["available", "cancelled", "holiday"]),
  note: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["available", "cancelled", "holiday"]).optional(),
  note: z.string().optional(),
});

async function ensureListingOwned(listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>("select id from listings where id = $1 and vendor_id = $2", [listingId, vendorId]);
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
    const from = typeof req.query.from === "string" ? req.query.from : null;
    const to = typeof req.query.to === "string" ? req.query.to : null;
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    let q = "select id, date, status, note from listing_availability where listing_id = $1";
    const params: string[] = [listingId];
    if (from) {
      params.push(from);
      q += ` and date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      q += ` and date <= $${params.length}`;
    }
    q += " order by date";
    const result = await query<{ id: string; date: string; status: string; note: string | null }>(q, params);
    res.json({ availability: result.rows });
  } catch (err) {
    console.error("List availability error:", err);
    res.status(500).json({ error: "Failed to fetch availability" });
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
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const result = await query<{ id: string; date: string; status: string }>(
      "insert into listing_availability (listing_id, date, status, note) values ($1, $2, $3, $4) on conflict (listing_id, date) do update set status = $3, note = $4 returning id, date, status",
      [listingId, d.date, d.status, d.note ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create availability error:", err);
    res.status(500).json({ error: "Failed to set availability" });
  }
});

router.patch("/:date", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { date } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date!)) {
      res.status(400).json({ error: "Invalid date format (use YYYY-MM-DD)" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
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
    if (d.status !== undefined) { updates.push(`status = $${i++}`); values.push(d.status); }
    if (d.note !== undefined) { updates.push(`note = $${i++}`); values.push(d.note); }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    values.push(date, listingId, vendorId);
    const result = await query<{ id: string; date: string; status: string }>(
      `update listing_availability set ${updates.join(", ")} where date = $${i} and listing_id = $${i + 1} and listing_id in (select id from listings where vendor_id = $${i + 2}) returning id, date, status`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Availability entry not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update availability error:", err);
    res.status(500).json({ error: "Failed to update availability" });
  }
});

router.delete("/:date", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { date } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query("delete from listing_availability where listing_id = $1 and date = $2 and listing_id in (select id from listings where vendor_id = $3) returning id", [listingId, date, vendorId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Availability entry not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete availability error:", err);
    res.status(500).json({ error: "Failed to delete availability" });
  }
});

export default router;

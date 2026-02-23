import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  from_place: z.string().min(1),
  to_place: z.string().min(1),
  distance_km: z.number().min(0).optional().nullable(),
  duration_minutes: z.number().int().min(0).optional().nullable(),
  price_per_seat_cents: z.number().int().min(0).optional().nullable(),
  bus_id: z.string().uuid().nullable().optional(),
});

const updateSchema = createSchema.partial();

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
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query<{
      id: string; from_place: string; to_place: string; distance_km: number | null;
      duration_minutes: number | null; price_per_seat_cents: number | null; bus_id: string | null; created_at: string;
    }>(
      "select id, from_place, to_place, distance_km, duration_minutes, price_per_seat_cents, bus_id, created_at from routes where listing_id = $1 order by created_at desc",
      [listingId]
    );
    res.json({ routes: result.rows });
  } catch (err) {
    console.error("List routes error:", err);
    res.status(500).json({ error: "Failed to fetch routes" });
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
    const result = await query<{ id: string; from_place: string; to_place: string }>(
      "insert into routes (listing_id, from_place, to_place, distance_km, duration_minutes, price_per_seat_cents, bus_id) values ($1, $2, $3, $4, $5, $6, $7) returning id, from_place, to_place",
      [listingId, d.from_place, d.to_place, d.distance_km ?? null, d.duration_minutes ?? null, d.price_per_seat_cents ?? null, d.bus_id ?? null]
    );
    // If route has a price and is assigned to a bus, sync bus base_price when it's 0
    if (d.bus_id && d.price_per_seat_cents != null && d.price_per_seat_cents > 0) {
      await query(
        "update buses set base_price_per_seat_cents = $1, updated_at = now() where id = $2 and base_price_per_seat_cents = 0",
        [d.price_per_seat_cents, d.bus_id]
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create route error:", err);
    res.status(500).json({ error: "Failed to create route" });
  }
});

router.get("/:routeId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { routeId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query<{
      id: string; from_place: string; to_place: string; distance_km: number | null;
      duration_minutes: number | null; price_per_seat_cents: number | null;
    }>(
      "select r.id, r.from_place, r.to_place, r.distance_km, r.duration_minutes, r.price_per_seat_cents from routes r join listings l on l.id = r.listing_id and l.vendor_id = $3 where r.id = $1 and r.listing_id = $2",
      [routeId, listingId, vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get route error:", err);
    res.status(500).json({ error: "Failed to fetch route" });
  }
});

router.patch("/:routeId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { routeId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
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
    if (d.from_place !== undefined) { updates.push(`from_place = $${i++}`); values.push(d.from_place); }
    if (d.to_place !== undefined) { updates.push(`to_place = $${i++}`); values.push(d.to_place); }
    if (d.distance_km !== undefined) { updates.push(`distance_km = $${i++}`); values.push(d.distance_km); }
    if (d.duration_minutes !== undefined) { updates.push(`duration_minutes = $${i++}`); values.push(d.duration_minutes); }
    if (d.price_per_seat_cents !== undefined) { updates.push(`price_per_seat_cents = $${i++}`); values.push(d.price_per_seat_cents); }
    if (d.bus_id !== undefined) { updates.push(`bus_id = $${i++}`); values.push(d.bus_id); }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    updates.push(`updated_at = now()`);
    values.push(routeId, listingId, vendorId);
    const result = await query<{ id: string; from_place: string; to_place: string; bus_id: string | null }>(
      `update routes set ${updates.join(", ")} where id = $${i} and listing_id = $${i + 1} and listing_id in (select id from listings where vendor_id = $${i + 2}) returning id, from_place, to_place, bus_id`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    // If route got a price and is assigned to a bus, sync bus base_price when it's 0
    const busId = result.rows[0].bus_id;
    if (busId && d.price_per_seat_cents != null && d.price_per_seat_cents > 0) {
      await query(
        "update buses set base_price_per_seat_cents = $1, updated_at = now() where id = $2 and base_price_per_seat_cents = 0",
        [d.price_per_seat_cents, busId]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update route error:", err);
    res.status(500).json({ error: "Failed to update route" });
  }
});

router.delete("/:routeId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { routeId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query("delete from routes where id = $1 and listing_id = $2 and listing_id in (select id from listings where vendor_id = $3) returning id", [routeId, listingId, vendorId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete route error:", err);
    res.status(500).json({ error: "Failed to delete route" });
  }
});

export default router;

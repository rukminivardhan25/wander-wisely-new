import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const routeSchema = z.object({
  from_place: z.string().min(1, "From required"),
  to_place: z.string().min(1, "To required"),
  fare_cents: z.number().int().min(0).optional().nullable(),
});
const createSchema = routeSchema;
const updateSchema = routeSchema.partial();

interface ListingRow {
  id: string;
  vendor_id: string;
  type: string;
}

async function getTransportListing(listingId: string, vendorId: string): Promise<ListingRow | null> {
  try {
    const r = await query<ListingRow>(
      "SELECT id, vendor_id, type FROM listings WHERE id = $1 AND vendor_id = $2 AND LOWER(TRIM(type)) = 'transport'",
      [listingId, vendorId]
    );
    if (r.rows.length > 0) return r.rows[0];
  } catch (_) {}
  try {
    const vl = await query<{ listing_id: string }>(
      "SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2",
      [listingId, vendorId]
    );
    if (vl.rows.length > 0) {
      const l = await query<{ id: string; type: string }>("SELECT id, type FROM listings WHERE id = $1", [listingId]);
      if (l.rows.length > 0 && (l.rows[0].type || "").toLowerCase().trim() === "transport")
        return { id: l.rows[0].id, vendor_id: vendorId, type: l.rows[0].type };
    }
  } catch (_) {}
  return null;
}

async function ensureFlightOwned(flightId: string, listingId: string, vendorId: string): Promise<boolean> {
  const listing = await getTransportListing(listingId, vendorId);
  if (!listing) return false;
  const r = await query<{ id: string }>("SELECT id FROM flights WHERE id = $1 AND listing_id = $2", [flightId, listingId]);
  return r.rows.length > 0;
}

/** GET /api/listings/:listingId/flights/:flightId/routes */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    if (!listingId || !flightId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const result = await query<{
      id: string;
      from_place: string;
      to_place: string;
      fare_cents: number | null;
      created_at: string;
    }>(
      "SELECT id, from_place, to_place, fare_cents, created_at FROM flight_routes WHERE flight_id = $1 ORDER BY from_place, to_place",
      [flightId]
    );
    res.json({
      routes: result.rows.map((r) => ({
        id: r.id,
        fromPlace: r.from_place,
        toPlace: r.to_place,
        fareCents: r.fare_cents ?? undefined,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("List flight routes error:", err);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
});

/** POST /api/listings/:listingId/flights/:flightId/routes */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    if (!listingId || !flightId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const result = await query<{ id: string; from_place: string; to_place: string }>(
      `INSERT INTO flight_routes (flight_id, from_place, to_place, fare_cents, updated_at)
       VALUES ($1, $2, $3, $4, now())
       RETURNING id, from_place, to_place`,
      [flightId, d.from_place, d.to_place, d.fare_cents ?? null]
    );
    const row = result.rows[0];
    if (!row) {
      res.status(500).json({ error: "Failed to create route" });
      return;
    }
    await query("UPDATE flights SET verification_status = 'no_request', status = 'inactive', updated_at = now() WHERE id = $1 AND listing_id = $2", [flightId, listingId]);
    res.status(201).json({ id: row.id, fromPlace: row.from_place, toPlace: row.to_place });
  } catch (err) {
    console.error("Create flight route error:", err);
    res.status(500).json({ error: "Failed to create route" });
  }
});

/** PATCH /api/listings/:listingId/flights/:flightId/routes/:routeId */
router.patch("/:routeId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    const routeId = req.params.routeId;
    if (!listingId || !flightId || !routeId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
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
    let idx = 1;
    if (d.from_place !== undefined) {
      updates.push(`from_place = $${idx++}`);
      values.push(d.from_place);
    }
    if (d.to_place !== undefined) {
      updates.push(`to_place = $${idx++}`);
      values.push(d.to_place);
    }
    if (d.fare_cents !== undefined) {
      updates.push(`fare_cents = $${idx++}`);
      values.push(d.fare_cents);
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    updates.push("updated_at = now()");
    values.push(routeId, flightId);
    const whereIdx = idx;
    const result = await query(
      `UPDATE flight_routes SET ${updates.join(", ")} WHERE id = $${whereIdx} AND flight_id = $${whereIdx + 1} RETURNING id`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    await query("UPDATE flights SET verification_status = 'no_request', status = 'inactive', updated_at = now() WHERE id = $1 AND listing_id = $2", [flightId, listingId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Update flight route error:", err);
    res.status(500).json({ error: "Failed to update route" });
  }
});

/** DELETE /api/listings/:listingId/flights/:flightId/routes/:routeId */
router.delete("/:routeId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const flightId = req.params.flightId;
    const routeId = req.params.routeId;
    if (!listingId || !flightId || !routeId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const result = await query("DELETE FROM flight_routes WHERE id = $1 AND flight_id = $2 RETURNING id", [routeId, flightId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    await query("UPDATE flights SET verification_status = 'no_request', status = 'inactive', updated_at = now() WHERE id = $1 AND listing_id = $2", [flightId, listingId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete flight route error:", err);
    res.status(500).json({ error: "Failed to delete route" });
  }
});

export default router;

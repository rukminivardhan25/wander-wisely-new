import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const areaTypeSchema = z.enum(["local", "intercity"]);

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable();

const localSchema = z.object({
  area_type: z.literal("local"),
  city_name: z.string().min(1),
  city_lat: z.number().optional().nullable(),
  city_lng: z.number().optional().nullable(),
  base_fare_cents: z.number().int().min(0).optional().nullable(),
  price_per_km_cents: z.number().int().min(0).optional().nullable(),
  minimum_fare_cents: z.number().int().min(0).optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  days_available: z.string().optional().nullable(),
  from_date: dateStr,
  to_date: dateStr,
});

const intercitySchema = z.object({
  area_type: z.literal("intercity"),
  from_city: z.string().min(1),
  from_lat: z.number().optional().nullable(),
  from_lng: z.number().optional().nullable(),
  to_city: z.string().min(1),
  to_lat: z.number().optional().nullable(),
  to_lng: z.number().optional().nullable(),
  base_fare_cents: z.number().int().min(0).optional().nullable(),
  price_per_km_cents: z.number().int().min(0).optional().nullable(),
  estimated_duration_minutes: z.number().int().min(0).optional().nullable(),
  days_available: z.string().optional().nullable(),
  from_date: dateStr,
  to_date: dateStr,
});

const createSchema = z.discriminatedUnion("area_type", [localSchema, intercitySchema]);
const updateSchema = z.object({
  area_type: z.enum(["local", "intercity"]).optional(),
  city_name: z.string().optional().nullable(),
  city_lat: z.number().optional().nullable(),
  city_lng: z.number().optional().nullable(),
  base_fare_cents: z.number().int().min(0).optional().nullable(),
  price_per_km_cents: z.number().int().min(0).optional().nullable(),
  minimum_fare_cents: z.number().int().min(0).optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  days_available: z.string().optional().nullable(),
  from_city: z.string().optional().nullable(),
  from_lat: z.number().optional().nullable(),
  from_lng: z.number().optional().nullable(),
  to_city: z.string().optional().nullable(),
  to_lat: z.number().optional().nullable(),
  to_lng: z.number().optional().nullable(),
  estimated_duration_minutes: z.number().int().min(0).optional().nullable(),
  from_date: dateStr,
  to_date: dateStr,
}).partial();

async function ensureCarOwned(carId: string, listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "SELECT c.id FROM cars c JOIN listings l ON l.id = c.listing_id AND l.vendor_id = $3 WHERE c.id = $1 AND c.listing_id = $2",
    [carId, listingId, vendorId]
  );
  return r.rows.length > 0;
}

function parseTime(s: string | null | undefined): string | null {
  if (s == null || String(s).trim() === "") return null;
  return String(s).trim();
}

/** GET /api/listings/:listingId/cars/:carId/operating-areas */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const carId = req.params.carId;
    if (!listingId || !carId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const result = await query<{
      id: string; car_id: string; area_type: string;
      city_name: string | null; city_lat: number | null; city_lng: number | null;
      base_fare_cents: number | null; price_per_km_cents: number | null; minimum_fare_cents: number | null;
      start_time: string | null; end_time: string | null; days_available: string | null;
      from_city: string | null; from_lat: number | null; from_lng: number | null;
      to_city: string | null; to_lat: number | null; to_lng: number | null;
      estimated_duration_minutes: number | null;
      from_date: string | null; to_date: string | null;
      created_at: string;
    }>(
      `SELECT id, car_id, area_type, city_name, city_lat, city_lng, base_fare_cents, price_per_km_cents, minimum_fare_cents,
       start_time::text, end_time::text, days_available, from_city, from_lat, from_lng, to_city, to_lat, to_lng, estimated_duration_minutes,
       from_date::text, to_date::text, created_at
       FROM car_operating_areas WHERE car_id = $1 ORDER BY created_at DESC`,
      [carId]
    );
    res.json({ areas: result.rows });
  } catch (err) {
    console.error("List car operating areas error:", err);
    res.status(500).json({ error: "Failed to fetch operating areas" });
  }
});

/** POST /api/listings/:listingId/cars/:carId/operating-areas */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const carId = req.params.carId;
    if (!listingId || !carId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const fromDate = d.from_date && /^\d{4}-\d{2}-\d{2}$/.test(d.from_date) ? d.from_date : null;
    const toDate = d.to_date && /^\d{4}-\d{2}-\d{2}$/.test(d.to_date) ? d.to_date : null;
    if (d.area_type === "local") {
      await query(
        `INSERT INTO car_operating_areas (car_id, area_type, city_name, city_lat, city_lng, base_fare_cents, price_per_km_cents, minimum_fare_cents, start_time, end_time, days_available, from_date, to_date)
         VALUES ($1, 'local', $2, $3, $4, $5, $6, $7, $8::time, $9::time, $10, $11::date, $12::date)`,
        [
          carId, d.city_name, d.city_lat ?? null, d.city_lng ?? null,
          d.base_fare_cents ?? null, d.price_per_km_cents ?? null, d.minimum_fare_cents ?? null,
          parseTime(d.start_time), parseTime(d.end_time), d.days_available ?? null,
          fromDate, toDate,
        ]
      );
    } else {
      await query(
        `INSERT INTO car_operating_areas (car_id, area_type, from_city, from_lat, from_lng, to_city, to_lat, to_lng, base_fare_cents, price_per_km_cents, estimated_duration_minutes, days_available, from_date, to_date)
         VALUES ($1, 'intercity', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13::date)`,
        [
          carId, d.from_city, d.from_lat ?? null, d.from_lng ?? null, d.to_city, d.to_lat ?? null, d.to_lng ?? null,
          d.base_fare_cents ?? null, d.price_per_km_cents ?? null, d.estimated_duration_minutes ?? null, d.days_available ?? null,
          fromDate, toDate,
        ]
      );
    }
    await query("UPDATE cars SET verification_status = 'no_request', verified_at = NULL WHERE id = $1", [carId]);
    const result = await query<{ id: string }>(
      "SELECT id FROM car_operating_areas WHERE car_id = $1 ORDER BY created_at DESC LIMIT 1",
      [carId]
    );
    res.status(201).json(result.rows[0] ?? { id: "" });
  } catch (err) {
    console.error("Create car operating area error:", err);
    res.status(500).json({ error: "Failed to add operating area" });
  }
});

/** PATCH /api/listings/:listingId/cars/:carId/operating-areas/:areaId */
router.patch("/:areaId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const carId = req.params.carId;
    const { areaId } = req.params;
    if (!listingId || !carId || !areaId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
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
    if (d.area_type !== undefined) { updates.push(`area_type = $${i++}`); values.push(d.area_type); }
    if (d.city_name !== undefined) { updates.push(`city_name = $${i++}`); values.push(d.city_name); }
    if (d.city_lat !== undefined) { updates.push(`city_lat = $${i++}`); values.push(d.city_lat); }
    if (d.city_lng !== undefined) { updates.push(`city_lng = $${i++}`); values.push(d.city_lng); }
    if (d.base_fare_cents !== undefined) { updates.push(`base_fare_cents = $${i++}`); values.push(d.base_fare_cents); }
    if (d.price_per_km_cents !== undefined) { updates.push(`price_per_km_cents = $${i++}`); values.push(d.price_per_km_cents); }
    if (d.minimum_fare_cents !== undefined) { updates.push(`minimum_fare_cents = $${i++}`); values.push(d.minimum_fare_cents); }
    if (d.start_time !== undefined) { updates.push(`start_time = $${i++}::time`); values.push(parseTime(d.start_time)); }
    if (d.end_time !== undefined) { updates.push(`end_time = $${i++}::time`); values.push(parseTime(d.end_time)); }
    if (d.days_available !== undefined) { updates.push(`days_available = $${i++}`); values.push(d.days_available); }
    if (d.from_city !== undefined) { updates.push(`from_city = $${i++}`); values.push(d.from_city); }
    if (d.from_lat !== undefined) { updates.push(`from_lat = $${i++}`); values.push(d.from_lat); }
    if (d.from_lng !== undefined) { updates.push(`from_lng = $${i++}`); values.push(d.from_lng); }
    if (d.to_city !== undefined) { updates.push(`to_city = $${i++}`); values.push(d.to_city); }
    if (d.to_lat !== undefined) { updates.push(`to_lat = $${i++}`); values.push(d.to_lat); }
    if (d.to_lng !== undefined) { updates.push(`to_lng = $${i++}`); values.push(d.to_lng); }
    if (d.estimated_duration_minutes !== undefined) { updates.push(`estimated_duration_minutes = $${i++}`); values.push(d.estimated_duration_minutes); }
    if (d.from_date !== undefined) { updates.push(`from_date = $${i++}::date`); values.push(d.from_date && /^\d{4}-\d{2}-\d{2}$/.test(d.from_date) ? d.from_date : null); }
    if (d.to_date !== undefined) { updates.push(`to_date = $${i++}::date`); values.push(d.to_date && /^\d{4}-\d{2}-\d{2}$/.test(d.to_date) ? d.to_date : null); }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    updates.push(`updated_at = now()`);
    values.push(areaId, carId);
    const result = await query(
      `UPDATE car_operating_areas SET ${updates.join(", ")} WHERE id = $${i} AND car_id = $${i + 1} RETURNING id`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Operating area not found" });
      return;
    }
    await query("UPDATE cars SET verification_status = 'no_request', verified_at = NULL WHERE id = $1", [carId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Update car operating area error:", err);
    res.status(500).json({ error: "Failed to update operating area" });
  }
});

/** DELETE /api/listings/:listingId/cars/:carId/operating-areas/:areaId */
router.delete("/:areaId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const carId = req.params.carId;
    const { areaId } = req.params;
    if (!listingId || !carId || !areaId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const result = await query(
      "DELETE FROM car_operating_areas WHERE id = $1 AND car_id = $2 RETURNING id",
      [areaId, carId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Operating area not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete car operating area error:", err);
    res.status(500).json({ error: "Failed to delete operating area" });
  }
});

export default router;

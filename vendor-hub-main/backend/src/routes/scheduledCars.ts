import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function ensureListingOwned(listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "SELECT id FROM listings WHERE id = $1 AND vendor_id = $2",
    [listingId, vendorId]
  );
  return r.rows.length > 0;
}

/**
 * GET /api/listings/:listingId/scheduled-cars?date=YYYY-MM-DD
 * Returns cars (with their operating areas) that are scheduled for the given date.
 * Only dates are considered (start_time/end_time are ignored for inclusion).
 * - Local: area included if from_date <= date <= to_date, or if both dates are NULL (any day).
 * - Intercity: area included only on the start date (from_date = date).
 * Car status (active/inactive) is ignored so the vendor sees all scheduled cars for the date.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : null;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      res.status(400).json({ error: "Query param 'date' (YYYY-MM-DD) is required" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query<{
      car_id: string;
      car_name: string;
      area_id: string;
      area_type: string;
      city_name: string | null;
      from_city: string | null;
      to_city: string | null;
      from_date: string | null;
      to_date: string | null;
      start_time: string | null;
      end_time: string | null;
      base_fare_cents: number | null;
      price_per_km_cents: number | null;
    }>(
      `SELECT c.id AS car_id, c.name AS car_name, a.id AS area_id, a.area_type,
       a.city_name, a.from_city, a.to_city, a.from_date::text, a.to_date::text,
       a.start_time::text, a.end_time::text, a.base_fare_cents, a.price_per_km_cents
       FROM cars c
       JOIN car_operating_areas a ON a.car_id = c.id
       WHERE c.listing_id = $1
         AND (
           (LOWER(COALESCE(a.area_type, 'local')) = 'local'
             AND (a.from_date IS NULL OR a.from_date <= $2::date)
             AND (a.to_date IS NULL OR a.to_date >= $2::date))
           OR
           (LOWER(COALESCE(a.area_type, 'intercity')) = 'intercity'
             AND (a.from_date IS NOT NULL AND (a.from_date::date = $2::date))
         )
       ORDER BY c.name, a.area_type`,
      [listingId, dateParam]
    );
    const byCar = new Map<string, { carId: string; carName: string; areas: typeof result.rows }>();
    for (const row of result.rows) {
      const key = row.car_id;
      if (!byCar.has(key)) byCar.set(key, { carId: row.car_id, carName: row.car_name, areas: [] });
      byCar.get(key)!.areas.push(row);
    }
    const cars = Array.from(byCar.values()).map(({ carId, carName, areas }) => ({
      carId,
      carName,
      areas: areas.map((a) => ({
        areaId: a.area_id,
        areaType: a.area_type,
        cityName: a.city_name ?? undefined,
        fromCity: a.from_city ?? undefined,
        toCity: a.to_city ?? undefined,
        fromDate: a.from_date ?? undefined,
        toDate: a.to_date ?? undefined,
        startTime: a.start_time ?? undefined,
        endTime: a.end_time ?? undefined,
        baseFareCents: a.base_fare_cents ?? undefined,
        pricePerKmCents: a.price_per_km_cents ?? undefined,
      })),
    }));
    res.json({ date: dateParam, cars });
  } catch (err) {
    console.error("Scheduled cars error:", err);
    res.status(500).json({ error: "Failed to fetch scheduled cars" });
  }
});

export default router;

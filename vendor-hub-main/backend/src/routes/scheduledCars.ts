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

/** Parse "YYYY-MM-DD to YYYY-MM-DD" or "YYYY-MM-DD to YYYY-MM-DD, ..." from days_available text. */
function parseDateRangeFromDaysAvailable(daysAvailable: string | null): { from: string; to: string } | null {
  if (!daysAvailable || typeof daysAvailable !== "string") return null;
  const match = daysAvailable.trim().match(/^(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  return { from: match[1], to: match[2] };
}

/**
 * GET /api/listings/:listingId/scheduled-cars?date=YYYY-MM-DD
 * Returns cars (with their operating areas) that are scheduled for the given date.
 * Only dates are considered (start_time/end_time are ignored for inclusion).
 * - Local: area included if from_date <= date <= to_date, or if both dates are NULL (any day).
 *   When from_date/to_date are NULL, falls back to parsing days_available for "YYYY-MM-DD to YYYY-MM-DD".
 * - Intercity: area included only on the start date (from_date = date).
 *   When from_date is NULL, falls back to first date parsed from days_available.
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
      car_registration_number: string | null;
      area_id: string;
      area_type: string;
      city_name: string | null;
      from_city: string | null;
      to_city: string | null;
      from_date: string | null;
      to_date: string | null;
      days_available: string | null;
      start_time: string | null;
      end_time: string | null;
      base_fare_cents: number | null;
      price_per_km_cents: number | null;
    }>(
      `SELECT c.id AS car_id, c.name AS car_name, c.registration_number AS car_registration_number,
       a.id AS area_id, a.area_type, a.city_name, a.from_city, a.to_city,
       a.from_date::text, a.to_date::text, a.days_available,
       a.start_time::text, a.end_time::text, a.base_fare_cents, a.price_per_km_cents
       FROM cars c
       JOIN car_operating_areas a ON a.car_id = c.id
       WHERE c.listing_id = $1
       ORDER BY c.name, a.area_type`,
      [listingId]
    );
    const isLocal = (t: string) => (t || "local").toLowerCase() === "local";
    const matchesDate = (row: (typeof result.rows)[0]): boolean => {
      const fromDate = row.from_date?.trim() || null;
      const toDate = row.to_date?.trim() || null;
      const parsed = parseDateRangeFromDaysAvailable(row.days_available);
      if (isLocal(row.area_type)) {
        if (fromDate && toDate) return fromDate <= dateParam && toDate >= dateParam;
        if (parsed) return parsed.from <= dateParam && parsed.to >= dateParam;
        return true;
      }
      if ((row.area_type || "").toLowerCase() === "intercity") {
        if (fromDate) return fromDate === dateParam;
        if (parsed) return parsed.from === dateParam;
        return false;
      }
      return false;
    };
    const matchingRows = result.rows.filter(matchesDate);
    const byCar = new Map<string, { carId: string; carName: string; registrationNumber: string | null; areas: typeof matchingRows }>();
    for (const row of matchingRows) {
      const key = row.car_id;
      if (!byCar.has(key)) byCar.set(key, { carId: row.car_id, carName: row.car_name, registrationNumber: row.car_registration_number ?? null, areas: [] });
      byCar.get(key)!.areas.push(row);
    }
    const cars = Array.from(byCar.values()).map(({ carId, carName, registrationNumber, areas }) => ({
      carId,
      carName,
      registrationNumber: registrationNumber ?? undefined,
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

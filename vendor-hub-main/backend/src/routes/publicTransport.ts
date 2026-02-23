import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();

/**
 * GET /api/public/available-buses?date=YYYY-MM-DD
 * Public (no auth). Returns buses available for the given date:
 * - schedule start_date = date (same day only)
 * - schedule status = active
 * - listing type = transport
 * One row per bus+schedule so user sees each departure option.
 */
router.get("/available-buses", async (req: Request, res: Response): Promise<void> => {
  try {
    const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : null;

    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      res.status(400).json({
        error: "Query param 'date' is required and must be YYYY-MM-DD",
      });
      return;
    }

    const result = await query<{
      listing_id: string;
      listing_name: string;
      bus_id: string;
      bus_name: string;
      total_seats: number;
      schedule_id: string;
      departure_time: string;
      arrival_time: string;
      route_from_place: string | null;
      route_to_place: string | null;
      price_per_seat_cents: number | null;
    }>(
      `select
        l.id as listing_id,
        l.name as listing_name,
        b.id as bus_id,
        b.name as bus_name,
        b.total_seats,
        s.id as schedule_id,
        s.departure_time::text as departure_time,
        s.arrival_time::text as arrival_time,
        r.from_place as route_from_place,
        r.to_place as route_to_place,
        r.price_per_seat_cents
       from listings l
       join buses b on b.listing_id = l.id
       join bus_schedules s on s.bus_id = b.id
       left join routes r on r.id = s.route_id
       where lower(trim(l.type)) = 'transport'
         and (b.status is null or b.status = 'active')
         and s.start_date is not null
         and (s.start_date)::date = ($1)::date
         and coalesce(s.status, 'active') = 'active'
       order by l.name, b.name, s.departure_time`,
      [dateParam]
    );

    const buses = result.rows.map((row) => ({
      listingId: row.listing_id,
      listingName: row.listing_name,
      busId: row.bus_id,
      busName: row.bus_name,
      busNumber: null as string | null,
      totalSeats: row.total_seats,
      scheduleId: row.schedule_id,
      departureTime: row.departure_time?.slice(0, 5) ?? "—",
      arrivalTime: row.arrival_time?.slice(0, 5) ?? "—",
      routeFrom: row.route_from_place ?? null,
      routeTo: row.route_to_place ?? null,
      pricePerSeatCents: row.price_per_seat_cents ?? null,
    }));

    res.json({ date: dateParam, buses });
  } catch (err) {
    console.error("Public available-buses error:", err);
    res.status(500).json({ error: "Failed to fetch available buses" });
  }
});

export default router;

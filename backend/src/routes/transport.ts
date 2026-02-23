import { Router, Request, Response } from "express";
import { getTransportPool } from "../config/db.js";

const router = Router();

/**
 * GET /api/transport/cities
 * Returns distinct city names (from routes: from_place and to_place) for dropdowns.
 */
router.get("/cities", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getTransportPool();
    const result = await pool.query<{ city: string }>(
      `select distinct trim(c) as city from (
        select from_place as c from routes where from_place is not null and trim(from_place) != ''
        union
        select to_place as c from routes where to_place is not null and trim(to_place) != ''
      ) u where trim(c) != '' order by 1`
    );
    const cities = result.rows.map((r) => r.city).filter(Boolean);
    res.json({ cities });
  } catch (err) {
    console.error("Transport cities error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch cities";
    res.status(500).json({
      error: message.includes("does not exist")
        ? "Transport tables not found. Set TRANSPORT_DATABASE_URL to the vendor hub database."
        : "Failed to fetch cities",
    });
  }
});

/**
 * GET /api/transport/available-buses?date=YYYY-MM-DD&from=&to=&passengers=
 * Returns buses available for the given date (and optional from/to/passengers) from the database:
 * - schedule start_date = date (same day only)
 * - schedule and bus status = active
 * - optional: route from_place matches from, to_place matches to (case-insensitive)
 * - optional: available seats (coalesce(seat_availability, total_seats)) >= passengers
 */
router.get("/available-buses", async (req: Request, res: Response): Promise<void> => {
  try {
    const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : null;
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      res.status(400).json({ error: "Query param 'date' is required and must be YYYY-MM-DD" });
      return;
    }
    const fromParam = typeof req.query.from === "string" ? req.query.from.trim() : null;
    const toParam = typeof req.query.to === "string" ? req.query.to.trim() : null;
    const passengersParam = req.query.passengers != null ? Number(req.query.passengers) : NaN;
    const passengers = Number.isInteger(passengersParam) && passengersParam >= 1 ? passengersParam : 1;

    const pool = getTransportPool();
    const result = await pool.query<{
      listing_id: string;
      listing_name: string;
      bus_id: string;
      bus_name: string;
      registration_number: string | null;
      bus_number: string | null;
      total_seats: number;
      available_seats: number;
      rows: number;
      left_cols: number;
      right_cols: number;
      has_aisle: boolean;
      layout_type: string | null;
      bus_type: string | null;
      ac_type: string | null;
      has_wifi: boolean;
      has_charging: boolean;
      has_entertainment: boolean;
      has_toilet: boolean;
      driver_name: string | null;
      driver_phone: string | null;
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
        b.registration_number,
        b.bus_number,
        b.total_seats,
        (coalesce(s.seat_availability, b.total_seats))::int as available_seats,
        coalesce(b.rows, 7) as rows,
        coalesce(b.left_cols, 2) as left_cols,
        coalesce(b.right_cols, 2) as right_cols,
        coalesce(b.has_aisle, true) as has_aisle,
        b.layout_type,
        b.bus_type,
        b.ac_type,
        coalesce(b.has_wifi, false) as has_wifi,
        coalesce(b.has_charging, false) as has_charging,
        coalesce(b.has_entertainment, false) as has_entertainment,
        coalesce(b.has_toilet, false) as has_toilet,
        dr.driver_name,
        dr.driver_phone,
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
       left join lateral (
         select d.name as driver_name, d.phone as driver_phone
         from drivers d where d.bus_id = b.id limit 1
       ) dr on true
       where lower(trim(l.type)) = 'transport'
         and (b.status is null or b.status = 'active')
         and s.start_date is not null
         and (s.start_date)::date = ($1)::date
         and coalesce(s.status, 'active') = 'active'
         and ($2::text is null or lower(trim(r.from_place)) = lower(trim($2)))
         and ($3::text is null or lower(trim(r.to_place)) = lower(trim($3)))
         and (coalesce(s.seat_availability, b.total_seats)) >= $4
       order by l.name, b.name, s.departure_time`,
      [dateParam, fromParam || null, toParam || null, passengers]
    );

    const buses = result.rows.map((row) => ({
      listingId: row.listing_id,
      listingName: row.listing_name,
      busId: row.bus_id,
      busName: row.bus_name,
      registrationNumber: row.registration_number ?? null,
      busNumber: row.bus_number ?? null,
      totalSeats: row.total_seats,
      availableSeats: row.available_seats,
      rows: row.rows,
      leftCols: row.left_cols,
      rightCols: row.right_cols,
      hasAisle: row.has_aisle,
      layoutType: row.layout_type ?? null,
      busType: row.bus_type ?? null,
      acType: row.ac_type ?? null,
      hasWifi: row.has_wifi,
      hasCharging: row.has_charging,
      hasEntertainment: row.has_entertainment,
      hasToilet: row.has_toilet,
      driverName: row.driver_name ?? null,
      driverPhone: row.driver_phone ?? null,
      scheduleId: row.schedule_id,
      departureTime: row.departure_time?.slice(0, 5) ?? "—",
      arrivalTime: row.arrival_time?.slice(0, 5) ?? "—",
      routeFrom: row.route_from_place ?? null,
      routeTo: row.route_to_place ?? null,
      pricePerSeatCents: row.price_per_seat_cents ?? null,
    }));

    res.json({ date: dateParam, buses });
  } catch (err) {
    console.error("Transport available-buses error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch available buses";
    res.status(500).json({
      error: message.includes("does not exist")
        ? "Transport tables not found. Set TRANSPORT_DATABASE_URL to the vendor hub database, or use a shared database with listings, buses, bus_schedules, routes."
        : "Failed to fetch available buses",
    });
  }
});

export default router;

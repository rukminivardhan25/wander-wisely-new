import { Router, Request, Response } from "express";
import { getTransportPool, query } from "../config/db.js";

const router = Router();

/**
 * GET /api/transport/cities
 * Returns distinct city names (from routes: from_place and to_place) for dropdowns.
 */
router.get("/cities", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getTransportPool();
    const withFlights = `select distinct trim(c) as city from (
      select from_place as c from routes where from_place is not null and trim(from_place) != ''
      union select to_place as c from routes where to_place is not null and trim(to_place) != ''
      union select city_name as c from car_operating_areas where city_name is not null and trim(city_name) != ''
      union select from_city as c from car_operating_areas where from_city is not null and trim(from_city) != ''
      union select to_city as c from car_operating_areas where to_city is not null and trim(to_city) != ''
      union select from_place as c from flight_routes where from_place is not null and trim(from_place) != ''
      union select to_place as c from flight_routes where to_place is not null and trim(to_place) != ''
    ) u where trim(c) != '' order by 1`;
    const withoutFlights = `select distinct trim(c) as city from (
      select from_place as c from routes where from_place is not null and trim(from_place) != ''
      union select to_place as c from routes where to_place is not null and trim(to_place) != ''
      union select city_name as c from car_operating_areas where city_name is not null and trim(city_name) != ''
      union select from_city as c from car_operating_areas where from_city is not null and trim(from_city) != ''
      union select to_city as c from car_operating_areas where to_city is not null and trim(to_city) != ''
    ) u where trim(c) != '' order by 1`;
    let result: { rows: { city: string }[] };
    try {
      result = await pool.query<{ city: string }>(withFlights);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "";
      if (msg.includes("flight_routes")) {
        result = await pool.query<{ city: string }>(withoutFlights);
      } else {
        throw e;
      }
    }
    const cities = result.rows.map((r) => r.city).filter(Boolean);
    res.json({ cities });
  } catch (err) {
    console.error("Transport cities error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch cities";
    res.status(500).json({
      error: message.includes("does not exist")
        ? "Transport tables not found. Run vendor-hub migrations on this database (listings, buses, bus_schedules, routes)."
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

    // Booked seat count per bus for this date (from main DB transport_bookings)
    const bookedResult = await query<{ bus_id: string; booked: string }>(
      `select bus_id, sum(cardinality(selected_seats))::text as booked
       from transport_bookings
       where travel_date = $1 and bus_id is not null
       group by bus_id`,
      [dateParam]
    ).catch(() => ({ rows: [] as { bus_id: string; booked: string }[] }));
    const bookedByBus = new Map<string, number>();
    for (const r of bookedResult.rows) {
      const n = parseInt(r.booked, 10);
      if (!Number.isNaN(n) && n > 0) bookedByBus.set(r.bus_id, n);
    }

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
         and b.status = 'active'
         and coalesce(b.verification_status, 'no_request') = 'approved'
         and s.start_date is not null
         and (s.start_date)::date = ($1)::date
         and coalesce(s.status, 'active') = 'active'
         and ($2::text is null or lower(trim(r.from_place)) = lower(trim($2)))
         and ($3::text is null or lower(trim(r.to_place)) = lower(trim($3)))
         and (coalesce(s.seat_availability, b.total_seats)) >= $4
       order by l.name, b.name, s.departure_time`,
      [dateParam, fromParam || null, toParam || null, passengers]
    );

    const buses = result.rows.map((row) => {
      const booked = bookedByBus.get(row.bus_id) ?? 0;
      const availableSeats = Math.max(0, row.total_seats - booked);
      return {
      listingId: row.listing_id,
      listingName: row.listing_name,
      busId: row.bus_id,
      busName: row.bus_name,
      registrationNumber: row.registration_number ?? null,
      busNumber: row.bus_number ?? null,
      totalSeats: row.total_seats,
      availableSeats,
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
    };
    });

    const filtered = buses.filter((b) => b.availableSeats >= passengers);
    res.json({ date: dateParam, buses: filtered });
  } catch (err) {
    console.error("Transport available-buses error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch available buses";
    res.status(500).json({
      error: message.includes("does not exist")
        ? "Transport tables not found. Run vendor-hub migrations on this database (listings, buses, bus_schedules, routes)."
        : "Failed to fetch available buses",
    });
  }
});

/**
 * GET /api/transport/available-cars
 * Local: ?type=local&city=Hyderabad&passengers=2 — today and current time only; cars with area from_date<=today<=to_date, start_time<=now<=end_time.
 * Intercity: ?type=intercity&from=Hyderabad&to=Bangalore&date=YYYY-MM-DD&passengers=2 — cars with route and date in from_date..to_date.
 */
router.get("/available-cars", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getTransportPool();
    const typeParam = typeof req.query.type === "string" ? req.query.type.trim().toLowerCase() : null;
    if (typeParam !== "local" && typeParam !== "intercity") {
      res.status(400).json({ error: "Query param 'type' is required and must be 'local' or 'intercity'" });
      return;
    }
    const passengersParam = req.query.passengers != null ? Number(req.query.passengers) : NaN;
    const passengers = Number.isInteger(passengersParam) && passengersParam >= 1 ? passengersParam : 1;

    if (typeParam === "local") {
      const cityParam = typeof req.query.city === "string" ? req.query.city.trim() : null;
      if (!cityParam) {
        res.status(400).json({ error: "For type=local, query param 'city' is required" });
        return;
      }
      const result = await pool.query<{
        listing_id: string;
        listing_name: string;
        car_id: string;
        car_name: string;
        registration_number: string | null;
        car_type: string;
        seats: number;
        ac_type: string | null;
        area_id: string;
        base_fare_cents: number | null;
        price_per_km_cents: number | null;
        minimum_fare_cents: number | null;
      }>(
        `SELECT l.id AS listing_id, l.name AS listing_name, c.id AS car_id, c.name AS car_name,
         c.registration_number, c.car_type, c.seats, c.ac_type, a.id AS area_id,
         a.base_fare_cents, a.price_per_km_cents, a.minimum_fare_cents
         FROM listings l
         JOIN cars c ON c.listing_id = l.id
         JOIN car_operating_areas a ON a.car_id = c.id
         WHERE LOWER(TRIM(l.type)) = 'transport'
           AND c.status = 'active'
           AND COALESCE(c.verification_status, 'no_request') = 'approved'
           AND a.area_type = 'local'
           AND LOWER(TRIM(a.city_name)) = LOWER(TRIM($1))
           AND c.seats >= $2
           AND (a.from_date IS NULL OR a.from_date <= current_date)
           AND (a.to_date IS NULL OR a.to_date >= current_date)
           AND (a.start_time IS NULL OR a.start_time <= current_time)
           AND (a.end_time IS NULL OR a.end_time >= current_time)
         ORDER BY l.name, c.name`,
        [cityParam, passengers]
      );
      const cars = result.rows.map((r) => ({
        listingId: r.listing_id,
        listingName: r.listing_name,
        carId: r.car_id,
        carName: r.car_name,
        registrationNumber: r.registration_number ?? null,
        carType: r.car_type,
        seats: r.seats,
        acType: r.ac_type ?? null,
        areaId: r.area_id,
        baseFareCents: r.base_fare_cents ?? null,
        pricePerKmCents: r.price_per_km_cents ?? null,
        minimumFareCents: r.minimum_fare_cents ?? null,
      }));
      res.json({ type: "local", date: new Date().toISOString().slice(0, 10), cars });
      return;
    }

    const fromParam = typeof req.query.from === "string" ? req.query.from.trim() : null;
    const toParam = typeof req.query.to === "string" ? req.query.to.trim() : null;
    const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : null;
    if (!fromParam || !toParam || !dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      res.status(400).json({ error: "For type=intercity, query params 'from', 'to', and 'date' (YYYY-MM-DD) are required" });
      return;
    }
    const result = await pool.query<{
      listing_id: string;
      listing_name: string;
      car_id: string;
      car_name: string;
      registration_number: string | null;
      car_type: string;
      seats: number;
      ac_type: string | null;
      area_id: string;
      base_fare_cents: number | null;
      price_per_km_cents: number | null;
      estimated_duration_minutes: number | null;
    }>(
      `SELECT l.id AS listing_id, l.name AS listing_name, c.id AS car_id, c.name AS car_name,
       c.registration_number, c.car_type, c.seats, c.ac_type, a.id AS area_id,
       a.base_fare_cents, a.price_per_km_cents, a.estimated_duration_minutes
       FROM listings l
       JOIN cars c ON c.listing_id = l.id
       JOIN car_operating_areas a ON a.car_id = c.id
       WHERE LOWER(TRIM(l.type)) = 'transport'
         AND c.status = 'active'
         AND COALESCE(c.verification_status, 'no_request') = 'approved'
         AND a.area_type = 'intercity'
         AND LOWER(TRIM(a.from_city)) = LOWER(TRIM($1))
         AND LOWER(TRIM(a.to_city)) = LOWER(TRIM($2))
         AND c.seats >= $3
         AND (a.from_date IS NULL OR a.from_date <= ($4)::date)
         AND (a.to_date IS NULL OR a.to_date >= ($4)::date)
       ORDER BY l.name, c.name`,
      [fromParam, toParam, passengers, dateParam]
    );
    const cars = result.rows.map((r) => ({
      listingId: r.listing_id,
      listingName: r.listing_name,
      carId: r.car_id,
      carName: r.car_name,
      registrationNumber: r.registration_number ?? null,
      carType: r.car_type,
      seats: r.seats,
      acType: r.ac_type ?? null,
      areaId: r.area_id,
      baseFareCents: r.base_fare_cents ?? null,
      pricePerKmCents: r.price_per_km_cents ?? null,
      estimatedDurationMinutes: r.estimated_duration_minutes ?? null,
    }));
    res.json({ type: "intercity", date: dateParam, cars });
  } catch (err) {
    console.error("Transport available-cars error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch available cars";
    res.status(500).json({
      error: message.includes("does not exist")
        ? "Car/transport tables not found. Run vendor-hub migrations 026, 028, 031, 032 on this database."
        : message,
    });
  }
});

export default router;

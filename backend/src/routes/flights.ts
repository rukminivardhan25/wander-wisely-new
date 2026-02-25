import { Router, Request, Response } from "express";
import { getTransportPool } from "../config/db.js";

const router = Router();

/**
 * GET /api/flights/search?from=&to=&date=YYYY-MM-DD&passengers=
 * Returns flights that have a schedule on the given date, route from/to match, and available seats >= passengers.
 * Uses transport DB (same as vendor hub).
 */
router.get("/search", async (req: Request, res: Response): Promise<void> => {
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
      schedule_id: string;
      flight_id: string;
      listing_id: string;
      listing_name: string | null;
      flight_number: string;
      airline_name: string;
      aircraft_type: string;
      flight_type: string;
      total_seats: number;
      seat_layout: unknown;
      base_fare_cents: number | null;
      from_place: string;
      to_place: string;
      route_fare_cents: number | null;
      departure_time: string;
      arrival_time: string;
      available_seats: number;
    }>(
      `SELECT
        s.id AS schedule_id,
        f.id AS flight_id,
        l.id AS listing_id,
        l.name AS listing_name,
        f.flight_number,
        f.airline_name,
        f.aircraft_type,
        f.flight_type,
        f.total_seats,
        f.seat_layout,
        f.base_fare_cents,
        r.from_place,
        r.to_place,
        r.fare_cents AS route_fare_cents,
        s.departure_time::text AS departure_time,
        s.arrival_time::text AS arrival_time,
        (f.total_seats - COALESCE(booked.cnt, 0))::int AS available_seats
       FROM flight_schedules s
       JOIN flight_routes r ON r.id = s.route_id
       JOIN flights f ON f.id = s.flight_id
       JOIN listings l ON l.id = f.listing_id
       LEFT JOIN LATERAL (
         SELECT SUM(b.passengers)::int AS cnt
         FROM flight_bookings b
         WHERE b.schedule_id = s.id::text AND b.status IN ('confirmed', 'approved_awaiting_payment')
       ) booked ON true
       WHERE s.schedule_date = $1::date
         AND f.status = 'active'
         AND s.status = 'active'
         AND ($2::text IS NULL OR lower(trim(r.from_place)) = lower(trim($2)))
         AND ($3::text IS NULL OR lower(trim(r.to_place)) = lower(trim($3)))
         AND (f.total_seats - COALESCE(booked.cnt, 0)) >= $4
       ORDER BY s.departure_time`,
      [dateParam, fromParam || null, toParam || null, passengers]
    );

    const flights = result.rows.map((r) => ({
      scheduleId: r.schedule_id,
      flightId: r.flight_id,
      listingId: r.listing_id,
      listingName: r.listing_name ?? undefined,
      flightNumber: r.flight_number,
      airlineName: r.airline_name,
      aircraftType: r.aircraft_type,
      flightType: r.flight_type,
      fromPlace: r.from_place,
      toPlace: r.to_place,
      departureTime: r.departure_time,
      arrivalTime: r.arrival_time,
      totalSeats: r.total_seats,
      availableSeats: r.available_seats,
      fareCents: r.route_fare_cents ?? r.base_fare_cents ?? undefined,
      seatLayout: r.seat_layout ?? undefined,
    }));

    res.json({ flights });
  } catch (err) {
    console.error("Flight search error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("flight_schedules") || msg.includes("flights") || msg.includes("flight_routes") || msg.includes("flight_bookings")) {
      res.status(503).json({
        error: "Flight search not available. Run flight schema on this database (e.g. vendor-hub: npm run db:flight). Use the same DATABASE_URL for main app and vendor hub.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to search flights" });
  }
});

export default router;

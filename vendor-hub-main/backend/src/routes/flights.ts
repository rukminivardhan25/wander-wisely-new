import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import flightRoutesRoutes from "./flightRoutes.js";
import flightSchedulesRoutes from "./flightSchedules.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const flightTypes = ["domestic", "international"] as const;
const flightSchema = z.object({
  flight_number: z.string().min(1, "Flight number required"),
  airline_name: z.string().min(1, "Airline name required"),
  aircraft_type: z.string().min(1, "Aircraft type required"),
  flight_type: z.enum(flightTypes).optional(),
  total_seats: z.number().int().min(1).max(500),
  status: z.enum(["active", "inactive"]).optional(),
  seat_layout: z.record(z.unknown()).optional().nullable(),
  base_fare_cents: z.number().int().min(0).optional().nullable(),
  baggage_allowance: z.string().optional().nullable(),
  has_wifi: z.boolean().optional(),
  has_charging: z.boolean().optional(),
  has_entertainment: z.boolean().optional(),
  has_meal: z.boolean().optional(),
});
const createSchema = flightSchema;
const updateSchema = flightSchema.partial();

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
  const r = await query<{ id: string }>(
    "SELECT id FROM flights WHERE id = $1 AND listing_id = $2",
    [flightId, listingId]
  );
  return r.rows.length > 0;
}

/** GET /api/listings/:listingId/flights */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    const listing = await getTransportListing(listingId, vendorId);
    if (!listing) {
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    const result = await query<{
      id: string;
      flight_number: string;
      airline_name: string;
      aircraft_type: string;
      flight_type: string;
      total_seats: number;
      status: string;
      seat_layout: unknown;
      base_fare_cents: number | null;
      baggage_allowance: string | null;
      verification_token: string | null;
      verification_status: string | null;
      has_wifi?: boolean;
      has_charging?: boolean;
      has_entertainment?: boolean;
      has_meal?: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, flight_number, airline_name, aircraft_type, flight_type, total_seats, status,
       seat_layout, base_fare_cents, baggage_allowance, verification_token, verification_status,
       COALESCE(has_wifi, false) AS has_wifi, COALESCE(has_charging, false) AS has_charging,
       COALESCE(has_entertainment, false) AS has_entertainment, COALESCE(has_meal, false) AS has_meal,
       created_at, updated_at
       FROM flights WHERE listing_id = $1 ORDER BY flight_number`,
      [listingId]
    );
    res.json({
      flights: result.rows.map((r) => ({
        id: r.id,
        flightNumber: r.flight_number,
        airlineName: r.airline_name,
        aircraftType: r.aircraft_type,
        flightType: r.flight_type,
        totalSeats: r.total_seats,
        status: r.status,
        seatLayout: r.seat_layout ?? undefined,
        baseFareCents: r.base_fare_cents ?? undefined,
        baggageAllowance: r.baggage_allowance ?? undefined,
        verificationToken: r.verification_token ?? undefined,
        verificationStatus: r.verification_status ?? undefined,
        hasWifi: r.has_wifi ?? false,
        hasCharging: r.has_charging ?? false,
        hasEntertainment: r.has_entertainment ?? false,
        hasMeal: r.has_meal ?? false,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error("List flights error:", err);
    if (err && typeof err === "object" && "message" in err && String((err as Error).message).includes("flights")) {
      res.status(503).json({ error: "Flights table not set up. Run schema 034_flights.sql." });
      return;
    }
    res.status(500).json({ error: "Failed to fetch flights" });
  }
});

/** POST /api/listings/:listingId/flights */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const listing = await getTransportListing(listingId, vendorId);
    if (!listing) {
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const result = await query<{ id: string; flight_number: string; status: string }>(
      `INSERT INTO flights (listing_id, flight_number, airline_name, aircraft_type, flight_type, total_seats, status, seat_layout, base_fare_cents, baggage_allowance, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       RETURNING id, flight_number, status`,
      [
        listingId,
        d.flight_number,
        d.airline_name,
        d.aircraft_type,
        d.flight_type ?? "domestic",
        d.total_seats,
        d.status ?? "active",
        d.seat_layout ? JSON.stringify(d.seat_layout) : null,
        d.base_fare_cents ?? null,
        d.baggage_allowance ?? null,
      ]
    );
    const row = result.rows[0];
    if (!row) {
      res.status(500).json({ error: "Failed to create flight" });
      return;
    }
    res.status(201).json({ id: row.id, flightNumber: row.flight_number, status: row.status });
  } catch (err) {
    console.error("Create flight error:", err);
    if (err && typeof err === "object" && "message" in err && String((err as Error).message).includes("flights")) {
      res.status(503).json({ error: "Flights table not set up. Run schema 034_flights.sql." });
      return;
    }
    res.status(500).json({ error: "Failed to create flight" });
  }
});

/** POST /api/listings/:listingId/flights/:flightId/generate-verification-token */
router.post("/:flightId/generate-verification-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { flightId } = req.params;
    if (!listingId || !flightId) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const ok = await ensureFlightOwned(flightId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const row = await query<{ verification_token: string | null; verification_status: string | null }>(
      "SELECT verification_token, verification_status FROM flights WHERE id = $1 AND listing_id = $2",
      [flightId, listingId]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    let token = row.rows[0].verification_token;
    const currentStatus = row.rows[0].verification_status ?? "no_request";
    if (token) {
      return void res.json({ verification_token: token, verification_status: currentStatus });
    }
    const slug = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    token = `FLT-${slug()}-${slug()}`;
    try {
      await query("UPDATE flights SET verification_token = $1 WHERE id = $2 AND listing_id = $3", [token, flightId, listingId]);
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        const retry = await query<{ verification_token: string | null }>("SELECT verification_token FROM flights WHERE id = $1 AND listing_id = $2", [flightId, listingId]);
        token = retry.rows[0]?.verification_token ?? token;
      } else throw err;
    }
    res.json({ verification_token: token, verification_status: "no_request" });
  } catch (err) {
    console.error("Flight generate verification token error:", err);
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "42703") {
      res.status(503).json({ error: "Flight verification not configured. Run migration 037_flights_verification.sql" });
      return;
    }
    res.status(500).json({ error: "Failed to generate token" });
  }
});

/** GET /api/listings/:listingId/flights/:flightId */
router.get("/:flightId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
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
      flight_number: string;
      airline_name: string;
      aircraft_type: string;
      flight_type: string;
      total_seats: number;
      status: string;
      seat_layout: unknown;
      base_fare_cents: number | null;
      baggage_allowance: string | null;
      verification_token: string | null;
      verification_status: string | null;
      has_wifi?: boolean;
      has_charging?: boolean;
      has_entertainment?: boolean;
      has_meal?: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, flight_number, airline_name, aircraft_type, flight_type, total_seats, status,
       seat_layout, base_fare_cents, baggage_allowance, verification_token, verification_status,
       COALESCE(has_wifi, false) AS has_wifi, COALESCE(has_charging, false) AS has_charging,
       COALESCE(has_entertainment, false) AS has_entertainment, COALESCE(has_meal, false) AS has_meal,
       created_at, updated_at
       FROM flights WHERE id = $1 AND listing_id = $2`,
      [flightId, listingId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      flightNumber: r.flight_number,
      airlineName: r.airline_name,
      aircraftType: r.aircraft_type,
      flightType: r.flight_type,
      totalSeats: r.total_seats,
      status: r.status,
      seatLayout: r.seat_layout ?? undefined,
      baseFareCents: r.base_fare_cents ?? undefined,
      baggageAllowance: r.baggage_allowance ?? undefined,
      verificationToken: r.verification_token ?? undefined,
      verificationStatus: r.verification_status ?? undefined,
      hasWifi: r.has_wifi ?? false,
      hasCharging: r.has_charging ?? false,
      hasEntertainment: r.has_entertainment ?? false,
      hasMeal: r.has_meal ?? false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (err) {
    console.error("Get flight error:", err);
    res.status(500).json({ error: "Failed to fetch flight" });
  }
});

/** PATCH /api/listings/:listingId/flights/:flightId */
router.patch("/:flightId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
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
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (d.flight_number !== undefined) {
      updates.push(`flight_number = $${idx++}`);
      values.push(d.flight_number);
    }
    if (d.airline_name !== undefined) {
      updates.push(`airline_name = $${idx++}`);
      values.push(d.airline_name);
    }
    if (d.aircraft_type !== undefined) {
      updates.push(`aircraft_type = $${idx++}`);
      values.push(d.aircraft_type);
    }
    if (d.flight_type !== undefined) {
      updates.push(`flight_type = $${idx++}`);
      values.push(d.flight_type);
    }
    if (d.total_seats !== undefined) {
      updates.push(`total_seats = $${idx++}`);
      values.push(d.total_seats);
    }
    if (d.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(d.status);
    }
    if (d.seat_layout !== undefined) {
      updates.push(`seat_layout = $${idx++}`);
      values.push(d.seat_layout ? JSON.stringify(d.seat_layout) : null);
    }
    if (d.base_fare_cents !== undefined) {
      updates.push(`base_fare_cents = $${idx++}`);
      values.push(d.base_fare_cents);
    }
    if (d.baggage_allowance !== undefined) {
      updates.push(`baggage_allowance = $${idx++}`);
      values.push(d.baggage_allowance);
    }
    if (d.has_wifi !== undefined) {
      updates.push(`has_wifi = $${idx++}`);
      values.push(d.has_wifi);
    }
    if (d.has_charging !== undefined) {
      updates.push(`has_charging = $${idx++}`);
      values.push(d.has_charging);
    }
    if (d.has_entertainment !== undefined) {
      updates.push(`has_entertainment = $${idx++}`);
      values.push(d.has_entertainment);
    }
    if (d.has_meal !== undefined) {
      updates.push(`has_meal = $${idx++}`);
      values.push(d.has_meal);
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const isOnlyStatus =
      Object.keys(d).length === 1 && d.status !== undefined;
    if (!isOnlyStatus) {
      updates.push(`verification_status = $${idx++}`);
      values.push("no_request");
      updates.push(`status = $${idx++}`);
      values.push("inactive");
    }
    updates.push("updated_at = now()");
    values.push(flightId, listingId);
    const whereIdx = idx;
    await query(
      `UPDATE flights SET ${updates.join(", ")} WHERE id = $${whereIdx} AND listing_id = $${whereIdx + 1}`,
      values
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Update flight error:", err);
    res.status(500).json({ error: "Failed to update flight" });
  }
});

/** DELETE /api/listings/:listingId/flights/:flightId */
router.delete("/:flightId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
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
    await query("DELETE FROM flights WHERE id = $1 AND listing_id = $2", [flightId, listingId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete flight error:", err);
    res.status(500).json({ error: "Failed to delete flight" });
  }
});

router.use("/:flightId/routes", flightRoutesRoutes);
router.use("/:flightId/schedules", flightSchedulesRoutes);

export default router;

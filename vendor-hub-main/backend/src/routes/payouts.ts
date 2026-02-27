/**
 * Vendor payouts: list the logged-in vendor's listings with total revenue (90% share) and booking count.
 * Uses same DB as main app (vendor_listings + booking tables).
 */

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
const VENDOR_SHARE = 0.9;

type ListingRow = { listingId: string; listingName: string; type: string; totalShareCents: number; bookingCount: number };

router.get("/listings", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  if (!vendorId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const map = new Map<string, { name: string; type: string; totalCents: number; bookingCount: number }>();

    // Use same ownership as My Listings page: listings.vendor_id first, then fallback to vendor_listings
    try {
      const byVendorId = await query<{ id: string; name: string | null; type: string | null }>(
        `SELECT id::text, name, TRIM(type) AS type FROM listings WHERE vendor_id = $1 ORDER BY created_at DESC`,
        [vendorId]
      );
      for (const r of byVendorId.rows) {
        map.set(r.id, {
          name: r.name?.trim() || r.id,
          type: r.type || "listing",
          totalCents: 0,
          bookingCount: 0,
        });
      }
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
      if (code === "42703" || (map.size === 0)) {
        try {
          const vlRows = await query<{ listing_id: string; listing_name: string | null; listing_type: string | null }>(
            `SELECT vl.listing_id::text, l.name AS listing_name, TRIM(l.type) AS listing_type
             FROM vendor_listings vl
             LEFT JOIN listings l ON l.id = vl.listing_id
             WHERE vl.vendor_id = $1`,
            [vendorId]
          );
          for (const r of vlRows.rows) {
            map.set(r.listing_id, {
              name: r.listing_name?.trim() || r.listing_id,
              type: r.listing_type || "listing",
              totalCents: 0,
              bookingCount: 0,
            });
          }
        } catch (e2) {
          console.error("[payouts] vendor_listings fallback", e2);
        }
      } else {
        console.error("[payouts] listings by vendor_id", e);
      }
    }

    const add = (listingId: string, listingName: string, totalCents: number, count: number) => {
      const share = Math.round(totalCents * VENDOR_SHARE);
      const cur = map.get(listingId);
      if (cur) {
        cur.totalCents += share;
        cur.bookingCount += count;
      } else {
        map.set(listingId, { name: listingName || listingId, type: "listing", totalCents: share, bookingCount: count });
      }
    };

    const listingIds = Array.from(map.keys());
    if (listingIds.length === 0) {
      const listings: ListingRow[] = [];
      res.json({ listings });
      return;
    }

    try {
      const transport = await query<{ listing_id: string; listing_name: string; total_cents: string; cnt: string }>(
        `SELECT COALESCE(tb.listing_id, b.listing_id)::text AS listing_id, l.name AS listing_name, COALESCE(SUM(tb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM transport_bookings tb
         LEFT JOIN buses b ON b.id = tb.bus_id
         LEFT JOIN listings l ON l.id = COALESCE(tb.listing_id, b.listing_id)
         WHERE COALESCE(tb.listing_id, b.listing_id) IS NOT NULL AND COALESCE(tb.listing_id, b.listing_id) = ANY($1::uuid[])
         GROUP BY COALESCE(tb.listing_id, b.listing_id), l.name`,
        [listingIds]
      );
      for (const r of transport.rows) {
        add(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0, parseInt(r.cnt, 10) || 0);
      }
    } catch (e) {
      console.error("[payouts] transport", e);
    }

    try {
      const car = await query<{ listing_id: string; listing_name: string; total_cents: string; cnt: string }>(
        `SELECT cb.listing_id::text, l.name AS listing_name, COALESCE(SUM(cb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM car_bookings cb
         JOIN listings l ON l.id = cb.listing_id
         WHERE cb.listing_id = ANY($1::uuid[]) AND cb.paid_at IS NOT NULL AND cb.status NOT IN ('rejected')
         GROUP BY cb.listing_id, l.name`,
        [listingIds]
      );
      for (const r of car.rows) {
        add(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0, parseInt(r.cnt, 10) || 0);
      }
    } catch (e) {
      console.error("[payouts] car", e);
    }

    try {
      const flight = await query<{ listing_id: string; listing_name: string; total_cents: string; cnt: string }>(
        `SELECT fb.listing_id::text, l.name AS listing_name, COALESCE(SUM(fb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM flight_bookings fb
         JOIN listings l ON l.id = fb.listing_id
         WHERE fb.listing_id = ANY($1::uuid[]) AND fb.paid_at IS NOT NULL AND fb.status NOT IN ('rejected')
         GROUP BY fb.listing_id, l.name`,
        [listingIds]
      );
      for (const r of flight.rows) {
        add(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0, parseInt(r.cnt, 10) || 0);
      }
    } catch (e) {
      console.error("[payouts] flight", e);
    }

    try {
      const hotel = await query<{ listing_id: string; listing_name: string; total_cents: string; cnt: string }>(
        `SELECT hb.listing_id::text, l.name AS listing_name, COALESCE(SUM(hb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM hotel_bookings hb
         JOIN listings l ON l.id = hb.listing_id
         WHERE hb.listing_id = ANY($1::uuid[]) AND hb.status = 'confirmed' AND hb.total_cents > 0
         GROUP BY hb.listing_id, l.name`,
        [listingIds]
      );
      for (const r of hotel.rows) {
        add(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0, parseInt(r.cnt, 10) || 0);
      }
    } catch (e) {
      console.error("[payouts] hotel", e);
    }

    try {
      const exp = await query<{ listing_id: string; listing_name: string; total_cents: string; cnt: string }>(
        `SELECT ex.listing_id::text, l.name AS listing_name, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM experience_bookings eb
         JOIN experiences ex ON ex.id = eb.experience_id
         JOIN listings l ON l.id = ex.listing_id
         WHERE ex.listing_id = ANY($1::uuid[]) AND eb.paid_at IS NOT NULL
         GROUP BY ex.listing_id, l.name`,
        [listingIds]
      );
      for (const r of exp.rows) {
        add(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0, parseInt(r.cnt, 10) || 0);
      }
    } catch (e) {
      console.error("[payouts] experience", e);
    }

    try {
      const evt = await query<{ listing_id: string; listing_name: string; total_cents: string; cnt: string }>(
        `SELECT e.listing_id::text, l.name AS listing_name, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM event_bookings eb
         JOIN events e ON e.id = eb.event_id
         JOIN listings l ON l.id = e.listing_id
         WHERE e.listing_id = ANY($1::uuid[]) AND eb.paid_at IS NOT NULL
         GROUP BY e.listing_id, l.name`,
        [listingIds]
      );
      for (const r of evt.rows) {
        add(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0, parseInt(r.cnt, 10) || 0);
      }
    } catch (e) {
      console.error("[payouts] event", e);
    }

    const listings: ListingRow[] = Array.from(map.entries()).map(([listingId, v]) => ({
      listingId,
      listingName: v.name,
      type: v.type,
      totalShareCents: v.totalCents,
      bookingCount: v.bookingCount,
    }));

    res.json({ listings });
  } catch (e) {
    console.error("[payouts] listings", e);
    res.status(500).json({ error: "Failed to load payout listings" });
  }
});

/** GET /api/payouts/transactions — List payout transactions for the logged-in vendor. */
router.get("/transactions", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  if (!vendorId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const rows = await query<{ id: string; amount_cents: string; status: string; created_at: string; vendor_confirmed_at: string | null }>(
      `SELECT id::text, amount_cents::text, status, created_at::text, vendor_confirmed_at::text
       FROM payout_transactions WHERE vendor_id = $1 ORDER BY created_at DESC`,
      [vendorId]
    );
    res.json({
      transactions: rows.rows.map((r) => ({
        id: r.id,
        amountCents: parseInt(r.amount_cents, 10) || 0,
        status: r.status,
        createdAt: r.created_at,
        vendorConfirmedAt: r.vendor_confirmed_at || undefined,
      })),
    });
  } catch (e) {
    console.error("[payouts] transactions list", e);
    res.status(500).json({ error: "Failed to load payout transactions" });
  }
});

/** PATCH /api/payouts/transactions/:id/confirm — Mark transaction as received (vendor confirms). */
router.patch("/transactions/:id/confirm", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  const { id } = req.params;
  if (!vendorId || !id) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const r = await query<{ id: string; status: string }>(
      `UPDATE payout_transactions SET status = 'completed', vendor_confirmed_at = now()
       WHERE id = $1 AND vendor_id = $2 AND status = 'pending_vendor_confirmation'
       RETURNING id::text, status`,
      [id, vendorId]
    );
    if (r.rows.length === 0) {
      res.status(404).json({ error: "Transaction not found or already confirmed" });
      return;
    }
    res.json({ id: r.rows[0].id, status: r.rows[0].status });
  } catch (e) {
    console.error("[payouts] confirm transaction", e);
    res.status(500).json({ error: "Failed to confirm payout" });
  }
});

/** GET /api/payouts/listings/:listingId — Detail for one listing: totals + fleets (bus, car, flight, hotel) with revenue. */
router.get("/listings/:listingId", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  const listingId = req.params.listingId;
  if (!vendorId || !listingId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    let owned = false;
    try {
      const r = await query<{ id: string }>("SELECT id FROM listings WHERE id = $1 AND vendor_id = $2", [listingId, vendorId]);
      owned = r.rows.length > 0;
    } catch {
      // vendor_id column may not exist
    }
    if (!owned) {
      try {
        const vl = await query<{ listing_id: string }>("SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2", [listingId, vendorId]);
        owned = vl.rows.length > 0;
      } catch {
        //
      }
    }
    if (!owned) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    let listingName = listingId;
    let listingType = "listing";
    try {
      const l = await query<{ name: string | null; type: string | null }>("SELECT name, TRIM(type) AS type FROM listings WHERE id = $1", [listingId]);
      if (l.rows[0]) {
        listingName = l.rows[0].name?.trim() || listingId;
        listingType = l.rows[0].type || "listing";
      }
    } catch {
      //
    }

    let totalShareCents = 0;
    let bookingCount = 0;

    const addCents = (cents: number, count: number) => {
      totalShareCents += Math.round(cents * VENDOR_SHARE);
      bookingCount += count;
    };

    try {
      const tb = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(tb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM transport_bookings tb LEFT JOIN buses b ON b.id = tb.bus_id
         WHERE COALESCE(tb.listing_id, b.listing_id) = $1`,
        [listingId]
      );
      addCents(parseInt(tb.rows[0]?.total_cents ?? "0", 10), parseInt(tb.rows[0]?.cnt ?? "0", 10));
    } catch {
      //
    }
    try {
      const cb = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM car_bookings WHERE listing_id = $1 AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
        [listingId]
      );
      addCents(parseInt(cb.rows[0]?.total_cents ?? "0", 10), parseInt(cb.rows[0]?.cnt ?? "0", 10));
    } catch {
      //
    }
    try {
      const fb = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM flight_bookings WHERE listing_id = $1 AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
        [listingId]
      );
      addCents(parseInt(fb.rows[0]?.total_cents ?? "0", 10), parseInt(fb.rows[0]?.cnt ?? "0", 10));
    } catch {
      //
    }
    try {
      const hb = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM hotel_bookings WHERE listing_id = $1 AND status = 'confirmed' AND total_cents > 0`,
        [listingId]
      );
      addCents(parseInt(hb.rows[0]?.total_cents ?? "0", 10), parseInt(hb.rows[0]?.cnt ?? "0", 10));
    } catch {
      //
    }
    try {
      const exp = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(eb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM experience_bookings eb JOIN experiences ex ON ex.id = eb.experience_id WHERE ex.listing_id = $1 AND eb.paid_at IS NOT NULL`,
        [listingId]
      );
      addCents(parseInt(exp.rows[0]?.total_cents ?? "0", 10), parseInt(exp.rows[0]?.cnt ?? "0", 10));
    } catch {
      //
    }
    try {
      const evt = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(eb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM event_bookings eb JOIN events e ON e.id = eb.event_id WHERE e.listing_id = $1 AND eb.paid_at IS NOT NULL`,
        [listingId]
      );
      addCents(parseInt(evt.rows[0]?.total_cents ?? "0", 10), parseInt(evt.rows[0]?.cnt ?? "0", 10));
    } catch {
      //
    }

    const FLEET_ENTITY_TABLES: { fleetId: string; fleetName: string; table: string; listingCol: string }[] = [
      { fleetId: "bus", fleetName: "Bus bookings", table: "buses", listingCol: "listing_id" },
      { fleetId: "car", fleetName: "Car bookings", table: "cars", listingCol: "listing_id" },
      { fleetId: "flight", fleetName: "Flight bookings", table: "flights", listingCol: "listing_id" },
      { fleetId: "hotel", fleetName: "Hotel bookings", table: "hotel_branches", listingCol: "listing_id" },
    ];

    const fleets: { fleetId: string; fleetName: string; entityId?: string; entityName?: string; totalShareCents: number; bookingCount: number }[] = [];

    for (const f of FLEET_ENTITY_TABLES) {
      try {
        if (f.fleetId === "bus") {
          const buses = await query<{ id: string; name: string | null; bus_number: string | null }>(
            `SELECT id::text, name, bus_number FROM buses WHERE listing_id = $1`,
            [listingId]
          );
          for (const b of buses.rows) {
            const r = await query<{ total_cents: string; cnt: string }>(
              `SELECT COALESCE(SUM(tb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM transport_bookings tb WHERE tb.bus_id = $1`,
              [b.id]
            );
            const cents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
            const cnt = parseInt(r.rows[0]?.cnt ?? "0", 10);
            fleets.push({
              fleetId: "bus",
              fleetName: "Bus",
              entityId: b.id,
              entityName: (b.name?.trim() || b.bus_number?.trim() || b.id).slice(0, 80),
              totalShareCents: Math.round(cents * VENDOR_SHARE),
              bookingCount: cnt,
            });
          }
        } else if (f.fleetId === "car") {
          const cars = await query<{ id: string; name: string | null }>(
            `SELECT id::text, name FROM cars WHERE listing_id = $1`,
            [listingId]
          );
          for (const c of cars.rows) {
            const r = await query<{ total_cents: string; cnt: string }>(
              `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM car_bookings WHERE car_id = $1 AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
              [c.id]
            );
            const cents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
            const cnt = parseInt(r.rows[0]?.cnt ?? "0", 10);
            fleets.push({
              fleetId: "car",
              fleetName: "Car",
              entityId: c.id,
              entityName: (c.name?.trim() || c.id).slice(0, 80),
              totalShareCents: Math.round(cents * VENDOR_SHARE),
              bookingCount: cnt,
            });
          }
        } else if (f.fleetId === "flight") {
          const flights = await query<{ id: string; flight_number: string | null; airline_name: string | null }>(
            `SELECT id::text, flight_number, airline_name FROM flights WHERE listing_id = $1`,
            [listingId]
          );
          for (const fl of flights.rows) {
            const r = await query<{ total_cents: string; cnt: string }>(
              `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM flight_bookings WHERE flight_id = $1 AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
              [fl.id]
            );
            const cents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
            const cnt = parseInt(r.rows[0]?.cnt ?? "0", 10);
            const displayName = fl.flight_number?.trim() || fl.airline_name?.trim() || fl.id;
            fleets.push({
              fleetId: "flight",
              fleetName: "Flight",
              entityId: fl.id,
              entityName: displayName.slice(0, 80),
              totalShareCents: Math.round(cents * VENDOR_SHARE),
              bookingCount: cnt,
            });
          }
        } else if (f.fleetId === "hotel") {
          const branches = await query<{ id: string; name: string | null }>(
            `SELECT id::text, name FROM hotel_branches WHERE listing_id = $1`,
            [listingId]
          );
          for (const hb of branches.rows) {
            const r = await query<{ total_cents: string; cnt: string }>(
              `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM hotel_bookings WHERE hotel_branch_id = $1 AND status = 'confirmed' AND total_cents > 0`,
              [hb.id]
            );
            const cents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
            const cnt = parseInt(r.rows[0]?.cnt ?? "0", 10);
            fleets.push({
              fleetId: "hotel",
              fleetName: "Hotel",
              entityId: hb.id,
              entityName: (hb.name?.trim() || hb.id).slice(0, 80),
              totalShareCents: Math.round(cents * VENDOR_SHARE),
              bookingCount: cnt,
            });
          }
        }
      } catch (e) {
        console.error("[payouts] listing fleet", f.fleetId, e);
      }
    }

    res.json({
      listingName,
      type: listingType,
      totalShareCents,
      bookingCount,
      pendingCents: 0,
      fleets,
    });
  } catch (e) {
    console.error("[payouts] listing detail", e);
    res.status(500).json({ error: "Failed to load listing" });
  }
});

const FLEET_LABELS: Record<string, string> = {
  bus: "Bus bookings",
  car: "Car bookings",
  flight: "Flight bookings",
  hotel: "Hotel bookings",
};

async function vendorOwnsListing(vendorId: string, listingId: string): Promise<boolean> {
  try {
    const r = await query<{ id: string }>("SELECT id FROM listings WHERE id = $1 AND vendor_id = $2", [listingId, vendorId]);
    if (r.rows.length > 0) return true;
  } catch {
    //
  }
  try {
    const vl = await query<{ listing_id: string }>("SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2", [listingId, vendorId]);
    return vl.rows.length > 0;
  } catch {
    return false;
  }
}

type FleetBookingRow = { id: string; bookingRef: string; userName: string; amountCents: number; paidAt: string | null; status: string };

/** GET /api/payouts/listings/:listingId/fleets/:fleetType/entity/:entityId — Summary + bookings for one bus/car/flight/hotel. */
router.get("/listings/:listingId/fleets/:fleetType/entity/:entityId", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  const { listingId, fleetType, entityId } = req.params;
  if (!vendorId || !listingId || !fleetType || !entityId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!["bus", "car", "flight", "hotel"].includes(fleetType)) {
    res.status(404).json({ error: "Fleet not found" });
    return;
  }
  try {
    const owned = await vendorOwnsListing(vendorId, listingId);
    if (!owned) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    let entityName = entityId;
    let totalShareCents = 0;
    let bookingCount = 0;
    const bookings: FleetBookingRow[] = [];

    if (fleetType === "bus") {
      const nameRow = await query<{ name: string | null; bus_number: string | null }>("SELECT name, bus_number FROM buses WHERE id = $1 AND listing_id = $2", [entityId, listingId]);
      if (nameRow.rows[0]) entityName = nameRow.rows[0].name?.trim() || nameRow.rows[0].bus_number?.trim() || entityId;
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM transport_bookings WHERE bus_id = $1`,
        [entityId]
      );
      totalShareCents = Math.round(parseInt(r.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
      const rows = await query<{ id: string; ref: string; user_name: string | null; total_cents: number; created_at: string }>(
        `SELECT tb.id::text, tb.booking_id AS ref, u.full_name AS user_name, tb.total_cents, tb.created_at::text
         FROM transport_bookings tb LEFT JOIN users u ON u.id = tb.user_id WHERE tb.bus_id = $1 ORDER BY tb.created_at DESC`,
        [entityId]
      );
      rows.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          bookingRef: row.ref,
          userName: row.user_name?.trim() || "—",
          amountCents: row.total_cents ?? 0,
          paidAt: row.created_at,
          status: "Paid",
        })
      );
    } else if (fleetType === "car") {
      const nameRow = await query<{ name: string | null }>("SELECT name FROM cars WHERE id = $1 AND listing_id = $2", [entityId, listingId]);
      if (nameRow.rows[0]) entityName = nameRow.rows[0].name?.trim() || entityId;
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM car_bookings WHERE car_id = $1 AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
        [entityId]
      );
      totalShareCents = Math.round(parseInt(r.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
      const rows = await query<{ id: string; ref: string; user_name: string | null; total_cents: number | null; paid_at: string | null }>(
        `SELECT cb.id::text, cb.booking_ref AS ref, u.full_name AS user_name, cb.total_cents, cb.paid_at::text
         FROM car_bookings cb LEFT JOIN users u ON u.id = cb.user_id WHERE cb.car_id = $1 AND cb.status NOT IN ('rejected') ORDER BY COALESCE(cb.paid_at, cb.created_at) DESC`,
        [entityId]
      );
      rows.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          bookingRef: row.ref,
          userName: row.user_name?.trim() || "—",
          amountCents: row.total_cents ?? 0,
          paidAt: row.paid_at,
          status: row.paid_at ? "Paid" : "Pending",
        })
      );
    } else if (fleetType === "flight") {
      const nameRow = await query<{ flight_number: string | null; airline_name: string | null }>("SELECT flight_number, airline_name FROM flights WHERE id = $1 AND listing_id = $2", [entityId, listingId]);
      if (nameRow.rows[0]) entityName = nameRow.rows[0].flight_number?.trim() || nameRow.rows[0].airline_name?.trim() || entityId;
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM flight_bookings WHERE flight_id = $1 AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
        [entityId]
      );
      totalShareCents = Math.round(parseInt(r.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
      const rows = await query<{ id: string; ref: string; user_name: string | null; total_cents: number; paid_at: string | null }>(
        `SELECT fb.id::text, fb.booking_ref AS ref, u.full_name AS user_name, fb.total_cents, fb.paid_at::text
         FROM flight_bookings fb LEFT JOIN users u ON u.id = fb.user_id WHERE fb.flight_id = $1 AND fb.status NOT IN ('rejected') ORDER BY COALESCE(fb.paid_at, fb.created_at) DESC`,
        [entityId]
      );
      rows.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          bookingRef: row.ref,
          userName: row.user_name?.trim() || "—",
          amountCents: row.total_cents ?? 0,
          paidAt: row.paid_at,
          status: row.paid_at ? "Paid" : "Pending",
        })
      );
    } else if (fleetType === "hotel") {
      const nameRow = await query<{ name: string | null }>("SELECT name FROM hotel_branches WHERE id = $1 AND listing_id = $2", [entityId, listingId]);
      if (nameRow.rows[0]) entityName = nameRow.rows[0].name?.trim() || entityId;
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM hotel_bookings WHERE hotel_branch_id = $1 AND status = 'confirmed' AND total_cents > 0`,
        [entityId]
      );
      totalShareCents = Math.round(parseInt(r.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
      const rows = await query<{ id: string; ref: string; user_name: string | null; total_cents: number | null; status: string; updated_at: string }>(
        `SELECT hb.id::text, hb.booking_ref AS ref, u.full_name AS user_name, hb.total_cents, hb.status, hb.updated_at::text
         FROM hotel_bookings hb LEFT JOIN users u ON u.id = hb.user_id WHERE hb.hotel_branch_id = $1 ORDER BY hb.updated_at DESC`,
        [entityId]
      );
      rows.rows.forEach((row) => {
        const paid = row.status === "confirmed" && (row.total_cents ?? 0) > 0;
        bookings.push({
          id: row.id,
          bookingRef: row.ref,
          userName: row.user_name?.trim() || "—",
          amountCents: row.total_cents ?? 0,
          paidAt: paid ? row.updated_at : null,
          status: paid ? "Paid" : "Pending",
        });
      });
    }

    res.json({
      fleetName: `${FLEET_LABELS[fleetType] ?? fleetType} – ${entityName}`,
      totalShareCents,
      bookingCount,
      bookings,
    });
  } catch (e) {
    console.error("[payouts] fleet entity detail", e);
    res.status(500).json({ error: "Failed to load fleet" });
  }
});

/** GET /api/payouts/listings/:listingId/fleets/:fleetId — Fleet summary + bookings for bus/car/flight/hotel (all of that type). */
router.get("/listings/:listingId/fleets/:fleetId", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  const { listingId, fleetId } = req.params;
  if (!vendorId || !listingId || !fleetId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!["bus", "car", "flight", "hotel"].includes(fleetId)) {
    res.status(404).json({ error: "Fleet not found" });
    return;
  }
  try {
    const owned = await vendorOwnsListing(vendorId, listingId);
    if (!owned) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const fleetName = FLEET_LABELS[fleetId] ?? fleetId;
    let totalShareCents = 0;
    let bookingCount = 0;
    const bookings: FleetBookingRow[] = [];

    if (fleetId === "bus") {
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(tb.total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM transport_bookings tb LEFT JOIN buses b ON b.id = tb.bus_id WHERE COALESCE(tb.listing_id, b.listing_id) = $1`,
        [listingId]
      );
      totalShareCents = Math.round(parseInt(r.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
      const rows = await query<{ id: string; ref: string; user_name: string | null; total_cents: number; created_at: string }>(
        `SELECT tb.id::text, tb.booking_id AS ref, u.full_name AS user_name, tb.total_cents, tb.created_at::text
         FROM transport_bookings tb LEFT JOIN buses b ON b.id = tb.bus_id LEFT JOIN users u ON u.id = tb.user_id
         WHERE COALESCE(tb.listing_id, b.listing_id) = $1 ORDER BY tb.created_at DESC`,
        [listingId]
      );
      rows.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          bookingRef: row.ref,
          userName: row.user_name?.trim() || "—",
          amountCents: row.total_cents ?? 0,
          paidAt: row.created_at,
          status: "Paid",
        })
      );
    } else if (fleetId === "car") {
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM car_bookings WHERE listing_id = $1 AND status NOT IN ('rejected')`,
        [listingId]
      );
      const paidRes = await query<{ paid_cents: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS paid_cents FROM car_bookings WHERE listing_id = $1 AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
        [listingId]
      );
      const paidCents = parseInt(paidRes.rows[0]?.paid_cents ?? "0", 10);
      totalShareCents = Math.round(paidCents * VENDOR_SHARE);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
      const rows = await query<{ id: string; ref: string; user_name: string | null; total_cents: number | null; paid_at: string | null }>(
        `SELECT cb.id::text, cb.booking_ref AS ref, u.full_name AS user_name, cb.total_cents, cb.paid_at::text
         FROM car_bookings cb LEFT JOIN users u ON u.id = cb.user_id WHERE cb.listing_id = $1 AND cb.status NOT IN ('rejected') ORDER BY COALESCE(cb.paid_at, cb.created_at) DESC`,
        [listingId]
      );
      rows.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          bookingRef: row.ref,
          userName: row.user_name?.trim() || "—",
          amountCents: row.total_cents ?? 0,
          paidAt: row.paid_at,
          status: row.paid_at ? "Paid" : "Pending",
        })
      );
    } else if (fleetId === "flight") {
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM flight_bookings WHERE listing_id = $1 AND status NOT IN ('rejected')`,
        [listingId]
      );
      const paidRes = await query<{ paid_cents: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS paid_cents FROM flight_bookings WHERE listing_id = $1 AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
        [listingId]
      );
      const paidCents = parseInt(paidRes.rows[0]?.paid_cents ?? "0", 10);
      totalShareCents = Math.round(paidCents * VENDOR_SHARE);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
      const rows = await query<{ id: string; ref: string; user_name: string | null; total_cents: number; paid_at: string | null }>(
        `SELECT fb.id::text, fb.booking_ref AS ref, u.full_name AS user_name, fb.total_cents, fb.paid_at::text
         FROM flight_bookings fb LEFT JOIN users u ON u.id = fb.user_id WHERE fb.listing_id = $1 AND fb.status NOT IN ('rejected') ORDER BY COALESCE(fb.paid_at, fb.created_at) DESC`,
        [listingId]
      );
      rows.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          bookingRef: row.ref,
          userName: row.user_name?.trim() || "—",
          amountCents: row.total_cents ?? 0,
          paidAt: row.paid_at,
          status: row.paid_at ? "Paid" : "Pending",
        })
      );
    } else if (fleetId === "hotel") {
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM hotel_bookings WHERE listing_id = $1 AND status = 'confirmed' AND total_cents > 0`,
        [listingId]
      );
      totalShareCents = Math.round(parseInt(r.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
      const rows = await query<{ id: string; ref: string; user_name: string | null; total_cents: number | null; status: string; updated_at: string }>(
        `SELECT hb.id::text, hb.booking_ref AS ref, u.full_name AS user_name, hb.total_cents, hb.status, hb.updated_at::text
         FROM hotel_bookings hb LEFT JOIN users u ON u.id = hb.user_id WHERE hb.listing_id = $1 ORDER BY hb.updated_at DESC`,
        [listingId]
      );
      rows.rows.forEach((row) => {
        const paid = row.status === "confirmed" && (row.total_cents ?? 0) > 0;
        bookings.push({
          id: row.id,
          bookingRef: row.ref,
          userName: row.user_name?.trim() || "—",
          amountCents: row.total_cents ?? 0,
          paidAt: paid ? row.updated_at : null,
          status: paid ? "Paid" : "Pending",
        });
      });
    }

    res.json({
      fleetName,
      totalShareCents,
      bookingCount,
      bookings,
    });
  } catch (e) {
    console.error("[payouts] fleet detail", e);
    res.status(500).json({ error: "Failed to load fleet" });
  }
});

export default router;

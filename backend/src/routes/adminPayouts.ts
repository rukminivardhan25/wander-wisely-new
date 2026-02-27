/**
 * Admin payouts: aggregate paid bookings by vendor (via listing → vendor_listings),
 * by listing, and by "fleet" (Bus, Car, Flight, Hotel only). Experiences and events
 * are listings with no fleet. 10% admin / 90% vendor.
 */

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();
const VENDOR_SHARE = 0.9;
const ADMIN_SHARE = 0.1;

type BookingRow = { id: string; booking_ref: string; user_name: string; amount_cents: number; paid_at: string | null; status: string };

/** Only these are "fleet" in vendor-hub (under a listing). Experiences and events are listing types with no fleet. */
const FLEET_TYPES = [
  { id: "bus", name: "Bus bookings" },
  { id: "car", name: "Car bookings" },
  { id: "flight", name: "Flight bookings" },
  { id: "hotel", name: "Hotel bookings" },
] as const;

/** Entity tables: listing has a fleet only if it has buses, cars, flights, or hotel_branches. Not experiences/events. */
const FLEET_ENTITY_TABLES: { fleetId: string; fleetName: string; table: string; listingCol: string }[] = [
  { fleetId: "bus", fleetName: "Bus bookings", table: "buses", listingCol: "listing_id" },
  { fleetId: "car", fleetName: "Car bookings", table: "cars", listingCol: "listing_id" },
  { fleetId: "flight", fleetName: "Flight bookings", table: "flights", listingCol: "listing_id" },
  { fleetId: "hotel", fleetName: "Hotel bookings", table: "hotel_branches", listingCol: "listing_id" },
];

/** Returns fleet types that actually exist for this listing (buses, cars, flights, hotel_branches only). Experiences and events are not fleet. */
async function getFleetsForListing(listingId: string): Promise<{ fleetId: string; fleetName: string }[]> {
  const result: { fleetId: string; fleetName: string }[] = [];
  for (const f of FLEET_ENTITY_TABLES) {
    try {
      const r = await query<{ n: string }>(
        `SELECT '1' AS n FROM ${f.table} WHERE ${f.listingCol} = $1 LIMIT 1`,
        [listingId]
      );
      if (r.rows.length > 0) result.push({ fleetId: f.fleetId, fleetName: f.fleetName });
    } catch {
      // table may not exist in this DB
    }
  }
  return result;
}

/** GET /api/admin/payouts/hierarchy — All vendors, their listings, and fleets under each listing (for export/reference). */
router.get("/hierarchy", async (_req: Request, res: Response): Promise<void> => {
  try {
    type VendorRow = { vendor_id: string; vendor_name: string };
    type ListingRow = { vendor_id: string; listing_id: string; listing_name: string | null };
    const vendors: { vendorId: string; vendorName: string; listings: { listingId: string; listingName: string; fleets: { fleetId: string; fleetName: string }[] }[] }[] = [];

    let vendorRows: VendorRow[] = [];
    try {
      const v = await query<VendorRow>("SELECT id::text AS vendor_id, name AS vendor_name FROM vendors ORDER BY name");
      vendorRows = v.rows;
    } catch (e) {
      console.error("[admin/payouts] hierarchy vendors", e);
      res.json({ vendors: [] });
      return;
    }

    let listingRows: ListingRow[] = [];
    try {
      const l = await query<ListingRow>(
        `SELECT vl.vendor_id::text, vl.listing_id::text, l.name AS listing_name
         FROM vendor_listings vl
         LEFT JOIN listings l ON l.id = vl.listing_id
         ORDER BY vl.vendor_id, l.name`
      );
      listingRows = l.rows;
    } catch (e) {
      console.error("[admin/payouts] hierarchy vendor_listings", e);
    }

    const listingsByVendor = new Map<string, { listingId: string; listingName: string }[]>();
    for (const r of listingRows) {
      const list = listingsByVendor.get(r.vendor_id) ?? [];
      list.push({ listingId: r.listing_id, listingName: r.listing_name?.trim() || r.listing_id });
      listingsByVendor.set(r.vendor_id, list);
    }

    for (const v of vendorRows) {
      const listingList = listingsByVendor.get(v.vendor_id) ?? [];
      const listingsWithFleets = await Promise.all(
        listingList.map(async (li) => {
          const fleets = await getFleetsForListing(li.listingId);
          return { listingId: li.listingId, listingName: li.listingName, fleets };
        })
      );
      vendors.push({
        vendorId: v.vendor_id,
        vendorName: v.vendor_name?.trim() || v.vendor_id,
        listings: listingsWithFleets,
      });
    }

    res.json({ vendors });
  } catch (e) {
    console.error("[admin/payouts] hierarchy", e);
    res.status(500).json({ error: "Failed to load hierarchy" });
  }
});

/** GET /api/admin/payouts/summary — Total collected, admin share, total pending to vendors. */
router.get("/summary", async (_req: Request, res: Response): Promise<void> => {
  try {
    let totalPaidCents = 0;

    const sources: { type: string; paidCents: number }[] = [];

    try {
      const transport = await query<{ total_cents: number }>(
        `SELECT COALESCE(SUM(total_cents), 0)::bigint AS total_cents FROM transport_bookings`
      );
      const t = Number(transport.rows[0]?.total_cents ?? 0);
      totalPaidCents += t;
      if (t > 0) sources.push({ type: "Bus", paidCents: t });
    } catch (e) {
      console.error("[admin/payouts] transport summary", e);
    }

    try {
      const car = await query<{ total_cents: number }>(
        `SELECT COALESCE(SUM(total_cents), 0)::bigint AS total_cents FROM car_bookings WHERE paid_at IS NOT NULL AND status NOT IN ('rejected')`
      );
      const c = Number(car.rows[0]?.total_cents ?? 0);
      totalPaidCents += c;
      if (c > 0) sources.push({ type: "Car", paidCents: c });
    } catch (e) {
      console.error("[admin/payouts] car summary", e);
    }

    try {
      const flight = await query<{ total_cents: number }>(
        `SELECT COALESCE(SUM(total_cents), 0)::bigint AS total_cents FROM flight_bookings WHERE paid_at IS NOT NULL AND status NOT IN ('rejected')`
      );
      const f = Number(flight.rows[0]?.total_cents ?? 0);
      totalPaidCents += f;
      if (f > 0) sources.push({ type: "Flight", paidCents: f });
    } catch (e) {
      console.error("[admin/payouts] flight summary", e);
    }

    try {
      const hotel = await query<{ total_cents: number }>(
        `SELECT COALESCE(SUM(total_cents), 0)::bigint AS total_cents FROM hotel_bookings WHERE status = 'confirmed' AND total_cents > 0 AND status NOT IN ('rejected')`
      );
      const h = Number(hotel.rows[0]?.total_cents ?? 0);
      totalPaidCents += h;
      if (h > 0) sources.push({ type: "Hotel", paidCents: h });
    } catch (e) {
      console.error("[admin/payouts] hotel summary", e);
    }

    try {
      const exp = await query<{ total_cents: number }>(
        `SELECT COALESCE(SUM(eb.total_cents), 0)::bigint AS total_cents FROM experience_bookings eb WHERE eb.paid_at IS NOT NULL`
      );
      const e = Number(exp.rows[0]?.total_cents ?? 0);
      totalPaidCents += e;
      if (e > 0) sources.push({ type: "Experience", paidCents: e });
    } catch (e) {
      console.error("[admin/payouts] experience summary", e);
    }

    try {
      const evt = await query<{ total_cents: number }>(
        `SELECT COALESCE(SUM(eb.total_cents), 0)::bigint AS total_cents FROM event_bookings eb WHERE eb.paid_at IS NOT NULL`
      );
      const ev = Number(evt.rows[0]?.total_cents ?? 0);
      totalPaidCents += ev;
      if (ev > 0) sources.push({ type: "Event", paidCents: ev });
    } catch (e) {
      console.error("[admin/payouts] event summary", e);
    }

    const adminShareCents = Math.round(totalPaidCents * ADMIN_SHARE);
    const vendorShareCents = totalPaidCents - adminShareCents;

    let totalPaidToVendorsCents = 0;
    let totalPendingToVendorsCents = vendorShareCents;
    let awaitingVendorConfirmationCents = 0;
    try {
      const r = await query<{ completed_cents: string; pending_cents: string }>(
        `SELECT
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount_cents ELSE 0 END), 0)::bigint::text AS completed_cents,
          COALESCE(SUM(CASE WHEN status = 'pending_vendor_confirmation' THEN amount_cents ELSE 0 END), 0)::bigint::text AS pending_cents
         FROM payout_transactions`
      );
      const row = r.rows[0];
      totalPaidToVendorsCents = parseInt(row?.completed_cents ?? "0", 10) || 0;
      awaitingVendorConfirmationCents = parseInt(row?.pending_cents ?? "0", 10) || 0;
      totalPendingToVendorsCents = Math.max(0, vendorShareCents - totalPaidToVendorsCents);
    } catch {
      // table may not exist
    }

    res.json({
      totalCollectedCents: totalPaidCents,
      adminShareCents,
      vendorShareCents,
      totalPendingToVendorsCents,
      totalPaidToVendorsCents,
      awaitingVendorConfirmationCents,
    });
  } catch (e) {
    console.error("[admin/payouts] summary", e);
    res.status(500).json({ error: "Failed to load payout summary" });
  }
});

/** GET /api/admin/payouts/listing-counts — Listing count per vendor (for all vendors in DB). */
router.get("/listing-counts", async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts: Record<string, number> = {};
    try {
      const r = await query<{ vendor_id: string; cnt: string }>(
        `SELECT vendor_id::text, COUNT(*)::text AS cnt FROM vendor_listings GROUP BY vendor_id`
      );
      for (const row of r.rows) counts[row.vendor_id] = parseInt(row.cnt, 10) || 0;
    } catch (e) {
      console.error("[admin/payouts] listing-counts vendor_listings", e);
    }
    if (Object.keys(counts).length === 0) {
      try {
        const r = await query<{ vendor_id: string; cnt: string }>(
          `SELECT vendor_id::text, COUNT(*)::text AS cnt FROM listings WHERE vendor_id IS NOT NULL GROUP BY vendor_id`
        );
        for (const row of r.rows) counts[row.vendor_id] = parseInt(row.cnt, 10) || 0;
      } catch (e2) {
        console.error("[admin/payouts] listing-counts listings.vendor_id", e2);
      }
    }
    res.json({ counts });
  } catch (e) {
    console.error("[admin/payouts] listing-counts", e);
    res.status(500).json({ error: "Failed to load listing counts" });
  }
});

/** GET /api/admin/payouts/vendors — List vendors with vendor share, already paid, pending. */
router.get("/vendors", async (_req: Request, res: Response): Promise<void> => {
  try {
    const vendorTotals = new Map<string, { name: string; totalCents: number }>();

    try {
      const transport = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
        `SELECT vl.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(tb.total_cents), 0)::text AS total_cents
         FROM transport_bookings tb
         LEFT JOIN buses b ON b.id = tb.bus_id
         LEFT JOIN vendor_listings vl ON vl.listing_id = COALESCE(tb.listing_id, b.listing_id)
         LEFT JOIN vendors v ON v.id = vl.vendor_id
         WHERE vl.vendor_id IS NOT NULL
         GROUP BY vl.vendor_id, v.name`
      );
      for (const r of transport.rows) {
        if (!r.vendor_id) continue;
        const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
        const cur = vendorTotals.get(r.vendor_id);
        if (cur) cur.totalCents += cents;
        else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
      }
    } catch (e) {
      console.error("[admin/payouts] vendors transport", e);
    }

    try {
      const car = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
        `SELECT vl.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(cb.total_cents), 0)::text AS total_cents
         FROM car_bookings cb
         JOIN vendor_listings vl ON vl.listing_id = cb.listing_id
         JOIN vendors v ON v.id = vl.vendor_id
         WHERE cb.paid_at IS NOT NULL AND cb.status NOT IN ('rejected')
         GROUP BY vl.vendor_id, v.name`
      );
      for (const r of car.rows) {
        const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
        const cur = vendorTotals.get(r.vendor_id);
        if (cur) cur.totalCents += cents;
        else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
      }
    } catch (e) {
      console.error("[admin/payouts] vendors car", e);
    }

    try {
      const flight = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
        `SELECT vl.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(fb.total_cents), 0)::text AS total_cents
         FROM flight_bookings fb
         JOIN vendor_listings vl ON vl.listing_id = fb.listing_id
         JOIN vendors v ON v.id = vl.vendor_id
         WHERE fb.paid_at IS NOT NULL AND fb.status NOT IN ('rejected')
         GROUP BY vl.vendor_id, v.name`
      );
      for (const r of flight.rows) {
        const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
        const cur = vendorTotals.get(r.vendor_id);
        if (cur) cur.totalCents += cents;
        else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
      }
    } catch (e) {
      console.error("[admin/payouts] vendors flight", e);
    }

    try {
      const hotel = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
        `SELECT vl.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(hb.total_cents), 0)::text AS total_cents
         FROM hotel_bookings hb
         JOIN vendor_listings vl ON vl.listing_id = hb.listing_id
         JOIN vendors v ON v.id = vl.vendor_id
         WHERE hb.status = 'confirmed' AND hb.total_cents > 0
         GROUP BY vl.vendor_id, v.name`
      );
      for (const r of hotel.rows) {
        const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
        const cur = vendorTotals.get(r.vendor_id);
        if (cur) cur.totalCents += cents;
        else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
      }
    } catch (e) {
      console.error("[admin/payouts] vendors hotel", e);
    }

    try {
      const exp = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
        `SELECT vl.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents
         FROM experience_bookings eb
         JOIN experiences ex ON ex.id = eb.experience_id
         JOIN vendor_listings vl ON vl.listing_id = ex.listing_id
         JOIN vendors v ON v.id = vl.vendor_id
         WHERE eb.paid_at IS NOT NULL
         GROUP BY vl.vendor_id, v.name`
      );
      for (const r of exp.rows) {
        const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
        const cur = vendorTotals.get(r.vendor_id);
        if (cur) cur.totalCents += cents;
        else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
      }
    } catch (e) {
      console.error("[admin/payouts] vendors experience", e);
    }

    try {
      const evt = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
        `SELECT vl.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents
         FROM event_bookings eb
         JOIN events e ON e.id = eb.event_id
         JOIN vendor_listings vl ON vl.listing_id = e.listing_id
         JOIN vendors v ON v.id = vl.vendor_id
         WHERE eb.paid_at IS NOT NULL
         GROUP BY vl.vendor_id, v.name`
      );
      for (const r of evt.rows) {
        const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
        const cur = vendorTotals.get(r.vendor_id);
        if (cur) cur.totalCents += cents;
        else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
      }
    } catch (e) {
      console.error("[admin/payouts] vendors event", e);
    }

    // Fallback: when no totals from vendor_listings, aggregate by listings.vendor_id (e.g. vendor-hub setup)
    if (vendorTotals.size === 0) {
      try {
        const transport = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
          `SELECT l.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(tb.total_cents), 0)::text AS total_cents
           FROM transport_bookings tb
           LEFT JOIN buses b ON b.id = tb.bus_id
           JOIN listings l ON l.id = COALESCE(tb.listing_id, b.listing_id) AND l.vendor_id IS NOT NULL
           LEFT JOIN vendors v ON v.id = l.vendor_id
           GROUP BY l.vendor_id, v.name`
        );
        for (const r of transport.rows) {
          if (!r.vendor_id) continue;
          const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
          const cur = vendorTotals.get(r.vendor_id);
          if (cur) cur.totalCents += cents;
          else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
        }
      } catch (e) {
        console.error("[admin/payouts] vendors by listings.vendor_id transport", e);
      }
      try {
        const car = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
          `SELECT l.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(cb.total_cents), 0)::text AS total_cents
           FROM car_bookings cb
           JOIN listings l ON l.id = cb.listing_id AND l.vendor_id IS NOT NULL
           LEFT JOIN vendors v ON v.id = l.vendor_id
           WHERE cb.paid_at IS NOT NULL AND cb.status NOT IN ('rejected')
           GROUP BY l.vendor_id, v.name`
        );
        for (const r of car.rows) {
          const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
          const cur = vendorTotals.get(r.vendor_id);
          if (cur) cur.totalCents += cents;
          else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
        }
      } catch (e) {
        console.error("[admin/payouts] vendors by listings.vendor_id car", e);
      }
      try {
        const flight = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
          `SELECT l.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(fb.total_cents), 0)::text AS total_cents
           FROM flight_bookings fb
           JOIN listings l ON l.id = fb.listing_id AND l.vendor_id IS NOT NULL
           LEFT JOIN vendors v ON v.id = l.vendor_id
           WHERE fb.paid_at IS NOT NULL AND fb.status NOT IN ('rejected')
           GROUP BY l.vendor_id, v.name`
        );
        for (const r of flight.rows) {
          const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
          const cur = vendorTotals.get(r.vendor_id);
          if (cur) cur.totalCents += cents;
          else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
        }
      } catch (e) {
        console.error("[admin/payouts] vendors by listings.vendor_id flight", e);
      }
      try {
        const hotel = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
          `SELECT l.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(hb.total_cents), 0)::text AS total_cents
           FROM hotel_bookings hb
           JOIN listings l ON l.id = hb.listing_id AND l.vendor_id IS NOT NULL
           LEFT JOIN vendors v ON v.id = l.vendor_id
           WHERE hb.status = 'confirmed' AND hb.total_cents > 0
           GROUP BY l.vendor_id, v.name`
        );
        for (const r of hotel.rows) {
          const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
          const cur = vendorTotals.get(r.vendor_id);
          if (cur) cur.totalCents += cents;
          else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
        }
      } catch (e) {
        console.error("[admin/payouts] vendors by listings.vendor_id hotel", e);
      }
      try {
        const exp = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
          `SELECT l.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents
           FROM experience_bookings eb
           JOIN experiences ex ON ex.id = eb.experience_id
           JOIN listings l ON l.id = ex.listing_id AND l.vendor_id IS NOT NULL
           LEFT JOIN vendors v ON v.id = l.vendor_id
           WHERE eb.paid_at IS NOT NULL
           GROUP BY l.vendor_id, v.name`
        );
        for (const r of exp.rows) {
          const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
          const cur = vendorTotals.get(r.vendor_id);
          if (cur) cur.totalCents += cents;
          else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
        }
      } catch (e) {
        console.error("[admin/payouts] vendors by listings.vendor_id experience", e);
      }
      try {
        const evt = await query<{ vendor_id: string; vendor_name: string; total_cents: string }>(
          `SELECT l.vendor_id::text, v.name AS vendor_name, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents
           FROM event_bookings eb
           JOIN events e ON e.id = eb.event_id
           JOIN listings l ON l.id = e.listing_id AND l.vendor_id IS NOT NULL
           LEFT JOIN vendors v ON v.id = l.vendor_id
           WHERE eb.paid_at IS NOT NULL
           GROUP BY l.vendor_id, v.name`
        );
        for (const r of evt.rows) {
          const cents = Math.round((parseInt(r.total_cents, 10) || 0) * VENDOR_SHARE);
          const cur = vendorTotals.get(r.vendor_id);
          if (cur) cur.totalCents += cents;
          else vendorTotals.set(r.vendor_id, { name: r.vendor_name || r.vendor_id, totalCents: cents });
        }
      } catch (e) {
        console.error("[admin/payouts] vendors by listings.vendor_id event", e);
      }
    }

    const vendors = Array.from(vendorTotals.entries()).map(([vendorId, v]) => ({
      vendorId,
      vendorName: v.name,
      totalEarnedCents: v.totalCents,
      paidToVendorCents: 0,
      pendingCents: v.totalCents,
    }));

    // Override paidToVendorCents / pendingCents from payout_transactions (completed only)
    try {
      const paidRows = await query<{ vendor_id: string; paid_cents: string }>(
        `SELECT vendor_id::text, COALESCE(SUM(amount_cents), 0)::bigint::text AS paid_cents
         FROM payout_transactions WHERE status = 'completed' GROUP BY vendor_id`
      );
      const paidByVendor = new Map<string, number>();
      for (const r of paidRows.rows) paidByVendor.set(r.vendor_id, parseInt(r.paid_cents, 10) || 0);
      for (const v of vendors) {
        const paid = paidByVendor.get(v.vendorId) ?? 0;
        v.paidToVendorCents = paid;
        v.pendingCents = Math.max(0, v.totalEarnedCents - paid);
      }
    } catch (e) {
      // table may not exist yet
    }

    res.json({ vendors });
  } catch (e) {
    console.error("[admin/payouts] vendors", e);
    res.status(500).json({ error: "Failed to list payout vendors" });
  }
});

/** GET /api/admin/payouts/transactions — List all payout transactions (for Previous transactions page). */
router.get("/transactions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<{
      id: string;
      vendor_id: string;
      vendor_name: string | null;
      amount_cents: string;
      status: string;
      created_at: string;
      vendor_confirmed_at: string | null;
    }>(
      `SELECT pt.id::text, pt.vendor_id::text, v.name AS vendor_name, pt.amount_cents::text, pt.status,
              pt.created_at::text, pt.vendor_confirmed_at::text
       FROM payout_transactions pt
       LEFT JOIN vendors v ON v.id = pt.vendor_id
       ORDER BY pt.created_at DESC`
    );
    res.json({
      transactions: rows.rows.map((r) => ({
        id: r.id,
        vendorId: r.vendor_id,
        vendorName: r.vendor_name?.trim() || r.vendor_id,
        amountCents: parseInt(r.amount_cents, 10) || 0,
        status: r.status,
        createdAt: r.created_at,
        vendorConfirmedAt: r.vendor_confirmed_at || undefined,
      })),
    });
  } catch (e) {
    console.error("[admin/payouts] transactions list", e);
    res.status(500).json({ error: "Failed to list payout transactions" });
  }
});

/** POST /api/admin/payouts/transactions — Create a payout transaction (admin "Proceed to pay"). */
router.post("/transactions", async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId, amountCents } = req.body as { vendorId?: string; amountCents?: number };
    if (!vendorId || typeof amountCents !== "number" || amountCents < 0) {
      res.status(400).json({ error: "vendorId and amountCents (non-negative) required" });
      return;
    }
    const r = await query<{ id: string; created_at: string }>(
      `INSERT INTO payout_transactions (vendor_id, amount_cents, status)
       VALUES ($1, $2, 'pending_vendor_confirmation')
       RETURNING id::text, created_at::text`,
      [vendorId, Math.round(amountCents)]
    );
    const row = r.rows[0];
    if (!row) {
      res.status(500).json({ error: "Insert failed" });
      return;
    }
    res.status(201).json({
      id: row.id,
      vendorId,
      amountCents: Math.round(amountCents),
      status: "pending_vendor_confirmation",
      createdAt: row.created_at,
    });
  } catch (e) {
    console.error("[admin/payouts] create transaction", e);
    res.status(500).json({ error: "Failed to create payout transaction" });
  }
});

/** GET /api/admin/payouts/vendors/:vendorId/listings — Listings for vendor with total share. Shows all listings for vendor (from vendor_listings), then adds payout totals from bookings. */
router.get("/vendors/:vendorId/listings", async (req: Request, res: Response): Promise<void> => {
  const { vendorId } = req.params;
  try {
    const listingTotals = new Map<string, { name: string; totalCents: number }>();

    // First: load all listings that belong to this vendor (so we show them even with ₹0)
    // Prefer vendor_listings, but fall back to listings.vendor_id if vendor_listings is empty
    try {
      const vlRows = await query<{ listing_id: string; listing_name: string | null }>(
        `SELECT vl.listing_id::text, l.name AS listing_name
         FROM vendor_listings vl
         LEFT JOIN listings l ON l.id = vl.listing_id
         WHERE vl.vendor_id = $1`,
        [vendorId]
      );
      for (const r of vlRows.rows) {
        listingTotals.set(r.listing_id, { name: r.listing_name?.trim() || r.listing_id, totalCents: 0 });
      }
    } catch (e) {
      console.error("[admin/payouts] vendor_listings for vendor", e);
    }

    if (listingTotals.size === 0) {
      // Fallback: some setups use listings.vendor_id directly without vendor_listings rows
      try {
        const lRows = await query<{ id: string; name: string | null }>(
          `SELECT id::text AS id, name
           FROM listings
           WHERE vendor_id = $1`,
          [vendorId]
        );
        for (const r of lRows.rows) {
          listingTotals.set(r.id, { name: r.name?.trim() || r.id, totalCents: 0 });
        }
      } catch (e2) {
        console.error("[admin/payouts] listings.vendor_id for vendor", e2);
      }
    }

    const listingIds = Array.from(listingTotals.keys());

    const addListing = (listingId: string, listingName: string, cents: number) => {
      const share = Math.round(cents * VENDOR_SHARE);
      const cur = listingTotals.get(listingId);
      if (cur) cur.totalCents += share;
      else listingTotals.set(listingId, { name: listingName || listingId, totalCents: share });
    };

    if (listingIds.length > 0) {
      try {
        const transport = await query<{ listing_id: string; listing_name: string; total_cents: string }>(
          `SELECT tb.listing_id::text, l.name AS listing_name, COALESCE(SUM(tb.total_cents), 0)::text AS total_cents
           FROM transport_bookings tb
           LEFT JOIN listings l ON l.id = tb.listing_id
           WHERE tb.listing_id IS NOT NULL AND tb.listing_id = ANY($1::uuid[])
           GROUP BY tb.listing_id, l.name`,
          [listingIds]
        );
        for (const r of transport.rows) {
          addListing(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0);
        }
      } catch (e) {
        console.error("[admin/payouts] listings transport", e);
      }

      try {
        const car = await query<{ listing_id: string; listing_name: string; total_cents: string }>(
          `SELECT cb.listing_id::text, l.name AS listing_name, COALESCE(SUM(cb.total_cents), 0)::text AS total_cents
           FROM car_bookings cb
           JOIN listings l ON l.id = cb.listing_id
           WHERE cb.paid_at IS NOT NULL AND cb.status NOT IN ('rejected') AND cb.listing_id = ANY($1::uuid[])
           GROUP BY cb.listing_id, l.name`,
          [listingIds]
        );
        for (const r of car.rows) addListing(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0);
      } catch (e) {
        console.error("[admin/payouts] listings car", e);
      }

      try {
        const flight = await query<{ listing_id: string; listing_name: string; total_cents: string }>(
          `SELECT fb.listing_id::text, l.name AS listing_name, COALESCE(SUM(fb.total_cents), 0)::text AS total_cents
           FROM flight_bookings fb
           JOIN listings l ON l.id = fb.listing_id
           WHERE fb.paid_at IS NOT NULL AND fb.status NOT IN ('rejected') AND fb.listing_id = ANY($1::uuid[])
           GROUP BY fb.listing_id, l.name`,
          [listingIds]
        );
        for (const r of flight.rows) addListing(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0);
      } catch (e) {
        console.error("[admin/payouts] listings flight", e);
      }

      try {
        const hotel = await query<{ listing_id: string; listing_name: string; total_cents: string }>(
          `SELECT hb.listing_id::text, l.name AS listing_name, COALESCE(SUM(hb.total_cents), 0)::text AS total_cents
           FROM hotel_bookings hb
           JOIN listings l ON l.id = hb.listing_id
           WHERE hb.status = 'confirmed' AND hb.total_cents > 0 AND hb.listing_id = ANY($1::uuid[])
           GROUP BY hb.listing_id, l.name`,
          [listingIds]
        );
        for (const r of hotel.rows) addListing(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0);
      } catch (e) {
        console.error("[admin/payouts] listings hotel", e);
      }

      try {
        const exp = await query<{ listing_id: string; listing_name: string; total_cents: string }>(
          `SELECT ex.listing_id::text, l.name AS listing_name, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents
           FROM experience_bookings eb
           JOIN experiences ex ON ex.id = eb.experience_id
           JOIN listings l ON l.id = ex.listing_id
           WHERE eb.paid_at IS NOT NULL AND ex.listing_id = ANY($1::uuid[])
           GROUP BY ex.listing_id, l.name`,
          [listingIds]
        );
        for (const r of exp.rows) addListing(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0);
      } catch (e) {
        console.error("[admin/payouts] listings experience", e);
      }

      try {
        const evt = await query<{ listing_id: string; listing_name: string; total_cents: string }>(
          `SELECT e.listing_id::text, l.name AS listing_name, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents
           FROM event_bookings eb
           JOIN events e ON e.id = eb.event_id
           JOIN listings l ON l.id = e.listing_id
           WHERE eb.paid_at IS NOT NULL AND e.listing_id = ANY($1::uuid[])
           GROUP BY e.listing_id, l.name`,
          [listingIds]
        );
        for (const r of evt.rows) addListing(r.listing_id, r.listing_name || "—", parseInt(r.total_cents, 10) || 0);
      } catch (e) {
        console.error("[admin/payouts] listings event", e);
      }
    }

    const listings = Array.from(listingTotals.entries()).map(([listingId, v]) => ({
      listingId,
      listingName: v.name,
      totalShareCents: v.totalCents,
    }));

    let vendorName: string | null = null;
    try {
      const vn = await query<{ name: string }>("SELECT name FROM vendors WHERE id = $1", [vendorId]);
      vendorName = vn.rows[0]?.name ?? null;
    } catch {
      vendorName = null;
    }

    res.json({ vendorName, listings });
  } catch (e) {
    console.error("[admin/payouts] vendor listings", e);
    res.status(500).json({ error: "Failed to list vendor listings" });
  }
});

/** GET /api/admin/payouts/vendors/:vendorId/listings/:listingId — Fleets (only those that exist for this listing in vendor-hub) + payout totals. */
router.get("/vendors/:vendorId/listings/:listingId", async (req: Request, res: Response): Promise<void> => {
  const { vendorId, listingId } = req.params;
  try {
    let listingName = "";
    try {
      const ln = await query<{ name: string }>("SELECT name FROM listings WHERE id = $1", [listingId]);
      listingName = ln.rows[0]?.name ?? listingId;
    } catch {
      listingName = listingId;
    }

    const existingFleets = await getFleetsForListing(listingId);
    const fleets: { fleetId: string; fleetName: string; totalEarnedCents: number; paidToVendorCents: number; pendingCents: number }[] = [];
    const fleetTypes = [
      { id: "bus", name: "Bus", table: "transport_bookings" as const, listingCol: "listing_id", paidCond: "1=1" },
      { id: "car", name: "Car", table: "car_bookings", listingCol: "listing_id", paidCond: "paid_at IS NOT NULL AND status NOT IN ('rejected')" },
      { id: "flight", name: "Flight", table: "flight_bookings", listingCol: "listing_id", paidCond: "paid_at IS NOT NULL AND status NOT IN ('rejected')" },
      { id: "hotel", name: "Hotel", table: "hotel_bookings", listingCol: "listing_id", paidCond: "status = 'confirmed' AND total_cents > 0" },
    ];
    const fleetTypeMap = new Map(fleetTypes.map((ft) => [ft.id, ft]));

    for (const ef of existingFleets) {
      const ft = fleetTypeMap.get(ef.fleetId);
      if (!ft) continue;
      try {
        let totalCents = 0;
        let paidCents = 0;
        if (ft.table === "transport_bookings") {
          const r = await query<{ total_cents: string }>(
            `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents FROM transport_bookings WHERE listing_id = $1`,
            [listingId]
          );
          totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
          paidCents = totalCents;
        } else if (ft.table === "car_bookings") {
          const r = await query<{ total_cents: string; paid_cents: string }>(
            `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents,
                    COALESCE(SUM(CASE WHEN paid_at IS NOT NULL THEN total_cents ELSE 0 END), 0)::text AS paid_cents
             FROM car_bookings WHERE listing_id = $1 AND status NOT IN ('rejected')`,
            [listingId]
          );
          totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
          paidCents = parseInt(r.rows[0]?.paid_cents ?? "0", 10);
        } else if (ft.table === "flight_bookings") {
          const r = await query<{ total_cents: string; paid_cents: string }>(
            `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents,
                    COALESCE(SUM(CASE WHEN paid_at IS NOT NULL THEN total_cents ELSE 0 END), 0)::text AS paid_cents
             FROM flight_bookings WHERE listing_id = $1 AND status NOT IN ('rejected')`,
            [listingId]
          );
          totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
          paidCents = parseInt(r.rows[0]?.paid_cents ?? "0", 10);
        } else if (ft.table === "hotel_bookings") {
          const r = await query<{ total_cents: string }>(
            `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents FROM hotel_bookings WHERE listing_id = $1 AND status = 'confirmed' AND total_cents > 0`,
            [listingId]
          );
          totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
          paidCents = totalCents;
        }
        const vendorShareTotal = Math.round(totalCents * VENDOR_SHARE);
        const vendorSharePaid = Math.round(paidCents * VENDOR_SHARE);
        fleets.push({
          fleetId: ft.id,
          fleetName: ef.fleetName,
          totalEarnedCents: vendorShareTotal,
          paidToVendorCents: vendorSharePaid,
          pendingCents: vendorShareTotal - vendorSharePaid,
        });
      } catch (e) {
        console.error("[admin/payouts] listing fleet", ft.id, e);
      }
    }

    let totalShareCents = fleets.reduce((s, f) => s + f.totalEarnedCents, 0);
    // Experiences and events are listings with no fleet; add their vendor share to listing total
    try {
      const exp = await query<{ total_cents: string }>(
        `SELECT COALESCE(SUM(eb.total_cents), 0)::text AS total_cents FROM experience_bookings eb JOIN experiences ex ON ex.id = eb.experience_id WHERE ex.listing_id = $1 AND eb.paid_at IS NOT NULL`,
        [listingId]
      );
      const expCents = parseInt(exp.rows[0]?.total_cents ?? "0", 10);
      totalShareCents += Math.round(expCents * VENDOR_SHARE);
    } catch {
      // ignore
    }
    try {
      const evt = await query<{ total_cents: string }>(
        `SELECT COALESCE(SUM(eb.total_cents), 0)::text AS total_cents FROM event_bookings eb JOIN events e ON e.id = eb.event_id WHERE e.listing_id = $1 AND eb.paid_at IS NOT NULL`,
        [listingId]
      );
      const evtCents = parseInt(evt.rows[0]?.total_cents ?? "0", 10);
      totalShareCents += Math.round(evtCents * VENDOR_SHARE);
    } catch {
      // ignore
    }
    res.json({ listingName, totalShareCents, fleets });
  } catch (e) {
    console.error("[admin/payouts] listing detail", e);
    res.status(500).json({ error: "Failed to load listing" });
  }
});

/** GET /api/admin/payouts/vendors/:vendorId/listings/:listingId/entity-fleets — Per-entity fleets (bus/car/flight/hotel) with vendor share + booking counts. */
router.get("/vendors/:vendorId/listings/:listingId/entity-fleets", async (req: Request, res: Response): Promise<void> => {
  const { listingId } = req.params;
  try {
    const fleets: { fleetId: string; fleetName: string; entityId: string; entityName: string; totalEarnedCents: number; paidToVendorCents: number; pendingCents: number; bookingCount: number }[] = [];

    // Buses under this listing
    try {
      const buses = await query<{ id: string; name: string | null; bus_number: string | null }>(
        `SELECT id::text, name, bus_number FROM buses WHERE listing_id = $1`,
        [listingId]
      );
      for (const b of buses.rows) {
        const r = await query<{ total_cents: string; cnt: string }>(
          `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt FROM transport_bookings WHERE bus_id = $1`,
          [b.id]
        );
        const cents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
        const cnt = parseInt(r.rows[0]?.cnt ?? "0", 10);
        const vendorShare = Math.round(cents * VENDOR_SHARE);
        const displayName = (b.name?.trim() || b.bus_number?.trim() || b.id).slice(0, 80);
        fleets.push({
          fleetId: "bus",
          fleetName: "Bus",
          entityId: b.id,
          entityName: displayName,
          totalEarnedCents: vendorShare,
          paidToVendorCents: vendorShare,
          pendingCents: 0,
          bookingCount: cnt,
        });
      }
    } catch (e) {
      console.error("[admin/payouts] entity-fleets bus", e);
    }

    // Cars under this listing
    try {
      const cars = await query<{ id: string; name: string | null }>(
        `SELECT id::text, name FROM cars WHERE listing_id = $1`,
        [listingId]
      );
      for (const c of cars.rows) {
        const r = await query<{ total_cents: string; paid_cents: string; cnt: string }>(
          `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents,
                  COALESCE(SUM(CASE WHEN paid_at IS NOT NULL AND status NOT IN ('rejected') THEN total_cents ELSE 0 END), 0)::text AS paid_cents,
                  COUNT(*)::text AS cnt
           FROM car_bookings
           WHERE car_id = $1 AND status NOT IN ('rejected')`,
          [c.id]
        );
        const totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
        const paidCents = parseInt(r.rows[0]?.paid_cents ?? "0", 10);
        const cnt = parseInt(r.rows[0]?.cnt ?? "0", 10);
        const totalEarned = Math.round(paidCents * VENDOR_SHARE);
        const paidEarned = totalEarned;
        const displayName = (c.name?.trim() || c.id).slice(0, 80);
        fleets.push({
          fleetId: "car",
          fleetName: "Car",
          entityId: c.id,
          entityName: displayName,
          totalEarnedCents: totalEarned,
          paidToVendorCents: paidEarned,
          pendingCents: 0,
          bookingCount: cnt,
        });
      }
    } catch (e) {
      console.error("[admin/payouts] entity-fleets car", e);
    }

    // Flights under this listing
    try {
      const flights = await query<{ id: string; flight_number: string | null; airline_name: string | null }>(
        `SELECT id::text, flight_number, airline_name FROM flights WHERE listing_id = $1`,
        [listingId]
      );
      for (const fl of flights.rows) {
        const r = await query<{ total_cents: string; paid_cents: string; cnt: string }>(
          `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents,
                  COALESCE(SUM(CASE WHEN paid_at IS NOT NULL AND status NOT IN ('rejected') THEN total_cents ELSE 0 END), 0)::text AS paid_cents,
                  COUNT(*)::text AS cnt
           FROM flight_bookings
           WHERE flight_id = $1 AND status NOT IN ('rejected')`,
          [fl.id]
        );
        const totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
        const paidCents = parseInt(r.rows[0]?.paid_cents ?? "0", 10);
        const cnt = parseInt(r.rows[0]?.cnt ?? "0", 10);
        const totalEarned = Math.round(paidCents * VENDOR_SHARE);
        const paidEarned = totalEarned;
        const displayName = (fl.flight_number?.trim() || fl.airline_name?.trim() || fl.id).slice(0, 80);
        fleets.push({
          fleetId: "flight",
          fleetName: "Flight",
          entityId: fl.id,
          entityName: displayName,
          totalEarnedCents: totalEarned,
          paidToVendorCents: paidEarned,
          pendingCents: 0,
          bookingCount: cnt,
        });
      }
    } catch (e) {
      console.error("[admin/payouts] entity-fleets flight", e);
    }

    // Hotel branches under this listing
    try {
      const branches = await query<{ id: string; name: string | null }>(
        `SELECT id::text, name FROM hotel_branches WHERE listing_id = $1`,
        [listingId]
      );
      for (const hb of branches.rows) {
        const r = await query<{ total_cents: string; cnt: string }>(
          `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
           FROM hotel_bookings
           WHERE hotel_branch_id = $1 AND status = 'confirmed' AND total_cents > 0`,
          [hb.id]
        );
        const totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
        const cnt = parseInt(r.rows[0]?.cnt ?? "0", 10);
        const totalEarned = Math.round(totalCents * VENDOR_SHARE);
        const displayName = (hb.name?.trim() || hb.id).slice(0, 80);
        fleets.push({
          fleetId: "hotel",
          fleetName: "Hotel",
          entityId: hb.id,
          entityName: displayName,
          totalEarnedCents: totalEarned,
          paidToVendorCents: totalEarned,
          pendingCents: 0,
          bookingCount: cnt,
        });
      }
    } catch (e) {
      console.error("[admin/payouts] entity-fleets hotel", e);
    }

    res.json({ fleets });
  } catch (e) {
    console.error("[admin/payouts] entity-fleets", e);
    res.status(500).json({ error: "Failed to load entity fleets" });
  }
});

/** GET /api/admin/payouts/vendors/:vendorId/listings/:listingId/fleets/:fleetId — Fleet summary (bus, car, flight, hotel only). */
router.get("/vendors/:vendorId/listings/:listingId/fleets/:fleetId", async (req: Request, res: Response): Promise<void> => {
  const { listingId, fleetId } = req.params;
  const allowedFleetIds = ["bus", "car", "flight", "hotel"];
  if (!allowedFleetIds.includes(fleetId)) {
    res.status(404).json({ error: "Fleet not found. Only bus, car, flight, hotel are fleets; experiences and events are listings with no fleet." });
    return;
  }
  const fleetNames: Record<string, string> = {
    bus: "Bus bookings", car: "Car bookings", flight: "Flight bookings",
    hotel: "Hotel bookings",
  };
  try {
    let totalCents = 0;
    let paidCents = 0;
    if (fleetId === "bus") {
      const r = await query<{ total_cents: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents FROM transport_bookings WHERE listing_id = $1`,
        [listingId]
      );
      totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
      paidCents = totalCents;
    } else if (fleetId === "car") {
      const r = await query<{ total_cents: string; paid_cents: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents,
                COALESCE(SUM(CASE WHEN paid_at IS NOT NULL THEN total_cents ELSE 0 END), 0)::text AS paid_cents
         FROM car_bookings WHERE listing_id = $1 AND status NOT IN ('rejected')`,
        [listingId]
      );
      totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
      paidCents = parseInt(r.rows[0]?.paid_cents ?? "0", 10);
    } else if (fleetId === "flight") {
      const r = await query<{ total_cents: string; paid_cents: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents,
                COALESCE(SUM(CASE WHEN paid_at IS NOT NULL THEN total_cents ELSE 0 END), 0)::text AS paid_cents
         FROM flight_bookings WHERE listing_id = $1 AND status NOT IN ('rejected')`,
        [listingId]
      );
      totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
      paidCents = parseInt(r.rows[0]?.paid_cents ?? "0", 10);
    } else if (fleetId === "hotel") {
      const r = await query<{ total_cents: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents FROM hotel_bookings WHERE listing_id = $1 AND status = 'confirmed' AND total_cents > 0`,
        [listingId]
      );
      totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
      paidCents = totalCents;
    }
    const totalEarnedCents = Math.round(paidCents * VENDOR_SHARE);
    const paidToVendorCents = totalEarnedCents;
    let vendorName: string | null = null;
    let listingName: string | null = null;
    try {
      const vl = await query<{ vendor_name: string; listing_name: string }>(
        `SELECT v.name AS vendor_name, l.name AS listing_name FROM vendor_listings vl
         JOIN vendors v ON v.id = vl.vendor_id JOIN listings l ON l.id = vl.listing_id
         WHERE vl.listing_id = $1 AND vl.vendor_id = $2`,
        [listingId, req.params.vendorId]
      );
      if (vl.rows[0]) {
        vendorName = vl.rows[0].vendor_name;
        listingName = vl.rows[0].listing_name;
      }
    } catch {
      // ignore
    }
    res.json({
      fleetName: fleetNames[fleetId] ?? `${fleetId} bookings`,
      totalEarnedCents,
      paidToVendorCents,
      pendingCents: totalEarnedCents - paidToVendorCents,
      vendorName,
      listingName,
    });
  } catch (e) {
    console.error("[admin/payouts] fleet summary", e);
    res.status(500).json({ error: "Failed to load fleet summary" });
  }
});

/** GET /api/admin/payouts/vendors/:vendorId/listings/:listingId/fleets/:fleetId/bookings — Bookings for a fleet (bus, car, flight, hotel only). */
router.get("/vendors/:vendorId/listings/:listingId/fleets/:fleetId/bookings", async (req: Request, res: Response): Promise<void> => {
  const { listingId, fleetId } = req.params;
  const allowedFleetIds = ["bus", "car", "flight", "hotel"];
  if (!allowedFleetIds.includes(fleetId)) {
    res.status(404).json({ error: "Fleet not found. Experiences and events are listings with no fleet." });
    return;
  }
  try {
    const bookings: BookingRow[] = [];
    const typeMap: Record<string, { refCol: string; table: string; join?: string; where: string }> = {
      bus: {
        refCol: "tb.booking_id", table: "transport_bookings tb", where: "tb.listing_id = $1",
        join: "LEFT JOIN users u ON u.id = tb.user_id",
      },
      car: {
        refCol: "cb.booking_ref", table: "car_bookings cb", where: "cb.listing_id = $1 AND cb.status NOT IN ('rejected')",
        join: "LEFT JOIN users u ON u.id = cb.user_id",
      },
      flight: {
        refCol: "fb.booking_ref", table: "flight_bookings fb", where: "fb.listing_id = $1 AND fb.status NOT IN ('rejected')",
        join: "LEFT JOIN users u ON u.id = fb.user_id",
      },
      hotel: {
        refCol: "hb.booking_ref", table: "hotel_bookings hb", where: "hb.listing_id = $1",
        join: "LEFT JOIN users u ON u.id = hb.user_id",
      },
    };
    const def = typeMap[fleetId];
    if (!def) {
      res.json({ bookings: [] });
      return;
    }

    try {
      if (fleetId === "bus") {
        const r = await query<{ id: string; ref: string; user_name: string | null; total_cents: number; created_at: string }>(
          `SELECT tb.id::text, tb.booking_id AS ref, u.full_name AS user_name, tb.total_cents, tb.created_at::text
           FROM transport_bookings tb LEFT JOIN users u ON u.id = tb.user_id WHERE tb.listing_id = $1 ORDER BY tb.created_at DESC`,
          [listingId]
        );
        r.rows.forEach((row) =>
          bookings.push({
            id: row.id,
            booking_ref: row.ref,
            user_name: row.user_name?.trim() || "—",
            amount_cents: row.total_cents ?? 0,
            paid_at: row.created_at,
            status: "Paid",
          })
        );
      } else if (fleetId === "car") {
        const r = await query<{ id: string; ref: string; user_name: string | null; total_cents: number | null; paid_at: string | null }>(
          `SELECT cb.id::text, cb.booking_ref AS ref, u.full_name AS user_name, cb.total_cents, cb.paid_at::text
           FROM car_bookings cb LEFT JOIN users u ON u.id = cb.user_id WHERE cb.listing_id = $1 AND cb.status NOT IN ('rejected') ORDER BY COALESCE(cb.paid_at, cb.created_at) DESC`,
          [listingId]
        );
        r.rows.forEach((row) =>
          bookings.push({
            id: row.id,
            booking_ref: row.ref,
            user_name: row.user_name?.trim() || "—",
            amount_cents: row.total_cents ?? 0,
            paid_at: row.paid_at,
            status: row.paid_at ? "Paid" : "Pending",
          })
        );
      } else if (fleetId === "flight") {
        const r = await query<{ id: string; ref: string; user_name: string | null; total_cents: number; paid_at: string | null }>(
          `SELECT fb.id::text, fb.booking_ref AS ref, u.full_name AS user_name, fb.total_cents, fb.paid_at::text
           FROM flight_bookings fb LEFT JOIN users u ON u.id = fb.user_id WHERE fb.listing_id = $1 AND fb.status NOT IN ('rejected') ORDER BY COALESCE(fb.paid_at, fb.created_at) DESC`,
          [listingId]
        );
        r.rows.forEach((row) =>
          bookings.push({
            id: row.id,
            booking_ref: row.ref,
            user_name: row.user_name?.trim() || "—",
            amount_cents: row.total_cents ?? 0,
            paid_at: row.paid_at,
            status: row.paid_at ? "Paid" : "Pending",
          })
        );
      } else if (fleetId === "hotel") {
        const r = await query<{ id: string; ref: string; user_name: string | null; total_cents: number | null; status: string; updated_at: string }>(
          `SELECT hb.id::text, hb.booking_ref AS ref, u.full_name AS user_name, hb.total_cents, hb.status, hb.updated_at::text
           FROM hotel_bookings hb LEFT JOIN users u ON u.id = hb.user_id WHERE hb.listing_id = $1 ORDER BY hb.updated_at DESC`,
          [listingId]
        );
        r.rows.forEach((row) => {
          const paid = row.status === "confirmed" && (row.total_cents ?? 0) > 0;
          bookings.push({
            id: row.id,
            booking_ref: row.ref,
            user_name: row.user_name?.trim() || "—",
            amount_cents: row.total_cents ?? 0,
            paid_at: paid ? row.updated_at : null,
            status: paid ? "Paid" : "Pending",
          });
        });
      }
    } catch (e) {
      console.error("[admin/payouts] fleet bookings", fleetId, e);
    }

    res.json({ bookings });
  } catch (e) {
    console.error("[admin/payouts] fleet bookings", e);
    res.status(500).json({ error: "Failed to load fleet bookings" });
  }
});

/** GET /api/admin/payouts/vendors/:vendorId/listings/:listingId/fleets/:fleetId/entity/:entityId — Summary for one bus/car/flight/hotel entity. */
router.get("/vendors/:vendorId/listings/:listingId/fleets/:fleetId/entity/:entityId", async (req: Request, res: Response): Promise<void> => {
  const { listingId, fleetId, entityId } = req.params;
  const allowedFleetIds = ["bus", "car", "flight", "hotel"];
  if (!allowedFleetIds.includes(fleetId)) {
    res.status(404).json({ error: "Fleet not found. Only bus, car, flight, hotel are fleets; experiences and events are listings with no fleet." });
    return;
  }
  try {
    let entityName = entityId;
    let totalCents = 0;
    let paidCents = 0;
    let bookingCount = 0;

    if (fleetId === "bus") {
      const nameRow = await query<{ name: string | null; bus_number: string | null }>(
        "SELECT name, bus_number FROM buses WHERE id = $1 AND listing_id = $2",
        [entityId, listingId]
      );
      if (nameRow.rows[0]) {
        entityName = nameRow.rows[0].name?.trim() || nameRow.rows[0].bus_number?.trim() || entityId;
      }
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM transport_bookings WHERE bus_id = $1`,
        [entityId]
      );
      totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
      paidCents = totalCents;
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
    } else if (fleetId === "car") {
      const nameRow = await query<{ name: string | null }>(
        "SELECT name FROM cars WHERE id = $1 AND listing_id = $2",
        [entityId, listingId]
      );
      if (nameRow.rows[0]) {
        entityName = nameRow.rows[0].name?.trim() || entityId;
      }
      const r = await query<{ total_cents: string; paid_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents,
                COALESCE(SUM(CASE WHEN paid_at IS NOT NULL AND status NOT IN ('rejected') THEN total_cents ELSE 0 END), 0)::text AS paid_cents,
                COUNT(*)::text AS cnt
         FROM car_bookings
         WHERE car_id = $1 AND status NOT IN ('rejected')`,
        [entityId]
      );
      totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
      paidCents = parseInt(r.rows[0]?.paid_cents ?? "0", 10);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
    } else if (fleetId === "flight") {
      const nameRow = await query<{ flight_number: string | null; airline_name: string | null }>(
        "SELECT flight_number, airline_name FROM flights WHERE id = $1 AND listing_id = $2",
        [entityId, listingId]
      );
      if (nameRow.rows[0]) {
        entityName = nameRow.rows[0].flight_number?.trim() || nameRow.rows[0].airline_name?.trim() || entityId;
      }
      const r = await query<{ total_cents: string; paid_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents,
                COALESCE(SUM(CASE WHEN paid_at IS NOT NULL AND status NOT IN ('rejected') THEN total_cents ELSE 0 END), 0)::text AS paid_cents,
                COUNT(*)::text AS cnt
         FROM flight_bookings
         WHERE flight_id = $1 AND status NOT IN ('rejected')`,
        [entityId]
      );
      totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
      paidCents = parseInt(r.rows[0]?.paid_cents ?? "0", 10);
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
    } else if (fleetId === "hotel") {
      const nameRow = await query<{ name: string | null }>(
        "SELECT name FROM hotel_branches WHERE id = $1 AND listing_id = $2",
        [entityId, listingId]
      );
      if (nameRow.rows[0]) {
        entityName = nameRow.rows[0].name?.trim() || entityId;
      }
      const r = await query<{ total_cents: string; cnt: string }>(
        `SELECT COALESCE(SUM(total_cents), 0)::text AS total_cents, COUNT(*)::text AS cnt
         FROM hotel_bookings
         WHERE hotel_branch_id = $1 AND status = 'confirmed' AND total_cents > 0`,
        [entityId]
      );
      totalCents = parseInt(r.rows[0]?.total_cents ?? "0", 10);
      paidCents = totalCents;
      bookingCount = parseInt(r.rows[0]?.cnt ?? "0", 10);
    }

    const totalEarnedCents = Math.round(paidCents * VENDOR_SHARE);
    const paidToVendorCents = totalEarnedCents;

    res.json({
      fleetName: `${fleetId} – ${entityName}`,
      totalEarnedCents,
      paidToVendorCents,
      pendingCents: totalEarnedCents - paidToVendorCents,
      vendorName: null,
      listingName: null,
      bookingCount,
    });
  } catch (e) {
    console.error("[admin/payouts] entity fleet summary", e);
    res.status(500).json({ error: "Failed to load fleet entity" });
  }
});

/** GET /api/admin/payouts/vendors/:vendorId/listings/:listingId/fleets/:fleetId/entity/:entityId/bookings — Bookings for a single bus/car/flight/hotel entity. */
router.get("/vendors/:vendorId/listings/:listingId/fleets/:fleetId/entity/:entityId/bookings", async (req: Request, res: Response): Promise<void> => {
  const { fleetId, entityId } = req.params;
  const allowedFleetIds = ["bus", "car", "flight", "hotel"];
  if (!allowedFleetIds.includes(fleetId)) {
    res.status(404).json({ error: "Fleet not found. Experiences and events are listings with no fleet." });
    return;
  }
  try {
    const bookings: BookingRow[] = [];

    if (fleetId === "bus") {
      const r = await query<{ id: string; ref: string; user_name: string | null; total_cents: number; created_at: string }>(
        `SELECT tb.id::text, tb.booking_id AS ref, u.full_name AS user_name, tb.total_cents, tb.created_at::text
         FROM transport_bookings tb
         LEFT JOIN users u ON u.id = tb.user_id
         WHERE tb.bus_id = $1
         ORDER BY tb.created_at DESC`,
        [entityId]
      );
      r.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          booking_ref: row.ref,
          user_name: row.user_name?.trim() || "—",
          amount_cents: row.total_cents ?? 0,
          paid_at: row.created_at,
          status: "Paid",
        })
      );
    } else if (fleetId === "car") {
      const r = await query<{ id: string; ref: string; user_name: string | null; total_cents: number | null; paid_at: string | null }>(
        `SELECT cb.id::text, cb.booking_ref AS ref, u.full_name AS user_name, cb.total_cents, cb.paid_at::text
         FROM car_bookings cb
         LEFT JOIN users u ON u.id = cb.user_id
         WHERE cb.car_id = $1 AND cb.status NOT IN ('rejected')
         ORDER BY COALESCE(cb.paid_at, cb.created_at) DESC`,
        [entityId]
      );
      r.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          booking_ref: row.ref,
          user_name: row.user_name?.trim() || "—",
          amount_cents: row.total_cents ?? 0,
          paid_at: row.paid_at,
          status: row.paid_at ? "Paid" : "Pending",
        })
      );
    } else if (fleetId === "flight") {
      const r = await query<{ id: string; ref: string; user_name: string | null; total_cents: number; paid_at: string | null }>(
        `SELECT fb.id::text, fb.booking_ref AS ref, u.full_name AS user_name, fb.total_cents, fb.paid_at::text
         FROM flight_bookings fb
         LEFT JOIN users u ON u.id = fb.user_id
         WHERE fb.flight_id = $1 AND fb.status NOT IN ('rejected')
         ORDER BY COALESCE(fb.paid_at, fb.created_at) DESC`,
        [entityId]
      );
      r.rows.forEach((row) =>
        bookings.push({
          id: row.id,
          booking_ref: row.ref,
          user_name: row.user_name?.trim() || "—",
          amount_cents: row.total_cents ?? 0,
          paid_at: row.paid_at,
          status: row.paid_at ? "Paid" : "Pending",
        })
      );
    } else if (fleetId === "hotel") {
      const r = await query<{ id: string; ref: string; user_name: string | null; total_cents: number | null; status: string; updated_at: string }>(
        `SELECT hb.id::text, hb.booking_ref AS ref, u.full_name AS user_name, hb.total_cents, hb.status, hb.updated_at::text
         FROM hotel_bookings hb
         LEFT JOIN users u ON u.id = hb.user_id
         WHERE hb.hotel_branch_id = $1
         ORDER BY hb.updated_at DESC`,
        [entityId]
      );
      r.rows.forEach((row) => {
        const paid = row.status === "confirmed" && (row.total_cents ?? 0) > 0;
        bookings.push({
          id: row.id,
          booking_ref: row.ref,
          user_name: row.user_name?.trim() || "—",
          amount_cents: row.total_cents ?? 0,
          paid_at: paid ? row.updated_at : null,
          status: paid ? "Paid" : "Pending",
        });
      });
    }

    res.json({ bookings });
  } catch (e) {
    console.error("[admin/payouts] entity fleet bookings", e);
    res.status(500).json({ error: "Failed to load fleet entity bookings" });
  }
});

export default router;

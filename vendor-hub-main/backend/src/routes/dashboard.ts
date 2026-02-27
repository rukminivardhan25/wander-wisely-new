/**
 * Vendor dashboard: summary stats and recent bookings from real data.
 */

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
const VENDOR_SHARE = 0.9;
const RECENT_BOOKINGS_LIMIT = 15;

async function getVendorListingIds(vendorId: string): Promise<string[]> {
  try {
    const listResult = await query<{ id: string }>(
      "SELECT id::text AS id FROM listings WHERE vendor_id = $1",
      [vendorId]
    );
    if (listResult.rows.length > 0) return listResult.rows.map((r) => r.id);
  } catch {
    // vendor_id column may not exist
  }
  try {
    const listResult = await query<{ listing_id: string }>(
      "SELECT listing_id::text AS listing_id FROM vendor_listings WHERE vendor_id = $1",
      [vendorId]
    );
    return listResult.rows.map((r) => r.listing_id);
  } catch {
    return [];
  }
}

type RecentRow = { id: string; ref: string; service: string; date: string; status: string; amount_cents: number };

router.get("/summary", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const vendorId = req.vendorId;
  if (!vendorId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const listingIds = await getVendorListingIds(vendorId);
    let totalBookings = 0;
    let totalRevenueCents = 0;

    if (listingIds.length > 0) {
      try {
        const tb = await query<{ cnt: string; total_cents: string }>(
          `SELECT COUNT(*)::text AS cnt, COALESCE(SUM(tb.total_cents), 0)::text AS total_cents
           FROM transport_bookings tb
           LEFT JOIN buses b ON b.id = tb.bus_id
           WHERE COALESCE(tb.listing_id, b.listing_id) = ANY($1::uuid[])`,
          [listingIds]
        );
        totalBookings += parseInt(tb.rows[0]?.cnt ?? "0", 10);
        totalRevenueCents += Math.round(parseInt(tb.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      } catch {}
      try {
        const cb = await query<{ cnt: string; total_cents: string }>(
          `SELECT COUNT(*)::text AS cnt, COALESCE(SUM(total_cents), 0)::text AS total_cents
           FROM car_bookings WHERE listing_id = ANY($1::uuid[]) AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
          [listingIds]
        );
        totalBookings += parseInt(cb.rows[0]?.cnt ?? "0", 10);
        totalRevenueCents += Math.round(parseInt(cb.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      } catch {}
      try {
        const fb = await query<{ cnt: string; total_cents: string }>(
          `SELECT COUNT(*)::text AS cnt, COALESCE(SUM(total_cents), 0)::text AS total_cents
           FROM flight_bookings WHERE listing_id = ANY($1::uuid[]) AND paid_at IS NOT NULL AND status NOT IN ('rejected')`,
          [listingIds]
        );
        totalBookings += parseInt(fb.rows[0]?.cnt ?? "0", 10);
        totalRevenueCents += Math.round(parseInt(fb.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      } catch {}
      try {
        const hb = await query<{ cnt: string; total_cents: string }>(
          `SELECT COUNT(*)::text AS cnt, COALESCE(SUM(total_cents), 0)::text AS total_cents
           FROM hotel_bookings WHERE listing_id = ANY($1::uuid[]) AND status = 'confirmed' AND total_cents > 0`,
          [listingIds]
        );
        totalBookings += parseInt(hb.rows[0]?.cnt ?? "0", 10);
        totalRevenueCents += Math.round(parseInt(hb.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      } catch {}
      try {
        const eb = await query<{ cnt: string; total_cents: string }>(
          `SELECT COUNT(*)::text AS cnt, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents
           FROM experience_bookings eb JOIN experiences ex ON ex.id = eb.experience_id
           WHERE ex.listing_id = ANY($1::uuid[]) AND eb.paid_at IS NOT NULL`,
          [listingIds]
        );
        totalBookings += parseInt(eb.rows[0]?.cnt ?? "0", 10);
        totalRevenueCents += Math.round(parseInt(eb.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      } catch {}
      try {
        const evb = await query<{ cnt: string; total_cents: string }>(
          `SELECT COUNT(*)::text AS cnt, COALESCE(SUM(eb.total_cents), 0)::text AS total_cents
           FROM event_bookings eb JOIN events e ON e.id = eb.event_id
           WHERE e.listing_id = ANY($1::uuid[]) AND eb.paid_at IS NOT NULL`,
          [listingIds]
        );
        totalBookings += parseInt(evb.rows[0]?.cnt ?? "0", 10);
        totalRevenueCents += Math.round(parseInt(evb.rows[0]?.total_cents ?? "0", 10) * VENDOR_SHARE);
      } catch {}
    }

    let averageRating = 0;
    let reviewCount = 0;
    if (listingIds.length > 0) {
      try {
        const rv = await query<{ avg: string; cnt: string }>(
          `SELECT COALESCE(AVG(rating), 0)::text AS avg, COUNT(*)::text AS cnt FROM booking_reviews WHERE listing_id = ANY($1::uuid[])`,
          [listingIds]
        );
        averageRating = parseFloat(rv.rows[0]?.avg ?? "0") || 0;
        reviewCount = parseInt(rv.rows[0]?.cnt ?? "0", 10) || 0;
      } catch {}
    }

    const recent: RecentRow[] = [];
    if (listingIds.length > 0) {
      try {
        const rows = await query<{ id: string; ref: string; name: string; date: string; amount_cents: string }>(
          `SELECT tb.id::text, tb.booking_id AS ref, l.name, tb.created_at::date::text AS date, COALESCE(tb.total_cents, 0)::text AS amount_cents
           FROM transport_bookings tb LEFT JOIN buses b ON b.id = tb.bus_id LEFT JOIN listings l ON l.id = COALESCE(tb.listing_id, b.listing_id)
           WHERE COALESCE(tb.listing_id, b.listing_id) = ANY($1::uuid[]) ORDER BY tb.created_at DESC LIMIT 5`,
          [listingIds]
        );
        for (const r of rows.rows) {
          recent.push({ id: r.id, ref: r.ref || r.id, service: r.name ? `Bus – ${r.name}` : "Bus booking", date: r.date, status: "Confirmed", amount_cents: parseInt(r.amount_cents ?? "0", 10) || 0 });
        }
      } catch {}
      try {
        const rows = await query<{ id: string; ref: string; name: string; date: string; amount_cents: string; paid_at: string | null }>(
          `SELECT cb.id::text, cb.booking_ref AS ref, l.name, COALESCE(cb.paid_at, cb.created_at)::date::text AS date, COALESCE(cb.total_cents, 0)::text AS amount_cents, cb.paid_at
           FROM car_bookings cb JOIN listings l ON l.id = cb.listing_id
           WHERE cb.listing_id = ANY($1::uuid[]) AND cb.status NOT IN ('rejected') ORDER BY COALESCE(cb.paid_at, cb.created_at) DESC LIMIT 5`,
          [listingIds]
        );
        for (const r of rows.rows) {
          recent.push({ id: r.id, ref: r.ref || r.id, service: r.name ? `Car – ${r.name}` : "Car rental", date: r.date, status: r.paid_at ? "Confirmed" : "Pending", amount_cents: parseInt(r.amount_cents ?? "0", 10) || 0 });
        }
      } catch {}
      try {
        const rows = await query<{ id: string; ref: string; name: string; date: string; amount_cents: string; paid_at: string | null }>(
          `SELECT fb.id::text, fb.booking_ref AS ref, l.name, COALESCE(fb.paid_at, fb.created_at)::date::text AS date, COALESCE(fb.total_cents, 0)::text AS amount_cents, fb.paid_at
           FROM flight_bookings fb JOIN listings l ON l.id = fb.listing_id
           WHERE fb.listing_id = ANY($1::uuid[]) AND fb.status NOT IN ('rejected') ORDER BY COALESCE(fb.paid_at, fb.created_at) DESC LIMIT 5`,
          [listingIds]
        );
        for (const r of rows.rows) {
          recent.push({ id: r.id, ref: r.ref || r.id, service: r.name ? `Flight – ${r.name}` : "Flight", date: r.date, status: r.paid_at ? "Confirmed" : "Pending", amount_cents: parseInt(r.amount_cents ?? "0", 10) || 0 });
        }
      } catch {}
      try {
        const rows = await query<{ id: string; ref: string; name: string; date: string; amount_cents: string }>(
          `SELECT hb.id::text, hb.booking_ref AS ref, l.name, hb.updated_at::date::text AS date, COALESCE(hb.total_cents, 0)::text AS amount_cents
           FROM hotel_bookings hb JOIN listings l ON l.id = hb.listing_id
           WHERE hb.listing_id = ANY($1::uuid[]) AND hb.status = 'confirmed' ORDER BY hb.updated_at DESC LIMIT 5`,
          [listingIds]
        );
        for (const r of rows.rows) {
          recent.push({ id: r.id, ref: r.ref || r.id, service: r.name ? `Hotel – ${r.name}` : "Hotel", date: r.date, status: "Confirmed", amount_cents: parseInt(r.amount_cents ?? "0", 10) || 0 });
        }
      } catch {}
      try {
        const rows = await query<{ id: string; ref: string; name: string; date: string; amount_cents: string }>(
          `SELECT eb.id::text, eb.booking_ref AS ref, l.name, COALESCE(eb.paid_at, eb.created_at)::date::text AS date, COALESCE(eb.total_cents, 0)::text AS amount_cents
           FROM experience_bookings eb JOIN experiences ex ON ex.id = eb.experience_id JOIN listings l ON l.id = ex.listing_id
           WHERE ex.listing_id = ANY($1::uuid[]) AND eb.paid_at IS NOT NULL ORDER BY COALESCE(eb.paid_at, eb.created_at) DESC LIMIT 5`,
          [listingIds]
        );
        for (const r of rows.rows) {
          recent.push({ id: r.id, ref: r.ref || r.id, service: r.name ? `Experience – ${r.name}` : "Experience", date: r.date, status: "Confirmed", amount_cents: parseInt(r.amount_cents ?? "0", 10) || 0 });
        }
      } catch {}
      try {
        const rows = await query<{ id: string; ref: string; name: string; date: string; amount_cents: string }>(
          `SELECT eb.id::text, eb.booking_ref AS ref, l.name, COALESCE(eb.paid_at, eb.created_at)::date::text AS date, COALESCE(eb.total_cents, 0)::text AS amount_cents
           FROM event_bookings eb JOIN events e ON e.id = eb.event_id JOIN listings l ON l.id = e.listing_id
           WHERE e.listing_id = ANY($1::uuid[]) AND eb.paid_at IS NOT NULL ORDER BY COALESCE(eb.paid_at, eb.created_at) DESC LIMIT 5`,
          [listingIds]
        );
        for (const r of rows.rows) {
          recent.push({ id: r.id, ref: r.ref || r.id, service: r.name ? `Event – ${r.name}` : "Event", date: r.date, status: "Confirmed", amount_cents: parseInt(r.amount_cents ?? "0", 10) || 0 });
        }
      } catch {}
    }

    recent.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    const recentBookings = recent.slice(0, RECENT_BOOKINGS_LIMIT).map((b) => ({
      id: b.id,
      ref: b.ref,
      service: b.service,
      date: b.date,
      status: b.status,
      amountCents: b.amount_cents,
    }));

    res.json({
      totalListings: listingIds.length,
      totalBookings,
      totalRevenueCents,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount,
      recentBookings,
    });
  } catch (e) {
    console.error("[dashboard] summary", e);
    res.status(500).json({ error: "Failed to load dashboard summary" });
  }
});

export default router;

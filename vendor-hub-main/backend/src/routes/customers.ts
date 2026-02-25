import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const MAIN_APP_API_URL = process.env.MAIN_APP_API_URL ?? "http://localhost:3001";

const router = Router();
router.use(authMiddleware);

type MainApiBooking = {
  passengerName: string;
  email: string;
  phone: string;
  totalCents: number;
  createdAt: string;
};

async function fetchBookingsForBusRange(busId: string, fromDate: string, toDate: string): Promise<MainApiBooking[]> {
  const url = `${MAIN_APP_API_URL}/api/bookings/for-bus-range?bus_id=${encodeURIComponent(busId)}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { bookings?: MainApiBooking[] };
  return Array.isArray(data.bookings) ? data.bookings : [];
}

/** GET /api/customers?sync=1 - List customers for the vendor. If sync=1, sync from main app bookings then return. */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const doSync = req.query.sync === "1" || req.query.sync === "true";

    if (doSync) {
      // Get all bus IDs for this vendor (listings.vendor_id or vendor_listings)
      let busIdsResult = await query<{ bus_id: string }>(
        `select b.id as bus_id from buses b join listings l on l.id = b.listing_id where l.vendor_id = $1`,
        [vendorId]
      ).catch(() => ({ rows: [] as { bus_id: string }[] }));
      if (busIdsResult.rows.length === 0) {
        busIdsResult = await query<{ bus_id: string }>(
          `select b.id as bus_id from buses b join vendor_listings vl on vl.listing_id = b.listing_id and vl.vendor_id = $1`,
          [vendorId]
        ).catch(() => ({ rows: [] as { bus_id: string }[] }));
      }

      const busIds = busIdsResult.rows.map((r) => r.bus_id);
      const now = new Date();
      const fromDate = new Date(now);
      fromDate.setFullYear(fromDate.getFullYear() - 1);
      const toDate = new Date(now);
      toDate.setFullYear(toDate.getFullYear() + 1); // include future travel dates (e.g. bookings for next year)
      const fromStr = fromDate.toISOString().slice(0, 10);
      const toStr = toDate.toISOString().slice(0, 10);

      const seen = new Map<string, { name: string; phone: string; totalBookings: number; totalSpentCents: number; lastBookingAt: string | null }>();

      for (const busId of busIds) {
        const bookings = await fetchBookingsForBusRange(busId, fromStr, toStr);
        for (const b of bookings) {
          const email = (b.email ?? "").trim().toLowerCase() || `unknown-${b.passengerName}-${Math.random().toString(36).slice(2)}`;
          const existing = seen.get(email);
          const totalCents = typeof b.totalCents === "number" ? b.totalCents : 0;
          const createdAt = b.createdAt ?? "";
          if (existing) {
            existing.totalBookings += 1;
            existing.totalSpentCents += totalCents;
            if (createdAt && (!existing.lastBookingAt || createdAt > existing.lastBookingAt)) {
              existing.lastBookingAt = createdAt;
            }
            if (b.passengerName?.trim()) existing.name = b.passengerName.trim();
            if (b.phone?.trim()) existing.phone = b.phone.trim();
          } else {
            seen.set(email, {
              name: (b.passengerName ?? "").trim() || "Customer",
              phone: (b.phone ?? "").trim(),
              totalBookings: 1,
              totalSpentCents: totalCents,
              lastBookingAt: createdAt || null,
            });
          }
        }
      }

      // Also sync from car bookings (same DB: car_bookings + users). New customers added; existing (e.g. from bus) updated.
      let listingIdsResult = await query<{ id: string }>(
        `select id from listings where vendor_id = $1 and lower(trim(type)) = 'transport'`,
        [vendorId]
      ).catch(() => ({ rows: [] as { id: string }[] }));
      if (listingIdsResult.rows.length === 0) {
        listingIdsResult = await query<{ id: string }>(
          `select l.id from listings l join vendor_listings vl on vl.listing_id = l.id and vl.vendor_id = $1 where lower(trim(l.type)) = 'transport'`,
          [vendorId]
        ).catch(() => ({ rows: [] as { id: string }[] }));
      }
      const transportListingIds = listingIdsResult.rows.map((r) => r.id);
      if (transportListingIds.length > 0) {
        const carRows = await query<{
          user_id: string;
          user_email: string | null;
          user_full_name: string | null;
          total_cents: number | null;
          created_at: string;
        }>(
          `select b.user_id, u.email as user_email, u.full_name as user_full_name, b.total_cents, b.created_at
           from car_bookings b
           left join users u on u.id = b.user_id
           where b.listing_id = any($1::uuid[])
             and b.travel_date >= $2::date and b.travel_date <= $3::date`,
          [transportListingIds, fromStr, toStr]
        ).catch(() => ({ rows: [] as { user_id: string; user_email: string | null; user_full_name: string | null; total_cents: number | null; created_at: string }[] }));
        for (const row of carRows.rows) {
          const email = (row.user_email ?? "").trim().toLowerCase() || `unknown-car-${row.user_id}`;
          const existing = seen.get(email);
          const totalCents = row.total_cents != null && row.total_cents >= 0 ? row.total_cents : 0;
          const createdAt = row.created_at ?? "";
          const name = (row.user_full_name ?? "").trim() || "Customer";
          if (existing) {
            existing.totalBookings += 1;
            existing.totalSpentCents += totalCents;
            if (createdAt && (!existing.lastBookingAt || createdAt > existing.lastBookingAt)) {
              existing.lastBookingAt = createdAt;
            }
            if (name !== "Customer") existing.name = name;
          } else {
            seen.set(email, {
              name,
              phone: "",
              totalBookings: 1,
              totalSpentCents: totalCents,
              lastBookingAt: createdAt || null,
            });
          }
        }

        // Sync from flight bookings (same DB: flight_bookings + users).
        const flightRows = await query<{
          user_id: string;
          user_email: string | null;
          user_full_name: string | null;
          total_cents: number | null;
          created_at: string;
        }>(
          `select b.user_id, u.email as user_email, u.full_name as user_full_name, b.total_cents, b.created_at
           from flight_bookings b
           left join users u on u.id = b.user_id
           where b.listing_id = any($1::uuid[])
             and b.travel_date >= $2::date and b.travel_date <= $3::date`,
          [transportListingIds, fromStr, toStr]
        ).catch(() => ({ rows: [] as { user_id: string; user_email: string | null; user_full_name: string | null; total_cents: number | null; created_at: string }[] }));
        for (const row of flightRows.rows) {
          const email = (row.user_email ?? "").trim().toLowerCase() || `unknown-flight-${row.user_id}`;
          const existing = seen.get(email);
          const totalCents = row.total_cents != null && row.total_cents >= 0 ? row.total_cents : 0;
          const createdAt = row.created_at ?? "";
          const name = (row.user_full_name ?? "").trim() || "Customer";
          if (existing) {
            existing.totalBookings += 1;
            existing.totalSpentCents += totalCents;
            if (createdAt && (!existing.lastBookingAt || createdAt > existing.lastBookingAt)) {
              existing.lastBookingAt = createdAt;
            }
            if (name !== "Customer") existing.name = name;
          } else {
            seen.set(email, {
              name,
              phone: "",
              totalBookings: 1,
              totalSpentCents: totalCents,
              lastBookingAt: createdAt || null,
            });
          }
        }
      }

      // Replace vendor's customer list with aggregated data from bus + car + flight (idempotent sync)
      await query("delete from vendor_customers where vendor_id = $1", [vendorId]);
      for (const [email, data] of seen) {
        await query(
          `insert into vendor_customers (vendor_id, email, name, phone, total_bookings, total_spent_cents, last_booking_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7::timestamptz, now())`,
          [vendorId, email, data.name, data.phone || null, data.totalBookings, data.totalSpentCents, data.lastBookingAt]
        );
      }
    }

    const listResult = await query<{
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      total_bookings: number;
      total_spent_cents: string;
      last_booking_at: string | null;
    }>(
      `select id, email, name, phone, total_bookings, total_spent_cents, last_booking_at
       from vendor_customers
       where vendor_id = $1
       order by last_booking_at desc nulls last, total_bookings desc`,
      [vendorId]
    ).catch(() => ({ rows: [] as { id: string; email: string; name: string | null; phone: string | null; total_bookings: number; total_spent_cents: string; last_booking_at: string | null }[] }));

    const customers = listResult.rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name ?? "Customer",
      phone: r.phone ?? "",
      totalBookings: r.total_bookings,
      lastBookingAt: r.last_booking_at,
      totalSpentCents: parseInt(r.total_spent_cents, 10) || 0,
    }));

    res.json({ customers });
  } catch (err) {
    console.error("Customers list/sync error:", err);
    res.status(500).json({ error: "Failed to load customers" });
  }
});

export default router;

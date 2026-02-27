import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();

export type AdminBookingRow = {
  id: string;
  type: string;
  bookingRef: string;
  userName: string;
  vendorName: string;
  amountCents: number;
  paid: boolean;
  paidAt: string | null;
};

/** GET /api/admin/bookings — List all bookings across transport, car, flight, hotel, experience, event. 10% admin, 90% vendor. */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const all: AdminBookingRow[] = [];

  try {
    // Transport (bus) — main app; no paid_at, treat all as paid
    const transport = await query<{ id: string; booking_id: string; full_name: string | null; listing_name: string | null; total_cents: number; created_at: string }>(
      `SELECT tb.id::text, tb.booking_id, u.full_name, tb.listing_name, tb.total_cents, tb.created_at::text
       FROM transport_bookings tb
       LEFT JOIN users u ON u.id = tb.user_id
       ORDER BY tb.created_at DESC`
    );
    transport.rows.forEach((r) => {
      all.push({
        id: r.id,
        type: "Bus",
        bookingRef: r.booking_id,
        userName: r.full_name?.trim() || "—",
        vendorName: r.listing_name?.trim() || "—",
        amountCents: r.total_cents ?? 0,
        paid: true,
        paidAt: r.created_at,
      });
    });
  } catch (e) {
    console.error("[admin/bookings] transport", e);
  }

  try {
    const car = await query<{ id: string; booking_ref: string; full_name: string | null; listing_name: string | null; total_cents: number | null; paid_at: string | null }>(
      `SELECT cb.id::text, cb.booking_ref, u.full_name, l.name AS listing_name, cb.total_cents, cb.paid_at::text
       FROM car_bookings cb
       LEFT JOIN users u ON u.id = cb.user_id
       LEFT JOIN listings l ON l.id = cb.listing_id
       WHERE cb.status NOT IN ('rejected')
       ORDER BY COALESCE(cb.paid_at, cb.created_at) DESC`
    );
    car.rows.forEach((r) => {
      const paid = r.paid_at != null;
      all.push({
        id: r.id,
        type: "Car",
        bookingRef: r.booking_ref,
        userName: r.full_name?.trim() || "—",
        vendorName: r.listing_name?.trim() || "—",
        amountCents: r.total_cents ?? 0,
        paid,
        paidAt: r.paid_at,
      });
    });
  } catch (e) {
    console.error("[admin/bookings] car", e);
  }

  try {
    const flight = await query<{ id: string; booking_ref: string; full_name: string | null; listing_name: string | null; total_cents: number; paid_at: string | null }>(
      `SELECT fb.id::text, fb.booking_ref, u.full_name, l.name AS listing_name, fb.total_cents, fb.paid_at::text
       FROM flight_bookings fb
       LEFT JOIN users u ON u.id = fb.user_id
       LEFT JOIN listings l ON l.id = fb.listing_id
       WHERE fb.status NOT IN ('rejected')
       ORDER BY COALESCE(fb.paid_at, fb.created_at) DESC`
    );
    flight.rows.forEach((r) => {
      const paid = r.paid_at != null;
      all.push({
        id: r.id,
        type: "Flight",
        bookingRef: r.booking_ref,
        userName: r.full_name?.trim() || "—",
        vendorName: r.listing_name?.trim() || "—",
        amountCents: r.total_cents ?? 0,
        paid,
        paidAt: r.paid_at,
      });
    });
  } catch (e) {
    console.error("[admin/bookings] flight", e);
  }

  try {
    const hotel = await query<{ id: string; booking_ref: string; full_name: string | null; listing_name: string | null; total_cents: number | null; status: string; updated_at: string }>(
      `SELECT hb.id::text, hb.booking_ref, u.full_name, l.name AS listing_name, hb.total_cents, hb.status, hb.updated_at::text
       FROM hotel_bookings hb
       LEFT JOIN users u ON u.id = hb.user_id
       LEFT JOIN listings l ON l.id = hb.listing_id
       WHERE hb.status NOT IN ('rejected')
       ORDER BY hb.updated_at DESC`
    );
    hotel.rows.forEach((r) => {
      const paid = r.status === "confirmed" && r.total_cents != null && r.total_cents > 0;
      all.push({
        id: r.id,
        type: "Hotel",
        bookingRef: r.booking_ref,
        userName: r.full_name?.trim() || "—",
        vendorName: r.listing_name?.trim() || "—",
        amountCents: r.total_cents ?? 0,
        paid,
        paidAt: paid ? r.updated_at : null,
      });
    });
  } catch (e) {
    console.error("[admin/bookings] hotel", e);
  }

  try {
    const exp = await query<{ id: string; booking_ref: string; full_name: string | null; listing_name: string | null; total_cents: number; paid_at: string | null }>(
      `SELECT eb.id::text, eb.booking_ref, u.full_name, l.name AS listing_name, eb.total_cents, eb.paid_at::text
       FROM experience_bookings eb
       LEFT JOIN users u ON u.id = eb.user_id
       LEFT JOIN experiences ex ON ex.id = eb.experience_id
       LEFT JOIN listings l ON l.id = ex.listing_id
       ORDER BY COALESCE(eb.paid_at, eb.created_at) DESC`
    );
    exp.rows.forEach((r) => {
      const paid = r.paid_at != null;
      all.push({
        id: r.id,
        type: "Experience",
        bookingRef: r.booking_ref,
        userName: r.full_name?.trim() || "—",
        vendorName: r.listing_name?.trim() || "—",
        amountCents: r.total_cents ?? 0,
        paid,
        paidAt: r.paid_at,
      });
    });
  } catch (e) {
    console.error("[admin/bookings] experience", e);
  }

  try {
    const evt = await query<{ id: string; booking_ref: string; full_name: string | null; listing_name: string | null; total_cents: number; paid_at: string | null }>(
      `SELECT eb.id::text, eb.booking_ref, u.full_name, l.name AS listing_name, eb.total_cents, eb.paid_at::text
       FROM event_bookings eb
       LEFT JOIN users u ON u.id = eb.user_id
       LEFT JOIN events e ON e.id = eb.event_id
       LEFT JOIN listings l ON l.id = e.listing_id
       ORDER BY COALESCE(eb.paid_at, eb.created_at) DESC`
    );
    evt.rows.forEach((r) => {
      const paid = r.paid_at != null;
      all.push({
        id: r.id,
        type: "Event",
        bookingRef: r.booking_ref,
        userName: r.full_name?.trim() || "—",
        vendorName: r.listing_name?.trim() || "—",
        amountCents: r.total_cents ?? 0,
        paid,
        paidAt: r.paid_at,
      });
    });
  } catch (e) {
    console.error("[admin/bookings] event", e);
  }

  // Sort by paidAt desc (nulls last), then by id
  all.sort((a, b) => {
    const aTime = a.paidAt ? new Date(a.paidAt).getTime() : 0;
    const bTime = b.paidAt ? new Date(b.paidAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.id.localeCompare(b.id);
  });

  const totalPaidCents = all.filter((b) => b.paid).reduce((s, b) => s + b.amountCents, 0);
  const adminShareCents = Math.round(totalPaidCents * 0.1);
  const vendorShareCents = totalPaidCents - adminShareCents;

  res.json({
    bookings: all,
    totalPaidCents,
    adminShareCents,
    vendorShareCents,
  });
});

export default router;

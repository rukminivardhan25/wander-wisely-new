import { Router, Request, Response } from "express";
import { z } from "zod";
import { query, pool } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  hotelBranchId: z.string().uuid(),
  listingId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.coerce.number().int().min(1).max(90),
  guestName: z.string().min(1),
  guestPhone: z.string().optional().nullable(),
  guestEmail: z.string().optional().nullable(),
  requirementsText: z.string().optional().nullable(),
  documentUrls: z.array(z.object({ label: z.string(), url: z.string() })).optional().default([]),
  roomType: z.string().optional().nullable(),
  totalCents: z.coerce.number().int().min(0).optional().nullable(),
});

function bookingRef(): string {
  const s = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HTL-${s()}-${s()}`;
}

/** GET /api/hotel-bookings — List current user's hotel bookings */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const result = await query<{
      id: string;
      booking_ref: string;
      hotel_branch_id: string;
      listing_id: string;
      check_in: string;
      check_out: string;
      nights: number;
      guest_name: string;
      guest_phone: string | null;
      guest_email: string | null;
      status: string;
      room_number: string | null;
      total_cents: number | null;
      created_at: string;
    }>(
      `SELECT id, booking_ref, hotel_branch_id, listing_id, check_in, check_out, nights,
              guest_name, guest_phone, guest_email, status, room_number, total_cents, created_at
       FROM hotel_bookings WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({
      bookings: result.rows.map((r) => ({
        id: r.id,
        bookingRef: r.booking_ref,
        hotelBranchId: r.hotel_branch_id,
        listingId: r.listing_id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        nights: r.nights,
        guestName: r.guest_name,
        guestPhone: r.guest_phone ?? undefined,
        guestEmail: r.guest_email ?? undefined,
        status: r.status,
        roomNumber: r.room_number ?? undefined,
        totalCents: r.total_cents ?? undefined,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "42P01") res.json({ bookings: [] });
    else {
      console.error("List hotel bookings error:", err);
      res.status(500).json({ error: "Failed to list hotel bookings" });
    }
  }
});

/** POST /api/hotel-bookings — Create booking request */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0] ? `${parsed.error.errors[0].path.join(".")}: ${parsed.error.errors[0].message}` : "Validation failed";
      res.status(400).json({ error: msg });
      return;
    }
    const d = parsed.data;
    const ref = bookingRef();
    await pool.query(
      `INSERT INTO hotel_bookings (
        user_id, booking_ref, hotel_branch_id, listing_id, check_in, check_out, nights,
        guest_name, guest_phone, guest_email, requirements_text, document_urls, status,
        room_type, total_cents
      ) VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11, $12::jsonb, 'pending_vendor', $13, $14)`,
      [
        userId,
        ref,
        d.hotelBranchId,
        d.listingId,
        d.checkIn,
        d.checkOut,
        d.nights,
        d.guestName.trim(),
        d.guestPhone?.trim() || null,
        d.guestEmail?.trim() || null,
        d.requirementsText?.trim() || null,
        JSON.stringify(d.documentUrls || []),
        d.roomType?.trim() || null,
        d.totalCents ?? null,
      ]
    );
    const row = await query<{ id: string; booking_ref: string; status: string }>(
      "SELECT id, booking_ref, status FROM hotel_bookings WHERE booking_ref = $1",
      [ref]
    );
    const b = row.rows[0];
    res.status(201).json({
      id: b?.id,
      bookingRef: b?.booking_ref ?? ref,
      status: b?.status ?? "pending_vendor",
    });
  } catch (err) {
    console.error("Create hotel booking error:", err);
    const msg = String((err as Error)?.message ?? "");
    if (msg.includes("hotel_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Hotel bookings not set up. Run schema 013_hotel_bookings.sql." });
      return;
    }
    res.status(500).json({ error: "Failed to create hotel booking" });
  }
});

/** GET /api/hotel-bookings/:id — Get one booking (for receipt) */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const result = await query<{
      id: string;
      booking_ref: string;
      hotel_branch_id: string;
      listing_id: string;
      check_in: string;
      check_out: string;
      nights: number;
      guest_name: string;
      guest_phone: string | null;
      guest_email: string | null;
      requirements_text: string | null;
      document_urls: unknown;
      status: string;
      room_type: string | null;
      room_number: string | null;
      total_cents: number | null;
      vendor_notes: string | null;
      created_at: string;
      branch_name: string;
      branch_city: string | null;
      branch_full_address: string | null;
      branch_contact_number: string | null;
      listing_name: string;
    }>(
      `SELECT hb.id, hb.booking_ref, hb.hotel_branch_id, hb.listing_id, hb.check_in, hb.check_out, hb.nights,
              hb.guest_name, hb.guest_phone, hb.guest_email, hb.requirements_text, hb.document_urls,
              hb.status, hb.room_type, hb.room_number, hb.total_cents, hb.vendor_notes, hb.created_at,
              br.name AS branch_name, br.city AS branch_city, br.full_address AS branch_full_address, br.contact_number AS branch_contact_number,
              l.name AS listing_name
       FROM hotel_bookings hb
       LEFT JOIN hotel_branches br ON br.id = hb.hotel_branch_id
       LEFT JOIN listings l ON l.id = hb.listing_id
       WHERE hb.id = $1 AND hb.user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      bookingRef: r.booking_ref,
      hotelBranchId: r.hotel_branch_id,
      listingId: r.listing_id,
      checkIn: r.check_in,
      checkOut: r.check_out,
      nights: r.nights,
      guestName: r.guest_name,
      guestPhone: r.guest_phone ?? undefined,
      guestEmail: r.guest_email ?? undefined,
      requirementsText: r.requirements_text ?? undefined,
      documentUrls: (r.document_urls as { label?: string; url?: string }[]) ?? [],
      status: r.status,
      roomType: r.room_type ?? undefined,
      roomNumber: r.room_number ?? undefined,
      totalCents: r.total_cents ?? undefined,
      vendorNotes: r.vendor_notes ?? undefined,
      createdAt: r.created_at,
      branchName: r.branch_name,
      branchCity: r.branch_city ?? undefined,
      branchFullAddress: r.branch_full_address ?? undefined,
      branchContactNumber: r.branch_contact_number ?? undefined,
      listingName: r.listing_name,
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "42P01") {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    console.error("Get hotel booking error:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

export default router;

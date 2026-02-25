import { Router, Request, Response } from "express";
import { query, pool } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function ensureListingOwned(listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "SELECT id FROM listings WHERE id = $1 AND vendor_id = $2",
    [listingId, vendorId]
  );
  return r.rows.length > 0;
}

/** GET /api/listings/:listingId/hotel-bookings — List hotel booking requests for this listing */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await pool.query<{
      id: string;
      booking_ref: string;
      user_id: string;
      hotel_branch_id: string;
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
      created_at: string;
      branch_name: string | null;
    }>(
      `SELECT hb.id, hb.booking_ref, hb.user_id, hb.hotel_branch_id,
              hb.check_in::text, hb.check_out::text, hb.nights,
              hb.guest_name, hb.guest_phone, hb.guest_email, hb.requirements_text, hb.document_urls,
              hb.status, hb.room_type, hb.room_number, hb.total_cents, hb.created_at,
              br.name AS branch_name
       FROM hotel_bookings hb
       LEFT JOIN hotel_branches br ON br.id = hb.hotel_branch_id
       WHERE hb.listing_id = $1
       ORDER BY hb.created_at DESC`,
      [listingId]
    );
    const bookings = result.rows.map((r) => ({
      id: r.id,
      bookingRef: r.booking_ref,
      userId: r.user_id,
      hotelBranchId: r.hotel_branch_id,
      branchName: r.branch_name ?? undefined,
      checkIn: r.check_in,
      checkOut: r.check_out,
      nights: r.nights,
      guestName: r.guest_name,
      guestPhone: r.guest_phone ?? undefined,
      guestEmail: r.guest_email ?? undefined,
      requirementsText: r.requirements_text ?? undefined,
      documentUrls: (r.document_urls as string[]) ?? [],
      status: r.status,
      roomType: r.room_type ?? undefined,
      roomNumber: r.room_number ?? undefined,
      totalCents: r.total_cents ?? undefined,
      createdAt: r.created_at,
    }));
    res.json({ bookings });
  } catch (err) {
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("hotel_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Hotel bookings not set up. Run main backend schema 013_hotel_bookings.sql." });
      return;
    }
    console.error("List hotel bookings error:", err);
    res.status(500).json({ error: "Failed to list hotel bookings" });
  }
});

/** GET /api/listings/:listingId/hotel-bookings/:bookingId — One booking detail */
router.get("/:bookingId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const { bookingId } = req.params;
    if (!listingId || !bookingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await pool.query<{
      id: string;
      booking_ref: string;
      user_id: string;
      hotel_branch_id: string;
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
      created_at: string;
      branch_name: string | null;
      branch_city: string | null;
      branch_address: string | null;
    }>(
      `SELECT hb.id, hb.booking_ref, hb.user_id, hb.hotel_branch_id,
              hb.check_in::text, hb.check_out::text, hb.nights,
              hb.guest_name, hb.guest_phone, hb.guest_email, hb.requirements_text, hb.document_urls,
              hb.status, hb.room_type, hb.room_number, hb.total_cents, hb.created_at,
              br.name AS branch_name, br.city AS branch_city, br.full_address AS branch_address
       FROM hotel_bookings hb
       LEFT JOIN hotel_branches br ON br.id = hb.hotel_branch_id
       WHERE hb.id = $1 AND hb.listing_id = $2`,
      [bookingId, listingId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Hotel booking not found" });
      return;
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      bookingRef: r.booking_ref,
      userId: r.user_id,
      hotelBranchId: r.hotel_branch_id,
      branchName: r.branch_name ?? undefined,
      branchCity: r.branch_city ?? undefined,
      branchAddress: r.branch_address ?? undefined,
      checkIn: r.check_in,
      checkOut: r.check_out,
      nights: r.nights,
      guestName: r.guest_name,
      guestPhone: r.guest_phone ?? undefined,
      guestEmail: r.guest_email ?? undefined,
      requirementsText: r.requirements_text ?? undefined,
      documentUrls: (r.document_urls as string[]) ?? [],
      status: r.status,
      roomType: r.room_type ?? undefined,
      roomNumber: r.room_number ?? undefined,
      totalCents: r.total_cents ?? undefined,
      createdAt: r.created_at,
    });
  } catch (err) {
    console.error("Hotel booking detail error:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

/** PATCH /api/listings/:listingId/hotel-bookings/:bookingId/approve — Approve and allot room */
router.patch("/:bookingId/approve", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const { bookingId } = req.params;
    if (!listingId || !bookingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const roomNumber = typeof req.body?.roomNumber === "string" ? req.body.roomNumber.trim() : null;
    if (!roomNumber) {
      res.status(400).json({ error: "roomNumber is required" });
      return;
    }
    const totalCents = typeof req.body?.totalCents === "number" ? req.body.totalCents : null;
    const vendorNotes = typeof req.body?.vendorNotes === "string" ? req.body.vendorNotes.trim() : null;
    const current = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM hotel_bookings WHERE id = $1 AND listing_id = $2",
      [bookingId, listingId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Hotel booking not found" });
      return;
    }
    if (current.rows[0].status !== "pending_vendor") {
      res.status(400).json({ error: "Booking is not pending. Already approved or rejected." });
      return;
    }
    await pool.query(
      `UPDATE hotel_bookings SET status = 'approved', room_number = $1, total_cents = COALESCE($2, total_cents), vendor_notes = $5, updated_at = now() WHERE id = $3 AND listing_id = $4`,
      [roomNumber, totalCents, bookingId, listingId, vendorNotes]
    );
    res.json({ ok: true, status: "approved", roomNumber });
  } catch (err) {
    console.error("Approve hotel booking error:", err);
    res.status(500).json({ error: "Failed to approve booking" });
  }
});

/** PATCH /api/listings/:listingId/hotel-bookings/:bookingId/reject — Reject request */
router.patch("/:bookingId/reject", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId ?? (req as unknown as { listingId?: string }).listingId;
    const { bookingId } = req.params;
    if (!listingId || !bookingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const current = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM hotel_bookings WHERE id = $1 AND listing_id = $2",
      [bookingId, listingId]
    );
    if (current.rows.length === 0) {
      res.status(404).json({ error: "Hotel booking not found" });
      return;
    }
    await pool.query(
      "UPDATE hotel_bookings SET status = 'rejected', updated_at = now() WHERE id = $1 AND listing_id = $2",
      [bookingId, listingId]
    );
    res.json({ ok: true, status: "rejected" });
  } catch (err) {
    console.error("Reject hotel booking error:", err);
    res.status(500).json({ error: "Failed to reject booking" });
  }
});

export default router;

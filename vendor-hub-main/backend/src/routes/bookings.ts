import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// List bookings for my listings
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const result = await query<{
      id: string;
      listing_id: string;
      listing_name: string;
      customer_name: string;
      customer_email: string;
      status: string;
      payment_status: string;
      amount_cents: number;
      guests: number;
      booked_at: string;
      booked_for_date: string | null;
    }>(
      `select b.id, b.listing_id, l.name as listing_name, b.customer_name, b.customer_email, b.status, b.payment_status, b.amount_cents, b.guests, b.booked_at, b.booked_for_date
       from vendor_bookings b
       join listings l on l.id = b.listing_id
       join vendor_listings vl on vl.listing_id = b.listing_id
       where vl.vendor_id = $1
       order by b.booked_at desc`,
      [vendorId]
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    console.error("List bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Get one booking
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { id } = req.params;
    const result = await query<{
      id: string;
      listing_id: string;
      listing_name: string;
      customer_name: string;
      customer_email: string;
      status: string;
      payment_status: string;
      amount_cents: number;
      guests: number;
      booked_at: string;
      booked_for_date: string | null;
      notes: string | null;
    }>(
      `select b.id, b.listing_id, l.name as listing_name, b.customer_name, b.customer_email, b.status, b.payment_status, b.amount_cents, b.guests, b.booked_at, b.booked_for_date, b.notes
       from vendor_bookings b
       join listings l on l.id = b.listing_id
       join vendor_listings vl on vl.listing_id = b.listing_id
       where b.id = $1 and vl.vendor_id = $2`,
      [id, vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get booking error:", err);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

export default router;

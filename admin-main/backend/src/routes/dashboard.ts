import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();

/** GET /api/dashboard/stats — real counts for admin dashboard */
router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [vendorsRes, listingsRes, pendingListingsRes, pendingBusesRes, pendingCarsRes, pendingFlightsRes, pendingBranchesRes, verifiedTodayListingsRes, verifiedTodayBusesRes, verifiedTodayCarsRes, verifiedTodayFlightsRes] = await Promise.all([
      query<{ count: string }>("SELECT COUNT(*) AS count FROM vendors"),
      query<{ count: string }>("SELECT COUNT(*) AS count FROM listings"),
      query<{ count: string }>("SELECT COUNT(*) AS count FROM listings WHERE verification_status = 'pending'"),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM buses WHERE verification_token IS NOT NULL AND (verification_status IS NULL OR verification_status IN ('no_request', 'pending'))`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM cars WHERE verification_token IS NOT NULL AND (verification_status IS NULL OR verification_status IN ('no_request', 'pending'))`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM flights WHERE verification_token IS NOT NULL AND (verification_status IS NULL OR verification_status IN ('no_request', 'pending'))`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM hotel_branches WHERE verification_token IS NOT NULL AND (verification_status IS NULL OR verification_status IN ('no_request', 'pending'))`
      ).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>("SELECT COUNT(*) AS count FROM listings WHERE verified_at::date = $1::date", [today]).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>("SELECT COUNT(*) AS count FROM buses WHERE verified_at::date = $1::date", [today]).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>("SELECT COUNT(*) AS count FROM cars WHERE verified_at::date = $1::date", [today]).catch(() => ({ rows: [{ count: "0" }] })),
      query<{ count: string }>("SELECT COUNT(*) AS count FROM flights WHERE verified_at::date = $1::date", [today]).catch(() => ({ rows: [{ count: "0" }] })),
    ]);

    const totalVendors = parseInt(vendorsRes.rows[0]?.count ?? "0", 10);
    const totalListings = parseInt(listingsRes.rows[0]?.count ?? "0", 10);
    const pendingVerification =
      parseInt(pendingListingsRes.rows[0]?.count ?? "0", 10) +
      parseInt(pendingBusesRes.rows[0]?.count ?? "0", 10) +
      parseInt(pendingCarsRes.rows[0]?.count ?? "0", 10) +
      parseInt(pendingFlightsRes.rows[0]?.count ?? "0", 10) +
      parseInt(pendingBranchesRes.rows[0]?.count ?? "0", 10);
    const verifiedToday =
      parseInt(verifiedTodayListingsRes.rows[0]?.count ?? "0", 10) +
      parseInt(verifiedTodayBusesRes.rows[0]?.count ?? "0", 10) +
      parseInt(verifiedTodayCarsRes.rows[0]?.count ?? "0", 10) +
      parseInt(verifiedTodayFlightsRes.rows[0]?.count ?? "0", 10);

    res.json({
      totalVendors,
      totalListings,
      pendingVerification,
      verifiedToday,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();

/** GET /api/hotels?city=Hyderabad — List verified hotel branches by city (public). */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const city = (req.query.city as string)?.trim();
    if (!city) {
      res.status(400).json({ error: "Query 'city' is required" });
      return;
    }
    const result = await query<{
      id: string;
      name: string;
      city: string | null;
      area_locality: string | null;
      full_address: string | null;
      description: string | null;
      listing_id: string;
      listing_name: string;
    }>(
      `SELECT hb.id, hb.name, hb.city, hb.area_locality, hb.full_address, hb.description, hb.listing_id,
              l.name AS listing_name
       FROM hotel_branches hb
       JOIN listings l ON l.id = hb.listing_id
       WHERE LOWER(TRIM(hb.city)) = LOWER(TRIM($1))
         AND (hb.verification_status IN ('approved', 'verified'))
       ORDER BY hb.name`,
      [city]
    );
    res.json({ hotels: result.rows });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "42P01") {
      res.json({ hotels: [] });
      return;
    }
    console.error("List hotels error:", err);
    res.status(500).json({ error: "Failed to list hotels" });
  }
});

/** GET /api/hotels/:branchId — Get one verified hotel branch (public). */
router.get("/:branchId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.params;
    const result = await query<{
      id: string;
      name: string;
      city: string | null;
      area_locality: string | null;
      full_address: string | null;
      pincode: string | null;
      landmark: string | null;
      contact_number: string | null;
      email: string | null;
      description: string | null;
      listing_id: string;
      listing_name: string;
      extra_details: unknown;
    }>(
      `SELECT hb.id, hb.name, hb.city, hb.area_locality, hb.full_address, hb.pincode, hb.landmark,
              hb.contact_number, hb.email, hb.description, hb.listing_id,
              l.name AS listing_name,
              COALESCE(hb.extra_details, '{}'::jsonb) AS extra_details
       FROM hotel_branches hb
       JOIN listings l ON l.id = hb.listing_id
       WHERE hb.id = $1 AND (hb.verification_status IN ('approved', 'verified'))`,
      [branchId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Hotel not found" });
      return;
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      city: row.city,
      area_locality: row.area_locality,
      full_address: row.full_address,
      pincode: row.pincode,
      landmark: row.landmark,
      contact_number: row.contact_number,
      email: row.email,
      description: row.description,
      listing_id: row.listing_id,
      listing_name: row.listing_name,
      extra_details: row.extra_details,
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "42P01") {
      res.status(404).json({ error: "Hotel not found" });
      return;
    }
    console.error("Get hotel error:", err);
    res.status(500).json({ error: "Failed to fetch hotel" });
  }
});

export default router;

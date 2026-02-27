import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const BOOKING_TYPES = ["transport", "car", "flight", "hotel", "experience", "event"] as const;
const SCOPE_TYPES = ["bus", "car", "hotel_branch"] as const;

/**
 * POST /api/booking-reviews
 * Create a review for a booking (called when user submits from main app).
 * Body: { user_id, user_name?, listing_id, booking_type, booking_id, rating, comment?, scope_entity_type?, scope_entity_id? }
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const user_id = body.user_id as string | undefined;
    const user_name = (body.user_name as string | undefined) ?? null;
    const listing_id = body.listing_id as string | undefined;
    const booking_type = body.booking_type as string | undefined;
    const booking_id = body.booking_id as string | undefined;
    const rating = typeof body.rating === "number" ? body.rating : undefined;
    const comment = (body.comment as string | undefined) ?? null;
    const scope_entity_type = body.scope_entity_type as string | undefined;
    const scope_entity_id = body.scope_entity_id as string | undefined;

    if (!user_id || typeof user_id !== "string" || !listing_id || typeof listing_id !== "string") {
      res.status(400).json({ error: "user_id and listing_id are required" });
      return;
    }
    if (!BOOKING_TYPES.includes(booking_type as (typeof BOOKING_TYPES)[number])) {
      res.status(400).json({ error: "booking_type must be one of: " + BOOKING_TYPES.join(", ") });
      return;
    }
    if (!booking_id || typeof booking_id !== "string") {
      res.status(400).json({ error: "booking_id is required" });
      return;
    }
    if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: "rating must be 1–5" });
      return;
    }
    if (scope_entity_type != null && !SCOPE_TYPES.includes(scope_entity_type as (typeof SCOPE_TYPES)[number])) {
      res.status(400).json({ error: "scope_entity_type must be one of: " + SCOPE_TYPES.join(", ") + " or omitted" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO public.booking_reviews (
        user_id, user_name, listing_id, scope_entity_type, scope_entity_id, booking_type, booking_id, rating, comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, listing_id, scope_entity_type, scope_entity_id, booking_type, booking_id, rating, comment, created_at`,
      [
        user_id,
        user_name,
        listing_id,
        scope_entity_type ?? null,
        scope_entity_id ?? null,
        booking_type,
        booking_id,
        rating,
        comment,
      ]
    );
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      listing_id: row.listing_id,
      scope_entity_type: row.scope_entity_type,
      scope_entity_id: row.scope_entity_id,
      booking_type: row.booking_type,
      booking_id: row.booking_id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Insert failed";
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "A review already exists for this booking" });
      return;
    }
    console.error("booking_reviews POST error:", err);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/booking-reviews
 * List reviews for the vendor's listings (vendor auth required).
 * Query: listing_id (optional) — filter by one listing; scope_entity_type, scope_entity_id (optional) — filter by scope.
 */
router.get("/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId;
    if (!vendorId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const listingIdParam = typeof req.query.listing_id === "string" ? req.query.listing_id.trim() : null;
    const scopeTypeParam = typeof req.query.scope_entity_type === "string" ? req.query.scope_entity_type.trim() : null;
    const scopeIdParam = typeof req.query.scope_entity_id === "string" ? req.query.scope_entity_id.trim() : null;

    let listingIds: string[];
    if (listingIdParam) {
      const allowed = await pool.query(
        "SELECT listing_id FROM public.vendor_listings WHERE vendor_id = $1 AND listing_id = $2",
        [vendorId, listingIdParam]
      );
      if (allowed.rows.length === 0) {
        res.status(403).json({ error: "Not allowed to access this listing" });
        return;
      }
      listingIds = [listingIdParam];
    } else {
      let listResult: { rows: { listing_id: string }[] };
      try {
        listResult = await pool.query<{ listing_id: string }>(
          "SELECT listing_id FROM public.vendor_listings WHERE vendor_id = $1",
          [vendorId]
        );
      } catch {
        listResult = { rows: [] };
      }
      if (listResult.rows.length === 0) {
        try {
          const byVendor = await pool.query<{ id: string }>(
            "SELECT id FROM public.listings WHERE vendor_id = $1",
            [vendorId]
          );
          listingIds = byVendor.rows.map((r) => r.id);
        } catch {
          listingIds = [];
        }
      } else {
        listingIds = listResult.rows.map((r) => r.listing_id);
      }
    }

    if (listingIds.length === 0) {
      res.json({ reviews: [], listing_id: listingIdParam ?? null });
      return;
    }

    let sql = `
      SELECT id, user_id, user_name, listing_id, scope_entity_type, scope_entity_id, booking_type, booking_id, rating, comment, created_at
      FROM public.booking_reviews
      WHERE listing_id = ANY($1::uuid[])
    `;
    const params: unknown[] = [listingIds];
    let paramIndex = 2;
    if (scopeTypeParam) {
      sql += ` AND scope_entity_type = $${paramIndex}`;
      params.push(scopeTypeParam);
      paramIndex++;
    }
    if (scopeIdParam) {
      sql += ` AND scope_entity_id = $${paramIndex}`;
      params.push(scopeIdParam);
      paramIndex++;
    }
    sql += " ORDER BY created_at DESC";

    const result = await pool.query(sql, params);
    res.json({
      reviews: result.rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        user_name: r.user_name,
        listing_id: r.listing_id,
        scope_entity_type: r.scope_entity_type,
        scope_entity_id: r.scope_entity_id,
        booking_type: r.booking_type,
        booking_id: r.booking_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error("booking_reviews GET error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Query failed" });
  }
});

export default router;

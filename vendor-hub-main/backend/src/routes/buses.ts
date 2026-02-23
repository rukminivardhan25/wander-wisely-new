import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import busSchedulesRoutes from "./busSchedules.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const busTypes = ["seater", "sleeper", "semi_sleeper"] as const;
const layoutTypes = ["2+2", "2+1", "sleeper", "custom"] as const;

const acTypes = ["ac", "non_ac"] as const;

const busSchema = z.object({
  name: z.string().min(1),
  bus_number: z.string().optional().nullable(),
  bus_type: z.enum(busTypes),
  ac_type: z.enum(acTypes).optional(),
  registration_number: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  has_wifi: z.boolean().optional(),
  has_charging: z.boolean().optional(),
  has_entertainment: z.boolean().optional(),
  has_toilet: z.boolean().optional(),
  photo_url: z.string().url().optional().nullable().or(z.literal("")),
  layout_type: z.enum(layoutTypes),
  rows: z.number().int().min(1).max(50),
  left_cols: z.number().int().min(0).max(5),
  right_cols: z.number().int().min(0).max(5),
  has_aisle: z.boolean().optional(),
  base_price_per_seat_cents: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const createSchema = busSchema.refine((d) => d.rows * (d.left_cols + d.right_cols) >= 1 && d.rows * (d.left_cols + d.right_cols) <= 100, {
  message: "total_seats must be 1–100",
  path: ["rows"],
});

const updateSchema = busSchema.partial();

interface ListingRow {
  id: string;
  vendor_id: string;
  type: string;
}

/** Fetch listing and validate: must exist, belong to vendor, and be type=transport. Uses listings.vendor_id first (no vendor_listings table required); falls back to vendor_listings if that table exists and listing has no vendor_id. */
async function getTransportListing(listingId: string, vendorId: string): Promise<ListingRow | null> {
  // 1) Try listings.vendor_id first (works when vendor_listings table does not exist)
  try {
    const r = await query<ListingRow>(
      "SELECT id, vendor_id, type FROM listings WHERE id = $1 AND vendor_id = $2 AND LOWER(TRIM(type)) = 'transport'",
      [listingId, vendorId]
    );
    if (r.rows.length > 0) return r.rows[0];
  } catch (_) {
    // vendor_id column may not exist if 011 migration ran
  }
  // 2) Fallback: vendor_listings (only when that table exists)
  try {
    const vl = await query<{ listing_id: string }>(
      "SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2",
      [listingId, vendorId]
    );
    if (vl.rows.length > 0) {
      const l = await query<{ id: string; type: string }>("SELECT id, type FROM listings WHERE id = $1", [listingId]);
      if (l.rows.length > 0 && (l.rows[0].type || "").toLowerCase().trim() === "transport")
        return { id: l.rows[0].id, vendor_id: vendorId, type: l.rows[0].type };
    }
  } catch (_) {
    // vendor_listings table may not exist
  }
  return null;
}

function ensureListingOwned(listingId: string, vendorId: string): Promise<boolean> {
  return getTransportListing(listingId, vendorId).then((row) => row !== null);
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    if (!listingId) {
      console.log("[List buses] 404 - missing listingId, req.params:", req.params);
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    const listingRow = await getTransportListing(listingId, vendorId);
    if (!listingRow) {
      console.log("[List buses] 404 - listingId:", listingId, "vendorId:", vendorId);
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    // Return all buses for this listing (ownership already verified above)
    const result = await query<{
      id: string; name: string; bus_number: string | null; bus_type: string; ac_type: string | null;
      registration_number: string | null; manufacturer: string | null; model: string | null;
      has_wifi: boolean; has_charging: boolean; has_entertainment: boolean; has_toilet: boolean; photo_url: string | null;
      layout_type: string; rows: number; left_cols: number; right_cols: number; has_aisle: boolean; total_seats: number;
      base_price_per_seat_cents: number; status: string; created_at: string;
    }>(
      "select b.id, b.name, b.bus_number, b.bus_type, b.ac_type, b.registration_number, b.manufacturer, b.model, b.has_wifi, b.has_charging, b.has_entertainment, b.has_toilet, b.photo_url, b.layout_type, b.rows, b.left_cols, b.right_cols, b.has_aisle, b.total_seats, b.base_price_per_seat_cents, b.status, b.created_at from buses b where b.listing_id = $1 order by b.created_at desc",
      [listingId]
    );
    res.json({ buses: result.rows });
  } catch (err) {
    console.error("List buses error:", err);
    res.status(500).json({ error: "Failed to fetch buses" });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    console.log("[Add bus] listingId:", listingId, "req.params:", req.params);
    console.log("[Add bus] Vendor ID from JWT:", vendorId);

    if (!listingId) {
      console.log("[Add bus] 404 - missing listingId");
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }

    const listingRow = await getTransportListing(listingId, vendorId);
    if (!listingRow) {
      const anyListing = await query<ListingRow>("SELECT id, vendor_id, type FROM listings WHERE id = $1", [listingId]);
      console.log("[Add bus] Listing from DB (by id only):", anyListing.rows[0] ?? "no row");
      console.log("[Add bus] 404: listing missing, wrong vendor, or not transport");
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    console.log("[Add bus] Listing validated:", { id: listingRow.id, vendor_id: listingRow.vendor_id, type: listingRow.type });
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const has_aisle = d.has_aisle ?? true;
    const total_seats = d.rows * (d.left_cols + d.right_cols);
    const ac_type = d.ac_type ?? "non_ac";
    const photoUrl = (d.photo_url && d.photo_url !== "") ? d.photo_url : null;
    const regNum = (d.registration_number && String(d.registration_number).trim() !== "") ? String(d.registration_number).trim() : null;
    if (regNum) {
      const existing = await query<{ id: string }>(
        "select id from buses where listing_id = $1 and lower(trim(registration_number)) = lower($2)",
        [listingId, regNum]
      );
      if (existing.rows.length > 0) {
        res.status(400).json({ error: "A bus with this registration number already exists in this listing. Registration number must be unique per bus." });
        return;
      }
    }
    const result = await query<{ id: string; name: string; total_seats: number; status: string }>(
      `insert into buses (listing_id, name, bus_number, bus_type, ac_type, registration_number, manufacturer, model, has_wifi, has_charging, has_entertainment, has_toilet, photo_url, layout_type, rows, left_cols, right_cols, has_aisle, total_seats, base_price_per_seat_cents, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       returning id, name, total_seats, status`,
      [listingId, d.name, d.bus_number ?? null, d.bus_type, ac_type, regNum, d.manufacturer ?? null, d.model ?? null, d.has_wifi ?? false, d.has_charging ?? false, d.has_entertainment ?? false, d.has_toilet ?? false, photoUrl, d.layout_type, d.rows, d.left_cols, d.right_cols, has_aisle, total_seats, d.base_price_per_seat_cents ?? 0, d.status ?? "active"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create bus error:", err);
    res.status(500).json({ error: "Failed to create bus" });
  }
});

/** Ensure bus exists and belongs to vendor's listing. */
async function ensureBusOwned(busId: string, listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "select b.id from buses b join listings l on l.id = b.listing_id and l.vendor_id = $3 where b.id = $1 and b.listing_id = $2",
    [busId, listingId, vendorId]
  );
  return r.rows.length > 0;
}

router.get("/:busId/drivers", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { busId } = req.params;
    if (!listingId || !busId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureBusOwned(busId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    const result = await query<{
      id: string; listing_id: string; bus_id: string | null; name: string | null; phone: string | null; license_no: string | null; created_at: string;
    }>(
      "select id, listing_id, bus_id, name, phone, license_no, created_at from drivers where listing_id = $1 and bus_id = $2 order by created_at desc",
      [listingId, busId]
    );
    res.json({ drivers: result.rows });
  } catch (err) {
    console.error("List bus drivers error:", err);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

router.get("/:busId/routes", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { busId } = req.params;
    if (!listingId || !busId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureBusOwned(busId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    const result = await query<{
      id: string; from_place: string; to_place: string; distance_km: number | null; duration_minutes: number | null; price_per_seat_cents: number | null; bus_id: string | null; created_at: string;
    }>(
      "select id, from_place, to_place, distance_km, duration_minutes, price_per_seat_cents, bus_id, created_at from routes where listing_id = $1 and bus_id = $2 order by created_at desc",
      [listingId, busId]
    );
    res.json({ routes: result.rows });
  } catch (err) {
    console.error("List bus routes error:", err);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
});

router.get("/:busId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { busId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query<{
      id: string; name: string; bus_number: string | null; bus_type: string; ac_type: string | null;
      registration_number: string | null; manufacturer: string | null; model: string | null;
      has_wifi: boolean; has_charging: boolean; has_entertainment: boolean; has_toilet: boolean; photo_url: string | null;
      layout_type: string; rows: number; left_cols: number; right_cols: number; has_aisle: boolean; total_seats: number;
      base_price_per_seat_cents: number; status: string; created_at: string;
    }>(
      "select b.id, b.name, b.bus_number, b.bus_type, b.ac_type, b.registration_number, b.manufacturer, b.model, b.has_wifi, b.has_charging, b.has_entertainment, b.has_toilet, b.photo_url, b.layout_type, b.rows, b.left_cols, b.right_cols, b.has_aisle, b.total_seats, b.base_price_per_seat_cents, b.status, b.created_at from buses b join listings l on l.id = b.listing_id and l.vendor_id = $3 where b.id = $1 and b.listing_id = $2",
      [busId, listingId, vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get bus error:", err);
    res.status(500).json({ error: "Failed to fetch bus" });
  }
});

router.patch("/:busId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { busId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const ok = await ensureListingOwned(listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const d = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (d.name !== undefined) { updates.push(`name = $${i++}`); values.push(d.name); }
    if (d.bus_number !== undefined) { updates.push(`bus_number = $${i++}`); values.push(d.bus_number); }
    if (d.bus_type !== undefined) { updates.push(`bus_type = $${i++}`); values.push(d.bus_type); }
    if (d.ac_type !== undefined) { updates.push(`ac_type = $${i++}`); values.push(d.ac_type); }
    if (d.registration_number !== undefined) {
      const regNum = (d.registration_number && String(d.registration_number).trim() !== "") ? String(d.registration_number).trim() : null;
      if (regNum) {
        const existing = await query<{ id: string }>(
          "select id from buses where listing_id = $1 and lower(trim(registration_number)) = lower($2) and id != $3",
          [listingId, regNum, busId]
        );
        if (existing.rows.length > 0) {
          res.status(400).json({ error: "A bus with this registration number already exists in this listing. Registration number must be unique per bus." });
          return;
        }
      }
      updates.push(`registration_number = $${i++}`);
      values.push(regNum);
    }
    if (d.manufacturer !== undefined) { updates.push(`manufacturer = $${i++}`); values.push(d.manufacturer); }
    if (d.model !== undefined) { updates.push(`model = $${i++}`); values.push(d.model); }
    if (d.has_wifi !== undefined) { updates.push(`has_wifi = $${i++}`); values.push(d.has_wifi); }
    if (d.has_charging !== undefined) { updates.push(`has_charging = $${i++}`); values.push(d.has_charging); }
    if (d.has_entertainment !== undefined) { updates.push(`has_entertainment = $${i++}`); values.push(d.has_entertainment); }
    if (d.has_toilet !== undefined) { updates.push(`has_toilet = $${i++}`); values.push(d.has_toilet); }
    if (d.photo_url !== undefined) { updates.push(`photo_url = $${i++}`); values.push((d.photo_url && d.photo_url !== "") ? d.photo_url : null); }
    if (d.layout_type !== undefined) { updates.push(`layout_type = $${i++}`); values.push(d.layout_type); }
    if (d.rows !== undefined) { updates.push(`rows = $${i++}`); values.push(d.rows); }
    if (d.left_cols !== undefined) { updates.push(`left_cols = $${i++}`); values.push(d.left_cols); }
    if (d.right_cols !== undefined) { updates.push(`right_cols = $${i++}`); values.push(d.right_cols); }
    if (d.has_aisle !== undefined) { updates.push(`has_aisle = $${i++}`); values.push(d.has_aisle); }
    if (d.base_price_per_seat_cents !== undefined) { updates.push(`base_price_per_seat_cents = $${i++}`); values.push(d.base_price_per_seat_cents); }
    if (d.status !== undefined) { updates.push(`status = $${i++}`); values.push(d.status); }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    if (d.rows !== undefined || d.left_cols !== undefined || d.right_cols !== undefined) {
      const row = await query<{ rows: number; left_cols: number; right_cols: number }>("select rows, left_cols, right_cols from buses where id = $1 and listing_id = $2", [busId, listingId]);
      if (row.rows.length === 0) { res.status(404).json({ error: "Bus not found" }); return; }
      const r = row.rows[0];
      const rows = d.rows ?? r.rows, lc = d.left_cols ?? r.left_cols, rc = d.right_cols ?? r.right_cols;
      updates.push(`total_seats = $${i++}`);
      values.push(rows * (lc + rc));
    }
    updates.push(`updated_at = now()`);
    values.push(busId, listingId);
    const result = await query<{ id: string; name: string; total_seats: number; status: string }>(
      `update buses set ${updates.join(", ")} where id = $${i} and listing_id = $${i + 1} returning id, name, total_seats, status`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update bus error:", err);
    res.status(500).json({ error: "Failed to update bus" });
  }
});

router.delete("/:busId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { busId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const result = await query("delete from buses where id = $1 and listing_id = $2 and listing_id in (select id from listings where vendor_id = $3) returning id", [busId, listingId, vendorId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete bus error:", err);
    res.status(500).json({ error: "Failed to delete bus" });
  }
});

router.use("/:busId/schedules", busSchedulesRoutes);

export default router;

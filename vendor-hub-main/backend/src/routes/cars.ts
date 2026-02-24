import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import carDriversRoutes from "./carDrivers.js";
import carOperatingAreasRoutes from "./carOperatingAreas.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const carCategories = ["local", "intercity"] as const;
const carTypes = ["sedan", "suv", "hatchback", "luxury"] as const;
const acTypes = ["ac", "non_ac"] as const;

const carSchema = z.object({
  name: z.string().min(1),
  registration_number: z.string().optional().nullable(),
  category: z.enum(carCategories),
  car_type: z.enum(carTypes),
  seats: z.number().int().min(1).max(20).optional(),
  ac_type: z.enum(acTypes).optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  photo_url: z.string().url().optional().nullable().or(z.literal("")),
  has_wifi: z.boolean().optional(),
  has_charging: z.boolean().optional(),
  has_child_seat: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const createSchema = carSchema;
const updateSchema = carSchema.partial();

interface ListingRow {
  id: string;
  vendor_id: string;
  type: string;
}

async function getTransportListing(listingId: string, vendorId: string): Promise<ListingRow | null> {
  try {
    const r = await query<ListingRow>(
      "SELECT id, vendor_id, type FROM listings WHERE id = $1 AND vendor_id = $2 AND LOWER(TRIM(type)) = 'transport'",
      [listingId, vendorId]
    );
    if (r.rows.length > 0) return r.rows[0];
  } catch (_) {}
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
  } catch (_) {}
  return null;
}

function ensureListingOwned(listingId: string, vendorId: string): Promise<boolean> {
  return getTransportListing(listingId, vendorId).then((r) => r !== null);
}

async function ensureCarOwned(carId: string, listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "SELECT c.id FROM cars c JOIN listings l ON l.id = c.listing_id AND l.vendor_id = $3 WHERE c.id = $1 AND c.listing_id = $2",
    [carId, listingId, vendorId]
  );
  return r.rows.length > 0;
}

/** GET /api/listings/:listingId/cars */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    const listingRow = await getTransportListing(listingId, vendorId);
    if (!listingRow) {
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    type CarRow = {
      id: string; name: string; registration_number: string | null; category: string; car_type: string; seats: number;
      ac_type: string | null; manufacturer: string | null; model: string | null; photo_url: string | null;
      has_wifi: boolean; has_charging: boolean; has_child_seat: boolean; status: string; created_at: string;
      verification_token: string | null; verification_status: string | null;
    };
    let result: { rows: CarRow[] };
    try {
      result = await query<CarRow>(
        `SELECT id, name, registration_number, category, car_type, seats, ac_type, manufacturer, model, photo_url,
         has_wifi, has_charging, has_child_seat, status, created_at, verification_token, verification_status
         FROM cars WHERE listing_id = $1 ORDER BY created_at DESC`,
        [listingId]
      );
    } catch {
      res.status(503).json({ error: "Cars table not set up. Run migrations 026_cars.sql and related." });
      return;
    }
    res.json({ cars: result.rows });
  } catch (err) {
    console.error("List cars error:", err);
    res.status(500).json({ error: "Failed to fetch cars" });
  }
});

/** POST /api/listings/:listingId/cars */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    if (!listingId) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const listingRow = await getTransportListing(listingId, vendorId);
    if (!listingRow) {
      res.status(404).json({ error: "Listing not found or not a transport listing" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const regNum = (d.registration_number && String(d.registration_number).trim() !== "") ? String(d.registration_number).trim() : null;
    if (regNum) {
      const existing = await query<{ id: string }>(
        "SELECT id FROM cars WHERE listing_id = $1 AND lower(trim(registration_number)) = lower($2)",
        [listingId, regNum]
      );
      if (existing.rows.length > 0) {
        res.status(400).json({ error: "A car with this registration number already exists in this listing." });
        return;
      }
    }
    const photoUrl = (d.photo_url && d.photo_url !== "") ? d.photo_url : null;
    const result = await query<{ id: string; name: string; status: string }>(
      `INSERT INTO cars (listing_id, name, registration_number, category, car_type, seats, ac_type, manufacturer, model, photo_url, has_wifi, has_charging, has_child_seat, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, name, status`,
      [
        listingId, d.name, regNum, d.category, d.car_type, d.seats ?? 4, d.ac_type ?? null,
        d.manufacturer ?? null, d.model ?? null, photoUrl,
        d.has_wifi ?? false, d.has_charging ?? false, d.has_child_seat ?? false,
        "inactive",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create car error:", err);
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "42P01" || (err && typeof err === "object" && "message" in err && String((err as Error).message).includes("cars"))) {
      res.status(503).json({ error: "Cars table not set up. Run migrations 026_cars.sql and related." });
      return;
    }
    res.status(500).json({ error: "Failed to create car" });
  }
});

/** GET /api/listings/:listingId/cars/:carId */
router.get("/:carId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { carId } = req.params;
    if (!listingId || !carId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const result = await query<{
      id: string; name: string; registration_number: string | null; category: string; car_type: string; seats: number;
      ac_type: string | null; manufacturer: string | null; model: string | null; photo_url: string | null;
      has_wifi: boolean; has_charging: boolean; has_child_seat: boolean; status: string; created_at: string;
      verification_status: string | null;
    }>(
      `SELECT id, name, registration_number, category, car_type, seats, ac_type, manufacturer, model, photo_url,
       has_wifi, has_charging, has_child_seat, status, created_at, verification_status
       FROM cars WHERE id = $1 AND listing_id = $2`,
      [carId, listingId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const row = result.rows[0];
    res.json({ ...row, verification_status: row.verification_status ?? "no_request" });
  } catch (err) {
    console.error("Get car error:", err);
    res.status(500).json({ error: "Failed to fetch car" });
  }
});

/** PATCH /api/listings/:listingId/cars/:carId */
router.patch("/:carId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { carId } = req.params;
    if (!listingId || !carId) {
      res.status(404).json({ error: "Not found" });
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
    const onlyStatus = Object.keys(d).length === 1 && d.status !== undefined;
    if (onlyStatus && d.status === "active") {
      const cur = await query<{ verification_status: string | null }>("SELECT verification_status FROM cars WHERE id = $1 AND listing_id = $2", [carId, listingId]);
      if (cur.rows.length === 0) {
        res.status(404).json({ error: "Car not found" });
        return;
      }
      const vStatus = cur.rows[0].verification_status ?? "no_request";
      if (vStatus !== "approved") {
        res.status(400).json({ error: "Car must be verified before it can be set to Active. Complete verification in Verification → Vehicles → Cars." });
        return;
      }
    }
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (d.name !== undefined) { updates.push(`name = $${i++}`); values.push(d.name); }
    if (d.registration_number !== undefined) {
      const regNum = (d.registration_number && String(d.registration_number).trim() !== "") ? String(d.registration_number).trim() : null;
      if (regNum) {
        const existing = await query<{ id: string }>(
          "SELECT id FROM cars WHERE listing_id = $1 AND lower(trim(registration_number)) = lower($2) AND id != $3",
          [listingId, regNum, carId]
        );
        if (existing.rows.length > 0) {
          res.status(400).json({ error: "A car with this registration number already exists in this listing." });
          return;
        }
      }
      updates.push(`registration_number = $${i++}`); values.push(regNum);
    }
    if (d.category !== undefined) { updates.push(`category = $${i++}`); values.push(d.category); }
    if (d.car_type !== undefined) { updates.push(`car_type = $${i++}`); values.push(d.car_type); }
    if (d.seats !== undefined) { updates.push(`seats = $${i++}`); values.push(d.seats); }
    if (d.ac_type !== undefined) { updates.push(`ac_type = $${i++}`); values.push(d.ac_type); }
    if (d.manufacturer !== undefined) { updates.push(`manufacturer = $${i++}`); values.push(d.manufacturer); }
    if (d.model !== undefined) { updates.push(`model = $${i++}`); values.push(d.model); }
    if (d.photo_url !== undefined) { updates.push(`photo_url = $${i++}`); values.push((d.photo_url && d.photo_url !== "") ? d.photo_url : null); }
    if (d.has_wifi !== undefined) { updates.push(`has_wifi = $${i++}`); values.push(d.has_wifi); }
    if (d.has_charging !== undefined) { updates.push(`has_charging = $${i++}`); values.push(d.has_charging); }
    if (d.has_child_seat !== undefined) { updates.push(`has_child_seat = $${i++}`); values.push(d.has_child_seat); }
    if (d.status !== undefined && onlyStatus) { updates.push(`status = $${i++}`); values.push(d.status); }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    if (!onlyStatus) {
      updates.push(`verification_status = $${i++}`);
      values.push("no_request");
      updates.push(`verified_at = $${i++}`);
      values.push(null);
      updates.push(`status = $${i++}`);
      values.push("inactive");
    }
    updates.push(`updated_at = now()`);
    values.push(carId, listingId);
    const result = await query<{ id: string; name: string; status: string; verification_status: string | null }>(
      `UPDATE cars SET ${updates.join(", ")} WHERE id = $${i} AND listing_id = $${i + 1} RETURNING id, name, status, verification_status`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const row = result.rows[0];
    res.json({ id: row.id, name: row.name, status: row.status, verification_status: row.verification_status ?? "no_request" });
  } catch (err) {
    console.error("Update car error:", err);
    res.status(500).json({ error: "Failed to update car" });
  }
});

/** DELETE /api/listings/:listingId/cars/:carId */
router.delete("/:carId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { carId } = req.params;
    if (!listingId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const result = await query(
      "DELETE FROM cars WHERE id = $1 AND listing_id = $2 AND listing_id IN (SELECT id FROM listings WHERE vendor_id = $3) RETURNING id",
      [carId, listingId, vendorId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete car error:", err);
    res.status(500).json({ error: "Failed to delete car" });
  }
});

/** POST /api/listings/:listingId/cars/:carId/generate-verification-token */
router.post("/:carId/generate-verification-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const { carId } = req.params;
    if (!listingId || !carId) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const row = await query<{ verification_token: string | null; verification_status: string | null }>(
      "SELECT verification_token, verification_status FROM cars WHERE id = $1 AND listing_id = $2",
      [carId, listingId]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    let token = row.rows[0].verification_token;
    const currentStatus = row.rows[0].verification_status ?? "no_request";
    if (token) {
      return void res.json({ verification_token: token, verification_status: currentStatus });
    }
    const slug = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    token = `CAR-${slug()}-${slug()}`;
    try {
      await query("UPDATE cars SET verification_token = $1 WHERE id = $2 AND listing_id = $3", [token, carId, listingId]);
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        const retry = await query<{ verification_token: string | null }>("SELECT verification_token FROM cars WHERE id = $1 AND listing_id = $2", [carId, listingId]);
        token = retry.rows[0]?.verification_token ?? token;
      } else throw err;
    }
    res.json({ verification_token: token, verification_status: "no_request" });
  } catch (err) {
    console.error("Car generate verification token error:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

router.use("/:carId/drivers", carDriversRoutes);
router.use("/:carId/operating-areas", carOperatingAreasRoutes);

export default router;

import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  license_number: z.string().min(1, "License number is required"),
});

const updateSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  license_number: z.string().min(1).optional(),
}).partial();

async function ensureCarOwned(carId: string, listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "SELECT c.id FROM cars c JOIN listings l ON l.id = c.listing_id AND l.vendor_id = $3 WHERE c.id = $1 AND c.listing_id = $2",
    [carId, listingId, vendorId]
  );
  return r.rows.length > 0;
}

/** GET /api/listings/:listingId/cars/:carId/drivers */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const carId = req.params.carId;
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
      id: string; car_id: string; name: string | null; phone: string | null; license_number: string; created_at: string;
    }>(
      "SELECT id, car_id, name, phone, license_number, created_at FROM car_drivers WHERE car_id = $1 ORDER BY created_at DESC",
      [carId]
    );
    res.json({ drivers: result.rows });
  } catch (err) {
    console.error("List car drivers error:", err);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

/** POST /api/listings/:listingId/cars/:carId/drivers */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const carId = req.params.carId;
    if (!listingId || !carId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const { name, phone, license_number } = parsed.data;
    const result = await query<{ id: string; name: string | null; phone: string | null; license_number: string }>(
      "INSERT INTO car_drivers (car_id, name, phone, license_number) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, license_number",
      [carId, name ?? null, phone ?? null, license_number]
    );
    await query("UPDATE cars SET verification_status = 'no_request', verified_at = NULL, status = 'inactive' WHERE id = $1", [carId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create car driver error:", err);
    res.status(500).json({ error: "Failed to add driver" });
  }
});

/** PATCH /api/listings/:listingId/cars/:carId/drivers/:driverId */
router.patch("/:driverId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const carId = req.params.carId;
    const { driverId } = req.params;
    if (!listingId || !carId || !driverId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (d.name !== undefined) { updates.push(`name = $${i++}`); values.push(d.name); }
    if (d.phone !== undefined) { updates.push(`phone = $${i++}`); values.push(d.phone); }
    if (d.license_number !== undefined) { updates.push(`license_number = $${i++}`); values.push(d.license_number); }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    updates.push(`updated_at = now()`);
    values.push(driverId, carId);
    const result = await query(
      `UPDATE car_drivers SET ${updates.join(", ")} WHERE id = $${i} AND car_id = $${i + 1} RETURNING id`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    await query("UPDATE cars SET verification_status = 'no_request', verified_at = NULL, status = 'inactive' WHERE id = $1", [carId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Update car driver error:", err);
    res.status(500).json({ error: "Failed to update driver" });
  }
});

/** DELETE /api/listings/:listingId/cars/:carId/drivers/:driverId */
router.delete("/:driverId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.listingId ?? req.params.listingId;
    const carId = req.params.carId;
    const { driverId } = req.params;
    if (!listingId || !carId || !driverId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureCarOwned(carId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const result = await query(
      "DELETE FROM car_drivers WHERE id = $1 AND car_id = $2 RETURNING id",
      [driverId, carId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete car driver error:", err);
    res.status(500).json({ error: "Failed to delete driver" });
  }
});

export default router;

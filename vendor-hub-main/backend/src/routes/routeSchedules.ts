import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const daysSchema = z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).min(1).max(7);

const createSchema = z.object({
  bus_id: z.string().uuid(),
  departure_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  arrival_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  operating_days: daysSchema.optional(),
});

const updateSchema = z.object({
  bus_id: z.string().uuid().optional(),
  departure_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  arrival_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  operating_days: daysSchema.optional(),
});

async function ensureRouteOwnedByVendor(routeId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>("select r.id from routes r join vendor_listings vl on vl.listing_id = r.listing_id where r.id = $1 and vl.vendor_id = $2", [routeId, vendorId]);
  return r.rows.length > 0;
}

async function ensureBusBelongsToListing(busId: string, listingId: string): Promise<boolean> {
  const r = await query<{ id: string }>("select id from buses where id = $1 and listing_id = $2", [busId, listingId]);
  return r.rows.length > 0;
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { routeId } = req.params;
    const ok = await ensureRouteOwnedByVendor(routeId!, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    const result = await query<{
      id: string; route_id: string; bus_id: string; departure_time: string; arrival_time: string; operating_days: string[];
    }>(
      "select s.id, s.route_id, s.bus_id, s.departure_time::text, s.arrival_time::text, s.operating_days from route_schedules s join routes r on r.id = s.route_id join vendor_listings vl on vl.listing_id = r.listing_id where s.route_id = $1 and vl.vendor_id = $2 order by s.departure_time",
      [routeId, vendorId]
    );
    res.json({ schedules: result.rows });
  } catch (err) {
    console.error("List schedules error:", err);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { routeId } = req.params;
    const ok = await ensureRouteOwnedByVendor(routeId!, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    const listingRow = await query<{ listing_id: string }>("select listing_id from routes where id = $1", [routeId]);
    const listingId = listingRow.rows[0]?.listing_id;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    if (listingId && !(await ensureBusBelongsToListing(d.bus_id, listingId))) {
      res.status(400).json({ error: "Bus does not belong to this listing" });
      return;
    }
    const days = d.operating_days ?? ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const result = await query<{ id: string; bus_id: string; departure_time: string; arrival_time: string }>(
      "insert into route_schedules (route_id, bus_id, departure_time, arrival_time, operating_days) values ($1, $2, $3::time, $4::time, $5) returning id, bus_id, departure_time::text, arrival_time::text",
      [routeId, d.bus_id, d.departure_time, d.arrival_time, days]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create schedule error:", err);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

router.delete("/:scheduleId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { routeId, scheduleId } = req.params;
    const ok = await ensureRouteOwnedByVendor(routeId!, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    const result = await query(
      "delete from route_schedules where id = $1 and route_id = $2 and route_id in (select r.id from routes r join vendor_listings vl on vl.listing_id = r.listing_id where vl.vendor_id = $3) returning id",
      [scheduleId, routeId, vendorId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete schedule error:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

export default router;

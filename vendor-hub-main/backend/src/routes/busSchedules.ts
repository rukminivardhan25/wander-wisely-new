import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function ensureBusOwned(busId: string, listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "select b.id from buses b join listings l on l.id = b.listing_id and l.vendor_id = $3 where b.id = $1 and b.listing_id = $2",
    [busId, listingId, vendorId]
  );
  return r.rows.length > 0;
}

/** Normalize to calendar date YYYY-MM-DD so booking filter uses exact dates. */
function toDateOnly(s: string | null | undefined): string | null {
  if (s == null || s.trim() === "") return null;
  const trimmed = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return trimmed;
}

const daySchema = z.object({
  route_id: z.string().uuid(), // required: schedule is for this bus on this route
  start_date: z.string().min(1).optional().nullable(),
  end_date: z.string().min(1).optional().nullable(),
  departure_time: z.string().min(1),
  arrival_time: z.string().min(1),
  mon: z.boolean().optional(),
  tue: z.boolean().optional(),
  wed: z.boolean().optional(),
  thu: z.boolean().optional(),
  fri: z.boolean().optional(),
  sat: z.boolean().optional(),
  sun: z.boolean().optional(),
  price_override_cents: z.number().int().min(0).nullable().optional(),
  seat_availability: z.number().int().min(0).nullable().optional(),
  status: z.enum(["active", "draft", "cancelled", "inactive"]).optional(),
});

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId;
    const busId = req.params.busId;
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
      id: string; route_id: string | null; start_date: string | null; end_date: string | null; departure_time: string; arrival_time: string;
      mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean;
      price_override_cents: number | null; seat_availability: number | null; status: string;
      route_from_place: string | null; route_to_place: string | null;
    }>(
      `select s.id, s.route_id, s.start_date::text as start_date, s.end_date::text as end_date, s.departure_time, s.arrival_time, s.mon, s.tue, s.wed, s.thu, s.fri, s.sat, s.sun, s.price_override_cents, s.seat_availability, s.status,
              r.from_place as route_from_place, r.to_place as route_to_place
       from bus_schedules s left join routes r on r.id = s.route_id where s.bus_id = $1 order by s.departure_time, s.id`,
      [busId]
    );
    res.json({ schedules: result.rows });
  } catch (err) {
    console.error("List bus schedules error:", err);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId;
    const busId = req.params.busId;
    if (!listingId || !busId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureBusOwned(busId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    const parsed = daySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const result = await query<{ id: string }>(
      `insert into bus_schedules (bus_id, route_id, start_date, end_date, departure_time, arrival_time, mon, tue, wed, thu, fri, sat, sun, price_override_cents, seat_availability, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) returning id`,
      [
        busId, d.route_id, toDateOnly(d.start_date), toDateOnly(d.end_date), d.departure_time, d.arrival_time,
        d.mon ?? false, d.tue ?? false, d.wed ?? false, d.thu ?? false, d.fri ?? false, d.sat ?? false, d.sun ?? false,
        d.price_override_cents ?? null, d.seat_availability ?? null, d.status ?? "active",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create bus schedule error:", err);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

router.patch("/:scheduleId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId;
    const busId = req.params.busId;
    const { scheduleId } = req.params;
    if (!listingId || !busId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureBusOwned(busId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    const parsed = daySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (d.start_date !== undefined) { updates.push(`start_date = $${i++}`); values.push(toDateOnly(d.start_date)); }
    if (d.end_date !== undefined) { updates.push(`end_date = $${i++}`); values.push(toDateOnly(d.end_date)); }
    if (d.departure_time !== undefined) { updates.push(`departure_time = $${i++}`); values.push(d.departure_time); }
    if (d.arrival_time !== undefined) { updates.push(`arrival_time = $${i++}`); values.push(d.arrival_time); }
    if (d.mon !== undefined) { updates.push(`mon = $${i++}`); values.push(d.mon); }
    if (d.tue !== undefined) { updates.push(`tue = $${i++}`); values.push(d.tue); }
    if (d.wed !== undefined) { updates.push(`wed = $${i++}`); values.push(d.wed); }
    if (d.thu !== undefined) { updates.push(`thu = $${i++}`); values.push(d.thu); }
    if (d.fri !== undefined) { updates.push(`fri = $${i++}`); values.push(d.fri); }
    if (d.sat !== undefined) { updates.push(`sat = $${i++}`); values.push(d.sat); }
    if (d.sun !== undefined) { updates.push(`sun = $${i++}`); values.push(d.sun); }
    if (d.price_override_cents !== undefined) { updates.push(`price_override_cents = $${i++}`); values.push(d.price_override_cents); }
    if (d.seat_availability !== undefined) { updates.push(`seat_availability = $${i++}`); values.push(d.seat_availability); }
    if (d.status !== undefined) { updates.push(`status = $${i++}`); values.push(d.status); }
    if (d.route_id !== undefined) { updates.push(`route_id = $${i++}`); values.push(d.route_id); }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    updates.push("updated_at = now()");
    values.push(scheduleId, busId);
    const result = await query<{ id: string }>(
      `update bus_schedules set ${updates.join(", ")} where id = $${i} and bus_id = $${i + 1} returning id`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update bus schedule error:", err);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

router.delete("/:scheduleId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId;
    const busId = req.params.busId;
    const { scheduleId } = req.params;
    if (!listingId || !busId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const ok = await ensureBusOwned(busId, listingId, vendorId);
    if (!ok) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    const result = await query("delete from bus_schedules where id = $1 and bus_id = $2 returning id", [scheduleId, busId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete bus schedule error:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

export default router;

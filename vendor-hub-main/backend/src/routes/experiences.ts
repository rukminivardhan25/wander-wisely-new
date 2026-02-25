import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
router.use(authMiddleware);

async function vendorOwnsListing(listingId: string, vendorId: string): Promise<boolean> {
  try {
    const r = await query<{ id: string }>("SELECT id FROM listings WHERE id = $1 AND vendor_id = $2", [listingId, vendorId]);
    if (r.rows.length > 0) return true;
  } catch {
    //
  }
  try {
    const vl = await query<{ listing_id: string }>("SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2", [listingId, vendorId]);
    return vl.rows.length > 0;
  } catch {
    return false;
  }
}

/** GET /api/listings/:listingId/experience/bookings?date=YYYY-MM-DD — Bookings for this experience (vendor). Optional date filters by slot_date. */
router.get("/bookings", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId as string;
    const dateParam = typeof req.query.date === "string" ? req.query.date.trim() : null;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const expRow = await query<{ id: string }>("SELECT id FROM experiences WHERE listing_id = $1 LIMIT 1", [listingId]);
    if (expRow.rows.length === 0) {
      res.json({ bookings: [] });
      return;
    }
    const experienceId = expRow.rows[0].id;
    const dateFilter = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;
    const rows = await query<{
      id: string;
      booking_ref: string;
      user_id: string;
      participants_count: number;
      total_cents: number;
      status: string;
      paid_at: string | null;
      created_at: string;
      slot_date: string;
      slot_time: string;
    }>(
      dateFilter
        ? `SELECT b.id, b.booking_ref, b.user_id, b.participants_count, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
            s.slot_date::text AS slot_date, s.slot_time::text AS slot_time
          FROM experience_bookings b
          JOIN experience_slots s ON s.id = b.experience_slot_id
          WHERE b.experience_id = $1 AND s.slot_date = $2::date AND b.status != 'cancelled'
          ORDER BY s.slot_time, b.created_at`
        : `SELECT b.id, b.booking_ref, b.user_id, b.participants_count, b.total_cents, b.status, b.paid_at::text, b.created_at::text,
            s.slot_date::text AS slot_date, s.slot_time::text AS slot_time
          FROM experience_bookings b
          JOIN experience_slots s ON s.id = b.experience_slot_id
          WHERE b.experience_id = $1 AND b.status != 'cancelled'
          ORDER BY s.slot_date, s.slot_time, b.created_at`,
      dateFilter ? [experienceId, dateFilter] : [experienceId]
    );
    res.json({
      bookings: rows.rows.map((r) => ({
        id: r.id,
        bookingRef: r.booking_ref,
        userId: r.user_id,
        participantsCount: r.participants_count,
        totalCents: r.total_cents,
        status: r.status,
        paidAt: r.paid_at ?? undefined,
        createdAt: r.created_at,
        slotDate: r.slot_date,
        slotTime: r.slot_time.slice(0, 5),
      })),
    });
  } catch (err) {
    console.error("Experience bookings error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("experience_bookings") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Experience bookings table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to load experience bookings" });
  }
});

/** GET experience for this listing. One experience per listing; creates a default row if missing. */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const listingRow = await query<{ name: string; type: string }>("SELECT name, type FROM listings WHERE id = $1", [listingId]);
    if (listingRow.rows.length === 0) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (listingRow.rows[0].type?.toLowerCase() !== "experience") {
      res.status(400).json({ error: "Listing is not an experience" });
      return;
    }

    type ExpRow = {
      id: string;
      listing_id: string;
      name: string;
      category: string;
      city: string;
      location_address: string | null;
      duration_text: string;
      short_description: string | null;
      long_description: string | null;
      age_restriction: string | null;
      max_participants_per_slot: number;
      price_per_person_cents: number;
      tax_included: boolean;
      cancellation_policy: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    };

    let exp = await query<ExpRow>(
      "SELECT id, listing_id, name, category, city, location_address, duration_text, short_description, long_description, age_restriction, max_participants_per_slot, price_per_person_cents, tax_included, cancellation_policy, status, created_at, updated_at FROM experiences WHERE listing_id = $1 LIMIT 1",
      [listingId]
    );

    if (exp.rows.length === 0) {
      await query(
        `INSERT INTO experiences (listing_id, name, category, city, duration_text, max_participants_per_slot, price_per_person_cents, status)
         VALUES ($1, $2, 'activity', 'Not set', 'Not set', 10, 0, 'draft')`,
        [listingId, listingRow.rows[0].name]
      );
      exp = await query<ExpRow>(
        "SELECT id, listing_id, name, category, city, location_address, duration_text, short_description, long_description, age_restriction, max_participants_per_slot, price_per_person_cents, tax_included, cancellation_policy, status, created_at, updated_at FROM experiences WHERE listing_id = $1 LIMIT 1",
        [listingId]
      );
    }

    const row = exp.rows[0];
    const slots = await query<{ id: string; slot_date: string; slot_time: string; capacity: number }>(
      "SELECT id, slot_date::text, slot_time::text, capacity FROM experience_slots WHERE experience_id = $1 ORDER BY slot_date, slot_time",
      [row.id]
    ).catch(() => ({ rows: [] }));
    const media = await query<{ id: string; file_url: string; is_cover: boolean; sort_order: number }>(
      "SELECT id, file_url, is_cover, sort_order FROM experience_media WHERE experience_id = $1 ORDER BY sort_order, created_at",
      [row.id]
    ).catch(() => ({ rows: [] }));

    const DOW_TO_DAY: Record<number, string> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };
    const recurringSet = new Set<string>();
    for (const s of slots.rows) {
      const d = new Date(s.slot_date + "T12:00:00Z");
      const dow = d.getUTCDay();
      const day = DOW_TO_DAY[dow] ?? "mon";
      const time = s.slot_time.slice(0, 5);
      recurringSet.add(`${day}:${time}`);
    }
    const recurring_slots = Array.from(recurringSet).sort().map((key) => {
      const [day, time] = key.split(":");
      return { day, time: time || "09:00" };
    });

    res.json({
      id: row.id,
      listing_id: row.listing_id,
      name: row.name,
      category: row.category,
      city: row.city,
      location_address: row.location_address,
      duration_text: row.duration_text,
      short_description: row.short_description,
      long_description: row.long_description,
      age_restriction: row.age_restriction,
      max_participants_per_slot: row.max_participants_per_slot,
      price_per_person_cents: row.price_per_person_cents,
      tax_included: row.tax_included,
      cancellation_policy: row.cancellation_policy,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      slots: slots.rows,
      recurring_slots,
      media: media.rows,
    });
  } catch (err) {
    console.error("Get experience error:", err);
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "42P01") {
      res.status(503).json({ error: "Experiences table not set up. Run db:experience-event schema." });
      return;
    }
    res.status(500).json({ error: "Failed to load experience" });
  }
});

const DAY_TO_DOW: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** Generate dates for next 12 weeks for a given day-of-week (0=Sun, 1=Mon, ...). */
function datesForDayOfWeek(dayOfWeek: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 84; i++) {
    if (d.getDay() === dayOfWeek) out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** POST: create or replace full experience (basic + recurring_slots + media). Used after creating listing from AddExperience. */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const listingRow = await query<{ name: string; type: string }>("SELECT name, type FROM listings WHERE id = $1", [listingId]);
    if (listingRow.rows.length === 0 || listingRow.rows[0].type?.toLowerCase() !== "experience") {
      res.status(400).json({ error: "Listing is not an experience" });
      return;
    }

    const body = req.body as {
      name?: string; category?: string; city?: string; location_address?: string | null;
      duration_text?: string; short_description?: string | null; long_description?: string | null; age_restriction?: string | null;
      max_participants_per_slot?: number; price_per_person_cents?: number; tax_included?: boolean; cancellation_policy?: string | null;
      recurring_slots?: { day: string; time: string }[];
      media?: { file_url: string; is_cover: boolean; sort_order: number }[];
    };

    const name = (body.name ?? listingRow.rows[0].name).trim() || listingRow.rows[0].name;
    const category = (body.category ?? "activity").trim() || "activity";
    const city = (body.city ?? "").trim() || "Not set";
    const duration_text = (body.duration_text ?? "Not set").trim() || "Not set";
    const max_participants = Math.min(200, Math.max(1, Number(body.max_participants_per_slot) || 10));
    const price_cents = Math.max(0, Math.floor(Number(body.price_per_person_cents) ?? 0));

    let exp = await query<{ id: string }>("SELECT id FROM experiences WHERE listing_id = $1 LIMIT 1", [listingId]);
    if (exp.rows.length === 0) {
      await query(
        `INSERT INTO experiences (listing_id, name, category, city, location_address, duration_text, short_description, long_description, age_restriction, max_participants_per_slot, price_per_person_cents, tax_included, cancellation_policy, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')`,
        [
          listingId, name, category, city,
          body.location_address ?? null,
          duration_text,
          body.short_description ?? null,
          body.long_description ?? null,
          body.age_restriction ?? null,
          max_participants, price_cents,
          body.tax_included !== false,
          body.cancellation_policy ?? null,
        ]
      );
      exp = await query<{ id: string }>("SELECT id FROM experiences WHERE listing_id = $1 LIMIT 1", [listingId]);
    } else {
      await query(
        `UPDATE experiences SET name = $1, category = $2, city = $3, location_address = $4, duration_text = $5, short_description = $6, long_description = $7, age_restriction = $8, max_participants_per_slot = $9, price_per_person_cents = $10, tax_included = $11, cancellation_policy = $12, updated_at = now() WHERE id = $13`,
        [
          name, category, city, body.location_address ?? null, duration_text,
          body.short_description ?? null, body.long_description ?? null, body.age_restriction ?? null,
          max_participants, price_cents, body.tax_included !== false, body.cancellation_policy ?? null,
          exp.rows[0].id,
        ]
      );
    }
    const experienceId = exp.rows[0].id;

    if (Array.isArray(body.recurring_slots) && body.recurring_slots.length > 0) {
      await query("DELETE FROM experience_slots WHERE experience_id = $1", [experienceId]);
      const slotInserts: { date: string; time: string; capacity: number }[] = [];
      for (const s of body.recurring_slots) {
        const day = String(s.day).toLowerCase().slice(0, 3);
        const dow = DAY_TO_DOW[day];
        if (dow === undefined) continue;
        const time = String(s.time || "09:00").slice(0, 5);
        const dates = datesForDayOfWeek(dow);
        for (const date of dates) {
          slotInserts.push({ date, time, capacity: max_participants });
        }
      }
      for (const { date, time, capacity } of slotInserts) {
        await query(
          "INSERT INTO experience_slots (experience_id, slot_date, slot_time, capacity) VALUES ($1, $2::date, $3::time, $4) ON CONFLICT (experience_id, slot_date, slot_time) DO NOTHING",
          [experienceId, date, time, capacity]
        );
      }
    }

    if (Array.isArray(body.media) && body.media.length > 0) {
      await query("DELETE FROM experience_media WHERE experience_id = $1", [experienceId]);
      for (let i = 0; i < body.media.length; i++) {
        const m = body.media[i];
        await query(
          "INSERT INTO experience_media (experience_id, file_url, is_cover, sort_order) VALUES ($1, $2, $3, $4)",
          [experienceId, m.file_url || "", !!m.is_cover, m.sort_order ?? i]
        );
      }
    }

    const updated = await query<{ status: string; updated_at: string }>("SELECT status, updated_at::text FROM experiences WHERE id = $1", [experienceId]);
    res.status(201).json({ id: experienceId, status: updated.rows[0].status, updated_at: updated.rows[0].updated_at });
  } catch (err) {
    console.error("POST experience error:", err);
    res.status(500).json({ error: "Failed to save experience" });
  }
});

/** PATCH experience: status only (active/inactive) or full update. Full update sets listing verification_status to pending. */
router.patch("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const listingId = req.params.listingId as string;
    if (!listingId) {
      res.status(400).json({ error: "Missing listingId" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const statusOnly = body.status !== undefined && Object.keys(body).length === 1;

    const exp = await query<{ id: string }>("SELECT id FROM experiences WHERE listing_id = $1 LIMIT 1", [listingId]);
    if (exp.rows.length === 0) {
      res.status(404).json({ error: "Experience not found. Open Manage first to create it." });
      return;
    }
    const experienceId = exp.rows[0].id;

    if (statusOnly && typeof body.status === "string") {
      const s = body.status.toLowerCase();
      if (s !== "live" && s !== "suspended" && s !== "draft") {
        res.status(400).json({ error: "status must be live, suspended, or draft" });
        return;
      }
      await query("UPDATE experiences SET status = $1, updated_at = now() WHERE id = $2", [s, experienceId]);
      const updated = await query<{ status: string; updated_at: string }>("SELECT status, updated_at::text FROM experiences WHERE id = $1", [experienceId]);
      res.json({ status: updated.rows[0].status, updated_at: updated.rows[0].updated_at });
      return;
    }

    const allowed = [
      "name", "category", "city", "location_address", "duration_text", "short_description", "long_description",
      "age_restriction", "max_participants_per_slot", "price_per_person_cents", "tax_included", "cancellation_policy", "status",
    ];
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === "max_participants_per_slot" || key === "price_per_person_cents") {
        updates.push(`${key} = $${i++}`);
        values.push(Number(body[key]));
      } else if (key === "tax_included") {
        updates.push(`${key} = $${i++}`);
        values.push(!!body[key]);
      } else {
        updates.push(`${key} = $${i++}`);
        values.push(body[key] === null ? null : String(body[key]));
      }
    }
    if (updates.length > 0) {
      updates.push("updated_at = now()");
      values.push(experienceId);
      await query(`UPDATE experiences SET ${updates.join(", ")} WHERE id = $${i}`, values);
      await query("UPDATE listings SET verification_status = 'pending', updated_at = now() WHERE id = $1", [listingId]);
    }

    const expRow = await query<{ max_participants_per_slot: number }>("SELECT max_participants_per_slot FROM experiences WHERE id = $1", [experienceId]);
    const maxPart = expRow.rows[0]?.max_participants_per_slot ?? 10;

    if (Array.isArray(body.recurring_slots) && body.recurring_slots.length > 0) {
      await query("DELETE FROM experience_slots WHERE experience_id = $1", [experienceId]);
      for (const s of body.recurring_slots as { day: string; time: string }[]) {
        const day = String(s.day).toLowerCase().slice(0, 3);
        const dow = DAY_TO_DOW[day];
        if (dow === undefined) continue;
        const time = String(s.time || "09:00").slice(0, 5);
        const dates = datesForDayOfWeek(dow);
        for (const date of dates) {
          await query(
            "INSERT INTO experience_slots (experience_id, slot_date, slot_time, capacity) VALUES ($1, $2::date, $3::time, $4) ON CONFLICT (experience_id, slot_date, slot_time) DO NOTHING",
            [experienceId, date, time, maxPart]
          );
        }
      }
      await query("UPDATE listings SET verification_status = 'pending', updated_at = now() WHERE id = $1", [listingId]);
    }

    if (Array.isArray(body.media)) {
      await query("DELETE FROM experience_media WHERE experience_id = $1", [experienceId]);
      for (let i = 0; i < body.media.length; i++) {
        const m = body.media[i] as { file_url: string; is_cover?: boolean; sort_order?: number };
        await query(
          "INSERT INTO experience_media (experience_id, file_url, is_cover, sort_order) VALUES ($1, $2, $3, $4)",
          [experienceId, m.file_url || "", !!m.is_cover, m.sort_order ?? i]
        );
      }
      await query("UPDATE listings SET verification_status = 'pending', updated_at = now() WHERE id = $1", [listingId]);
    }

    const updated = await query<{ status: string; updated_at: string }>("SELECT status, updated_at::text FROM experiences WHERE id = $1", [experienceId]);
    res.json({ status: updated.rows[0].status, updated_at: updated.rows[0].updated_at, verification_required: true });
  } catch (err) {
    console.error("Patch experience error:", err);
    res.status(500).json({ error: "Failed to update experience" });
  }
});

export default router;

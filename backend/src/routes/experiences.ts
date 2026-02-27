import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { getReviewSummaries } from "../services/bookingReviewSummary.js";

const router = Router();

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function formatTime(t: string): string {
  const [h, m] = String(t).slice(0, 5).split(":").map(Number);
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

/**
 * GET /api/experiences/cities
 * Returns distinct cities that have at least one live experience (for filter dropdown).
 * Includes "Not set" when there are live experiences with no city or default "Not set".
 */
router.get("/cities", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{ city: string }>(
      `SELECT DISTINCT COALESCE(NULLIF(trim(city), ''), 'Not set') AS city
       FROM experiences WHERE status = 'live'
       ORDER BY 1`,
      []
    );
    res.json({ cities: result.rows.map((r) => r.city).filter(Boolean) });
  } catch (err) {
    console.error("Experiences cities error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("experiences") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Experiences table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

/**
 * GET /api/experiences?city=...
 * List live experiences in the given city. Each item includes availability summary: days and time range.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const cityParam = typeof req.query.city === "string" ? req.query.city.trim() : null;
    if (!cityParam) {
      res.status(400).json({ error: "Query param 'city' is required" });
      return;
    }

    const isNotSet = cityParam.toLowerCase() === "not set";
    const expRows = await query<{
      id: string;
      listing_id: string;
      name: string;
      category: string;
      city: string;
      duration_text: string;
      price_per_person_cents: number;
      max_participants_per_slot: number;
      short_description: string | null;
    }>(
      isNotSet
        ? `SELECT id, listing_id, name, category, 'Not set' AS city, duration_text, price_per_person_cents, max_participants_per_slot, short_description
           FROM experiences
           WHERE status = 'live' AND (city IS NULL OR trim(city) = '' OR lower(trim(city)) = 'not set')
           ORDER BY name`
        : `SELECT id, listing_id, name, category, city, duration_text, price_per_person_cents, max_participants_per_slot, short_description
           FROM experiences
           WHERE status = 'live' AND lower(trim(COALESCE(city, ''))) = lower(trim($1))
           ORDER BY name`,
      isNotSet ? [] : [cityParam]
    );

    if (expRows.rows.length === 0) {
      res.json({ experiences: [] });
      return;
    }

    const ids = expRows.rows.map((r) => r.id);
    const slots = await query<{ experience_id: string; slot_date: string; slot_time: string }>(
      `SELECT experience_id, slot_date::text AS slot_date, slot_time::text AS slot_time
       FROM experience_slots
       WHERE experience_id = ANY($1::uuid[])
       ORDER BY experience_id, slot_date, slot_time`,
      [ids]
    );

    const coverRows = await query<{ experience_id: string; file_url: string }>(
      `SELECT experience_id, file_url FROM experience_media WHERE experience_id = ANY($1::uuid[]) AND is_cover = true`,
      [ids]
    );
    const coverByExp = new Map(coverRows.rows.map((r) => [r.experience_id, r.file_url]));

    const dowSetByExp = new Map<string, Set<number>>();
    const timeMinByExp = new Map<string, string>();
    const timeMaxByExp = new Map<string, string>();
    for (const s of slots.rows) {
      const d = new Date(s.slot_date + "T12:00:00Z");
      const dow = d.getUTCDay();
      if (!dowSetByExp.has(s.experience_id)) {
        dowSetByExp.set(s.experience_id, new Set());
        timeMinByExp.set(s.experience_id, s.slot_time.slice(0, 5));
        timeMaxByExp.set(s.experience_id, s.slot_time.slice(0, 5));
      }
      dowSetByExp.get(s.experience_id)!.add(dow);
      const t = s.slot_time.slice(0, 5);
      if (t < timeMinByExp.get(s.experience_id)!) timeMinByExp.set(s.experience_id, t);
      if (t > timeMaxByExp.get(s.experience_id)!) timeMaxByExp.set(s.experience_id, t);
    }

    const listingIds = [...new Set(expRows.rows.map((e) => e.listing_id))];
    const reviewMap = await getReviewSummaries(listingIds.map((id) => ({ listingId: id })));
    const experiences = expRows.rows.map((e) => {
      const days = dowSetByExp.get(e.id);
      const dayNames = days ? Array.from(days).sort().map((d) => DAY_NAMES[d]).join(", ") : "";
      const tMin = timeMinByExp.get(e.id);
      const tMax = timeMaxByExp.get(e.id);
      const timeRange = tMin && tMax ? (tMin === tMax ? formatTime(tMin) : `${formatTime(tMin)} – ${formatTime(tMax)}`) : "";
      const companyReview = reviewMap.get(`${e.listing_id}||`) ?? null;
      return {
        id: e.id,
        listingId: e.listing_id,
        name: e.name,
        category: e.category,
        city: e.city,
        durationText: e.duration_text,
        pricePerPersonCents: e.price_per_person_cents,
        maxParticipantsPerSlot: e.max_participants_per_slot,
        shortDescription: e.short_description ?? undefined,
        coverUrl: coverByExp.get(e.id) ?? undefined,
        availableDays: dayNames,
        timeRange,
        ...(companyReview && { companyReview }),
      };
    });

    res.json({ experiences });
  } catch (err) {
    console.error("List experiences error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("experiences") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Experiences table not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to list experiences" });
  }
});

/**
 * GET /api/experiences/:id
 * Single experience detail for booking page (only live).
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const exp = await query<{
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
    }>(
      `SELECT id, listing_id, name, category, city, location_address, duration_text, short_description, long_description, age_restriction, max_participants_per_slot, price_per_person_cents, tax_included, cancellation_policy
       FROM experiences WHERE id = $1 AND status = 'live'`,
      [id]
    );
    if (exp.rows.length === 0) {
      res.status(404).json({ error: "Experience not found" });
      return;
    }
    const row = exp.rows[0];
    const media = await query<{ file_url: string; is_cover: boolean; sort_order: number }>(
      `SELECT file_url, is_cover, sort_order FROM experience_media WHERE experience_id = $1 ORDER BY sort_order, created_at`,
      [id]
    );
    const slotRows = await query<{ slot_date: string; slot_time: string }>(
      `SELECT slot_date::text AS slot_date, slot_time::text AS slot_time
       FROM experience_slots WHERE experience_id = $1
       ORDER BY slot_date, slot_time LIMIT 2000`,
      [id]
    );
    const byDateDow = new Map<string, { min: string; max: string; count: number }>();
    for (const s of slotRows.rows) {
      const d = new Date(s.slot_date + "T12:00:00Z");
      const dow = d.getUTCDay();
      const key = `${dow}:${s.slot_date}`;
      const t = s.slot_time.slice(0, 5);
      if (!byDateDow.has(key)) byDateDow.set(key, { min: t, max: t, count: 0 });
      const info = byDateDow.get(key)!;
      info.count += 1;
      if (t < info.min) info.min = t;
      if (t > info.max) info.max = t;
    }
    const byDow: Record<number, { min: string; max: string; slotsPerDay: number }> = {};
    byDateDow.forEach((info, key) => {
      const dow = parseInt(key.split(":")[0], 10);
      if (!byDow[dow]) byDow[dow] = { min: info.min, max: info.max, slotsPerDay: info.count };
      else {
        if (info.min < byDow[dow].min) byDow[dow].min = info.min;
        if (info.max > byDow[dow].max) byDow[dow].max = info.max;
        if (info.count > byDow[dow].slotsPerDay) byDow[dow].slotsPerDay = info.count;
      }
    });
    const scheduleByDay: Record<string, { startTime: string; endTime: string; numberOfSlots: number }> = {};
    const availableDayNames: string[] = [];
    for (let i = 0; i < 7; i++) {
      const info = byDow[i];
      if (info) {
        const dayKey = DAY_KEYS[i];
        scheduleByDay[dayKey] = { startTime: info.min, endTime: info.max, numberOfSlots: info.slotsPerDay };
        availableDayNames.push(DAY_NAMES[i]);
      }
    }
    res.json({
      id: row.id,
      listingId: row.listing_id,
      name: row.name,
      category: row.category,
      city: row.city,
      locationAddress: row.location_address ?? undefined,
      durationText: row.duration_text,
      shortDescription: row.short_description ?? undefined,
      longDescription: row.long_description ?? undefined,
      ageRestriction: row.age_restriction ?? undefined,
      maxParticipantsPerSlot: row.max_participants_per_slot,
      pricePerPersonCents: row.price_per_person_cents,
      taxIncluded: row.tax_included,
      cancellationPolicy: row.cancellation_policy ?? undefined,
      media: media.rows,
      availableDays: availableDayNames.join(", "),
      scheduleByDay: Object.keys(scheduleByDay).length > 0 ? scheduleByDay : undefined,
    });
  } catch (err) {
    console.error("Get experience error:", err);
    res.status(500).json({ error: "Failed to load experience" });
  }
});

/**
 * GET /api/experiences/:id/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Available slots for the experience in the date range. Includes capacity and booked count.
 */
router.get("/:id/slots", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const fromParam = typeof req.query.from === "string" ? req.query.from.trim() : null;
    const toParam = typeof req.query.to === "string" ? req.query.to.trim() : null;
    if (!fromParam || !/^\d{4}-\d{2}-\d{2}$/.test(fromParam) || !toParam || !/^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
      res.status(400).json({ error: "Query params 'from' and 'to' (YYYY-MM-DD) are required" });
      return;
    }

    const exp = await query<{ id: string }>("SELECT id FROM experiences WHERE id = $1 AND status = 'live'", [id]);
    if (exp.rows.length === 0) {
      res.status(404).json({ error: "Experience not found" });
      return;
    }

    const slots = await query<{
      id: string;
      slot_date: string;
      slot_time: string;
      capacity: number;
      booked: string;
    }>(
      `SELECT s.id, s.slot_date::text AS slot_date, s.slot_time::text AS slot_time, s.capacity,
       COALESCE((SELECT sum(b.participants_count)::text FROM experience_bookings b WHERE b.experience_slot_id = s.id AND b.status != 'cancelled'), '0') AS booked
       FROM experience_slots s
       WHERE s.experience_id = $1 AND s.slot_date >= $2::date AND s.slot_date <= $3::date
       ORDER BY s.slot_date, s.slot_time`,
      [id, fromParam, toParam]
    );

    const list = slots.rows.map((r) => {
      const booked = parseInt(r.booked, 10) || 0;
      const available = Math.max(0, r.capacity - booked);
      return {
        id: r.id,
        slotDate: r.slot_date,
        slotTime: r.slot_time.slice(0, 5),
        capacity: r.capacity,
        booked,
        available,
      };
    });

    res.json({ slots: list });
  } catch (err) {
    console.error("Get experience slots error:", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
    if (msg.includes("experience_slots") && msg.includes("does not exist")) {
      res.status(503).json({ error: "Experience slots not set up." });
      return;
    }
    res.status(500).json({ error: "Failed to load slots" });
  }
});

export default router;

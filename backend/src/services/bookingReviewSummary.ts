import { pool } from "../config/db.js";

export type ReviewSummary = { avgRating: number; reviewCount: number };

function keyFor(listingId: string, scopeType?: string | null, scopeId?: string | null): string {
  return `${listingId}|${scopeType ?? ""}|${scopeId ?? ""}`;
}

/**
 * Fetch review summaries for all (listing_id, scope_entity_type, scope_entity_id) that exist
 * for the given listing IDs. Returns a Map with key "listingId|scopeType|scopeId".
 */
export async function getReviewSummaries(
  items: { listingId: string; scopeEntityType?: string | null; scopeEntityId?: string | null }[]
): Promise<Map<string, ReviewSummary>> {
  const map = new Map<string, ReviewSummary>();
  if (items.length === 0) return map;
  const listingIds = [...new Set(items.map((i) => i.listingId))];

  try {
    const result = await pool.query<{
      listing_id: string;
      scope_entity_type: string | null;
      scope_entity_id: string | null;
      avg_rating: string;
      review_count: string;
    }>(
      `SELECT listing_id::text, scope_entity_type, scope_entity_id::text,
              ROUND(AVG(rating)::numeric, 1)::float AS avg_rating,
              COUNT(*)::int AS review_count
       FROM booking_reviews
       WHERE listing_id = ANY($1::uuid[])
       GROUP BY listing_id, scope_entity_type, scope_entity_id`,
      [listingIds]
    );

    for (const r of result.rows) {
      const k = keyFor(r.listing_id, r.scope_entity_type, r.scope_entity_id);
      map.set(k, {
        avgRating: parseFloat(r.avg_rating) || 0,
        reviewCount: parseInt(r.review_count, 10) || 0,
      });
    }
  } catch (err) {
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
    if (code === "42P01") return map; // table does not exist
    throw err;
  }
  return map;
}

/** Get company-only summary for one listing. */
export async function getCompanyReviewSummary(listingId: string): Promise<ReviewSummary | null> {
  const m = await getReviewSummaries([{ listingId, scopeEntityType: null, scopeEntityId: null }]);
  return m.get(`${listingId}||`) ?? null;
}

/** Get company + fleet summaries for a list of items (e.g. buses with listingId + busId). */
export async function attachReviewSummaries<T extends { listingId: string }>(
  rows: T[],
  options: {
    scopeType: "bus" | "car" | "hotel_branch" | null;
    scopeIdKey?: keyof T; // e.g. 'busId' for bus, 'carId' for car, 'id' for hotel branch
  }
): Promise<(T & { companyReview?: ReviewSummary; fleetReview?: ReviewSummary })[]> {
  if (rows.length === 0) return [];
  const items: { listingId: string; scopeEntityType: string | null; scopeEntityId: string | null }[] = [];
  for (const r of rows) {
    items.push({ listingId: r.listingId, scopeEntityType: null, scopeEntityId: null });
    if (options.scopeType && options.scopeIdKey) {
      const scopeId = r[options.scopeIdKey];
      if (scopeId && typeof scopeId === "string")
        items.push({ listingId: r.listingId, scopeEntityType: options.scopeType, scopeEntityId: scopeId });
    }
  }
  const map = await getReviewSummaries(items);
  return rows.map((r) => {
    const company = map.get(keyFor(r.listingId, null, null)) ?? null;
    let fleet: ReviewSummary | null = null;
    if (options.scopeType && options.scopeIdKey) {
      const sid = r[options.scopeIdKey];
      if (sid && typeof sid === "string") fleet = map.get(keyFor(r.listingId, options.scopeType, sid)) ?? null;
    }
    return {
      ...r,
      ...(company && { companyReview: company }),
      ...(fleet && { fleetReview: fleet }),
    };
  });
}
import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

const DOCUMENT_TYPES = ["business_license", "owner_id", "tax_document", "health_safety"] as const;
const EXPERIENCE_DOCUMENT_TYPES = ["government_id", "business_activity_proof", "location_authorization", "digital_declaration"] as const;
const EVENT_DOCUMENT_TYPES = [
  "government_permission_noc",
  "business_registration_certificate",
  "venue_authorization_proof",
  "insurance_liability",
  "event_permit",
  "fire_safety_certificate",
  "other",
] as const;

const HOTEL_DOCUMENT_TYPES = [
  "business_registration_certificate",
  "government_trade_license",
  "tax_registration_proof",
  "bank_account_proof",
  "authorized_person_id",
] as const;

const HOTEL_BRANCH_DOCUMENT_TYPES = [
  "local_trade_license",
  "property_ownership",
  "fire_safety",
  "hotel_operating_license",
] as const;

/** Check if vendor owns the listing */
async function vendorOwnsListing(listingId: string, vendorId: string): Promise<boolean> {
  try {
    const r = await query<{ id: string }>("SELECT id FROM listings WHERE id = $1 AND vendor_id = $2", [listingId, vendorId]);
    if (r.rows.length > 0) return true;
  } catch {
    // vendor_id column may not exist
  }
  try {
    const vl = await query<{ listing_id: string }>("SELECT listing_id FROM vendor_listings WHERE listing_id = $1 AND vendor_id = $2", [listingId, vendorId]);
    return vl.rows.length > 0;
  } catch {
    return false;
  }
}

/** Resolve verification token to listing (vendor must own the listing). Query: ?token=CMP-XXXX-XXXX */
router.get("/resolve-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const token = (req.query.token as string)?.trim();
    if (!token) {
      res.status(400).json({ error: "Missing token query" });
      return;
    }
    type Row = { id: string; name: string; type: string; verification_status: string | null };
    let row: Row | null = null;
    try {
      const result = await query<Row>(
        "SELECT id, name, type, verification_status FROM listings WHERE verification_token = $1 AND vendor_id = $2",
        [token, vendorId]
      );
      if (result.rows.length > 0) row = result.rows[0];
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
      if (code === "42703") {
        res.status(404).json({ error: "Token not found" });
        return;
      }
      throw e;
    }
    if (!row) {
      try {
        const result = await query<Row & { vendor_id?: string }>(
          "SELECT l.id, l.name, l.type, l.verification_status FROM listings l INNER JOIN vendor_listings vl ON vl.listing_id = l.id AND vl.vendor_id = $2 WHERE l.verification_token = $1",
          [token, vendorId]
        );
        if (result.rows.length > 0) row = result.rows[0] as Row;
      } catch {
        // ignore
      }
    }
    if (!row) {
      res.status(404).json({ error: "Invalid token or token does not belong to you" });
      return;
    }
    res.json({ listing_id: row.id, name: row.name, type: row.type, verification_status: row.verification_status ?? "no_request" });
  } catch (err) {
    console.error("Resolve token error:", err);
    res.status(500).json({ error: "Failed to resolve token" });
  }
});

/** Resolve bus verification token. Query: ?token=BUS-XXXX-XXXX. Returns bus info if token matches a bus in vendor's listing. */
router.get("/resolve-bus-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const token = (req.query.token as string)?.trim();
    if (!token) {
      res.status(400).json({ error: "Missing token query" });
      return;
    }
    const result = await query<{
      bus_id: string;
      bus_name: string;
      registration_number: string | null;
      listing_id: string;
      listing_name: string;
      verification_status: string | null;
    }>(
      `SELECT b.id AS bus_id, b.name AS bus_name, b.registration_number, b.listing_id, b.verification_status,
        l.name AS listing_name
       FROM buses b
       JOIN listings l ON l.id = b.listing_id AND l.vendor_id = $2
       WHERE b.verification_token = $1`,
      [token, vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invalid token or bus does not belong to you" });
      return;
    }
    const row = result.rows[0];
    res.json({
      bus_id: row.bus_id,
      name: row.bus_name,
      registration_number: row.registration_number,
      listing_id: row.listing_id,
      listing_name: row.listing_name,
      verification_status: row.verification_status ?? "no_request",
    });
  } catch (err) {
    console.error("Resolve bus token error:", err);
    res.status(500).json({ error: "Failed to resolve token" });
  }
});

/** Resolve hotel branch verification token. Query: ?token=HBR-XXXX-XXXX. Returns branch info if token matches a branch in vendor's listing. */
router.get("/resolve-hotel-branch-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const token = (req.query.token as string)?.trim();
    if (!token) {
      res.status(400).json({ error: "Missing token query" });
      return;
    }
    let result: { rows: { hotel_branch_id: string; listing_id: string; name: string; verification_status: string | null }[] };
    try {
      result = await query(
        `SELECT hb.id AS hotel_branch_id, hb.listing_id, hb.name, hb.verification_status
         FROM hotel_branches hb
         JOIN listings l ON l.id = hb.listing_id AND l.vendor_id = $2
         WHERE hb.verification_token = $1`,
        [token, vendorId]
      );
    } catch {
      try {
        result = await query(
          `SELECT hb.id AS hotel_branch_id, hb.listing_id, hb.name, hb.verification_status
           FROM hotel_branches hb
           JOIN vendor_listings vl ON vl.listing_id = hb.listing_id AND vl.vendor_id = $2
           WHERE hb.verification_token = $1`,
          [token, vendorId]
        );
      } catch {
        result = { rows: [] };
      }
    }
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invalid token or hotel branch does not belong to you" });
      return;
    }
    const row = result.rows[0];
    res.json({
      listing_id: row.listing_id,
      hotel_branch_id: row.hotel_branch_id,
      name: row.name,
      type: "hotel_branch",
      verification_status: row.verification_status ?? "no_request",
    });
  } catch (err) {
    console.error("Resolve hotel branch token error:", err);
    res.status(500).json({ error: "Failed to resolve token" });
  }
});

const CAR_DOCUMENT_TYPES = ["insurance", "rc", "driver_license"] as const;

/** Resolve car verification token. Query: ?token=CAR-XXXX-XXXX. Returns car info if token matches a car in vendor's listing. */
router.get("/resolve-car-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const token = (req.query.token as string)?.trim();
    if (!token) {
      res.status(400).json({ error: "Missing token query" });
      return;
    }
    const result = await query<{
      car_id: string;
      car_name: string;
      registration_number: string | null;
      listing_id: string;
      listing_name: string;
      verification_status: string | null;
    }>(
      `SELECT c.id AS car_id, c.name AS car_name, c.registration_number, c.listing_id, c.verification_status,
        l.name AS listing_name
       FROM cars c
       JOIN listings l ON l.id = c.listing_id AND l.vendor_id = $2
       WHERE c.verification_token = $1`,
      [token, vendorId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invalid token or car does not belong to you" });
      return;
    }
    const row = result.rows[0];
    res.json({
      car_id: row.car_id,
      name: row.car_name,
      registration_number: row.registration_number,
      listing_id: row.listing_id,
      listing_name: row.listing_name,
      verification_status: row.verification_status ?? "no_request",
    });
  } catch (err) {
    console.error("Resolve car token error:", err);
    res.status(500).json({ error: "Failed to resolve token" });
  }
});

/** List my listings with verification fields (for Verification page: select company + type) */
router.get("/listings", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    type Row = { id: string; name: string; type: string; verification_token: string | null; verification_status: string | null };
    let rows: Row[];
    try {
      const result = await query<Row>(
        "SELECT id, name, type, verification_token, verification_status FROM listings WHERE vendor_id = $1 ORDER BY name",
        [vendorId]
      );
      rows = result.rows;
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
      if (code === "42703") {
        const result = await query<{ id: string; name: string; type: string }>(
          "SELECT id, name, type FROM listings WHERE vendor_id = $1 ORDER BY name",
          [vendorId]
        );
        rows = result.rows.map((r) => ({ ...r, verification_token: null, verification_status: "no_request" }));
      } else {
        try {
          const result = await query<Row & { vendor_id?: string }>(
            "SELECT l.id, l.name, l.type, l.verification_token, l.verification_status FROM listings l INNER JOIN vendor_listings vl ON vl.listing_id = l.id AND vl.vendor_id = $1 ORDER BY l.name",
            [vendorId]
          );
          rows = result.rows as Row[];
        } catch {
          rows = [];
        }
      }
    }
    res.json({ listings: rows });
  } catch (err) {
    console.error("Verification listings error:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

/** Get documents for a listing */
router.get("/documents/:listingId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { listingId } = req.params;
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    try {
      const result = await query<{ id: string; document_type: string; file_name: string; file_url: string; created_at: string }>(
        "SELECT id, document_type, file_name, file_url, created_at FROM verification_documents WHERE listing_id = $1 ORDER BY created_at",
        [listingId]
      );
      res.json({ documents: result.rows });
    } catch {
      res.json({ documents: [] });
    }
  } catch (err) {
    console.error("Verification documents list error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/** Add a document for a listing (file_url from /api/upload or similar). For experience listings, accepts experience-specific document types. */
router.post("/documents", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { listing_id, document_type, file_name, file_url } = req.body as { listing_id?: string; document_type?: string; file_name?: string; file_url?: string };
    if (!listing_id || !document_type || !file_name || !file_url) {
      res.status(400).json({ error: "Missing listing_id, document_type, file_name, or file_url" });
      return;
    }
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const listingRow = await query<{ type: string }>("SELECT type FROM listings WHERE id = $1", [listing_id]);
    const listingType = listingRow.rows[0]?.type?.toLowerCase() ?? "";
    const allowedTypes =
      listingType === "experience"
        ? [...EXPERIENCE_DOCUMENT_TYPES]
        : listingType === "event"
          ? [...EVENT_DOCUMENT_TYPES]
          : listingType === "hotel"
            ? [...HOTEL_DOCUMENT_TYPES]
            : listingType === "hotel_branch"
              ? [...HOTEL_BRANCH_DOCUMENT_TYPES]
              : [...DOCUMENT_TYPES];
    if (!(allowedTypes as readonly string[]).includes(document_type)) {
      const msg =
        listingType === "experience"
          ? "Invalid document_type for experience. Use: " + EXPERIENCE_DOCUMENT_TYPES.join(", ")
          : listingType === "event"
            ? "Invalid document_type for event. Use: " + EVENT_DOCUMENT_TYPES.join(", ")
            : listingType === "hotel"
              ? "Invalid document_type for hotel. Use: " + HOTEL_DOCUMENT_TYPES.join(", ")
              : listingType === "hotel_branch"
                ? "Invalid document_type for hotel branch. Use: " + HOTEL_BRANCH_DOCUMENT_TYPES.join(", ")
                : "Invalid document_type. Use: " + DOCUMENT_TYPES.join(", ");
      res.status(400).json({ error: msg });
      return;
    }
    try {
      await query(
        "INSERT INTO verification_documents (listing_id, document_type, file_name, file_url) VALUES ($1, $2, $3, $4)",
        [listing_id, document_type, file_name, file_url]
      );
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
      if (code === "42P01" || (e && typeof e === "object" && "message" in e && String((e as Error).message).includes("verification_documents"))) {
        res.status(503).json({ error: "Verification documents not set up. Run migration: npx tsx scripts/run-one-schema.ts 023_verification_documents.sql" });
        return;
      }
      throw e;
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Verification document add error:", err);
    res.status(500).json({ error: "Failed to add document" });
  }
});

/** Send verification request for a listing (sets status to pending; admin can then approve/reject). Body: { listing_id } or { token } */
router.post("/send-request", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const body = req.body as { listing_id?: string; token?: string };
    let listing_id = body.listing_id;
    if (!listing_id && body.token) {
      const token = String(body.token).trim();
      const r = await query<{ id: string }>(
        "SELECT id FROM listings WHERE verification_token = $1 AND vendor_id = $2",
        [token, vendorId]
      );
      if (r.rows.length === 0) {
        try {
          const r2 = await query<{ id: string }>(
            "SELECT l.id FROM listings l INNER JOIN vendor_listings vl ON vl.listing_id = l.id AND vl.vendor_id = $2 WHERE l.verification_token = $1",
            [token, vendorId]
          );
          if (r2.rows.length > 0) listing_id = r2.rows[0].id;
        } catch {
          // ignore
        }
      } else {
        listing_id = r.rows[0].id;
      }
    }
    if (!listing_id) {
      res.status(400).json({ error: "Missing listing_id or token" });
      return;
    }
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const row = await query<{ verification_token: string | null; verification_status: string | null }>(
      "SELECT verification_token, verification_status FROM listings WHERE id = $1",
      [listing_id]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (!row.rows[0].verification_token) {
      res.status(400).json({ error: "Generate a verification token for this listing first (My Listings → Verify)" });
      return;
    }
    const status = row.rows[0].verification_status ?? "no_request";
    if (status === "pending") {
      res.json({ message: "Verification request already sent", verification_status: "pending" });
      return;
    }
    if (status === "approved") {
      res.status(400).json({ error: "This listing is already approved" });
      return;
    }
    // no_request or rejected: allow send (re-request when rejected)
    await query(
      "UPDATE listings SET verification_status = 'pending', updated_at = now() WHERE id = $1",
      [listing_id]
    );
    res.json({ message: status === "rejected" ? "Re-verification request sent" : "Verification request sent", verification_status: "pending" });
  } catch (err) {
    console.error("Verification send-request error:", err);
    res.status(500).json({ error: "Failed to send verification request" });
  }
});

/** List documents for a bus. Query: ?listing_id= (required to verify ownership). */
router.get("/bus-documents/:busId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { busId } = req.params;
    const listingId = (req.query.listing_id as string)?.trim();
    if (!listingId || !busId) {
      res.status(400).json({ error: "Missing busId or listing_id" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const busCheck = await query<{ id: string }>("SELECT id FROM buses WHERE id = $1 AND listing_id = $2", [busId, listingId]);
    if (busCheck.rows.length === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    let docs: { id: string; document_type: string; file_name: string; file_url: string; created_at: string }[] = [];
    try {
      const result = await query<{ id: string; document_type: string; file_name: string; file_url: string; created_at: string }>(
        "SELECT id, document_type, file_name, file_url, created_at FROM verification_bus_documents WHERE bus_id = $1 ORDER BY created_at",
        [busId]
      );
      docs = result.rows;
    } catch {
      // table may not exist
    }
    res.json({ documents: docs });
  } catch (err) {
    console.error("Bus documents list error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/** Add a document for a bus. Body: { bus_id, listing_id, document_type, file_name, file_url }. */
router.post("/bus-documents", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const body = req.body as { bus_id?: string; listing_id?: string; document_type?: string; file_name?: string; file_url?: string };
    let { bus_id, listing_id, document_type, file_name, file_url } = body;
    if (!bus_id || !listing_id || !document_type || !file_name || !file_url) {
      res.status(400).json({ error: "Missing bus_id, listing_id, document_type, file_name, or file_url" });
      return;
    }
    // Store only filename so admin can serve from its uploads path
    const filenameOnly = (file_url || "").split("/").filter(Boolean).pop() || file_url;
    file_url = filenameOnly;
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const busCheck = await query<{ id: string }>("SELECT id FROM buses WHERE id = $1 AND listing_id = $2", [bus_id, listing_id]);
    if (busCheck.rows.length === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    await query(
      "INSERT INTO verification_bus_documents (bus_id, listing_id, document_type, file_name, file_url) VALUES ($1, $2, $3, $4, $5)",
      [bus_id, listing_id, document_type, file_name, file_url]
    );
    res.status(201).json({ message: "Document added" });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "42P01" || (e.message && String(e.message).includes("verification_bus_documents"))) {
      res.status(503).json({ error: "Bus verification documents not set up. Run migration 025_verification_bus_documents.sql" });
      return;
    }
    console.error("Bus document add error:", err);
    res.status(500).json({ error: "Failed to add document" });
  }
});

/** Send verification request for a bus. Body: { bus_id, listing_id }. Bus must have a token and belong to vendor's listing. */
router.post("/send-bus-request", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const body = req.body as { bus_id?: string; listing_id?: string };
    const { bus_id, listing_id } = body;
    if (!bus_id || !listing_id) {
      res.status(400).json({ error: "Missing bus_id or listing_id" });
      return;
    }
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const row = await query<{ verification_token: string | null; verification_status: string | null }>(
      "SELECT verification_token, verification_status FROM buses WHERE id = $1 AND listing_id = $2",
      [bus_id, listing_id]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    if (!row.rows[0].verification_token) {
      res.status(400).json({ error: "Generate a verification token for this bus first (Manage Fleet → Verify)" });
      return;
    }
    const status = row.rows[0].verification_status ?? "no_request";
    if (status === "pending") {
      res.json({ message: "Verification request already sent", verification_status: "pending" });
      return;
    }
    if (status === "approved") {
      res.status(400).json({ error: "This bus is already approved" });
      return;
    }
    // no_request or rejected: allow send (re-request when rejected)
    await query("UPDATE buses SET verification_status = 'pending' WHERE id = $1 AND listing_id = $2", [bus_id, listing_id]);
    res.json({ message: status === "rejected" ? "Re-verification request sent" : "Verification request sent", verification_status: "pending" });
  } catch (err) {
    console.error("Verification send-bus-request error:", err);
    res.status(500).json({ error: "Failed to send bus verification request" });
  }
});

/** List documents for a hotel branch. Query: ?listing_id= (required to verify ownership). */
router.get("/hotel-branch-documents/:branchId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { branchId } = req.params;
    const listingId = (req.query.listing_id as string)?.trim();
    if (!listingId || !branchId) {
      res.status(400).json({ error: "Missing branchId or listing_id" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const branchCheck = await query<{ id: string }>("SELECT id FROM hotel_branches WHERE id = $1 AND listing_id = $2", [branchId, listingId]);
    if (branchCheck.rows.length === 0) {
      res.status(404).json({ error: "Hotel branch not found" });
      return;
    }
    let docs: { id: string; document_type: string; file_name: string; file_url: string; created_at: string }[] = [];
    try {
      const result = await query<{ id: string; document_type: string; file_name: string; file_url: string; created_at: string }>(
        "SELECT id, document_type, file_name, file_url, created_at FROM verification_hotel_branch_documents WHERE hotel_branch_id = $1 ORDER BY created_at",
        [branchId]
      );
      docs = result.rows;
    } catch {
      //
    }
    res.json({ documents: docs });
  } catch (err) {
    console.error("Hotel branch documents list error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/** Add a document for a hotel branch. Body: { hotel_branch_id, listing_id, document_type, file_name, file_url }. */
router.post("/hotel-branch-documents", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const body = req.body as { hotel_branch_id?: string; listing_id?: string; document_type?: string; file_name?: string; file_url?: string };
    const { hotel_branch_id, listing_id, document_type, file_name, file_url } = body;
    if (!hotel_branch_id || !listing_id || !document_type || !file_name || !file_url) {
      res.status(400).json({ error: "Missing hotel_branch_id, listing_id, document_type, file_name, or file_url" });
      return;
    }
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const branchCheck = await query<{ id: string }>("SELECT id FROM hotel_branches WHERE id = $1 AND listing_id = $2", [hotel_branch_id, listing_id]);
    if (branchCheck.rows.length === 0) {
      res.status(404).json({ error: "Hotel branch not found" });
      return;
    }
    if (!(HOTEL_BRANCH_DOCUMENT_TYPES as readonly string[]).includes(document_type)) {
      res.status(400).json({ error: "Invalid document_type for hotel branch. Use: " + HOTEL_BRANCH_DOCUMENT_TYPES.join(", ") });
      return;
    }
    try {
      await query(
        "INSERT INTO verification_hotel_branch_documents (hotel_branch_id, listing_id, document_type, file_name, file_url) VALUES ($1, $2, $3, $4, $5)",
        [hotel_branch_id, listing_id, document_type, file_name, file_url]
      );
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "42P01" || (err.message && String(err.message).includes("verification_hotel_branch_documents"))) {
        res.status(503).json({ error: "Hotel branch verification documents not set up. Run schema 045_verification_hotel_branch_documents.sql" });
        return;
      }
      throw e;
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Hotel branch document add error:", err);
    res.status(500).json({ error: "Failed to add document" });
  }
});

/** Send verification request for a hotel branch. Body: { hotel_branch_id, listing_id }. */
router.post("/send-hotel-branch-request", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const body = req.body as { hotel_branch_id?: string; listing_id?: string };
    const { hotel_branch_id, listing_id } = body;
    if (!hotel_branch_id || !listing_id) {
      res.status(400).json({ error: "Missing hotel_branch_id or listing_id" });
      return;
    }
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const row = await query<{ verification_token: string | null; verification_status: string | null }>(
      "SELECT verification_token, verification_status FROM hotel_branches WHERE id = $1 AND listing_id = $2",
      [hotel_branch_id, listing_id]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Hotel branch not found" });
      return;
    }
    if (!row.rows[0].verification_token) {
      res.status(400).json({ error: "Generate a verification token for this hotel branch first (Your hotels → Verify)" });
      return;
    }
    const status = row.rows[0].verification_status ?? "no_request";
    if (status === "pending") {
      res.json({ message: "Verification request already sent", verification_status: "pending" });
      return;
    }
    if (status === "approved" || status === "verified") {
      res.status(400).json({ error: "This hotel branch is already approved" });
      return;
    }
    await query("UPDATE hotel_branches SET verification_status = 'pending', updated_at = now() WHERE id = $1 AND listing_id = $2", [hotel_branch_id, listing_id]);
    res.json({ message: status === "rejected" ? "Re-verification request sent" : "Verification request sent", verification_status: "pending" });
  } catch (err) {
    console.error("Send hotel branch request error:", err);
    res.status(500).json({ error: "Failed to send hotel branch verification request" });
  }
});

/** List documents for a car. Query: ?listing_id= (required to verify ownership). */
router.get("/car-documents/:carId", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const { carId } = req.params;
    const listingId = (req.query.listing_id as string)?.trim();
    if (!listingId || !carId) {
      res.status(400).json({ error: "Missing carId or listing_id" });
      return;
    }
    const owns = await vendorOwnsListing(listingId, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const carCheck = await query<{ id: string }>("SELECT id FROM cars WHERE id = $1 AND listing_id = $2", [carId, listingId]);
    if (carCheck.rows.length === 0) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    let docs: { id: string; document_type: string; file_name: string; file_url: string; created_at: string }[] = [];
    try {
      const result = await query<{ id: string; document_type: string; file_name: string; file_url: string; created_at: string }>(
        "SELECT id, document_type, file_name, file_url, created_at FROM verification_car_documents WHERE car_id = $1 ORDER BY created_at",
        [carId]
      );
      docs = result.rows;
    } catch {
      // table may not exist
    }
    res.json({ documents: docs });
  } catch (err) {
    console.error("Car documents list error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/** Add a document for a car. Body: { car_id, listing_id, document_type, file_name, file_url }. document_type: insurance | rc | driver_license */
router.post("/car-documents", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const body = req.body as { car_id?: string; listing_id?: string; document_type?: string; file_name?: string; file_url?: string };
    let { car_id, listing_id, document_type, file_name, file_url } = body;
    if (!car_id || !listing_id || !document_type || !file_name || !file_url) {
      res.status(400).json({ error: "Missing car_id, listing_id, document_type, file_name, or file_url" });
      return;
    }
    if (!CAR_DOCUMENT_TYPES.includes(document_type as (typeof CAR_DOCUMENT_TYPES)[number])) {
      res.status(400).json({ error: "Invalid document_type. Use: insurance, rc, driver_license" });
      return;
    }
    const filenameOnly = (file_url || "").split("/").filter(Boolean).pop() || file_url;
    file_url = filenameOnly;
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const carCheck = await query<{ id: string }>("SELECT id FROM cars WHERE id = $1 AND listing_id = $2", [car_id, listing_id]);
    if (carCheck.rows.length === 0) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    await query(
      "INSERT INTO verification_car_documents (car_id, listing_id, document_type, file_name, file_url) VALUES ($1, $2, $3, $4, $5)",
      [car_id, listing_id, document_type, file_name, file_url]
    );
    res.status(201).json({ message: "Document added" });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "42P01" || (e.message && String(e.message).includes("verification_car_documents"))) {
      res.status(503).json({ error: "Car verification documents not set up. Run migration 029_verification_car_documents.sql" });
      return;
    }
    console.error("Car document add error:", err);
    res.status(500).json({ error: "Failed to add document" });
  }
});

/** Resolve flight verification token. Query: ?token=FLT-XXXX-XXXX. Returns flight info if token matches a flight in vendor's listing. */
router.get("/resolve-flight-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const token = (req.query.token as string)?.trim();
    if (!token) {
      res.status(400).json({ error: "Missing token query" });
      return;
    }
    let result: { rows: { flight_id: string; flight_number: string; airline_name: string; listing_id: string; listing_name: string; verification_status: string | null }[] };
    try {
      result = await query<{
        flight_id: string;
        flight_number: string;
        airline_name: string;
        listing_id: string;
        listing_name: string;
        verification_status: string | null;
      }>(
        `SELECT f.id AS flight_id, f.flight_number, f.airline_name, f.listing_id, f.verification_status,
          l.name AS listing_name
         FROM flights f
         JOIN listings l ON l.id = f.listing_id AND l.vendor_id = $2
         WHERE f.verification_token = $1`,
        [token, vendorId]
      );
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
      if (code === "42P01") {
        res.status(503).json({ error: "Flights table not set up. Run schema 034_flights.sql and 037_flights_verification.sql." });
        return;
      }
      throw e;
    }
    if (result.rows.length === 0) {
      try {
        result = await query<{
          flight_id: string;
          flight_number: string;
          airline_name: string;
          listing_id: string;
          listing_name: string;
          verification_status: string | null;
        }>(
          `SELECT f.id AS flight_id, f.flight_number, f.airline_name, f.listing_id, f.verification_status,
            l.name AS listing_name
           FROM flights f
           JOIN listings l ON l.id = f.listing_id
           INNER JOIN vendor_listings vl ON vl.listing_id = f.listing_id AND vl.vendor_id = $2
           WHERE f.verification_token = $1`,
          [token, vendorId]
        );
      } catch {
        // ignore
      }
    }
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invalid token or flight does not belong to you" });
      return;
    }
    const row = result.rows[0];
    res.json({
      flight_id: row.flight_id,
      flight_number: row.flight_number,
      airline_name: row.airline_name,
      listing_id: row.listing_id,
      listing_name: row.listing_name,
      verification_status: row.verification_status ?? "no_request",
    });
  } catch (err) {
    console.error("Resolve flight token error:", err);
    res.status(500).json({ error: "Failed to resolve token" });
  }
});

/** Send verification request for a flight. Body: { flight_id, listing_id }. Flight must have a token and belong to vendor's listing. */
router.post("/send-flight-request", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const body = req.body as { flight_id?: string; listing_id?: string };
    const { flight_id, listing_id } = body;
    if (!flight_id || !listing_id) {
      res.status(400).json({ error: "Missing flight_id or listing_id" });
      return;
    }
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const row = await query<{ verification_token: string | null; verification_status: string | null }>(
      "SELECT verification_token, verification_status FROM flights WHERE id = $1 AND listing_id = $2",
      [flight_id, listing_id]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Flight not found" });
      return;
    }
    if (!row.rows[0].verification_token) {
      res.status(400).json({ error: "Generate a verification token for this flight first (Fleet → Flight → Verify)" });
      return;
    }
    const status = row.rows[0].verification_status ?? "no_request";
    if (status === "pending") {
      res.json({ message: "Verification request already sent", verification_status: "pending" });
      return;
    }
    if (status === "approved") {
      res.status(400).json({ error: "This flight is already approved" });
      return;
    }
    await query("UPDATE flights SET verification_status = 'pending', updated_at = now() WHERE id = $1 AND listing_id = $2", [flight_id, listing_id]);
    res.json({ message: status === "rejected" ? "Re-verification request sent" : "Verification request sent", verification_status: "pending" });
  } catch (err) {
    console.error("Verification send-flight-request error:", err);
    res.status(500).json({ error: "Failed to send flight verification request" });
  }
});

/** Send verification request for a car. Body: { car_id, listing_id }. Car must have a token and belong to vendor's listing. */
router.post("/send-car-request", async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendorId!;
    const body = req.body as { car_id?: string; listing_id?: string };
    const { car_id, listing_id } = body;
    if (!car_id || !listing_id) {
      res.status(400).json({ error: "Missing car_id or listing_id" });
      return;
    }
    const owns = await vendorOwnsListing(listing_id, vendorId);
    if (!owns) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const row = await query<{ verification_token: string | null; verification_status: string | null }>(
      "SELECT verification_token, verification_status FROM cars WHERE id = $1 AND listing_id = $2",
      [car_id, listing_id]
    );
    if (row.rows.length === 0) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    if (!row.rows[0].verification_token) {
      res.status(400).json({ error: "Generate a verification token for this car first (Manage Fleet → Verify)" });
      return;
    }
    const status = row.rows[0].verification_status ?? "no_request";
    if (status === "pending") {
      res.json({ message: "Verification request already sent", verification_status: "pending" });
      return;
    }
    if (status === "approved") {
      res.status(400).json({ error: "This car is already approved" });
      return;
    }
    await query("UPDATE cars SET verification_status = 'pending' WHERE id = $1 AND listing_id = $2", [car_id, listing_id]);
    res.json({ message: status === "rejected" ? "Re-verification request sent" : "Verification request sent", verification_status: "pending" });
  } catch (err) {
    console.error("Verification send-car-request error:", err);
    res.status(500).json({ error: "Failed to send car verification request" });
  }
});

export default router;

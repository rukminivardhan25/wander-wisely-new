import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();

/** List listings pending verification (admin view). Query: ?type=transport|restaurant|... (optional) */
router.get("/pending", async (req: Request, res: Response): Promise<void> => {
  try {
    const type = (req.query.type as string)?.toLowerCase();
    let result: { rows: { id: string; name: string; type: string; verification_token: string | null; verification_status: string | null; updated_at: string }[] };
    if (type) {
      result = await query<{ id: string; name: string; type: string; verification_token: string | null; verification_status: string | null; updated_at: string }>(
        "SELECT id, name, type, verification_token, verification_status, updated_at FROM listings WHERE verification_status = 'pending' AND LOWER(type) = $1 ORDER BY updated_at DESC",
        [type]
      );
    } else {
      result = await query<{ id: string; name: string; type: string; verification_token: string | null; verification_status: string | null; updated_at: string }>(
        "SELECT id, name, type, verification_token, verification_status, updated_at FROM listings WHERE verification_status = 'pending' ORDER BY updated_at DESC"
      );
    }
    res.json({ listings: result.rows });
  } catch (err) {
    console.error("Verification pending error:", err);
    res.status(500).json({ error: "Failed to fetch pending" });
  }
});

/** Get one listing details for admin (company + owner + documents) */
router.get("/listing/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const listing = await query<{
      id: string;
      name: string;
      type: string;
      verification_token: string | null;
      verification_status: string | null;
      updated_at: string;
      registered_address: string | null;
      address: string | null;
      vendor_id: string;
      vendor_name: string | null;
      vendor_email: string | null;
    }>(
      `SELECT l.id, l.name, l.type, l.verification_token, l.verification_status, l.updated_at,
        l.registered_address, l.address, l.vendor_id,
        v.name AS vendor_name, v.email AS vendor_email
       FROM listings l
       LEFT JOIN vendors v ON v.id = l.vendor_id
       WHERE l.id = $1`,
      [id]
    );
    if (listing.rows.length === 0) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    let documents: { document_type: string; file_name: string; file_url: string }[] = [];
    try {
      const docs = await query<{ document_type: string; file_name: string; file_url: string }>(
        "SELECT document_type, file_name, file_url FROM verification_documents WHERE listing_id = $1 ORDER BY created_at",
        [id]
      );
      documents = docs.rows;
    } catch {
      // verification_documents table may not exist
    }
    const row = listing.rows[0];
    const docTypeLabel: Record<string, string> = {
      business_license: "Business License",
      owner_id: "Owner ID",
      tax_document: "Tax Document",
      health_safety: "Health & Safety Certificate",
    };
    const adminBase = process.env.ADMIN_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3003}`;
    const base = adminBase.replace(/\/$/, "");
    res.json({
      id: row.id,
      name: row.name,
      type: row.type,
      verification_token: row.verification_token,
      verification_status: row.verification_status,
      updated_at: row.updated_at,
      address: row.registered_address || row.address || null,
      ownerName: row.vendor_name || null,
      ownerEmail: row.vendor_email || null,
      documents: documents.map((d) => {
        const filename = d.file_url.split("/").pop() || "";
        const url = /^[a-f0-9-]+\.(pdf|jpg|jpeg|png|gif|webp)$/i.test(filename) ? `${base}/api/verification/uploads/${filename}` : d.file_url;
        return {
          type: docTypeLabel[d.document_type] || d.document_type,
          fileName: d.file_name,
          url,
        };
      }),
    });
  } catch (err) {
    console.error("Verification listing detail error:", err);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

/** Approve a listing */
router.post("/:id/approve", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query("UPDATE listings SET verification_status = 'approved', verified_at = now(), updated_at = now() WHERE id = $1", [id]);
    res.json({ message: "Approved", verification_status: "approved" });
  } catch (err) {
    console.error("Verification approve error:", err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

/** Reject a listing */
router.post("/:id/reject", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query("UPDATE listings SET verification_status = 'rejected', updated_at = now() WHERE id = $1", [id]);
    res.json({ message: "Rejected", verification_status: "rejected" });
  } catch (err) {
    console.error("Verification reject error:", err);
    res.status(500).json({ error: "Failed to reject" });
  }
});

// ----- Bus verification (category = Buses) -----

/** List buses awaiting verification (have a token; not yet approved/rejected) */
router.get("/pending-buses", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{
      id: string;
      name: string;
      registration_number: string | null;
      bus_number: string | null;
      listing_id: string;
      listing_name: string;
      verification_token: string | null;
      verification_status: string | null;
      updated_at: string;
    }>(
      `SELECT b.id, b.name, b.registration_number, b.bus_number, b.listing_id, b.verification_token, b.verification_status, b.updated_at,
        l.name AS listing_name
       FROM buses b
       JOIN listings l ON l.id = b.listing_id
       WHERE b.verification_token IS NOT NULL
         AND (b.verification_status IS NULL OR b.verification_status IN ('no_request', 'pending'))
       ORDER BY b.updated_at DESC NULLS LAST`
    );
    res.json({ buses: result.rows });
  } catch (err) {
    console.error("Verification pending buses error:", err);
    res.status(500).json({ error: "Failed to fetch pending buses" });
  }
});

/** Get one bus detail for admin (includes drivers, routes/pricing, uploaded documents) */
router.get("/bus/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const bus = await query<{
      id: string;
      name: string;
      registration_number: string | null;
      bus_number: string | null;
      listing_id: string;
      verification_token: string | null;
      verification_status: string | null;
      updated_at: string;
      listing_name: string | null;
      vendor_name: string | null;
      vendor_email: string | null;
    }>(
      `SELECT b.id, b.name, b.registration_number, b.bus_number, b.listing_id, b.verification_token, b.verification_status, b.updated_at,
        l.name AS listing_name, v.name AS vendor_name, v.email AS vendor_email
       FROM buses b
       JOIN listings l ON l.id = b.listing_id
       LEFT JOIN vendors v ON v.id = l.vendor_id
       WHERE b.id = $1`,
      [id]
    );
    if (bus.rows.length === 0) {
      res.status(404).json({ error: "Bus not found" });
      return;
    }
    const row = bus.rows[0];

    let drivers: { id: string; name: string | null; phone: string | null; license_no: string | null }[] = [];
    let routes: { id: string; from_place: string; to_place: string; distance_km: number | null; duration_minutes: number | null; price_per_seat_cents: number | null }[] = [];
    let documents: { document_type: string; file_name: string; file_url: string }[] = [];

    try {
      const dr = await query<{ id: string; name: string | null; phone: string | null; license_no: string | null }>(
        "SELECT id, name, phone, license_no FROM drivers WHERE listing_id = $1 AND bus_id = $2 ORDER BY created_at",
        [row.listing_id, id]
      );
      drivers = dr.rows;
    } catch {
      // drivers table may not exist
    }
    try {
      const rt = await query<{ id: string; from_place: string; to_place: string; distance_km: number | null; duration_minutes: number | null; price_per_seat_cents: number | null }>(
        "SELECT id, from_place, to_place, distance_km, duration_minutes, price_per_seat_cents FROM routes WHERE listing_id = $1 AND bus_id = $2 ORDER BY created_at",
        [row.listing_id, id]
      );
      routes = rt.rows;
    } catch {
      // routes table may not exist
    }
    try {
      const docRows = await query<{ document_type: string; file_name: string; file_url: string }>(
        "SELECT document_type, file_name, file_url FROM verification_bus_documents WHERE bus_id = $1 ORDER BY created_at",
        [id]
      );
      const adminBase = process.env.ADMIN_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3003}`;
      const base = adminBase.replace(/\/$/, "");
      const docTypeLabel: Record<string, string> = {
        driver_details: "Driver details",
        routes_pricing: "Routes & pricing",
        insurance: "Insurance",
        other: "Other document",
      };
      documents = docRows.rows.map((d) => {
        const filename = (d.file_url || "").split("/").filter(Boolean).pop() || d.file_url;
        const url = `${base}/api/verification/uploads/${filename}`;
        return {
          document_type: docTypeLabel[d.document_type] || d.document_type,
          file_name: d.file_name,
          file_url: url,
        };
      });
    } catch {
      // verification_bus_documents may not exist
    }

    res.json({
      id: row.id,
      name: row.name,
      registrationNumber: row.registration_number,
      busNumber: row.bus_number,
      listingId: row.listing_id,
      listingName: row.listing_name,
      verification_token: row.verification_token,
      verification_status: row.verification_status,
      updated_at: row.updated_at,
      ownerName: row.vendor_name || null,
      ownerEmail: row.vendor_email || null,
      drivers,
      routes,
      documents,
    });
  } catch (err) {
    console.error("Verification bus detail error:", err);
    res.status(500).json({ error: "Failed to fetch bus" });
  }
});

/** Approve a bus (also set status to active so it appears in Bookings) */
router.post("/bus/:id/approve", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query("UPDATE buses SET verification_status = 'approved', verified_at = now(), status = 'active' WHERE id = $1", [id]);
    res.json({ message: "Approved", verification_status: "approved" });
  } catch (err) {
    console.error("Verification bus approve error:", err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

/** Reject a bus */
router.post("/bus/:id/reject", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query("UPDATE buses SET verification_status = 'rejected' WHERE id = $1", [id]);
    res.json({ message: "Rejected", verification_status: "rejected" });
  } catch (err) {
    console.error("Verification bus reject error:", err);
    res.status(500).json({ error: "Failed to reject" });
  }
});

// ----- Car verification (category = Cars) -----

/** List cars awaiting verification (have a token; not yet approved/rejected) */
router.get("/pending-cars", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{
      id: string;
      name: string;
      registration_number: string | null;
      category: string;
      listing_id: string;
      listing_name: string;
      verification_token: string | null;
      verification_status: string | null;
      updated_at: string;
    }>(
      `SELECT c.id, c.name, c.registration_number, c.category, c.listing_id, c.verification_token, c.verification_status, c.updated_at,
        l.name AS listing_name
       FROM cars c
       JOIN listings l ON l.id = c.listing_id
       WHERE c.verification_token IS NOT NULL
         AND (c.verification_status IS NULL OR c.verification_status IN ('no_request', 'pending'))
       ORDER BY c.updated_at DESC NULLS LAST`
    );
    res.json({ cars: result.rows });
  } catch (err) {
    console.error("Verification pending cars error:", err);
    res.status(500).json({ error: "Failed to fetch pending cars" });
  }
});

/** Get one car detail for admin (includes drivers, operating areas, documents) */
router.get("/car/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const car = await query<{
      id: string;
      name: string;
      registration_number: string | null;
      category: string;
      car_type: string;
      seats: number;
      listing_id: string;
      verification_token: string | null;
      verification_status: string | null;
      updated_at: string;
      listing_name: string | null;
      vendor_name: string | null;
      vendor_email: string | null;
    }>(
      `SELECT c.id, c.name, c.registration_number, c.category, c.car_type, c.seats, c.listing_id, c.verification_token, c.verification_status, c.updated_at,
        l.name AS listing_name, v.name AS vendor_name, v.email AS vendor_email
       FROM cars c
       JOIN listings l ON l.id = c.listing_id
       LEFT JOIN vendors v ON v.id = l.vendor_id
       WHERE c.id = $1`,
      [id]
    );
    if (car.rows.length === 0) {
      res.status(404).json({ error: "Car not found" });
      return;
    }
    const row = car.rows[0];

    let drivers: { id: string; name: string | null; phone: string | null; license_number: string }[] = [];
    let areas: { id: string; area_type: string; city_name?: string | null; from_city?: string | null; to_city?: string | null; base_fare_cents: number | null; price_per_km_cents: number | null; [key: string]: unknown }[] = [];
    let documents: { document_type: string; file_name: string; file_url: string }[] = [];

    try {
      const dr = await query<{ id: string; name: string | null; phone: string | null; license_number: string }>(
        "SELECT id, name, phone, license_number FROM car_drivers WHERE car_id = $1 ORDER BY created_at",
        [id]
      );
      drivers = dr.rows;
    } catch {
      // car_drivers table may not exist
    }
    try {
      const ar = await query<{
        id: string; area_type: string; city_name: string | null; from_city: string | null; to_city: string | null;
        base_fare_cents: number | null; price_per_km_cents: number | null; minimum_fare_cents: number | null;
        start_time: string | null; end_time: string | null; days_available: string | null; estimated_duration_minutes: number | null;
      }>(
        "SELECT id, area_type, city_name, from_city, to_city, base_fare_cents, price_per_km_cents, minimum_fare_cents, start_time::text, end_time::text, days_available, estimated_duration_minutes FROM car_operating_areas WHERE car_id = $1 ORDER BY created_at",
        [id]
      );
      areas = ar.rows;
    } catch {
      // car_operating_areas table may not exist
    }
    try {
      const docRows = await query<{ document_type: string; file_name: string; file_url: string }>(
        "SELECT document_type, file_name, file_url FROM verification_car_documents WHERE car_id = $1 ORDER BY created_at",
        [id]
      );
      const adminBase = process.env.ADMIN_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3003}`;
      const base = adminBase.replace(/\/$/, "");
      const docTypeLabel: Record<string, string> = {
        insurance: "Insurance",
        rc: "RC (Registration Certificate)",
        driver_license: "Driver License",
      };
      documents = docRows.rows.map((d) => {
        const filename = (d.file_url || "").split("/").filter(Boolean).pop() || d.file_url;
        const url = `${base}/api/verification/uploads/${filename}`;
        return {
          document_type: docTypeLabel[d.document_type] || d.document_type,
          file_name: d.file_name,
          file_url: url,
        };
      });
    } catch {
      // verification_car_documents may not exist
    }

    res.json({
      id: row.id,
      name: row.name,
      registrationNumber: row.registration_number,
      category: row.category,
      carType: row.car_type,
      seats: row.seats,
      listingId: row.listing_id,
      listingName: row.listing_name,
      verification_token: row.verification_token,
      verification_status: row.verification_status,
      updated_at: row.updated_at,
      ownerName: row.vendor_name || null,
      ownerEmail: row.vendor_email || null,
      drivers,
      operatingAreas: areas,
      documents,
    });
  } catch (err) {
    console.error("Verification car detail error:", err);
    res.status(500).json({ error: "Failed to fetch car" });
  }
});

/** Approve a car (also set status to active) */
router.post("/car/:id/approve", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query("UPDATE cars SET verification_status = 'approved', verified_at = now(), status = 'active' WHERE id = $1", [id]);
    res.json({ message: "Approved", verification_status: "approved" });
  } catch (err) {
    console.error("Verification car approve error:", err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

/** Reject a car */
router.post("/car/:id/reject", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query("UPDATE cars SET verification_status = 'rejected' WHERE id = $1", [id]);
    res.json({ message: "Rejected", verification_status: "rejected" });
  } catch (err) {
    console.error("Verification car reject error:", err);
    res.status(500).json({ error: "Failed to reject" });
  }
});

export default router;

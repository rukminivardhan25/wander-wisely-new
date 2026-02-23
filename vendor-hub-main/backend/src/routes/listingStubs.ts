import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

/**
 * Stub routes for drivers, routes, availability so the frontend doesn't 404.
 * Return empty data; POST/PATCH/DELETE return 501 until we add real tables.
 */
async function ensureListingOwned(listingId: string, vendorId: string): Promise<boolean> {
  const r = await query<{ id: string }>(
    "select id from listings where id = $1 and vendor_id = $2",
    [listingId, vendorId]
  );
  return r.rows.length > 0;
}

function stubRouter(emptyKey: "drivers" | "routes" | "availability") {
  const router = Router();
  router.use(authMiddleware);

  router.get("/", async (req: Request, res: Response): Promise<void> => {
    try {
      const vendorId = req.vendorId!;
      const listingId = req.listingId ?? req.params.listingId;
      if (!listingId) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }
      const ok = await ensureListingOwned(listingId, vendorId);
      if (!ok) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }
    } catch {
      res.status(500).json({ error: "Failed to fetch" });
      return;
    }
    res.json({ [emptyKey]: [] });
  });

  router.all("*", (_req, res) => {
    res.status(501).json({ error: "Not implemented yet" });
  });
  return router;
}

export const driversStub = stubRouter("drivers");
export const routesStub = stubRouter("routes");
export const availabilityStub = stubRouter("availability");

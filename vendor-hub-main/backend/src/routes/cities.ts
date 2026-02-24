import { Router, Request, Response } from "express";
import { query } from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

/** GET /api/cities — predefined cities for car operating areas (vendor dropdown). */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{ id: string; name: string; lat: number; lng: number }>(
      "SELECT id, name, lat, lng FROM cities ORDER BY name"
    );
    res.json({ cities: result.rows });
  } catch {
    res.json({ cities: [] });
  }
});

export default router;

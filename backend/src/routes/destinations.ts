import { Router, Request, Response } from "express";
import { query } from "../config/db.js";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const category = _req.query.category as string | undefined;
    const search = _req.query.search as string | undefined;

    let text = "select id, name, slug, category, image_url, rating, description, created_at from destinations where 1=1";
    const params: string[] = [];
    let i = 1;

    if (category) {
      text += ` and category = $${i}`;
      params.push(category);
      i++;
    }
    if (search) {
      text += ` and to_tsvector('english', name) @@ plainto_tsquery('english', $${i})`;
      params.push(search);
      i++;
    }

    text += " order by name";

    const result = await query(text, params);
    res.json({ destinations: result.rows });
  } catch (err) {
    console.error("List destinations error:", err);
    res.status(500).json({ error: "Failed to list destinations" });
  }
});

export default router;

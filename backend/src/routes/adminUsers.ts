import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../config/db.js";

const router = Router();
const SALT_ROUNDS = 10;

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** GET /api/admin/users — List all app users (main app). Includes total booking count per user. */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query<{
      id: string;
      email: string;
      full_name: string | null;
      created_at: string;
    }>(
      `SELECT id, email, full_name, created_at::text
       FROM users
       ORDER BY created_at DESC`
    );
    const users = result.rows.map((r) => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name ?? null,
      phone: null as string | null,
      joinedAt: r.created_at,
      totalBookings: 0 as number,
    }));

    const countByUserId = new Map<string, number>();
    const tables: { table: string; userCol: string }[] = [
      { table: "transport_bookings", userCol: "user_id" },
      { table: "car_bookings", userCol: "user_id" },
      { table: "flight_bookings", userCol: "user_id" },
      { table: "hotel_bookings", userCol: "user_id" },
      { table: "experience_bookings", userCol: "user_id" },
      { table: "event_bookings", userCol: "user_id" },
    ];
    for (const { table, userCol } of tables) {
      try {
        const countResult = await query<{ user_id: string; cnt: string }>(
          `SELECT ${userCol} AS user_id, COUNT(*)::text AS cnt FROM ${table} GROUP BY ${userCol}`
        );
        for (const row of countResult.rows) {
          const n = parseInt(row.cnt, 10) || 0;
          countByUserId.set(row.user_id, (countByUserId.get(row.user_id) ?? 0) + n);
        }
      } catch (e) {
        console.error(`[admin/users] count ${table}`, e);
      }
    }

    for (const u of users) {
      u.totalBookings = countByUserId.get(u.id) ?? 0;
    }

    res.json({ users });
  } catch (e) {
    console.error("[admin/users] GET", e);
    res.status(500).json({ error: "Failed to list users" });
  }
});

/** POST /api/admin/users — Create a new app user (optional; admin may use). Uses only base columns. */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const { email, full_name, password } = parsed.data;

    const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const insert = await query<{ id: string; email: string; full_name: string | null; created_at: string }>(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, created_at::text`,
      [email, password_hash, full_name]
    );
    const row = insert.rows[0];

    res.status(201).json({
      user: {
        id: row.id,
        email: row.email,
        fullName: row.full_name ?? null,
        phone: null as string | null,
        joinedAt: row.created_at,
      },
    });
  } catch (e) {
    console.error("[admin/users] POST", e);
    res.status(500).json({ error: "Failed to create user" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../config/db.js";
import type { JwtPayload } from "../middleware/auth.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 10;

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1).optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const { email, password, full_name } = parsed.data;

    const existing = await query<{ id: string }>("select id from users where email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const insert = await query<{ id: string; email: string; full_name: string | null }>(
      "insert into users (email, password_hash, full_name) values ($1, $2, $3) returning id, email, full_name",
      [email, password_hash, full_name ?? null]
    );
    const user = insert.rows[0];

    const token = jwt.sign(
      { sub: user.id, email: user.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/signin", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = signInSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const { email, password } = parsed.data;

    const result = await query<{ id: string; email: string; full_name: string | null; password_hash: string }>(
      "select id, email, full_name, password_hash from users where email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token,
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ error: "Sign in failed" });
  }
});

export default router;

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
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
    const { name, email, phone, password } = parsed.data;

    const existing = await query<{ id: string }>("select id from vendors where email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const insert = await query<{ id: string; name: string; email: string; phone: string | null }>(
      "insert into vendors (name, email, phone, password_hash) values ($1, $2, $3, $4) returning id, name, email, phone",
      [name, email, phone ?? null, password_hash]
    );
    const vendor = insert.rows[0];

    const token = jwt.sign(
      { sub: vendor.id, email: vendor.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      vendor: { id: vendor.id, name: vendor.name, email: vendor.email, phone: vendor.phone },
      token,
    });
  } catch (err) {
    console.error("Vendor signup error:", err);
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

    const result = await query<{ id: string; name: string; email: string; phone: string | null; password_hash: string }>(
      "select id, name, email, phone, password_hash from vendors where email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const vendor = result.rows[0];

    const valid = await bcrypt.compare(password, vendor.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      { sub: vendor.id, email: vendor.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      vendor: { id: vendor.id, name: vendor.name, email: vendor.email, phone: vendor.phone },
      token,
    });
  } catch (err) {
    console.error("Vendor signin error:", err);
    res.status(500).json({ error: "Sign in failed" });
  }
});

export default router;

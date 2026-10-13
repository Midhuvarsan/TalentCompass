import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";
import { signToken } from "../middleware/auth";
import { Role } from "../types";
import { mapUserRow, toPublicUser } from "../utils/mappers";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: Role;
    };

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password, and role are required" });
    }
    if (role !== "recruiter" && role !== "seeker") {
      return res.status(400).json({ message: "role must be 'recruiter' or 'seeker'" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE lower(email) = lower($1)", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name, email, passwordHash, role]
    );
    const user = mapUserRow(result.rows[0]);

    const token = signToken({ id: user.id, role: user.role, email: user.email, name: user.name });
    res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const result = await pool.query("SELECT * FROM users WHERE lower(email) = lower($1)", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = mapUserRow(result.rows[0]);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email, name: user.name });
    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Login failed" });
  }
});

export default router;

import { Router, Response } from "express";
import { pool } from "../db/pool";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { mapUserRow, toPublicUser } from "../utils/mappers";

const router = Router();

// Get the current user's full profile
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.user!.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(toPublicUser(mapUserRow(result.rows[0])));
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch profile" });
  }
});

// Update the current user's profile. Fields are shared across roles, but
// skills/headline/yearsExperience are seeker-specific and companyName/
// companyWebsite are recruiter-specific; the client only shows the
// relevant fields per role, and we accept whatever is sent.
router.put("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      phone,
      location,
      bio,
      avatarColor,
      skills,
      headline,
      yearsExperience,
      companyName,
      companyWebsite,
    } = req.body as {
      name?: string;
      phone?: string | null;
      location?: string | null;
      bio?: string | null;
      avatarColor?: string;
      skills?: string[];
      headline?: string | null;
      yearsExperience?: number | null;
      companyName?: string | null;
      companyWebsite?: string | null;
    };

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    if (skills !== undefined && !Array.isArray(skills)) {
      return res.status(400).json({ message: "skills must be an array of strings" });
    }

    const existing = await pool.query("SELECT * FROM users WHERE id = $1", [req.user!.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const current = mapUserRow(existing.rows[0]);

    const result = await pool.query(
      `UPDATE users SET
        name = $1,
        phone = $2,
        location = $3,
        bio = $4,
        avatar_color = $5,
        skills = $6,
        headline = $7,
        years_experience = $8,
        company_name = $9,
        company_website = $10
       WHERE id = $11
       RETURNING *`,
      [
        name !== undefined ? name.trim() : current.name,
        phone !== undefined ? phone : current.phone,
        location !== undefined ? location : current.location,
        bio !== undefined ? bio : current.bio,
        avatarColor !== undefined ? avatarColor : current.avatarColor,
        skills !== undefined ? skills : current.skills,
        headline !== undefined ? headline : current.headline,
        yearsExperience !== undefined ? yearsExperience : current.yearsExperience,
        companyName !== undefined ? companyName : current.companyName,
        companyWebsite !== undefined ? companyWebsite : current.companyWebsite,
        req.user!.id,
      ]
    );

    res.json(toPublicUser(mapUserRow(result.rows[0])));
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to update profile" });
  }
});

export default router;

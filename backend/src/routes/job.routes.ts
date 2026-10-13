import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";
import { AuthRequest, requireAuth, requireRole } from "../middleware/auth";
import { mapJobRow } from "../utils/mappers";

const router = Router();

// Create a job (recruiter only)
router.post("/", requireAuth, requireRole("recruiter"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, company, description, requiredSkills, minExperienceYears, location } =
      req.body as {
        title: string;
        company: string;
        description: string;
        requiredSkills: string[];
        minExperienceYears: number;
        location: string;
      };

    if (!title || !company || !description || !Array.isArray(requiredSkills)) {
      return res.status(400).json({
        message: "title, company, description, and requiredSkills[] are required",
      });
    }

    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO jobs
        (id, recruiter_id, title, company, description, required_skills, min_experience_years, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        req.user!.id,
        title,
        company,
        description,
        requiredSkills,
        minExperienceYears || 0,
        location || "Remote",
      ]
    );

    res.status(201).json(mapJobRow(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to create job" });
  }
});

// List jobs: recruiters see only their own postings, seekers see all jobs
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let result;
    if (req.user!.role === "recruiter") {
      result = await pool.query(
        "SELECT * FROM jobs WHERE recruiter_id = $1 ORDER BY created_at DESC",
        [req.user!.id]
      );
    } else {
      result = await pool.query("SELECT * FROM jobs ORDER BY created_at DESC");
    }
    res.json(result.rows.map(mapJobRow));
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch jobs" });
  }
});

// Get single job
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Job not found" });
    res.json(mapJobRow(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch job" });
  }
});

// Delete job (recruiter, own job only) - applications cascade via FK
router.delete(
  "/:id",
  requireAuth,
  requireRole("recruiter"),
  async (req: AuthRequest, res: Response) => {
    try {
      const existing = await pool.query("SELECT * FROM jobs WHERE id = $1", [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ message: "Job not found" });
      const job = mapJobRow(existing.rows[0]);
      if (job.recruiterId !== req.user!.id) {
        return res.status(403).json({ message: "You do not own this job" });
      }

      await pool.query("DELETE FROM jobs WHERE id = $1", [req.params.id]);
      res.json({ message: "Job deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to delete job" });
    }
  }
);

export default router;

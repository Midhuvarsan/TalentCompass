import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";
import { AuthRequest, requireAuth, requireRole } from "../middleware/auth";
import { ApplicationStatus } from "../types";
import { extractResumeText } from "../utils/extractText";
import { computeRiskScore } from "../utils/riskScore";
import { mapApplicationRow, mapJobRow } from "../utils/mappers";
import { createNotification } from "../utils/notify";

const router = Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only .pdf and .txt resumes are supported in this demo"));
  },
});

// Seeker applies to a job with resume upload -> AI risk score computed automatically
router.post(
  "/",
  requireAuth,
  requireRole("seeker"),
  upload.single("resume"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { jobId } = req.body as { jobId: string };
      if (!jobId) return res.status(400).json({ message: "jobId is required" });
      if (!req.file) return res.status(400).json({ message: "resume file is required" });

      const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [jobId]);
      if (jobResult.rows.length === 0) return res.status(404).json({ message: "Job not found" });
      const job = mapJobRow(jobResult.rows[0]);

      const dup = await pool.query(
        "SELECT id FROM applications WHERE job_id = $1 AND seeker_id = $2",
        [jobId, req.user!.id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ message: "You already applied to this job" });
      }

      const resumeText = await extractResumeText(req.file.path);
      const risk = computeRiskScore(resumeText, job.requiredSkills, job.minExperienceYears);

      const id = uuidv4();
      const result = await pool.query(
        `INSERT INTO applications
          (id, job_id, seeker_id, resume_file_name, resume_original_name,
           matched_skills, missing_skills, extracted_experience_years,
           risk_score, match_score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
         RETURNING *`,
        [
          id,
          jobId,
          req.user!.id,
          req.file.filename,
          req.file.originalname,
          risk.matchedSkills,
          risk.missingSkills,
          risk.extractedExperienceYears,
          risk.riskScore,
          risk.matchScore,
        ]
      );

      const application = mapApplicationRow(result.rows[0]);

      await createNotification(
        job.recruiterId,
        "new_application",
        "New applicant",
        `${req.user!.name} applied to "${job.title}" (AI risk score: ${application.riskScore}).`,
        `/recruiter/candidates?jobId=${job.id}`
      );

      res.status(201).json(application);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to process application" });
    }
  }
);

// Seeker: view own applications (with own risk scores + job details)
router.get("/mine", requireAuth, requireRole("seeker"), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              row_to_json(j.*) AS job_row
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.seeker_id = $1
       ORDER BY a.applied_at DESC`,
      [req.user!.id]
    );

    const enriched = result.rows.map((row) => ({
      ...mapApplicationRow(row),
      job: mapJobRow(row.job_row),
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch applications" });
  }
});

// Recruiter: ranked candidates across ALL of their jobs (the Candidate
// Ranking Dashboard). Supports filtering by job, status, and a text search
// across candidate name/email, plus a choice of sort order.
router.get(
  "/candidates",
  requireAuth,
  requireRole("recruiter"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { jobId, status, search, sort } = req.query as {
        jobId?: string;
        status?: string;
        search?: string;
        sort?: string;
      };

      const conditions: string[] = ["j.recruiter_id = $1"];
      const params: any[] = [req.user!.id];

      if (jobId) {
        params.push(jobId);
        conditions.push(`a.job_id = $${params.length}`);
      }
      if (status && ["pending", "accepted", "rejected"].includes(status)) {
        params.push(status);
        conditions.push(`a.status = $${params.length}`);
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        conditions.push(`(lower(u.name) LIKE $${params.length} OR lower(u.email) LIKE $${params.length})`);
      }

      let orderBy = "a.risk_score ASC, a.match_score DESC";
      if (sort === "risk_desc") orderBy = "a.risk_score DESC, a.match_score ASC";
      else if (sort === "match_desc") orderBy = "a.match_score DESC, a.risk_score ASC";
      else if (sort === "match_asc") orderBy = "a.match_score ASC, a.risk_score DESC";
      else if (sort === "newest") orderBy = "a.applied_at DESC";
      else if (sort === "oldest") orderBy = "a.applied_at ASC";

      const result = await pool.query(
        `SELECT a.*,
                u.id AS seeker_user_id, u.name AS seeker_name, u.email AS seeker_email,
                u.headline AS seeker_headline, u.years_experience AS seeker_years_experience,
                row_to_json(j.*) AS job_row
         FROM applications a
         JOIN users u ON u.id = a.seeker_id
         JOIN jobs j ON j.id = a.job_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY ${orderBy}`,
        params
      );

      const enriched = result.rows.map((row) => ({
        ...mapApplicationRow(row),
        job: mapJobRow(row.job_row),
        seeker: {
          id: row.seeker_user_id,
          name: row.seeker_name,
          email: row.seeker_email,
          headline: row.seeker_headline,
          yearsExperience:
            row.seeker_years_experience === null || row.seeker_years_experience === undefined
              ? null
              : Number(row.seeker_years_experience),
        },
      }));

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch candidates" });
    }
  }
);

// Recruiter: view all applicants for a specific job, sorted by lowest risk first
router.get(
  "/job/:jobId",
  requireAuth,
  requireRole("recruiter"),
  async (req: AuthRequest, res: Response) => {
    try {
      const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [req.params.jobId]);
      if (jobResult.rows.length === 0) return res.status(404).json({ message: "Job not found" });
      const job = mapJobRow(jobResult.rows[0]);
      if (job.recruiterId !== req.user!.id) {
        return res.status(403).json({ message: "You do not own this job" });
      }

      const result = await pool.query(
        `SELECT a.*,
                u.id AS seeker_user_id, u.name AS seeker_name, u.email AS seeker_email
         FROM applications a
         JOIN users u ON u.id = a.seeker_id
         WHERE a.job_id = $1
         ORDER BY a.risk_score ASC`,
        [req.params.jobId]
      );

      const enriched = result.rows.map((row) => ({
        ...mapApplicationRow(row),
        seeker: { id: row.seeker_user_id, name: row.seeker_name, email: row.seeker_email },
      }));

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch applicants" });
    }
  }
);

// Recruiter: accept/reject/reset an application
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("recruiter"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body as { status: ApplicationStatus };
      if (!["accepted", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ message: "status must be accepted, rejected, or pending" });
      }

      const appResult = await pool.query("SELECT * FROM applications WHERE id = $1", [
        req.params.id,
      ]);
      if (appResult.rows.length === 0) {
        return res.status(404).json({ message: "Application not found" });
      }
      const application = mapApplicationRow(appResult.rows[0]);

      const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [application.jobId]);
      const job = jobResult.rows.length > 0 ? mapJobRow(jobResult.rows[0]) : null;
      if (!job || job.recruiterId !== req.user!.id) {
        return res.status(403).json({ message: "You do not own the job for this application" });
      }

      const updateResult = await pool.query(
        "UPDATE applications SET status = $1 WHERE id = $2 RETURNING *",
        [status, req.params.id]
      );
      const updated = mapApplicationRow(updateResult.rows[0]);

      if (status !== "pending" && status !== application.status) {
        const verb = status === "accepted" ? "accepted" : "rejected";
        await createNotification(
          application.seekerId,
          "application_status",
          `Application ${verb}`,
          `Your application for "${job.title}" at ${job.company} was ${verb}.`,
          `/seeker`
        );
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to update status" });
    }
  }
);

// Download / view resume file (recruiter of the job, or the seeker who owns it)
router.get("/resume/:filename", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const appResult = await pool.query("SELECT * FROM applications WHERE resume_file_name = $1", [
      req.params.filename,
    ]);
    if (appResult.rows.length === 0) return res.status(404).json({ message: "Resume not found" });
    const application = mapApplicationRow(appResult.rows[0]);

    const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [application.jobId]);
    const job = jobResult.rows.length > 0 ? mapJobRow(jobResult.rows[0]) : null;

    const isOwnerSeeker = req.user!.id === application.seekerId;
    const isOwnerRecruiter = job && job.recruiterId === req.user!.id;
    if (!isOwnerSeeker && !isOwnerRecruiter) {
      return res.status(403).json({ message: "Not authorized to view this resume" });
    }

    const filePath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Resume file is missing on the server" });
    }

    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: "Failed to send resume file" });
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch resume" });
  }
});

export default router;

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { jobController } from "../controllers/job.controller";

const router = Router();

// Create a job (recruiter only)
router.post("/", requireAuth, requireRole("recruiter"), jobController.create);

// List jobs: recruiters see own postings, seekers see all jobs
router.get("/", requireAuth, jobController.list);

// Get single job
router.get("/:id", requireAuth, jobController.getById);

// Delete job (recruiter, own job only)
router.delete("/:id", requireAuth, requireRole("recruiter"), jobController.delete);

export default router;

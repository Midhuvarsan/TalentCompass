import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { resumeUpload } from "../middleware/upload";
import { applicationController } from "../controllers/application.controller";

const router = Router();

// Seeker applies to a job with resume upload -> AI risk score computed automatically
router.post(
  "/",
  requireAuth,
  requireRole("seeker"),
  resumeUpload.single("resume"),
  applicationController.apply
);

// Seeker: view own applications (with own risk scores + job details)
router.get(
  "/mine",
  requireAuth,
  requireRole("seeker"),
  applicationController.listMine
);

// Recruiter: ranked candidates across ALL of their jobs
router.get(
  "/candidates",
  requireAuth,
  requireRole("recruiter"),
  applicationController.listCandidates
);

// Recruiter: view all applicants for a specific job, sorted by lowest risk first
router.get(
  "/job/:jobId",
  requireAuth,
  requireRole("recruiter"),
  applicationController.listByJob
);

// Recruiter: accept/reject/reset an application
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("recruiter"),
  applicationController.updateStatus
);

// Download / view resume file (recruiter of the job, or the seeker who owns it)
router.get("/resume/:filename", requireAuth, applicationController.getResume);

export default router;

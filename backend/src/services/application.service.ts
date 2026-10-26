import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  applicationRepository,
  ApplicationRepository,
} from "../repositories/application.repository";
import { jobRepository, JobRepository } from "../repositories/job.repository";
import { notificationService, NotificationService } from "./notification.service";
import { extractResumeText } from "../utils/extractText";
import { computeRiskScore } from "../utils/riskScore";
import { ApplicationStatus } from "../types";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";

export class ApplicationService {
  constructor(
    private appRepo: ApplicationRepository = applicationRepository,
    private jobRepo: JobRepository = jobRepository,
    private notifService: NotificationService = notificationService
  ) {}

  async apply(
    seekerId: string,
    seekerName: string,
    jobId?: string,
    file?: Express.Multer.File
  ) {
    if (!jobId) {
      throw new BadRequestError("jobId is required");
    }
    if (!file) {
      throw new BadRequestError("resume file is required");
    }

    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }

    const dup = await this.appRepo.findByJobAndSeeker(jobId, seekerId);
    if (dup) {
      throw new ConflictError("You already applied to this job");
    }

    const resumeText = await extractResumeText(file.path);
    const risk = await computeRiskScore(
      resumeText,
      job.requiredSkills,
      job.minExperienceYears
    );

    const id = uuidv4();
    const application = await this.appRepo.create({
      id,
      jobId,
      seekerId,
      resumeFileName: file.filename,
      resumeOriginalName: file.originalname,
      matchedSkills: risk.matchedSkills,
      missingSkills: risk.missingSkills,
      extractedExperienceYears: risk.extractedExperienceYears,
      riskScore: risk.riskScore,
      matchScore: risk.matchScore,
    });

    await this.notifService.notify(
      job.recruiterId,
      "new_application",
      "New applicant",
      `${seekerName} applied to "${job.title}" (AI risk score: ${application.riskScore}).`,
      `/recruiter/candidates?jobId=${job.id}`
    );

    return application;
  }

  async getMyApplications(seekerId: string) {
    return this.appRepo.findBySeekerId(seekerId);
  }

  async getCandidates(
    recruiterId: string,
    filters: { jobId?: string; status?: string; search?: string; sort?: string }
  ) {
    return this.appRepo.findCandidates(recruiterId, filters);
  }

  async getJobApplicants(jobId: string, recruiterId: string) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenError("You do not own this job");
    }

    return this.appRepo.findByJobId(jobId);
  }

  async updateStatus(
    applicationId: string,
    recruiterId: string,
    status?: ApplicationStatus
  ) {
    if (!status || !["accepted", "rejected", "pending"].includes(status)) {
      throw new BadRequestError("status must be accepted, rejected, or pending");
    }

    const application = await this.appRepo.findById(applicationId);
    if (!application) {
      throw new NotFoundError("Application not found");
    }

    const job = await this.jobRepo.findById(application.jobId);
    if (!job || job.recruiterId !== recruiterId) {
      throw new ForbiddenError("You do not own the job for this application");
    }

    const updated = await this.appRepo.updateStatus(applicationId, status);
    if (!updated) {
      throw new NotFoundError("Application not found");
    }

    if (status !== "pending" && status !== application.status) {
      const verb = status === "accepted" ? "accepted" : "rejected";
      await this.notifService.notify(
        application.seekerId,
        "application_status",
        `Application ${verb}`,
        `Your application for "${job.title}" at ${job.company} was ${verb}.`,
        `/seeker`
      );
    }

    return updated;
  }

  async getResumeFilePath(filename: string, userId: string): Promise<string> {
    const application = await this.appRepo.findByResumeFileName(filename);
    if (!application) {
      throw new NotFoundError("Resume not found");
    }

    const job = await this.jobRepo.findById(application.jobId);
    const isOwnerSeeker = userId === application.seekerId;
    const isOwnerRecruiter = job && job.recruiterId === userId;

    if (!isOwnerSeeker && !isOwnerRecruiter) {
      throw new ForbiddenError("Not authorized to view this resume");
    }

    const uploadDir = path.join(__dirname, "..", "..", "uploads");
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError("Resume file is missing on the server");
    }

    return filePath;
  }
}

export const applicationService = new ApplicationService();

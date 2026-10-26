import { v4 as uuidv4 } from "uuid";
import { jobRepository, JobRepository } from "../repositories/job.repository";
import { AuthPayload } from "../middleware/auth";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";

export class JobService {
  constructor(private jobRepo: JobRepository = jobRepository) {}

  async createJob(
    recruiterId: string,
    data: {
      title?: string;
      company?: string;
      description?: string;
      requiredSkills?: string[];
      minExperienceYears?: number;
      location?: string;
    }
  ) {
    const { title, company, description, requiredSkills, minExperienceYears, location } =
      data;

    if (!title || !company || !description || !Array.isArray(requiredSkills)) {
      throw new BadRequestError(
        "title, company, description, and requiredSkills[] are required"
      );
    }

    const id = uuidv4();
    return this.jobRepo.create({
      id,
      recruiterId,
      title,
      company,
      description,
      requiredSkills,
      minExperienceYears: minExperienceYears || 0,
      location: location || "Remote",
    });
  }

  async getJobs(user: AuthPayload) {
    if (user.role === "recruiter") {
      return this.jobRepo.findByRecruiterId(user.id);
    }
    return this.jobRepo.findAll();
  }

  async getJobById(id: string) {
    const job = await this.jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError("Job not found");
    }
    return job;
  }

  async deleteJob(jobId: string, recruiterId: string) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenError("You do not own this job");
    }

    await this.jobRepo.delete(jobId);
    return { message: "Job deleted" };
  }
}

export const jobService = new JobService();

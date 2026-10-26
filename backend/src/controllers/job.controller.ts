import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { jobService, JobService } from "../services/job.service";

export class JobController {
  constructor(private service: JobService = jobService) {}

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const job = await this.service.createJob(req.user!.id, req.body);
      res.status(201).json(job);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const jobs = await this.service.getJobs(req.user!);
      res.json(jobs);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const job = await this.service.getJobById(req.params.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.deleteJob(req.params.id, req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const jobController = new JobController();

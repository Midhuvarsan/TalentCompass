import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  applicationService,
  ApplicationService,
} from "../services/application.service";

export class ApplicationController {
  constructor(private service: ApplicationService = applicationService) {}

  apply = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const application = await this.service.apply(
        req.user!.id,
        req.user!.name,
        req.body?.jobId,
        req.file
      );
      res.status(201).json(application);
    } catch (err) {
      next(err);
    }
  };

  listMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const applications = await this.service.getMyApplications(req.user!.id);
      res.json(applications);
    } catch (err) {
      next(err);
    }
  };

  listCandidates = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { jobId, status, search, sort } = req.query as {
        jobId?: string;
        status?: string;
        search?: string;
        sort?: string;
      };
      const candidates = await this.service.getCandidates(req.user!.id, {
        jobId,
        status,
        search,
        sort,
      });
      res.json(candidates);
    } catch (err) {
      next(err);
    }
  };

  listByJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const applicants = await this.service.getJobApplicants(
        req.params.jobId,
        req.user!.id
      );
      res.json(applicants);
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const updated = await this.service.updateStatus(
        req.params.id,
        req.user!.id,
        req.body?.status
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  getResume = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filePath = await this.service.getResumeFilePath(
        req.params.filename,
        req.user!.id
      );
      res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) {
          next(err);
        }
      });
    } catch (err) {
      next(err);
    }
  };
}

export const applicationController = new ApplicationController();

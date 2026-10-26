import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { userService, UserService } from "../services/user.service";

export class UserController {
  constructor(private service: UserService = userService) {}

  getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.getProfile(req.user!.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };

  updateMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const updated = await this.service.updateProfile(req.user!.id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };
}

export const userController = new UserController();

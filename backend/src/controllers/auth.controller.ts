import { Request, Response, NextFunction } from "express";
import { authService, AuthService } from "../services/auth.service";

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.login(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();

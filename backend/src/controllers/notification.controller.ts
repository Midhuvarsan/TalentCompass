import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  notificationService,
  NotificationService,
} from "../services/notification.service";

export class NotificationController {
  constructor(private service: NotificationService = notificationService) {}

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const notifications = await this.service.getNotifications(req.user!.id);
      res.json(notifications);
    } catch (err) {
      next(err);
    }
  };

  unreadCount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.service.getUnreadCount(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const updated = await this.service.markAsRead(req.params.id, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  markAllRead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.service.markAllAsRead(req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.deleteNotification(
        req.params.id,
        req.user!.id
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const notificationController = new NotificationController();

import { v4 as uuidv4 } from "uuid";
import {
  notificationRepository,
  NotificationRepository,
} from "../repositories/notification.repository";
import { NotificationType } from "../types";
import { NotFoundError } from "../utils/errors";

export class NotificationService {
  constructor(private notifRepo: NotificationRepository = notificationRepository) {}

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string | null
  ): Promise<void> {
    try {
      await this.notifRepo.create({
        id: uuidv4(),
        userId,
        type,
        title,
        message,
        link: link ?? null,
      });
    } catch (err) {
      console.error("Failed to create notification:", err);
    }
  }

  async getNotifications(userId: string) {
    return this.notifRepo.findByUserId(userId, 50);
  }

  async getUnreadCount(userId: string) {
    const count = await this.notifRepo.countUnread(userId);
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const updated = await this.notifRepo.markAsRead(id, userId);
    if (!updated) {
      throw new NotFoundError("Notification not found");
    }
    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.notifRepo.markAllAsRead(userId);
    return { message: "All notifications marked as read" };
  }

  async deleteNotification(id: string, userId: string) {
    const deleted = await this.notifRepo.delete(id, userId);
    if (!deleted) {
      throw new NotFoundError("Notification not found");
    }
    return { message: "Notification deleted" };
  }
}

export const notificationService = new NotificationService();

import { notificationService } from "../services/notification.service";
import { NotificationType } from "../types";

/**
 * Creates an in-app notification for a user.
 * Delegates to NotificationService.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string | null
): Promise<void> {
  return notificationService.notify(userId, type, title, message, link);
}

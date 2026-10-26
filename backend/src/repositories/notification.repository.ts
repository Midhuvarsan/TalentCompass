import { pool } from "../db/pool";
import { Notification, NotificationType } from "../types";
import { mapNotificationRow } from "../utils/mappers";

export class NotificationRepository {
  async create(data: {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.id, data.userId, data.type, data.title, data.message, data.link ?? null]
    );
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Notification[]> {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
      [userId, limit]
    );
    return result.rows.map(mapNotificationRow);
  }

  async countUnread(userId: string): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false",
      [userId]
    );
    return result.rows[0]?.count || 0;
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const result = await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );
    if (result.rows.length === 0) return null;
    return mapNotificationRow(result.rows[0]);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [userId]
    );
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const notificationRepository = new NotificationRepository();

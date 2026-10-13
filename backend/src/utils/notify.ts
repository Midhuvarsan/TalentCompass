import { v4 as uuidv4 } from "uuid";
import { pool } from "../db/pool";
import { NotificationType } from "../types";

/**
 * Creates an in-app notification for a user. Failures are logged but never
 * thrown, so a notification issue can't break the primary action (applying
 * to a job, changing a status, etc.).
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string | null
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), userId, type, title, message, link ?? null]
    );
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

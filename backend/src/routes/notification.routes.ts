import { Router, Response } from "express";
import { pool } from "../db/pool";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { mapNotificationRow } from "../utils/mappers";

const router = Router();

// List current user's notifications, newest first
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.user!.id]
    );
    res.json(result.rows.map(mapNotificationRow));
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch notifications" });
  }
});

// Unread count, for a lightweight badge poll
router.get("/unread-count", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false",
      [req.user!.id]
    );
    res.json({ count: result.rows[0]?.count || 0 });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch unread count" });
  }
});

// Mark a single notification as read
router.patch("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(mapNotificationRow(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to update notification" });
  }
});

// Mark all of the current user's notifications as read
router.patch("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false", [
      req.user!.id,
    ]);
    res.json({ message: "All notifications marked as read" });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to update notifications" });
  }
});

// Delete a single notification
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification deleted" });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to delete notification" });
  }
});

export default router;

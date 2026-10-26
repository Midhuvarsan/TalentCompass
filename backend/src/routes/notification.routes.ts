import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { notificationController } from "../controllers/notification.controller";

const router = Router();

// List current user's notifications, newest first
router.get("/", requireAuth, notificationController.list);

// Unread count, for a lightweight badge poll
router.get("/unread-count", requireAuth, notificationController.unreadCount);

// Mark a single notification as read
router.patch("/:id/read", requireAuth, notificationController.markRead);

// Mark all of the current user's notifications as read
router.patch("/read-all", requireAuth, notificationController.markAllRead);

// Delete a single notification
router.delete("/:id", requireAuth, notificationController.delete);

export default router;

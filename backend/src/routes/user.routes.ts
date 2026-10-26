import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { userController } from "../controllers/user.controller";

const router = Router();

// Get the current user's full profile
router.get("/me", requireAuth, userController.getMe);

// Update the current user's profile
router.put("/me", requireAuth, userController.updateMe);

export default router;

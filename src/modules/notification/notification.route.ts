import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";

import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import { notificationController } from "./notification.controller.js";
import { NotificationValidation } from "./notification.validation.js";

const router = Router();

// ======================================================
// GET MY NOTIFICATIONS
// ======================================================

router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.OPERATOR, UserRole.CUSTOMER),
  validateRequest(NotificationValidation.notificationQuerySchema),
  notificationController.getMyNotifications,
);

// ======================================================
// MARK ALL AS READ
// IMPORTANT: This must come before /:id/read
// ======================================================

router.patch(
  "/read-all",
  auth(UserRole.ADMIN, UserRole.OPERATOR, UserRole.CUSTOMER),
  notificationController.markAllAsRead,
);

// ======================================================
// MARK SINGLE NOTIFICATION AS READ
// ======================================================

router.patch(
  "/:id/read",
  auth(UserRole.ADMIN, UserRole.OPERATOR, UserRole.CUSTOMER),
  notificationController.markAsRead,
);

export const notificationRouter = router;

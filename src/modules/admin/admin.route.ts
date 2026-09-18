import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import { adminController } from "./admin.controller.js";
import { AdminValidation } from "./admin.validation.js";

const router = Router();

// ========================================
// OPERATOR APPLICATION MANAGEMENT
// ========================================

router.get(
  "/operator-applications",
  auth(UserRole.ADMIN),
  validateRequest(AdminValidation.operatorApplicationQuerySchema),
  adminController.getAllOperatorApplications,
);

router.get(
  "/operator-applications/:id",
  auth(UserRole.ADMIN),
  adminController.getOperatorApplicationById,
);

router.patch(
  "/operator-applications/:id/approve",
  auth(UserRole.ADMIN),
  validateRequest(AdminValidation.approveOperatorApplicationSchema),
  adminController.approveOperatorApplication,
);

router.patch(
  "/operator-applications/:id/reject",
  auth(UserRole.ADMIN),
  validateRequest(AdminValidation.rejectOperatorApplicationSchema),
  adminController.rejectOperatorApplication,
);

// ========================================
// OPERATOR MANAGEMENT
// ========================================

router.get("/operators", auth(UserRole.ADMIN), adminController.getAllOperators);

router.get(
  "/operators/:id",
  auth(UserRole.ADMIN),
  adminController.getOperatorById,
);

// ========================================
// USER MANAGEMENT
// ========================================

router.get(
  "/users",
  auth(UserRole.ADMIN),
  validateRequest(AdminValidation.userQuerySchema),
  adminController.getAllUsers,
);

router.get("/users/:id", auth(UserRole.ADMIN), adminController.getUserById);

router.patch(
  "/users/:id/status",
  auth(UserRole.ADMIN),
  validateRequest(AdminValidation.updateUserStatusSchema),
  adminController.updateUserStatus,
);

// ==================== ADMIN DASHBOARD ====================

router.get(
  "/dashboard",
  auth(UserRole.ADMIN),
  adminController.getAdminDashboard,
);

export const adminRouter = router;

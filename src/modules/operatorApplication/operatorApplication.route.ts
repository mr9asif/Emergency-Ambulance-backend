import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest.js";

import { operatorApplicationController } from "./operatorApplication.controller.js";

import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { OperatorApplicationValidation } from "./operatorApplication.validation.js";

const router = Router();

// Submit operator application
router.post(
  "/",
  validateRequest(
    OperatorApplicationValidation.createOperatorApplicationSchema,
  ),
  operatorApplicationController.createOperatorApplication,
);

// Verify application email with OTP
router.post(
  "/verify-email",
  validateRequest(
    OperatorApplicationValidation.verifyOperatorApplicationEmailSchema,
  ),
  operatorApplicationController.verifyOperatorApplicationEmail,
);

// =========================
// ADMIN ROUTES
// =========================

router.patch(
  "/:id/approve",
  auth(UserRole.ADMIN),
  validateRequest(
    OperatorApplicationValidation.approveOperatorApplicationSchema,
  ),
  operatorApplicationController.approveOperatorApplication,
);

router.patch(
  "/:id/reject",
  auth(UserRole.ADMIN),
  validateRequest(
    OperatorApplicationValidation.rejectOperatorApplicationSchema,
  ),
  operatorApplicationController.rejectOperatorApplication,
);

export const operatorApplicationRouter = router;

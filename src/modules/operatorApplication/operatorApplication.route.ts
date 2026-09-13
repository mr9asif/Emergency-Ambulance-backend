import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest.js";

import { operatorApplicationController } from "./operatorApplication.controller.js";

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

export const operatorApplicationRouter = router;

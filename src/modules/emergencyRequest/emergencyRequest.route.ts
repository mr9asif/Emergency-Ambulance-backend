import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";

import { auth } from "../../middleware/checkAuth.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import { emergencyRequestController } from "./emergencyRequest.controller.js";

import { createEmergencyRequestSchema } from "./emergencyRequest.validation.js";

const router = Router();

router.post(
  "/",

  auth(UserRole.CUSTOMER),

  validateRequest(createEmergencyRequestSchema),

  emergencyRequestController.createEmergencyRequest,
);

router.get(
  "/pending",
  auth(UserRole.OPERATOR),
  emergencyRequestController.getPendingEmergencyRequests,
);

router.get(
  "/available-drivers",
  auth(UserRole.OPERATOR),
  emergencyRequestController.getAvailableDrivers,
);

router.get(
  "/available-ambulances",
  auth(UserRole.OPERATOR),
  emergencyRequestController.getAvailableAmbulances,
);
export const emergencyRequestRouter = router;

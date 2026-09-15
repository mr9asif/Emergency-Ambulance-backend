import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";

import { auth } from "../../middleware/checkAuth.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import { emergencyRequestController } from "./emergencyRequest.controller.js";

import {
  assignEmergencyRequestSchema,
  createEmergencyRequestSchema,
} from "./emergencyRequest.validation.js";

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

router.get(
  "/:emergencyRequestId/nearby-hospitals",
  auth(UserRole.OPERATOR),
  emergencyRequestController.getNearbyHospitals,
);

router.post(
  "/:emergencyRequestId/assign",
  auth(UserRole.OPERATOR),
  validateRequest(assignEmergencyRequestSchema),
  emergencyRequestController.assignEmergencyRequest,
);

export const emergencyRequestRouter = router;

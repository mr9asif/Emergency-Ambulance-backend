// src/modules/ambulance/ambulance.route.ts

import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import { ambulanceController } from "./ambulance.controller.js";
import { AmbulanceValidation } from "./ambulance.validation.js";

const router = Router();

router.post(
  "/",
  auth(UserRole.ADMIN),
  validateRequest(AmbulanceValidation.createAmbulanceSchema),
  ambulanceController.createAmbulance,
);

router.get("/", auth(UserRole.ADMIN), ambulanceController.getAllAmbulances);

router.get("/:id", auth(UserRole.ADMIN), ambulanceController.getAmbulanceById);

router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validateRequest(AmbulanceValidation.updateAmbulanceSchema),
  ambulanceController.updateAmbulance,
);

router.delete(
  "/:id",
  auth(UserRole.ADMIN),
  ambulanceController.deleteAmbulance,
);

export const ambulanceRouter = router;

import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import { hospitalController } from "./hospital.controller.js";
import { HospitalValidation } from "./hospital.validation.js";

const router = Router();

router.post(
  "/",
  auth(UserRole.ADMIN),
  validateRequest(HospitalValidation.createHospitalSchema),
  hospitalController.createHospital,
);

router.get("/", auth(UserRole.ADMIN), hospitalController.getAllHospitals);

router.get("/:id", auth(UserRole.ADMIN), hospitalController.getHospitalById);

router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validateRequest(HospitalValidation.updateHospitalSchema),
  hospitalController.updateHospital,
);

router.delete("/:id", auth(UserRole.ADMIN), hospitalController.deleteHospital);

export const hospitalRouter = router;

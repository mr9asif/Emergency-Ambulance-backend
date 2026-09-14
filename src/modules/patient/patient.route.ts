import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { patientController } from "./patient.controller.js";
import {
  createPatientSchema,
  updatePatientSchema,
} from "./patient.validation.js";

const router = Router();

router.post(
  "/",
  auth(UserRole.CUSTOMER),

  validateRequest(createPatientSchema),
  patientController.createPatient,
);

router.get(
  "/",
  auth(UserRole.CUSTOMER),

  patientController.getMyPatients,
);

router.get(
  "/:patientId",
  auth(UserRole.CUSTOMER),
  patientController.getMyPatientById,
);

router.patch(
  "/:patientId",
  auth(UserRole.CUSTOMER),
  validateRequest(updatePatientSchema),
  patientController.updatePatient,
);

router.delete(
  "/:patientId",
  auth(UserRole.CUSTOMER),
  patientController.deletePatient,
);

export const patientRouter = router;

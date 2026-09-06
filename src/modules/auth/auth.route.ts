import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { authController } from "./auth.controller.js";
import { UserValidation } from "./auth.validation.js";

const router = Router();

router.post(
  "/register",
  validateRequest(UserValidation.registerSchema),
  authController.registerUser,
);
router.post(
  "/verify-email",
  validateRequest(UserValidation.PatientEmailVerifyZodSchema),
  authController.verifyUserEmail,
);

export const authRouter = router;

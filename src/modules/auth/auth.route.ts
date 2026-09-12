import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
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
router.post(
  "/login",
  validateRequest(UserValidation.LoginZodSchema),
  authController.loginUser,
);
router.post("/refresh-token", authController.refreshToken);
router.get(
  "/me",
  auth(UserRole.ADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.CUSTOMER),
  // validateRequest
  authController.getMe,
);

export const authRouter = router;

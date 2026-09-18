import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { upload } from "../../lib/multer.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { authController } from "./auth.controller.js";
import { authValidation } from "./auth.validation.js";

const router = Router();

router.post(
  "/register",
  validateRequest(authValidation.registerSchema),
  authController.registerUser,
);
router.post(
  "/verify-email",
  validateRequest(authValidation.PatientEmailVerifyZodSchema),
  authController.verifyUserEmail,
);
router.post(
  "/login",
  validateRequest(authValidation.LoginZodSchema),
  authController.loginUser,
);

router.post(
  "/forgot-password",
  validateRequest(authValidation.ForgotPasswordZodSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(authValidation.ResetPasswordZodSchema),
  authController.resetPassword,
);

router.post("/refresh-token", authController.refreshToken);
router.get(
  "/me",
  auth(UserRole.ADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.CUSTOMER),
  // validateRequest
  authController.getMe,
);

router.patch(
  "/profile-image",
  auth(UserRole.ADMIN, UserRole.OPERATOR, UserRole.CUSTOMER),
  upload.single("profileImage"),
  authController.uploadProfileImage,
);

router.post(
  "/set-password",
  validateRequest(authValidation.setOperatorPasswordSchema),
  authController.setOperatorPassword,
);

export const authRouter = router;

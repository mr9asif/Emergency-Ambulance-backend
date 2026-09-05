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

export const authRouter = router;

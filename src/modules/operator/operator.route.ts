import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import { operatorController } from "./operator.controller.js";
import { OperatorValidation } from "./operator.validation.js";

const router = Router();

router.post(
  "/",
  auth(UserRole.ADMIN),
  validateRequest(OperatorValidation.createOperatorSchema),
  operatorController.createOperator,
);

router.get("/", auth(UserRole.ADMIN), operatorController.getAllOperators);

router.get("/:id", auth(UserRole.ADMIN), operatorController.getOperatorById);

router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validateRequest(OperatorValidation.updateOperatorSchema),
  operatorController.updateOperator,
);

export const operatorRouter = router;

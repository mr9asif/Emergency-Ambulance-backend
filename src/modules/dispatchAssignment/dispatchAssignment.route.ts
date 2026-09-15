import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { dispatchAssignmentController } from "./dispatchAssignment.controller.js";
import { rejectDispatchAssignmentSchema } from "./dispatchAssignment.validation.js";

const router = Router();

// Dispatcher creates assignment
router.get(
  "/all-offers",
  auth(UserRole.OPERATOR),
  dispatchAssignmentController.getAllDispatchAssignments,
);

router.get(
  "/my-offers",
  auth(UserRole.OPERATOR),
  dispatchAssignmentController.getMyOffers,
);

router.patch(
  "/:assignmentId/accept",
  auth(UserRole.OPERATOR),
  dispatchAssignmentController.acceptDispatchAssignment,
);

router.patch(
  "/:assignmentId/reject",
  auth(UserRole.OPERATOR),
  validateRequest(rejectDispatchAssignmentSchema),
  dispatchAssignmentController.rejectDispatchAssignment,
);

export const dispatchAssignmentRouter = router;

import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { auth } from "../../middleware/checkAuth.js";
import { paymentController } from "./payment.controller.js";

const router = Router();

router.post(
  "/:tripId",
  auth(UserRole.CUSTOMER),
  paymentController.createPayment,
);

export const paymentRouter = router;

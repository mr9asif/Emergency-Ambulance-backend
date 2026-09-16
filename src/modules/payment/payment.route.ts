import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { auth } from "../../middleware/checkAuth.js";
import { paymentController } from "./payment.controller.js";

const router = Router();

// ==========================================
// SSLCOMMERZ CALLBACKS
// No JWT authentication
// ==========================================

router.post("/success", paymentController.paymentSuccess);

router.post("/fail", paymentController.paymentFail);

router.post("/cancel", paymentController.paymentCancel);

router.post("/ipn", paymentController.paymentIPN);

// ==========================================
// CREATE PAYMENT
// Requires CUSTOMER authentication
// ==========================================
router.get(
  "/history",
  auth(UserRole.CUSTOMER),
  paymentController.getCustomerPaymentHistory,
);

router.post(
  "/:tripId",
  auth(UserRole.CUSTOMER),
  paymentController.createPayment,
);

export const paymentRouter = router;

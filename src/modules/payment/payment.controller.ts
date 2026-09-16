import { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { paymentService } from "./payment.services.js";

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user?.userId;

  const result = await paymentService.createPayment(customerId as string, {
    tripId: req.params.tripId as string,
    customerId: customerId as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment initiated successfully",
    data: result,
  });
});

export const paymentController = {
  createPayment,
};

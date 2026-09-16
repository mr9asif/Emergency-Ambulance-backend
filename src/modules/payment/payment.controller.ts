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

// ==========================================
// SSLCOMMERZ SUCCESS CALLBACK
// ==========================================

const paymentSuccess = catchAsync(async (req: Request, res: Response) => {
  console.log("========== SSLCOMMERZ SUCCESS CALLBACK ==========");
  console.log("BODY:", req.body);

  const result = await paymentService.handlePaymentSuccess(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment verified successfully",
    data: result,
  });
});

// ==========================================
// SSLCOMMERZ FAIL CALLBACK
// ==========================================

const paymentFail = catchAsync(async (req: Request, res: Response) => {
  console.log("========== SSLCOMMERZ FAIL CALLBACK ==========");
  console.log("BODY:", req.body);

  const result = await paymentService.handlePaymentFail(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment failure processed",
    data: result,
  });
});

// ==========================================
// SSLCOMMERZ CANCEL CALLBACK
// ==========================================

const paymentCancel = catchAsync(async (req: Request, res: Response) => {
  console.log("========== SSLCOMMERZ CANCEL CALLBACK ==========");
  console.log("BODY:", req.body);

  const result = await paymentService.handlePaymentCancel(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment cancellation processed",
    data: result,
  });
});

// ==========================================
// SSLCOMMERZ IPN
// ==========================================

const paymentIPN = catchAsync(async (req: Request, res: Response) => {
  console.log("========== SSLCOMMERZ IPN CALLBACK ==========");
  console.log("BODY:", req.body);

  const result = await paymentService.handlePaymentIPN(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "IPN processed successfully",
    data: result,
  });
});

// ==========================================
// CUSTOMER PAYMENT HISTORY
// ==========================================

const getCustomerPaymentHistory = catchAsync(
  async (req: Request, res: Response) => {
    const customerId = req.user?.userId;

    const result = await paymentService.getCustomerPaymentHistory(
      customerId as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment history retrieved successfully",
      data: result,
    });
  },
);

// ==========================================
// GET SINGLE PAYMENT DETAILS
// ==========================================

const getCustomerPaymentDetails = catchAsync(
  async (req: Request, res: Response) => {
    const customerId = req.user?.userId;
    const paymentId = req.params.paymentId as string;

    const result = await paymentService.getCustomerPaymentDetails(
      customerId as string,
      paymentId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment details retrieved successfully",
      data: result,
    });
  },
);

// ==========================================
// CUSTOMER PAYMENT RECEIPT
// ==========================================

const getCustomerPaymentReceipt = catchAsync(
  async (req: Request, res: Response) => {
    const customerId = req.user?.userId;
    const paymentId = req.params.paymentId as string;

    const result = await paymentService.getCustomerPaymentReceipt(
      customerId as string,
      paymentId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment receipt retrieved successfully",
      data: result,
    });
  },
);

export const paymentController = {
  createPayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentIPN,
  getCustomerPaymentHistory,
  getCustomerPaymentDetails,
  getCustomerPaymentReceipt,
};

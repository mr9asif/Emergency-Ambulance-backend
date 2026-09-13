import type { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { operatorApplicationService } from "./operatorApplication.services.js";

const createOperatorApplication = catchAsync(
  async (req: Request, res: Response) => {
    const result = await operatorApplicationService.createOperatorApplication(
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message:
        "Operator application submitted successfully. Please verify your email.",
      data: result,
    });
  },
);

const verifyOperatorApplicationEmail = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await operatorApplicationService.verifyOperatorApplicationEmail(req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        "Email verified successfully. Your application is now under review.",
      data: result,
    });
  },
);

export const operatorApplicationController = {
  createOperatorApplication,
  verifyOperatorApplicationEmail,
};

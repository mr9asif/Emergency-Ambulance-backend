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

const approveOperatorApplication = catchAsync(
  async (req: Request, res: Response) => {
    const result = await operatorApplicationService.approveOperatorApplication(
      req.params.id as string,
      req.user!.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Operator application approved successfully",
      data: result,
    });
  },
);

const rejectOperatorApplication = catchAsync(
  async (req: Request, res: Response) => {
    const result = await operatorApplicationService.rejectOperatorApplication(
      req.params.id as string,
      req.user!.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Operator application rejected successfully",
      data: result,
    });
  },
);

export const operatorApplicationController = {
  createOperatorApplication,
  verifyOperatorApplicationEmail,
  approveOperatorApplication,
  rejectOperatorApplication,
};

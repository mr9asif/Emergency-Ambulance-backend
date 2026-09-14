import { Request, Response } from "express";

import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";

import sendResponse from "../../utils/sendResponse.js";

import { emergencyRequestService } from "./emergencyRequest.services.js";

const createEmergencyRequest = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    const result = await emergencyRequestService.createEmergencyRequest(
      userId as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,

      success: true,

      message: "Emergency request created successfully",

      data: result,
    });
  },
);

const getPendingEmergencyRequests = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    const result = await emergencyRequestService.getPendingEmergencyRequests(
      userId as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,

      success: true,

      message: "Pending emergency requests retrieved successfully",

      data: result,
    });
  },
);
export const emergencyRequestController = {
  createEmergencyRequest,
  getPendingEmergencyRequests,
};

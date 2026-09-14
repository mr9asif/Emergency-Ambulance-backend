import type { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { adminService } from "./admin.services.js";

const getAllOperatorApplications = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.getAllOperatorApplications(req.query);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Operator applications retrieved successfully",
      data: result,
    });
  },
);

const getOperatorApplicationById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.getOperatorApplicationById(
      req.params.id as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Operator application retrieved successfully",
      data: result,
    });
  },
);

const approveOperatorApplication = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.approveOperatorApplication(
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
    const result = await adminService.rejectOperatorApplication(
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

const getAllOperators = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllOperators();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Operators retrieved successfully",
    data: result,
  });
});

const getOperatorById = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getOperatorById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Operator retrieved successfully",
    data: result,
  });
});

export const adminController = {
  getAllOperatorApplications,
  getOperatorApplicationById,
  approveOperatorApplication,
  rejectOperatorApplication,
  getAllOperators,
  getOperatorById,
};

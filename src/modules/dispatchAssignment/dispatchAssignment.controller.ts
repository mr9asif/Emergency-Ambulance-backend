import { Request, Response } from "express";
import httpStatus from "http-status";

import sendResponse from "../../utils/sendResponse.js";

import { catchAsync } from "../../utils/catchAsync.js";
import { dispatchAssignmentService } from "./dispatchAssignment.services.js";

// ============================================
// GET ALL ASSIGNMENTS - DISPATCHER
// ============================================

const getAllDispatchAssignments = catchAsync(
  async (req: Request, res: Response) => {
    const dispatcherUserId = req.user?.userId;

    const result = await dispatchAssignmentService.getAllDispatchAssignments(
      dispatcherUserId as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Dispatch assignments retrieved successfully",
      data: result,
    });
  },
);

// ============================================
// GET MY OFFERS - DRIVER
// ============================================

const getMyOffers = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.userId;

  const result = await dispatchAssignmentService.getMyOffers(
    driverUserId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dispatch offers retrieved successfully",
    data: result,
  });
});

// ============================================
// ACCEPT ASSIGNMENT - DRIVER
// ============================================

const acceptDispatchAssignment = catchAsync(
  async (req: Request, res: Response) => {
    const driverUserId = req.user?.userId;

    const result = await dispatchAssignmentService.acceptDispatchAssignment(
      driverUserId as string,
      req.params.assignmentId as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Dispatch assignment accepted successfully",
      data: result,
    });
  },
);

// ============================================
// REJECT ASSIGNMENT - DRIVER
// ============================================

const rejectDispatchAssignment = catchAsync(
  async (req: Request, res: Response) => {
    const driverUserId = req.user?.userId;

    const result = await dispatchAssignmentService.rejectDispatchAssignment(
      driverUserId as string,
      req.params.assignmentId as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Dispatch assignment rejected successfully",
      data: result,
    });
  },
);

export const dispatchAssignmentController = {
  getAllDispatchAssignments,
  getMyOffers,
  acceptDispatchAssignment,
  rejectDispatchAssignment,
};

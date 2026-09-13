import type { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { operatorService } from "./operator.services.js";

const createOperator = catchAsync(async (req: Request, res: Response) => {
  const result = await operatorService.createOperator(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Operator created successfully",
    data: result,
  });
});

const getAllOperators = catchAsync(async (_req: Request, res: Response) => {
  const result = await operatorService.getAllOperators();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Operators retrieved successfully",
    data: result,
  });
});

const getOperatorById = catchAsync(async (req: Request, res: Response) => {
  const result = await operatorService.getOperatorById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Operator retrieved successfully",
    data: result,
  });
});

const updateOperator = catchAsync(async (req: Request, res: Response) => {
  const result = await operatorService.updateOperator(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Operator updated successfully",
    data: result,
  });
});

export const operatorController = {
  createOperator,
  getAllOperators,
  getOperatorById,
  updateOperator,
};

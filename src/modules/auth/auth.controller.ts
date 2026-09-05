import { NextFunction, Request, Response } from "express";
import httpsStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { authService } from "./auth.service.js";

const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const result = await authService.registerUser(payload);

    sendResponse(res, {
      success: true,
      statusCode: httpsStatus.OK,
      message: "user created successfully",
      data: result,
    });
  },
);

export const authController = {
  registerUser,
};

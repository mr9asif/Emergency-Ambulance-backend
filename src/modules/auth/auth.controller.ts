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
      message: `check your ${payload.email} and verify your otp`,
      data: result,
    });
  },
);

const verifyUserEmail = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await authService.verifyRegisterPatiend(payload);

  const { accessToken, refreshToken, user } = result;

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  sendResponse(res, {
    statusCode: httpsStatus.CREATED,
    success: true,
    message: "Email Verified Successfully",
    data: {
      accessToken,
      refreshToken,
      user,
    },
  });
});

export const authController = {
  registerUser,
  verifyUserEmail,
};

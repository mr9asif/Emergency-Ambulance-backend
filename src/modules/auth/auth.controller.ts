import { NextFunction, Request, Response } from "express";
import httpsStatus from "http-status";
import { AppError } from "../../error/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { authService } from "./auth.service.js";
import { IRequestUser } from "./auth.types.js";

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

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authService.loginUser(payload);
  const { accessToken, refreshToken } = result;

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
    statusCode: httpsStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      accessToken,
      refreshToken,
    },
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  if (!req.cookies.refreshToken) {
    throw new Error("Refresh token is missing");
  }
  const result = await authService.refreshToken(req.cookies.refreshToken);
  const { accessToken, refreshToken: newRefreshToken } = result;

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
  });
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  sendResponse(res, {
    statusCode: httpsStatus.OK,
    success: true,
    message: "New tokens generated successfully",
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as unknown as IRequestUser;

  if (!user) {
    throw new Error("User information is missing in the request");
  }

  const result = await authService.getMe(user);
  sendResponse(res, {
    statusCode: httpsStatus.OK,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});

const setOperatorPassword = catchAsync(async (req, res) => {
  // Token comes from URL query
  const { token } = req.query;

  // Validate token
  if (!token || typeof token !== "string") {
    throw new AppError(httpsStatus.BAD_REQUEST, "Invitation token is required");
  }

  // Password + confirmPassword come from body
  const result = await authService.setOperatorPassword(token, req.body);

  sendResponse(res, {
    statusCode: httpsStatus.OK,
    success: true,
    message: "Password set successfully. You can now login.",
    data: result,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  await authService.forgotPassword(email);

  sendResponse(res, {
    statusCode: httpsStatus.OK,
    success: true,
    message:
      "If an account exists with this email, a password reset OTP has been sent.",
    data: null,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  await authService.resetPassword(email, otp, newPassword);

  sendResponse(res, {
    statusCode: httpsStatus.OK,
    success: true,
    message: "Password reset successfully. You can now login.",
    data: null,
  });
});

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as unknown as IRequestUser;

  if (!user) {
    throw new AppError(httpsStatus.UNAUTHORIZED, "User information is missing");
  }

  if (!req.file) {
    throw new AppError(httpsStatus.BAD_REQUEST, "Profile image is required");
  }

  const result = await authService.uploadProfileImage(user.userId, req.file);

  sendResponse(res, {
    statusCode: httpsStatus.OK,
    success: true,
    message: "Profile image uploaded successfully",
    data: result,
  });
});

export const authController = {
  registerUser,
  verifyUserEmail,
  loginUser,
  refreshToken,
  getMe,
  setOperatorPassword,
  forgotPassword,
  resetPassword,
  uploadProfileImage,
};

import type { NextFunction, Request, Response } from "express";

import httpStatus from "http-status";
import { ZodError } from "zod";
export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error("❌ Global Error:", err);

  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";

  // AppError
  if (err?.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Zod Error
  else if (err instanceof ZodError || err?.name === "ZodError") {
    statusCode = httpStatus.BAD_REQUEST;

    message =
      err.issues?.map((issue: any) => issue.message).join(", ") ||
      "Validation Error";
  }

  // Other errors
  else if (err instanceof Error) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = err.message || "Internal Server Error";
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
};

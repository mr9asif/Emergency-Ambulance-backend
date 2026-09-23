import type { NextFunction, Request, Response } from "express";

import httpStatus from "http-status";
import { ZodError } from "zod";

import config from "../config/index.js";
import { Prisma } from "../generated/prisma/client.js";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Always log the complete error on the server.
  // This will also appear in Vercel logs.
  console.error("❌ Global Error:", err);

  // Explicitly use `number` so TypeScript doesn't infer
  // the literal type `500`.
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let errorMessage = "Internal Server Error";

  const errorName = err?.name || "InternalServerError";

  // =====================================================
  // 1. AppError
  // =====================================================
  if (err?.statusCode) {
    statusCode = err.statusCode;
    errorMessage = err.message;
  }

  // =====================================================
  // 2. Zod Validation Error
  // =====================================================
  else if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;

    errorMessage = err.issues.map((issue) => issue.message).join(", ");
  }

  // =====================================================
  // 3. Prisma Validation Error
  // =====================================================
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;

    errorMessage = "You have provided incorrect field type or missing fields.";
  }

  // =====================================================
  // 4. Prisma Known Request Error
  // =====================================================
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = httpStatus.BAD_REQUEST;
      errorMessage = "Duplicate Key Error";
    } else if (err.code === "P2003") {
      statusCode = httpStatus.BAD_REQUEST;
      errorMessage = "Foreign key constraint failed";
    } else if (err.code === "P2025") {
      statusCode = httpStatus.NOT_FOUND;
      errorMessage = "The requested record was not found";
    }
  }

  // =====================================================
  // 5. Prisma Initialization Error
  // =====================================================
  else if (err instanceof Prisma.PrismaClientInitializationError) {
    if (err.errorCode === "P1000") {
      statusCode = httpStatus.UNAUTHORIZED;
      errorMessage = "Authentication failed against database server.";
    } else if (err.errorCode === "P1001") {
      statusCode = httpStatus.SERVICE_UNAVAILABLE;
      errorMessage = "Can't reach database server";
    }
  }

  // =====================================================
  // 6. Prisma Unknown Request Error
  // =====================================================
  else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    errorMessage = "Error occurred during query execution";
  }

  // =====================================================
  // 7. Normal JavaScript Error
  // =====================================================
  else if (err instanceof Error) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;

    // Don't expose unexpected internal error details
    // to production clients.
    errorMessage = "Internal Server Error";
  }

  // =====================================================
  // 8. Send Response
  // =====================================================
  return res.status(statusCode).json({
    success: false,
    statusCode,
    name: errorName,
    message: errorMessage,

    // Show technical details only in development
    ...(config.node_env === "development" && {
      error: err,
      stack: err?.stack,
    }),
  });
};

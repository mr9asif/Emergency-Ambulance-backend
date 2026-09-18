import type { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { notificationService } from "./notification.services.js";

// ======================================================
// GET MY NOTIFICATIONS
// ======================================================

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.getMyNotifications(
    req.user!.userId,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications retrieved successfully",
    data: result,
  });
});

// ======================================================
// MARK SINGLE NOTIFICATION AS READ
// ======================================================

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.markAsRead(
    req.params.id as string,
    req.user!.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

// ======================================================
// MARK ALL NOTIFICATIONS AS READ
// ======================================================

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

// ======================================================
// EXPORT
// ======================================================

export const notificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};

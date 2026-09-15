import { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { tripService } from "./trip.services.js";

const startTrip = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.userId;
  const { tripId } = req.params;

  const result = await tripService.startTrip(
    driverUserId as string,
    tripId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trip started successfully",
    data: result,
  });
});

const arriveAtPickup = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.userId;
  const { tripId } = req.params;

  const result = await tripService.arriveAtPickup(
    driverUserId as string,
    tripId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Driver arrived at pickup location",
    data: result,
  });
});

const confirmPickup = catchAsync(async (req: Request, res: Response) => {
  const customerUserId = req.user?.userId;
  const { tripId } = req.params;

  const result = await tripService.confirmPickup(
    customerUserId as string,
    tripId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Patient pickup confirmed successfully",
    data: result,
  });
});

export const tripController = {
  startTrip,
  arriveAtPickup,
  confirmPickup,
};

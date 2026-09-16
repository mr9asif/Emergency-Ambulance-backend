import { Request, Response } from "express";
import httpStatus from "http-status";

import { UserRole } from "../../generated/prisma/enums.js";
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

const startHospitalJourney = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.userId;
  const { tripId } = req.params;

  const result = await tripService.startHospitalJourney(
    driverUserId as string,
    tripId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hospital journey started successfully",
    data: result,
  });
});

const arriveAtHospital = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user?.userId;
  const { tripId } = req.params;

  const result = await tripService.arriveAtHospital(
    driverUserId as string,
    tripId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ambulance arrived at hospital",
    data: result,
  });
});

const getMyTrips = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  const result = await tripService.getMyTrips(
    userId as string,
    role as UserRole,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My trips retrieved successfully",
    data: result,
  });
});

const getTripById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  const result = await tripService.getTripById(
    userId as string,
    role as UserRole,
    req.params.tripId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Trip retrieved successfully",
    data: result,
  });
});

const getAllTrips = catchAsync(async (req: Request, res: Response) => {
  const result = await tripService.getAllTrips();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All trips retrieved successfully",
    data: result,
  });
});

export const tripController = {
  startTrip,
  arriveAtPickup,
  confirmPickup,
  startHospitalJourney,
  arriveAtHospital,

  getMyTrips,
  getTripById,
  getAllTrips,
};

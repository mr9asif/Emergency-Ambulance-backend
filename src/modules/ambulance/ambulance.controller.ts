// src/modules/ambulance/ambulance.controller.ts

import type { Request, Response } from "express";

import httpStatus from "http-status";

import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { ambulanceService } from "./ambulance.services.js";

const createAmbulance = catchAsync(async (req: Request, res: Response) => {
  const result = await ambulanceService.createAmbulance(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Ambulance created successfully",
    data: result,
  });
});

const getAllAmbulances = catchAsync(async (req: Request, res: Response) => {
  const result = await ambulanceService.getAllAmbulances();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ambulances retrieved successfully",
    data: result,
  });
});

const getAmbulanceById = catchAsync(async (req: Request, res: Response) => {
  const result = await ambulanceService.getAmbulanceById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ambulance retrieved successfully",
    data: result,
  });
});

const updateAmbulance = catchAsync(async (req: Request, res: Response) => {
  const result = await ambulanceService.updateAmbulance(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ambulance updated successfully",
    data: result,
  });
});

const deleteAmbulance = catchAsync(async (req: Request, res: Response) => {
  const result = await ambulanceService.deleteAmbulance(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ambulance deactivated successfully",
    data: result,
  });
});

export const ambulanceController = {
  createAmbulance,
  getAllAmbulances,
  getAmbulanceById,
  updateAmbulance,
  deleteAmbulance,
};

import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { hospitalService } from "./hospital.services.js";

const createHospital = catchAsync(async (req: Request, res: Response) => {
  const result = await hospitalService.createHospital(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Hospital created successfully",
    data: result,
  });
});

const getAllHospitals = catchAsync(async (req: Request, res: Response) => {
  const result = await hospitalService.getAllHospitals();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hospitals retrieved successfully",
    data: result,
  });
});

const getHospitalById = catchAsync(async (req: Request, res: Response) => {
  const result = await hospitalService.getHospitalById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hospital retrieved successfully",
    data: result,
  });
});

const updateHospital = catchAsync(async (req: Request, res: Response) => {
  const result = await hospitalService.updateHospital(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hospital updated successfully",
    data: result,
  });
});

const deleteHospital = catchAsync(async (req: Request, res: Response) => {
  const result = await hospitalService.deleteHospital(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hospital deactivated successfully",
    data: result,
  });
});

export const hospitalController = {
  createHospital,
  getAllHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
};

import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { patientService } from "./patient.services.js";

const createPatient = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await patientService.createPatient(userId as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Patient created successfully",
    data: result,
  });
});

const getMyPatients = catchAsync(async (req, res) => {
  const userId = req.user?.userId;

  const result = await patientService.getMyPatients(userId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Patients retrieved successfully",
    data: result,
  });
});

const getMyPatientById = catchAsync(async (req, res) => {
  const userId = req.user?.userId;

  const result = await patientService.getMyPatientById(
    userId as string,
    req.params.patientId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Patient retrieved successfully",
    data: result,
  });
});

const updatePatient = catchAsync(async (req, res) => {
  const userId = req.user?.userId;

  const result = await patientService.updatePatient(
    userId as string,
    req.params.patientId as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Patient updated successfully",
    data: result,
  });
});

const deletePatient = catchAsync(async (req, res) => {
  const userId = req.user?.userId;

  const result = await patientService.deletePatient(
    userId as string,
    req.params.patientId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Patient deleted successfully",
    data: result,
  });
});

export const patientController = {
  createPatient,
  getMyPatients,
  getMyPatientById,
  updatePatient,
  deletePatient,
};

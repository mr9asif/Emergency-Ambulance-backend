import httpStatus from "http-status";

import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { ICreateEmergencyRequest } from "./emergencyRequest.interface.js";

const generateRequestNumber = async (): Promise<string> => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const prefix = `ER-${year}${month}${day}`;

  const count = await prisma.emergencyRequest.count({
    where: {
      requestNumber: {
        startsWith: prefix,
      },
    },
  });

  const sequence = String(count + 1).padStart(4, "0");

  return `${prefix}-${sequence}`;
};

const createEmergencyRequest = async (
  userId: string,
  payload: ICreateEmergencyRequest,
) => {
  // 1. Verify patient belongs to authenticated customer
  const patient = await prisma.patient.findFirst({
    where: {
      id: payload.patientId,
      userId,
    },
  });

  if (!patient) {
    throw new AppError(httpStatus.NOT_FOUND, "Patient not found");
  }

  // 2. Generate request number
  const requestNumber = await generateRequestNumber();

  // 3. Create emergency request
  const emergencyRequest = await prisma.emergencyRequest.create({
    data: {
      requestNumber,

      customerId: userId,

      patientId: payload.patientId,

      pickupAddress: payload.pickupAddress,

      pickupLatitude: payload.pickupLatitude,

      pickupLongitude: payload.pickupLongitude,

      emergencyType: payload.emergencyType,

      priority: payload.priority,

      requiredTime: new Date(payload.requiredTime),

      notes: payload.notes,
    },

    include: {
      patient: true,
    },
  });

  return emergencyRequest;
};

export const emergencyRequestService = {
  createEmergencyRequest,
};

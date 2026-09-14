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

const getPendingEmergencyRequests = async (userId: string) => {
  // 1. Verify dispatcher
  const dispatcher = await prisma.operatorProfile.findFirst({
    where: {
      userId,
      operatorType: "DISPATCHER",
    },
  });

  if (!dispatcher) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only dispatchers can access pending emergency requests",
    );
  }

  // 2. Get pending requests
  const emergencyRequests = await prisma.emergencyRequest.findMany({
    where: {
      status: "PENDING",
    },

    include: {
      patient: true,

      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  // 3. Sort by emergency priority
  const priorityOrder = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  };

  emergencyRequests.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  return emergencyRequests;
};

// get available driver
const getAvailableDrivers = async (userId: string) => {
  // Verify dispatcher
  const dispatcher = await prisma.operatorProfile.findFirst({
    where: {
      userId,
      operatorType: "DISPATCHER",
    },
  });

  if (!dispatcher) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only dispatchers can access available drivers",
    );
  }

  const drivers = await prisma.operatorProfile.findMany({
    where: {
      operatorType: "DRIVER",
      isAvailable: true,

      user: {
        status: "ACTIVE",
        isDeleted: false,
      },
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
        },
      },

      hospital: {
        select: {
          id: true,
          name: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return drivers;
};

// available ambulance chek
const getAvailableAmbulances = async (userId: string) => {
  // Verify dispatcher
  const dispatcher = await prisma.operatorProfile.findFirst({
    where: {
      userId,
      operatorType: "DISPATCHER",
    },
  });

  if (!dispatcher) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only dispatchers can access available ambulances",
    );
  }

  const ambulances = await prisma.ambulance.findMany({
    where: {
      status: "AVAILABLE",
    },

    include: {
      baseHospital: {
        select: {
          id: true,
          name: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return ambulances;
};

export const emergencyRequestService = {
  createEmergencyRequest,
  getPendingEmergencyRequests,
  getAvailableDrivers,
  getAvailableAmbulances,
};

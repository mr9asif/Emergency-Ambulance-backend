import httpStatus from "http-status";

import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";
import {
  IAssignEmergencyRequest,
  ICreateEmergencyRequest,
} from "./emergencyRequest.interface.js";

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

// find nearest hospital
const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const earthRadiusKm = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const getNearbyHospitals = async (emergencyRequestId: string) => {
  // 1. Get emergency request
  const emergencyRequest = await prisma.emergencyRequest.findUnique({
    where: {
      id: emergencyRequestId,
    },
    select: {
      id: true,
      requestNumber: true,
      pickupAddress: true,
      pickupLatitude: true,
      pickupLongitude: true,
      emergencyType: true,
      priority: true,
      status: true,
    },
  });

  if (!emergencyRequest) {
    throw new AppError(httpStatus.NOT_FOUND, "Emergency request not found");
  }

  // 2. Get active emergency-capable hospitals
  const hospitals = await prisma.hospital.findMany({
    where: {
      isActive: true,
      hasEmergency: true,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  });

  // 3. Calculate distance from patient to every hospital
  const hospitalsWithDistance = hospitals.map((hospital) => {
    const distance = calculateDistanceKm(
      Number(emergencyRequest.pickupLatitude),
      Number(emergencyRequest.pickupLongitude),
      Number(hospital.latitude),
      Number(hospital.longitude),
    );

    return {
      ...hospital,
      distanceFromPickupKm: Number(distance.toFixed(2)),
    };
  });

  // 4. Nearest hospital first
  hospitalsWithDistance.sort(
    (a, b) => a.distanceFromPickupKm - b.distanceFromPickupKm,
  );

  return {
    emergencyRequest,
    hospitals: hospitalsWithDistance,
  };
};

// assignmet task
const assignEmergencyRequest = async (
  dispatcherId: string,
  emergencyRequestId: string,
  payload: IAssignEmergencyRequest,
) => {
  // 1. Verify dispatcher
  const dispatcher = await prisma.operatorProfile.findFirst({
    where: {
      userId: dispatcherId,
      operatorType: "DISPATCHER",
    },
  });

  if (!dispatcher) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only dispatchers can assign emergency requests",
    );
  }

  const assignment = await prisma.$transaction(async (tx) => {
    // 2. Get emergency request
    const emergencyRequest = await tx.emergencyRequest.findUnique({
      where: {
        id: emergencyRequestId,
      },
    });

    if (!emergencyRequest) {
      throw new AppError(httpStatus.NOT_FOUND, "Emergency request not found");
    }

    // 3. Request must still be pending
    if (emergencyRequest.status !== "PENDING") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This emergency request is no longer pending",
      );
    }

    // 4. Verify hospital
    const hospital = await tx.hospital.findFirst({
      where: {
        id: payload.hospitalId,
        isActive: true,
        hasEmergency: true,
      },
    });

    if (!hospital) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Selected hospital is not available for emergency service",
      );
    }

    // 5. Verify ambulance
    const ambulance = await tx.ambulance.findFirst({
      where: {
        id: payload.ambulanceId,
        status: "AVAILABLE",
        baseHospitalId: payload.hospitalId,
      },
    });

    if (!ambulance) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Selected ambulance is not available or does not belong to the selected hospital",
      );
    }

    // 6. Verify driver
    const driver = await tx.operatorProfile.findFirst({
      where: {
        id: payload.driverId,
        operatorType: "DRIVER",
        isAvailable: true,
        user: {
          status: "ACTIVE",
          isDeleted: false,
        },
      },
    });

    if (!driver) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Selected driver is not available",
      );
    }

    // 8. Move emergency request into dispatching
    await tx.emergencyRequest.update({
      where: {
        id: emergencyRequestId,
      },
      data: {
        hospitalId: payload.hospitalId,
        status: "DISPATCHING",
      },
    });
    // 7. Create assignment offer
    const dispatchAssignment = await tx.dispatchAssignment.create({
      data: {
        emergencyRequestId,
        driverId: payload.driverId,
        ambulanceId: payload.ambulanceId,
        assignedBy: dispatcherId,

        assignmentMethod: "MANUAL",
        status: "OFFERED",

        offeredAt: new Date(),

        // Give driver limited time to respond
        expiresAt: new Date(Date.now() + 60 * 1000),
      },

      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },

        ambulance: true,

        emergencyRequest: {
          include: {
            patient: true,
            hospital: true,
          },
        },
      },
    });

    return dispatchAssignment;
  });

  return assignment;
};

export const emergencyRequestService = {
  createEmergencyRequest,
  getPendingEmergencyRequests,
  getAvailableDrivers,
  getAvailableAmbulances,

  getNearbyHospitals,
  assignEmergencyRequest,
};

import httpStatus from "http-status";
import { AppError } from "../../error/AppError.js";
import { Prisma, UserRole } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { calculateDistanceKm, calculateFare } from "./fare.utils.js";

const generateTripNumber = async (
  tx: Prisma.TransactionClient,
): Promise<string> => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const prefix = `TRIP-${year}${month}${day}`;

  const lastTrip = await tx.trip.findFirst({
    where: {
      tripNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      tripNumber: "desc",
    },
  });

  let sequence = 1;

  if (lastTrip) {
    const lastSequence = Number(lastTrip.tripNumber.split("-").pop()) || 0;

    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
};

// start trip

const startTrip = async (driverUserId: string, tripId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find active driver
    const driver = await tx.operatorProfile.findFirst({
      where: {
        userId: driverUserId,
        operatorType: "DRIVER",
        user: {
          status: "ACTIVE",
          isDeleted: false,
        },
      },
    });

    if (!driver) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only active drivers can start a trip",
      );
    }

    // 2. Find trip
    const trip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: true,
        dispatchAssignment: true,
      },
    });

    if (!trip) {
      throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
    }

    // 3. Make sure this trip belongs to this driver
    if (trip.driverId !== driver.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This trip does not belong to you",
      );
    }

    // 4. Trip must be NOT_STARTED
    if (trip.status !== "NOT_STARTED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This trip has already been started or completed",
      );
    }

    // 5. Emergency request must be ASSIGNED
    if (trip.emergencyRequest.status !== "ASSIGNED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Emergency request is not ready to start",
      );
    }

    // 6. Update trip
    const updatedTrip = await tx.trip.update({
      where: {
        id: tripId,
      },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    // 7. Update emergency request
    await tx.emergencyRequest.update({
      where: {
        id: trip.emergencyRequestId,
      },
      data: {
        status: "EN_ROUTE_TO_PICKUP",
      },
    });

    // 8. Return fresh trip
    const freshTrip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: {
          include: {
            patient: true,
            hospital: true,
          },
        },
        ambulance: true,
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
        dispatchAssignment: true,
      },
    });

    if (!freshTrip) {
      throw new AppError(httpStatus.NOT_FOUND, "Updated trip not found");
    }

    return freshTrip;
  });

  return result;
};

const arriveAtPickup = async (driverUserId: string, tripId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find active driver
    const driver = await tx.operatorProfile.findFirst({
      where: {
        userId: driverUserId,
        operatorType: "DRIVER",
        user: {
          status: "ACTIVE",
          isDeleted: false,
        },
      },
    });

    if (!driver) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only active drivers can update trip status",
      );
    }

    // 2. Find trip
    const trip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: true,
      },
    });

    if (!trip) {
      throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
    }

    // 3. Make sure this trip belongs to this driver
    if (trip.driverId !== driver.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This trip does not belong to you",
      );
    }

    // 4. Trip must currently be in progress
    if (trip.status !== "IN_PROGRESS") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Trip is not currently in progress",
      );
    }

    // 5. Emergency request must be en route to pickup
    if (trip.emergencyRequest.status !== "EN_ROUTE_TO_PICKUP") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Emergency request is not en route to pickup",
      );
    }

    // 6. Update emergency request status
    await tx.emergencyRequest.update({
      where: {
        id: trip.emergencyRequestId,
      },
      data: {
        status: "ARRIVED_AT_PICKUP",
      },
    });

    // 7. Fetch fresh trip
    const freshTrip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: {
          include: {
            patient: true,
            hospital: true,
          },
        },
        ambulance: true,
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
        dispatchAssignment: true,
      },
    });

    if (!freshTrip) {
      throw new AppError(httpStatus.NOT_FOUND, "Updated trip not found");
    }

    return freshTrip;
  });

  return result;
};

const confirmPickup = async (customerUserId: string, tripId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify active customer
    const customer = await tx.user.findFirst({
      where: {
        id: customerUserId,
        role: "CUSTOMER",
        status: "ACTIVE",
        isDeleted: false,
      },
    });

    if (!customer) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only active customers can confirm patient pickup",
      );
    }

    // 2. Find trip
    const trip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: {
          select: {
            id: true,
            customerId: true,
            status: true,
          },
        },
      },
    });

    if (!trip) {
      throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
    }

    // 3. Make sure this trip belongs to this customer
    if (trip.emergencyRequest.customerId !== customerUserId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This trip does not belong to you",
      );
    }

    // 4. Trip must be in progress
    if (trip.status !== "IN_PROGRESS") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Trip is not currently in progress",
      );
    }

    // 5. Emergency request must be at pickup
    if (trip.emergencyRequest.status !== "ARRIVED_AT_PICKUP") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Ambulance has not arrived at the pickup location",
      );
    }

    // 6. Update emergency request
    await tx.trip.update({
      where: {
        id: tripId,
      },
      data: {
        pickedUpAt: new Date(),
      },
    });

    await tx.emergencyRequest.update({
      where: {
        id: trip.emergencyRequestId,
      },
      data: {
        status: "PATIENT_PICKED_UP",
      },
    });

    // 7. Fetch fresh trip
    const freshTrip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: {
          include: {
            patient: true,
            hospital: true,
          },
        },
        ambulance: true,
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
        dispatchAssignment: true,
      },
    });

    if (!freshTrip) {
      throw new AppError(httpStatus.NOT_FOUND, "Updated trip not found");
    }

    return freshTrip;
  });

  return result;
};

const startHospitalJourney = async (driverUserId: string, tripId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find active driver
    const driver = await tx.operatorProfile.findFirst({
      where: {
        userId: driverUserId,
        operatorType: "DRIVER",
        user: {
          status: "ACTIVE",
          isDeleted: false,
        },
      },
    });

    if (!driver) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only active drivers can start the hospital journey",
      );
    }

    // 2. Find trip
    const trip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: {
          select: {
            id: true,
            hospitalId: true,
            status: true,
          },
        },
      },
    });

    if (!trip) {
      throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
    }

    // 3. Make sure this trip belongs to this driver
    if (trip.driverId !== driver.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This trip does not belong to you",
      );
    }

    // 4. Trip must be in progress
    if (trip.status !== "IN_PROGRESS") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Trip is not currently in progress",
      );
    }

    // 5. Patient must already be picked up
    if (trip.emergencyRequest.status !== "PATIENT_PICKED_UP") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Patient has not been picked up yet",
      );
    }

    // 6. Hospital must be assigned
    if (!trip.emergencyRequest.hospitalId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "No hospital has been assigned to this emergency request",
      );
    }

    // 7. Update emergency request status
    await tx.emergencyRequest.update({
      where: {
        id: trip.emergencyRequestId,
      },
      data: {
        status: "EN_ROUTE_TO_HOSPITAL",
      },
    });

    // 8. Fetch fresh trip
    const freshTrip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: {
          include: {
            patient: true,
            hospital: true,
          },
        },
        ambulance: true,
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
        dispatchAssignment: true,
      },
    });

    if (!freshTrip) {
      throw new AppError(httpStatus.NOT_FOUND, "Updated trip not found");
    }

    return freshTrip;
  });

  return result;
};

const arriveAtHospital = async (driverUserId: string, tripId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify active driver
    const driver = await tx.operatorProfile.findFirst({
      where: {
        userId: driverUserId,
        operatorType: "DRIVER",
        user: {
          status: "ACTIVE",
          isDeleted: false,
        },
      },
    });

    if (!driver) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only active drivers can mark hospital arrival",
      );
    }

    // 2. Find trip
    const trip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: {
          select: {
            id: true,
            hospitalId: true,
            status: true,

            // Pickup location
            pickupLatitude: true,
            pickupLongitude: true,

            // Hospital information
            hospital: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
    }

    // 3. Make sure this trip belongs to this driver
    if (trip.driverId !== driver.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This trip does not belong to you",
      );
    }

    // 4. Trip must be in progress
    if (trip.status !== "IN_PROGRESS") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Trip is not currently in progress",
      );
    }

    // 5. Emergency request must be en route to hospital
    if (trip.emergencyRequest.status !== "EN_ROUTE_TO_HOSPITAL") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Ambulance is not currently en route to the hospital",
      );
    }

    // 6. Hospital must be assigned
    if (!trip.emergencyRequest.hospitalId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "No hospital has been assigned to this emergency request",
      );
    }

    // 7. Hospital relation must exist
    if (!trip.emergencyRequest.hospital) {
      throw new AppError(httpStatus.NOT_FOUND, "Assigned hospital not found");
    }

    // 8. Calculate pickup → hospital distance
    const distanceKm = calculateDistanceKm(
      Number(trip.emergencyRequest.pickupLatitude),
      Number(trip.emergencyRequest.pickupLongitude),
      Number(trip.emergencyRequest.hospital.latitude),
      Number(trip.emergencyRequest.hospital.longitude),
    );

    // 9. Calculate fare
    const fareAmount = calculateFare(distanceKm);

    // 10. Update trip arrival time + distance + fare
    await tx.trip.update({
      where: {
        id: tripId,
      },
      data: {
        arrivedAtHospitalAt: new Date(),
        distanceKm,
        fareAmount,
      },
    });

    // 11. Update emergency request status
    await tx.emergencyRequest.update({
      where: {
        id: trip.emergencyRequestId,
      },
      data: {
        status: "ARRIVED_AT_HOSPITAL",
      },
    });

    // 12. Fetch fresh trip
    const freshTrip = await tx.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        emergencyRequest: {
          include: {
            patient: true,
            hospital: true,
          },
        },

        ambulance: true,

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

        dispatchAssignment: true,
      },
    });

    if (!freshTrip) {
      throw new AppError(httpStatus.NOT_FOUND, "Updated trip not found");
    }

    return freshTrip;
  });

  return result;
};

// get trip
const getMyTrips = async (userId: string, role: UserRole) => {
  if (role === UserRole.CUSTOMER) {
    return prisma.trip.findMany({
      where: {
        emergencyRequest: {
          customerId: userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        emergencyRequest: {
          include: {
            patient: true,
            hospital: true,
          },
        },
        ambulance: true,
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
        payment: true,
      },
    });
  }

  if (role === UserRole.OPERATOR) {
    const driver = await prisma.operatorProfile.findFirst({
      where: {
        userId,
        operatorType: "DRIVER",
      },
    });

    if (!driver) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only drivers can view their assigned trips",
      );
    }

    return prisma.trip.findMany({
      where: {
        driverId: driver.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        emergencyRequest: {
          include: {
            patient: true,
            hospital: true,
            customer: {
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
        payment: true,
      },
    });
  }

  throw new AppError(
    httpStatus.FORBIDDEN,
    "You are not allowed to view these trips",
  );
};

// get single trip
const getTripById = async (userId: string, role: UserRole, tripId: string) => {
  const trip = await prisma.trip.findUnique({
    where: {
      id: tripId,
    },
    include: {
      emergencyRequest: {
        include: {
          patient: true,
          hospital: true,
          customer: {
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

      dispatchAssignment: true,

      payment: true,
    },
  });

  if (!trip) {
    throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
  }

  // Customer can only see their own trip
  if (role === UserRole.CUSTOMER) {
    if (trip.emergencyRequest.customerId !== userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not allowed to view this trip",
      );
    }
  }

  // Driver can only see trips assigned to them
  if (role === UserRole.OPERATOR) {
    const driver = await prisma.operatorProfile.findFirst({
      where: {
        userId,
        operatorType: "DRIVER",
      },
    });

    if (!driver) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only drivers can view assigned trips",
      );
    }

    if (trip.driverId !== driver.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This trip is not assigned to you",
      );
    }
  }

  return trip;
};

// get all trip by dispatch
const getAllTrips = async () => {
  return prisma.trip.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      emergencyRequest: {
        include: {
          patient: true,
          hospital: true,
          customer: {
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

      dispatchAssignment: true,

      payment: true,
    },
  });
};

export const tripService = {
  generateTripNumber,
  startTrip,
  arriveAtPickup,
  confirmPickup,
  startHospitalJourney,
  arriveAtHospital,
  getMyTrips,
  getTripById,
  getAllTrips,
};

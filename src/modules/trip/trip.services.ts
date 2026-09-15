import httpStatus from "http-status";
import { AppError } from "../../error/AppError.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

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

export const tripService = {
  generateTripNumber,
  startTrip,
  arriveAtPickup,
};

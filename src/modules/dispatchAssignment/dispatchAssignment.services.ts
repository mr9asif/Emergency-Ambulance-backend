import httpStatus from "http-status";

import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { IRejectDispatchAssignment } from "./dispatchAssignment.interface.js";

// ============================================
// GET ALL DISPATCH ASSIGNMENTS - DISPATCHER
// ============================================

const getAllDispatchAssignments = async (dispatcherUserId: string) => {
  // 1. Verify dispatcher
  const dispatcher = await prisma.operatorProfile.findFirst({
    where: {
      userId: dispatcherUserId,
      operatorType: "DISPATCHER",
      user: {
        status: "ACTIVE",
        isDeleted: false,
      },
    },
  });

  if (!dispatcher) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only active dispatchers can view dispatch assignments",
    );
  }

  // 2. Get all assignments
  const assignments = await prisma.dispatchAssignment.findMany({
    orderBy: {
      createdAt: "desc",
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

      assignedByUser: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  return assignments;
};

// ============================================
// GET MY OFFERS - DRIVER
// ============================================

const getMyOffers = async (driverUserId: string) => {
  // 1. Find driver profile
  const driver = await prisma.operatorProfile.findFirst({
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
      "Only active drivers can view dispatch offers",
    );
  }

  // 2. Get active offers
  const offers = await prisma.dispatchAssignment.findMany({
    where: {
      driverId: driver.id,
      status: "OFFERED",
      OR: [
        {
          expiresAt: null,
        },
        {
          expiresAt: {
            gt: new Date(),
          },
        },
      ],
    },

    orderBy: {
      offeredAt: "desc",
    },

    include: {
      ambulance: true,

      emergencyRequest: {
        include: {
          patient: true,
          hospital: true,
        },
      },
    },
  });

  return offers;
};

// ============================================
// ACCEPT DISPATCH ASSIGNMENT - DRIVER
// ============================================

const acceptDispatchAssignment = async (
  driverUserId: string,
  assignmentId: string,
) => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find driver
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
        "Only active drivers can accept assignments",
      );
    }

    // 2. Find assignment
    const assignment = await tx.dispatchAssignment.findUnique({
      where: {
        id: assignmentId,
      },
    });

    if (!assignment) {
      throw new AppError(httpStatus.NOT_FOUND, "Dispatch assignment not found");
    }

    // 3. Make sure assignment belongs to this driver
    if (assignment.driverId !== driver.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This assignment does not belong to you",
      );
    }

    // 4. Check assignment status
    if (assignment.status !== "OFFERED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This assignment is no longer available",
      );
    }

    // 5. Check expiry
    if (assignment.expiresAt && assignment.expiresAt <= new Date()) {
      await tx.dispatchAssignment.update({
        where: {
          id: assignmentId,
        },
        data: {
          status: "EXPIRED",
        },
      });

      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This assignment offer has expired",
      );
    }

    // 6. Driver must still be available
    if (!driver.isAvailable) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You are currently unavailable",
      );
    }

    // 7. Atomically make driver unavailable
    const driverUpdate = await tx.operatorProfile.updateMany({
      where: {
        id: driver.id,
        isAvailable: true,
      },
      data: {
        isAvailable: false,
      },
    });

    if (driverUpdate.count !== 1) {
      throw new AppError(httpStatus.CONFLICT, "Driver is no longer available");
    }

    // 8. Atomically make ambulance busy
    const ambulanceUpdate = await tx.ambulance.updateMany({
      where: {
        id: assignment.ambulanceId,
        status: "AVAILABLE",
      },
      data: {
        status: "BUSY",
      },
    });

    if (ambulanceUpdate.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Ambulance is no longer available",
      );
    }

    // 9. Accept assignment
    const updatedAssignment = await tx.dispatchAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        status: "ACCEPTED",
        respondedAt: new Date(),
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

    // 10. Update emergency request
    await tx.emergencyRequest.update({
      where: {
        id: assignment.emergencyRequestId,
      },
      data: {
        status: "ASSIGNED",
      },
    });

    return updatedAssignment;
  });

  return result;
};

// ============================================
// REJECT DISPATCH ASSIGNMENT - DRIVER
// ============================================

const rejectDispatchAssignment = async (
  driverUserId: string,
  assignmentId: string,
  payload: IRejectDispatchAssignment,
) => {
  // 1. Find driver
  const driver = await prisma.operatorProfile.findFirst({
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
      "Only active drivers can reject assignments",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // 2. Find assignment
    const assignment = await tx.dispatchAssignment.findUnique({
      where: {
        id: assignmentId,
      },
    });

    if (!assignment) {
      throw new AppError(httpStatus.NOT_FOUND, "Dispatch assignment not found");
    }

    // 3. Verify ownership
    if (assignment.driverId !== driver.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This assignment does not belong to you",
      );
    }

    // 4. Must be offered
    if (assignment.status !== "OFFERED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This assignment is no longer available",
      );
    }

    // 5. Check expiry
    if (assignment.expiresAt && assignment.expiresAt <= new Date()) {
      await tx.dispatchAssignment.update({
        where: {
          id: assignmentId,
        },
        data: {
          status: "EXPIRED",
        },
      });

      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This assignment offer has expired",
      );
    }

    // 6. Reject assignment
    const rejectedAssignment = await tx.dispatchAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        status: "REJECTED",
        respondedAt: new Date(),
        rejectionReason: payload.rejectionReason,
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

    return rejectedAssignment;
  });

  return result;
};

export const dispatchAssignmentService = {
  getAllDispatchAssignments,
  getMyOffers,
  acceptDispatchAssignment,
  rejectDispatchAssignment,
};

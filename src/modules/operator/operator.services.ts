import bcrypt from "bcrypt";
import httpStatus from "http-status";

import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { ICreateOperator, IUpdateOperator } from "./operator.interface.js";

const createOperator = async (payload: ICreateOperator) => {
  // DRIVER business rule
  if (payload.operatorType === "DRIVER" && !payload.licenseNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "License number is required for a driver",
    );
  }

  // HOSPITAL STAFF business rule
  if (payload.operatorType === "HOSPITAL_STAFF" && !payload.hospitalId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Hospital ID is required for hospital staff",
    );
  }

  // Check email
  const existingEmail = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingEmail) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  // Check phone
  const existingPhone = await prisma.user.findUnique({
    where: {
      phone: payload.phone,
    },
  });

  if (existingPhone) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this phone already exists",
    );
  }

  // Check hospital
  if (payload.hospitalId) {
    const hospital = await prisma.hospital.findUnique({
      where: {
        id: payload.hospitalId,
      },
    });

    if (!hospital) {
      throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
    }

    if (!hospital.isActive) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot assign operator to an inactive hospital",
      );
    }
  }

  /*
   * For now we generate a temporary password.
   *
   * Later we'll replace this with:
   * Admin creates operator
   *       ↓
   * Invitation
   *       ↓
   * Operator sets password
   */
  const temporaryPassword = crypto.randomUUID();

  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        passwordHash,
        role: "OPERATOR",
        emailVerified: true,
        needPasswordChange: true,
      },
    });

    const operator = await tx.operatorProfile.create({
      data: {
        userId: user.id,
        operatorType: payload.operatorType,
        licenseNumber: payload.licenseNumber,
        employeeCode: payload.employeeCode,
        hospitalId: payload.hospitalId,
      },
    });

    return {
      user,
      operator,
      temporaryPassword,
    };
  });

  return result;
};

const getAllOperators = async () => {
  return prisma.operatorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
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
};

const getOperatorById = async (id: string) => {
  const operator = await prisma.operatorProfile.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
        },
      },
      hospital: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!operator) {
    throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
  }

  return operator;
};

const updateOperator = async (id: string, payload: IUpdateOperator) => {
  const operator = await prisma.operatorProfile.findUnique({
    where: {
      id,
    },
  });

  if (!operator) {
    throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
  }

  if (payload.hospitalId) {
    const hospital = await prisma.hospital.findUnique({
      where: {
        id: payload.hospitalId,
      },
    });

    if (!hospital) {
      throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
    }

    if (!hospital.isActive) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot assign operator to an inactive hospital",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    if (payload.name || payload.phone) {
      await tx.user.update({
        where: {
          id: operator.userId,
        },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.phone && { phone: payload.phone }),
        },
      });
    }

    return tx.operatorProfile.update({
      where: {
        id,
      },
      data: {
        ...(payload.licenseNumber !== undefined && {
          licenseNumber: payload.licenseNumber,
        }),

        ...(payload.employeeCode !== undefined && {
          employeeCode: payload.employeeCode,
        }),

        ...(payload.hospitalId !== undefined && {
          hospitalId: payload.hospitalId,
        }),

        ...(payload.isAvailable !== undefined && {
          isAvailable: payload.isAvailable,
        }),
      },
    });
  });
};

export const operatorService = {
  createOperator,
  getAllOperators,
  getOperatorById,
  updateOperator,
};

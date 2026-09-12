import httpStatus from "http-status";

import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { ICreateHospital, IUpdateHospital } from "./hospital.interface.js";

const createHospital = async (payload: ICreateHospital) => {
  const existingHospital = await prisma.hospital.findFirst({
    where: {
      name: {
        equals: payload.name,
        mode: "insensitive",
      },
    },
  });

  if (existingHospital) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Hospital with this name already exists",
    );
  }

  const hospital = await prisma.hospital.create({
    data: {
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      hasEmergency: payload.hasEmergency ?? true,
    },
  });

  return hospital;
};

const getAllHospitals = async () => {
  const hospitals = await prisma.hospital.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return hospitals;
};

const getHospitalById = async (id: string) => {
  const hospital = await prisma.hospital.findUnique({
    where: {
      id,
    },
  });

  if (!hospital) {
    throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
  }

  return hospital;
};

const updateHospital = async (id: string, payload: IUpdateHospital) => {
  const existingHospital = await prisma.hospital.findUnique({
    where: {
      id,
    },
  });

  if (!existingHospital) {
    throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
  }

  if (payload.name) {
    const duplicateHospital = await prisma.hospital.findFirst({
      where: {
        name: {
          equals: payload.name,
          mode: "insensitive",
        },
        NOT: {
          id,
        },
      },
    });

    if (duplicateHospital) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Hospital with this name already exists",
      );
    }
  }

  const hospital = await prisma.hospital.update({
    where: {
      id,
    },
    data: payload,
  });

  return hospital;
};

const deleteHospital = async (id: string) => {
  const existingHospital = await prisma.hospital.findUnique({
    where: {
      id,
    },
  });

  if (!existingHospital) {
    throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
  }

  // Soft delete/deactivation
  const hospital = await prisma.hospital.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });

  return hospital;
};

export const hospitalService = {
  createHospital,
  getAllHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
};

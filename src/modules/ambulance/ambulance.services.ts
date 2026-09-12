// src/modules/ambulance/ambulance.service.ts

import httpStatus from "http-status";

import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { ICreateAmbulance, IUpdateAmbulance } from "./amublance.interface.js";

const createAmbulance = async (payload: ICreateAmbulance) => {
  // Check duplicate registration number
  const existingAmbulance = await prisma.ambulance.findUnique({
    where: {
      registrationNumber: payload.registrationNumber,
    },
  });

  if (existingAmbulance) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Ambulance with this registration number already exists",
    );
  }

  // If hospital is provided, verify hospital exists
  if (payload.baseHospitalId) {
    const hospital = await prisma.hospital.findUnique({
      where: {
        id: payload.baseHospitalId,
      },
    });

    if (!hospital) {
      throw new AppError(httpStatus.NOT_FOUND, "Base hospital not found");
    }

    if (!hospital.isActive) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot assign ambulance to an inactive hospital",
      );
    }
  }

  const ambulance = await prisma.ambulance.create({
    data: {
      registrationNumber: payload.registrationNumber,
      ambulanceType: payload.ambulanceType,
      baseHospitalId: payload.baseHospitalId,
      currentLatitude: payload.currentLatitude,
      currentLongitude: payload.currentLongitude,
    },
  });

  return ambulance;
};

const getAllAmbulances = async () => {
  const ambulances = await prisma.ambulance.findMany({
    include: {
      baseHospital: {
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ambulances;
};

const getAmbulanceById = async (id: string) => {
  const ambulance = await prisma.ambulance.findUnique({
    where: {
      id,
    },
    include: {
      baseHospital: {
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  if (!ambulance) {
    throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
  }

  return ambulance;
};

const updateAmbulance = async (id: string, payload: IUpdateAmbulance) => {
  const existingAmbulance = await prisma.ambulance.findUnique({
    where: {
      id,
    },
  });

  if (!existingAmbulance) {
    throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
  }

  // Check duplicate registration number
  if (payload.registrationNumber) {
    const duplicateAmbulance = await prisma.ambulance.findFirst({
      where: {
        registrationNumber: payload.registrationNumber,
        NOT: {
          id,
        },
      },
    });

    if (duplicateAmbulance) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Ambulance with this registration number already exists",
      );
    }
  }

  // Verify new base hospital
  if (payload.baseHospitalId) {
    const hospital = await prisma.hospital.findUnique({
      where: {
        id: payload.baseHospitalId,
      },
    });

    if (!hospital) {
      throw new AppError(httpStatus.NOT_FOUND, "Base hospital not found");
    }

    if (!hospital.isActive) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot assign ambulance to an inactive hospital",
      );
    }
  }

  const ambulance = await prisma.ambulance.update({
    where: {
      id,
    },
    data: payload,
  });

  return ambulance;
};

const deleteAmbulance = async (id: string) => {
  const existingAmbulance = await prisma.ambulance.findUnique({
    where: {
      id,
    },
  });

  if (!existingAmbulance) {
    throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
  }

  // Soft delete: don't actually remove historical ambulance data
  const ambulance = await prisma.ambulance.update({
    where: {
      id,
    },
    data: {
      status: "OFFLINE",
    },
  });

  return ambulance;
};

export const ambulanceService = {
  createAmbulance,
  getAllAmbulances,
  getAmbulanceById,
  updateAmbulance,
  deleteAmbulance,
};

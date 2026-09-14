import httpStatus from "http-status";
import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { ICreatePatient, IUpdatePatient } from "./patient.interface.js";

const createPatient = async (userId: string, payload: ICreatePatient) => {
  const patient = await prisma.patient.create({
    data: {
      userId,

      name: payload.name,

      phone: payload.phone,

      dateOfBirth: payload.dateOfBirth
        ? new Date(payload.dateOfBirth)
        : undefined,

      gender: payload.gender,

      bloodGroup: payload.bloodGroup,

      medicalNotes: payload.medicalNotes,

      emergencyContact: payload.emergencyContact,
    },
  });

  return patient;
};

const getMyPatients = async (userId: string) => {
  const patients = await prisma.patient.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return patients;
};

const getMyPatientById = async (userId: string, patientId: string) => {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      userId,
    },
  });

  if (!patient) {
    throw new AppError(httpStatus.NOT_FOUND, "Patient not found");
  }

  return patient;
};

const updatePatient = async (
  userId: string,
  patientId: string,
  payload: IUpdatePatient,
) => {
  const existingPatient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      userId,
    },
  });

  if (!existingPatient) {
    throw new AppError(httpStatus.NOT_FOUND, "Patient not found");
  }

  const patient = await prisma.patient.update({
    where: {
      id: patientId,
    },

    data: {
      name: payload.name,

      phone: payload.phone,

      dateOfBirth: payload.dateOfBirth
        ? new Date(payload.dateOfBirth)
        : undefined,

      gender: payload.gender,

      bloodGroup: payload.bloodGroup,

      medicalNotes: payload.medicalNotes,

      emergencyContact: payload.emergencyContact,
    },
  });

  return patient;
};

const deletePatient = async (userId: string, patientId: string) => {
  const existingPatient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      userId,
    },
  });

  if (!existingPatient) {
    throw new AppError(httpStatus.NOT_FOUND, "Patient not found");
  }

  const patient = await prisma.patient.delete({
    where: {
      id: patientId,
    },
  });

  return patient;
};

export const patientService = {
  createPatient,
  getMyPatients,
  getMyPatientById,
  updatePatient,
  deletePatient,
};

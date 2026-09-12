// src/modules/ambulance/ambulance.validation.ts

import { z } from "zod";

const createAmbulanceSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(3, "Registration number must be at least 3 characters")
    .max(50, "Registration number cannot exceed 50 characters"),

  ambulanceType: z.enum(["BASIC", "AC", "ICU", "CARDIAC", "NEONATAL"]),

  baseHospitalId: z.uuid("Invalid hospital ID").optional(),

  currentLatitude: z.coerce
    .number()
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude")
    .optional(),

  currentLongitude: z.coerce
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude")
    .optional(),
});

const updateAmbulanceSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(3, "Registration number must be at least 3 characters")
    .max(50, "Registration number cannot exceed 50 characters")
    .optional(),

  ambulanceType: z
    .enum(["BASIC", "AC", "ICU", "CARDIAC", "NEONATAL"])
    .optional(),

  status: z.enum(["AVAILABLE", "BUSY", "MAINTENANCE", "OFFLINE"]).optional(),

  baseHospitalId: z.uuid("Invalid hospital ID").nullable().optional(),

  currentLatitude: z.coerce
    .number()
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude")
    .nullable()
    .optional(),

  currentLongitude: z.coerce
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude")
    .nullable()
    .optional(),
});

export const AmbulanceValidation = {
  createAmbulanceSchema,
  updateAmbulanceSchema,
};

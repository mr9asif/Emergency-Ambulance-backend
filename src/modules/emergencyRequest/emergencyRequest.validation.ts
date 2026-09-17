import { z } from "zod";

import { EmergencyType, Priority } from "../../generated/prisma/enums.js";

export const createEmergencyRequestSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),

  pickupAddress: z
    .string()
    .min(5, "Pickup address must be at least 5 characters")
    .max(500, "Pickup address must not exceed 500 characters"),

  pickupLatitude: z
    .number()
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),

  pickupLongitude: z
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),

  emergencyType: z.enum(EmergencyType),

  priority: z.enum(Priority),

  requiredTime: z.string().datetime("Invalid required time").optional(),

  notes: z
    .string()
    .max(2000, "Notes must not exceed 2000 characters")
    .optional(),
});

export const assignEmergencyRequestSchema = z.object({
  hospitalId: z.string().uuid("Invalid hospital ID"),
  ambulanceId: z.string().uuid("Invalid ambulance ID"),
  driverId: z.string().uuid("Invalid driver ID"),
});

import { z } from "zod";

const createHospitalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Hospital name must be at least 2 characters")
    .max(200, "Hospital name cannot exceed 200 characters"),

  phone: z
    .string()
    .trim()
    .max(20, "Phone number cannot exceed 20 characters")
    .optional(),

  address: z.string().trim().min(5, "Address must be at least 5 characters"),

  latitude: z.coerce
    .number()
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),

  longitude: z.coerce
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),

  hasEmergency: z.boolean().optional(),
});

const updateHospitalSchema = createHospitalSchema.partial();

export const HospitalValidation = {
  createHospitalSchema,
  updateHospitalSchema,
};

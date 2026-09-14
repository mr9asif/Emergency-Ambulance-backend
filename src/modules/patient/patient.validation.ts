import { z } from "zod";

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

const bloodGroupEnum = z.enum([
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
]);

const dateOfBirthSchema = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;

      const date = new Date(value);

      return !Number.isNaN(date.getTime());
    },
    {
      message: "Invalid date of birth",
    },
  );

export const createPatientSchema = z.object({
  name: z
    .string()
    .min(2, "Patient name must be at least 2 characters")
    .max(100, "Patient name must not exceed 100 characters")
    .trim(),

  phone: z
    .string()
    .max(20, "Phone number must not exceed 20 characters")
    .optional(),

  dateOfBirth: dateOfBirthSchema,

  gender: genderEnum.optional(),

  bloodGroup: bloodGroupEnum.optional(),

  medicalNotes: z
    .string()
    .max(5000, "Medical notes must not exceed 5000 characters")
    .optional(),

  emergencyContact: z
    .string()
    .max(20, "Emergency contact must not exceed 20 characters")
    .optional(),
});

export const updatePatientSchema = z.object({
  name: z
    .string()
    .min(2, "Patient name must be at least 2 characters")
    .max(100, "Patient name must not exceed 100 characters")
    .trim()
    .optional(),

  phone: z
    .string()
    .max(20, "Phone number must not exceed 20 characters")
    .optional(),

  dateOfBirth: dateOfBirthSchema,

  gender: genderEnum.optional(),

  bloodGroup: bloodGroupEnum.optional(),

  medicalNotes: z
    .string()
    .max(5000, "Medical notes must not exceed 5000 characters")
    .optional(),

  emergencyContact: z
    .string()
    .max(20, "Emergency contact must not exceed 20 characters")
    .optional(),
});

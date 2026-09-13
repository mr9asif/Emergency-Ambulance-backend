import { z } from "zod";

const createOperatorApplicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z.string().trim().email("Invalid email address"),

  phone: z
    .string()
    .trim()
    .min(10, "Invalid phone number")
    .max(20, "Invalid phone number"),

  operatorType: z.enum(["DRIVER", "DISPATCHER"]),
  licenseNumber: z
    .string()
    .trim()
    .min(3, "License number must be at least 3 characters")
    .max(100, "License number cannot exceed 100 characters")
    .optional(),

  hospitalId: z.string().uuid("Invalid hospital ID").optional(),
});

const verifyOperatorApplicationEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address"),

  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

const approveOperatorApplicationSchema = z.object({
  licenseNumber: z
    .string()
    .trim()
    .min(3, "License number must be at least 3 characters")
    .max(100, "License number cannot exceed 100 characters")
    .optional(),

  employeeCode: z
    .string()
    .trim()
    .min(2, "Employee code must be at least 2 characters")
    .max(100, "Employee code cannot exceed 100 characters")
    .optional(),
});

const rejectOperatorApplicationSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(3, "Rejection reason is required")
    .max(500, "Rejection reason cannot exceed 500 characters"),
});
export const OperatorApplicationValidation = {
  createOperatorApplicationSchema,
  verifyOperatorApplicationEmailSchema,
  approveOperatorApplicationSchema,
  rejectOperatorApplicationSchema,
};

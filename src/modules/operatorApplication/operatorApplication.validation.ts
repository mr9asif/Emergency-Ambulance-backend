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

  hospitalId: z.string().uuid("Invalid hospital ID").optional(),
});

const verifyOperatorApplicationEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address"),

  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

export const OperatorApplicationValidation = {
  createOperatorApplicationSchema,
  verifyOperatorApplicationEmailSchema,
};

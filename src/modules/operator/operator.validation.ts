import { z } from "zod";

const createOperatorSchema = z.object({
  name: z.string().trim().min(2).max(100),

  email: z.string().email(),

  phone: z.string().trim().min(10).max(20),

  operatorType: z.enum(["DRIVER", "DISPATCHER", "HOSPITAL_STAFF"]),

  licenseNumber: z.string().trim().min(3).max(100).optional(),

  employeeCode: z.string().trim().min(2).max(100).optional(),

  hospitalId: z.string().uuid("Invalid hospital ID").optional(),
});

const updateOperatorSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),

  phone: z.string().trim().min(10).max(20).optional(),

  licenseNumber: z.string().trim().min(3).max(100).optional(),

  employeeCode: z.string().trim().min(2).max(100).optional(),

  hospitalId: z.string().uuid("Invalid hospital ID").nullable().optional(),

  isAvailable: z.boolean().optional(),
});

export const OperatorValidation = {
  createOperatorSchema,
  updateOperatorSchema,
};

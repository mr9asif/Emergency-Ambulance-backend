import { z } from "zod";

const operatorApplicationQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

const approveOperatorApplicationSchema = z.object({
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

// ========================================
// USER MANAGEMENT
// ========================================

const userQuerySchema = z.object({
  search: z.string().trim().optional(),

  role: z.enum(["CUSTOMER", "OPERATOR", "ADMIN"]).optional(),

  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]),
});
export const AdminValidation = {
  operatorApplicationQuerySchema,
  approveOperatorApplicationSchema,
  rejectOperatorApplicationSchema,
  userQuerySchema,
  updateUserStatusSchema,
};

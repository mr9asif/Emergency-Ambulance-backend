import { z } from "zod";

export const createDispatchAssignmentSchema = z.object({
  hospitalId: z.string().uuid("Invalid hospital ID"),
  ambulanceId: z.string().uuid("Invalid ambulance ID"),
  driverId: z.string().uuid("Invalid driver ID"),
});

export const rejectDispatchAssignmentSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(3, "Rejection reason must be at least 3 characters")
    .max(500, "Rejection reason cannot exceed 500 characters"),
});

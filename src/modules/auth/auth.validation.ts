import z from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),

  phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must not exceed 255 characters"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters"),
});

const LoginZodSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, "Password Must Minimum 8 Characters Long.")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
    .regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

    .regex(/[0-9]/, "Password must contain atleast 1 Number")
    .regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
});

const ForgotPasswordZodSchema = z.object({
  email: z.email(),
});

const ResetPasswordZodSchema = z.object({
  email: z.email(),
  newPassword: z
    .string()
    .min(8, "Password Must Minimum 8 Characters Long.")
    .regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
    .regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")

    .regex(/[0-9]/, "Password must contain atleast 1 Number")
    .regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
  otp: z.string().length(6),
});

const PatientEmailVerifyZodSchema = z.object({
  email: z.email("Not email!!"),
  otp: z.string().length(6),
});

export const UserValidation = {
  registerSchema,
  LoginZodSchema,
  ForgotPasswordZodSchema,
  ResetPasswordZodSchema,
  PatientEmailVerifyZodSchema,
};

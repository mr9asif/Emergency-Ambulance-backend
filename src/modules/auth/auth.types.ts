import { UserRole } from "../../generated/prisma/enums.js";

export interface IRegisterPayload {
  name: string;
  phone: string;
  email: string;
  password: string;
}
export interface IVerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ILoginUserPayload {
  email: string;
  password: string;
}
export interface IRequestUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

import { OperatorType } from "../../generated/prisma/client.js";

export interface ICreateOperatorApplication {
  name: string;
  email: string;
  phone: string;
  operatorType: OperatorType;
  licenseNumber?: string;
  employeeCode?: string;
  hospitalId?: string;
}

export interface IVerifyOperatorApplicationEmail {
  email: string;
  otp: string;
}

export interface IApproveOperatorApplication {
  licenseNumber?: string;
  employeeCode?: string;
}

export interface IRejectOperatorApplication {
  rejectionReason: string;
}

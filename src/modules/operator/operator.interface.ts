import { OperatorType } from "../../generated/prisma/client.js";

export interface ICreateOperator {
  name: string;
  email: string;
  phone: string;
  operatorType: OperatorType;
  licenseNumber?: string;
  employeeCode?: string;
  hospitalId?: string;
}

export interface IUpdateOperator {
  name?: string;
  phone?: string;
  licenseNumber?: string;
  employeeCode?: string;
  hospitalId?: string | null;
  isAvailable?: boolean;
}

import { OperatorApplicationStatus } from "../../generated/prisma/client.js";

export interface IApproveOperatorApplication {
  employeeCode?: string;
}

export interface IRejectOperatorApplication {
  rejectionReason: string;
}

export interface IOperatorApplicationQuery {
  status?: OperatorApplicationStatus;
}

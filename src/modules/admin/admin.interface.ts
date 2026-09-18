import { OperatorApplicationStatus } from "../../generated/prisma/client.js";

import { UserRole, UserStatus } from "../../generated/prisma/client.js";

export interface IApproveOperatorApplication {
  employeeCode?: string;
}

export interface IRejectOperatorApplication {
  rejectionReason: string;
}

export interface IOperatorApplicationQuery {
  status?: OperatorApplicationStatus;
}

// ========================================
// USER MANAGEMENT
// ========================================

export interface IUserQuery {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface IUpdateUserStatus {
  status: UserStatus;
}
export interface IApproveOperatorApplication {
  employeeCode?: string;
}

export interface IRejectOperatorApplication {
  rejectionReason: string;
}

export interface IOperatorApplicationQuery {
  status?: OperatorApplicationStatus;
}

// ==================== ADMIN DASHBOARD ====================

export interface IAdminDashboard {
  users: {
    total: number;
    customers: number;
    operators: number;
    admins: number;
  };

  ambulances: {
    total: number;
    available: number;
    busy: number;
    maintenance: number;
  };

  trips: {
    total: number;
    completed: number;
    inProgress: number;
    cancelled: number;
  };
}

import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";

import config from "../../config/index.js";
import { AppError } from "../../error/AppError.js";
import { transporter } from "../../lib/nodemailer.js";
import { prisma } from "../../lib/prisma.js";

import { invitationUtils } from "../../utils/invitation.js";
import {
  IApproveOperatorApplication,
  IOperatorApplicationQuery,
  IRejectOperatorApplication,
} from "./admin.interface.js";

const getAllOperatorApplications = async (query: IOperatorApplicationQuery) => {
  const applications = await prisma.operatorApplication.findMany({
    where: query.status
      ? {
          status: query.status,
        }
      : undefined,

    include: {
      reviewedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return applications;
};

const getOperatorApplicationById = async (applicationId: string) => {
  const application = await prisma.operatorApplication.findUnique({
    where: {
      id: applicationId,
    },

    include: {
      reviewedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, "Operator application not found");
  }

  return application;
};

const approveOperatorApplication = async (
  applicationId: string,
  adminId: string,
  payload: IApproveOperatorApplication,
) => {
  // 1. Find application
  const application = await prisma.operatorApplication.findUnique({
    where: {
      id: applicationId,
    },
  });

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, "Operator application not found");
  }

  // 2. Email must be verified
  if (!application.emailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Applicant email is not verified",
    );
  }

  // 3. Application must be pending
  if (application.status !== "PENDING") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Application is already ${application.status.toLowerCase()}`,
    );
  }

  // 4. Driver must have license
  if (application.operatorType === "DRIVER" && !application.licenseNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Driver license number is missing",
    );
  }

  // 5. Generate secure invitation token
  const rawToken = invitationUtils.generateInvitationToken();

  const tokenHash = invitationUtils.hashInvitationToken(rawToken);

  const expiresAt = new Date(
    Date.now() + invitationUtils.INVITATION_EXPIRATION_HOURS * 60 * 60 * 1000,
  );

  // 6. Update application + create invitation
  const updatedApplication = await prisma.$transaction(async (tx) => {
    const updated = await tx.operatorApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        status: "APPROVED",
        employeeCode: payload.employeeCode,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    await tx.operatorInvitation.create({
      data: {
        email: application.email,
        tokenHash,
        expiresAt,
        status: "PENDING",

        operatorType: application.operatorType,

        name: application.name,
        phone: application.phone,

        licenseNumber: application.licenseNumber,

        employeeCode: payload.employeeCode,

        invitedBy: adminId,
      },
    });

    return updated;
  });

  // 7. Create invitation link
  const invitationLink = `${config.operator_invitaion_url}?token=${rawToken}`;

  // 8. Send approval + invitation email
  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/operator-application-approved.ejs",
  );

  const templateData = {
    name: updatedApplication.name,
    email: updatedApplication.email,
    operatorType: updatedApplication.operatorType,
    invitationLink,
    expiresAt,
    appName: "Emergency-Ambulance",
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.smtp_sender,
    to: updatedApplication.email,
    subject: "Your Emergency Ambulance operator application has been approved",
    html,
  });

  return updatedApplication;
};

const rejectOperatorApplication = async (
  applicationId: string,
  adminId: string,
  payload: IRejectOperatorApplication,
) => {
  // 1. Find application
  const application = await prisma.operatorApplication.findUnique({
    where: {
      id: applicationId,
    },
  });

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, "Operator application not found");
  }

  // 2. Application must be pending
  if (application.status !== "PENDING") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Application is already ${application.status.toLowerCase()}`,
    );
  }

  // 3. Update application
  const updatedApplication = await prisma.operatorApplication.update({
    where: {
      id: applicationId,
    },

    data: {
      status: "REJECTED",
      rejectionReason: payload.rejectionReason,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  // 4. Send rejection email
  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/operator-application-rejected.ejs",
  );

  const templateData = {
    name: updatedApplication.name,
    email: updatedApplication.email,
    operatorType: updatedApplication.operatorType,
    rejectionReason: updatedApplication.rejectionReason,
    appName: "Emergency-Ambulance",
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.smtp_sender,
    to: updatedApplication.email,
    subject: "Update regarding your Emergency Ambulance operator application",
    html,
  });

  return updatedApplication;
};

const getAllOperators = async () => {
  const operators = await prisma.operatorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          isDeleted: true,
          createdAt: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return operators;
};

const getOperatorById = async (operatorId: string) => {
  const operator = await prisma.operatorProfile.findUnique({
    where: {
      id: operatorId,
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          isDeleted: true,
          createdAt: true,
        },
      },
    },
  });

  if (!operator) {
    throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
  }

  return operator;
};

export const adminService = {
  getAllOperatorApplications,
  getOperatorApplicationById,
  approveOperatorApplication,
  rejectOperatorApplication,
  getAllOperators,
  getOperatorById,
};

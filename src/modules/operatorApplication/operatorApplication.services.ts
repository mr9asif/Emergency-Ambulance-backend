import httpStatus from "http-status";

import { AppError } from "../../error/AppError.js";
import { transporter } from "../../lib/nodemailer.js";
import { prisma } from "../../lib/prisma.js";

import config from "../../config/index.js";

import ejs from "ejs";
import path from "path";

import {
  ICreateOperatorApplication,
  IVerifyOperatorApplicationEmail,
} from "./operatorApplication.interface.js";

import { otpUtils } from "../../utils/otp.js";

const createOperatorApplication = async (
  payload: ICreateOperatorApplication,
) => {
  const email = payload.email.trim().toLowerCase();

  // 1. Check existing user
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An account with this email already exists",
    );
  }

  // 2. Check existing application
  const existingApplication = await prisma.operatorApplication.findUnique({
    where: {
      email,
    },
  });

  if (existingApplication) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An operator application with this email already exists",
    );
  }

  // 3. Create operator application
  const application = await prisma.operatorApplication.create({
    data: {
      name: payload.name,
      email,
      phone: payload.phone,
      operatorType: payload.operatorType,
      emailVerified: false,
      status: "PENDING",
    },
  });

  // 4. Generate OTP
  const otp = otpUtils.generateOtp();

  // 5. Redis key
  const otpKey = `verify-operator-application=${email}`;

  // 6. Save OTP in Redis
  await otpUtils.setOtp(otpKey, otp, otpUtils.OTP_EXPIRATION_SECONDS);

  // 7. Email template
  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/verify-email.ejs",
  );

  const templateData = {
    name: application.name,
    email,
    otp,
    expiryTime: otpUtils.OTP_EXPIRATION_SECONDS / 60,
    appName: "Emergency-Ambulance",
  };

  const html = await ejs.renderFile(templatePath, templateData);

  // 8. Send verification email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: email,
    subject: "Verify your operator application",
    html,
  });

  // 9. Return application information
  return {
    id: application.id,
    name: application.name,
    email: application.email,
    operatorType: application.operatorType,
    status: application.status,
    emailVerified: application.emailVerified,
  };
};
// verify otp
const verifyOperatorApplicationEmail = async (
  payload: IVerifyOperatorApplicationEmail,
) => {
  const email = payload.email.trim().toLowerCase();

  // 1. Find application
  const application = await prisma.operatorApplication.findUnique({
    where: {
      email,
    },
  });

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, "Operator application not found");
  }

  // 2. Already verified?
  if (application.emailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  // 3. Redis OTP key
  const otpKey = `verify-operator-application=${email}`;

  // 4. Get OTP
  const savedOtp = await otpUtils.getOtp(otpKey);

  if (!savedOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP expired or not found");
  }

  // 5. Compare OTP
  if (payload.otp !== savedOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP doesn't match. Try again.");
  }

  // 6. Update application
  const updatedApplication = await prisma.operatorApplication.update({
    where: {
      id: application.id,
    },
    data: {
      emailVerified: true,
    },
  });

  // 7. Delete OTP
  await otpUtils.deleteOtp(otpKey);

  // 7. Render application-under-review email
  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/operator-application-verify.ejs",
  );

  const templateData = {
    name: updatedApplication.name,
    email: updatedApplication.email,
    operatorType: updatedApplication.operatorType,
    appName: "Emergency-Ambulance",
  };

  const html = await ejs.renderFile(templatePath, templateData);

  // 8. Send under-review email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: updatedApplication.email,
    subject: "Your operator application is under review",
    html,
  });

  return {
    id: updatedApplication.id,
    email: updatedApplication.email,
    emailVerified: updatedApplication.emailVerified,
    status: updatedApplication.status,
    message:
      "Your application is now under review. We will contact you after the admin review.",
  };
};

export const operatorApplicationService = {
  createOperatorApplication,
  verifyOperatorApplicationEmail,
};

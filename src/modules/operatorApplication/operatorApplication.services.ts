import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";

import config from "../../config/index.js";
import { AppError } from "../../error/AppError.js";
import { transporter } from "../../lib/nodemailer.js";
import { prisma } from "../../lib/prisma.js";
import { reddisClient } from "../../lib/reddis.js";
import { otpUtils } from "../../utils/otp.js";

import {
  ICreateOperatorApplication,
  IVerifyOperatorApplicationEmail,
} from "./operatorApplication.interface.js";

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

  // 3. Driver must provide license number
  if (payload.operatorType === "DRIVER" && !payload.licenseNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "License number is required for driver",
    );
  }

  // 4. Generate OTP
  const otp = otpUtils.generateOtp();

  // 5. Redis keys
  const otpKey = `verify-operator-application=${email}`;

  const applicationDataKey = `operator-application-data=${email}`;

  // 6. Save OTP in Redis
  await otpUtils.setOtp(otpKey, otp, otpUtils.OTP_EXPIRATION_SECONDS);

  // 7. Save ALL application data in Redis
  const applicationData: ICreateOperatorApplication = {
    name: payload.name,
    email,
    phone: payload.phone,
    operatorType: payload.operatorType,
    licenseNumber: payload.licenseNumber,
  };

  await reddisClient.set(applicationDataKey, JSON.stringify(applicationData), {
    expiration: {
      type: "EX",
      value: otpUtils.OTP_EXPIRATION_SECONDS,
    },
  });

  // 8. Email template
  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/verify-email.ejs",
  );

  const templateData = {
    name: payload.name,
    email,
    otp,
    expiryTime: otpUtils.OTP_EXPIRATION_SECONDS / 60,
    appName: "Emergency-Ambulance",
  };

  const html = await ejs.renderFile(templatePath, templateData);

  // 9. Send verification email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: email,
    subject: "Verify your operator application",
    html,
  });

  // 10. Return temporary information
  return {
    name: payload.name,
    email,
    phone: payload.phone,
    operatorType: payload.operatorType,
    licenseNumber: payload.licenseNumber,
    message: "Application submitted successfully. Please verify your email.",
  };
};

const verifyOperatorApplicationEmail = async (
  payload: IVerifyOperatorApplicationEmail,
) => {
  const email = payload.email.trim().toLowerCase();

  // 1. Redis keys
  const otpKey = `verify-operator-application=${email}`;

  const applicationDataKey = `operator-application-data=${email}`;

  // 2. Get OTP
  const savedOtp = await otpUtils.getOtp(otpKey);

  if (!savedOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP expired or not found");
  }

  // 3. Compare OTP
  if (payload.otp !== savedOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP doesn't match. Try again.");
  }

  // 4. Get application data from Redis
  const applicationDataValue = await reddisClient.get(applicationDataKey);

  if (!applicationDataValue) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Application data expired. Please submit the application again.",
    );
  }

  const applicationData: ICreateOperatorApplication =
    JSON.parse(applicationDataValue);

  // 5. Double-check existing application
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

  // 6. Create application in database
  const application = await prisma.operatorApplication.create({
    data: {
      name: applicationData.name,
      email: applicationData.email,
      phone: applicationData.phone,
      operatorType: applicationData.operatorType,
      licenseNumber: applicationData.licenseNumber,
      emailVerified: true,
    },
  });

  // 7. Delete Redis data
  await otpUtils.deleteOtp(otpKey);
  await reddisClient.del(applicationDataKey);

  // 8. Render under-review email
  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/operator-application-verify.ejs",
  );

  const templateData = {
    name: application.name,
    email: application.email,
    operatorType: application.operatorType,
    appName: "Emergency-Ambulance",
  };

  const html = await ejs.renderFile(templatePath, templateData);

  // 9. Send under-review email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: application.email,
    subject: "Your operator application is under review",
    html,
  });

  // 10. Return response
  return {
    id: application.id,
    name: application.name,
    email: application.email,
    phone: application.phone,
    operatorType: application.operatorType,
    licenseNumber: application.licenseNumber,
    emailVerified: application.emailVerified,
    status: application.status,
    message:
      "Your email has been verified successfully. Your application is now under review.",
  };
};

export const operatorApplicationService = {
  createOperatorApplication,
  verifyOperatorApplicationEmail,
};

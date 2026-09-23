import bcrypt from "bcrypt";
import crypto from "crypto";
import ejs from "ejs";
import httpsStatus from "http-status";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
import config from "../../config/index.js";

import { UserStatus } from "../../generated/prisma/enums.js";

import { AppError } from "../../error/AppError.js";
import cloudinary from "../../lib/cloudinary.js";
import { transporter } from "../../lib/nodemailer.js";
import { prisma } from "../../lib/prisma.js";
import { reddisClient } from "../../lib/reddis.js";
import { uploadToCloudinary } from "../../utils/cloudinary.js";
import { verifyGoogleIdToken } from "../../utils/google.js";
import { invitationUtils } from "../../utils/invitation.js";
import { jwtUtils } from "../../utils/jwt.js";
import { otpUtils } from "../../utils/otp.js";
import {
  IGoogleLoginPayload,
  ILoginUserPayload,
  IRegisterPayload,
  IRequestUser,
  ISetOperatorPassword,
  IVerifyEmailPayload,
} from "./auth.types.js";

const registerUser = async (payload: IRegisterPayload) => {
  const { name, phone, email, password } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist) {
    throw new AppError(
      409,
      "User already exists, please log in to your account.",
    );
  }

  const hashPassword = await bcrypt.hash(password, 8);

  console.log("hash", hashPassword);

  const expirationSeconds = 5 * 60;

  // Save temporary data in Redis for email verification
  const registerDataPayload = {
    name,
    phone,
    email,
    password: hashPassword,
  };

  const otp = crypto.randomInt(100000, 1000000).toString();

  const otpkey = `verify-otp-key=${email}`;
  const registerVerifyEmailKey = `verify-user-registration=${email}`;

  await reddisClient.set(otpkey, otp, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  await reddisClient.set(
    registerVerifyEmailKey,
    JSON.stringify(registerDataPayload),
    {
      expiration: {
        type: "EX",
        value: expirationSeconds,
      },
    },
  );

  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/verify-email.ejs",
  );

  const templateData = {
    name,
    email,
    otp,
    expiryTime: expirationSeconds / 60,
    appName: "Emergency-Ambulance",
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.smtp_sender,
    to: email,
    subject: "verify email to register account",
    html,
  });
};

const verifyRegisterPatiend = async (payload: IVerifyEmailPayload) => {
  const email = payload.email.trim().toLowerCase();
  const otp = payload.otp;

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist) {
    throw new AppError(409, "User already exists");
  }

  const otpkey = `verify-otp-key=${email}`;
  const registerVerifyEmailKey = `verify-user-registration=${email}`;

  const otpValue = await reddisClient.get(otpkey);
  const registerUserData = await reddisClient.get(registerVerifyEmailKey);

  if (!otpValue) {
    throw new AppError(400, "OTP is invalid or expired");
  }

  if (!registerUserData) {
    throw new AppError(400, "Registration data has expired");
  }

  if (otp !== otpValue) {
    throw new AppError(400, "OTP doesn't match. Try again.");
  }

  const UserPayload: IRegisterPayload = JSON.parse(registerUserData);

  const createdUser = await prisma.user.create({
    data: {
      name: UserPayload.name,
      phone: UserPayload.phone,
      email: UserPayload.email,
      passwordHash: UserPayload.password,
      emailVerified: true,
    },
    omit: { passwordHash: true },
  });

  await reddisClient.del(otpkey);
  await reddisClient.del(registerVerifyEmailKey);

  const tempatePath = path.join(
    process.cwd(),
    "src/modules/template/welcome-email.ejs",
  );

  const templateData = {
    name: createdUser.name,
    appName: "PH-Healthcare",
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.smtp_sender,
    to: email,
    subject: "Welcome To Emergency Amublance System",
    html,
  });

  const { ...user } = createdUser;

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { password } = payload;
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.emailVerified === false) {
    throw new AppError(403, "User email is not verified");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(403, "User is blocked");
  }

  if (user.isDeleted) {
    throw new AppError(403, "User is deleted");
  }

  if (user.passwordHash === null && user.googleId !== null) {
    throw new AppError(
      400,
      "User already has an account registered with Google. Try to login with Google.",
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.passwordHash as string,
  );

  if (!isPasswordMatched) {
    throw new AppError(401, "Invalid credentials");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(
    token,
    config.jwt_refresh_secret,
  );

  if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
    throw new AppError(
      401,
      config.node_env === "development"
        ? verifiedRefreshToken.error
        : "Invalid refresh token",
    );
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new AppError(401, "User is inactive or not found");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};
const getMe = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    include: {
      patients: true,
    },
    omit: {
      passwordHash: true,
    },
  });

  if (!isUserExists) {
    throw new Error("User not found");
  }

  return isUserExists;
};

const setOperatorPassword = async (
  token: string,
  payload: ISetOperatorPassword,
) => {
  // 1. Hash token received from URL
  const tokenHash = invitationUtils.hashInvitationToken(token);

  // 2. Find invitation
  const invitation = await prisma.operatorInvitation.findUnique({
    where: {
      tokenHash,
    },
  });

  // 3. Invalid token
  if (!invitation) {
    throw new AppError(httpsStatus.NOT_FOUND, "Invalid invitation token");
  }

  // 4. Check invitation status
  if (invitation.status !== "PENDING") {
    throw new AppError(
      httpsStatus.BAD_REQUEST,
      "Invitation is no longer valid",
    );
  }

  // 5. Check expiration
  if (invitation.expiresAt < new Date()) {
    throw new AppError(httpsStatus.GONE, "Invitation link has expired");
  }

  // 6. Hash password
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  // 7. Create operator account
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: invitation.name,
        email: invitation.email,
        phone: invitation.phone,
        passwordHash: hashedPassword,
        role: "OPERATOR",
        emailVerified: true,

        operatorProfile: {
          create: {
            employeeCode: invitation.employeeCode,
            operatorType: invitation.operatorType,
            licenseNumber: invitation.licenseNumber,
          },
        },
      },

      include: {
        operatorProfile: true,
      },
    });

    await tx.operatorInvitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "USED",
        acceptedAt: new Date(),
      },
    });

    return user;
  });

  // 9. Don't return password
  return {
    id: result.id,
    name: result.name,
    email: result.email,
    phone: result.phone,
    role: result.role,
    employeeCode: result.operatorProfile?.employeeCode,
  };
};

// forget passwod
// const forgotPassword = async (email: string) => {
//   const normalizedEmail = email.trim().toLowerCase();

//   const user = await prisma.user.findUnique({
//     where: {
//       email: normalizedEmail,
//     },
//   });

//   // Don't reveal whether the email exists
//   if (!user) {
//     return;
//   }

//   if (user.isDeleted) {
//     return;
//   }

//   if (user.status === UserStatus.BLOCKED) {
//     return;
//   }

//   // Generate OTP
//   const otp = otpUtils.generateOtp();

//   // Redis key
//   const otpKey = `forgot-password-otp=${normalizedEmail}`;

//   // Store OTP for 5 minutes
//   await otpUtils.setOtp(otpKey, otp, otpUtils.OTP_EXPIRATION_SECONDS);

//   // Email template
//   const templatePath = path.join(
//     process.cwd(),
//     "src/modules/template/forget-password.ejs",
//   );

//   const templateData = {
//     name: user.name,
//     email: normalizedEmail,
//     otp,
//     expiryTime: otpUtils.OTP_EXPIRATION_SECONDS / 60,
//     appName: "Emergency-Ambulance",
//   };

//   const html = await ejs.renderFile(templatePath, templateData);

//   await transporter.sendMail({
//     from: config.smtp_sender,
//     to: normalizedEmail,
//     subject: "Reset your Emergency Ambulance password",
//     html,
//   });
// };

// foget pass
const forgotPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  // Don't reveal whether the email exists
  if (!user) {
    return;
  }

  if (user.isDeleted) {
    return;
  }

  if (user.status === UserStatus.BLOCKED) {
    return;
  }

  // Generate OTP
  const otp = otpUtils.generateOtp();

  // Redis key
  const otpKey = `forgot-password-otp=${normalizedEmail}`;

  // Store OTP for 5 minutes
  await otpUtils.setOtp(otpKey, otp, otpUtils.OTP_EXPIRATION_SECONDS);

  // Email template
  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/forget-password.ejs",
  );

  const templateData = {
    name: user.name,
    email: normalizedEmail,
    otp,
    expiryTime: otpUtils.OTP_EXPIRATION_SECONDS / 60,
    appName: "Emergency-Ambulance",
  };

  const html = await ejs.renderFile(templatePath, templateData);

  console.log("📧 Sending password reset email...");

  await transporter.sendMail({
    from: config.smtp_sender,
    to: normalizedEmail,
    subject: "Reset your Emergency Ambulance password",
    html,
  });

  console.log("✅ Password reset email sent");
};

// reset pass`
const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  // 1. Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  // 2. Find user
  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new AppError(httpsStatus.NOT_FOUND, "Invalid email or OTP");
  }

  // 3. Check deleted account
  if (user.isDeleted) {
    throw new AppError(
      httpsStatus.BAD_REQUEST,
      "This account is no longer available",
    );
  }

  // 4. Check blocked account
  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpsStatus.FORBIDDEN, "Your account is blocked");
  }

  // 5. Redis OTP key
  const otpKey = `forgot-password-otp=${normalizedEmail}`;

  // 6. Get OTP from Redis
  const storedOtp = await otpUtils.getOtp(otpKey);

  // 7. Check OTP exists / expired
  if (!storedOtp) {
    throw new AppError(
      httpsStatus.BAD_REQUEST,
      "OTP has expired or is invalid",
    );
  }

  // 8. Compare OTP
  if (storedOtp !== otp) {
    throw new AppError(httpsStatus.BAD_REQUEST, "Invalid OTP");
  }

  // 9. Hash new password
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  // 10. Update password
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash: hashedPassword,
    },
  });

  // 11. Delete OTP so it cannot be reused
  await otpUtils.deleteOtp(otpKey);

  // 12. Prepare password changed email
  const templatePath = path.join(
    process.cwd(),
    "src/modules/template/password-changed.ejs",
  );

  const templateData = {
    name: user.name,
    email: normalizedEmail,
    appName: "Emergency-Ambulance",
  };

  // 13. Render email template
  const html = await ejs.renderFile(templatePath, templateData);

  // 14. Send confirmation email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: normalizedEmail,
    subject: "Your password has been changed",
    html,
  });
};

const uploadProfileImage = async (
  userId: string,
  file: Express.Multer.File,
) => {
  // 1. Find user
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError(httpsStatus.NOT_FOUND, "User not found");
  }

  // 2. Check account status
  if (user.isDeleted) {
    throw new AppError(
      httpsStatus.BAD_REQUEST,
      "This account is no longer available",
    );
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(httpsStatus.FORBIDDEN, "Your account is blocked");
  }

  // 3. Upload new image to Cloudinary
  const uploadResult = await uploadToCloudinary(
    file.buffer,
    "emergency-ambulance/profile-images",
  );

  // 4. Delete old image from Cloudinary
  if (user.profileImageKey) {
    try {
      await cloudinary.uploader.destroy(user.profileImageKey, {
        resource_type: "image",
      });
    } catch (error) {
      console.error("Failed to delete old profile image:", error);
    }
  }

  // 5. Update database
  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      profileImage: uploadResult.secure_url,
      profileImageKey: uploadResult.public_id,
    },
    omit: {
      passwordHash: true,
    },
  });

  return updatedUser;
};

// google login
const googleLogin = async (payload: IGoogleLoginPayload) => {
  const googlePayload = await verifyGoogleIdToken(payload.idToken);

  const googleId = googlePayload.sub;
  const email = googlePayload.email?.trim().toLowerCase();
  const name = googlePayload.name;

  if (!googleId || !email) {
    throw new AppError(
      httpsStatus.BAD_REQUEST,
      "Invalid Google account information",
    );
  }

  if (!googlePayload.email_verified) {
    throw new AppError(httpsStatus.BAD_REQUEST, "Google email is not verified");
  }

  // 1. Check if Google account already exists
  const existingGoogleUser = await prisma.user.findUnique({
    where: {
      googleId,
    },
  });

  if (existingGoogleUser) {
    if (existingGoogleUser.isDeleted) {
      throw new AppError(
        httpsStatus.BAD_REQUEST,
        "This account is no longer available",
      );
    }

    if (existingGoogleUser.status === UserStatus.BLOCKED) {
      throw new AppError(httpsStatus.FORBIDDEN, "Your account is blocked");
    }

    const jwtPayload = {
      userId: existingGoogleUser.id,
      name: existingGoogleUser.name,
      email: existingGoogleUser.email,
      role: existingGoogleUser.role,
    };

    const accessToken = jwtUtils.createToken(
      jwtPayload,
      config.jwt_access_secret,
      config.jwt_access_expires_in as SignOptions,
    );

    const refreshToken = jwtUtils.createToken(
      jwtPayload,
      config.jwt_refresh_secret,
      config.jwt_refresh_expires_in as SignOptions,
    );

    return {
      isNewUser: false,
      accessToken,
      refreshToken,
    };
  }

  // 2. Check if this email already belongs to another account
  const existingEmailUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingEmailUser) {
    throw new AppError(
      httpsStatus.CONFLICT,
      "This email is already registered. Please login using your email and password.",
    );
  }

  // 3. New Google user needs phone number
  if (!payload.phone) {
    return {
      isNewUser: true,
      requiresPhone: true,
      email,
      name,
    };
  }

  // 4. Check phone uniqueness
  const existingPhoneUser = await prisma.user.findUnique({
    where: {
      phone: payload.phone,
    },
  });

  if (existingPhoneUser) {
    throw new AppError(
      httpsStatus.CONFLICT,
      "This phone number is already registered",
    );
  }

  // 5. Create Google user
  const newUser = await prisma.user.create({
    data: {
      name: name || "Google User",
      phone: payload.phone,
      email,
      googleId,
      authProvider: "GOOGLE",
      emailVerified: true,
      passwordHash: null,
    },
    omit: {
      passwordHash: true,
    },
  });

  // 6. Generate JWT
  const jwtPayload = {
    userId: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    isNewUser: true,
    requiresPhone: false,
    accessToken,
    refreshToken,
    user: newUser,
  };
};

export const authService = {
  registerUser,
  verifyRegisterPatiend,
  loginUser,
  refreshToken,
  getMe,
  setOperatorPassword,
  forgotPassword,
  resetPassword,
  uploadProfileImage,
  googleLogin,
};

import bcrypt from "bcrypt";
import crypto from "crypto";
import ejs from "ejs";
import { SignOptions } from "jsonwebtoken";
import path from "path";
import config from "../../config/index.js";
import { transporter } from "../../lib/nodemailer.js";
import { prisma } from "../../lib/prisma.js";
import { reddisClient } from "../../lib/reddis.js";
import { jwtUtils } from "../../utils/jwt.js";
import { IRegisterPayload, IVerifyEmailPayload } from "./auth.types.js";

const registerUser = async (payload: IRegisterPayload) => {
  const { name, phone, email, password } = payload;
  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist) {
    throw new Error("user already exist, please logged in to your account.");
  }

  const hashPassword = await bcrypt.hash(password, 8);
  console.log("hash", hashPassword);
  const expirationSeconds = 5 * 60;
  // save temperory in reddis for verify email
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
    throw new Error("User already exit");
  }

  const otpkey = `verify-otp-key=${email}`;
  const registerVerifyEmailKey = `verify-user-registration=${email}`;

  const otpValue = await reddisClient.get(otpkey);
  const registerUserData = await reddisClient.get(registerVerifyEmailKey);

  if (!otpValue) {
    throw new Error("otp invalid");
  }

  if (!registerUserData) {
    throw new Error("user data not exit");
  }

  if (otp !== otpValue) {
    throw new Error("OTP doesn't match. try again.");
  }

  const UserPayload: IRegisterPayload = JSON.parse(registerUserData);
  const createdUser = await prisma.user.create({
    data: {
      name: UserPayload.name,
      phone: UserPayload.phone,
      email: UserPayload.email,
      passwordHash: UserPayload.password,
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
    // text : `Your OTP is ${otp}`
    // html: `<h1>Your OTP is ${otp}</h1>`
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
export const authService = {
  registerUser,
  verifyRegisterPatiend,
};

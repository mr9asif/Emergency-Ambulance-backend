import bcrypt from "bcrypt";
import crypto from "crypto";
import ejs from "ejs";
import path from "path";
import config from "../../config/index.js";
import { transporter } from "../../lib/nodemailer.js";
import { prisma } from "../../lib/prisma.js";
import { reddisClient } from "../../lib/reddis.js";
import { registerPayload } from "./auth.types.js";

const registerUser = async (payload: registerPayload) => {
  const { name, phone, email, password } = payload;
  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist) {
    throw new Error("user already exist, please logged in to your account.");
  }

  const hashPassword = bcrypt.hash(password, 8);
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
    appName: "PH-Healthcare",
  };
  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.smtp_sender,
    to: email,
    subject: "verify email to register account",
    html,
  });
};

export const authService = {
  registerUser,
};

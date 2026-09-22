import nodemailer from "nodemailer";
import type { Options } from "nodemailer/lib/smtp-transport/index.js";

import config from "../config/index.js";

const smtpConfig: Options = {
  host: config.smtp_host,
  port: Number(config.smtp_port),
  secure: false,

  auth: {
    user: config.smtp_user,
    pass: config.smtp_password,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
};

export const transporter = nodemailer.createTransport(smtpConfig);

transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP server is ready");
  }
});

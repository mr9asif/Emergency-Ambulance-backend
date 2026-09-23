import nodemailer from "nodemailer";

import type { Options } from "nodemailer/lib/smtp-transport/index.js";

import config from "../config/index.js";

const smtpConfig: Options = {
  host: config.smtp_host,
  port: Number(config.smtp_port),
  secure: Number(config.smtp_port) === 465,

  auth: {
    user: config.smtp_user,
    pass: config.smtp_password,
  },
};

export const transporter = nodemailer.createTransport(smtpConfig);

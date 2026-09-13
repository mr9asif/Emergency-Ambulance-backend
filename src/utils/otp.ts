import crypto from "crypto";
import { reddisClient } from "../lib/reddis.js";

const OTP_EXPIRATION_SECONDS = 5 * 60;

const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

const setOtp = async (
  key: string,
  otp: string,
  expirationSeconds = OTP_EXPIRATION_SECONDS,
) => {
  await reddisClient.set(key, otp, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });
};

const getOtp = async (key: string) => {
  return reddisClient.get(key);
};

const deleteOtp = async (key: string) => {
  await reddisClient.del(key);
};

export const otpUtils = {
  generateOtp,
  setOtp,
  getOtp,
  deleteOtp,
  OTP_EXPIRATION_SECONDS,
};

import crypto from "crypto";

const INVITATION_EXPIRATION_HOURS = 24;

const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

const hashInvitationToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const invitationUtils = {
  generateInvitationToken,
  hashInvitationToken,
  INVITATION_EXPIRATION_HOURS,
};

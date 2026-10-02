import { TokenPayload } from "google-auth-library";

import config from "../config/index.js";
import { AppError } from "../error/AppError.js";
import { googleClient } from "../lib/google.js";

export const verifyGoogleIdToken = async (
  idToken: string,
): Promise<TokenPayload> => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google_client_id,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new AppError(401, "Invalid Google ID token");
    }

    return payload;
  } catch {
    throw new AppError(401, "Invalid Google ID token");
  }
};

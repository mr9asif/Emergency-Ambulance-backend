import { Server, Socket } from "socket.io";

import config from "../config/index.js";
import { UserRole } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { jwtUtils } from "../utils/jwt.js";

interface SocketUser {
  email: string;
  name: string;
  userId: string;
  role: UserRole;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

export const initializeSocket = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // ==========================================
  // SOCKET AUTHENTICATION
  // ==========================================

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Get token from Socket.IO handshake
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Authentication required. Access token is missing."),
        );
      }

      // Verify JWT using the same JWT utility
      const verifiedToken = jwtUtils.verifyToken(
        token,
        config.jwt_access_secret,
      );

      if (!verifiedToken.success) {
        return next(new Error("Invalid or expired access token."));
      }

      const { email, name, userId, role } = verifiedToken.data as {
        email: string;
        name: string;
        userId: string;
        role: UserRole;
      };

      // Check user exists in database
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
          email,
          name,
          role,
        },
      });

      if (!user) {
        return next(new Error("User not found. Please log in again."));
      }

      // Check blocked user
      if (user.status === "BLOCKED") {
        return next(
          new Error("Your account has been blocked. Please contact support."),
        );
      }

      // Attach authenticated user to socket
      socket.user = {
        email,
        name,
        userId,
        role,
      };

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);

      next(new Error("Socket authentication failed."));
    }
  });

  // ==========================================
  // CONNECTION
  // ==========================================

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log("Socket connected:", socket.id);

    console.log("Socket user:", socket.user);

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

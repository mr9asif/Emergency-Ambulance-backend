import { Server, Socket } from "socket.io";

import config from "../config/index.js";
import { TripStatus, UserRole } from "../generated/prisma/enums.js";
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

// Store Socket.IO instance
let io: Server;

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }

  return io;
};

export const initializeSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // ==========================================
  // SOCKET AUTHENTICATION
  // ==========================================

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(
          new Error("Authentication required. Access token is missing."),
        );
      }

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

      if (user.status === "BLOCKED") {
        return next(
          new Error("Your account has been blocked. Please contact support."),
        );
      }

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
  // SOCKET CONNECTION
  // ==========================================

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log("Socket connected:", socket.id);

    const user = socket.user;

    console.log("Socket user:", user);

    // ========================================
    // USER PRIVATE ROOM
    // ========================================

    if (user) {
      const userRoom = `user:${user.userId}`;

      socket.join(userRoom);

      console.log(`Socket ${socket.id} joined user room: ${userRoom}`);
    }

    // ========================================
    // TRIP ROOM
    // ========================================

    socket.on("trip:join", async (tripId: string) => {
      try {
        if (!user) {
          return socket.emit("trip:join_error", {
            message: "Socket authentication required.",
          });
        }

        // ------------------------------
        // 1. Validate trip ID
        // ------------------------------

        if (!tripId) {
          return socket.emit("trip:join_error", {
            message: "Trip ID is required.",
          });
        }

        // ------------------------------
        // 2. Find trip
        // ------------------------------

        const trip = await prisma.trip.findUnique({
          where: {
            id: tripId,
          },
          select: {
            id: true,
            status: true,

            emergencyRequest: {
              select: {
                customerId: true,
              },
            },

            driver: {
              select: {
                userId: true,
              },
            },
          },
        });

        // ------------------------------
        // 3. Trip must exist
        // ------------------------------

        if (!trip) {
          return socket.emit("trip:join_error", {
            message: "Trip not found.",
          });
        }

        // ------------------------------
        // 4. Trip must be active
        // ------------------------------

        if (trip.status !== TripStatus.IN_PROGRESS) {
          return socket.emit("trip:join_error", {
            message: "Trip tracking is not active yet.",
          });
        }

        // ------------------------------
        // 5. Check authorization
        // ------------------------------

        const isCustomer =
          user.role === UserRole.CUSTOMER &&
          trip.emergencyRequest.customerId === user.userId;

        const isDriver =
          user.role === UserRole.OPERATOR && trip.driver.userId === user.userId;

        // ------------------------------
        // 6. Reject unauthorized user
        // ------------------------------

        if (!isCustomer && !isDriver) {
          return socket.emit("trip:join_error", {
            message: "You are not authorized to join this trip.",
          });
        }

        // ------------------------------
        // 7. Join trip room
        // ------------------------------

        const tripRoom = `trip:${tripId}`;

        socket.join(tripRoom);

        console.log(`User ${user.userId} joined trip room: ${tripRoom}`);

        // ------------------------------
        // 8. Success
        // ------------------------------

        socket.emit("trip:joined", {
          tripId,
          room: tripRoom,
        });
      } catch (error) {
        console.error("Trip room join error:", error);

        socket.emit("trip:join_error", {
          message: "Failed to join trip.",
        });
      }
    });

    // ========================================
    // DISCONNECT
    // ========================================

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id);

      console.log("Reason:", reason);
    });
  });

  return io;
};

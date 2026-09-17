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

interface LocationUpdate {
  tripId: string;
  latitude: number;
  longitude: number;
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
    // GPS LOCATION UPDATE
    // ========================================

    socket.on("location:update", async (data: LocationUpdate) => {
      try {
        // ------------------------------
        // 1. Authentication check
        // ------------------------------

        if (!user) {
          return socket.emit("location:update_error", {
            message: "Socket authentication required.",
          });
        }

        // ------------------------------
        // 2. Only driver can send location
        // ------------------------------

        if (user.role !== UserRole.OPERATOR) {
          return socket.emit("location:update_error", {
            message: "Only the ambulance driver can send location.",
          });
        }

        // ------------------------------
        // 3. Validate payload
        // ------------------------------

        if (!data) {
          return socket.emit("location:update_error", {
            message: "Location data is required.",
          });
        }

        const { tripId, latitude, longitude } = data;

        if (!tripId) {
          return socket.emit("location:update_error", {
            message: "Trip ID is required.",
          });
        }

        if (typeof latitude !== "number" || typeof longitude !== "number") {
          return socket.emit("location:update_error", {
            message: "Latitude and longitude must be numbers.",
          });
        }

        // ------------------------------
        // 4. Validate latitude
        // ------------------------------

        if (latitude < -90 || latitude > 90) {
          return socket.emit("location:update_error", {
            message: "Latitude must be between -90 and 90.",
          });
        }

        // ------------------------------
        // 5. Validate longitude
        // ------------------------------

        if (longitude < -180 || longitude > 180) {
          return socket.emit("location:update_error", {
            message: "Longitude must be between -180 and 180.",
          });
        }

        // ------------------------------
        // 6. Find trip
        // ------------------------------

        const trip = await prisma.trip.findUnique({
          where: {
            id: tripId,
          },
          select: {
            id: true,
            status: true,

            driver: {
              select: {
                userId: true,
              },
            },
          },
        });

        // ------------------------------
        // 7. Trip must exist
        // ------------------------------

        if (!trip) {
          return socket.emit("location:update_error", {
            message: "Trip not found.",
          });
        }

        // ------------------------------
        // 8. Trip must be in progress
        // ------------------------------

        if (trip.status !== TripStatus.IN_PROGRESS) {
          return socket.emit("location:update_error", {
            message: "Trip tracking is not active.",
          });
        }

        // ------------------------------
        // 9. Verify driver belongs to trip
        // ------------------------------

        if (trip.driver.userId !== user.userId) {
          return socket.emit("location:update_error", {
            message: "You are not the driver assigned to this trip.",
          });
        }

        // ------------------------------
        // 10. Broadcast location
        // ------------------------------

        const tripRoom = `trip:${tripId}`;

        io.to(tripRoom).emit("trip:location_updated", {
          tripId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `📍 Location update | Trip: ${tripId} | Lat: ${latitude} | Lng: ${longitude}`,
        );
      } catch (error) {
        console.error("Location update error:", error);

        socket.emit("location:update_error", {
          message: "Failed to update location.",
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

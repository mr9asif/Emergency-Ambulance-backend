import { prisma } from "../../lib/prisma.js";
import { getIO } from "../../socket/socket.js";
import type {
  ICreateNotification,
  INotificationQuery,
} from "./notification.interface.js";

// ======================================================
// CREATE NOTIFICATION
// ======================================================

const createNotification = async (payload: ICreateNotification) => {
  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
    },
  });

  return notification;
};

// ======================================================
// CREATE + SEND REAL-TIME NOTIFICATION
// ======================================================

const createAndSendNotification = async (payload: ICreateNotification) => {
  // 1. Save notification to database
  const notification = await createNotification(payload);

  // 2. Get Socket.IO instance
  const io = getIO();

  // 3. Send notification to user's private room
  io.to(`user:${notification.userId}`).emit("notification:new", notification);

  return notification;
};

// ======================================================
// GET MY NOTIFICATIONS
// ======================================================

const getMyNotifications = async (
  userId: string,
  query: INotificationQuery,
) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const skip = (page - 1) * limit;

  const where = {
    userId,

    ...(query.isRead !== undefined && {
      isRead: query.isRead,
    }),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),

    prisma.notification.count({
      where,
    }),
  ]);

  return {
    data: notifications,

    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

// ======================================================
// MARK SINGLE NOTIFICATION AS READ
// ======================================================

const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  const updatedNotification = await prisma.notification.update({
    where: {
      id: notificationId,
    },

    data: {
      isRead: true,
    },
  });

  return updatedNotification;
};

// ======================================================
// MARK ALL NOTIFICATIONS AS READ
// ======================================================

const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },

    data: {
      isRead: true,
    },
  });

  return {
    updatedCount: result.count,
  };
};

// ======================================================
// EXPORT
// ======================================================

export const notificationService = {
  createNotification,
  createAndSendNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};

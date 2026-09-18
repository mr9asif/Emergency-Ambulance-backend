import { InputJsonValue } from "@prisma/client/runtime/client";
import { NotificationType } from "../../generated/prisma/enums.js";

export interface ICreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: InputJsonValue;
}

export interface INotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

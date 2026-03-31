export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message?: string | undefined;
  entityType?: string | undefined;
  entityId?: string | undefined;
  holidayId?: string | undefined;
  fromUserId?: string | undefined;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  fromUser?: {
    id: string;
    name: string | undefined;
    picture: string | undefined;
    email: string | undefined;
  } | undefined;
  holiday?: {
    id: string;
    name: string;
    holidayType: string;
  } | undefined;
}

export interface CreateNotificationRequest {
  userId: string;
  notification: {
    type: string;
    title: string;
    message?: string;
    entityType?: string;
    entityId?: string;
    holidayId?: string;
    fromUserId?: string;
  };
}

export interface NotificationResponse {
  success: boolean;
  sent: boolean;
  message?: string;
}
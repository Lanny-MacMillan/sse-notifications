import { prisma } from '../lib/prisma';
import { connectionManager } from './connections';
import type { CreateNotificationRequest, NotificationResponse, Notification } from '../types';

/**
 * Notification Service
 * Handles notification creation, database operations, and real-time delivery
 */
export class NotificationService {
  
  /**
   * Create a new notification and send it via SSE
   */
  async createAndSendNotification(request: CreateNotificationRequest): Promise<NotificationResponse> {
    try {
      const { userId, notification } = request;

      // create notification in database
      const newNotification = await prisma.notification.create({
        data: {
          userId,
          type: notification.type,
          title: notification.title,
          message: notification.message || null,
          entityType: notification.entityType || null,
          entityId: notification.entityId || null,
          holidayId: notification.holidayId || null,
          fromUserId: notification.fromUserId || null,
        },
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              picture: true,
              email: true,
            },
          },
          holiday: {
            select: {
              id: true,
              name: true,
              holidayType: true,
            },
          },
        },
      });

      // transform to match expected interface
      const notificationData: Notification = {
        id: newNotification.id,
        userId: newNotification.userId,
        type: newNotification.type,
        title: newNotification.title,
        message: newNotification.message ?? undefined,
        entityType: newNotification.entityType ?? undefined,
        entityId: newNotification.entityId ?? undefined,
        holidayId: newNotification.holidayId ?? undefined,
        fromUserId: newNotification.fromUserId ?? undefined,
        isRead: newNotification.isRead,
        isDismissed: newNotification.isDismissed,
        createdAt: newNotification.createdAt,
        fromUser: newNotification.fromUser ? {
          id: newNotification.fromUser.id,
          name: newNotification.fromUser.name ?? undefined,
          picture: newNotification.fromUser.picture ?? undefined,
          email: newNotification.fromUser.email ?? undefined,
        } : undefined,
        holiday: newNotification.holiday ? {
          id: newNotification.holiday.id,
          name: newNotification.holiday.name,
          holidayType: newNotification.holiday.holidayType,
        } : undefined,
      };

      // send via SSE
      const sent = connectionManager.sendNotificationToUser(userId, notificationData);

      console.log(`Notification created: ${newNotification.id}, sent via SSE: ${sent}`);

      return {
        success: true,
        sent,
        message: sent ? 'Notification sent successfully' : 'Notification created but no active connections',
      };

    } catch (error) {
      console.error('Error creating/sending notification:', error);
      return {
        success: false,
        sent: false,
        message: `Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          isRead: false,
          isDismissed: false,
        },
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              picture: true,
              email: true,
            },
          },
          holiday: {
            select: {
              id: true,
              name: true,
              holidayType: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return notifications.map((notification: any): Notification => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message ?? undefined,
        entityType: notification.entityType ?? undefined,
        entityId: notification.entityId ?? undefined,
        holidayId: notification.holidayId ?? undefined,
        fromUserId: notification.fromUserId ?? undefined,
        isRead: notification.isRead,
        isDismissed: notification.isDismissed,
        createdAt: notification.createdAt,
        fromUser: notification.fromUser ? {
          id: notification.fromUser.id,
          name: notification.fromUser.name ?? undefined,
          picture: notification.fromUser.picture ?? undefined,
          email: notification.fromUser.email ?? undefined,
        } : undefined,
        holiday: notification.holiday ? {
          id: notification.holiday.id,
          name: notification.holiday.name,
          holidayType: notification.holiday.holidayType,
        } : undefined,
      }));
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          id: {
            in: notificationIds,
          },
        },
        data: {
          isRead: true,
        },
      });

      return true;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }
  }

  /**
   * Mark notifications as dismissed
   */
  async markAsDismissed(userId: string, notificationIds: string[]): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          id: {
            in: notificationIds,
          },
        },
        data: {
          isDismissed: true,
        },
      });

      return true;
    } catch (error) {
      console.error('Error marking notifications as dismissed:', error);
      return false;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string) {
    try {
      const [unreadCount, totalCount] = await Promise.all([
        prisma.notification.count({
          where: {
            userId,
            isRead: false,
            isDismissed: false,
          },
        }),
        prisma.notification.count({
          where: {
            userId,
            isDismissed: false,
          },
        }),
      ]);

      return {
        unreadCount,
        totalCount,
      };
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return {
        unreadCount: 0,
        totalCount: 0,
      };
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
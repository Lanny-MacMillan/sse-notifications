import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notifications';
import { authenticateApiKey, validateNotificationData } from '../middleware/auth';
import type { CreateNotificationRequest } from '../types';

const router = Router();

/**
 * Send notification endpoint
 * POST /api/notify
 */
router.post('/notify', authenticateApiKey, validateNotificationData, async (req: Request, res: Response) => {
  try {
    const requestData: CreateNotificationRequest = req.body;

    console.log(`Notification request for user: ${requestData.userId}`, {
      type: requestData.notification.type,
      title: requestData.notification.title,
    });

    const result = await notificationService.createAndSendNotification(requestData);

    return res.status(result.success ? 200 : 500).json(result);

  } catch (error) {
    console.error('Error handling notification request:', error);
    return res.status(500).json({
      success: false,
      sent: false,
      message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

/**
 * Get unread notifications endpoint
 * GET /api/notifications/unread?userId=<user_id>
 */
router.get('/notifications/unread', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId query parameter is required',
      });
    }

    const notifications = await notificationService.getUnreadNotifications(userId);
    const stats = await notificationService.getNotificationStats(userId);

    return res.json({
      success: true,
      notifications,
      stats,
    });

  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

/**
 * Mark notifications as read endpoint
 * POST /api/notifications/read
 */
router.post('/notifications/read', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { userId, notificationIds } = req.body;

    if (!userId || !notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId and notificationIds array are required',
      });
    }

    const success = await notificationService.markAsRead(userId, notificationIds);

    return res.json({
      success,
      message: success ? 'Notifications marked as read' : 'Failed to mark notifications as read',
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to mark notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

/**
 * Mark notifications as dismissed endpoint
 * POST /api/notifications/dismiss
 */
router.post('/notifications/dismiss', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { userId, notificationIds } = req.body;

    if (!userId || !notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId and notificationIds array are required',
      });
    }

    const success = await notificationService.markAsDismissed(userId, notificationIds);

    return res.json({
      success,
      message: success ? 'Notifications dismissed' : 'Failed to dismiss notifications',
    });

  } catch (error) {
    console.error('Error dismissing notifications:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to dismiss notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

export default router;
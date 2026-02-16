import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getNotificationService } from '../services/notificationService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

const notificationService = getNotificationService();

// ==================== NOTIFICATION ENDPOINTS ====================

/**
 * GET /api/notifications/unread
 * Get user's unread notifications
 */
export const getUnreadNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const notifications = await notificationService.getUnreadNotifications(userId);

    logger.info('Retrieved unread notifications', {
      context: 'notification.controller.getUnread',
      metadata: { userId, count: notifications.length },
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get unread notifications', {
      context: 'notification.controller.getUnread',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to retrieve notifications' });
  }
};

/**
 * GET /api/notifications
 * Get all user notifications with pagination
 */
export const getUserNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await notificationService.getUserNotifications(userId, limit, offset);

    logger.info('Retrieved user notifications', {
      context: 'notification.controller.getAll',
      metadata: { userId, limit, offset, count: notifications.length },
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Failed to get notifications', {
      context: 'notification.controller.getAll',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to retrieve notifications' });
  }
};

/**
 * POST /api/notifications/:notificationId/read
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      throw new ValidationError('Notification ID is required');
    }

    const success = await notificationService.markAsRead(notificationId);

    if (!success) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    logger.info('Notification marked as read', {
      context: 'notification.controller.markRead',
      metadata: { notificationId },
    });

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    logger.error('Failed to mark notification as read', {
      context: 'notification.controller.markRead',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

/**
 * DELETE /api/notifications/:notificationId
 * Delete a specific notification
 */
export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      throw new ValidationError('Notification ID is required');
    }

    const success = await notificationService.deleteNotification(notificationId);

    if (!success) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    logger.info('Notification deleted', {
      context: 'notification.controller.delete',
      metadata: { notificationId },
    });

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    logger.error('Failed to delete notification', {
      context: 'notification.controller.delete',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};

/**
 * POST /api/notifications/clear-all
 * Clear all user notifications
 */
export const clearAllNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const count = await notificationService.clearAllNotifications(userId);

    logger.info('All notifications cleared', {
      context: 'notification.controller.clearAll',
      metadata: { userId, count },
    });

    res.status(200).json({ success: true, message: `Cleared ${count} notifications`, data: { count } });
  } catch (error) {
    logger.error('Failed to clear notifications', {
      context: 'notification.controller.clearAll',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
};

// ==================== PREFERENCE ENDPOINTS ====================

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export const getNotificationPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const preferences = await notificationService.getUserPreferences(userId);

    if (!preferences) {
      res.status(404).json({ success: false, message: 'Preferences not found' });
      return;
    }

    logger.info('Retrieved notification preferences', {
      context: 'notification.controller.getPreferences',
      metadata: { userId },
    });

    res.status(200).json({ success: true, data: preferences });
  } catch (error) {
    logger.error('Failed to get notification preferences', {
      context: 'notification.controller.getPreferences',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to retrieve preferences' });
  }
};

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
export const updateNotificationPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const updates = req.body;

    const success = await notificationService.updateUserPreferences(userId, updates);

    if (!success) {
      res.status(404).json({ success: false, message: 'User preferences not found' });
      return;
    }

    const updatedPreferences = await notificationService.getUserPreferences(userId);

    logger.info('Updated notification preferences', {
      context: 'notification.controller.updatePreferences',
      metadata: { userId },
    });

    res.status(200).json({
      success: true,
      message: 'Preferences updated',
      data: updatedPreferences,
    });
  } catch (error) {
    logger.error('Failed to update notification preferences', {
      context: 'notification.controller.updatePreferences',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to update preferences' });
  }
};

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe user from all notifications
 */
export const unsubscribeFromNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const success = await notificationService.unsubscribeUser(userId);

    if (!success) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    logger.info('User unsubscribed from notifications', {
      context: 'notification.controller.unsubscribe',
      metadata: { userId },
    });

    res.status(200).json({ success: true, message: 'Unsubscribed from all notifications' });
  } catch (error) {
    logger.error('Failed to unsubscribe user', {
      context: 'notification.controller.unsubscribe',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
  }
};

// ==================== HEALTH ENDPOINT ====================

/**
 * GET /api/notifications/health
 * Get notification service health status
 */
export const getNotificationHealth = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const health = await notificationService.getHealth();

    logger.info('Retrieved notification service health', {
      context: 'notification.controller.health',
      metadata: health,
    });

    res.status(200).json({ success: true, data: health });
  } catch (error) {
    logger.error('Failed to get notification service health', {
      context: 'notification.controller.health',
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ success: false, message: 'Failed to retrieve health status' });
  }
};

import { Router } from 'express';
import {
  getUnreadNotifications,
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  unsubscribeFromNotifications,
  getNotificationHealth,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// ==================== NOTIFICATION ROUTES ====================

/**
 * GET /api/notifications/unread
 * Get user's unread notifications
 * Rate Limit: 30 req/min per user
 */
router.get('/unread', rateLimiter(30), authenticate, getUnreadNotifications);

/**
 * GET /api/notifications
 * Get all user notifications (paginated)
 * Query: limit (default 20, max 100), offset (default 0)
 * Rate Limit: 30 req/min per user
 */
router.get('/', rateLimiter(30), authenticate, getUserNotifications);

/**
 * POST /api/notifications/:notificationId/read
 * Mark notification as read
 * Rate Limit: 60 req/min per user
 */
router.post('/:notificationId/read', rateLimiter(60), authenticate, markNotificationAsRead);

/**
 * DELETE /api/notifications/:notificationId
 * Delete a specific notification
 * Rate Limit: 60 req/min per user
 */
router.delete('/:notificationId', rateLimiter(60), authenticate, deleteNotification);

/**
 * POST /api/notifications/clear-all
 * Clear all user notifications
 * Rate Limit: 5 req/min per user
 */
router.post('/clear-all', rateLimiter(5), authenticate, clearAllNotifications);

// ==================== PREFERENCE ROUTES ====================

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 * Rate Limit: 30 req/min per user
 */
router.get('/preferences', rateLimiter(30), authenticate, getNotificationPreferences);

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 * Body: {
 *   emailNotifications?: boolean,
 *   pushNotifications?: boolean,
 *   inAppNotifications?: boolean,
 *   injuryRiskAlerts?: boolean,
 *   poorRecoveryAlerts?: boolean,
 *   trainingRecommendations?: boolean,
 *   motivationalMessages?: boolean,
 *   weeklyDigest?: boolean
 * }
 * Rate Limit: 10 req/min per user
 */
router.put('/preferences', rateLimiter(10), authenticate, updateNotificationPreferences);

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe user from all notifications
 * Rate Limit: 2 req/min per user
 */
router.post('/unsubscribe', rateLimiter(2), authenticate, unsubscribeFromNotifications);

// ==================== HEALTH ROUTE ====================

/**
 * GET /api/notifications/health
 * Get notification service health status
 * Admin endpoint - check system status
 * Rate Limit: 10 req/min
 */
router.get('/health', rateLimiter(10), authenticate, getNotificationHealth);

// ==================== 404 HANDLER ====================

router.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Notification endpoint not found',
    availableEndpoints: [
      'GET /api/notifications/unread - Get unread notifications',
      'GET /api/notifications - Get all notifications (paginated)',
      'POST /api/notifications/:id/read - Mark as read',
      'DELETE /api/notifications/:id - Delete notification',
      'POST /api/notifications/clear-all - Clear all notifications',
      'GET /api/notifications/preferences - Get preferences',
      'PUT /api/notifications/preferences - Update preferences',
      'POST /api/notifications/unsubscribe - Unsubscribe from all',
      'GET /api/notifications/health - Service health status',
    ],
  });
});

export default router;

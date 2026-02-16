/**
 * Engagement Routes - Phase 9: User Engagement & Retention System
 * API endpoints for achievements, badges, challenges, and gamification features.
 */

import { Router, Response } from 'express';
import { getAchievementService } from '../services/achievementService';
import { authenticate } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimitMiddleware';
import { sanitizeInput } from '../utils/sanitization';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/index';

const router = Router();

// Apply rate limiting to all routes
router.use(apiRateLimit);

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

/**
 * GET /api/engagement/achievements
 * Get all available achievements
 */
router.get('/achievements', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { category, tier, limit, offset } = req.query;

    const achievements = service.getAllAchievements({
      category: sanitizeInput(category as string),
      tier: sanitizeInput(tier as string),
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    return res.status(200).json({ success: true, data: achievements });
  } catch (error) {
    logger.error('Failed to get achievements', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve achievements' });
  }
});

/**
 * GET /api/engagement/achievements/user/:userId
 * Get user's achievements with progress
 */
router.get('/achievements/user/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId } = req.params;
    const { includeCompleted } = req.query;

    const achievements = service.getUserAchievements(userId, includeCompleted !== 'false');

    return res.status(200).json({ success: true, data: achievements });
  } catch (error) {
    logger.error('Failed to get user achievements', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve user achievements' });
  }
});

/**
 * POST /api/engagement/achievements/check-progress
 * Check and update achievement progress based on event
 */
router.post('/achievements/check-progress', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId, eventType, metadata } = req.body;

    if (!userId || !eventType) {
      return res.status(400).json({ success: false, message: 'userId and eventType are required' });
    }

    const results = await service.checkAndUpdateAchievementProgress(userId, eventType, metadata || {});

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    logger.error('Failed to check achievement progress', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to check achievement progress' });
  }
});

// ============================================================================
// BADGES
// ============================================================================

/**
 * GET /api/engagement/badges
 * Get all available badges
 */
router.get('/badges', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const badges = service.getAllBadges();

    return res.status(200).json({ success: true, data: badges });
  } catch (error) {
    logger.error('Failed to get badges', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve badges' });
  }
});

/**
 * GET /api/engagement/badges/user/:userId
 * Get user's earned badges
 */
router.get('/badges/user/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId } = req.params;

    const badges = service.getUserBadges(userId);

    return res.status(200).json({ success: true, data: badges });
  } catch (error) {
    logger.error('Failed to get user badges', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve user badges' });
  }
});

// ============================================================================
// CHALLENGES
// ============================================================================

/**
 * GET /api/engagement/challenges
 * Get active challenges
 */
router.get('/challenges', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const challenges = service.getActiveChallenges();

    return res.status(200).json({ success: true, data: challenges });
  } catch (error) {
    logger.error('Failed to get challenges', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve challenges' });
  }
});

/**
 * GET /api/engagement/challenges/user/:userId
 * Get user's challenges
 */
router.get('/challenges/user/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId } = req.params;

    const challenges = service.getUserChallenges(userId);

    return res.status(200).json({ success: true, data: challenges });
  } catch (error) {
    logger.error('Failed to get user challenges', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve user challenges' });
  }
});

/**
 * POST /api/engagement/challenges/join
 * Join a challenge
 */
router.post('/challenges/join', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId, challengeId } = req.body;

    if (!userId || !challengeId) {
      return res.status(400).json({ success: false, message: 'userId and challengeId are required' });
    }

    const result = service.joinChallenge(userId, challengeId);

    if (result.success) {
      return res.status(200).json({ success: true, message: result.message });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('Failed to join challenge', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to join challenge' });
  }
});

/**
 * POST /api/engagement/challenges/progress
 * Update challenge progress
 */
router.post('/challenges/progress', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId, challengeId, metric, increment } = req.body;

    if (!userId || !challengeId || !metric || increment === undefined) {
      return res.status(400).json({ success: false, message: 'userId, challengeId, metric, and increment are required' });
    }

    const result = service.updateChallengeProgress(userId, challengeId, metric, increment);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to update challenge progress', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to update challenge progress' });
  }
});

// ============================================================================
// POINTS & LEVELS
// ============================================================================

/**
 * GET /api/engagement/stats/:userId
 * Get user stats (points, level, XP)
 */
router.get('/stats/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId } = req.params;

    const stats = service.getUserStats(userId);

    if (stats) {
      return res.status(200).json({ success: true, data: stats });
    } else {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    logger.error('Failed to get user stats', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve user stats' });
  }
});

/**
 * POST /api/engagement/points/award
 * Award points to user (admin/internal use)
 */
router.post('/points/award', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId, points, source } = req.body;

    if (!userId || !points || !source) {
      return res.status(400).json({ success: false, message: 'userId, points, and source are required' });
    }

    service.awardPoints(userId, points, source);

    return res.status(200).json({ success: true, message: 'Points awarded' });
  } catch (error) {
    logger.error('Failed to award points', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to award points' });
  }
});

// ============================================================================
// LEADERBOARD
// ============================================================================

/**
 * GET /api/engagement/leaderboard
 * Get leaderboard rankings
 */
router.get('/leaderboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { timeframe, limit } = req.query;

    const leaderboard = service.getLeaderboard(
      (timeframe as 'daily' | 'weekly' | 'monthly' | 'lifetime') || 'weekly',
      limit ? parseInt(limit as string) : 10
    );

    return res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error('Failed to get leaderboard', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve leaderboard' });
  }
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * GET /api/engagement/notifications/:userId
 * Get user notifications
 */
router.get('/notifications/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { userId } = req.params;
    const { unreadOnly } = req.query;

    const notifications = service.getNotifications(userId, unreadOnly === 'true');

    return res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    logger.error('Failed to get notifications', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications' });
  }
});

/**
 * PUT /api/engagement/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/notifications/:notificationId/read', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getAchievementService(null);
    const { notificationId } = req.params;

    service.markNotificationRead(notificationId);

    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Failed to mark notification read', { context: 'engagementRoutes', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

export default router;

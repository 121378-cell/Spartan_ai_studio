import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getPersonalizationService } from '../services/personalizationService';
import { logger } from '../utils/logger';
import {
  PersonalizedThreshold,
  ResponsePattern,
  RecommendationTiming,
  ScoreAdjustment,
} from '../services/personalizationService';

/**
 * Get user personalization profile
 * GET /api/personalization/profile/:userId
 */
export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    const service = getPersonalizationService();
    const profile = await service.getUserProfile(userId);

    logger.info('User profile retrieved', {
      context: 'personalization',
      metadata: { userId },
    });

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Error getting user profile', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
    });
  }
};

/**
 * Get user baseline metrics
 * GET /api/personalization/baseline/:userId
 */
export const getUserBaseline = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    const targetDate = typeof date === 'string' ? date : new Date().toISOString().split('T')[0];

    const service = getPersonalizationService();
    const baseline = await service.calculateUserBaseline(userId, targetDate);

    logger.info('User baseline calculated', {
      context: 'personalization',
      metadata: { userId, date: targetDate },
    });

    return res.status(200).json({
      success: true,
      data: baseline,
    });
  } catch (error) {
    logger.error('Error getting user baseline', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user baseline',
    });
  }
};

/**
 * Get personalized threshold
 * GET /api/personalization/threshold/:userId/:metric
 */
export const getThreshold = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, metric } = req.params;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    const validMetrics = ['recovery', 'readiness', 'injury_risk'];
    if (!metric || !validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        message: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
      });
    }

    const service = getPersonalizationService();
    const threshold = await service.getPersonalizedThreshold(
      userId,
      metric as 'recovery' | 'readiness' | 'injury_risk'
    );

    logger.info('Personalized threshold retrieved', {
      context: 'personalization',
      metadata: { userId, metric },
    });

    return res.status(200).json({
      success: true,
      data: threshold,
    });
  } catch (error) {
    logger.error('Error getting threshold', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve threshold',
    });
  }
};

/**
 * Update personalized threshold
 * POST /api/personalization/threshold/:userId/:metric
 */
export const updateThreshold = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, metric } = req.params;
    const { adjustment, confidence } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    const validMetrics = ['recovery', 'readiness', 'injury_risk'];
    if (!metric || !validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        message: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
      });
    }

    if (typeof adjustment !== 'number' || typeof confidence !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'adjustment and confidence must be numbers',
      });
    }

    const service = getPersonalizationService();
    const updated = await service.updatePersonalizedThreshold(
      userId,
      metric as 'recovery' | 'readiness' | 'injury_risk',
      adjustment,
      confidence
    );

    logger.info('Personalized threshold updated', {
      context: 'personalization',
      metadata: { userId, metric, adjustment },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error updating threshold', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to update threshold',
    });
  }
};

/**
 * Get user response pattern
 * GET /api/personalization/response-pattern/:userId
 */
export const getResponsePattern = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    const service = getPersonalizationService();
    const pattern = await service.analyzeResponsePattern(userId);

    logger.info('Response pattern analyzed', {
      context: 'personalization',
      metadata: { userId },
    });

    return res.status(200).json({
      success: true,
      data: pattern,
    });
  } catch (error) {
    logger.error('Error getting response pattern', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve response pattern',
    });
  }
};

/**
 * Get recommendation timing
 * GET /api/personalization/recommendation-timing/:userId/:type
 */
export const getRecommendationTiming = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, type } = req.params;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    if (!type || typeof type !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing recommendation type',
      });
    }

    const service = getPersonalizationService();
    const timing = await service.getRecommendationTiming(userId, type);

    logger.info('Recommendation timing retrieved', {
      context: 'personalization',
      metadata: { userId, type },
    });

    return res.status(200).json({
      success: true,
      data: timing,
    });
  } catch (error) {
    logger.error('Error getting recommendation timing', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendation timing',
    });
  }
};

/**
 * Update recommendation timing based on engagement
 * POST /api/personalization/recommendation-timing/:userId/:type
 */
export const updateRecommendationTiming = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, type } = req.params;
    const { engagementScore } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    if (!type || typeof type !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing recommendation type',
      });
    }

    if (typeof engagementScore !== 'number' || engagementScore < 0 || engagementScore > 100) {
      return res.status(400).json({
        success: false,
        message: 'engagementScore must be a number between 0 and 100',
      });
    }

    const service = getPersonalizationService();
    const updated = await service.updateRecommendationTiming(userId, type, engagementScore);

    logger.info('Recommendation timing updated', {
      context: 'personalization',
      metadata: { userId, type, engagementScore },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error updating recommendation timing', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to update recommendation timing',
    });
  }
};

/**
 * Get personalized score
 * GET /api/personalization/personalized-score/:userId/:metric
 */
export const getPersonalizedScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, metric } = req.params;
    const { date, rawScore } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing user ID',
      });
    }

    const validMetrics = ['recovery', 'readiness', 'injury_risk'];
    if (!metric || !validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        message: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
      });
    }

    const targetDate = typeof date === 'string' ? date : new Date().toISOString().split('T')[0];
    const score = typeof rawScore === 'string' ? parseInt(rawScore, 10) : 50;

    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: 'rawScore must be a number between 0 and 100',
      });
    }

    const service = getPersonalizationService();
    const adjustment = await service.personalizeScore(
      userId,
      targetDate,
      metric as 'recovery' | 'readiness' | 'injury_risk',
      score
    );

    logger.info('Score personalized', {
      context: 'personalization',
      metadata: { userId, metric, rawScore: score, personalizedScore: adjustment.personalizedScore },
    });

    return res.status(200).json({
      success: true,
      data: adjustment,
    });
  } catch (error) {
    logger.error('Error personalizing score', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to personalize score',
    });
  }
};

/**
 * Get personalization health/status
 * GET /api/personalization/health
 */
export const getHealth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getPersonalizationService();

    logger.info('Personalization health check', {
      context: 'personalization',
    });

    return res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        service: 'PersonalizationService',
        version: '1.0.0',
        features: [
          'User baseline calculation',
          'Personalized thresholds',
          'Response pattern analysis',
          'Recommendation timing optimization',
          'Score personalization',
          'Profile management',
        ],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error getting health status', {
      context: 'personalization',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Health check failed',
    });
  }
};

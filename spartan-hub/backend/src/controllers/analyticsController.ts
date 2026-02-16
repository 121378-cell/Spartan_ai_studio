/**
 * Analytics Controller
 * 
 * Handles API requests for readiness/recovery scores,
 * trends, recommendations, and injury risk assessments
 * 
 * Features caching via Redis for improved performance
 */

import { Request, Response } from 'express';
import { ReadinessAnalyticsService } from '../services/readinessAnalyticsService';
import { CacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { sanitizeInput, validateAndSanitizeString } from '../utils/sanitization';

import { AuthenticatedRequest } from '../middleware/auth';

export class AnalyticsController {
  private analyticsService = new ReadinessAnalyticsService();
  private cacheService: CacheService;

  constructor(cacheService?: CacheService) {
    this.cacheService = cacheService || new CacheService();
  }

  /**
   * Get recovery score for a specific date
   * GET /api/analytics/recovery/:userId?date=YYYY-MM-DD
   * Cached for 15 minutes
   */
  async getRecoveryScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { date } = req.query;

      // Validation
      const sanitizedUserId = sanitizeInput(userId);
      if (!sanitizedUserId) {
        res.status(400).json({ success: false, message: 'Invalid userId' });
        return;
      }

      let queryDate = date ? sanitizeInput(String(date)) : new Date().toISOString().split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
        queryDate = new Date().toISOString().split('T')[0];
      }

      // Generate cache key
      const cacheKey = `recovery_score:${sanitizedUserId}:${queryDate}`;

      // Check cache
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug('Returning cached recovery score', {
          context: 'analytics.controller',
          metadata: { userId: sanitizedUserId, date: queryDate }
        });
        res.status(200).json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      // Get recovery score
      const recovery = await this.analyticsService.calculateRecoveryScore(sanitizedUserId, queryDate);

      logger.info('Recovery score retrieved', {
        context: 'analytics.controller',
        metadata: { userId: sanitizedUserId, date: queryDate, score: recovery.score }
      });

      // Prepare response data
      const responseData = {
        date: queryDate,
        score: recovery.score,
        status: recovery.status,
        components: recovery.components,
        recommendation: recovery.recommendation
      };

      // Cache the result
      await this.cacheService.set(cacheKey, responseData, 'recovery_score');

      res.status(200).json({
        success: true,
        data: responseData,
        cached: false
      });
    } catch (error) {
      logger.error('Failed to get recovery score', {
        context: 'analytics.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      res.status(500).json({
        success: false,
        message: 'Failed to calculate recovery score'
      });
    }
  }

  /**
   * Get readiness score for a specific date
   * GET /api/analytics/readiness/:userId?date=YYYY-MM-DD
   * Cached for 15 minutes
   */
  async getReadinessScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { date } = req.query;

      // Validation
      const sanitizedUserId = sanitizeInput(userId);
      if (!sanitizedUserId) {
        res.status(400).json({ success: false, message: 'Invalid userId' });
        return;
      }

      let queryDate = date ? sanitizeInput(String(date)) : new Date().toISOString().split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
        queryDate = new Date().toISOString().split('T')[0];
      }

      // Generate cache key
      const cacheKey = `readiness_score:${sanitizedUserId}:${queryDate}`;

      // Check cache
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug('Returning cached readiness score', {
          context: 'analytics.controller',
          metadata: { userId: sanitizedUserId, date: queryDate }
        });
        res.status(200).json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      // Get readiness score
      const readiness = await this.analyticsService.calculateReadinessScore(sanitizedUserId, queryDate);

      logger.info('Readiness score retrieved', {
        context: 'analytics.controller',
        metadata: { userId: sanitizedUserId, date: queryDate, score: readiness.score }
      });

      // Prepare response data
      const responseData = {
        date: queryDate,
        score: readiness.score,
        status: readiness.status,
        fatigueIndex: readiness.fatigue,
        baselineComparison: readiness.baseline_comparison,
        recommendation: readiness.recommendation
      };

      // Cache the result
      await this.cacheService.set(cacheKey, responseData, 'readiness_score');

      res.status(200).json({
        success: true,
        data: responseData,
        cached: false
      });
    } catch (error) {
      logger.error('Failed to get readiness score', {
        context: 'analytics.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      res.status(500).json({
        success: false,
        message: 'Failed to calculate readiness score'
      });
    }
  }

  /**
   * Get trend analysis for a metric
   * GET /api/analytics/trends/:userId?metric=hrv&days=30
   * Cached for 1 hour
   */
  async getTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { metric, days } = req.query;

      // Validation
      const sanitizedUserId = sanitizeInput(userId);
      if (!sanitizedUserId) {
        res.status(400).json({ success: false, message: 'Invalid userId' });
        return;
      }

      const sanitizedMetric = sanitizeInput(String(metric || 'hrv'));
      const analyzeDays = Math.min(Math.max(parseInt(String(days || 30)), 7), 365);

      // Validate metric
      const validMetrics = ['hrv', 'heart_rate', 'rhr', 'sleep_duration', 'stress_level', 'activity'];
      if (!validMetrics.includes(sanitizedMetric)) {
        res.status(400).json({
          success: false,
          message: `Invalid metric. Valid options: ${validMetrics.join(', ')}`
        });
        return;
      }

      // Generate cache key
      const cacheKey = `trends:${sanitizedUserId}:${sanitizedMetric}:${analyzeDays}`;

      // Check cache
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug('Returning cached trend analysis', {
          context: 'analytics.controller',
          metadata: { userId: sanitizedUserId, metric: sanitizedMetric, days: analyzeDays }
        });
        res.status(200).json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      // Get trends
      const trend = await this.analyticsService.analyzeTrends(sanitizedUserId, sanitizedMetric, analyzeDays);

      logger.info('Trend analysis retrieved', {
        context: 'analytics.controller',
        metadata: {
          userId: sanitizedUserId,
          metric: sanitizedMetric,
          days: analyzeDays,
          trend: trend.trend
        }
      });

      // Prepare response data
      const responseData = {
        metric: trend.metric,
        period: `${analyzeDays} days`,
        trend: trend.trend,
        slope: Number(trend.slope.toFixed(4)),
        currentAverage: Number((trend.values.reduce((a, b) => a + b, 0) / trend.values.length).toFixed(2)),
        movingAverage7d: trend.movingAverage7d.map(v => Number(v.toFixed(2))),
        anomalies: trend.anomalies,
        minValue: Math.min(...trend.values),
        maxValue: Math.max(...trend.values)
      };

      // Cache the result
      await this.cacheService.set(cacheKey, responseData, 'trends');

      res.status(200).json({
        success: true,
        data: responseData,
        cached: false
      });
    } catch (error) {
      logger.error('Failed to get trends', {
        context: 'analytics.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      res.status(500).json({
        success: false,
        message: 'Failed to analyze trends'
      });
    }
  }

  /**
   * Get personalized recommendations
   * GET /api/analytics/recommendations/:userId?date=YYYY-MM-DD
   * Cached for 15 minutes
   */
  async getRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { date } = req.query;

      // Validation
      const sanitizedUserId = sanitizeInput(userId);
      if (!sanitizedUserId) {
        res.status(400).json({ success: false, message: 'Invalid userId' });
        return;
      }

      let queryDate = date ? sanitizeInput(String(date)) : new Date().toISOString().split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
        queryDate = new Date().toISOString().split('T')[0];
      }

      // Generate cache key
      const cacheKey = `recommendations:${sanitizedUserId}:${queryDate}`;

      // Check cache
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug('Returning cached recommendations', {
          context: 'analytics.controller',
          metadata: { userId: sanitizedUserId, date: queryDate }
        });
        res.status(200).json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      // Get recommendations
      const recommendations = await this.analyticsService.generateRecommendations(
        sanitizedUserId,
        queryDate
      );

      logger.info('Recommendations retrieved', {
        context: 'analytics.controller',
        metadata: { userId: sanitizedUserId, date: queryDate, count: recommendations.length }
      });

      // Group by type
      const grouped = {
        recovery: recommendations.filter(r => r.type === 'recovery'),
        training: recommendations.filter(r => r.type === 'training'),
        injuryPrevention: recommendations.filter(r => r.type === 'injury_prevention')
      };

      // Prepare response data
      const responseData = {
        date: queryDate,
        totalRecommendations: recommendations.length,
        byType: {
          recovery: grouped.recovery,
          training: grouped.training,
          injuryPrevention: grouped.injuryPrevention
        },
        allRecommendations: recommendations.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
      };

      // Cache the result
      await this.cacheService.set(cacheKey, responseData, 'recommendations');

      res.status(200).json({
        success: true,
        data: responseData,
        cached: false
      });
    } catch (error) {
      logger.error('Failed to get recommendations', {
        context: 'analytics.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      res.status(500).json({
        success: false,
        message: 'Failed to generate recommendations'
      });
    }
  }

  /**
   * Get injury risk assessment
   * GET /api/analytics/injury-risk/:userId?date=YYYY-MM-DD
   * Cached for 15 minutes
   */
  async getInjuryRisk(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { date } = req.query;

      // Validation
      const sanitizedUserId = sanitizeInput(userId);
      if (!sanitizedUserId) {
        res.status(400).json({ success: false, message: 'Invalid userId' });
        return;
      }

      let queryDate = date ? sanitizeInput(String(date)) : new Date().toISOString().split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
        queryDate = new Date().toISOString().split('T')[0];
      }

      // Generate cache key
      const cacheKey = `injury_risk:${sanitizedUserId}:${queryDate}`;

      // Check cache
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug('Returning cached injury risk assessment', {
          context: 'analytics.controller',
          metadata: { userId: sanitizedUserId, date: queryDate }
        });
        res.status(200).json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      // Get injury risk assessment
      const risk = await this.analyticsService.assessInjuryRisk(sanitizedUserId, queryDate);

      logger.info('Injury risk assessment retrieved', {
        context: 'analytics.controller',
        metadata: { userId: sanitizedUserId, date: queryDate, riskLevel: risk.riskLevel }
      });

      // Prepare response data
      const responseData = {
        date: queryDate,
        riskLevel: risk.riskLevel,
        riskScore: risk.score,
        riskFactors: {
          elevatedRhr: risk.factors.elevatedRhr,
          suppressedHrv: risk.factors.suppressedHrv,
          overtraining: risk.factors.overtraining,
          sleepDeprivation: risk.factors.sleepDeprivation
        },
        recommendation: risk.recommendation,
        alertLevel:
          risk.riskLevel === 'high'
            ? 'URGENT: Take immediate action'
            : risk.riskLevel === 'moderate'
              ? 'CAUTION: Monitor closely'
              : 'OK: Normal precautions'
      };

      // Cache the result
      await this.cacheService.set(cacheKey, responseData, 'injury_risk');

      res.status(200).json({
        success: true,
        data: responseData,
        cached: false
      });
    } catch (error) {
      logger.error('Failed to assess injury risk', {
        context: 'analytics.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      res.status(500).json({
        success: false,
        message: 'Failed to assess injury risk'
      });
    }
  }

  /**
   * Get comprehensive daily analytics summary
   * GET /api/analytics/summary/:userId?date=YYYY-MM-DD
   * Cached for 1 hour
   */
  async getDailySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { date } = req.query;

      // Validation
      const sanitizedUserId = sanitizeInput(userId);
      if (!sanitizedUserId) {
        res.status(400).json({ success: false, message: 'Invalid userId' });
        return;
      }

      let queryDate = date ? sanitizeInput(String(date)) : new Date().toISOString().split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
        queryDate = new Date().toISOString().split('T')[0];
      }

      // Generate cache key
      const cacheKey = `daily_summary:${sanitizedUserId}:${queryDate}`;

      // Check cache
      const cachedData = await this.cacheService.get(cacheKey);
      if (cachedData) {
        logger.debug('Returning cached daily summary', {
          context: 'analytics.controller',
          metadata: { userId: sanitizedUserId, date: queryDate }
        });
        res.status(200).json({
          success: true,
          data: cachedData,
          cached: true
        });
        return;
      }

      // Get all data
      const recovery = await this.analyticsService.calculateRecoveryScore(sanitizedUserId, queryDate);
      const readiness = await this.analyticsService.calculateReadinessScore(sanitizedUserId, queryDate);
      const recommendations = await this.analyticsService.generateRecommendations(sanitizedUserId, queryDate);
      const risk = await this.analyticsService.assessInjuryRisk(sanitizedUserId, queryDate);

      logger.info('Daily summary retrieved', {
        context: 'analytics.controller',
        metadata: { userId: sanitizedUserId, date: queryDate }
      });

      // Prepare response data
      const responseData = {
        date: queryDate,
        scores: {
          recovery: {
            score: recovery.score,
            status: recovery.status,
            components: recovery.components
          },
          readiness: {
            score: readiness.score,
            status: readiness.status,
            fatigue: readiness.fatigue
          }
        },
        risk: {
          level: risk.riskLevel,
          score: risk.score,
          factors: risk.factors
        },
        recommendations: {
          total: recommendations.length,
          recovery: recommendations.filter(r => r.type === 'recovery').length,
          training: recommendations.filter(r => r.type === 'training').length,
          injuryPrevention: recommendations.filter(r => r.type === 'injury_prevention').length,
          topPriority: recommendations.filter(r => r.priority === 'high').slice(0, 3)
        },
        guidance: {
          recovery: recovery.recommendation,
          readiness: readiness.recommendation,
          injury: risk.recommendation
        }
      };

      // Cache the result
      await this.cacheService.set(cacheKey, responseData, 'daily_summary');

      res.status(200).json({
        success: true,
        data: responseData,
        cached: false
      });
    } catch (error) {
      logger.error('Failed to get daily summary', {
        context: 'analytics.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get daily summary'
      });
    }
  }

  /**
   * Invalidate cache for user analytics
   * Used when new biometric data is ingested
   * POST /api/analytics/invalidate/:userId
   */
  async invalidateUserCache(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const sanitizedUserId = sanitizeInput(userId);
      if (!sanitizedUserId) {
        res.status(400).json({ success: false, message: 'Invalid userId' });
        return;
      }

      await this.cacheService.invalidateUserAnalytics(sanitizedUserId);

      logger.info('User analytics cache invalidated', {
        context: 'analytics.controller',
        metadata: { userId: sanitizedUserId }
      });

      res.status(200).json({
        success: true,
        message: 'Cache invalidated for user analytics'
      });
    } catch (error) {
      logger.error('Failed to invalidate cache', {
        context: 'analytics.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      res.status(500).json({
        success: false,
        message: 'Failed to invalidate cache'
      });
    }
  }
}

export default new AnalyticsController();

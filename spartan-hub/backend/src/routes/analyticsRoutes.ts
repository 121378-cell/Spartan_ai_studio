/**
 * Analytics Routes
 * 
 * API endpoints for readiness/recovery analytics,
 * trends, recommendations, and injury risk assessment
 * 
 * Features:
 * - Redis caching for improved performance
 * - Cache invalidation on new biometric data
 * - Rate limiting (100 requests per 15 minutes)
 */

import { Router, Request, Response } from 'express';
import analyticsController from '../controllers/analyticsController';
import { CacheService, getCacheService } from '../services/cacheService';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Initialize cache service
const cacheService = getCacheService();

/**
 * Apply middleware
 * - rateLimiter: 100 requests per 15 minutes
 * - authenticate: Verify user identity
 */
router.use(rateLimiter(100));

// ============================================================================
// RECOVERY SCORE ENDPOINTS
// ============================================================================

/**
 * Get recovery score for a specific date
 * GET /api/analytics/recovery/:userId?date=YYYY-MM-DD
 * 
 * Query Parameters:
 *   - date (optional): YYYY-MM-DD format, defaults to today
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     date: string,
 *     score: number (0-100),
 *     status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical',
 *     components: {
 *       sleep: number,
 *       hrv: number,
 *       rhr: number,
 *       stress: number
 *     },
 *     recommendation: string
 *   }
 * }
 */
router.get('/recovery/:userId', authenticate, (req: Request, res: Response) => {
  return analyticsController.getRecoveryScore(req as any, res);
});

// ============================================================================
// READINESS SCORE ENDPOINTS
// ============================================================================

/**
 * Get readiness to train score for a specific date
 * GET /api/analytics/readiness/:userId?date=YYYY-MM-DD
 * 
 * Query Parameters:
 *   - date (optional): YYYY-MM-DD format, defaults to today
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     date: string,
 *     score: number (0-100),
 *     status: 'high' | 'normal' | 'low' | 'very_low',
 *     fatigueIndex: number,
 *     baselineComparison: number,
 *     recommendation: string
 *   }
 * }
 */
router.get('/readiness/:userId', authenticate, (req: Request, res: Response) => {
  return analyticsController.getReadinessScore(req as any, res);
});

// ============================================================================
// TREND ANALYSIS ENDPOINTS
// ============================================================================

/**
 * Analyze trends for a specific metric over time
 * GET /api/analytics/trends/:userId?metric=hrv&days=30
 * 
 * Query Parameters:
 *   - metric (required): 'hrv' | 'heart_rate' | 'rhr' | 'sleep_duration' | 'stress_level' | 'activity'
 *   - days (optional): 7-365, defaults to 30
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     metric: string,
 *     period: string,
 *     trend: 'improving' | 'declining' | 'stable',
 *     slope: number,
 *     currentAverage: number,
 *     movingAverage7d: number[],
 *     anomalies: boolean[],
 *     minValue: number,
 *     maxValue: number
 *   }
 * }
 */
router.get('/trends/:userId', authenticate, (req: Request, res: Response) => {
  return analyticsController.getTrends(req as any, res);
});

// ============================================================================
// RECOMMENDATIONS ENDPOINTS
// ============================================================================

/**
 * Get personalized coaching recommendations
 * GET /api/analytics/recommendations/:userId?date=YYYY-MM-DD
 * 
 * Query Parameters:
 *   - date (optional): YYYY-MM-DD format, defaults to today
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     date: string,
 *     totalRecommendations: number,
 *     byType: {
 *       recovery: Recommendation[],
 *       training: Recommendation[],
 *       injuryPrevention: Recommendation[]
 *     },
 *     allRecommendations: Recommendation[]
 *   }
 * }
 * 
 * where Recommendation = {
 *   type: 'recovery' | 'training' | 'injury_prevention',
 *   message: string,
 *   priority: 'low' | 'medium' | 'high',
 *   actionItems?: string[]
 * }
 */
router.get('/recommendations/:userId', authenticate, (req: Request, res: Response) => {
  return analyticsController.getRecommendations(req as any, res);
});

// ============================================================================
// INJURY RISK ASSESSMENT ENDPOINTS
// ============================================================================

/**
 * Get injury risk assessment
 * GET /api/analytics/injury-risk/:userId?date=YYYY-MM-DD
 * 
 * Query Parameters:
 *   - date (optional): YYYY-MM-DD format, defaults to today
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     date: string,
 *     riskLevel: 'low' | 'moderate' | 'high',
 *     riskScore: number (0-100),
 *     riskFactors: {
 *       elevatedRhr: boolean,
 *       suppressedHrv: boolean,
 *       overtraining: boolean,
 *       sleepDeprivation: boolean
 *     },
 *     recommendation: string,
 *     alertLevel: string
 *   }
 * }
 */
router.get('/injury-risk/:userId', authenticate, (req: Request, res: Response) => {
  return analyticsController.getInjuryRisk(req as any, res);
});

// ============================================================================
// SUMMARY ENDPOINTS
// ============================================================================

/**
 * Get comprehensive daily analytics summary
 * GET /api/analytics/summary/:userId?date=YYYY-MM-DD
 * 
 * Combines recovery, readiness, risk, and recommendations
 * 
 * Query Parameters:
 *   - date (optional): YYYY-MM-DD format, defaults to today
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     date: string,
 *     scores: {
 *       recovery: { score, status, components },
 *       readiness: { score, status, fatigue }
 *     },
 *     risk: { level, score, factors },
 *     recommendations: { total, recovery, training, injuryPrevention, topPriority },
 *     guidance: { recovery, readiness, injury }
 *   }
 * }
 */
router.get('/summary/:userId', authenticate, (req: Request, res: Response) => {
  return analyticsController.getDailySummary(req as any, res);
});

// ============================================================================
// CACHE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Invalidate cache for user analytics
 * POST /api/analytics/cache/invalidate/:userId
 * 
 * Used when new biometric data is ingested to refresh analytics
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
router.post('/cache/invalidate/:userId', authenticate, async (req: Request, res: Response) => {
  return analyticsController.invalidateUserCache(req as any, res);
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 Handler for analytics endpoints
 */
router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Analytics endpoint not found',
    availableEndpoints: [
      'GET /api/analytics/recovery/:userId',
      'GET /api/analytics/readiness/:userId',
      'GET /api/analytics/trends/:userId',
      'GET /api/analytics/recommendations/:userId',
      'GET /api/analytics/injury-risk/:userId',
      'GET /api/analytics/summary/:userId',
      'POST /api/analytics/cache/invalidate/:userId'
    ]
  });
});

export default router;

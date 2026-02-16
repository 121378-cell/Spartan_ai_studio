import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getUserProfile,
  getUserBaseline,
  getThreshold,
  updateThreshold,
  getResponsePattern,
  getRecommendationTiming,
  updateRecommendationTiming,
  getPersonalizedScore,
  getHealth,
} from '../controllers/personalizationController';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiting configuration for personalization endpoints
const rateLimitAlertMiddleware = rateLimiter(100); // Default rate limit

/**
 * GET /api/personalization/health
 * Health check for personalization service
 */
router.get(
  '/health',
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  getHealth
);

/**
 * GET /api/personalization/profile/:userId
 * Get comprehensive user personalization profile
 * Includes: baseline, response pattern, thresholds
 */
router.get(
  '/profile/:userId',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  getUserProfile
);

/**
 * GET /api/personalization/baseline/:userId
 * Query: ?date=YYYY-MM-DD (optional, defaults to today)
 * Get user baseline metrics for comparison
 */
router.get(
  '/baseline/:userId',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  getUserBaseline
);

/**
 * GET /api/personalization/threshold/:userId/:metric
 * Metrics: recovery, readiness, injury_risk
 * Get personalized threshold for a specific metric
 */
router.get(
  '/threshold/:userId/:metric',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  getThreshold
);

/**
 * POST /api/personalization/threshold/:userId/:metric
 * Body: { adjustment: number, confidence: number }
 * Update personalized threshold based on performance
 */
router.post(
  '/threshold/:userId/:metric',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  updateThreshold
);

/**
 * GET /api/personalization/response-pattern/:userId
 * Analyze user's recovery and training response patterns
 */
router.get(
  '/response-pattern/:userId',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  getResponsePattern
);

/**
 * GET /api/personalization/recommendation-timing/:userId/:type
 * Get optimal timing for a recommendation type
 */
router.get(
  '/recommendation-timing/:userId/:type',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  getRecommendationTiming
);

/**
 * POST /api/personalization/recommendation-timing/:userId/:type
 * Body: { engagementScore: number (0-100) }
 * Update recommendation timing based on user engagement
 */
router.post(
  '/recommendation-timing/:userId/:type',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  updateRecommendationTiming
);

/**
 * GET /api/personalization/personalized-score/:userId/:metric
 * Query: ?date=YYYY-MM-DD&rawScore=50 (rawScore defaults to 50)
 * Get personalized score with adjustment factors
 */
router.get(
  '/personalized-score/:userId/:metric',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => rateLimitAlertMiddleware(req, res, () => {}),
  getPersonalizedScore
);

// 404 Handler for undefined personalization routes
router.use((req: AuthenticatedRequest, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Personalization endpoint not found',
    availableEndpoints: [
      'GET /api/personalization/health',
      'GET /api/personalization/profile/:userId',
      'GET /api/personalization/baseline/:userId?date=YYYY-MM-DD',
      'GET /api/personalization/threshold/:userId/:metric',
      'POST /api/personalization/threshold/:userId/:metric',
      'GET /api/personalization/response-pattern/:userId',
      'GET /api/personalization/recommendation-timing/:userId/:type',
      'POST /api/personalization/recommendation-timing/:userId/:type',
      'GET /api/personalization/personalized-score/:userId/:metric?date=YYYY-MM-DD&rawScore=50',
    ],
  });
});

export default router;

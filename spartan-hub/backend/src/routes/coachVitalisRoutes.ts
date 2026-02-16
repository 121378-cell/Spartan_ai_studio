/**
 * Coach Vitalis Routes - Express Route Configuration
 *
 * Defines all REST endpoints for the Coach Vitalis bio-feedback system.
 * Includes authentication middleware, rate limiting, and route handlers.
 */

import { Router, Request, Response } from 'express';
import RateLimit from 'express-rate-limit';
import { verifyJWT } from '../middleware/auth';
import {
  getBioState,
  getRecommendedAction,
  getAlerts,
  acknowledgeAlert,
  getTrainingAdjustment,
  acceptTrainingAdjustment,
  getNervousSystemReport,
  getDecisionHistory,
  getHealth,
} from '../controllers/coachVitalisController';

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * Bio-state evaluation limiter
 * Moderate cost operation
 */
const bioStateLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: 'Too many bio-state evaluations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Action recommendation limiter
 * Moderate cost operation
 */
const actionLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: 'Too many action requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Alert generation limiter
 * Moderate cost operation
 */
const alertLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: 'Too many alert requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Training adjustment limiter
 * Higher cost operations
 */
const adjustmentLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // 40 requests per window
  message: 'Too many adjustment requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Nervous system report limiter
 * Moderate cost operation
 */
const reportLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // 40 requests per window
  message: 'Too many report requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * History query limiter
 * Low cost operation
 */
const historyLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many history requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Health check limiter
 * Very low cost operation
 */
const healthLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: 'Too many health checks. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * Health check endpoint
 * GET /api/vitalis/health
 */
router.get('/health', healthLimiter, getHealth);

// ============================================================================
// PROTECTED ROUTES (Require JWT authentication)
// ============================================================================

/**
 * Evaluate bio-physiological state
 * GET /api/vitalis/bio-state/:userId?date=YYYY-MM-DD
 *
 * Returns comprehensive evaluation of current state:
 * - Individual component statuses (HRV, RHR, stress, sleep, training load)
 * - Composite metrics (recovery, nervous system load, injury risk, training readiness)
 * - Triggered decision rules
 * - Recommended action with explanation
 */
router.get('/bio-state/:userId', verifyJWT, bioStateLimiter, getBioState);

/**
 * Get recommended action
 * GET /api/vitalis/recommended-action/:userId
 *
 * Returns intelligent action recommendation based on current bio-physiological state.
 * Includes action type, title, description, expected benefits, and confidence score.
 */
router.get('/recommended-action/:userId', verifyJWT, actionLimiter, getRecommendedAction);

/**
 * Get proactive alerts
 * GET /api/vitalis/alerts/:userId?severity=urgent|warning|info
 *
 * Returns all active proactive alerts for the user.
 * Alerts include context, trigger reason, and recommended actions.
 * Optional severity filter to show specific alert types.
 */
router.get('/alerts/:userId', verifyJWT, alertLimiter, getAlerts);

/**
 * Acknowledge alert and provide feedback
 * POST /api/vitalis/acknowledge-alert/:userId/:alertId
 *
 * Body:
 * {
 *   "followedAction": boolean,
 *   "feedback": string (optional)
 * }
 *
 * Records user acknowledgement of alert and whether they followed the recommendation.
 * Feedback is used to improve future recommendations.
 */
router.post('/acknowledge-alert/:userId/:alertId', verifyJWT, alertLimiter, acknowledgeAlert);

/**
 * Get training plan adjustments
 * GET /api/vitalis/training-adjustment/:userId?date=YYYY-MM-DD
 *
 * Returns any training adjustments recommended for the specified date.
 * Includes original plan, adjusted plan, and reason for adjustment.
 */
router.get('/training-adjustment/:userId', verifyJWT, adjustmentLimiter, getTrainingAdjustment);

/**
 * Accept training plan adjustment
 * POST /api/vitalis/training-adjustment/:userId/accept
 *
 * Body:
 * {
 *   "adjustmentId": string
 * }
 *
 * Records user acceptance of a training adjustment.
 * Returns details of the adjusted session.
 */
router.post(
  '/training-adjustment/:userId/accept',
  verifyJWT,
  adjustmentLimiter,
  acceptTrainingAdjustment
);

/**
 * Get nervous system monitoring report
 * GET /api/vitalis/nervous-system-report/:userId?days=30
 *
 * Returns comprehensive nervous system analysis:
 * - Average load over period
 * - Trend (improving/stable/declining)
 * - Number of critical days
 * - Personalized recommendations
 *
 * Days parameter: 1-365 (default: 30)
 */
router.get(
  '/nervous-system-report/:userId',
  verifyJWT,
  reportLimiter,
  getNervousSystemReport
);

/**
 * Get decision history
 * GET /api/vitalis/decision-history/:userId?limit=30&days=30
 *
 * Returns chronological history of decisions made by Coach Vitalis.
 * Useful for understanding system behavior and learning patterns.
 *
 * Query parameters:
 * - limit: 1-1000 (default: 30) - number of records to return
 * - days: 1-365 (default: 30) - look back period
 */
router.get(
  '/decision-history/:userId',
  verifyJWT,
  historyLimiter,
  getDecisionHistory
);

// ============================================================================
// 404 HANDLER - List available endpoints
// ============================================================================

router.use((req, res) => {
  const endpoints = [
    {
      method: 'GET',
      path: '/api/vitalis/health',
      description: 'Service health check',
      auth: false,
    },
    {
      method: 'GET',
      path: '/api/vitalis/bio-state/:userId',
      description: 'Evaluate bio-physiological state',
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/vitalis/recommended-action/:userId',
      description: 'Get intelligent action recommendation',
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/vitalis/alerts/:userId',
      description: 'Get proactive alerts',
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/vitalis/acknowledge-alert/:userId/:alertId',
      description: 'Acknowledge alert with feedback',
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/vitalis/training-adjustment/:userId',
      description: 'Get training plan adjustments',
      auth: true,
    },
    {
      method: 'POST',
      path: '/api/vitalis/training-adjustment/:userId/accept',
      description: 'Accept training adjustment',
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/vitalis/nervous-system-report/:userId',
      description: 'Get nervous system monitoring report',
      auth: true,
    },
    {
      method: 'GET',
      path: '/api/vitalis/decision-history/:userId',
      description: 'Get decision history',
      auth: true,
    },
  ];

  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: endpoints,
  });
});

export default router;

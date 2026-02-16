import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyJWT } from '../middleware/auth';
import {
  getReadinessForecast,
  getInjuryProbability,
  getFatigueEstimate,
  getTrainingLoadSuggestion,
  getComprehensivePredictions,
  getModelInfo,
  getHealth,
} from '../controllers/mlForecastingController';

const router = Router();

// Rate limiters with different strictness for different endpoints
const forecastLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: 'Too many forecast requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const predictionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 requests for multiple predictions
  message: 'Too many prediction requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const comprehensiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests for comprehensive (more expensive)
  message: 'Too many comprehensive prediction requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const infoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests for info endpoints
  message: 'Too many info requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============ FORECAST ENDPOINTS ============

/**
 * GET /readiness-forecast/:userId
 * Get 7-day readiness forecast
 */
router.get(
  '/readiness-forecast/:userId',
  verifyJWT,
  forecastLimiter,
  getReadinessForecast
);

/**
 * GET /injury-probability/:userId
 * Get injury probability prediction for a specific date
 */
router.get(
  '/injury-probability/:userId',
  verifyJWT,
  predictionLimiter,
  getInjuryProbability
);

/**
 * GET /fatigue-estimate/:userId
 * Get fatigue level estimation
 */
router.get(
  '/fatigue-estimate/:userId',
  verifyJWT,
  predictionLimiter,
  getFatigueEstimate
);

/**
 * GET /training-load/:userId
 * Get training load suggestion for the day
 */
router.get(
  '/training-load/:userId',
  verifyJWT,
  predictionLimiter,
  getTrainingLoadSuggestion
);

// ============ COMPREHENSIVE ENDPOINTS ============

/**
 * GET /comprehensive/:userId
 * Get all predictions together (most expensive)
 */
router.get(
  '/comprehensive/:userId',
  verifyJWT,
  comprehensiveLimiter,
  getComprehensivePredictions
);

// ============ INFORMATION ENDPOINTS ============

/**
 * GET /model-info
 * Get model metadata and version information
 */
router.get('/model-info', verifyJWT, infoLimiter, getModelInfo);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', verifyJWT, infoLimiter, getHealth);

// ============ 404 HANDLER ============

/**
 * 404 handler - List available endpoints
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'ML Forecasting endpoint not found',
    availableEndpoints: [
      {
        method: 'GET',
        path: '/readiness-forecast/:userId',
        description: '7-day readiness forecast',
        queryParams: ['startDate (YYYY-MM-DD)'],
      },
      {
        method: 'GET',
        path: '/injury-probability/:userId',
        description: 'Injury probability prediction',
        queryParams: ['date (optional, defaults to today)'],
      },
      {
        method: 'GET',
        path: '/fatigue-estimate/:userId',
        description: 'Fatigue level estimation',
        queryParams: ['date (optional, defaults to today)'],
      },
      {
        method: 'GET',
        path: '/training-load/:userId',
        description: 'Training load suggestion',
        queryParams: ['date (optional, defaults to today)'],
      },
      {
        method: 'GET',
        path: '/comprehensive/:userId',
        description: 'All predictions combined',
        queryParams: ['date (optional)'],
      },
      {
        method: 'GET',
        path: '/model-info',
        description: 'Model metadata and version',
        queryParams: [],
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Service health status',
        queryParams: [],
      },
    ],
  });
});

export default router;

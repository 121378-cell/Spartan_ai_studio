import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { getMLForecastingService } from '../services/mlForecastingService';
import { ValidationError, NotFoundError } from '../utils/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

// interface AuthenticatedRequest extends Request {
//   user?: {
//     userId: string;
//     role: string;
//   };
// }

/**
 * ML Forecasting Controller
 * Handles REST endpoints for ML predictions
 */

/**
 * Get weekly readiness forecast
 * GET /api/ml-forecasting/readiness-forecast
 */
export const getReadinessForecast = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Verify user is authenticated and has permission to access this data
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // For security, ensure the requesting user can only access their own data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other users\' data',
      });
    }

    if (!startDate || typeof startDate !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'startDate is required (YYYY-MM-DD format)',
      });
    }

    const startDateMs = Date.parse(startDate);
    if (Number.isNaN(startDateMs)) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be a valid date (YYYY-MM-DD)',
      });
    }

    const service = getMLForecastingService();
    const forecast = await service.forecastReadiness(userId, startDateMs);

    logger.info('Readiness forecast retrieved', {
      context: 'mlForecastingController',
      metadata: { userId, startDate },
    });

    return res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting readiness forecast', {
      context: 'mlForecastingController',
      message,
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve readiness forecast',
    });
  }
};

/**
 * Get injury probability prediction
 * GET /api/ml-forecasting/injury-probability
 */
export const getInjuryProbability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Verify user is authenticated and has permission to access this data
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // For security, ensure the requesting user can only access their own data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other users\' data',
      });
    }

    const forecastDate = (date as string) || new Date().toISOString().split('T')[0];
    const forecastDateMs = Date.parse(forecastDate);
    if (Number.isNaN(forecastDateMs)) {
      return res.status(400).json({
        success: false,
        message: 'date must be a valid date (YYYY-MM-DD)',
      });
    }

    const service = getMLForecastingService();
    const prediction = await service.predictInjuryProbability(userId, forecastDate);

    logger.info('Injury probability retrieved', {
      context: 'mlForecastingController',
      metadata: { userId, date: forecastDate },
    });

    return res.status(200).json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting injury probability', {
      context: 'mlForecastingController',
      message,
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve injury probability',
    });
  }
};

/**
 * Get fatigue estimation
 * GET /api/ml-forecasting/fatigue-estimate
 */
export const getFatigueEstimate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Verify user is authenticated and has permission to access this data
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // For security, ensure the requesting user can only access their own data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other users\' data',
      });
    }

    const forecastDate = (date as string) || new Date().toISOString().split('T')[0];

    const service = getMLForecastingService();
    const estimate = await service.estimateFatigue(userId, forecastDate);

    logger.info('Fatigue estimate retrieved', {
      context: 'mlForecastingController',
      metadata: { userId, date: forecastDate },
    });

    return res.status(200).json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting fatigue estimate', {
      context: 'mlForecastingController',
      message,
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve fatigue estimate',
    });
  }
};

/**
 * Get training load suggestion
 * GET /api/ml-forecasting/training-load
 */
export const getTrainingLoadSuggestion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Verify user is authenticated and has permission to access this data
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // For security, ensure the requesting user can only access their own data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other users\' data',
      });
    }

    const forecastDate = (date as string) || new Date().toISOString().split('T')[0];

    const service = getMLForecastingService();
    const suggestion = await service.suggestTrainingLoad(userId, forecastDate);

    logger.info('Training load suggestion retrieved', {
      context: 'mlForecastingController',
      metadata: { userId, date: forecastDate },
    });

    return res.status(200).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting training load suggestion', {
      context: 'mlForecastingController',
      message,
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve training load suggestion',
    });
  }
};

/**
 * Get comprehensive ML predictions
 * GET /api/ml-forecasting/comprehensive/:userId
 */
export const getComprehensivePredictions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required',
      });
    }

    // Verify user is authenticated and has permission to access this data
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // For security, ensure the requesting user can only access their own data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other users\' data',
      });
    }

    const forecastDate = (date as string) || new Date().toISOString().split('T')[0];
    const forecastDateMs = Date.parse(forecastDate);
    if (Number.isNaN(forecastDateMs)) {
      return res.status(400).json({
        success: false,
        message: 'date must be a valid date (YYYY-MM-DD)',
      });
    }
    const service = getMLForecastingService();

    // Parallel execution of all predictions
    const [
      weeklyForecast,
      injuryProbability,
      fatigueEstimate,
      trainingLoadSuggestion,
    ] = await Promise.all([
      service.forecastReadiness(userId, forecastDateMs),
      service.predictInjuryProbability(userId, forecastDate),
      service.estimateFatigue(userId, forecastDate),
      service.suggestTrainingLoad(userId, forecastDate),
    ]);

    logger.info('Comprehensive predictions retrieved', {
      context: 'mlForecastingController',
      metadata: { userId, date: forecastDate },
    });

    return res.status(200).json({
      success: true,
      data: {
        weeklyForecast,
        injuryProbability,
        fatigueEstimate,
        trainingLoadSuggestion,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting comprehensive predictions', {
      context: 'mlForecastingController',
      message,
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve comprehensive predictions',
    });
  }
};

/**
 * Get model metadata and version information
 * GET /api/ml-forecasting/model-info
 */
export const getModelInfo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getMLForecastingService();
    const metadata = service.getModelMetadata();

    logger.info('Model metadata retrieved', {
      context: 'mlForecastingController',
      metadata: { version: metadata.version },
    });

    return res.status(200).json({
      success: true,
      data: {
        metadata,
        lastUpdated: metadata.trainingDate,
        status: 'active',
      },
    });
  } catch (error) {
    logger.error('Error getting model info', {
      context: 'mlForecastingController',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve model information',
    });
  }
};

/**
 * Health check endpoint
 * GET /api/ml-forecasting/health
 */
export const getHealth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const service = getMLForecastingService();
    const metadata = service.getModelMetadata();

    return res.status(200).json({
      success: true,
      data: {
        status: 'operational',
        modelVersion: metadata.version,
        features: [
          'readiness-forecasting',
          'injury-probability',
          'fatigue-estimation',
          'training-load-suggestion',
        ],
        endpoints: [
          'GET /readiness-forecast/:userId',
          'GET /injury-probability/:userId',
          'GET /fatigue-estimate/:userId',
          'GET /training-load/:userId',
          'GET /comprehensive/:userId',
          'GET /model-info',
          'GET /health',
        ],
      },
    });
  } catch (error) {
    logger.error('Error in health check', {
      context: 'mlForecastingController',
      message: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Service health check failed',
    });
  }
};

/**
 * Predictive Analysis Routes
 * 
 * API endpoints for trend analysis, fatigue prediction, and historical comparisons
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import PredictiveAnalysisService from '../services/predictiveAnalysisService';
import { UserModel } from '../models/User';
import { rateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errorHandler';

export const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply rate limiting (50 req/min for analysis endpoints)
const analysisRateLimit = rateLimiter(50);
router.use(analysisRateLimit);

/**
 * GET /trends/:period
 * 
 * Get trend analysis for a time period (7d, 30d, 90d)
 * 
 * @param period - '7d', '30d', or '90d'
 * @returns TrendAnalysis with statistics, components, insights, and recommendations
 */
router.get(
  '/trends/:period',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { period } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!['7d', '30d', '90d'].includes(period)) {
        throw new ValidationError('Invalid period. Use: 7d, 30d, or 90d');
      }

      // Get user's biometric history
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch from database
      // For now, we'll return a mock response
      const biometricHistory: any[] = [];

      if (biometricHistory.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            message:
              'Insufficient biometric data. Please sync data from your wearables.',
            minimumDataPoints: 3,
            currentDataPoints: 0,
          },
        });
      }

      const trendAnalysis =
        PredictiveAnalysisService.calculateTrendAnalysis(
          biometricHistory,
          period as '7d' | '30d' | '90d'
        );

      logger.info('Trend analysis calculated', {
        context: 'predictive-analysis',
        metadata: { userId, period },
      });

      return res.status(200).json({
        success: true,
        data: trendAnalysis,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({ success: false, message: error.message });
      }
      throw error;
    }
  }
);

/**
 * GET /fatigue-risk
 * 
 * Get fatigue prediction for the next 7 days
 * 
 * @query daysAhead - Optional: number of days to predict (default: 7)
 * @returns FatiguePrediction with risk factors and recommendations
 */
router.get('/fatigue-risk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const daysAhead = parseInt(req.query.daysAhead as string) || 7;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (daysAhead < 1 || daysAhead > 30) {
      throw new ValidationError('daysAhead must be between 1 and 30');
    }

    // Get user's recent biometric data
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // In production, fetch from database (last 14 days)
    const recentBiometrics: any[] = [];

    if (recentBiometrics.length < 3) {
      return res.status(200).json({
        success: true,
        data: {
          message:
            'Insufficient data for fatigue prediction. Need at least 3 days of data.',
          minimumDataPoints: 3,
          currentDataPoints: recentBiometrics.length,
        },
      });
    }

    const fatiguePrediction =
      PredictiveAnalysisService.predictFatigue(
        recentBiometrics,
        daysAhead
      );

    logger.info('Fatigue prediction generated', {
      context: 'predictive-analysis',
      metadata: { userId, fatigueLevel: fatiguePrediction.fatigueLevel },
    });

    return res.status(200).json({
      success: true,
      data: fatiguePrediction,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    throw error;
  }
});

/**
 * GET /historical-comparison
 * 
 * Compare current period metrics with previous period
 * 
 * @query days - Optional: number of days per period (default: 30)
 * @returns HistoricalComparison with changes and assessment
 */
router.get(
  '/historical-comparison',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const days = parseInt(req.query.days as string) || 30;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (days < 7 || days > 90) {
        throw new ValidationError('days must be between 7 and 90');
      }

      // Get user data
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch from database
      // Current period: last 'days' days
      // Previous period: 'days' days before that
      const currentPeriodData: any[] = [];
      const previousPeriodData: any[] = [];

      if (currentPeriodData.length === 0 || previousPeriodData.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            message:
              'Insufficient historical data for comparison. Please wait for more data to accumulate.',
            minimumDaysRequired: days * 2,
            currentDataPoints:
              currentPeriodData.length + previousPeriodData.length,
          },
        });
      }

      const comparison = PredictiveAnalysisService.compareHistoricalData(
        currentPeriodData,
        previousPeriodData
      );

      logger.info('Historical comparison completed', {
        context: 'predictive-analysis',
        metadata: { userId, assessment: comparison.assessment },
      });

      return res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({ success: false, message: error.message });
      }
      throw error;
    }
  }
);

/**
 * GET /overtraining-detection
 * 
 * Detect signs of overtraining syndrome
 * 
 * @returns OvertainingDetection with severity and recommendations
 */
router.get(
  '/overtraining-detection',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Get user data
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch last 30 days from database
      const biometricHistory: any[] = [];

      if (biometricHistory.length < 7) {
        return res.status(200).json({
          success: true,
          data: {
            message:
              'Insufficient data for overtraining detection. Need at least 7 days of data.',
            minimumDataPoints: 7,
            currentDataPoints: biometricHistory.length,
          },
        });
      }

      const overtainingDetection =
        PredictiveAnalysisService.detectOvertraining(
          biometricHistory
        );

      logger.info('Overtraining detection completed', {
        context: 'predictive-analysis',
        metadata: {
          userId,
          isOvertrained: overtainingDetection.isOvertrained,
          riskLevel: overtainingDetection.riskLevel,
        },
      });

      return res.status(200).json({
        success: true,
        data: overtainingDetection,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({ success: false, message: error.message });
      }
      throw error;
    }
  }
);

/**
 * GET /anomalies
 * 
 * Detect anomalies in recent biometric data
 * 
 * @returns AnomalyDetection with list of detected anomalies
 */
router.get('/anomalies', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Get user data
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // In production, fetch from database
    const recentBiometrics: any[] = [];
    const historicalBaseline: any[] = [];

    if (recentBiometrics.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'No recent biometric data available',
          currentDataPoints: 0,
        },
      });
    }

    if (historicalBaseline.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'Insufficient historical baseline data for comparison',
          minimumDataPoints: 7,
          currentDataPoints: historicalBaseline.length,
        },
      });
    }

    const anomalies = PredictiveAnalysisService.detectAnomalies(
      recentBiometrics,
      historicalBaseline
    );

    logger.info('Anomaly detection completed', {
      context: 'predictive-analysis',
      metadata: {
        userId,
        anomalyCount: anomalies.anomalyCount,
      },
    });

    return res.status(200).json({
      success: true,
      data: anomalies,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    throw error;
  }
});

/**
 * GET /comprehensive-analysis
 * 
 * Get comprehensive predictive analytics summary
 * Combines trends, fatigue, overtraining, and anomalies
 * 
 * @returns PredictiveAnalyticsSummary with all analyses
 */
router.get(
  '/comprehensive-analysis',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Get user data
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch all required data from database
      const biometricHistory: any[] = [];
      const recentBiometrics: any[] = [];
      const historicalBaseline: any[] = [];

      if (biometricHistory.length < 7) {
        return res.status(200).json({
          success: true,
          data: {
            message:
              'Insufficient data for comprehensive analysis. Need at least 7 days of biometric data.',
            minimumDataPoints: 7,
            currentDataPoints: biometricHistory.length,
          },
        });
      }

      // Calculate all analyses
      const trends = PredictiveAnalysisService.calculateTrendAnalysis(
        biometricHistory,
        '30d'
      );
      const fatigueRisk = PredictiveAnalysisService.predictFatigue(
        recentBiometrics,
        7
      );
      const overtainingDetection =
        PredictiveAnalysisService.detectOvertraining(
          biometricHistory
        );
      const anomalies = PredictiveAnalysisService.detectAnomalies(
        recentBiometrics,
        historicalBaseline
      );

      // Generate overall assessment
      const overallScore = Math.round(
        (trends.statistics.mean + 100 - fatigueRisk.fatigueRisk) / 2
      );
      let status: 'excellent' | 'good' | 'fair' | 'concerning' =
        'concerning';
      if (overallScore >= 80) status = 'excellent';
      else if (overallScore >= 60) status = 'good';
      else if (overallScore >= 40) status = 'fair';

      const summary = {
        userId,
        generatedAt: new Date(),
        trends,
        fatigueRisk,
        overtrainingDetection: overtainingDetection,
        historicalComparison: {
          // Simplified for this example
          currentPeriod: {
            start: biometricHistory[biometricHistory.length - 1].date,
            end: biometricHistory[0].date,
            averageRecovery: trends.statistics.mean,
            averageHRV: trends.componentTrends.hrv.mean,
            averageRHR: trends.componentTrends.rhr.mean,
            averageSleepDuration: 480,
            averageSleepQuality: 'good' as const,
          },
          previousPeriod: {
            start: '',
            end: '',
            averageRecovery: 50,
            averageHRV: 50,
            averageRHR: 60,
            averageSleepDuration: 480,
            averageSleepQuality: 'good' as const,
          },
          changes: {
            recoveryDelta: 0,
            hrvDelta: 0,
            rhrDelta: 0,
            sleepDurationDelta: 0,
          },
          assessment: 'stable' as const,
        },
        overallHealthAssessment: {
          score: overallScore,
          status,
          keyInsights: [
            ...trends.insights,
            ...fatigueRisk.recommendations.slice(0, 2),
          ],
          actionItems: [
            ...trends.recommendations,
            ...fatigueRisk.recommendations,
          ],
        },
      };

      logger.info('Comprehensive analysis generated', {
        context: 'predictive-analysis',
        metadata: { userId, overallStatus: status },
      });

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({ success: false, message: error.message });
      }
      throw error;
    }
  }
);

export default router;

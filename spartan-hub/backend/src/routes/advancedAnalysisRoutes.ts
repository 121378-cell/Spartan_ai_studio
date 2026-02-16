/**
 * Advanced Analysis Routes
 * 
 * API endpoints for injury prediction, training recommendations,
 * and performance analytics
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import AdvancedAnalysisService from '../services/advancedAnalysisService';
import { UserModel } from '../models/User';
import { rateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errorHandler';

export const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply rate limiting (40 req/min for advanced analysis)
const advancedRateLimit = rateLimiter(40);
router.use(advancedRateLimit);

/**
 * POST /injury-prediction
 * 
 * Predict injury risk based on biometric patterns
 * 
 * @body trainingLoad - Optional: array of {date, volume, intensity}
 * @returns InjuryRiskAssessment with risk factors and prevention recommendations
 */
router.post(
  '/injury-prediction',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { trainingLoad } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch biometric history from database
      const biometricHistory: any[] = [];

      if (biometricHistory.length < 7) {
        return res.status(200).json({
          success: true,
          data: {
            message:
              'Insufficient data for injury prediction. Need at least 7 days of biometric data.',
            minimumDataPoints: 7,
            currentDataPoints: biometricHistory.length,
          },
        });
      }

      const injuryPrediction =
        AdvancedAnalysisService.predictInjuryRisk(
          biometricHistory,
          trainingLoad
        );

      logger.info('Injury prediction generated', {
        context: 'advanced-analysis',
        metadata: {
          userId,
          injuryRisk: injuryPrediction.injuryRisk,
          riskLevel: injuryPrediction.riskLevel,
        },
      });

      return res.status(200).json({
        success: true,
        data: injuryPrediction,
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
 * POST /training-load-analysis
 * 
 * Analyze training load and recovery balance
 * 
 * @body trainingData - Required: array of {date, volume, intensity}
 * @returns TrainingLoadAnalysis with weekly metrics and progression
 */
router.post(
  '/training-load-analysis',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { trainingData } = req.body;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!trainingData || !Array.isArray(trainingData) || trainingData.length === 0) {
        throw new ValidationError('trainingData array is required');
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch biometric history
      const biometricHistory: any[] = [];

      const loadAnalysis = AdvancedAnalysisService.analyzeTrainingLoad(
        trainingData,
        biometricHistory
      );

      logger.info('Training load analysis completed', {
        context: 'advanced-analysis',
        metadata: {
          userId,
          acuteToChronicRatio: loadAnalysis.acuteToChronic.ratio,
          status: loadAnalysis.acuteToChronic.status,
        },
      });

      return res.status(200).json({
        success: true,
        data: loadAnalysis,
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
 * POST /training-recommendations
 * 
 * Generate personalized training recommendations
 * 
 * @body injuryRisk, trainingLoad, biometricHistory
 * @returns TrainingRecommendation with weekly plan and targets
 */
router.post(
  '/training-recommendations',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch all required data
      const biometricHistory: any[] = [];

      if (biometricHistory.length < 7) {
        return res.status(200).json({
          success: true,
          data: {
            message:
              'Insufficient data for recommendations. Need at least 7 days of data.',
            minimumDataPoints: 7,
            currentDataPoints: biometricHistory.length,
          },
        });
      }

      // Generate analyses
      const injuryRisk = AdvancedAnalysisService.predictInjuryRisk(
        biometricHistory
      );
      const trainingLoad = AdvancedAnalysisService.analyzeTrainingLoad(
        [],
        biometricHistory
      );
      const recommendations =
        AdvancedAnalysisService.generateTrainingRecommendations(
          injuryRisk,
          trainingLoad,
          biometricHistory
        );

      logger.info('Training recommendations generated', {
        context: 'advanced-analysis',
        metadata: { userId, recommendedFocus: recommendations.recommendedFocus },
      });

      return res.status(200).json({
        success: true,
        data: recommendations,
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
 * POST /periodization-plan
 * 
 * Create a periodized training plan
 * 
 * @query weeks - Duration in weeks (default: 12)
 * @query goal - 'strength' | 'endurance' | 'power' | 'hypertrophy'
 * @returns PeriodizationPlan with phases and milestones
 */
router.post(
  '/periodization-plan',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const weeks = parseInt(req.query.weeks as string) || 12;
      const goal = (req.query.goal as string) || 'strength';

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (weeks < 4 || weeks > 52) {
        throw new ValidationError('Weeks must be between 4 and 52');
      }

      if (
        !['strength', 'endurance', 'power', 'hypertrophy'].includes(
          goal
        )
      ) {
        throw new ValidationError(
          'Goal must be: strength, endurance, power, or hypertrophy'
        );
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const today = new Date().toISOString().split('T')[0];
      const plan = AdvancedAnalysisService.createPeriodizationPlan(
        today,
        weeks,
        goal as 'strength' | 'endurance' | 'power' | 'hypertrophy'
      );

      logger.info('Periodization plan created', {
        context: 'advanced-analysis',
        metadata: { userId, weeks, goal },
      });

      return res.status(200).json({
        success: true,
        data: plan,
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
 * GET /movement-quality
 * 
 * Assess movement quality and identify asymmetries
 * 
 * @returns MovementQualityAssessment with pattern scores and corrections
 */
router.get(
  '/movement-quality',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch biometric history
      const biometricHistory: any[] = [];

      if (biometricHistory.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            message: 'No biometric data available for movement assessment',
          },
        });
      }

      const assessment = AdvancedAnalysisService.assessMovementQuality(
        biometricHistory
      );

      logger.info('Movement quality assessment completed', {
        context: 'advanced-analysis',
        metadata: { userId, qualityScore: assessment.qualityScore },
      });

      return res.status(200).json({
        success: true,
        data: assessment,
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
 * GET /performance-forecast
 * 
 * Forecast performance potential and improvements
 * 
 * @query weeks - Forecast period in weeks (default: 12)
 * @returns PerformanceForecast with projections and plateau analysis
 */
router.get(
  '/performance-forecast',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const weeks = parseInt(req.query.weeks as string) || 12;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (weeks < 1 || weeks > 52) {
        throw new ValidationError('Weeks must be between 1 and 52');
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch biometric history
      const biometricHistory: any[] = [];

      if (biometricHistory.length < 14) {
        return res.status(200).json({
          success: true,
          data: {
            message:
              'Insufficient data for performance forecast. Need at least 14 days.',
            minimumDataPoints: 14,
            currentDataPoints: biometricHistory.length,
          },
        });
      }

      const forecast = AdvancedAnalysisService.forecastPerformance(
        biometricHistory,
        undefined,
        weeks
      );

      logger.info('Performance forecast generated', {
        context: 'advanced-analysis',
        metadata: { userId, forecastWeeks: weeks },
      });

      return res.status(200).json({
        success: true,
        data: forecast,
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
 * GET /recovery-protocol
 * 
 * Get personalized recovery protocol
 * 
 * @returns RecoveryProtocol with recommended modalities and timeline
 */
router.get(
  '/recovery-protocol',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch biometric history
      const biometricHistory: any[] = [];

      if (biometricHistory.length === 0) {
        return res.status(200).json({
          success: true,
          data: { message: 'No biometric data available' },
        });
      }

      // Get injury risk first
      const injuryRisk = AdvancedAnalysisService.predictInjuryRisk(
        biometricHistory
      );
      const protocol = AdvancedAnalysisService.prescribeRecoveryProtocol(
        injuryRisk,
        biometricHistory
      );

      logger.info('Recovery protocol prescribed', {
        context: 'advanced-analysis',
        metadata: {
          userId,
          recoveryNeeded: protocol.recoveryNeeded,
        },
      });

      return res.status(200).json({
        success: true,
        data: protocol,
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
 * GET /advanced-dashboard
 * 
 * Get comprehensive advanced performance dashboard
 * Combines all analyses in one view
 * 
 * @returns AdvancedPerformanceDashboard with all metrics and recommendations
 */
router.get(
  '/advanced-dashboard',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // In production, fetch all required data
      const biometricHistory: any[] = [];
      const trainingLoad: any[] = [];

      if (biometricHistory.length < 7) {
        return res.status(200).json({
          success: true,
          data: {
            message:
              'Insufficient data for advanced dashboard. Need at least 7 days of biometric data.',
            minimumDataPoints: 7,
            currentDataPoints: biometricHistory.length,
          },
        });
      }

      const dashboard = AdvancedAnalysisService.generateAdvancedDashboard(
        userId,
        biometricHistory,
        trainingLoad.length > 0 ? trainingLoad : undefined
      );

      logger.info('Advanced dashboard generated', {
        context: 'advanced-analysis',
        metadata: {
          userId,
          overallReadiness: dashboard.summary.overallReadiness,
          trainingStatus: dashboard.summary.trainingStatus,
        },
      });

      return res.status(200).json({
        success: true,
        data: dashboard,
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

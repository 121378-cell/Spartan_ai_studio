/**
 * ML-Enhanced Injury Prediction Routes
 * Bridges Phase 4 ML with Phase 3 Advanced Analysis
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { InjuryPredictionModel } from '../ml/models/injuryPredictionModel';
import { MLInferenceService } from '../ml/services/mlInferenceService';
import { BiometricModel } from '../models/BiometricData';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(rateLimiter(40));  // 40 req/min for ML endpoints (stricter)

/**
 * POST /api/ml/injury-prediction
 * ML-enhanced injury risk prediction with Phase 3 fallback
 */
router.post('/injury-prediction', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params || req.body;
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get user biometric history (last 90 days)
    const biometrics = await BiometricModel.find({
      userId: req.userId,
      date: {
        $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        $lte: new Date(),
      },
    }).sort({ date: 1 });

    if (biometrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient biometric data (need at least 7 days)',
      });
    }

    // Predict injury risk using ML model
    const prediction = await InjuryPredictionModel.predict(
      biometrics,
      req.body.trainingLoad
    );

    logger.info('ML injury prediction request completed', {
      context: 'routes/mlInjuryPrediction',
      metadata: {
        userId: req.userId,
        riskScore: prediction.injuryRisk,
        riskLevel: prediction.riskLevel,
        mlSource: prediction.mlSource,
        confidence: prediction.confidence,
      },
    });

    return res.status(200).json({
      success: true,
      data: prediction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in ML injury prediction', {
      context: 'routes/mlInjuryPrediction',
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Error predicting injury risk',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/ml/injury-prediction/explain
 * Get detailed explanation of injury risk prediction (SHAP values)
 */
router.post('/injury-prediction/explain', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get biometric history
    const biometrics = await BiometricModel.find({
      userId: req.userId,
      date: {
        $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        $lte: new Date(),
      },
    }).sort({ date: 1 });

    if (biometrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient biometric data',
      });
    }

    // Get prediction with detailed analysis
    const prediction = await InjuryPredictionModel.predict(biometrics);

    // Calculate feature importance (mock SHAP values)
    const featureImportance = {
      acuteToChronicRatio: prediction.riskFactors.highTrainingLoad ? 0.25 : 0.10,
      recoveryScore: prediction.riskFactors.inadequateRecovery ? 0.20 : 0.10,
      hrvVariability: prediction.riskFactors.muscleImbalance ? 0.15 : 0.05,
      sleepQuality: prediction.riskFactors.sleepDeprivation ? 0.15 : 0.08,
      overusePattern: prediction.riskFactors.overusePattern ? 0.20 : 0.05,
      inflammationMarkers: prediction.riskFactors.inflammationMarkers ? 0.15 : 0.05,
      rapidIntensity: prediction.riskFactors.rapidIntensityIncrease ? 0.10 : 0.05,
    };

    // Normalize to sum to 1
    const total = Object.values(featureImportance).reduce((a, b) => a + b, 0);
    const normalized = Object.fromEntries(
      Object.entries(featureImportance).map(([k, v]) => [k, v / total])
    );

    logger.info('Injury prediction explanation requested', {
      context: 'routes/mlInjuryPredictionExplain',
      metadata: {
        userId: req.userId,
        riskScore: prediction.injuryRisk,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        prediction: prediction.injuryRisk,
        riskLevel: prediction.riskLevel,
        confidence: prediction.confidence,
        featureImportance: normalized,
        riskFactors: prediction.riskFactors,
        explanations: {
          highTrainingLoad: prediction.riskFactors.highTrainingLoad
            ? 'ACR > 1.3 indicates potential overtraining'
            : 'Training load within safe range',
          inadequateRecovery: prediction.riskFactors.inadequateRecovery
            ? '3+ days with low recovery score detected'
            : 'Recovery score trending well',
          muscleImbalance: prediction.riskFactors.muscleImbalance
            ? 'HRV variability suggests imbalances'
            : 'Movement patterns appear balanced',
          sleepDeprivation: prediction.riskFactors.sleepDeprivation
            ? 'Multiple nights with <6 hours sleep'
            : 'Sleep duration adequate',
          overusePattern: prediction.riskFactors.overusePattern
            ? 'Consecutive low recovery days detected'
            : 'No overuse patterns identified',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error explaining injury prediction', {
      context: 'routes/mlInjuryPredictionExplain',
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Error generating explanation',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/ml/injury-prediction/model-status
 * Get ML model status and metrics
 */
router.get('/injury-prediction/model-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = MLInferenceService.getModelStatus();

    logger.info('Model status requested', {
      context: 'routes/mlModelStatus',
      metadata: {
        userId: req.userId,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        mlSystemReady: status.mlInitialized,
        injuryPredictionModel: {
          available: status.models.injuryPrediction.available,
          metrics: status.models.injuryPrediction.metrics,
        },
        fallbackEnabled: status.config.fallbackEnabled,
        confidenceThreshold: status.config.confidenceThreshold,
        cacheEnabled: status.config.cacheEnabled,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting model status', {
      context: 'routes/mlModelStatus',
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Error retrieving model status',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/ml/injury-prediction/feedback
 * Log user feedback on prediction accuracy (for model retraining)
 */
router.post('/injury-prediction/feedback', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const { predictionId, actualOutcome, feedback, rating } = req.body;

    if (!actualOutcome || !['injury', 'no-injury'].includes(actualOutcome)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid outcome (must be "injury" or "no-injury")',
      });
    }

    // Store feedback for future model retraining
    logger.info('Injury prediction feedback received', {
      context: 'routes/mlPredictionFeedback',
      metadata: {
        userId: req.userId,
        predictionId,
        actualOutcome,
        rating: rating || 'not-provided',
      },
    });

    // In production: Store to database for ML retraining pipeline
    // In development: Just log it

    return res.status(200).json({
      success: true,
      message: 'Feedback recorded successfully',
      data: {
        timestamp: new Date().toISOString(),
        feedbackId: `feedback_${Date.now()}`,
      },
    });
  } catch (error) {
    logger.error('Error storing prediction feedback', {
      context: 'routes/mlPredictionFeedback',
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Error storing feedback',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;

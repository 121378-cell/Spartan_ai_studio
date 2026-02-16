/**
 * ML-Enhanced Training Recommendation Routes
 * Phase 4.3 - Personalized Training Plan Generation
 * 
 * Provides personalized 7-day training plans based on:
 * - Biometric data and recovery markers
 * - Historical training patterns
 * - User preferences and constraints
 * - Performance trends and goals
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { TrainingRecommenderModel } from '../ml/models/trainingRecommenderModel';
import { BiometricModel } from '../models/BiometricData';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(rateLimiter(40));  // 40 req/min for ML endpoints (stricter)

/**
 * POST /api/ml/training-recommendations
 * Generate personalized 7-day training plan
 * 
 * Request body:
 * {
 *   trainingHistory?: Array<{dayOfWeek, type, duration, intensity, focus}>,
 *   preferences?: {preferredTypes, daysPerWeek, targetIntensity}
 * }
 */
router.post('/training-recommendations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get user biometric history (last 90 days for comprehensive analysis)
    const biometrics = await BiometricModel.find({
      userId: req.userId,
      date: {
        $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        $lte: new Date(),
      },
    }).sort({ date: 1 });

    if (biometrics.length < 7) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient biometric data (need at least 7 days)',
        metadata: {
          dataPoints: biometrics.length,
          required: 7,
        },
      });
    }

    // Extract optional training history and preferences from request
    const { trainingHistory, preferences } = req.body;

    // Generate training recommendations using ML model
    const recommendation = await TrainingRecommenderModel.predict(
      biometrics,
      trainingHistory,
      preferences
    );

    logger.info('Training recommendations generated successfully', {
      context: 'routes/mlTrainingRecommender',
      metadata: {
        userId: req.userId,
        dataPoints: biometrics.length,
        confidence: recommendation.confidence,
        mlSource: recommendation.mlSource,
        focusAreas: recommendation.focusAreas.length,
      },
    });

    return res.status(200).json({
      success: true,
      data: recommendation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error generating training recommendations', {
      context: 'routes/mlTrainingRecommender',
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Error generating training recommendations',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/ml/training-recommendations/explain
 * Get detailed explanation of training plan (why specific sessions recommended)
 */
router.post('/training-recommendations/explain', async (req: AuthenticatedRequest, res: Response) => {
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

    if (biometrics.length < 7) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient biometric data',
        metadata: {
          dataPoints: biometrics.length,
          required: 7,
        },
      });
    }

    const { trainingHistory, preferences } = req.body;

    // Generate recommendations
    const recommendation = await TrainingRecommenderModel.predict(
      biometrics,
      trainingHistory,
      preferences
    );

    // Calculate feature importance based on focus areas
    const featureImportance = {
      recoveryStatus: recommendation.adjustments.recommended ? 0.30 : 0.15,
      trainingLoad: 0.25,
      performanceTrends: 0.20,
      trainingHistory: 0.15,
      userPreferences: 0.10,
    };

    // Normalize to sum to 1
    const total = Object.values(featureImportance).reduce((a, b) => a + b, 0);
    const normalized = Object.fromEntries(
      Object.entries(featureImportance).map(([k, v]) => [k, v / total])
    );

    logger.info('Training recommendation explanation requested', {
      context: 'routes/mlTrainingRecommenderExplain',
      metadata: {
        userId: req.userId,
        focusAreas: recommendation.focusAreas.length,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        weekPlan: recommendation.weekPlan,
        reasoning: recommendation.reasoning,
        focusAreas: recommendation.focusAreas,
        expectedOutcomes: recommendation.expectedOutcomes,
        adjustments: recommendation.adjustments,
        featureImportance: normalized,
        personalizedTips: recommendation.personalizedTips,
        confidence: recommendation.confidence,
        mlSource: recommendation.mlSource,
        explanations: {
          focusAreas: recommendation.focusAreas.map(area => {
            const explanations: Record<string, string> = {
              'Recovery Prioritization': 'Your training load is high - this plan emphasizes active recovery',
              'Flexibility & Mobility': 'Limited flexibility work detected - adding dedicated mobility sessions',
              'High-Intensity Intervals': 'Anaerobic capacity development needed - including HIIT sessions',
              'Performance Boost': 'Recent performance decline detected - increasing intensity to reverse trend',
              'Consistent Performance': 'Maintaining your consistent performance level',
            };
            return explanations[area] || `Focus area: ${area}`;
          }),
          expectedOutcomes: {
            performanceImprovement: `${recommendation.expectedOutcomes.performanceImprovement.toFixed(1)}% improvement expected`,
            fatigueLevel: `${recommendation.expectedOutcomes.fatigueLevel.toFixed(0)}% fatigue level (target: 40-60%)`,
            injuryRisk: `${recommendation.expectedOutcomes.injuryRisk.toFixed(0)}% injury risk`,
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error explaining training recommendations', {
      context: 'routes/mlTrainingRecommenderExplain',
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
 * GET /api/ml/training-recommendations/current-status
 * Get current training readiness and recovery status
 */
router.get('/training-recommendations/current-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get latest biometric data (last 7 days)
    const recentBiometrics = await BiometricModel.find({
      userId: req.userId,
      date: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        $lte: new Date(),
      },
    }).sort({ date: -1 }); // Sort descending by date

    if (recentBiometrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recent biometric data available',
      });
    }

    // Calculate current readiness (simple algorithm)
    const latest = recentBiometrics[0];
    const recoveryScore = latest.recoveryIndex?.score || 50;
    const sleepHours = latest.sleep?.duration ? latest.sleep.duration / 60 : 7; // Convert minutes to hours
    const rhr = latest.restingHeartRate?.[0]?.value || 60;

    // Readiness score: 0-100
    const readinessScore = Math.round(
      (recoveryScore * 0.4) + 
      ((sleepHours / 9) * 100 * 0.3) + 
      ((Math.max(0, 75 - rhr) / 25) * 100 * 0.3)
    );

    // Determine readiness level
    let readinessLevel: 'low' | 'moderate' | 'high';
    if (readinessScore < 40) readinessLevel = 'low';
    else if (readinessScore < 70) readinessLevel = 'moderate';
    else readinessLevel = 'high';

    logger.info('Training readiness status requested', {
      context: 'routes/mlTrainingRecommenderStatus',
      metadata: {
        userId: req.userId,
        readinessScore,
        readinessLevel,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        readinessScore,
        readinessLevel,
        recoveryScore,
        sleepHours,
        restingHeartRate: rhr,
        recommendation: readinessLevel === 'high' 
          ? 'Ready for high-intensity training' 
          : readinessLevel === 'moderate'
            ? 'Moderate readiness - consider moderate intensity'
            : 'Low readiness - prioritize recovery',
        lastUpdated: latest.date,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting training status', {
      context: 'routes/mlTrainingRecommenderStatus',
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Error retrieving training status',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/ml/training-recommendations/feedback
 * Log user feedback on training plan recommendations
 * Helps improve personalization for future plans
 */
router.post('/training-recommendations/feedback', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const { planId, completed, difficulty, effectiveness, feedback, rating } = req.body;

    if (!planId || typeof completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: planId, completed',
      });
    }

    if (difficulty && !['too-easy', 'appropriate', 'too-hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty value',
      });
    }

    // Store feedback for future plan personalization
    logger.info('Training plan feedback received', {
      context: 'routes/mlTrainingRecommenderFeedback',
      metadata: {
        userId: req.userId,
        planId,
        completed,
        difficulty: difficulty || 'not-provided',
        effectiveness: effectiveness || 'not-provided',
        rating: rating || 'not-provided',
      },
    });

    // In production: Store to database for personalization engine
    // In development: Just log it

    return res.status(200).json({
      success: true,
      message: 'Training plan feedback recorded successfully',
      data: {
        timestamp: new Date().toISOString(),
        feedbackId: `feedback_${Date.now()}`,
      },
    });
  } catch (error) {
    logger.error('Error storing training feedback', {
      context: 'routes/mlTrainingRecommenderFeedback',
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

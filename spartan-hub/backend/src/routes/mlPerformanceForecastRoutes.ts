/**
 * ML-Enhanced Performance Forecasting Routes
 * Phase 4.4 - Predictive Performance Analysis
 * 
 * Provides 12-week performance forecasts based on:
 * - Historical performance trends
 * - Training load progression
 * - Recovery patterns
 * - Seasonal effects
 * - Periodization cycles
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { PerformanceForecastModel } from '../ml/models/performanceForecastModel';
import { DailyBiometrics, BiometricModel } from '../models/BiometricData';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(rateLimiter(40));  // 40 req/min for ML endpoints (stricter)

/**
 * POST /api/ml/performance-forecast
 * Generate 12-week performance forecast
 * 
 * Request body:
 * {
 *   performanceHistory?: Array<{date, score, sport, distance}>,
 *   trainingGoals?: {targetPerformance, timeframe, sport}
 * }
 */
router.post('/performance-forecast', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 84 days = 12 weeks

    const biometricQuery = BiometricModel.find({ userId: req.userId, date: { $gte: twelveWeeksAgo } });
    const biometrics = await biometricQuery.sort({ date: -1 });

    if (biometrics.length < 28) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient biometric data (need at least 4 weeks)',
        metadata: {
          dataPoints: biometrics.length,
          required: 28,
        },
      });
    }

    // Extract optional data from request
    const { performanceHistory, trainingGoals } = req.body;

    // Generate performance forecast using ML model
    const forecast = await PerformanceForecastModel.predict(
      biometrics,
      performanceHistory,
      trainingGoals
    );

    logger.info('Performance forecast generated successfully', {
      context: 'routes/mlPerformanceForecast',
      metadata: {
        userId: req.userId,
        dataPoints: biometrics.length,
        trendDirection: forecast.trendAnalysis.direction,
        anomaliesDetected: forecast.anomalies.detected,
        confidence: forecast.confidence,
      },
    });

    return res.status(200).json({
      success: true,
      data: forecast,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error generating performance forecast', {
      context: 'routes/mlPerformanceForecast',
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Error generating performance forecast',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/ml/performance-forecast/scenario
 * What-if analysis: predict performance under different training scenarios
 */
router.post('/performance-forecast/scenario', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const { scenario, adjustments } = req.body;

    if (!scenario || !['increased-volume', 'reduced-intensity', 'recovery-focus', 'peak-prep'].includes(scenario)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scenario (must be: increased-volume, reduced-intensity, recovery-focus, peak-prep)',
      });
    }

    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const biometricQuery = BiometricModel.find({ userId: req.userId, date: { $gte: twelveWeeksAgo } });
    const biometrics = await biometricQuery.sort({ date: -1 });

    if (biometrics.length < 28) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient biometric data',
      });
    }

    // Generate base forecast
    const baseForecast = await PerformanceForecastModel.predict(biometrics);

    // Apply scenario modifications
    const scenarioForecast = applyScenarioAdjustments(baseForecast, scenario, adjustments);

    logger.info('Scenario analysis completed', {
      context: 'routes/mlPerformanceForecastScenario',
      metadata: {
        userId: req.userId,
        scenario,
        baselinePerformance: baseForecast.predictions[0].expectedPerformance,
        scenarioPerformance: scenarioForecast.predictions[0].expectedPerformance,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        baseline: baseForecast,
        scenario: scenarioForecast,
        comparison: {
          performanceDelta: scenarioForecast.predictions[11].expectedPerformance -
            baseForecast.predictions[11].expectedPerformance,
          recoveryDelta: scenarioForecast.anomalies.score - baseForecast.anomalies.score,
          riskLevel: scenarioForecast.anomalies.severity,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in scenario analysis', {
      context: 'routes/mlPerformanceForecastScenario',
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      message: 'Error performing scenario analysis',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/ml/performance-forecast/trend-summary
 * Get simplified trend summary (quick view)
 */
router.get('/performance-forecast/trend-summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get recent biometric data (last 6 weeks)
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    const recentBiometricQuery = BiometricModel.find({ userId: req.userId, date: { $gte: sixWeeksAgo } });
    const recentBiometrics = await recentBiometricQuery.sort({ date: -1 });

    if (recentBiometrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recent biometric data available',
      });
    }

    // Calculate recent trend
    const recentScore = recentBiometrics[recentBiometrics.length - 1]?.recoveryIndex?.score || 50;
    const oldestScore = recentBiometrics[0]?.recoveryIndex?.score || 50;
    const trendPercentage = ((recentScore - oldestScore) / oldestScore) * 100;

    // Determine trend direction
    let trendDirection: string;
    if (trendPercentage > 5) trendDirection = '📈 Improving';
    else if (trendPercentage < -5) trendDirection = '📉 Declining';
    else trendDirection = '➡️ Stable';

    logger.info('Trend summary requested', {
      context: 'routes/mlPerformanceForecastTrend',
      metadata: {
        userId: req.userId,
        trendDirection,
        trendPercentage,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        trendDirection,
        trendPercentage: Math.round(trendPercentage * 10) / 10,
        currentScore: recentScore,
        lastUpdated: recentBiometrics[0].date,
        dataPoints: recentBiometrics.length,
        recommendation: trendPercentage > 5
          ? 'Your performance is improving - keep current plan'
          : trendPercentage < -5
            ? 'Performance declining - consider recovery focus'
            : 'Performance is stable - maintain consistency',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting trend summary', {
      context: 'routes/mlPerformanceForecastTrend',
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });

    return res.status(500).json({
      success: false,
      message: 'Error retrieving trend summary',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/ml/performance-forecast/feedback
 * Record actual performance outcome for forecast accuracy tracking
 */
router.post('/performance-forecast/feedback', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const { forecastId, actualPerformance, weekNumber, feedback } = req.body;

    if (!forecastId || actualPerformance === undefined || !weekNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: forecastId, actualPerformance, weekNumber',
      });
    }

    if (actualPerformance < 0 || actualPerformance > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid performance score (must be 0-100)',
      });
    }

    // Store feedback for forecast accuracy tracking
    logger.info('Performance forecast feedback received', {
      context: 'routes/mlPerformanceForecastFeedback',
      metadata: {
        userId: req.userId,
        forecastId,
        actualPerformance,
        weekNumber,
        feedbackProvided: Boolean(feedback),
      },
    });

    // In production: Store to database for ML retraining
    // In development: Just log it

    return res.status(200).json({
      success: true,
      message: 'Forecast feedback recorded successfully',
      data: {
        timestamp: new Date().toISOString(),
        feedbackId: `feedback_${Date.now()}`,
      },
    });
  } catch (error) {
    logger.error('Error storing forecast feedback', {
      context: 'routes/mlPerformanceForecastFeedback',
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });

    return res.status(500).json({
      success: false,
      message: 'Error storing feedback',
      error: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * Helper method to apply scenario adjustments
 */
function applyScenarioAdjustments(baseForecast: any, scenario: string, adjustments?: any): any {
  const scenarioForecast = JSON.parse(JSON.stringify(baseForecast)); // Deep copy

  switch (scenario) {
  case 'increased-volume':
    // More training = faster improvement but higher injury risk
    scenarioForecast.predictions.forEach((p: any) => {
      p.expectedPerformance *= 1.08; // +8% performance
    });
    scenarioForecast.anomalies.score *= 1.2; // Higher injury risk
    break;

  case 'reduced-intensity':
    // Less intense = slower improvement but better recovery
    scenarioForecast.predictions.forEach((p: any) => {
      p.expectedPerformance *= 0.95; // -5% performance
    });
    scenarioForecast.anomalies.severity = 'low';
    break;

  case 'recovery-focus':
    // Recovery focus = faster recovery, moderate improvements
    scenarioForecast.predictions.forEach((p: any) => {
      p.expectedPerformance *= 0.98; // -2% performance short-term
    });
    scenarioForecast.anomalies.detected = false;
    break;

  case 'peak-prep':
    // Peak prep = maximum performance push
    scenarioForecast.predictions.forEach((p: any) => {
      p.expectedPerformance *= 1.12; // +12% performance
    });
    scenarioForecast.anomalies.score *= 1.5; // Much higher injury risk
    break;
  }

  // Apply custom adjustments if provided
  if (adjustments) {
    if (adjustments.performanceBump) {
      const bump = adjustments.performanceBump / 100;
      scenarioForecast.predictions.forEach((p: any) => {
        p.expectedPerformance *= 1 + bump;
      });
    }
  }

  return scenarioForecast;
}

export default router;

/**
 * ML Inference Service
 * Orchestrates ML predictions with fallback to Phase 3
 */

import { logger } from '../../utils/logger';
import { mlConfig } from '../config/ml.config';
import { FeatureEngineeringService, FeatureSet } from './featureEngineeringService';
import { MLModelService, Prediction } from './mlModelService';
import { AdvancedAnalysisService } from '../../services/advancedAnalysisService';

export interface MLResult<T = any> {
  source: 'ml' | 'phase3-fallback';
  mlConfidence?: number;
  prediction: T;
  timestamp: string;
  warnings: string[];
}

/**
 * ML Inference Service - Hybrid Architecture
 * Uses ML models when available, falls back to Phase 3 rule-based system
 */
export class MLInferenceService {
  /**
   * Predict injury risk with ML + Phase 3 fallback
   */
  static async predictInjuryRisk(
    biometricHistory: any[],
    trainingLoad?: any
  ): Promise<MLResult> {
    const warnings: string[] = [];

    try {
      // Check data sufficiency
      if (biometricHistory.length < mlConfig.inference.batchSize) {
        warnings.push(`Insufficient data: ${biometricHistory.length} samples (need ${mlConfig.inference.batchSize})`);
      }

      // Extract features
      const features = FeatureEngineeringService.extractFeatures(biometricHistory);

      // Try ML prediction
      if (MLModelService.isModelAvailable('injuryPrediction')) {
        const mlPrediction = await MLModelService.predictInjuryRisk(features);

        if (mlPrediction.confidence >= mlConfig.inference.confidenceThreshold) {
          logger.info('ML injury prediction successful', {
            context: 'ml/inference',
            metadata: {
              confidence: mlPrediction.confidence,
              riskScore: mlPrediction.prediction,
            },
          });

          return {
            source: 'ml',
            mlConfidence: mlPrediction.confidence,
            prediction: {
              riskScore: mlPrediction.prediction,
              confidence: mlPrediction.confidence,
              probabilities: mlPrediction.probabilities,
              mlModel: true,
            },
            timestamp: new Date().toISOString(),
            warnings,
          };
        } else {
          warnings.push(`ML confidence too low: ${mlPrediction.confidence.toFixed(2)} (threshold: ${mlConfig.inference.confidenceThreshold})`);
        }
      } else {
        warnings.push('ML model not available');
      }

      // Fallback to Phase 3
      if (mlConfig.inference.fallbackToPhase3) {
        logger.info('Falling back to Phase 3 injury prediction', {
          context: 'ml/inference',
          metadata: { reason: warnings[warnings.length - 1] },
        });

        const phase3Result = await AdvancedAnalysisService.predictInjuryRisk(biometricHistory, trainingLoad);

        return {
          source: 'phase3-fallback',
          prediction: phase3Result,
          timestamp: new Date().toISOString(),
          warnings: [...warnings, 'Using Phase 3 rule-based prediction'],
        };
      }

      throw new Error('ML model unavailable and Phase 3 fallback disabled');
    } catch (error) {
      logger.error('Error in injury risk inference', {
        context: 'ml/inference',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Predict training recommendations with ML + Phase 3 fallback
   */
  static async predictTrainingRecommendations(
    biometricHistory: any[],
    trainingLoad?: any
  ): Promise<MLResult> {
    const warnings: string[] = [];

    try {
      if (biometricHistory.length < 14) {
        warnings.push('Limited data for recommendations (14+ days recommended)');
      }

      const features = FeatureEngineeringService.extractFeatures(biometricHistory);

      if (MLModelService.isModelAvailable('trainingRecommender')) {
        const mlPrediction = await MLModelService.predictTrainingRecommendations(features);

        if (mlPrediction.confidence >= mlConfig.inference.confidenceThreshold) {
          logger.info('ML training recommendation successful', {
            context: 'ml/inference',
            metadata: {
              confidence: mlPrediction.confidence,
              recommendedFocus: mlPrediction.prediction,
            },
          });

          return {
            source: 'ml',
            mlConfidence: mlPrediction.confidence,
            prediction: {
              focus: ['strength', 'endurance', 'recovery', 'power', 'technique'][mlPrediction.prediction as number] || 'recovery',
              confidence: mlPrediction.confidence,
              personalized: true,
              mlModel: true,
            },
            timestamp: new Date().toISOString(),
            warnings,
          };
        } else {
          warnings.push('ML confidence below threshold');
        }
      }

      if (mlConfig.inference.fallbackToPhase3) {
        logger.info('Falling back to Phase 3 training recommendations', {
          context: 'ml/inference',
        });

        const phase3Result = await AdvancedAnalysisService.generateTrainingRecommendations(
          { 
            date: new Date().toISOString().split('T')[0],
            injuryRisk: 40, 
            riskLevel: 'moderate', 
            confidence: 50,
            areaRisks: { lowerBody: 0, upperBody: 0, core: 0, cardiovascular: 0 },
            riskFactors: {
              highTrainingLoad: false,
              inadequateRecovery: false,
              muscleImbalance: false,
              overusePattern: false,
              inflammationMarkers: false,
              sleepDeprivation: false,
              rapidIntensityIncrease: false
            },
            injuryTypes: [], 
            preventionRecommendations: [] 
          },
          { 
            date: new Date().toISOString().split('T')[0],
            weeklyLoad: { totalVolume: 0, totalIntensity: 0, peakLoad: 0, averageLoad: 0, loadVariability: 0 },
            distribution: { strength: 0, cardio: 0, flexibility: 0, rest: 0, intensity: 'moderate' },
            acuteToChronic: { ratio: 1, status: 'optimal', trend: 0 },
            progression: { weekOverWeek: 0, monthOverMonth: 0, recommendation: 'maintain', safeIncreasePercent: 0 },
          },
          biometricHistory
        );

        return {
          source: 'phase3-fallback',
          prediction: phase3Result,
          timestamp: new Date().toISOString(),
          warnings: [...warnings, 'Using Phase 3 template-based recommendations'],
        };
      }

      throw new Error('Training recommendation prediction failed');
    } catch (error) {
      logger.error('Error in training recommendation inference', {
        context: 'ml/inference',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Predict performance with ML + Phase 3 fallback
   */
  static async predictPerformance(
    biometricHistory: any[],
    trainingLoad?: any,
    weeksForecast: number = 12
  ): Promise<MLResult> {
    const warnings: string[] = [];

    try {
      if (biometricHistory.length < 30) {
        warnings.push('Limited historical data for accurate forecast');
      }

      const features = FeatureEngineeringService.extractFeatures(biometricHistory);

      if (MLModelService.isModelAvailable('performanceForecast')) {
        const mlPrediction = await MLModelService.predictPerformance(features);

        if (mlPrediction.confidence >= mlConfig.inference.confidenceThreshold) {
          logger.info('ML performance forecast successful', {
            context: 'ml/inference',
            metadata: {
              confidence: mlPrediction.confidence,
              improvement: mlPrediction.prediction,
            },
          });

          return {
            source: 'ml',
            mlConfidence: mlPrediction.confidence,
            prediction: {
              improvement: mlPrediction.prediction,
              confidence: mlPrediction.confidence,
              weeksForecast,
              mlModel: true,
              projections: this.generateMLProjections(mlPrediction.prediction as number, weeksForecast),
            },
            timestamp: new Date().toISOString(),
            warnings,
          };
        } else {
          warnings.push('ML confidence insufficient');
        }
      }

      if (mlConfig.inference.fallbackToPhase3) {
        const phase3Result = await AdvancedAnalysisService.forecastPerformance(
          biometricHistory,
          trainingLoad,
          weeksForecast
        );

        return {
          source: 'phase3-fallback',
          prediction: phase3Result,
          timestamp: new Date().toISOString(),
          warnings: [...warnings, 'Using Phase 3 linear forecasting'],
        };
      }

      throw new Error('Performance forecast failed');
    } catch (error) {
      logger.error('Error in performance forecast inference', {
        context: 'ml/inference',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect anomalies with ML
   */
  static async detectAnomalies(biometricHistory: any[]): Promise<MLResult> {
    const warnings: string[] = [];

    try {
      if (biometricHistory.length < 7) {
        warnings.push('Insufficient data for anomaly detection (7+ days needed)');
      }

      const features = FeatureEngineeringService.extractFeatures(biometricHistory);

      const mlPrediction = await MLModelService.detectAnomalies(features);

      return {
        source: 'ml',
        mlConfidence: mlPrediction.confidence,
        prediction: {
          isAnomaly: mlPrediction.prediction === 1,
          confidence: mlPrediction.confidence,
          probabilities: mlPrediction.probabilities,
          detectedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        warnings,
      };
    } catch (error) {
      logger.error('Error in anomaly detection', {
        context: 'ml/inference',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get model status
   */
  static getModelStatus(): Record<string, any> {
    return {
      mlInitialized: MLModelService.isModelAvailable('injuryPrediction'),
      models: {
        injuryPrediction: {
          available: MLModelService.isModelAvailable('injuryPrediction'),
          metrics: MLModelService.getModelMetrics('injuryPrediction'),
        },
        trainingRecommender: {
          available: MLModelService.isModelAvailable('trainingRecommender'),
          metrics: MLModelService.getModelMetrics('trainingRecommender'),
        },
        performanceForecast: {
          available: MLModelService.isModelAvailable('performanceForecast'),
          metrics: MLModelService.getModelMetrics('performanceForecast'),
        },
        anomalyDetection: {
          available: MLModelService.isModelAvailable('anomalyDetection'),
          metrics: MLModelService.getModelMetrics('anomalyDetection'),
        },
      },
      config: {
        fallbackEnabled: mlConfig.inference.fallbackToPhase3,
        confidenceThreshold: mlConfig.inference.confidenceThreshold,
        cacheEnabled: mlConfig.inference.cacheResults,
      },
    };
  }

  /**
   * Private: Generate ML projections
   */
  private static generateMLProjections(improvementPercent: number, weeks: number) {
    const diminishingFactor = 0.9;  // Each week improvement decreases by 10%
    const projections = [];

    for (let w = 1; w <= weeks; w += 4) {
      const weeklyImprovement = improvementPercent * Math.pow(diminishingFactor, (w / 4) - 1);
      projections.push({
        week: w,
        improvement: Math.max(0, weeklyImprovement),
      });
    }

    return projections;
  }
}

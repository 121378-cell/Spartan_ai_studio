/**
 * ML Configuration
 * Hyperparameters, thresholds, and model paths for all ML services
 */

export interface MLConfig {
  models: ModelPaths;
  features: FeatureConfig;
  inference: InferenceConfig;
  evaluation: EvaluationConfig;
}

export interface ModelPaths {
  injuryPrediction: string;
  trainingRecommender: string;
  performanceForecast: string;
  anomalyDetection: string;
}

export interface FeatureConfig {
  normalization: NormalizationConfig;
  scaling: ScalingConfig;
  engineering: FeatureEngineeringConfig;
}

export interface NormalizationConfig {
  hrvRange: [number, number];      // [min, max]
  rhrRange: [number, number];
  sleepRange: [number, number];
  loadRange: [number, number];
  recoveryRange: [number, number];
}

export interface ScalingConfig {
  method: 'standardization' | 'minmax' | 'robust';  // z-score, 0-1, or interquartile
  handleOutliers: boolean;
  outlierThreshold: number;        // Standard deviations
}

export interface FeatureEngineeringConfig {
  includeTemporalFeatures: boolean;
  includeDerivedMetrics: boolean;
  windowSize: number;              // Days for rolling average
  featureCount: number;            // Expected feature count
}

export interface InferenceConfig {
  batchSize: number;
  confidenceThreshold: number;     // Min confidence to return prediction
  fallbackToPhase3: boolean;
  cacheResults: boolean;
  cacheTTL: number;                // Seconds
}

export interface EvaluationConfig {
  precisionTarget: number;         // Injury prediction precision %
  recallTarget: number;            // Injury prediction recall %
  f1ScoreTarget: number;
  rocAucTarget: number;
}

// Default Configuration
const defaultMLConfig: MLConfig = {
  models: {
    injuryPrediction: 'models/injury_prediction.onnx',
    trainingRecommender: 'models/training_recommender.onnx',
    performanceForecast: 'models/performance_forecast.onnx',
    anomalyDetection: 'models/anomaly_detection.onnx',
  },

  features: {
    normalization: {
      hrvRange: [30, 150],
      rhrRange: [40, 100],
      sleepRange: [0, 12],
      loadRange: [0, 1000],
      recoveryRange: [0, 100],
    },

    scaling: {
      method: 'standardization',
      handleOutliers: true,
      outlierThreshold: 3,  // 3 standard deviations
    },

    engineering: {
      includeTemporalFeatures: true,
      includeDerivedMetrics: true,
      windowSize: 7,        // 7-day rolling average
      featureCount: 28,     // Expected features
    },
  },

  inference: {
    batchSize: 32,
    confidenceThreshold: 0.5,  // Min 50% confidence
    fallbackToPhase3: true,
    cacheResults: true,
    cacheTTL: 3600,  // 1 hour
  },

  evaluation: {
    precisionTarget: 0.80,   // 80%
    recallTarget: 0.75,      // 75%
    f1ScoreTarget: 0.77,
    rocAucTarget: 0.85,
  },
};

/**
 * Get ML configuration (from env vars or defaults)
 */
export function getMLConfig(): MLConfig {
  return {
    ...defaultMLConfig,
    models: {
      injuryPrediction: process.env.ML_INJURY_MODEL || defaultMLConfig.models.injuryPrediction,
      trainingRecommender: process.env.ML_RECOMMENDER_MODEL || defaultMLConfig.models.trainingRecommender,
      performanceForecast: process.env.ML_FORECAST_MODEL || defaultMLConfig.models.performanceForecast,
      anomalyDetection: process.env.ML_ANOMALY_MODEL || defaultMLConfig.models.anomalyDetection,
    },
  };
}

/**
 * Validate configuration
 */
export function validateMLConfig(config: MLConfig): void {
  if (!config.models.injuryPrediction) {
    throw new Error('ML Configuration: injuryPrediction model path required');
  }

  if (config.inference.confidenceThreshold < 0 || config.inference.confidenceThreshold > 1) {
    throw new Error('ML Configuration: confidenceThreshold must be between 0 and 1');
  }

  if (config.features.engineering.featureCount < 10) {
    throw new Error('ML Configuration: featureCount must be >= 10');
  }

  console.log('[ML Config] Configuration validated successfully');
}

export const mlConfig = getMLConfig();

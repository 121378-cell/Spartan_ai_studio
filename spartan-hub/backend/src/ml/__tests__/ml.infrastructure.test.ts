/**
 * ML Infrastructure Tests
 * Unit tests for ML services, feature engineering, and inference
 */

import { FeatureEngineeringService, BiometricRawData, FeatureSet } from '../services/featureEngineeringService';
import { MLModelService } from '../services/mlModelService';
import { MLInferenceService } from '../services/mlInferenceService';
import { mlConfig } from '../config/ml.config';

describe('ML Infrastructure - Phase 4.1', () => {
  // ==================== Feature Engineering Tests ====================

  describe('FeatureEngineeringService', () => {
    const mockBiometricData: BiometricRawData[] = [
      {
        date: '2025-01-17',
        hrv: 85,
        rhr: 65,
        sleepHours: 7.5,
        sleepQuality: 8,
        trainingLoad: 350,
        recoveryScore: 75,
        stressLevel: 3,
        activityLevel: 60,
      },
      {
        date: '2025-01-18',
        hrv: 82,
        rhr: 66,
        sleepHours: 7,
        sleepQuality: 7,
        trainingLoad: 400,
        recoveryScore: 70,
        stressLevel: 4,
        activityLevel: 65,
      },
      {
        date: '2025-01-19',
        hrv: 78,
        rhr: 68,
        sleepHours: 6.5,
        sleepQuality: 6,
        trainingLoad: 450,
        recoveryScore: 65,
        stressLevel: 5,
        activityLevel: 55,
      },
      {
        date: '2025-01-20',
        hrv: 90,
        rhr: 62,
        sleepHours: 8,
        sleepQuality: 9,
        trainingLoad: 300,
        recoveryScore: 85,
        stressLevel: 2,
        activityLevel: 70,
      },
    ];

    it('should extract features from biometric data', () => {
      const features = FeatureEngineeringService.extractFeatures(mockBiometricData);

      expect(features).toBeDefined();
      expect(features.trainingLoadFeatures).toBeDefined();
      expect(features.recoveryFeatures).toBeDefined();
      expect(features.performanceFeatures).toBeDefined();
      expect(features.derivedMetrics).toBeDefined();
      expect(features.temporalFeatures).toBeDefined();
      expect(features.normalizedRaw).toBeDefined();
    });

    it('should calculate training load features correctly', () => {
      const features = FeatureEngineeringService.extractFeatures(mockBiometricData);
      const tlf = features.trainingLoadFeatures;

      expect(tlf.weekly7DayAvg).toBeGreaterThan(0);
      expect(tlf.acuteToChronicRatio).toBeGreaterThan(0);
      expect(tlf.peakLoad).toBeGreaterThan(0);
    });

    it('should calculate recovery features correctly', () => {
      const features = FeatureEngineeringService.extractFeatures(mockBiometricData);
      const rf = features.recoveryFeatures;

      expect(rf.hrvMean).toBeGreaterThan(0);
      expect(rf.rhrMean).toBeGreaterThan(0);
      expect(rf.sleepHoursMean).toBeGreaterThan(0);
      expect(rf.stressLevelMean).toBeGreaterThanOrEqual(0);
    });

    it('should calculate derived metrics', () => {
      const features = FeatureEngineeringService.extractFeatures(mockBiometricData);
      const dm = features.derivedMetrics;

      expect(dm.hrvToRhrRatio).toBeGreaterThan(0);
      expect(dm.overallWellnessScore).toBeGreaterThanOrEqual(0);
      expect(dm.overallWellnessScore).toBeLessThanOrEqual(100);
      expect(dm.dataQuality).toBeGreaterThanOrEqual(0);
      expect(dm.dataQuality).toBeLessThanOrEqual(1);
    });

    it('should extract temporal features', () => {
      const features = FeatureEngineeringService.extractFeatures(mockBiometricData, '2025-01-24');
      const tf = features.temporalFeatures;

      expect(tf.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(tf.dayOfWeek).toBeLessThan(7);
      expect(tf.weekOfYear).toBeGreaterThan(0);
      expect(tf.isWeekend).toBeGreaterThanOrEqual(0);
      expect(tf.isWeekend).toBeLessThanOrEqual(1);
    });

    it('should flatten features for model input', () => {
      const features = FeatureEngineeringService.extractFeatures(mockBiometricData);
      const flattened = FeatureEngineeringService.flattenFeatures(features);

      expect(flattened).toBeInstanceOf(Array);
      expect(flattened.length).toBeGreaterThan(0);
      expect(flattened.every(f => typeof f === 'number')).toBe(true);
    });

    it('should handle empty data gracefully', () => {
      const features = FeatureEngineeringService.extractFeatures([]);

      expect(features).toBeDefined();
      expect(features.trainingLoadFeatures.weekly7DayAvg).toBe(0);
      expect(features.derivedMetrics.dataQuality).toBe(0);
    });

    it('should normalize values correctly', () => {
      const features = FeatureEngineeringService.extractFeatures(mockBiometricData);
      const nr = features.normalizedRaw;

      expect(nr.hrv).toBeGreaterThanOrEqual(0);
      expect(nr.hrv).toBeLessThanOrEqual(1);
      expect(nr.rhr).toBeGreaterThanOrEqual(0);
      expect(nr.rhr).toBeLessThanOrEqual(1);
    });
  });

  // ==================== ML Model Service Tests ====================

  describe('MLModelService', () => {
    beforeAll(async () => {
      await MLModelService.initialize();
    });

    it('should initialize models successfully', async () => {
      expect(MLModelService.isModelAvailable('injuryPrediction')).toBe(true);
      expect(MLModelService.isModelAvailable('trainingRecommender')).toBe(true);
    });

    it('should predict injury risk', async () => {
      const mockData = FeatureEngineeringService.extractFeatures([]);

      const prediction = await MLModelService.predictInjuryRisk(mockData);

      expect(prediction).toBeDefined();
      expect(prediction.modelName).toBe('injuryPrediction');
      expect(prediction.prediction).toBeGreaterThanOrEqual(0);
      expect(prediction.prediction).toBeLessThanOrEqual(100);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should predict training recommendations', async () => {
      const mockData = FeatureEngineeringService.extractFeatures([
        {
          date: '2025-01-20',
          hrv: 85,
          rhr: 65,
          sleepHours: 7,
          sleepQuality: 7,
          trainingLoad: 350,
          recoveryScore: 75,
          stressLevel: 3,
          activityLevel: 60,
        },
      ]);

      const prediction = await MLModelService.predictTrainingRecommendations(mockData);

      expect(prediction).toBeDefined();
      expect(prediction.modelName).toBe('trainingRecommender');
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it('should predict performance', async () => {
      const mockData = FeatureEngineeringService.extractFeatures([
        {
          date: '2025-01-20',
          hrv: 85,
          rhr: 65,
          sleepHours: 7,
          sleepQuality: 7,
          trainingLoad: 350,
          recoveryScore: 75,
          stressLevel: 3,
          activityLevel: 60,
        },
      ]);

      const prediction = await MLModelService.predictPerformance(mockData);

      expect(prediction).toBeDefined();
      expect(prediction.modelName).toBe('performanceForecast');
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it('should detect anomalies', async () => {
      const mockData = FeatureEngineeringService.extractFeatures([
        {
          date: '2025-01-20',
          hrv: 25,  // Low HRV = anomaly
          rhr: 65,
          sleepHours: 7,
          sleepQuality: 7,
          trainingLoad: 350,
          recoveryScore: 75,
          stressLevel: 3,
          activityLevel: 60,
        },
      ]);

      const prediction = await MLModelService.detectAnomalies(mockData);

      expect(prediction).toBeDefined();
      expect(prediction.modelName).toBe('anomalyDetection');
      expect([0, 1]).toContain(prediction.prediction);
    });

    it('should cache predictions', async () => {
      const mockData = FeatureEngineeringService.extractFeatures([]);

      const pred1 = await MLModelService.predictInjuryRisk(mockData);
      const pred2 = await MLModelService.predictInjuryRisk(mockData);

      if (mlConfig.inference.cacheResults) {
        expect(pred2.cached).toBe(true);
      }

      MLModelService.clearCache();
    });

    it('should track model metrics', () => {
      const metrics = {
        precision: 0.82,
        recall: 0.78,
        f1Score: 0.80,
        rocAuc: 0.87,
        accuracy: 0.80,
        supportCount: 150,
        lastUpdated: new Date().toISOString(),
      };

      MLModelService.updateModelMetrics('injuryPrediction', metrics);
      const retrieved = MLModelService.getModelMetrics('injuryPrediction');

      expect(retrieved).toBeDefined();
      expect(retrieved?.precision).toBe(0.82);
    });
  });

  // ==================== ML Inference Service Tests ====================

  describe('MLInferenceService', () => {
    const mockBiometricHistory = [
      {
        date: '2025-01-17',
        hrv: 85,
        rhr: 65,
        sleepHours: 7.5,
        sleepQuality: 8,
        trainingLoad: 350,
        recoveryScore: 75,
        stressLevel: 3,
        activityLevel: 60,
      },
      {
        date: '2025-01-18',
        hrv: 82,
        rhr: 66,
        sleepHours: 7,
        sleepQuality: 7,
        trainingLoad: 400,
        recoveryScore: 70,
        stressLevel: 4,
        activityLevel: 65,
      },
      {
        date: '2025-01-19',
        hrv: 78,
        rhr: 68,
        sleepHours: 6.5,
        sleepQuality: 6,
        trainingLoad: 450,
        recoveryScore: 65,
        stressLevel: 5,
        activityLevel: 55,
      },
      {
        date: '2025-01-20',
        hrv: 90,
        rhr: 62,
        sleepHours: 8,
        sleepQuality: 9,
        trainingLoad: 300,
        recoveryScore: 85,
        stressLevel: 2,
        activityLevel: 70,
      },
    ];

    it('should predict injury risk with hybrid approach', async () => {
      const result = await MLInferenceService.predictInjuryRisk(mockBiometricHistory);

      expect(result).toBeDefined();
      expect(['ml', 'phase3-fallback']).toContain(result.source);
      expect(result.prediction).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should predict training recommendations with hybrid approach', async () => {
      const result = await MLInferenceService.predictTrainingRecommendations(mockBiometricHistory);

      expect(result).toBeDefined();
      expect(['ml', 'phase3-fallback']).toContain(result.source);
      expect(result.prediction).toBeDefined();
    });

    it('should predict performance with hybrid approach', async () => {
      const result = await MLInferenceService.predictPerformance(mockBiometricHistory, undefined, 12);

      expect(result).toBeDefined();
      expect(['ml', 'phase3-fallback']).toContain(result.source);
      expect(result.prediction).toBeDefined();
    });

    it('should detect anomalies', async () => {
      const result = await MLInferenceService.detectAnomalies(mockBiometricHistory);

      expect(result).toBeDefined();
      expect(result.source).toBe('ml');
      expect(result.prediction.isAnomaly).toEqual(expect.any(Boolean));
    });

    it('should return model status', () => {
      const status = MLInferenceService.getModelStatus();

      expect(status).toBeDefined();
      expect(status.mlInitialized).toEqual(expect.any(Boolean));
      expect(status.models).toBeDefined();
      expect(status.config).toBeDefined();
    });

    it('should handle insufficient data gracefully', async () => {
      const minimalData = [mockBiometricHistory[0]];
      const result = await MLInferenceService.predictInjuryRisk(minimalData);

      expect(result).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ==================== Configuration Tests ====================

  describe('ML Configuration', () => {
    it('should have valid ML config', () => {
      expect(mlConfig).toBeDefined();
      expect(mlConfig.models).toBeDefined();
      expect(mlConfig.features).toBeDefined();
      expect(mlConfig.inference).toBeDefined();
      expect(mlConfig.evaluation).toBeDefined();
    });

    it('should have valid inference thresholds', () => {
      expect(mlConfig.inference.confidenceThreshold).toBeGreaterThan(0);
      expect(mlConfig.inference.confidenceThreshold).toBeLessThan(1);
      expect(mlConfig.inference.cacheTTL).toBeGreaterThan(0);
    });

    it('should have valid evaluation targets', () => {
      expect(mlConfig.evaluation.precisionTarget).toBeGreaterThan(0);
      expect(mlConfig.evaluation.recallTarget).toBeGreaterThan(0);
      expect(mlConfig.evaluation.f1ScoreTarget).toBeGreaterThan(0);
      expect(mlConfig.evaluation.rocAucTarget).toBeGreaterThan(0);
    });
  });
});

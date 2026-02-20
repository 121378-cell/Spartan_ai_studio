/**
 * ML Forecasting Service - Simplified Unit Tests
 * Usa mocks simples en lugar de bases de datos en memoria
 */

const {
  MockMLForecastingService,
  getMockMLForecastingService,
  createMockInjuryPrediction,
  createMockReadinessForecasts
} = require('../../__mocks__/mlForecastingService.mock');

describe('MLForecastingService - Simplified Mock Tests', () => {
  let service;

  beforeEach(() => {
    MockMLForecastingService.resetInstance();
    service = getMockMLForecastingService();
  });

  describe('predictInjuryRisk', () => {
    it('should return injury prediction with default values', async () => {
      const result = await service.predictInjuryRisk('test-user');

      expect(result.userId).toBe('test-user');
      expect(result.probability).toBe(25);
      expect(result.confidence).toBe(75);
      expect(result.timeframe).toBe('7-14 days');
      expect(result.recommendation).toContain('LOW RISK');
    });

    it('should return all risk factors as false by default', async () => {
      const result = await service.predictInjuryRisk('test-user');

      expect(result.factors.elevatedRHR).toBe(false);
      expect(result.factors.suppressedHRV).toBe(false);
      expect(result.factors.sleepDeprivation).toBe(false);
      expect(result.factors.consecutiveHardDays).toBe(false);
      expect(result.factors.overtrainingMarker).toBe(false);
    });

    it('should handle empty userId', async () => {
      const result = await service.predictInjuryRisk('');
      expect(result.userId).toBe('');
    });
  });

  describe('forecastReadiness', () => {
    it('should return array of forecasts for specified days', async () => {
      const result = await service.forecastReadiness('test-user', 3);

      expect(result).toHaveLength(3);
      expect(result[0].day).toBe(1);
      expect(result[1].day).toBe(2);
      expect(result[2].day).toBe(3);
    });

    it('should clamp days to valid range (1-7)', async () => {
      const resultZero = await service.forecastReadiness('test-user', 0);
      expect(resultZero).toHaveLength(1);

      const resultTen = await service.forecastReadiness('test-user', 10);
      expect(resultTen).toHaveLength(7);

      const resultNegative = await service.forecastReadiness('test-user', -5);
      expect(resultNegative).toHaveLength(1);
    });

    it('should return forecasts with valid date format', async () => {
      const result = await service.forecastReadiness('test-user', 3);

      result.forEach(forecast => {
        expect(forecast.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should return forecasts with valid score range', async () => {
      const result = await service.forecastReadiness('test-user', 3);

      result.forEach(forecast => {
        expect(forecast.predictedScore).toBeGreaterThanOrEqual(0);
        expect(forecast.predictedScore).toBeLessThanOrEqual(100);
      });
    });

    it('should return decreasing confidence for further days', async () => {
      const result = await service.forecastReadiness('test-user', 5);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].confidence).toBeLessThanOrEqual(result[0].confidence);
      }
    });
  });

  describe('predictInjuryProbability', () => {
    it('should return structured injury probability', async () => {
      const result = await service.predictInjuryProbability('test-user', '2024-01-15');

      expect(result.userId).toBe('test-user');
      expect(result.date).toBe('2024-01-15');
      expect(result.probabilityPercent).toBe(20);
      expect(result.riskScore).toBe(20);
      expect(result.confidenceScore).toBe(75);
    });

    it('should include all risk factors', async () => {
      const result = await service.predictInjuryProbability('test-user', '2024-01-15');

      expect(result.riskFactors).toHaveProperty('elevatedRHR');
      expect(result.riskFactors).toHaveProperty('suppressedHRV');
      expect(result.riskFactors).toHaveProperty('sleepDeprivation');
      expect(result.riskFactors).toHaveProperty('consecutiveHardDays');
      expect(result.riskFactors).toHaveProperty('overtrainingMarker');
    });
  });

  describe('estimateFatigue', () => {
    it('should return fatigue estimate', async () => {
      const result = await service.estimateFatigue('test-user', '2024-01-15');

      expect(result.userId).toBe('test-user');
      expect(result.date).toBe('2024-01-15');
      expect(result.fatigueLevel).toBe(45);
      expect(result.acuteToChronicRatio).toBe(1.1);
      expect(result.recoveryCapacity).toBe(70);
      expect(result.estimatedRecoveryDays).toBe(1);
    });

    it('should include recommendation', async () => {
      const result = await service.estimateFatigue('test-user', '2024-01-15');

      expect(result.recommendation).toBeDefined();
      expect(typeof result.recommendation).toBe('string');
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('suggestTrainingLoad', () => {
    it('should return training load suggestion', async () => {
      const result = await service.suggestTrainingLoad('test-user', '2024-01-15');

      expect(result.userId).toBe('test-user');
      expect(result.date).toBe('2024-01-15');
      expect(result.suggestedLoad).toBe('moderate');
      expect(result.maxWorkoutDurationMinutes).toBe(60);
    });

    it('should include recommended exercises', async () => {
      const result = await service.suggestTrainingLoad('test-user', '2024-01-15');

      expect(Array.isArray(result.recommendedExercises)).toBe(true);
      expect(result.recommendedExercises.length).toBeGreaterThan(0);
    });

    it('should include rationale', async () => {
      const result = await service.suggestTrainingLoad('test-user', '2024-01-15');

      expect(result.rationale).toBeDefined();
      expect(typeof result.rationale).toBe('string');
    });
  });

  describe('getModelMetadata', () => {
    it('should return model metadata', () => {
      const result = service.getModelMetadata();

      expect(result.version).toBe('1.0.0-test');
      expect(result.accuracyScore).toBe(78);
      expect(result.dataPoints).toBe(1000);
      expect(result.modelType).toBe('mock-model');
    });

    it('should include model parameters', () => {
      const result = service.getModelMetadata();

      expect(result.parameters).toHaveProperty('windowSize');
      expect(result.parameters).toHaveProperty('seasonalCycle');
      expect(result.parameters).toHaveProperty('alpha');
      expect(result.parameters).toHaveProperty('beta');
      expect(result.parameters).toHaveProperty('gamma');
    });
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should be callable multiple times', async () => {
      await service.initialize();
      await service.initialize();
      await service.initialize();
    });
  });

  describe('retrainModel', () => {
    it('should complete without errors', async () => {
      await expect(service.retrainModel()).resolves.not.toThrow();
    });
  });

  describe('close', () => {
    it('should close without errors', () => {
      expect(() => service.close()).not.toThrow();
    });
  });
});

describe('Mock Helpers', () => {
  describe('createMockInjuryPrediction', () => {
    it('should create prediction with defaults', () => {
      const result = createMockInjuryPrediction('test-user');

      expect(result.userId).toBe('test-user');
      expect(result.probability).toBe(25);
    });

    it('should allow overriding properties', () => {
      const result = createMockInjuryPrediction('test-user', {
        probability: 75,
        confidence: 50
      });

      expect(result.probability).toBe(75);
      expect(result.confidence).toBe(50);
      expect(result.userId).toBe('test-user');
    });
  });

  describe('createMockReadinessForecasts', () => {
    it('should create specified number of forecasts', () => {
      const result = createMockReadinessForecasts(5);

      expect(result).toHaveLength(5);
    });

    it('should use base score', () => {
      const result = createMockReadinessForecasts(3, 80);

      result.forEach(forecast => {
        expect(forecast.predictedScore).toBeGreaterThanOrEqual(80);
      });
    });

    it('should have sequential days', () => {
      const result = createMockReadinessForecasts(5);

      result.forEach((forecast, index) => {
        expect(forecast.day).toBe(index + 1);
      });
    });
  });
});

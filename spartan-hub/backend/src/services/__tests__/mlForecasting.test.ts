import { MLForecastingService, ForecastPrediction, WeeklyForecast } from '../mlForecastingService';
import { logger } from '../../utils/logger';
import { createTestDatabase, cleanupTestData, closeTestDatabase } from './mlForecasting.test.setup';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('ML Forecasting Service', () => {
  let service: MLForecastingService;
  let testDb: DatabaseType;

  beforeAll(async () => {
    // Create test database with schema and sample data
    testDb = createTestDatabase();
    
    // Get service and inject test database
    service = MLForecastingService.getInstance();
    await service.initialize(testDb);
  });

  afterEach(() => {
    // Clean up test data between tests
    cleanupTestData(testDb);
  });

  afterAll(() => {
    // Close database connection
    if (testDb) {
      closeTestDatabase(testDb);
    }
  });

  // ============ Service Initialization Tests ============

  describe('Service Initialization', () => {
    test('should return same instance (singleton pattern)', () => {
      const instance1 = MLForecastingService.getInstance();
      const instance2 = MLForecastingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should initialize without errors', async () => {
      const newService = MLForecastingService.getInstance();
      expect(newService).toBeDefined();
    });

    test('should have model metadata available', () => {
      const metadata = service.getModelMetadata();
      expect(metadata).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.modelType).toBeDefined();
    });
  });

  // ============ Readiness Forecast Tests ============

  describe('Readiness Forecasting', () => {
    const userId = 'test-user-123';
    const startDate = '2024-01-15';

    test('should generate 7-day forecast', async () => {
      const forecast = await service.forecastReadinessLegacy(userId, startDate);
      expect(forecast).toBeDefined();
      expect(forecast.predictions.length).toBe(7);
      expect(forecast.userId).toBe(userId);
    });

    test('should have valid predictions structure', async () => {
      const forecast = await service.forecastReadinessLegacy(userId, startDate);
      forecast.predictions.forEach(pred => {
        expect(pred.date).toBeDefined();
        expect(pred.predictedReadiness).toBeGreaterThanOrEqual(0);
        expect(pred.predictedReadiness).toBeLessThanOrEqual(100);
        expect(pred.confidence).toBeGreaterThanOrEqual(0);
        expect(pred.confidence).toBeLessThanOrEqual(100);
        expect(['improving', 'declining', 'stable']).toContain(pred.direction);
      });
    });

    test('should calculate average confidence', async () => {
      const forecast = await service.forecastReadinessLegacy(userId, startDate);
      expect(forecast.averageConfidence).toBeGreaterThan(0);
      expect(forecast.averageConfidence).toBeLessThanOrEqual(100);
    });

    test('should assign risk level based on confidence', async () => {
      const forecast = await service.forecastReadinessLegacy(userId, startDate);
      expect(['low', 'moderate', 'high']).toContain(forecast.riskLevel);
    });

    test('should generate recommendation', async () => {
      const forecast = await service.forecastReadinessLegacy(userId, startDate);
      expect(forecast.recommendedAction).toBeDefined();
      expect(forecast.recommendedAction.length).toBeGreaterThan(0);
    });

    test('should handle multiple users independently', async () => {
      const forecast1 = await service.forecastReadinessLegacy('user-1', startDate);
      const forecast2 = await service.forecastReadinessLegacy('user-2', startDate);
      expect(forecast1.userId).not.toBe(forecast2.userId);
    });

    test('should produce consistent structure across calls', async () => {
      const forecast1 = await service.forecastReadinessLegacy(userId, startDate);
      const forecast2 = await service.forecastReadinessLegacy(userId, startDate);
      expect(forecast1.predictions.length).toBe(forecast2.predictions.length);
      expect(forecast1.userId).toBe(forecast2.userId);
    });

    test('should have trend factors in predictions', async () => {
      const forecast = await service.forecastReadinessLegacy(userId, startDate);
      forecast.predictions.forEach(pred => {
        expect(pred.factors).toBeDefined();
        expect(pred.factors.trendInfluence).toBeDefined();
        expect(pred.factors.cycleInfluence).toBeDefined();
        expect(pred.factors.seasonalInfluence).toBeDefined();
      });
    });
  });

  // ============ Injury Probability Tests ============

  describe('Injury Probability Prediction', () => {
    const userId = 'test-user-456';
    const date = '2024-01-16';

    test('should predict injury probability', async () => {
      const prediction = await service.predictInjuryProbability(userId, date);
      expect(prediction).toBeDefined();
      expect(prediction.userId).toBe(userId);
      expect(prediction.date).toBe(date);
    });

    test('should have valid probability range', async () => {
      const prediction = await service.predictInjuryProbability(userId, date);
      expect(prediction.probabilityPercent).toBeGreaterThanOrEqual(0);
      expect(prediction.probabilityPercent).toBeLessThanOrEqual(100);
      expect(prediction.riskScore).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScore).toBeLessThanOrEqual(100);
    });

    test('should identify risk factors', async () => {
      const prediction = await service.predictInjuryProbability(userId, date);
      expect(prediction.riskFactors).toBeDefined();
      expect(prediction.riskFactors.elevatedRHR).toEqual(
        expect.any(Boolean)
      );
      expect(prediction.riskFactors.suppressedHRV).toEqual(expect.any(Boolean));
      expect(prediction.riskFactors.sleepDeprivation).toEqual(
        expect.any(Boolean)
      );
      expect(prediction.riskFactors.consecutiveHardDays).toEqual(
        expect.any(Boolean)
      );
      expect(prediction.riskFactors.overtrainingMarker).toEqual(
        expect.any(Boolean)
      );
    });

    test('should provide recommendation based on risk', async () => {
      const prediction = await service.predictInjuryProbability(userId, date);
      expect(prediction.recommendation).toBeDefined();
      expect(prediction.recommendation.length).toBeGreaterThan(0);
    });

    test('should have confidence score', async () => {
      const prediction = await service.predictInjuryProbability(userId, date);
      expect(prediction.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(prediction.confidenceScore).toBeLessThanOrEqual(100);
    });

    test('should match recommendation to probability level', async () => {
      const prediction = await service.predictInjuryProbability(userId, date);
      // Only test if we have sufficient data for actual prediction
      if (prediction.confidenceScore > 25) {
        if (prediction.probabilityPercent > 70) {
          expect(prediction.recommendation).toContain('HIGH RISK');
        } else if (prediction.probabilityPercent < 30) {
          expect(prediction.recommendation).toContain('LOW RISK');
        }
      }
    });

    test('should handle different users', async () => {
      const pred1 = await service.predictInjuryProbability('user-1', date);
      const pred2 = await service.predictInjuryProbability('user-2', date);
      expect(pred1.userId).not.toBe(pred2.userId);
    });

    test('should calculate risk score from factors', async () => {
      const prediction = await service.predictInjuryProbability(userId, date);
      expect(prediction.riskScore).toBeGreaterThan(0);
      // Risk score should be somewhat proportional to probability
      expect(Math.abs(prediction.riskScore - prediction.probabilityPercent)).toBeLessThan(40);
    });
  });

  // ============ Fatigue Estimation Tests ============

  describe('Fatigue Estimation', () => {
    const userId = 'test-user-789';
    const date = '2024-01-17';

    test('should estimate fatigue level', async () => {
      const estimate = await service.estimateFatigue(userId, date);
      expect(estimate).toBeDefined();
      expect(estimate.userId).toBe(userId);
      expect(estimate.date).toBe(date);
    });

    test('should have valid fatigue range', async () => {
      const estimate = await service.estimateFatigue(userId, date);
      expect(estimate.fatigueLevel).toBeGreaterThanOrEqual(0);
      expect(estimate.fatigueLevel).toBeLessThanOrEqual(100);
    });

    test('should calculate acute-to-chronic ratio', async () => {
      const estimate = await service.estimateFatigue(userId, date);
      expect(estimate.acuteToChronicRatio).toBeGreaterThan(0);
    });

    test('should calculate recovery capacity', async () => {
      const estimate = await service.estimateFatigue(userId, date);
      expect(estimate.recoveryCapacity).toBeGreaterThanOrEqual(0);
      expect(estimate.recoveryCapacity).toBeLessThanOrEqual(100);
    });

    test('should estimate recovery days', async () => {
      const estimate = await service.estimateFatigue(userId, date);
      expect(estimate.estimatedRecoveryDays).toBeGreaterThanOrEqual(0);
      expect(typeof estimate.estimatedRecoveryDays).toBe('number');
    });

    test('should provide recommendation', async () => {
      const estimate = await service.estimateFatigue(userId, date);
      expect(estimate.recommendation).toBeDefined();
      expect(estimate.recommendation.length).toBeGreaterThan(0);
    });

    test('should match recommendation to fatigue level', async () => {
      const estimate = await service.estimateFatigue(userId, date);
      if (estimate.fatigueLevel > 75) {
        expect(estimate.recommendation).toContain('rest');
      }
    });

    test('should consider acute-to-chronic ratio in recommendation', async () => {
      const estimate = await service.estimateFatigue(userId, date);
      if (estimate.acuteToChronicRatio > 1.5) {
        expect(estimate.recommendation).toContain('load');
      }
    });
  });

  // ============ Training Load Suggestion Tests ============

  describe('Training Load Suggestion', () => {
    const userId = 'test-user-load';
    const date = '2024-01-18';

    test('should suggest training load', async () => {
      const suggestion = await service.suggestTrainingLoad(userId, date);
      expect(suggestion).toBeDefined();
      expect(suggestion.userId).toBe(userId);
      expect(suggestion.date).toBe(date);
    });

    test('should have valid load category', async () => {
      const suggestion = await service.suggestTrainingLoad(userId, date);
      const validLoads = ['very_light', 'light', 'moderate', 'hard', 'very_hard'];
      expect(validLoads).toContain(suggestion.suggestedLoad);
    });

    test('should set reasonable workout duration', async () => {
      const suggestion = await service.suggestTrainingLoad(userId, date);
      expect(suggestion.maxWorkoutDurationMinutes).toBeGreaterThan(0);
      expect(suggestion.maxWorkoutDurationMinutes).toBeLessThanOrEqual(120);
    });

    test('should provide recommended exercises', async () => {
      const suggestion = await service.suggestTrainingLoad(userId, date);
      expect(Array.isArray(suggestion.recommendedExercises)).toBe(true);
      expect(suggestion.recommendedExercises.length).toBeGreaterThan(0);
      suggestion.recommendedExercises.forEach(ex => {
        expect(typeof ex).toBe('string');
        expect(ex.length).toBeGreaterThan(0);
      });
    });

    test('should provide rationale', async () => {
      const suggestion = await service.suggestTrainingLoad(userId, date);
      expect(suggestion.rationale).toBeDefined();
      expect(suggestion.rationale.length).toBeGreaterThan(0);
    });

    test('should estimate recovery time', async () => {
      const suggestion = await service.suggestTrainingLoad(userId, date);
      expect(suggestion.expectedRecoveryTime).toBeGreaterThanOrEqual(0);
      expect(typeof suggestion.expectedRecoveryTime).toBe('number');
    });

    test('should match exercises to load level', async () => {
      const suggestion = await service.suggestTrainingLoad(userId, date);
      if (suggestion.suggestedLoad === 'very_light') {
        const exerciseStr = suggestion.recommendedExercises.join(' ').toLowerCase();
        expect(exerciseStr).not.toContain('hard');
      }
    });

    test('should set shorter duration for higher fatigue', async () => {
      const suggestion = await service.suggestTrainingLoad(userId, date);
      // Light loads should have shorter durations
      if (suggestion.suggestedLoad === 'light' || suggestion.suggestedLoad === 'very_light') {
        expect(suggestion.maxWorkoutDurationMinutes).toBeLessThan(60);
      }
    });
  });

  // ============ Comprehensive Predictions Tests ============

  describe('Comprehensive Predictions', () => {
    const userId = 'test-user-comprehensive';
    const date = '2024-01-19';

    test('should get all predictions together', async () => {
      const forecast = await service.forecastReadinessLegacy(userId, date);
      const injuryRisk = await service.predictInjuryProbability(userId, date);
      const fatigue = await service.estimateFatigue(userId, date);
      const trainingLoad = await service.suggestTrainingLoad(userId, date);

      expect(forecast).toBeDefined();
      expect(injuryRisk).toBeDefined();
      expect(fatigue).toBeDefined();
      expect(trainingLoad).toBeDefined();
    });

    test('should have consistent user IDs across predictions', async () => {
      const forecast = await service.forecastReadinessLegacy(userId, date);
      const injuryRisk = await service.predictInjuryProbability(userId, date);
      const fatigue = await service.estimateFatigue(userId, date);
      const trainingLoad = await service.suggestTrainingLoad(userId, date);

      expect(forecast.userId).toBe(userId);
      expect(injuryRisk.userId).toBe(userId);
      expect(fatigue.userId).toBe(userId);
      expect(trainingLoad.userId).toBe(userId);
    });

    test('should coordinate recommendations between predictions', async () => {
      const injuryRisk = await service.predictInjuryProbability(userId, date);
      const trainingLoad = await service.suggestTrainingLoad(userId, date);

      // High injury risk should suggest lighter load
      if (injuryRisk.probabilityPercent > 60) {
        expect(['very_light', 'light']).toContain(trainingLoad.suggestedLoad);
      }
    });
  });

  // ============ Model Metadata Tests ============

  describe('Model Metadata', () => {
    test('should have version number', () => {
      const metadata = service.getModelMetadata();
      expect(metadata.version).toBeDefined();
      expect(/^\d+\.\d+\.\d+$/.test(metadata.version)).toBe(true);
    });

    test('should have training date', () => {
      const metadata = service.getModelMetadata();
      expect(metadata.trainingDate).toBeDefined();
      expect(new Date(metadata.trainingDate).getTime()).toBeGreaterThan(0);
    });

    test('should have accuracy score', () => {
      const metadata = service.getModelMetadata();
      expect(metadata.accuracyScore).toBeGreaterThanOrEqual(0);
      expect(metadata.accuracyScore).toBeLessThanOrEqual(100);
    });

    test('should have model type', () => {
      const metadata = service.getModelMetadata();
      expect(metadata.modelType).toBeDefined();
      expect(metadata.modelType.length).toBeGreaterThan(0);
    });

    test('should have model parameters', () => {
      const metadata = service.getModelMetadata();
      expect(metadata.parameters).toBeDefined();
      expect(metadata.parameters.windowSize).toBeGreaterThan(0);
      expect(metadata.parameters.alpha).toBeGreaterThan(0);
      expect(metadata.parameters.alpha).toBeLessThan(1);
      expect(metadata.parameters.beta).toBeGreaterThan(0);
      expect(metadata.parameters.beta).toBeLessThan(1);
      expect(metadata.parameters.gamma).toBeGreaterThan(0);
      expect(metadata.parameters.gamma).toBeLessThan(1);
    });
  });

  // ============ Edge Cases & Error Handling ============

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty user ID gracefully', async () => {
      // Service should still generate forecasts with default data
      const forecast = await service.forecastReadinessLegacy('', '2024-01-20');
      expect(forecast).toBeDefined();
      expect(forecast.predictions.length).toBe(7);
    });

    test('should handle future dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const dateStr = futureDate.toISOString().split('T')[0];

      const forecast = await service.forecastReadinessLegacy('user-future', dateStr);
      expect(forecast).toBeDefined();
      expect(forecast.predictions.length).toBe(7);
    });

    test('should handle past dates', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const dateStr = pastDate.toISOString().split('T')[0];

      const forecast = await service.forecastReadinessLegacy('user-past', dateStr);
      expect(forecast).toBeDefined();
      expect(forecast.predictions.length).toBe(7);
    });

    test('should maintain data consistency across calls', async () => {
      const userId = 'consistency-test-user';
      const date = '2024-01-21';

      const call1 = await service.predictInjuryProbability(userId, date);
      const call2 = await service.predictInjuryProbability(userId, date);

      expect(call1.userId).toBe(call2.userId);
      expect(call1.date).toBe(call2.date);
    });

    test('should handle concurrent predictions', async () => {
      const users = ['user-1', 'user-2', 'user-3'];
      const date = '2024-01-22';

      const promises = users.map(userId =>
        service.predictInjuryProbability(userId, date)
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
      results.forEach((result, i) => {
        expect(result.userId).toBe(users[i]);
      });
    });

    test('should provide low confidence for insufficient data', async () => {
      const forecast = await service.forecastReadinessLegacy('new-user-no-data', '2024-01-23');
      // With no historical data, confidence should be relatively low
      expect(forecast.averageConfidence).toBeLessThan(50);
    });

    test('should handle invalid date format gracefully', async () => {
      // Service should gracefully handle invalid dates by using today instead
      const forecast = await service.forecastReadinessLegacy('user-invalid-date', '2024-01-invalid');
      expect(forecast).toBeDefined();
      expect(forecast.predictions.length).toBe(7);
      // Should still generate valid predictions even with invalid input date
      forecast.predictions.forEach(pred => {
        expect(pred.predictedReadiness).toBeGreaterThanOrEqual(0);
        expect(pred.predictedReadiness).toBeLessThanOrEqual(100);
      });
    });
  });

  // ============ Service Closure ============

  describe('Service Closure', () => {
    test('should close service without errors', () => {
      expect(() => {
        service.close();
      }).not.toThrow();
    });
  });
});

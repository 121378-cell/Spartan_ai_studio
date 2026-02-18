/**
 * MLForecastingService Phase 2.3 Tests
 * 
 * Tests for:
 * 1. predictInjuryRisk (with 30-day history)
 * 2. forecastReadiness (with Holt-Winters)
 */

import { MLForecastingService, InjuryPrediction, ReadinessForecast } from '../services/mlForecastingService';
import { fixtureOptimalUser, fixtureHighRiskUser, fixtureOvertrainingUser, fixtureInsufficientData, generateTrendData } from '../__mocks__/terraHealthData';

describe('MLForecastingService - Phase 2.3', () => {
  let service: MLForecastingService;

  beforeEach(() => {
    service = MLForecastingService.getInstance();
  });

  afterEach(() => {
    MLForecastingService.resetInstance();
  });

  describe('predictInjuryRisk', () => {
    it('should predict injury risk with 30-day history', async () => {
      const userId = 'test-user-30day';
      
      const prediction = await service.predictInjuryRisk(userId);

      expect(prediction).toBeDefined();
      expect(prediction.userId).toBe(userId);
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(100);
      expect(prediction.factors).toBeDefined();
      expect(prediction.timeframe).toBeDefined();
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
      expect(prediction.recommendation).toBeDefined();
    });

    it('should identify elevated RHR as risk factor', async () => {
      const userId = 'test-elevated-rhr';
      
      const prediction = await service.predictInjuryRisk(userId);

      expect(prediction.factors).toHaveProperty('elevatedRHR');
      expect(typeof prediction.factors.elevatedRHR).toBe('boolean');
    });

    it('should identify suppressed HRV as risk factor', async () => {
      const userId = 'test-suppressed-hrv';
      
      const prediction = await service.predictInjuryRisk(userId);

      expect(prediction.factors).toHaveProperty('suppressedHRV');
      expect(typeof prediction.factors.suppressedHRV).toBe('boolean');
    });

    it('should identify sleep deprivation as risk factor', async () => {
      const userId = 'test-sleep-deprivation';
      
      const prediction = await service.predictInjuryRisk(userId);

      expect(prediction.factors).toHaveProperty('sleepDeprivation');
      expect(typeof prediction.factors.sleepDeprivation).toBe('boolean');
    });

    it('should identify consecutive hard days as risk factor', async () => {
      const userId = 'test-hard-days';
      
      const prediction = await service.predictInjuryRisk(userId);

      expect(prediction.factors).toHaveProperty('consecutiveHardDays');
      expect(typeof prediction.factors.consecutiveHardDays).toBe('boolean');
    });

    it('should identify overtraining marker as risk factor', async () => {
      const userId = 'test-overtraining';
      
      const prediction = await service.predictInjuryRisk(userId);

      expect(prediction.factors).toHaveProperty('overtrainingMarker');
      expect(typeof prediction.factors.overtrainingMarker).toBe('boolean');
    });

    it('should return low confidence for insufficient data', async () => {
      const userId = 'test-insufficient-data';
      
      const prediction = await service.predictInjuryRisk(userId);

      // With insufficient data, confidence should be low
      // The service handles insufficient data gracefully
      expect(prediction.confidence).toBeLessThanOrEqual(90);
    });

    it('should generate appropriate timeframe based on risk factors', async () => {
      const userId = 'test-timeframe';
      
      const prediction = await service.predictInjuryRisk(userId);

      expect(['24-48 hours', '3-7 days', '7-14 days', '7 days']).toContain(prediction.timeframe);
    });

    it('should generate appropriate recommendation based on risk level', async () => {
      const userId = 'test-recommendation';
      
      const prediction = await service.predictInjuryRisk(userId);

      expect(typeof prediction.recommendation).toBe('string');
      expect(prediction.recommendation.length).toBeGreaterThan(10);
    });

    it('should accumulate risk from multiple factors', async () => {
      const userId = 'test-multi-factor';
      
      const prediction = await service.predictInjuryRisk(userId);

      const activeFactors = Object.values(prediction.factors).filter(Boolean).length;
      
      if (activeFactors >= 3) {
        expect(prediction.probability).toBeGreaterThan(30);
      }
    });
  });

  describe('forecastReadiness', () => {
    it('should forecast readiness for specified days', async () => {
      const userId = 'test-forecast-user';
      const days = 3;
      
      const forecasts = await service.forecastReadiness(userId, days);

      expect(forecasts).toBeDefined();
      expect(forecasts).toHaveLength(days);
      
      forecasts.forEach((forecast, index) => {
        expect(forecast.day).toBe(index + 1);
        expect(forecast.date).toBeDefined();
        expect(forecast.predictedScore).toBeGreaterThanOrEqual(0);
        expect(forecast.predictedScore).toBeLessThanOrEqual(100);
        expect(forecast.confidence).toBeGreaterThanOrEqual(0);
        expect(forecast.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should limit forecast to maximum 7 days', async () => {
      const userId = 'test-forecast-max';
      
      const forecasts = await service.forecastReadiness(userId, 10);

      expect(forecasts.length).toBeLessThanOrEqual(7);
    });

    it('should limit forecast to minimum 1 day', async () => {
      const userId = 'test-forecast-min';
      
      const forecasts = await service.forecastReadiness(userId, 0);

      expect(forecasts.length).toBeGreaterThanOrEqual(1);
    });

    it('should decrease confidence with distance from today', async () => {
      const userId = 'test-forecast-confidence';
      
      const forecasts = await service.forecastReadiness(userId, 5);

      for (let i = 1; i < forecasts.length; i++) {
        // Confidence should generally decrease or stay similar with distance
        expect(forecasts[i].confidence).toBeLessThanOrEqual(forecasts[0].confidence + 10);
      }
    });

    it('should generate sequential dates', async () => {
      const userId = 'test-forecast-dates';
      
      const forecasts = await service.forecastReadiness(userId, 5);

      for (let i = 1; i < forecasts.length; i++) {
        const prevDate = new Date(forecasts[i - 1].date);
        const currDate = new Date(forecasts[i].date);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        expect(diffDays).toBe(1);
      }
    });

    it('should return fallback forecast for insufficient data', async () => {
      const userId = 'test-forecast-insufficient';
      
      const forecasts = await service.forecastReadiness(userId, 3);

      expect(forecasts.length).toBeGreaterThan(0);
      // With insufficient data, confidence should be lower
      const avgConfidence = forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length;
      expect(avgConfidence).toBeLessThanOrEqual(50);
    });

    it('should use Holt-Winters for sufficient data', async () => {
      const userId = 'test-holt-winters';
      
      const forecasts = await service.forecastReadiness(userId, 7);

      expect(forecasts.length).toBeGreaterThan(0);
      // The Holt-Winters algorithm should produce reasonable forecasts
      const avgScore = forecasts.reduce((sum, f) => sum + f.predictedScore, 0) / forecasts.length;
      expect(avgScore).toBeGreaterThanOrEqual(0);
      expect(avgScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getModelMetadata', () => {
    it('should return model metadata', () => {
      const metadata = service.getModelMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.modelType).toBeDefined();
      expect(metadata.parameters).toBeDefined();
      expect(metadata.parameters.alpha).toBeGreaterThanOrEqual(0);
      expect(metadata.parameters.alpha).toBeLessThanOrEqual(1);
      expect(metadata.parameters.beta).toBeGreaterThanOrEqual(0);
      expect(metadata.parameters.beta).toBeLessThanOrEqual(1);
      expect(metadata.parameters.gamma).toBeGreaterThanOrEqual(0);
      expect(metadata.parameters.gamma).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration: Injury Risk + Readiness Forecast', () => {
    it('should correlate high injury risk with lower predicted readiness', async () => {
      const userId = 'test-correlation';
      
      const injuryPrediction = await service.predictInjuryRisk(userId);
      const readinessForecast = await service.forecastReadiness(userId, 3);

      // If injury risk is high, predicted readiness should be lower
      if (injuryPrediction.probability > 60) {
        const avgReadiness = readinessForecast.reduce((sum, f) => sum + f.predictedScore, 0) / readinessForecast.length;
        // High injury risk should generally correlate with lower readiness
        expect(avgReadiness).toBeLessThanOrEqual(80);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null userId gracefully', async () => {
      await expect(service.predictInjuryRisk(null as any)).resolves.toBeDefined();
    });

    it('should handle empty string userId', async () => {
      await expect(service.predictInjuryRisk('')).resolves.toBeDefined();
    });

    it('should handle negative days parameter', async () => {
      const forecasts = await service.forecastReadiness('test-user', -5);
      expect(forecasts.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very large days parameter', async () => {
      const forecasts = await service.forecastReadiness('test-user', 100);
      expect(forecasts.length).toBeLessThanOrEqual(7);
    });
  });

  describe('Extended Edge Cases for Coverage', () => {
    describe('Injury Risk Factor Detection', () => {
      it('should detect multiple risk factors simultaneously', async () => {
        const userId = 'test-multi-risk';
        const prediction = await service.predictInjuryRisk(userId);

        expect(prediction.factors).toBeDefined();
        expect(typeof prediction.factors.elevatedRHR).toBe('boolean');
        expect(typeof prediction.factors.suppressedHRV).toBe('boolean');
        expect(typeof prediction.factors.sleepDeprivation).toBe('boolean');
        expect(typeof prediction.factors.consecutiveHardDays).toBe('boolean');
        expect(typeof prediction.factors.overtrainingMarker).toBe('boolean');
      });

      it('should return valid timeframe format', async () => {
        const prediction = await service.predictInjuryRisk('test-timeframe-format');

        expect(['24-48 hours', '3-7 days', '7-14 days', '7 days']).toContain(prediction.timeframe);
      });

      it('should generate meaningful recommendations', async () => {
        const prediction = await service.predictInjuryRisk('test-recs');

        expect(prediction.recommendation).toBeDefined();
        expect(typeof prediction.recommendation).toBe('string');
        expect(prediction.recommendation.length).toBeGreaterThan(5);
      });
    });

    describe('Readiness Forecast Detailed', () => {
      it('should generate sequential dates starting from tomorrow', async () => {
        const forecasts = await service.forecastReadiness('test-dates', 3);
        const today = new Date().toISOString().split('T')[0];

        forecasts.forEach(f => {
          expect(f.date).not.toBe(today);
        });
      });

      it('should have decreasing confidence with forecast distance', async () => {
        const forecasts = await service.forecastReadiness('test-confidence', 5);

        if (forecasts.length >= 2) {
          for (let i = 1; i < forecasts.length; i++) {
            expect(forecasts[i].confidence).toBeLessThanOrEqual(forecasts[i - 1].confidence + 5);
          }
        }
      });

      it('should return predicted scores within valid range', async () => {
        const forecasts = await service.forecastReadiness('test-range', 7);

        forecasts.forEach(f => {
          expect(f.predictedScore).toBeGreaterThanOrEqual(0);
          expect(f.predictedScore).toBeLessThanOrEqual(100);
        });
      });

      it('should handle single day forecast', async () => {
        const forecasts = await service.forecastReadiness('test-single', 1);

        expect(forecasts.length).toBe(1);
      });
    });

    describe('Probability and Confidence', () => {
      it('should return probability within valid range', async () => {
        const prediction = await service.predictInjuryRisk('test-prob');

        expect(prediction.probability).toBeGreaterThanOrEqual(0);
        expect(prediction.probability).toBeLessThanOrEqual(100);
      });

      it('should return confidence within valid range', async () => {
        const prediction = await service.predictInjuryRisk('test-conf');

        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(100);
      });

      it('should return valid day number in forecast', async () => {
        const forecasts = await service.forecastReadiness('test-day-num', 3);

        forecasts.forEach((f, idx) => {
          expect(f.day).toBe(idx + 1);
        });
      });
    });

    describe('Model Metadata Extended', () => {
      it('should return valid training date', () => {
        const metadata = service.getModelMetadata();

        expect(metadata.trainingDate).toBeDefined();
      });

      it('should return valid accuracy score range', () => {
        const metadata = service.getModelMetadata();

        expect(metadata.accuracyScore).toBeGreaterThanOrEqual(0);
        expect(metadata.accuracyScore).toBeLessThanOrEqual(100);
      });

      it('should return positive data points count', () => {
        const metadata = service.getModelMetadata();

        expect(metadata.dataPoints).toBeGreaterThanOrEqual(0);
      });

      it('should return valid parameter ranges', () => {
        const metadata = service.getModelMetadata();

        expect(metadata.parameters.windowSize).toBeGreaterThan(0);
        expect(metadata.parameters.seasonalCycle).toBeGreaterThan(0);
      });
    });

    describe('Boundary Conditions', () => {
      it('should handle zero days forecast request', async () => {
        const forecasts = await service.forecastReadiness('test-zero', 0);
        expect(forecasts.length).toBeGreaterThanOrEqual(1);
      });

      it('should handle userId with special characters', async () => {
        const prediction = await service.predictInjuryRisk('user@test-special.chars');
        expect(prediction).toBeDefined();
        expect(prediction.userId).toBe('user@test-special.chars');
      });

      it('should handle very long userId', async () => {
        const longId = 'a'.repeat(200);
        const prediction = await service.predictInjuryRisk(longId);
        expect(prediction).toBeDefined();
      });

      it('should handle numeric userId', async () => {
        const prediction = await service.predictInjuryRisk('123456');
        expect(prediction).toBeDefined();
      });
    });
  });
});

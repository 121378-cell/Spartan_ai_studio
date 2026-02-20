/**
 * Mock ML Forecasting Service for Testing
 * Proporciona mocks simples y rápidos para tests unitarios
 * Evita el uso de bases de datos en memoria
 */

/**
 * Mock simple para MLForecastingService
 * Todos los métodos retornan datos determinísticos para tests
 */
class MockMLForecastingService {
  static instance;

  static getInstance() {
    if (!MockMLForecastingService.instance) {
      MockMLForecastingService.instance = new MockMLForecastingService();
    }
    return MockMLForecastingService.instance;
  }

  static resetInstance() {
    MockMLForecastingService.instance = null;
  }

  async initialize() {
    // No-op for mock
    return Promise.resolve();
  }

  setDatabase() {
    // No-op for mock
  }

  async predictInjuryRisk(userId) {
    return {
      userId,
      probability: 25,
      factors: {
        elevatedRHR: false,
        suppressedHRV: false,
        sleepDeprivation: false,
        consecutiveHardDays: false,
        overtrainingMarker: false
      },
      timeframe: '7-14 days',
      confidence: 75,
      recommendation: 'LOW RISK: Normal training is appropriate. Continue current plan.'
    };
  }

  async forecastReadiness(userId, days) {
    const forecasts = [];
    const today = new Date();
    const clampedDays = Math.max(1, Math.min(7, days));

    for (let i = 1; i <= clampedDays; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);

      forecasts.push({
        day: i,
        date: forecastDate.toISOString().split('T')[0],
        predictedScore: 65 + Math.floor(Math.random() * 20),
        confidence: Math.max(20, 90 - i * 8)
      });
    }

    return forecasts;
  }

  async predictInjuryProbability(userId, date) {
    return {
      userId,
      date,
      probabilityPercent: 20,
      riskFactors: {
        elevatedRHR: false,
        suppressedHRV: false,
        sleepDeprivation: false,
        consecutiveHardDays: false,
        overtrainingMarker: false
      },
      riskScore: 20,
      recommendation: 'LOW RISK: Normal training is appropriate. Continue current plan.',
      confidenceScore: 75
    };
  }

  async estimateFatigue(userId, date) {
    return {
      userId,
      date,
      fatigueLevel: 45,
      acuteToChronicRatio: 1.1,
      recoveryCapacity: 70,
      estimatedRecoveryDays: 1,
      recommendation: 'Fatigue levels are normal. Continue with planned training.'
    };
  }

  async suggestTrainingLoad(userId, date) {
    return {
      userId,
      date,
      suggestedLoad: 'moderate',
      maxWorkoutDurationMinutes: 60,
      recommendedExercises: ['steady-state cardio', 'strength maintenance', 'technique work'],
      rationale: 'Based on normal fatigue and injury risk levels.',
      expectedRecoveryTime: 24
    };
  }

  getModelMetadata() {
    return {
      version: '1.0.0-test',
      trainingDate: new Date().toISOString(),
      accuracyScore: 78,
      dataPoints: 1000,
      modelType: 'mock-model',
      parameters: {
        windowSize: 30,
        seasonalCycle: 7,
        alpha: 0.3,
        beta: 0.2,
        gamma: 0.1
      }
    };
  }

  async retrainModel() {
    return Promise.resolve();
  }

  close() {
    // No-op for mock
  }
}

/**
 * Factory function para obtener el mock
 */
function getMockMLForecastingService() {
  return MockMLForecastingService.getInstance();
}

/**
 * Helper para crear predicciones de injury personalizadas en tests
 */
function createMockInjuryPrediction(userId, overrides = {}) {
  return {
    userId,
    probability: 25,
    factors: {
      elevatedRHR: false,
      suppressedHRV: false,
      sleepDeprivation: false,
      consecutiveHardDays: false,
      overtrainingMarker: false
    },
    timeframe: '7-14 days',
    confidence: 75,
    recommendation: 'LOW RISK: Normal training is appropriate.',
    ...overrides
  };
}

/**
 * Helper para crear forecasts de readiness personalizados en tests
 */
function createMockReadinessForecasts(days, baseScore = 65) {
  const forecasts = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);

    forecasts.push({
      day: i,
      date: forecastDate.toISOString().split('T')[0],
      predictedScore: baseScore + Math.floor(Math.random() * 10),
      confidence: Math.max(20, 90 - i * 8)
    });
  }

  return forecasts;
}

module.exports = {
  MockMLForecastingService,
  getMockMLForecastingService,
  createMockInjuryPrediction,
  createMockReadinessForecasts
};

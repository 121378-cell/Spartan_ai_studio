/**
 * E2E Tests for ML-Enhanced Performance Forecasting Routes
 * Phase 4.4 - Predictive Performance Analysis
 */

import request from 'supertest';
import express from 'express';
import mlPerformanceForecastRoutes from './mlPerformanceForecastRoutes';
import { PerformanceForecastModel } from '../ml/models/performanceForecastModel';
import { DailyBiometrics } from '../models/BiometricData';

// Mock dependencies
jest.mock('../ml/models/performanceForecastModel');
jest.mock('../models/BiometricData');

// Mock BiometricModel (placeholder for now)
const mockBiometricModel = {
  find: jest.fn().mockResolvedValue([]),
};
jest.mock('../models/BiometricData', () => ({
  DailyBiometrics: {},
  BiometricModel: mockBiometricModel,
}));
jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.userId = 'test-user-123';
    next();
  },
}));
jest.mock('../types/index', () => ({
  AuthenticatedRequest: {},
}));
jest.mock('../middleware/rateLimiter', () => ({
  rateLimiter: () => (req: any, res: any, next: any) => next(),
}), { virtual: true });

describe('ML Performance Forecast Routes E2E', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ml', mlPerformanceForecastRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ml/performance-forecast', () => {
    test('should generate 12-week forecast with valid biometric data', async () => {
      const mockBiometrics = Array.from({ length: 84 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (84 - i) * 24 * 60 * 60 * 1000),
        recoveryScore: 50 + Math.random() * 30,
        sleepHours: 7 + Math.random() * 2,
        hrv: 60 + Math.random() * 20,
      }));

      const mockForecast = {
        predictions: Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          date: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
          expectedPerformance: 50 + i * 1.5,
          expectedPower: 150 + i * 3,
          expectedSpeed: 20 + i * 0.5,
          expectedEndurance: 45 + i * 2,
          confidence: Math.max(0.6, 0.95 - i * 0.03),
        })),
        trendAnalysis: {
          direction: 'improving',
          rate: 1.8,
          accelerating: true,
          daysToGoal: 84,
          projectedPeak: { week: 10, value: 65 },
        },
        anomalies: {
          detected: false,
          score: 0.2,
          severity: 'low',
        },
        recommendations: [
          {
            actionItem: 'Continue current training',
            timing: 'ongoing',
            expectedImpact: '+2% weekly',
            priority: 'medium',
            category: 'training',
          },
        ],
        confidenceInterval: {
          lower95: 48,
          upper95: 62,
          lower80: 50,
          upper80: 60,
        },
        confidence: 0.85,
        mlSource: true,
        timeframe: 'medium-term',
      };

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);
      (PerformanceForecastModel.predict as jest.Mock).mockResolvedValue(mockForecast);

      const response = await request(app)
        .post('/api/ml/performance-forecast')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.predictions).toHaveLength(12);
      expect(response.body.data.trendAnalysis.direction).toBe('improving');
      expect(response.body.data.confidence).toBe(0.85);
    });

    test('should return 400 when insufficient biometric data', async () => {
      const mockBiometrics = Array.from({ length: 14 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
      }));

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);

      const response = await request(app)
        .post('/api/ml/performance-forecast')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient biometric data');
    });

    test('should handle improving trend correctly', async () => {
      const mockBiometrics = Array.from({ length: 84 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
      }));

      const improvingForecast = {
        predictions: Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          date: new Date(),
          expectedPerformance: 50 + i * 2.5, // Faster improvement
          expectedPower: 150 + i * 5,
          expectedSpeed: 20 + i * 0.8,
          expectedEndurance: 45 + i * 3,
          confidence: 0.9 - i * 0.02,
        })),
        trendAnalysis: {
          direction: 'improving',
          rate: 2.8,
          accelerating: true,
          daysToGoal: 60,
          projectedPeak: { week: 8, value: 72 },
        },
        anomalies: { detected: false, score: 0.1, severity: 'none' },
        recommendations: [],
        confidenceInterval: { lower95: 52, upper95: 68, lower80: 54, upper80: 66 },
        confidence: 0.88,
        mlSource: true,
        timeframe: 'short-term',
      };

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);
      (PerformanceForecastModel.predict as jest.Mock).mockResolvedValue(improvingForecast);

      const response = await request(app)
        .post('/api/ml/performance-forecast')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.trendAnalysis.rate).toBeGreaterThan(2);
      expect(response.body.data.anomalies.detected).toBe(false);
    });
  });

  describe('POST /api/ml/performance-forecast/scenario', () => {
    test('should analyze increased-volume scenario', async () => {
      const mockBiometrics = Array.from({ length: 84 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
      }));

      const baseForecast = {
        predictions: Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          expectedPerformance: 50 + i * 1.5,
          expectedPower: 150 + i * 3,
          expectedSpeed: 20 + i * 0.5,
          expectedEndurance: 45 + i * 2,
          confidence: 0.85 - i * 0.03,
        })),
        trendAnalysis: {
          direction: 'improving',
          rate: 1.8,
          accelerating: false,
          daysToGoal: 84,
          projectedPeak: { week: 12, value: 68 },
        },
        anomalies: { detected: false, score: 0.15, severity: 'low' },
        recommendations: [],
        confidenceInterval: { lower95: 48, upper95: 62, lower80: 50, upper80: 60 },
        confidence: 0.85,
        mlSource: true,
        timeframe: 'medium-term',
      };

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);
      (PerformanceForecastModel.predict as jest.Mock).mockResolvedValue(baseForecast);

      const response = await request(app)
        .post('/api/ml/performance-forecast/scenario')
        .send({
          scenario: 'increased-volume',
          adjustments: { performanceBump: 10 },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.baseline).toBeDefined();
      expect(response.body.data.scenario).toBeDefined();
      expect(response.body.data.comparison).toBeDefined();
      expect(response.body.data.comparison.performanceDelta).toBeDefined();
    });

    test('should validate scenario parameter', async () => {
      const response = await request(app)
        .post('/api/ml/performance-forecast/scenario')
        .send({
          scenario: 'invalid-scenario',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid scenario');
    });

    test('should handle recovery-focus scenario', async () => {
      const mockBiometrics = Array.from({ length: 84 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
      }));

      const forecast = {
        predictions: Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          expectedPerformance: 50 + i,
          expectedPower: 150 + i * 2,
          expectedSpeed: 20 + i * 0.3,
          expectedEndurance: 45 + i * 1.5,
          confidence: 0.85 - i * 0.03,
        })),
        trendAnalysis: { direction: 'stable', rate: 0.8, accelerating: false, daysToGoal: 84, projectedPeak: { week: 12, value: 62 } },
        anomalies: { detected: false, score: 0.15, severity: 'low' },
        recommendations: [],
        confidenceInterval: { lower95: 48, upper95: 62, lower80: 50, upper80: 60 },
        confidence: 0.80,
        mlSource: true,
        timeframe: 'medium-term',
      };

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);
      (PerformanceForecastModel.predict as jest.Mock).mockResolvedValue(forecast);

      const response = await request(app)
        .post('/api/ml/performance-forecast/scenario')
        .send({ scenario: 'recovery-focus' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/ml/performance-forecast/trend-summary', () => {
    test('should return trend summary with recent data', async () => {
      const mockBiometrics = Array.from({ length: 42 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (42 - i) * 24 * 60 * 60 * 1000),
        recoveryScore: 50 + i * 0.5,
      }));

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);

      const response = await request(app)
        .get('/api/ml/performance-forecast/trend-summary')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trendDirection).toBeDefined();
      expect(response.body.data.trendPercentage).toBeDefined();
      expect(response.body.data.currentScore).toBeDefined();
      expect(response.body.data.recommendation).toBeDefined();
    });

    test('should return 400 when no recent data', async () => {
      (mockBiometricModel.find as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/ml/performance-forecast/trend-summary')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No recent biometric data');
    });

    test('should categorize improving trend correctly', async () => {
      const mockBiometrics = Array.from({ length: 42 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
        recoveryScore: 40 + i * 0.8, // Steady improvement
      }));

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);

      const response = await request(app)
        .get('/api/ml/performance-forecast/trend-summary');

      expect(response.status).toBe(200);
      expect(response.body.data.trendDirection).toContain('Improving');
    });
  });

  describe('POST /api/ml/performance-forecast/feedback', () => {
    test('should record forecast feedback', async () => {
      const response = await request(app)
        .post('/api/ml/performance-forecast/feedback')
        .set('Authorization', 'Bearer valid-token')
        .send({
          forecastId: 'forecast-123',
          actualPerformance: 62,
          weekNumber: 4,
          feedback: 'Performed well, felt strong',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.feedbackId).toBeDefined();
    });

    test('should validate performance score range', async () => {
      const response = await request(app)
        .post('/api/ml/performance-forecast/feedback')
        .send({
          forecastId: 'forecast-123',
          actualPerformance: 150, // Invalid
          weekNumber: 4,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid performance score');
    });

    test('should require all mandatory fields', async () => {
      const response = await request(app)
        .post('/api/ml/performance-forecast/feedback')
        .send({
          forecastId: 'forecast-123',
          // Missing actualPerformance and weekNumber
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });
  });

  describe('Anomaly Detection', () => {
    test('should detect performance decline anomaly', async () => {
      const mockBiometrics = Array.from({ length: 84 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
        hrv: i < 70 ? 70 : 35, // HRV drops significantly
      }));

      const anomalyForecast = {
        predictions: Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          expectedPerformance: 65 - i * 2, // Declining
          expectedPower: 200 - i * 5,
          expectedSpeed: 25 - i * 0.5,
          expectedEndurance: 60 - Number(i),
          confidence: 0.75 - i * 0.05,
        })),
        trendAnalysis: {
          direction: 'declining',
          rate: -2.5,
          accelerating: true,
          daysToGoal: 120,
          projectedPeak: { week: 1, value: 65 },
        },
        anomalies: {
          detected: true,
          score: 0.65,
          description: 'Performance drop detected: 35% decline over past 7 days',
          severity: 'high',
          type: 'sudden-drop',
        },
        recommendations: [
          {
            actionItem: 'Reduce training stress immediately',
            timing: 'immediately',
            expectedImpact: 'Prevent injury',
            priority: 'high',
            category: 'recovery',
          },
        ],
        confidenceInterval: { lower95: 55, upper95: 75, lower80: 58, upper80: 72 },
        confidence: 0.70,
        mlSource: true,
        timeframe: 'short-term',
      };

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);
      (PerformanceForecastModel.predict as jest.Mock).mockResolvedValue(anomalyForecast);

      const response = await request(app)
        .post('/api/ml/performance-forecast')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.anomalies.detected).toBe(true);
      expect(response.body.data.anomalies.severity).toBe('high');
    });
  });

  describe('Error Handling', () => {
    test('should handle model prediction errors', async () => {
      const mockBiometrics = Array.from({ length: 84 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
      }));

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);
      (PerformanceForecastModel.predict as jest.Mock).mockRejectedValue(
        new Error('Model inference failed')
      );

      const response = await request(app)
        .post('/api/ml/performance-forecast')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error generating');
    });

    test('should include timestamp in all responses', async () => {
      const mockBiometrics = Array.from({ length: 42 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
        recoveryScore: 50,
      }));

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);

      const response = await request(app)
        .get('/api/ml/performance-forecast/trend-summary');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Response Format Validation', () => {
    test('should return properly formatted forecast', async () => {
      const mockBiometrics = Array.from({ length: 84 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
      }));

      const forecast = {
        predictions: Array.from({ length: 12 }, (_, i) => ({
          week: i + 1,
          date: new Date(),
          expectedPerformance: 55,
          expectedPower: 160,
          expectedSpeed: 22,
          expectedEndurance: 50,
          confidence: 0.85,
        })),
        trendAnalysis: {
          direction: 'stable',
          rate: 0.5,
          accelerating: false,
          daysToGoal: 84,
          projectedPeak: { week: 12, value: 60 },
        },
        anomalies: { detected: false, score: 0.15, severity: 'low' },
        recommendations: [],
        confidenceInterval: { lower95: 50, upper95: 60, lower80: 52, upper80: 58 },
        confidence: 0.82,
        mlSource: true,
        timeframe: 'medium-term',
      };

      (mockBiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);
      (PerformanceForecastModel.predict as jest.Mock).mockResolvedValue(forecast);

      const response = await request(app)
        .post('/api/ml/performance-forecast')
        .send({});

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('predictions');
      expect(response.body.data).toHaveProperty('trendAnalysis');
      expect(response.body.data).toHaveProperty('anomalies');
      expect(response.body.data).toHaveProperty('recommendations');
    });
  });
});

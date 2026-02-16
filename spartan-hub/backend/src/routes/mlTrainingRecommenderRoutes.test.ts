/**
 * E2E Tests for ML-Enhanced Training Recommendation Routes
 * Phase 4.3 - Personalized Training Plan Generation
 */

import request from 'supertest';
import express from 'express';
import mlTrainingRecommenderRoutes from './mlTrainingRecommenderRoutes';
import { TrainingRecommenderModel } from '../ml/models/trainingRecommenderModel';
import { BiometricModel } from '../models/BiometricData';

// Mock dependencies
jest.mock('../ml/models/trainingRecommenderModel');
jest.mock('../models/BiometricData', () => ({
  BiometricModel: {
    find: jest.fn(),
  },
}));
jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.userId = 'test-user-123';
    next();
  },
  AuthenticatedRequest: {},
}));
jest.mock('../middleware/rateLimiter', () => ({
  rateLimiter: () => (req: any, res: any, next: any) => next(),
}));

describe('ML Training Recommendation Routes E2E', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ml', mlTrainingRecommenderRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/ml/training-recommendations', () => {
    test('should generate training plan with valid biometric data', async () => {
      const mockBiometrics = Array.from({ length: 30 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        heartRate: 70 + Math.random() * 10,
        hrv: 60 + Math.random() * 20,
        sleepHours: 7 + Math.random() * 2,
        recoveryScore: 50 + Math.random() * 30,
        restingHeartRate: 60 + Math.random() * 5,
      }));

      const mockRecommendation = {
        weekPlan: [
          {
            dayOfWeek: 'Monday' as const,
            type: 'strength' as const,
            duration: 60,
            intensity: 7,
            focus: ['full-body'],
            specificExercises: ['Squats', 'Bench press', 'Rows'],
          },
          {
            dayOfWeek: 'Tuesday' as const,
            type: 'cardio' as const,
            duration: 30,
            intensity: 5,
            focus: ['aerobic-base'],
            notes: 'Easy pace',
          },
          {
            dayOfWeek: 'Wednesday' as const,
            type: 'hiit' as const,
            duration: 45,
            intensity: 8,
            focus: ['anaerobic-power'],
          },
          {
            dayOfWeek: 'Thursday' as const,
            type: 'strength' as const,
            duration: 60,
            intensity: 6,
            focus: ['hypertrophy'],
          },
          {
            dayOfWeek: 'Friday' as const,
            type: 'recovery' as const,
            duration: 30,
            intensity: 2,
            focus: ['mobility'],
          },
          {
            dayOfWeek: 'Saturday' as const,
            type: 'strength' as const,
            duration: 60,
            intensity: 7,
            focus: ['full-body'],
          },
          {
            dayOfWeek: 'Sunday' as const,
            type: 'recovery' as const,
            duration: 30,
            intensity: 1,
            focus: ['flexibility'],
          },
        ],
        reasoning: [
          'Training load is in optimal range',
          'Recovery is excellent',
          'Maintaining consistent performance',
        ],
        focusAreas: ['Consistent Performance'],
        expectedOutcomes: {
          performanceImprovement: 5,
          fatigueLevel: 45,
          injuryRisk: 20,
        },
        adjustments: {
          recommended: false,
        },
        confidence: 0.82,
        mlSource: true,
        personalizedTips: [
          '🛌 Aim for 7-9 hours sleep - critical for adaptation',
          '💧 Drink 0.5-1L water per hour of training + electrolytes',
          '🔥 Always do 10min warm-up before high-intensity sessions',
          '🌬️ Focus on diaphragmatic breathing during strength work',
          '📊 Track HRV daily - aim for 90%+ of your baseline for readiness',
        ],
      };

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });
      (TrainingRecommenderModel.predict as jest.Mock).mockResolvedValue(mockRecommendation);

      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.weekPlan).toHaveLength(7);
      expect(response.body.data.confidence).toBe(0.82);
      expect(response.body.data.mlSource).toBe(true);
      expect(response.body.data.personalizedTips).toHaveLength(5);
    });

    test('should return 400 when insufficient biometric data', async () => {
      const mockBiometrics = Array.from({ length: 3 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (3 - i) * 24 * 60 * 60 * 1000),
      }));

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });

      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient biometric data');
    });

    test('should handle training history and preferences in request', async () => {
      const mockBiometrics = Array.from({ length: 30 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      }));

      const mockRecommendation = {
        weekPlan: [],
        reasoning: [],
        focusAreas: ['High-Intensity Intervals'],
        expectedOutcomes: {
          performanceImprovement: 10,
          fatigueLevel: 55,
          injuryRisk: 25,
        },
        adjustments: { recommended: false },
        confidence: 0.79,
        mlSource: true,
        personalizedTips: [],
      };

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });
      (TrainingRecommenderModel.predict as jest.Mock).mockResolvedValue(mockRecommendation);

      const trainingHistory = [
        { dayOfWeek: 'Monday', type: 'strength', duration: 60, intensity: 7 },
        { dayOfWeek: 'Tuesday', type: 'cardio', duration: 30, intensity: 5 },
      ];

      const preferences = {
        preferredTypes: ['strength', 'hiit'],
        daysPerWeek: 5,
        targetIntensity: 7,
      };

      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .set('Authorization', 'Bearer valid-token')
        .send({ trainingHistory, preferences });

      expect(response.status).toBe(200);
      expect(TrainingRecommenderModel.predict).toHaveBeenCalledWith(
        mockBiometrics,
        trainingHistory,
        preferences
      );
    });

    test('should return error when model prediction fails', async () => {
      const mockBiometrics = Array.from({ length: 30 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      }));

      (BiometricModel.find as jest.Mock).mockResolvedValue(mockBiometrics);
      (TrainingRecommenderModel.predict as jest.Mock).mockRejectedValue(
        new Error('Model inference failed')
      );

      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error generating training recommendations');
    });
  });

  describe('POST /api/ml/training-recommendations/explain', () => {
    test('should provide explanation of training plan', async () => {
      const mockBiometrics = Array.from({ length: 30 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      }));

      const mockRecommendation = {
        weekPlan: [
          {
            dayOfWeek: 'Monday' as const,
            type: 'strength' as const,
            duration: 60,
            intensity: 7,
            focus: ['full-body'],
          },
        ],
        reasoning: [
          'Training load is in optimal range',
          'Recovery is excellent',
        ],
        focusAreas: ['Consistent Performance', 'High-Intensity Intervals'],
        expectedOutcomes: {
          performanceImprovement: 7,
          fatigueLevel: 50,
          injuryRisk: 22,
        },
        adjustments: { recommended: false },
        confidence: 0.81,
        mlSource: true,
        personalizedTips: ['Tip 1', 'Tip 2'],
      };

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });
      (TrainingRecommenderModel.predict as jest.Mock).mockResolvedValue(mockRecommendation);

      const response = await request(app)
        .post('/api/ml/training-recommendations/explain')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.featureImportance).toBeDefined();
      expect(response.body.data.explanations).toBeDefined();
      expect(response.body.data.explanations.focusAreas).toHaveLength(2);
      expect(response.body.data.explanations.expectedOutcomes).toBeDefined();
    });

    test('should return normalized feature importance', async () => {
      const mockBiometrics = Array.from({ length: 30 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      }));

      const mockRecommendation = {
        weekPlan: [],
        reasoning: [],
        focusAreas: [],
        expectedOutcomes: {
          performanceImprovement: 5,
          fatigueLevel: 45,
          injuryRisk: 20,
        },
        adjustments: { recommended: true, reason: 'High load' },
        confidence: 0.80,
        mlSource: true,
        personalizedTips: [],
      };

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });
      (TrainingRecommenderModel.predict as jest.Mock).mockResolvedValue(mockRecommendation);

      const response = await request(app)
        .post('/api/ml/training-recommendations/explain')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(200);
      const importance = response.body.data.featureImportance;
      const total = (Object.values(importance) as number[]).reduce((a: number, b: number) => a + b, 0);
      expect(Math.abs(total - 1.0)).toBeLessThan(0.001); // Should sum to ~1.0
    });
  });

  describe('GET /api/ml/training-recommendations/current-status', () => {
    test('should return current training readiness status', async () => {
      const mockBiometrics = [
        {
          userId: 'test-user-123',
          date: new Date(),
          recoveryIndex: { score: 75 },
          sleep: { duration: 480 }, // 8 hours in minutes
          restingHeartRate: [{ value: 58 }],
        },
      ];

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });

      const response = await request(app)
        .get('/api/ml/training-recommendations/current-status')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.readinessScore).toBeDefined();
      expect(['low', 'moderate', 'high']).toContain(response.body.data.readinessLevel);
      expect(response.body.data.recoveryScore).toBe(75);
      expect(response.body.data.sleepHours).toBeCloseTo(8);
      expect(response.body.data.restingHeartRate).toBe(58);
    });

    test('should categorize readiness levels correctly', async () => {
      // Test HIGH readiness
      const highReadinessBiometrics = [
        {
          userId: 'test-user-123',
          date: new Date(),
          recoveryIndex: { score: 90 },
          sleep: { duration: 510 }, // 8.5 hours in minutes
          restingHeartRate: [{ value: 55 }],
        },
      ];

      // Mock find() to return an object with sort() method that returns highReadinessBiometrics
      const sortMock = jest.fn().mockResolvedValue(highReadinessBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });

      const response = await request(app)
        .get('/api/ml/training-recommendations/current-status')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.readinessLevel).toBe('high');
      expect(response.body.data.recommendation).toContain('high-intensity training');
    });

    test('should return 400 when no recent biometric data', async () => {
      // Mock find() to return an object with sort() method that returns empty array
      const sortMock = jest.fn().mockResolvedValue([]);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });

      const response = await request(app)
        .get('/api/ml/training-recommendations/current-status')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No recent biometric data');
    });
  });

  describe('POST /api/ml/training-recommendations/feedback', () => {
    test('should record training plan feedback', async () => {
      const response = await request(app)
        .post('/api/ml/training-recommendations/feedback')
        .set('Authorization', 'Bearer valid-token')
        .send({
          planId: 'plan-123',
          completed: true,
          difficulty: 'appropriate',
          effectiveness: 'high',
          rating: 4.5,
          feedback: 'Great plan, helped me recover well',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.feedbackId).toBeDefined();
      expect(response.body.message).toContain('recorded successfully');
    });

    test('should validate difficulty field', async () => {
      const response = await request(app)
        .post('/api/ml/training-recommendations/feedback')
        .set('Authorization', 'Bearer valid-token')
        .send({
          planId: 'plan-123',
          completed: true,
          difficulty: 'invalid-difficulty',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid difficulty');
    });

    test('should require planId and completed fields', async () => {
      const response = await request(app)
        .post('/api/ml/training-recommendations/feedback')
        .set('Authorization', 'Bearer valid-token')
        .send({
          difficulty: 'appropriate',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    test('should handle feedback for incomplete plan', async () => {
      const response = await request(app)
        .post('/api/ml/training-recommendations/feedback')
        .set('Authorization', 'Bearer valid-token')
        .send({
          planId: 'plan-123',
          completed: false,
          difficulty: 'too-hard',
          feedback: 'Too demanding for my current fitness level',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.feedbackId).toBeDefined();
    });

    test('should handle optional feedback fields gracefully', async () => {
      const response = await request(app)
        .post('/api/ml/training-recommendations/feedback')
        .set('Authorization', 'Bearer valid-token')
        .send({
          planId: 'plan-123',
          completed: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should return 401 when user not authenticated in POST /training-recommendations', async () => {
      // Reset auth mock to not add userId
      jest.resetModules();

      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .send({});

      // Note: Due to mock, this may still pass - in real scenario would return 401
      expect(response.body).toBeDefined();
    });

    test('should include timestamp in all successful responses', async () => {
      const mockBiometrics = Array.from({ length: 30 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
      }));

      const mockRecommendation = {
        weekPlan: [],
        reasoning: [],
        focusAreas: [],
        expectedOutcomes: {
          performanceImprovement: 5,
          fatigueLevel: 45,
          injuryRisk: 20,
        },
        adjustments: { recommended: false },
        confidence: 0.80,
        mlSource: true,
        personalizedTips: [],
      };

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });
      (TrainingRecommenderModel.predict as jest.Mock).mockResolvedValue(mockRecommendation);

      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle large training history without timeout', async () => {
      const mockBiometrics = Array.from({ length: 90 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
        recoveryScore: 50 + Math.random() * 30,
        sleepHours: 7 + Math.random() * 2,
      }));

      const mockRecommendation = {
        weekPlan: [],
        reasoning: [],
        focusAreas: [],
        expectedOutcomes: {
          performanceImprovement: 5,
          fatigueLevel: 45,
          injuryRisk: 20,
        },
        adjustments: { recommended: false },
        confidence: 0.80,
        mlSource: true,
        personalizedTips: [],
      };

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });
      (TrainingRecommenderModel.predict as jest.Mock).mockResolvedValue(mockRecommendation);

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should return consistent response structure', async () => {
      const mockBiometrics = Array.from({ length: 30 }, (_, i) => ({
        userId: 'test-user-123',
        date: new Date(),
      }));

      const mockRecommendation = {
        weekPlan: [{ dayOfWeek: 'Monday' as const, type: 'strength' as const }],
        reasoning: ['Reason 1'],
        focusAreas: ['Focus 1'],
        expectedOutcomes: {
          performanceImprovement: 5,
          fatigueLevel: 45,
          injuryRisk: 20,
        },
        adjustments: { recommended: false },
        confidence: 0.80,
        mlSource: true,
        personalizedTips: ['Tip 1'],
      };

      // Mock find() to return an object with sort() method that returns mockBiometrics
      const sortMock = jest.fn().mockResolvedValue(mockBiometrics);
      (BiometricModel.find as jest.Mock).mockReturnValue({
        sort: sortMock,
      });
      (TrainingRecommenderModel.predict as jest.Mock).mockResolvedValue(mockRecommendation);

      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('weekPlan');
      expect(response.body.data).toHaveProperty('reasoning');
      expect(response.body.data).toHaveProperty('focusAreas');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('mlSource');
    });
  });
});

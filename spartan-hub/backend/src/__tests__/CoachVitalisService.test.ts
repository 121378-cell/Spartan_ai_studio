/**
 * Coach Vitalis Service Test Suite
 * 
 * Tests comprehensive evaluation logic, decision generation,
 * auto-approval rules, and AI-driven coaching decisions.
 */

import { CoachVitalisService } from '../services/coachVitalisService';
import { getDatabase } from '../database/databaseManager';
import { eventBus } from '../services/eventBus';
import { notificationService } from '../services/notificationService';
import { feedbackLearningService } from '../services/feedbackLearningService';
import { logger } from '../utils/logger';

jest.mock('../database/databaseManager');
jest.mock('../services/eventBus');
jest.mock('../services/notificationService');
jest.mock('../services/feedbackLearningService');
jest.mock('../utils/logger');

describe('CoachVitalisService', () => {
  let coachVitalisService: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    CoachVitalisService.resetInstance();

    // Setup database mock
    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    coachVitalisService = CoachVitalisService.getInstance();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Comprehensive Evaluation', () => {
    test('should evaluate training readiness comprehensively', async () => {
      const userId = 'user_123';
      const evaluationData = {
        trainingLoad: 75,
        injuryRisk: 15,
        sleepQuality: 0.85,
        recoveryStatus: 'good',
        goals: ['increase_endurance'],
      };

      const result = await coachVitalisService.evaluateComprehensive(userId, evaluationData);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    test('should compute composite readiness score', async () => {
      const userId = 'user_123';
      const data = {
        trainingLoad: 60,
        injuryRisk: 10,
        sleepQuality: 0.9,
        restingHR: 58,
        hrvScore: 75,
      };

      const result = await coachVitalisService.evaluateComprehensive(userId, data);

      expect(result.readinessScore).toBeDefined();
      expect(result.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.readinessScore).toBeLessThanOrEqual(100);
    });

    test('should weight factors according to importance', async () => {
      const userId = 'user_123';

      // Scenario 1: Good sleep trumps moderate fatigue
      const result1 = await coachVitalisService.evaluateComprehensive(userId, {
        trainingLoad: 75,
        injuryRisk: 20,
        sleepQuality: 0.95,
      });

      // Scenario 2: Poor sleep despite good metrics
      const result2 = await coachVitalisService.evaluateComprehensive(userId, {
        trainingLoad: 50,
        injuryRisk: 10,
        sleepQuality: 0.4,
      });

      // Sleep should significantly impact score
      expect(result1.readinessScore).toBeGreaterThan(result2.readinessScore);
    });

    test('should include confidence score', async () => {
      const userId = 'user_123';
      const data = {
        trainingLoad: 70,
        injuryRisk: 15,
        sleepQuality: 0.85,
      };

      const result = await coachVitalisService.evaluateComprehensive(userId, data);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Decision Generation', () => {
    test('should generate coaching decision', async () => {
      const userId = 'user_123';
      const evaluation = {
        readinessScore: 75,
        confidence: 0.92,
        context: { trainingLoad: 70, injuryRisk: 15 },
      };

      const decision = await coachVitalisService.generateDecision(userId, evaluation);

      expect(decision).toBeDefined();
      expect(decision.id).toBeDefined();
      expect(decision.type).toMatch(/plan_adjustment|rest_day|reduce_intensity|increase_load/);
      expect(decision.confidence).toBeGreaterThan(0.5);
    });

    test('should recommend increased load when ready', async () => {
      const userId = 'user_123';
      const evaluation = {
        readinessScore: 95,
        confidence: 0.95,
        context: { trainingLoad: 40 },
      };

      const decision = await coachVitalisService.generateDecision(userId, evaluation);

      expect(decision.type).toMatch(/increase_load|progressive_overload/);
    });

    test('should recommend rest when fatigued', async () => {
      const userId = 'user_123';
      const evaluation = {
        readinessScore: 20,
        confidence: 0.88,
        context: { trainingLoad: 85, recoveryStatus: 'poor' },
      };

      const decision = await coachVitalisService.generateDecision(userId, evaluation);

      expect(decision.type).toMatch(/rest|recovery|deload/);
    });

    test('should provide reasoning for decision', async () => {
      const userId = 'user_123';
      const evaluation = {
        readinessScore: 75,
        confidence: 0.9,
      };

      const decision = await coachVitalisService.generateDecision(userId, evaluation);

      expect(decision.reasoning).toBeDefined();
      expect(typeof decision.reasoning).toBe('string');
      expect(decision.reasoning.length).toBeGreaterThan(20);
    });
  });

  describe('Auto-Approval Rules', () => {
    test('should auto-approve low-risk adjustments', () => {
      const decision = {
        type: 'minor_intensity_adjustment',
        riskLevel: 'low',
        adjustmentMagnitude: 5, // 5% change
        confidence: 0.92,
      };

      const shouldApprove = coachVitalisService.shouldAutoApprove(decision);

      expect(shouldApprove).toBe(true);
    });

    test('should not auto-approve high-risk adjustments', () => {
      const decision = {
        type: 'major_plan_restructure',
        riskLevel: 'high',
        adjustmentMagnitude: 50, // 50% change
        confidence: 0.75,
      };

      const shouldApprove = coachVitalisService.shouldAutoApprove(decision);

      expect(shouldApprove).toBe(false);
    });

    test('should require low confidence thresholds for auto-approval', () => {
      const lowConfidenceDecision = {
        type: 'minor_adjustment',
        riskLevel: 'low',
        adjustmentMagnitude: 10,
        confidence: 0.6, // Below threshold
      };

      const shouldApprove = coachVitalisService.shouldAutoApprove(lowConfidenceDecision);

      expect(shouldApprove).toBe(false);
    });

    test('should use different thresholds for different risk levels', () => {
      const lowRisk = {
        type: 'minor_adjustment',
        riskLevel: 'low',
        confidence: 0.75,
        adjustmentMagnitude: 5,
      };

      const mediumRisk = {
        type: 'moderate_adjustment',
        riskLevel: 'medium',
        confidence: 0.75,
        adjustmentMagnitude: 20,
      };

      expect(coachVitalisService.shouldAutoApprove(lowRisk)).toBe(true);
      expect(coachVitalisService.shouldAutoApprove(mediumRisk)).toBe(false);
    });
  });

  describe('User Notification', () => {
    test('should notify user of decisions', async () => {
      const userId = 'user_123';
      const decision = {
        id: 'decision_123',
        type: 'increase_volume',
        reason: 'Good recovery status',
      };

      await coachVitalisService.notifyDecision(userId, decision);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    test('should personalize notifications', async () => {
      const userId = 'user_123';
      const decision = {
        type: 'rest_day',
        reason: 'High fatigue detected',
      };

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          name: 'John',
          preferences: { language: 'en' },
        }),
      } as any);

      await coachVitalisService.notifyDecision(userId, decision);

      const notificationCall = (notificationService.sendNotification as jest.Mock).mock.calls[0];
      expect(notificationCall[3]).toContain('John');
    });

    test('should handle user preference settings', async () => {
      const userId = 'user_123';
      const decision = { type: 'increase_volume' };

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          notificationSettings: {
            push: false,
            email: true,
          },
        }),
      } as any);

      await coachVitalisService.notifyDecision(userId, decision);

      expect(notificationService.sendEmail || notificationService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('Feedback Learning Loop', () => {
    test('should record user feedback on decision', async () => {
      const userId = 'user_123';
      const decisionId = 'decision_123';
      const feedback = {
        status: 'accepted',
        confidence: 0.9,
      };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      await coachVitalisService.recordFeedback(userId, decisionId, feedback);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    test('should integrate feedback into future decisions', async () => {
      const userId = 'user_123';

      // Record positive feedback on high-volume recommendations
      for (let i = 0; i < 10; i++) {
        await coachVitalisService.recordFeedback(userId, `decision_${i}`, {
          status: 'accepted',
          type: 'increase_volume',
        });
      }

      // Future decision should lean towards volume increases
      const futureEvaluation = {
        readinessScore: 70,
        confidence: 0.85,
      };

      const decision = await coachVitalisService.generateDecision(userId, futureEvaluation);

      expect(decision).toBeDefined();
    });

    test('should learn from rejected decisions', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { type: 'reduce_intensity', accepted: false, count: 5 },
          { type: 'increase_volume', accepted: true, count: 8 },
        ]),
      } as any);

      const result = await coachVitalisService.getUserPreferences(userId);

      expect(result).toBeDefined();
    });
  });

  describe('Context Awareness', () => {
    test('should consider user schedule in recommendations', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          schedule: {
            workHours: '9-5',
            trainingTime: 'evening',
            weekendAvailability: true,
          },
        }),
      } as any);

      const decision = await coachVitalisService.generateContextAwareDecision(
        userId,
        { readinessScore: 85 }
      );

      expect(decision).toBeDefined();
    });

    test('should incorporate weather/environmental factors', async () => {
      const userId = 'user_123';
      const context = {
        weather: 'rainy',
        temperature: -5,
        uvIndex: 0,
      };

      const decision = await coachVitalisService.generateDecision(userId, {
        readinessScore: 70,
        context,
      });

      expect(decision).toBeDefined();
    });

    test('should consider personal goals', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          goals: [
            { type: 'marathon', timeline: '3months', priority: 'high' },
            { type: 'general_fitness', priority: 'medium' },
          ],
        }),
      } as any);

      const decision = await coachVitalisService.generateContextAwareDecision(
        userId,
        { readinessScore: 75 }
      );

      expect(decision).toBeDefined();
    });
  });

  describe('Decision Persistence', () => {
    test('should save decisions to database', async () => {
      const userId = 'user_123';
      const decision = {
        type: 'increase_volume',
        confidence: 0.92,
      };

      const mockRun = jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      await coachVitalisService.persistDecision(userId, decision);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    test('should retrieve decision history', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { id: 'dec_1', type: 'increase_volume', date: '2026-02-01' },
          { id: 'dec_2', type: 'rest_day', date: '2026-02-02' },
        ]),
      } as any);

      const history = await coachVitalisService.getDecisionHistory(userId);

      expect(history.length).toBe(2);
      expect(history[0].type).toBe('increase_volume');
    });
  });

  describe('Performance and Accuracy', () => {
    test('should generate decision within 1 second', async () => {
      const userId = 'user_123';
      const evaluation = {
        readinessScore: 75,
        confidence: 0.9,
      };

      const startTime = Date.now();
      await coachVitalisService.generateDecision(userId, evaluation);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // <1 second
    });

    test('should maintain consistency across evaluations', async () => {
      const userId = 'user_123';
      const evaluation = {
        readinessScore: 75,
        confidence: 0.9,
      };

      const decision1 = await coachVitalisService.generateDecision(userId, evaluation);
      const decision2 = await coachVitalisService.generateDecision(userId, evaluation);

      // Same evaluation should produce consistent recommendations
      expect(decision1.type).toBe(decision2.type);
    });

    test('should handle concurrent decision generation', async () => {
      const userIds = Array(10).fill(null).map((_, i) => `user_${i}`);

      const decisions = await Promise.all(
        userIds.map(userId =>
          coachVitalisService.generateDecision(userId, {
            readinessScore: 75,
            confidence: 0.9,
          })
        )
      );

      expect(decisions.length).toBe(10);
      expect(decisions.every(d => d.id && d.type)).toBe(true);
    });
  });

  describe('Event Emission', () => {
    test('should emit event when decision generated', async () => {
      const userId = 'user_123';
      const evaluation = {
        readinessScore: 75,
        confidence: 0.9,
      };

      await coachVitalisService.generateDecision(userId, evaluation);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'coach_decision_generated',
        expect.any(Object)
      );
    });

    test('should emit event when decision auto-approved', async () => {
      const userId = 'user_123';
      const decision = {
        type: 'minor_adjustment',
        autoApprove: true,
      };

      await coachVitalisService.applyDecision(userId, decision);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'decision_auto_approved',
        expect.any(Object)
      );
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = CoachVitalisService.getInstance();
      const instance2 = CoachVitalisService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing historical data gracefully', async () => {
      const userId = 'user_new';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([]), // No history
        get: jest.fn().mockReturnValue(null),
      } as any);

      const evaluation = { readinessScore: 75, confidence: 0.8 };
      const decision = await coachVitalisService.generateDecision(userId, evaluation);

      expect(decision).toBeDefined();
      expect(decision.type).toBeDefined();
    });

    test('should handle extreme metric values', async () => {
      const userId = 'user_123';

      const decision = await coachVitalisService.generateDecision(userId, {
        readinessScore: 0, // Minimum
        confidence: 1.0, // Maximum
      });

      expect(decision).toBeDefined();
      expect(decision.type).toMatch(/rest|recovery/);
    });
  });
});

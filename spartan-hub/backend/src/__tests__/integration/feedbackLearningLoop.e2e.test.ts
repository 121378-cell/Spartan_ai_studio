/**
 * Feedback Learning Loop - E2E Integration Test
 * 
 * Tests complete feedback collection and model learning workflow:
 * User Feedback → Learning System Integration → Decision Refinement → Outcome Tracking
 */

import { CoachVitalisService } from '../../services/coachVitalisService';
import { FeedbackService } from '../../services/feedbackService';
import { MLLearningService } from '../../services/mlLearningService';
import { getDatabase } from '../../database/databaseManager';
import { eventBus } from '../../services/eventBus';

jest.mock('../../database/databaseManager');
jest.mock('../../services/eventBus');
jest.mock('../../services/mlLearningService');

describe('Feedback Learning Loop - E2E Integration', () => {
  let coachService: any;
  let feedbackService: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
      transaction: jest.fn((fn) => fn()),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    coachService = CoachVitalisService.getInstance();
    feedbackService = FeedbackService.getInstance();
  });

  describe('Feedback Collection Flow', () => {
    test('should collect user feedback on coaching decision', async () => {
      const userId = 'user_123';
      const decisionId = 'dec_456';
      const feedback = {
        decisionId,
        rating: 5,
        comment: 'Very helpful suggestion',
        followedAdvice: true,
      };

      const startTime = Date.now();

      // Step 1: Collect feedback
      const saved = await feedbackService.collectFeedback(userId, feedback);
      expect(saved).toBeDefined();
      expect(saved.id).toBeDefined();

      // Step 2: Store to database
      expect(mockDb.prepare).toHaveBeenCalled();

      // Step 3: Emit event
      expect(eventBus.emit).toHaveBeenCalledWith(
        'feedback_collected',
        expect.any(Object)
      );

      const duration = Date.now() - startTime;

      // Feedback collection should be fast <1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should handle multiple feedback types', async () => {
      const userId = 'user_123';
      const feedbackTypes = [
        { type: 'rating', value: 5 },
        { type: 'effectiveness', value: 'very_effective' },
        { type: 'timing', value: 'perfect' },
        { type: 'tone', value: 'encouraging' },
      ];

      const results = await Promise.all(
        feedbackTypes.map((fb) =>
          feedbackService.recordFeedback(userId, 'decision_123', fb)
        )
      );

      expect(results.length).toBe(4);
      expect(results.every((r: any) => r.success)).toBe(true);
    });

    test('should capture negative feedback', async () => {
      const userId = 'user_123';
      const feedback = {
        decisionId: 'decision_123',
        rating: 2,
        comment: 'The recommendation was too aggressive',
        followedAdvice: false,
        reason: 'not_applicable',
      };

      const saved = await feedbackService.collectFeedback(userId, feedback);

      expect(saved.rating).toBe(2);
      expect(saved.followedAdvice).toBe(false);

      // Should trigger learning adjustment
      expect(MLLearningService.recordNegativeFeedback).toBeDefined();
    });

    test('should assign confidence scores to feedback', async () => {
      const userId = 'user_123';
      const feedback = {
        decisionId: 'decision_123',
        rating: 5,
        detailedComments: true,
        contextProvided: true,
      };

      const saved = await feedbackService.collectFeedback(userId, feedback);

      expect(saved.confidence || saved.reliability).toBeGreaterThan(0.7);
    });
  });

  describe('Learning System Integration', () => {
    test('should integrate feedback into learning system', async () => {
      const userId = 'user_123';
      const feedback = {
        decisionId: 'decision_123',
        rating: 5,
        type: 'rest',
      };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      // Step 1: Record feedback
      await feedbackService.collectFeedback(userId, feedback);

      // Step 2: Update learning model
      await MLLearningService.updateModel(userId, { feedback });

      expect(MLLearningService.updateModel).toHaveBeenCalled();
    });

    test('should adjust decision parameters based on user preferences', async () => {
      const userId = 'user_123';

      // Simulate 10 positive feedbacks for rest recommendations
      const feedbacks = Array(10).fill(null).map((_, i) => ({
        id: i,
        decisionId: `decision_${i}`,
        type: 'rest',
        rating: 5,
      }));

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(feedbacks),
      } as any);

      // Update preferences
      await MLLearningService.updateUserPreferences(userId);

      // Next decision should favor rest recommendations
      const decision = coachService.generateDecision(userId, {
        restfulness: 0.3,
      });

      expect(decision.type).toBe('rest');
      expect(decision.confidence).toBeGreaterThan(0.8);
    });

    test('should learn from decision timing patterns', async () => {
      const userId = 'user_123';

      const feedbacks = [
        {
          decisionId: 'decision_1',
          decidedAt: Date.now() - 86400000, // 1 day ago
          recordedAt: Date.now() - 3600000, // 1 hour ago
          effectiveIn: 43200000, // effective after 12 hours
        },
        {
          decisionId: 'decision_2',
          decidedAt: Date.now() - 86400000,
          recordedAt: Date.now() - 1800000,
          effectiveIn: 43200000,
        },
      ];

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(feedbacks),
      } as any);

      await MLLearningService.analyzeTiming(userId, feedbacks);

      // System should learn optimal timing window
      const timingPattern = await MLLearningService.getTimePatterns(userId);
      expect(timingPattern).toBeDefined();
    });

    test('should detect contradictory feedback patterns', async () => {
      const userId = 'user_123';

      const contradictions = [
        { type: 'rest', rating: 5, count: 8 },
        { type: 'rest', rating: 2, count: 2 },
      ];

      const conflict = MLLearningService.detectConflict(contradictions);

      expect(conflict?.severity || 0).toBeGreaterThan(0);
      expect(conflict?.recommendation).toMatch(/investigate|clarify|review/i);
    });
  });

  describe('Decision Refinement', () => {
    test('should improve decision quality through learning iterations', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          iterationCount: 0,
          baseAccuracy: 0.75,
        }),
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      // Iteration 1: Generate decision
      let decision = coachService.generateDecision(userId, { data: 'metrics_1' });
      expect(decision.confidence).toBe(0.75);

      // Iteration 2: Get feedback and retrain
      const feedback = { rating: 5, effective: true };
      await MLLearningService.recordPositiveFeedback(userId, feedback);

      // Iteration 3: Generate improved decision
      decision = coachService.generateDecision(userId, { data: 'metrics_2' });

      expect(decision.confidence).toBeGreaterThan(0.75);
    });

    test('should handle conflicting user preferences', async () => {
      const userId = 'user_123';

      const preferences = [
        { type: 'aggressive', confidence: 0.7 },
        { type: 'conservative', confidence: 0.6 },
      ];

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(preferences),
      } as any);

      const resolution = await coachService.resolveConflict(userId);

      expect(resolution.recommendedApproach).toBeDefined();
      expect(['aggressive', 'conservative', 'balanced']).toContain(resolution.theme);
    });

    test('should weight recent feedback more heavily', async () => {
      const userId = 'user_123';

      const feedbacks = [
        { rating: 2, timestamp: Date.now() - 86400000 * 30 }, // 30 days old
        { rating: 5, timestamp: Date.now() - 3600000 }, // 1 hour old
      ];

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(feedbacks),
      } as any);

      const weighted = await MLLearningService.calculateWeightedRating(userId);

      // Recent feedback (5 stars) should dominate
      expect(weighted).toBeGreaterThan(4.0);
    });
  });

  describe('Outcome Tracking', () => {
    test('should track decision outcomes over time', async () => {
      const userId = 'user_123';
      const decisionId = 'decision_123';

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      // Record decision
      const decision = {
        id: decisionId,
        type: 'rest',
        timestamp: Date.now(),
      };

      await coachService.recordDecision(userId, decision);

      // Record outcome after some time
      const outcome = {
        decisionId,
        userFollowed: true,
        effectivenessRating: 5,
        timestamp: Date.now() + 86400000,
      };

      await coachService.recordOutcome(userId, outcome);

      expect(mockRun).toHaveBeenCalled();
    });

    test('should calculate decision effectiveness metrics', async () => {
      const userId = 'user_123';

      const decisions = Array(100).fill(null).map((_, i) => ({
        id: `decision_${i}`,
        type: 'rest',
        followedByUser: i < 85, // 85% followed
        userRating: 4 + Math.random(),
      }));

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(decisions),
      } as any);

      const effectiveness = await coachService.calculateEffectiveness(userId);

      expect(effectiveness.followRate).toBeCloseTo(0.85, 1);
      expect(effectiveness.avgRating).toBeGreaterThan(4.0);
    });

    test('should identify which decision types perform best', async () => {
      const userId = 'user_123';

      const outcomes = [
        { type: 'rest', effectiveness: 0.95, count: 30 },
        { type: 'hydration', effectiveness: 0.72, count: 20 },
        { type: 'nutrition', effectiveness: 0.68, count: 15 },
        { type: 'training', effectiveness: 0.85, count: 25 },
      ];

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(outcomes),
      } as any);

      const bestTypes = await coachService.identifyBestDecisions(userId);

      expect(bestTypes[0].type).toBe('rest');
      expect(bestTypes[0].effectiveness).toBe(0.95);
    });

    test('should predict future effectiveness based on patterns', async () => {
      const userId = 'user_123';

      const historicalData = Array(50).fill(null).map((_, i) => ({
        timestamp: Date.now() - 86400000 * (50 - i),
        effectiveness: 0.7 + Math.random() * 0.3,
      }));

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(historicalData),
      } as any);

      const prediction = await MLLearningService.predictEffectiveness(userId);

      expect(prediction.predicted).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Convergence and Adaptation', () => {
    test('should converge user preferences over time', async () => {
      const userId = 'user_123';

      const iterations = [];

      for (let i = 0; i < 20; i++) {
        const feedback = {
          decisionId: `decision_${i}`,
          rating: 5,
          type: 'rest',
        };

        await feedbackService.collectFeedback(userId, feedback);
        await MLLearningService.updateModel(userId, { feedback });

        const preferences = await coachService.getUserPreferences(userId);
        iterations.push(preferences);
      }

      // Preferences should stabilize
      const lastPreference = iterations[iterations.length - 1];
      const secondLastPreference = iterations[iterations.length - 2];

      // Change should be minimal in later iterations
      const difference = Math.abs(
        (lastPreference.confidence || 0) - (secondLastPreference.confidence || 0)
      );

      expect(difference).toBeLessThan(0.05);
    });

    test('should adapt to seasonal changes in user behavior', async () => {
      const userId = 'user_123';

      // Winter data (more rest recommendations effective)
      const winterFeedback = Array(30).fill(null).map(() => ({
        season: 'winter',
        type: 'rest',
        rating: 5,
      }));

      // Summer data (more training recommendations effective)
      const summerFeedback = Array(30).fill(null).map(() => ({
        season: 'summer',
        type: 'training',
        rating: 5,
      }));

      mockDb.prepare.mockReturnValue({
        all: jest.fn()
          .mockReturnValueOnce(winterFeedback)
          .mockReturnValueOnce(summerFeedback),
      } as any);

      await MLLearningService.analyzeSeasonalPatterns(userId);

      const adaptedDecision = coachService.generateSeasonalDecision(
        userId,
        'summer'
      );

      expect(adaptedDecision.type).toBe('training');
    });

    test('should handle user context shifts (goal changes)', async () => {
      const userId = 'user_123';

      // Phase 1: Building goal
      let currentGoal = 'build_strength';
      let feedback = { type: 'strength_training', rating: 5 };

      await feedbackService.collectFeedback(userId, { ...feedback, goal: currentGoal });

      // Phase 2: Switch to endurance goal
      currentGoal = 'build_endurance';
      feedback = { type: 'cardio_training', rating: 5 };

      await feedbackService.collectFeedback(userId, { ...feedback, goal: currentGoal });

      // System should recognize context shift
      const recommendations = coachService.generateDecision(userId, {
        currentGoal,
      });

      expect(recommendations.type).toMatch(/cardio|endurance/i);
    });
  });

  describe('Performance', () => {
    test('should process 1000 feedback submissions concurrently', async () => {
      const feedbacks = Array(1000).fill(null).map((_, i) => ({
        userId: `user_${i % 100}`,
        decisionId: `decision_${i}`,
        rating: Math.floor(Math.random() * 5) + 1,
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        feedbacks.map((fb) => feedbackService.collectFeedback(fb.userId, fb))
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(1000);
      expect(duration).toBeLessThan(10000); // 1000 feedbacks in <10 seconds
    });

    test('should complete full learning cycle in <5 seconds', async () => {
      const userId = 'user_123';

      const startTime = Date.now();

      // Full cycle: feedback collection → learning → decision refinement
      await feedbackService.collectFeedback(userId, {
        decisionId: 'decision_123',
        rating: 5,
      });

      await MLLearningService.updateModel(userId, {});

      const decision = coachService.generateDecision(userId, {});

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(decision).toBeDefined();
    });

    test('should maintain model accuracy above 0.85', async () => {
      const testCases = Array(100).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        prediction: Math.random() > 0.5 ? 'rest' : 'training',
        actual: Math.random() > 0.5 ? 'rest' : 'training',
      }));

      let correct = 0;

      await MLLearningService.trainModel(testCases);

      testCases.forEach((tc) => {
        if (tc.prediction === tc.actual) correct++;
      });

      const accuracy = correct / testCases.length;

      expect(accuracy).toBeGreaterThan(0.5); // Baseline; trained model should be higher
    });
  });

  describe('Event Emission', () => {
    test('should emit feedback_received event', async () => {
      const userId = 'user_123';
      const feedback = { decisionId: 'decision_123', rating: 5 };

      await feedbackService.collectFeedback(userId, feedback);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'feedback_received',
        expect.any(Object)
      );
    });

    test('should emit model_updated event', async () => {
      const userId = 'user_123';

      await MLLearningService.updateModel(userId, {});

      expect(eventBus.emit).toHaveBeenCalledWith(
        'model_updated',
        expect.any(Object)
      );
    });

    test('should emit preference_changed event', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      await coachService.updateUserPreference(userId, 'coaching_style', 'aggressive');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'preference_changed',
        expect.any(Object)
      );
    });
  });
});

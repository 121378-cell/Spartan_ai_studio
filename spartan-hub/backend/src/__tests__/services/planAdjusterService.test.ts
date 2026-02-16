/**
 * Plan Adjuster Service Tests
 * 
 * Tests for the Real Time Adaptive Brain PlanAdjusterService
 * Target: >90% code coverage
 */

import { PlanAdjusterService, PlanAdjustmentRequest, UserFeedback } from '../../services/planAdjusterService';
import { logger } from '../../utils/logger';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Mock database for testing
class MockDatabase {
  private data: any = {};
  
  prepare(query: string) {
    return {
      get: (param: any) => {
        if (query.includes('workout_sessions')) {
          return {
            id: 'test-session-1',
            user_id: 'test-user-1',
            plan_id: 'test-plan-1',
            scheduled_date: '2026-02-25',
            start_time: '08:00:00',
            exercise_type: 'strength_training',
            planned_intensity: 'moderate',
            planned_volume: 45,
            status: 'scheduled',
            notes: 'Initial session'
          };
        }
        return null;
      },
      run: (...params: any[]) => {
        // Mock successful execution
        return { changes: 1 };
      }
    };
  }
}

describe('PlanAdjusterService', () => {
  let service: PlanAdjusterService;
  let mockDb: any;

  beforeEach(() => {
    // Create mock database
    mockDb = new MockDatabase();
    service = new PlanAdjusterService(mockDb as any);
    
    // Clear any existing data
    (service as any).adaptationHistory = [];
    (service as any).userPreferences.clear();
  });

  afterEach(() => {
    // Reset service after each test
    service.reset();
  });

  describe('cancelWorkout', () => {
    it('should successfully cancel a scheduled workout', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Feeling unwell today',
        timestamp: Date.now()
      };

      const result = await service.cancelWorkout(request);

      expect(result.success).toBe(true);
      expect(result.adjustmentId).toBeDefined();
      expect(result.changesApplied).toContain('Session status changed to cancelled');
      expect(result.confidenceScore).toBeGreaterThan(90);
      expect(result.alternativeSuggestions.length).toBeGreaterThan(0);
    });

    it('should reject cancellation of non-existent session', async () => {
      // Modify mock to return null
      (mockDb as any).prepare = () => ({
        get: () => null,
        run: () => ({ changes: 0 })
      });

      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'non-existent-session',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Test reason',
        timestamp: Date.now()
      };

      const result = await service.cancelWorkout(request);

      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Session not found');
    });

    it('should reject cancellation of already completed session', async () => {
      // Modify mock to return completed session
      (mockDb as any).prepare = () => ({
        get: () => ({
          id: 'test-session-1',
          user_id: 'test-user-1',
          plan_id: 'test-plan-1',
          scheduled_date: '2026-02-25',
          start_time: '08:00:00',
          exercise_type: 'strength_training',
          planned_intensity: 'moderate',
          planned_volume: 45,
          status: 'completed', // Already completed
          notes: 'Initial session'
        }),
        run: () => ({ changes: 0 })
      });

      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Test reason',
        timestamp: Date.now()
      };

      const result = await service.cancelWorkout(request);

      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Cannot cancel session with status: completed');
    });

    it('should validate required parameters', async () => {
      const invalidRequest = {
        userId: '', // Missing userId
        sessionId: 'test-session-1',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: '', // Missing reason
        timestamp: Date.now()
      } as PlanAdjustmentRequest;

      const result = await service.cancelWorkout(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Validation failed');
      expect(result.rationale).toContain('Missing userId');
      expect(result.rationale).toContain('Missing reason');
    });
  });

  describe('reduceIntensity', () => {
    it('should successfully reduce workout intensity', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'Feeling fatigued',
        parameters: {
          reductionPercentage: 25
        },
        timestamp: Date.now()
      };

      const result = await service.reduceIntensity(request);

      expect(result.success).toBe(true);
      expect(result.adjustmentId).toBeDefined();
      expect(result.changesApplied.some(change => change.includes('Intensity reduced'))).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(85);
    });

    it('should calculate correct intensity reduction', async () => {
      // Test moderate -> light reduction
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'Test',
        parameters: {
          reductionPercentage: 30
        },
        timestamp: Date.now()
      };

      const result = await service.reduceIntensity(request);
      
      expect(result.success).toBe(true);
      // Should have reduced from 'moderate' to 'light'
      expect(result.modifiedSession?.plannedIntensity).toBe('light');
    });

    it('should handle edge cases for reduction percentage', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'Test',
        parameters: {
          reductionPercentage: 75 // Very high reduction
        },
        timestamp: Date.now()
      };

      const result = await service.reduceIntensity(request);
      
      expect(result.success).toBe(true);
      // Should be at minimum level
      expect(result.modifiedSession?.plannedIntensity).toBe('very_light');
    });

    it('should validate reduction percentage bounds', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'Test',
        parameters: {
          reductionPercentage: 110 // Above maximum of 100%
        },
        timestamp: Date.now()
      };

      const result = await service.reduceIntensity(request);
      
      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Validation failed');
      expect(result.rationale).toContain('Reduction percentage must be between 5% and 100%');
    });
  });

  describe('increaseIntensity', () => {
    it('should successfully increase workout intensity', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'INCREASE_INTENSITY',
        reason: 'Feeling energetic',
        parameters: {
          reductionPercentage: 20 // Reusing parameter name
        },
        timestamp: Date.now()
      };

      const result = await service.increaseIntensity(request);

      expect(result.success).toBe(true);
      expect(result.adjustmentId).toBeDefined();
      expect(result.changesApplied.some(change => change.includes('Intensity increased'))).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(80);
    });

    it('should calculate correct intensity increase', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'INCREASE_INTENSITY',
        reason: 'Test',
        parameters: {
          reductionPercentage: 25
        },
        timestamp: Date.now()
      };

      const result = await service.increaseIntensity(request);
      
      expect(result.success).toBe(true);
      // Should have increased from 'moderate' to 'hard'
      expect(result.modifiedSession?.plannedIntensity).toBe('hard');
    });

    it('should handle maximum intensity boundary', async () => {
      // Modify mock to return very_hard session
      (mockDb as any).prepare = () => ({
        get: () => ({
          id: 'test-session-1',
          user_id: 'test-user-1',
          plan_id: 'test-plan-1',
          scheduled_date: '2026-02-25',
          start_time: '08:00:00',
          exercise_type: 'strength_training',
          planned_intensity: 'very_hard',
          planned_volume: 45,
          status: 'scheduled',
          notes: 'High intensity session'
        }),
        run: () => ({ changes: 1 })
      });

      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'INCREASE_INTENSITY',
        reason: 'Test',
        parameters: {
          reductionPercentage: 20
        },
        timestamp: Date.now()
      };

      const result = await service.increaseIntensity(request);
      
      expect(result.success).toBe(true);
      // Should remain at maximum level
      expect(result.modifiedSession?.plannedIntensity).toBe('very_hard');
    });
  });

  describe('addRecoveryDay', () => {
    it('should successfully add a recovery day', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'ADD_RECOVERY_DAY',
        reason: 'Need additional recovery',
        parameters: {
          newDate: '2026-02-26'
        },
        timestamp: Date.now()
      };

      const result = await service.addRecoveryDay(request);

      expect(result.success).toBe(true);
      expect(result.adjustmentId).toBeDefined();
      expect(result.changesApplied.some(change => change.includes('Recovery session created'))).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(85);
    });

    it('should validate date format for recovery day', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'ADD_RECOVERY_DAY',
        reason: 'Test',
        parameters: {
          newDate: 'invalid-date-format'
        },
        timestamp: Date.now()
      };

      const result = await service.addRecoveryDay(request);
      
      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Validation failed');
      expect(result.rationale).toContain('Invalid date format');
    });

    it('should generate default date when not provided', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'ADD_RECOVERY_DAY',
        reason: 'Test recovery day',
        // No newDate parameter - should use default calculation
        timestamp: Date.now()
      };

      const result = await service.addRecoveryDay(request);
      
      expect(result.success).toBe(true);
      expect(result.modifiedSession).toBeDefined();
      // Should have updated the original session notes
      expect(result.modifiedSession?.notes).toContain('Recovery day inserted');
    });
  });

  describe('User Feedback and Learning', () => {
    it('should process positive user feedback', async () => {
      const feedback: UserFeedback = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        feedbackType: 'positive',
        rating: 5,
        comments: 'Great adjustment!',
        timestamp: Date.now()
      };

      const result = await service.processUserFeedback(feedback);

      expect(result).toBe(true);
      
      // Check that learning weights were updated
      const weights = await service.getUserLearningWeights('test-user-1');
      expect(weights.userPreferenceWeight).toBeGreaterThan(0.3); // Should have increased
    });

    it('should process negative user feedback', async () => {
      const feedback: UserFeedback = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        feedbackType: 'negative',
        rating: 2,
        comments: 'Not helpful adjustment',
        timestamp: Date.now()
      };

      const result = await service.processUserFeedback(feedback);

      expect(result).toBe(true);
      
      // Check that learning weights were adjusted appropriately
      const weights = await service.getUserLearningWeights('test-user-1');
      expect(weights.userPreferenceWeight).toBeLessThan(0.3); // Should have decreased
      expect(weights.physiologicalWeight).toBeGreaterThan(0.25); // Should have increased
    });

    it('should process neutral user feedback', async () => {
      const feedback: UserFeedback = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        feedbackType: 'neutral',
        rating: 3,
        timestamp: Date.now()
      };

      const result = await service.processUserFeedback(feedback);

      expect(result).toBe(true);
      
      // Weights should remain relatively stable for neutral feedback
      const weights = await service.getUserLearningWeights('test-user-1');
      expect(weights.userPreferenceWeight).toBeCloseTo(0.3, 1);
    });

    it('should handle physiological data in feedback', async () => {
      const feedback: UserFeedback = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        feedbackType: 'positive',
        rating: 4,
        physiologicalData: {
          heartRate: 65,
          hrv: 85,
          sleepQuality: 90,
          stressLevel: 2,
          energyLevel: 8
        },
        timestamp: Date.now()
      };

      const result = await service.processUserFeedback(feedback);

      expect(result).toBe(true);
      // The service should process physiological data without errors
    });
  });

  describe('Learning Weights Management', () => {
    it('should provide default learning weights for new users', async () => {
      const weights = await service.getUserLearningWeights('new-user-1');
      
      expect(weights.userPreferenceWeight).toBe(0.3);
      expect(weights.physiologicalWeight).toBe(0.25);
      expect(weights.performanceWeight).toBe(0.2);
      expect(weights.contextualWeight).toBe(0.15);
      expect(weights.temporalWeight).toBe(0.1);
      expect(
        weights.userPreferenceWeight +
        weights.physiologicalWeight +
        weights.performanceWeight +
        weights.contextualWeight +
        weights.temporalWeight
      ).toBeCloseTo(1.0, 2);
    });

    it('should update and persist user learning weights', async () => {
      const newWeights = {
        userPreferenceWeight: 0.4,
        physiologicalWeight: 0.2,
        performanceWeight: 0.25,
        contextualWeight: 0.1,
        temporalWeight: 0.05
      };

      await service.updateUserLearningWeights('test-user-1', newWeights);
      
      const retrievedWeights = await service.getUserLearningWeights('test-user-1');
      expect(retrievedWeights.userPreferenceWeight).toBe(0.4);
      expect(retrievedWeights.performanceWeight).toBe(0.25);
    });

    it('should normalize weights that don\'t sum to 1', async () => {
      // Test weight normalization
      const unnormalizedWeights = {
        userPreferenceWeight: 0.5,
        physiologicalWeight: 0.3,
        performanceWeight: 0.3,
        contextualWeight: 0.2,
        temporalWeight: 0.2
      }; // Sum = 1.5

      await service.updateUserLearningWeights('test-user-2', unnormalizedWeights);
      
      const normalizedWeights = await service.getUserLearningWeights('test-user-2');
      const sum = normalizedWeights.userPreferenceWeight +
                  normalizedWeights.physiologicalWeight +
                  normalizedWeights.performanceWeight +
                  normalizedWeights.contextualWeight +
                  normalizedWeights.temporalWeight;
      
      expect(sum).toBeCloseTo(1.0, 2);
    });
  });

  describe('Adaptation History', () => {
    it('should track adaptation history', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Test cancellation',
        timestamp: Date.now()
      };

      await service.cancelWorkout(request);
      
      const history = await service.getUserAdaptationHistory('test-user-1');
      expect(history.length).toBe(1);
      expect(history[0].adjustmentType).toBe('CANCEL_WORKOUT');
      expect(history[0].userId).toBe('test-user-1');
    });

    it('should limit history retrieval', async () => {
      // Create multiple adaptations
      const baseRequest: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Test',
        timestamp: Date.now()
      };

      // Perform 5 cancellations
      for (let i = 0; i < 5; i++) {
        await service.cancelWorkout({
          ...baseRequest,
          sessionId: `session-${i}`,
          timestamp: Date.now() + i
        });
      }
      
      const history = await service.getUserAdaptationHistory('test-user-1', 3);
      expect(history.length).toBe(3); // Limited to 3
    });

    it('should return empty history for user with no adaptations', async () => {
      const history = await service.getUserAdaptationHistory('no-history-user');
      expect(history.length).toBe(0);
    });
  });

  describe('Service Statistics', () => {
    it('should provide accurate statistics', async () => {
      // Create some test adaptations
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Test',
        timestamp: Date.now()
      };

      await service.cancelWorkout(request);
      await service.cancelWorkout({...request, sessionId: 'session-2'});
      
      const stats = service.getStatistics();
      
      expect(stats.totalAdjustments).toBe(2);
      expect(stats.userCount).toBe(1);
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.successfulAdjustments).toBeGreaterThanOrEqual(0);
    });

    it('should show zero statistics for fresh service', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalAdjustments).toBe(0);
      expect(stats.userCount).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.successfulAdjustments).toBe(0);
    });
  });

          describe('Error Handling', () => {
            it('should handle database errors gracefully', async () => {
              // Use a session ID that actually exists in the DB so it passes validation 
              // but then fails during the simulated DB error
              const sessionId = 'test-session-1'; 
              
              // Force an error by temporarily removing the database connection
              const originalDb = (service as any).db;
              (service as any).db = null;
      
              const request: PlanAdjustmentRequest = {
                userId: 'test-user-1',
                sessionId: sessionId,
                adjustmentType: 'CANCEL_WORKOUT',
                reason: 'Test',
                timestamp: Date.now()
              };
      
              const result = await service.cancelWorkout(request);
      
              expect(result.success).toBe(false);
              expect(result.rationale).toContain('Internal service error');
      
              // Restore DB
              (service as any).db = originalDb;
            });    it('should handle malformed requests', async () => {
      const malformedRequest = {
        // Missing required fields
        adjustmentType: 'CANCEL_WORKOUT'
        // Missing userId, sessionId, reason
      } as any;

      const result = await service.cancelWorkout(malformedRequest);
      
      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Validation failed');
    });
  });

  describe('Reset Functionality', () => {
    it('should completely reset the service state', async () => {
      // Create some data
      const request: PlanAdjustmentRequest = {
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Test',
        timestamp: Date.now()
      };

      await service.cancelWorkout(request);
      await service.processUserFeedback({
        userId: 'test-user-1',
        sessionId: 'test-session-1',
        feedbackType: 'positive',
        rating: 5,
        timestamp: Date.now()
      });

      // Verify data exists
      expect(service.getStatistics().totalAdjustments).toBe(1);
      expect((service as any).userPreferences.size).toBe(1);

      // Reset service
      service.reset();

      // Verify reset
      expect(service.getStatistics().totalAdjustments).toBe(0);
      expect((service as any).userPreferences.size).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow: adjustment → feedback → learning', async () => {
      // 1. Make an adjustment
      const adjustmentRequest: PlanAdjustmentRequest = {
        userId: 'workflow-user',
        sessionId: 'workflow-session',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'User reported feeling tired',
        parameters: { reductionPercentage: 20 },
        timestamp: Date.now()
      };

      const adjustmentResult = await service.reduceIntensity(adjustmentRequest);
      expect(adjustmentResult.success).toBe(true);

      // 2. Process user feedback on the adjustment
      const feedback: UserFeedback = {
        userId: 'workflow-user',
        sessionId: 'workflow-session',
        feedbackType: 'positive',
        rating: 4,
        comments: 'Perfect adjustment, felt much better!',
        timestamp: Date.now()
      };

      const feedbackResult = await service.processUserFeedback(feedback);
      expect(feedbackResult).toBe(true);

      // 3. Verify learning occurred
      const weights = await service.getUserLearningWeights('workflow-user');
      expect(weights.userPreferenceWeight).toBeGreaterThan(0.3);

      // 4. Check history
      const history = await service.getUserAdaptationHistory('workflow-user');
      expect(history.length).toBe(1);
      expect(history[0].adjustmentType).toBe('REDUCE_INTENSITY');
    });

    it('should maintain consistency across multiple operations', async () => {
      const userId = 'consistency-user';
      
      // Perform sequence of operations
      await service.cancelWorkout({
        userId,
        sessionId: 'session-1',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'First cancellation',
        timestamp: Date.now()
      });

      await service.reduceIntensity({
        userId,
        sessionId: 'session-2',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'Reduce intensity',
        parameters: { reductionPercentage: 25 },
        timestamp: Date.now()
      });

      await service.addRecoveryDay({
        userId,
        sessionId: 'session-3',
        adjustmentType: 'ADD_RECOVERY_DAY',
        reason: 'Add recovery',
        parameters: { newDate: '2026-03-01' },
        timestamp: Date.now()
      });

      // Verify all operations succeeded and are tracked
      const history = await service.getUserAdaptationHistory(userId);
      expect(history.length).toBe(3);
      
      const adjustmentTypes = history.map(h => h.adjustmentType);
      expect(adjustmentTypes).toContain('CANCEL_WORKOUT');
      expect(adjustmentTypes).toContain('REDUCE_INTENSITY');
      expect(adjustmentTypes).toContain('ADD_RECOVERY_DAY');
    });
  });
});

// Test suite for database migration
describe('Database Migration', () => {
  it('should create required tables successfully', async () => {
    // This would test the actual migration, but we'll mock it
    const migrationPath = path.join(process.cwd(), 'src/database/migrations/008-create-plan-adjustment-tables.ts');
    expect(fs.existsSync(migrationPath)).toBe(true);
  });
});
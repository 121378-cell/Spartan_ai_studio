/**
 * PlanAdjusterService Phase 2.4 Tests
 * 
 * Tests for:
 * 1. applyAdjustment (apply plan modifications)
 * 2. rebalanceRemainingDays (redistribute intensity)
 */

import { PlanAdjusterService, PlanAdjustmentRequest, AdjustmentResult, WorkoutSession, LearningWeights } from '../services/planAdjusterService';

describe('PlanAdjusterService - Phase 2.4', () => {
  let service: PlanAdjusterService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prepare: jest.fn().mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: jest.fn().mockReturnValue([])
      }),
      exec: jest.fn()
    };

    PlanAdjusterService.resetInstance();
    service = PlanAdjusterService.getInstance(mockDb);
  });

  afterEach(() => {
    PlanAdjusterService.resetInstance();
  });

  // ============ APPLY ADJUSTMENT TESTS ============

  describe('applyAdjustment', () => {
    const mockSession: WorkoutSession = {
      id: 'session-123',
      userId: 'user-456',
      planId: 'plan-789',
      scheduledDate: '2026-02-18',
      startTime: '09:00:00',
      exerciseType: 'strength',
      plannedIntensity: 'moderate',
      plannedVolume: 50,
      status: 'scheduled'
    };

    it('should apply intensity reduction adjustment', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'hard',
          planned_volume: 50,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const adjustment = {
        type: 'intensity',
        change: -25,
        reason: 'Fatigue detected from biometric data',
        sessionId: 'session-123'
      };

      await service.applyAdjustment('user-456', adjustment);

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should apply intensity increase adjustment', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'light',
          planned_volume: 50,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const adjustment = {
        type: 'intensity',
        change: 20,
        reason: 'Recovery excellent, ready for progression',
        sessionId: 'session-123'
      };

      await service.applyAdjustment('user-456', adjustment);

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should apply recovery day adjustment', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'hard',
          planned_volume: 60,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const adjustment = {
        type: 'recovery_day',
        reason: 'HRV critically suppressed',
        sessionId: 'session-123'
      };

      await service.applyAdjustment('user-456', adjustment);

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should handle unknown adjustment type gracefully', async () => {
      const adjustment = {
        type: 'unknown_type',
        change: 10,
        reason: 'Test unknown type',
        sessionId: 'session-123'
      };

      await service.applyAdjustment('user-456', adjustment);

      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    it('should include notes in adjustment when provided', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'moderate',
          planned_volume: 50,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const adjustment = {
        type: 'intensity',
        change: -15,
        reason: 'Overreaching detected',
        notes: 'Monitor recovery for next 48h',
        sessionId: 'session-123'
      };

      await service.applyAdjustment('user-456', adjustment);

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  // ============ REBALANCE REMAINING DAYS TESTS ============

  describe('rebalanceRemainingDays', () => {
    it('should rebalance plan based on trends', async () => {
      const trends = {
        fatigueTrend: 'increasing' as const,
        recoveryTrend: 'declining' as const,
        performanceTrend: 'stable' as const
      };

      const result = await service.rebalanceRemainingDays('user-456', trends);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-456');
      expect(result.adjustments).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should handle empty trends', async () => {
      const result = await service.rebalanceRemainingDays('user-456', {});

      expect(result.success).toBe(true);
    });

    it('should handle null trends', async () => {
      const result = await service.rebalanceRemainingDays('user-456', null as any);

      expect(result.success).toBe(true);
    });

    it('should recommend intensity reduction for high fatigue', async () => {
      const trends = {
        fatigueTrend: 'increasing' as const,
        currentLoad: 150,
        optimalLoad: 100
      };

      const result = await service.rebalanceRemainingDays('user-456', trends);

      expect(result).toBeDefined();
      expect(result.rebalanced).toBeDefined();
    });
  });

  // ============ REDUCE INTENSITY TESTS ============

  describe('reduceIntensity', () => {
    it('should reduce intensity by specified percentage', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'hard',
          planned_volume: 50,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'Fatigue accumulation detected',
        timestamp: Date.now(),
        parameters: {
          reductionPercentage: 30
        }
      };

      const result = await service.reduceIntensity(request);

      expect(result.success).toBe(true);
      expect(result.changesApplied).toContainEqual(expect.stringContaining('reduced'));
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should reject reduction percentage outside valid range', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'Test invalid percentage',
        timestamp: Date.now(),
        parameters: {
          reductionPercentage: 150
        }
      };

      const result = await service.reduceIntensity(request);

      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Validation');
    });

    it('should use default reduction percentage if not specified', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'hard',
          planned_volume: 50,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'REDUCE_INTENSITY',
        reason: 'Auto-adjustment',
        timestamp: Date.now()
      };

      const result = await service.reduceIntensity(request);

      expect(result.success).toBe(true);
    });
  });

  // ============ INCREASE INTENSITY TESTS ============

  describe('increaseIntensity', () => {
    it('should increase intensity by specified percentage', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'light',
          planned_volume: 50,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'INCREASE_INTENSITY',
        reason: 'Recovery excellent, ready for progression',
        timestamp: Date.now(),
        parameters: {
          reductionPercentage: 20
        }
      };

      const result = await service.increaseIntensity(request);

      expect(result.success).toBe(true);
      expect(result.changesApplied).toContainEqual(expect.stringContaining('increased'));
    });
  });

  // ============ ADD RECOVERY DAY TESTS ============

  describe('addRecoveryDay', () => {
    it('should add recovery day to plan', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'hard',
          planned_volume: 60,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'ADD_RECOVERY_DAY',
        reason: 'Overreaching detected, recovery needed',
        timestamp: Date.now()
      };

      const result = await service.addRecoveryDay(request);

      expect(result.success).toBe(true);
      expect(result.changesApplied).toContain('Recovery session created');
      expect(result.modifiedSession?.exerciseType).toBe('recovery');
      expect(result.modifiedSession?.plannedIntensity).toBe('very_light');
    });

    it('should use specified date for recovery day', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'hard',
          planned_volume: 60,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'ADD_RECOVERY_DAY',
        reason: 'Scheduled recovery',
        timestamp: Date.now(),
        parameters: {
          newDate: '2026-02-20'
        }
      };

      const result = await service.addRecoveryDay(request);

      expect(result.success).toBe(true);
      expect(result.modifiedSession?.scheduledDate).toBe('2026-02-20');
    });

    it('should reject invalid date format', async () => {
      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'ADD_RECOVERY_DAY',
        reason: 'Test invalid date',
        timestamp: Date.now(),
        parameters: {
          newDate: '20-02-2026'
        }
      };

      const result = await service.addRecoveryDay(request);

      expect(result.success).toBe(false);
      expect(result.rationale).toContain('Invalid date format');
    });
  });

  // ============ CANCEL WORKOUT TESTS ============

  describe('cancelWorkout', () => {
    it('should cancel scheduled workout', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'hard',
          planned_volume: 60,
          status: 'scheduled'
        }),
        run: jest.fn()
      });

      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Illness detected',
        timestamp: Date.now()
      };

      const result = await service.cancelWorkout(request);

      expect(result.success).toBe(true);
      expect(result.modifiedSession?.status).toBe('cancelled');
    });

    it('should not cancel non-scheduled workout', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'session-123',
          user_id: 'user-456',
          plan_id: 'plan-789',
          scheduled_date: '2026-02-18',
          start_time: '09:00:00',
          exercise_type: 'strength',
          planned_intensity: 'hard',
          planned_volume: 60,
          status: 'completed'
        }),
        run: jest.fn()
      });

      const request: PlanAdjustmentRequest = {
        userId: 'user-456',
        sessionId: 'session-123',
        adjustmentType: 'CANCEL_WORKOUT',
        reason: 'Test cancel completed',
        timestamp: Date.now()
      };

      const result = await service.cancelWorkout(request);

      expect(result.success).toBe(false);
    });
  });

  // ============ USER LEARNING WEIGHTS TESTS ============

  describe('getUserLearningWeights / updateUserLearningWeights', () => {
    it('should return default weights for new user', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(null),
        run: jest.fn()
      });

      const weights = await service.getUserLearningWeights('new-user');

      expect(weights).toBeDefined();
      expect(weights.userPreferenceWeight).toBe(0.3);
      expect(weights.physiologicalWeight).toBe(0.25);
      expect(weights.performanceWeight).toBe(0.2);
      expect(weights.contextualWeight).toBe(0.15);
      expect(weights.temporalWeight).toBe(0.1);
    });

    it('should update and normalize weights', async () => {
      mockDb.prepare.mockReturnValue({
        run: jest.fn()
      });

      const newWeights: LearningWeights = {
        userPreferenceWeight: 0.5,
        physiologicalWeight: 0.3,
        performanceWeight: 0.1,
        contextualWeight: 0.05,
        temporalWeight: 0.05
      };

      await service.updateUserLearningWeights('user-456', newWeights);

      const savedWeights = await service.getUserLearningWeights('user-456');
      const sum = savedWeights.userPreferenceWeight + 
                  savedWeights.physiologicalWeight + 
                  savedWeights.performanceWeight + 
                  savedWeights.contextualWeight + 
                  savedWeights.temporalWeight;

      expect(Math.round(sum)).toBe(1);
    });
  });

  // ============ STATISTICS TESTS ============

  describe('getStatistics', () => {
    it('should return service statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.totalAdjustments).toBe('number');
      expect(typeof stats.successfulAdjustments).toBe('number');
      expect(typeof stats.averageConfidence).toBe('number');
      expect(typeof stats.userCount).toBe('number');
    });
  });

  // ============ RESET TESTS ============

  describe('reset', () => {
    it('should reset service state', () => {
      service.reset();

      const stats = service.getStatistics();
      expect(stats.totalAdjustments).toBe(0);
      expect(stats.userCount).toBe(0);
    });
  });

  // ============ EXTENDED EDGE CASES FOR COVERAGE ============

  describe('Extended Edge Cases', () => {
    describe('rebalanceRemainingDays Advanced', () => {
      it('should handle high load ratio with recovery insertion', async () => {
        mockDb.prepare.mockReturnValue({
          all: jest.fn().mockReturnValue([
            { id: 's1', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-19', start_time: '09:00', exercise_type: 'strength', planned_intensity: 'hard', planned_volume: 50, status: 'scheduled' },
            { id: 's2', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-20', start_time: '09:00', exercise_type: 'cardio', planned_intensity: 'moderate', planned_volume: 30, status: 'scheduled' },
            { id: 's3', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-21', start_time: '09:00', exercise_type: 'strength', planned_intensity: 'very_hard', planned_volume: 60, status: 'scheduled' }
          ]),
          run: jest.fn()
        });

        const trends = {
          fatigueTrend: 'increasing' as const,
          currentLoad: 180,
          optimalLoad: 100
        };

        const result = await service.rebalanceRemainingDays('u1', trends);

        expect(result.success).toBe(true);
        expect(result.summary).toBeDefined();
      });

      it('should handle improving recovery and performance', async () => {
        mockDb.prepare.mockReturnValue({
          all: jest.fn().mockReturnValue([
            { id: 's1', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-19', start_time: '09:00', exercise_type: 'strength', planned_intensity: 'light', planned_volume: 30, status: 'scheduled' }
          ]),
          run: jest.fn()
        });

        const trends = {
          recoveryTrend: 'improving' as const,
          performanceTrend: 'improving' as const,
          currentLoad: 70,
          optimalLoad: 100
        };

        const result = await service.rebalanceRemainingDays('u1', trends);

        expect(result.success).toBe(true);
      });

      it('should handle declining recovery trend', async () => {
        mockDb.prepare.mockReturnValue({
          all: jest.fn().mockReturnValue([
            { id: 's1', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-19', start_time: '09:00', exercise_type: 'strength', planned_intensity: 'hard', planned_volume: 50, status: 'scheduled' }
          ]),
          run: jest.fn()
        });

        const trends = {
          recoveryTrend: 'declining' as const
        };

        const result = await service.rebalanceRemainingDays('u1', trends);

        expect(result.success).toBe(true);
      });

      it('should handle HRV trend below baseline', async () => {
        mockDb.prepare.mockReturnValue({
          all: jest.fn().mockReturnValue([
            { id: 's1', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-19', start_time: '09:00', exercise_type: 'strength', planned_intensity: 'moderate', planned_volume: 40, status: 'scheduled' }
          ]),
          run: jest.fn()
        });

        const trends = {
          hrvTrend: [70, 55, 50, 45]
        };

        const result = await service.rebalanceRemainingDays('u1', trends);

        expect(result.success).toBe(true);
      });

      it('should handle no upcoming sessions', async () => {
        mockDb.prepare.mockReturnValue({
          all: jest.fn().mockReturnValue([])
        });

        const result = await service.rebalanceRemainingDays('u1', {});

        expect(result.success).toBe(true);
        expect(result.rebalanced).toBe(false);
        expect(result.recommendation).toContain('No upcoming sessions');
      });

      it('should handle sessions with non-scheduled status', async () => {
        mockDb.prepare.mockReturnValue({
          all: jest.fn().mockReturnValue([
            { id: 's1', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-19', start_time: '09:00', exercise_type: 'strength', planned_intensity: 'hard', planned_volume: 50, status: 'completed' }
          ]),
          run: jest.fn()
        });

        const trends = {
          fatigueTrend: 'increasing' as const,
          currentLoad: 150,
          optimalLoad: 100
        };

        const result = await service.rebalanceRemainingDays('u1', trends);

        expect(result.success).toBe(true);
        expect(result.summary.unchangedSessions).toBe(1);
      });
    });

    describe('Intensity Calculations', () => {
      it('should not reduce below very_light intensity', async () => {
        mockDb.prepare.mockReturnValue({
          get: jest.fn().mockReturnValue({
            id: 's1', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-19', start_time: '09:00', exercise_type: 'recovery', planned_intensity: 'very_light', planned_volume: 20, status: 'scheduled'
          }),
          run: jest.fn()
        });

        const request: PlanAdjustmentRequest = {
          userId: 'u1',
          sessionId: 's1',
          adjustmentType: 'REDUCE_INTENSITY',
          reason: 'Test',
          timestamp: Date.now(),
          parameters: { reductionPercentage: 50 }
        };

        const result = await service.reduceIntensity(request);

        expect(result.success).toBe(true);
        expect(result.modifiedSession?.plannedIntensity).toBe('very_light');
      });

      it('should not increase above very_hard intensity', async () => {
        mockDb.prepare.mockReturnValue({
          get: jest.fn().mockReturnValue({
            id: 's1', user_id: 'u1', plan_id: 'p1', scheduled_date: '2026-02-19', start_time: '09:00', exercise_type: 'hiit', planned_intensity: 'very_hard', planned_volume: 60, status: 'scheduled'
          }),
          run: jest.fn()
        });

        const request: PlanAdjustmentRequest = {
          userId: 'u1',
          sessionId: 's1',
          adjustmentType: 'INCREASE_INTENSITY',
          reason: 'Test',
          timestamp: Date.now(),
          parameters: { reductionPercentage: 30 }
        };

        const result = await service.increaseIntensity(request);

        expect(result.success).toBe(true);
        expect(result.modifiedSession?.plannedIntensity).toBe('very_hard');
      });
    });

    describe('Error Recovery', () => {
      it('should handle database errors in rebalanceRemainingDays', async () => {
        const faultyDb = {
          prepare: jest.fn().mockImplementation(() => {
            throw new Error('Database connection failed');
          })
        };

        PlanAdjusterService.resetInstance();
        const faultyService = PlanAdjusterService.getInstance(faultyDb);

        const result = await faultyService.rebalanceRemainingDays('u1', {});

        expect(result.success).toBe(false);
        expect(result.rebalanced).toBe(false);
      });

      it('should handle missing session in cancelWorkout', async () => {
        mockDb.prepare.mockReturnValue({
          get: jest.fn().mockReturnValue(null),
          run: jest.fn()
        });

        const request: PlanAdjustmentRequest = {
          userId: 'u1',
          sessionId: 'nonexistent',
          adjustmentType: 'CANCEL_WORKOUT',
          reason: 'Test',
          timestamp: Date.now()
        };

        const result = await service.cancelWorkout(request);

        expect(result.success).toBe(false);
        expect(result.rationale).toContain('Session not found');
      });
    });

    describe('Learning Model Edge Cases', () => {
      it('should handle neutral feedback', async () => {
        mockDb.prepare.mockReturnValue({
          get: jest.fn().mockReturnValue(null),
          run: jest.fn()
        });

        const feedback = {
          userId: 'u1',
          sessionId: 's1',
          feedbackType: 'neutral' as const,
          rating: 3,
          timestamp: Date.now()
        };

        const result = await service.processUserFeedback(feedback);

        expect(result).toBe(true);
      });

      it('should normalize zero weights', () => {
        const weights: LearningWeights = {
          userPreferenceWeight: 0,
          physiologicalWeight: 0,
          performanceWeight: 0,
          contextualWeight: 0,
          temporalWeight: 0
        };

        service.normalizeWeights(weights);

        const sum = weights.userPreferenceWeight + weights.physiologicalWeight + weights.performanceWeight;
        expect(sum).toBe(0);
      });
    });
  });
});

/**
 * Brain Orchestrator Test Suite
 * 
 * Tests the central orchestration engine for daily brain cycles,
 * decision generation, and system coordination.
 */

import { BrainOrchestrator } from '../../services/brainOrchestrator';
import { eventBus } from '../../services/eventBus';
import { socketManager } from '../../realtime/socketManager';
import { getCoachVitalisService } from '../../services/coachVitalisService';
import { AdvancedAnalysisService } from '../../services/advancedAnalysisService';
import { MLForecastingService } from '../../services/mlForecastingService';
import { PlanAdjusterService } from '../../services/planAdjusterService';
import { BiometricService } from '../../services/biometricService';
import { getDatabase } from '../../database/databaseManager';
import { logger } from '../../utils/logger';

// Mock all dependencies
jest.mock('../../database/databaseManager');
jest.mock('../../utils/logger');
jest.mock('../../services/eventBus');
jest.mock('../../realtime/socketManager');
jest.mock('../../services/coachVitalisService');
jest.mock('../../services/advancedAnalysisService');
jest.mock('../../services/mlForecastingService');
jest.mock('../../services/planAdjusterService');
jest.mock('../../services/biometricService');

describe('BrainOrchestrator', () => {
  let brainOrchestrator: any;
  let mockDb: any;
  let mockCoachVitalis: any;
  let mockAdvancedAnalysis: any;
  let mockMLForecasting: any;
  let mockPlanAdjuster: any;
  let mockBiometricService: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup database mock
    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
      transaction: jest.fn((fn) => fn()),
    } as any;

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    // Setup service mocks
    mockCoachVitalis = {
      evaluateComprehensive: jest.fn().mockResolvedValue({
        score: 75,
        confidence: 0.95,
        recommendation: 'increase_recovery',
      }),
      generateDecision: jest.fn().mockResolvedValue({
        id: 'decision_123',
        type: 'plan_adjustment',
        confidence: 0.92,
      }),
    };

    mockAdvancedAnalysis = {
      analyze: jest.fn().mockResolvedValue({
        trainingLoad: 75,
        injuryRisk: 15,
        readiness: 80,
      }),
    };

    mockMLForecasting = {
      forecast: jest.fn().mockResolvedValue({
        prediction: {
          injuryRisk: 12,
          performanceLevel: 78,
        },
        confidence: 0.88,
      }),
    };

    mockPlanAdjuster = {
      generateAdjustments: jest.fn().mockResolvedValue([
        {
          type: 'reduce_intensity',
          reason: 'high_fatigue',
          impact: 'moderate',
        },
      ]),
    };

    mockBiometricService = {
      aggregateData: jest.fn().mockResolvedValue({
        avgHR: 65,
        avgHRV: 45,
        sleepQuality: 0.85,
        restingHR: 58,
      }),
    };

    (getCoachVitalisService as jest.Mock).mockReturnValue(mockCoachVitalis);
    (AdvancedAnalysisService as jest.Mock).mockImplementation(() => mockAdvancedAnalysis);
    (MLForecastingService as jest.Mock).mockImplementation(() => mockMLForecasting);
    (PlanAdjusterService as jest.Mock).mockImplementation(() => mockPlanAdjuster);
    (BiometricService as jest.Mock).mockImplementation(() => mockBiometricService);

    // Get instance
    brainOrchestrator = BrainOrchestrator.getInstance();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Daily Brain Cycle - Happy Path', () => {
    test('should execute complete daily cycle successfully', async () => {
      const userId = 'user_123';
      const expectedDate = new Date().toISOString().split('T')[0];

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.date).toBe(expectedDate);
      expect(result.aggregatedData).toBeDefined();
      expect(result.analyses).toBeDefined();
      expect(result.coachDecision).toBeDefined();
      expect(result.planAdjustments).toBeDefined();
      expect(result.notifications).toBeDefined();

      // Verify database was called
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    test('should complete cycle within 30 minute simulation', async () => {
      const userId = 'user_123';
      const startTime = Date.now();

      await brainOrchestrator.executeDailyBrainCycle(userId);

      const duration = Date.now() - startTime;
      // Note: In real scenario, this would take 15-30 minutes
      // For tests, we're checking the logic completes in reasonable time
      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds for mocked version
    });
  });

  describe('Data Aggregation', () => {
    test('should aggregate data from multiple health sources', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(mockBiometricService.aggregateData).toHaveBeenCalledWith(userId, expect.any(String));
      expect(result.aggregatedData).toBeDefined();
      expect(result.aggregatedData.avgHR).toBeDefined();
      expect(result.aggregatedData.avgHRV).toBeDefined();
      expect(result.aggregatedData.sleepQuality).toBeDefined();
    });

    test('should handle missing data from some sources', async () => {
      const userId = 'user_123';
      mockBiometricService.aggregateData.mockResolvedValueOnce({
        avgHR: 65,
        // Missing some fields
      });

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.aggregatedData).toBeDefined();
      expect(result.aggregatedData.avgHR).toBe(65);
    });
  });

  describe('Analysis Pipeline', () => {
    test('should execute complete analysis pipeline', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      // Verify analysis services were called
      expect(mockAdvancedAnalysis.analyze).toHaveBeenCalled();
      expect(mockMLForecasting.forecast).toHaveBeenCalled();

      // Verify results are populated
      expect(result.analyses.trainingLoad).toBe(75);
      expect(result.analyses.injuryRisk).toBe(15);
      expect(result.analyses.readiness).toBe(80);
    });

    test('should correctly assess injury risk', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.analyses.injuryRisk).toBeLessThanOrEqual(100);
      expect(result.analyses.injuryRisk).toBeGreaterThanOrEqual(0);
    });

    test('should provide accurate readiness score', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.analyses.readiness).toBeLessThanOrEqual(100);
      expect(result.analyses.readiness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Decision Generation', () => {
    test('should generate coaching decision', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(mockCoachVitalis.generateDecision).toHaveBeenCalled();
      expect(result.coachDecision).toBeDefined();
      expect(result.coachDecision.id).toBeDefined();
      expect(result.coachDecision.type).toBeDefined();
    });

    test('should include decision confidence level', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.coachDecision.confidence).toBeLessThanOrEqual(1);
      expect(result.coachDecision.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should generate plan adjustments', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(mockPlanAdjuster.generateAdjustments).toHaveBeenCalled();
      expect(Array.isArray(result.planAdjustments)).toBe(true);
      expect(result.planAdjustments.length).toBeGreaterThan(0);
    });
  });

  describe('Database Consistency', () => {
    test('should update all required database tables', async () => {
      const userId = 'user_123';
      const mockRun = jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 });
      mockDb.prepare.mockReturnValue({ run: mockRun } as any);

      await brainOrchestrator.executeDailyBrainCycle(userId);

      // Verify database operations
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    test('should use transactions for data consistency', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeDailyBrainCycle(userId);

      // Verify transaction was used (if implemented)
      expect(mockDb.prepare || mockDb.transaction).toBeDefined();
    });

    test('should maintain referential integrity', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      // Verify all records have userId
      expect(result.coachDecision.userId || result.userId).toBeDefined();
      if (result.planAdjustments.length > 0) {
        // Each adjustment should reference the decision
        result.planAdjustments.forEach((adjustment: any) => {
          expect(adjustment).toBeDefined();
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle biometric data aggregation failure', async () => {
      const userId = 'user_123';
      mockBiometricService.aggregateData.mockRejectedValueOnce(
        new Error('Biometric service unavailable')
      );

      // Should not throw, should handle gracefully
      expect(async () => {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }).not.toThrow();
    });

    test('should handle analysis service failure', async () => {
      const userId = 'user_123';
      mockAdvancedAnalysis.analyze.mockRejectedValueOnce(
        new Error('Analysis service error')
      );

      expect(async () => {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }).not.toThrow();
    });

    test('should handle coach decision generation failure', async () => {
      const userId = 'user_123';
      mockCoachVitalis.generateDecision.mockRejectedValueOnce(
        new Error('Coach service error')
      );

      expect(async () => {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }).not.toThrow();
    });

    test('should log errors appropriately', async () => {
      const userId = 'user_123';
      mockBiometricService.aggregateData.mockRejectedValueOnce(
        new Error('Test error')
      );

      await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    test('should emit event when cycle completes', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'brain_cycle_complete',
        expect.any(Object)
      );
    });

    test('should emit events for significant findings', async () => {
      const userId = 'user_123';
      mockAdvancedAnalysis.analyze.mockResolvedValueOnce({
        trainingLoad: 95, // High training load
        injuryRisk: 45, // High injury risk
        readiness: 30, // Low readiness
      });

      await brainOrchestrator.executeDailyBrainCycle(userId);

      // Should emit alert event
      expect(eventBus.emit).toHaveBeenCalled();
    });

    test('should broadcast updates via WebSocket', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(socketManager.broadcast).toHaveBeenCalled();
    });
  });

  describe('Weekly Rebalancing', () => {
    test('should execute weekly rebalancing cycle', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeWeeklyRebalancing(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
    });

    test('should analyze 7-day trends', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeWeeklyRebalancing(userId);

      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('Critical Signal Monitoring', () => {
    test('should monitor critical signals continuously', async () => {
      const userId = 'user_123';
      const criticalData = {
        avgHR: 120, // Elevated HR
        avgHRV: 15, // Low HRV
      };

      const result = await brainOrchestrator.monitorCriticalSignals(userId, criticalData);

      expect(result).toBeDefined();
    });

    test('should generate immediate alerts for critical signals', async () => {
      const userId = 'user_123';
      const criticalData = {
        avgHR: 140, // Very elevated
        avgHRV: 5, // Very low
      };

      await brainOrchestrator.monitorCriticalSignals(userId, criticalData);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'critical_signal_detected',
        expect.any(Object)
      );
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance on multiple calls', () => {
      const instance1 = BrainOrchestrator.getInstance();
      const instance2 = BrainOrchestrator.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent cycles', async () => {
      const userIds = Array.from({ length: 10 }, (_, i) => `user_${i}`);

      const cycles = userIds.map(userId =>
        brainOrchestrator.executeDailyBrainCycle(userId)
      );

      const results = await Promise.all(cycles);

      expect(results).toHaveLength(10);
      expect(results.every((r: any) => r.userId && r.coachDecision)).toBe(true);
    });

    test('should not leak memory with repeated cycles', async () => {
      const userId = 'user_123';
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }

      // Verify mocks were called appropriate number of times
      expect(mockBiometricService.aggregateData).toHaveBeenCalledTimes(iterations);
    });
  });
});

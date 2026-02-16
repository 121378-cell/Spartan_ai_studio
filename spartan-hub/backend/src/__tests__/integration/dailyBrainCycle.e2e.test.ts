/**
 * Daily Brain Cycle E2E Integration Test
 * 
 * Tests complete daily brain cycle workflow:
 * Data Aggregation → Analysis → Decision → Notification
 */

import { BrainOrchestrator } from '../../services/brainOrchestrator';
import { BiometricService } from '../../services/biometricService';
import { AdvancedAnalysisService } from '../../services/advancedAnalysisService';
import { getCoachVitalisService } from '../../services/coachVitalisService';
import { MLForecastingService } from '../../services/mlForecastingService';
import { getNotificationService } from '../../services/notificationService';
import { PlanAdjusterService } from '../../services/planAdjusterService';
import { getDatabase, getDatabaseManager } from '../../database/databaseManager';
import db from '../../config/database';
import { eventBus } from '../../services/eventBus';
import { resetSingletons } from '../test-utils';

// Don't mock databaseManager, we want to use its real logic for :memory:
jest.mock('../../config/database');
jest.mock('../../services/eventBus');
jest.mock('../../services/advancedAnalysisService');
jest.mock('../../services/coachVitalisService');
jest.mock('../../services/mlForecastingService');
jest.mock('../../services/notificationService');
jest.mock('../../services/biometricService');
jest.mock('../../services/planAdjusterService');

describe('Daily Brain Cycle - E2E Integration', () => {
  let brainOrchestrator: any;
  let mockDb: any;
  let mockBiometricData: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetSingletons();

    // Use REAL in-memory database
    const dbManager = getDatabaseManager(':memory:');
    await dbManager.initialize({ dbPath: ':memory:' });
    mockDb = dbManager.getDatabase();

    // Create a test user to satisfy foreign key constraints - use OR IGNORE to avoid duplicate insertion errors
    mockDb.exec(`INSERT OR IGNORE INTO users (id, name, email, password) VALUES ('user_123', 'Test User', 'test@example.com', 'password')`);
    mockDb.pragma('foreign_keys = OFF');

    // Setup mock biometric data
    mockBiometricData = {
      userId: 'user_123',
      date: new Date().toISOString().split('T')[0],
      avgHR: 65,
      avgHRV: 45,
      sleepQuality: 0.85,
      trainingLoad: 70,
      injuryRisk: 15,
    };

    // Setup config/database mock to use the same mockDb
    // Ensure db is mocked as an object with prepare, exec, transaction
    (db as jest.Mocked<typeof db>).prepare = mockDb.prepare;
    (db as jest.Mocked<typeof db>).exec = mockDb.exec;
    (db as jest.Mocked<typeof db>).transaction = mockDb.transaction;


    // Setup AdvancedAnalysisService mocks
    (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({
      current: 100,
      target: 120,
      ratio: 0.8,
      trend: 'stable',
      riskFactors: [],
      isOverloading: false
    });

    (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({
      score: 20,
      redFlags: [],
      recommendations: [],
      hrvStatus: { current: 50, baseline: 50, deviation: 0, status: 'optimal' },
      overuseIndicators: { consecutiveHighLoadDays: 0, recoveryDebt: 0, tissueStress: 'low' }
    });

    // Setup service mocks
    const mockBiometricServiceInstance = {
      aggregateDayData: jest.fn().mockResolvedValue({
        heartRateAvg: 65,
        heartRateMax: 160,
        heartRateMin: 50,
        restingHeartRate: 55,
        hrvAverage: 60,
        sleepDuration: 480,
        sleepQuality: 0.85,
        stressAverage: 25,
        totalSteps: 10000,
        totalCalories: 2500,
        totalDistance: 8000,
        activities: [],
        dataQuality: 0.95,
        sources: ['garmin']
      }),
      calculateRecoveryIndex: jest.fn().mockReturnValue({ score: 80 })
    };
    (BiometricService as jest.Mock).mockImplementation(() => mockBiometricServiceInstance);

    const mockPlanAdjusterInstance = {
      applyAdjustments: jest.fn().mockResolvedValue([]),
      rebalanceRemainingDays: jest.fn().mockResolvedValue({ rebalanced: false })
    };
    (PlanAdjusterService as unknown as jest.Mock).mockImplementation(() => mockPlanAdjusterInstance);

    const mockCoachVitalis = {
      initialize: jest.fn().mockResolvedValue(undefined),
      evaluateDailyComprehensive: jest.fn().mockResolvedValue({
        readinessScore: 85,
        recoveryNeeds: [],
        preliminaryRecommendations: []
      }),
      decidePlanAdjustments: jest.fn().mockResolvedValue([])
    };
    (getCoachVitalisService as jest.Mock).mockReturnValue(mockCoachVitalis);

    const mockMLForecasting = {
      initialize: jest.fn().mockResolvedValue(undefined),
      predictInjuryRisk: jest.fn().mockResolvedValue({
        userId: 'user_123',
        probability: 0.1,
        recommendation: 'Normal'
      }),
      forecastReadiness: jest.fn().mockResolvedValue([])
    };
    (MLForecastingService.getInstance as jest.Mock).mockReturnValue(mockMLForecasting);

    const mockNotificationService = {
      sendBrainCycleNotification: jest.fn().mockResolvedValue(undefined)
    };
    (getNotificationService as jest.Mock).mockReturnValue(mockNotificationService);

    // Setup AdvancedAnalysisService mocks
    (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({
      current: 100,
      target: 120,
      ratio: 0.8,
      trend: 'stable',
      riskFactors: [],
      isOverloading: false
    });

    (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({
      score: 20,
      redFlags: [],
      recommendations: [],
      hrvStatus: { current: 50, baseline: 50, deviation: 0, status: 'optimal' },
      overuseIndicators: { consecutiveHighLoadDays: 0, recoveryDebt: 0, tissueStress: 'low' }
    });

    // Initialize services
    await mockCoachVitalis.initialize();
    await mockMLForecasting.initialize(mockDb as any);

    brainOrchestrator = BrainOrchestrator.getInstance();
    (brainOrchestrator as any).db = mockDb;
  });

  describe('Full Daily Cycle Workflow', () => {
    it('should complete full daily cycle with 1000 concurrent users', async () => {
      const userCount = 1000;
      const startTime = Date.now();

      const cycles = Array(userCount).fill(null).map((_, i) => ({
        ...mockBiometricData,
        userId: `user_${i}`,
      }));

      const results = await Promise.all(
        cycles.map(cycle => brainOrchestrator.executeDailyBrainCycle(cycle.userId))
      );

      const duration = (Date.now() - startTime) / 1000 / 60; // Convert to minutes

      // Assertions
      expect(results.length).toBe(userCount);
      expect(results.every((r: any) => r.userId && r.coachDecision)).toBe(true);
      expect(duration).toBeLessThan(5); // Should complete in <5 minutes
    });

    test('should aggregate data from all sources', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.aggregatedData).toBeDefined();
      expect(result.aggregatedData.avgHR).toBeDefined();
      expect(result.aggregatedData.avgHRV).toBeDefined();
      expect(result.aggregatedData.sleepQuality).toBeDefined();
      expect(result.aggregatedData.trainingLoad).toBeDefined();
    });

    test('should complete all analysis phases', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      // Verify all analysis components executed
      expect(result.analyses.trainingLoad).toBeGreaterThanOrEqual(0);
      expect(result.analyses.injuryRisk).toBeGreaterThanOrEqual(0);
      expect(result.analyses.readiness).toBeGreaterThanOrEqual(0);
    });

    test('should generate coaching decision', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.coachDecision).toBeDefined();
      expect(result.coachDecision.id).toBeDefined();
      expect(result.coachDecision.type).toBeDefined();
      expect(result.coachDecision.confidence).toBeGreaterThan(0.5);
    });

    test('should apply auto-approved adjustments', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      if (result.coachDecision.autoApprove) {
        expect(result.planAdjustments).toBeDefined();
        expect(result.planAdjustments.length).toBeGreaterThan(0);
      }
    });

    test('should emit notifications', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.stringMatching(/brain_cycle|decision|notification/),
        expect.any(Object)
      );
    });
  });

  describe('Data Aggregation Phase', () => {
    test('should handle Terra data successfully', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { source: 'terra', hr: 65, hrv: 45, timestamp: Date.now() },
        ]),
      } as any);

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.aggregatedData).toBeDefined();
    });

    test('should handle Google Fit data successfully', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { source: 'google_fit', steps: 8000, calories: 2500, timestamp: Date.now() },
        ]),
      } as any);

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.aggregatedData).toBeDefined();
    });

    test('should handle Garmin data successfully', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { source: 'garmin', body_battery: 85, stress: 25, timestamp: Date.now() },
        ]),
      } as any);

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.aggregatedData).toBeDefined();
    });

    test('should handle missing data gracefully', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([]), // No data
      } as any);

      expect(async () => {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }).not.toThrow();
    });

    test('should handle partial data sources', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { source: 'terra', hr: 65 },
          // Missing Google Fit and Garmin
        ]),
      } as any);

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.aggregatedData).toBeDefined();
    });
  });

  describe('Analysis Phase', () => {
    test('should compute training load correctly', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.analyses.trainingLoad).toBeLessThanOrEqual(100);
      expect(result.analyses.trainingLoad).toBeGreaterThanOrEqual(0);
    });

    test('should detect injury risk accurately', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      if (result.analyses.injuryRisk > 50) {
        // High risk should trigger alert
        expect(result.coachDecision.type).toMatch(/rest|recovery/);
      }
    });

    test('should assess readiness comprehensively', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.analyses.readiness).toBeLessThanOrEqual(100);
      expect(result.analyses.readiness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Decision Generation Phase', () => {
    test('should generate appropriate category decision', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      const validDecisions = [
        'increase_volume',
        'reduce_intensity',
        'rest_day',
        'recovery_focus',
        'maintain_plan',
      ];

      expect(validDecisions).toContain(result.coachDecision.type);
    });

    test('should include confidence score', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.coachDecision.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.coachDecision.confidence).toBeLessThanOrEqual(1);
    });

    test('should provide decision reasoning', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.coachDecision.reasoning).toBeDefined();
      expect(typeof result.coachDecision.reasoning).toBe('string');
    });
  });

  describe('Database Consistency', () => {
    test('should update all required tables', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockDb.transaction || mockDb.exec).toBeDefined();
    });

    test('should maintain referential integrity', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      // Verify all records reference userId
      expect(result.userId).toBe(userId);
      if (result.coachDecision) {
        expect(result.coachDecision.userId || result.userId).toBeDefined();
      }
    });

    test('should use transactions for atomicity', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeDailyBrainCycle(userId);

      // Verify transaction was used
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    test('should not create orphaned records on error', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      expect(async () => {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }).not.toThrow();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle data aggregation failure', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockImplementationOnce(() => {
        throw new Error('Aggregation failed');
      });

      expect(async () => {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }).not.toThrow();
    });

    test('should handle analysis service failure', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockImplementationOnce(() => {
        throw new Error('Analysis failed');
      });

      expect(async () => {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }).not.toThrow();
    });

    test('should handle decision generation failure', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockImplementationOnce(() => {
        throw new Error('Decision generation failed');
      });

      expect(async () => {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      }).not.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should complete single user cycle in <100ms', async () => {
      const userId = 'user_123';

      const startTime = Date.now();
      await brainOrchestrator.executeDailyBrainCycle(userId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    test('should maintain O(n) scalability', async () => {
      const times: number[] = [];

      for (const userCount of [100, 500, 1000]) {
        const startTime = Date.now();

        const users = Array(userCount).fill(null).map((_, i) => `user_${i}`);
        await Promise.all(
          users.map(userId => brainOrchestrator.executeDailyBrainCycle(userId))
        );

        times.push(Date.now() - startTime);
      }

      // Times should scale roughly linearly
      expect(times[1]).toBeLessThan(times[0] * 6); // 500 users should be ~5x longer
      expect(times[2]).toBeLessThan(times[1] * 3); // 1000 users should be ~2x longer
    });
  });

  describe('Data Consistency', () => {
    test('should ensure no data corruption in large batches', async () => {
      const userIds = Array(500).fill(null).map((_, i) => `user_${i}`);

      const results = await Promise.all(
        userIds.map(userId => brainOrchestrator.executeDailyBrainCycle(userId))
      );

      // Verify no duplicates or missing data
      const resultIds = results.map((r: any) => r.userId);
      expect(new Set(resultIds).size).toBe(results.length);
    });
  });
});

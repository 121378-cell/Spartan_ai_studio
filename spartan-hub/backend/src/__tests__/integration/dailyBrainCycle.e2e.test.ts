import { BrainOrchestrator } from '../../services/brainOrchestrator';
import { BiometricService } from '../../services/biometricService';
import { AdvancedAnalysisService } from '../../services/advancedAnalysisService';
import { getCoachVitalisService } from '../../services/coachVitalisService';
import { MLForecastingService } from '../../services/mlForecastingService';
import { PlanAdjusterService } from '../../services/planAdjusterService';
import { eventBus } from '../../services/eventBus';
import { socketManager } from '../../realtime/socketManager';

jest.mock('../../services/eventBus');
jest.mock('../../realtime/socketManager');
jest.mock('../../services/advancedAnalysisService');
jest.mock('../../services/coachVitalisService');
jest.mock('../../services/mlForecastingService');
jest.mock('../../services/biometricService');
jest.mock('../../services/planAdjusterService');
jest.mock('../../utils/logger');
jest.mock('../../database/databaseManager', () => ({
  getDatabase: jest.fn()
}));

describe('Daily Brain Cycle - E2E Integration', () => {
  let brainOrchestrator: BrainOrchestrator;
  let mockDb: any;
  let mockCoachVitalis: any;
  let mockBiometricServiceInstance: any;
  let mockPlanAdjusterInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue(undefined),
      }),
      exec: jest.fn(),
      transaction: jest.fn((fn: any) => fn),
    };

    const { getDatabase } = require('../../database/databaseManager');
    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({
      current: { tss: 100 },
      target: { tss: 120 },
      ratio: 0.8,
      trend: { direction: 'stable' },
      riskFactors: [],
      isOverloading: false
    });

    (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({
      score: 20,
      redFlags: [],
      recommendations: [],
      riskLevel: 'low',
      hrvStatus: { current: 50, baseline: 50, deviation: 0, status: 'optimal' },
      overuseIndicators: { consecutiveHighLoadDays: 0, recoveryDebt: 0, tissueStress: 'low' }
    });

    mockBiometricServiceInstance = {
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

    mockPlanAdjusterInstance = {
      applyAdjustment: jest.fn().mockResolvedValue(true),
      rebalanceRemainingDays: jest.fn().mockResolvedValue({ rebalanced: false })
    };
    (PlanAdjusterService as unknown as jest.Mock).mockImplementation(() => mockPlanAdjusterInstance);

    mockCoachVitalis = {
      evaluateDailyComprehensive: jest.fn().mockResolvedValue({
        readinessScore: 85,
        recoveryNeeds: [],
        preliminaryRecommendations: [],
        trainingReadiness: 'optimal'
      }),
      decidePlanAdjustments: jest.fn().mockResolvedValue({
        recommendedActions: [],
        decisionType: 'maintain_plan',
        confidence: 0.85,
        reasoning: 'All metrics within normal range'
      })
    };
    (getCoachVitalisService as jest.Mock).mockReturnValue(mockCoachVitalis);

    (MLForecastingService.getInstance as jest.Mock).mockReturnValue({
      forecastTrainingLoad: jest.fn().mockResolvedValue({}),
      predictInjuryRisk: jest.fn().mockResolvedValue({ probability: 0.1 }),
      forecastReadiness: jest.fn().mockResolvedValue([])
    });

    (BrainOrchestrator as any).instance = null;
    brainOrchestrator = BrainOrchestrator.getInstance();
  });

  describe('Full Daily Cycle Workflow', () => {
    test('should complete full daily cycle', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.date).toBeDefined();
      expect(result.aggregatedData).toBeDefined();
      expect(result.analyses).toBeDefined();
      expect(result.coachDecision).toBeDefined();
    });

    test('should aggregate data from biometric service', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(mockBiometricServiceInstance.aggregateDayData).toHaveBeenCalledWith(userId, expect.any(String));
      expect(result.aggregatedData).toBeDefined();
    });

    test('should complete all analysis phases', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(AdvancedAnalysisService.analyzeTrainingLoadV2).toHaveBeenCalled();
      expect(AdvancedAnalysisService.evaluateInjuryRiskV2).toHaveBeenCalled();
      expect(mockCoachVitalis.evaluateDailyComprehensive).toHaveBeenCalled();
      expect(result.analyses).toBeDefined();
    });

    test('should generate coaching decision', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(mockCoachVitalis.decidePlanAdjustments).toHaveBeenCalled();
      expect(result.coachDecision).toBeDefined();
    });

    test('should emit brain.cycle.complete event', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'brain.cycle.complete',
        expect.any(Object),
        'high'
      );
    });

    test('should notify frontend via socket', async () => {
      const userId = 'user_123';

      await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(socketManager.emitToUser).toHaveBeenCalledWith(
        userId,
        'brain-cycle-complete',
        expect.any(Object),
        '/brain'
      );
    });
  });

  describe('Data Aggregation Phase', () => {
    test('should handle biometric aggregation successfully', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.aggregatedData.heartRateAvg).toBe(65);
      expect(result.aggregatedData.hrvAverage).toBe(60);
      expect(result.aggregatedData.sleepQuality).toBe(0.85);
    });

    test('should handle empty biometric data', async () => {
      const userId = 'user_123';

      mockBiometricServiceInstance.aggregateDayData.mockResolvedValueOnce({
        dataQuality: 0.3
      });

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result).toBeDefined();
    });

    test('should handle biometric service errors', async () => {
      const userId = 'user_123';

      mockBiometricServiceInstance.aggregateDayData.mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(brainOrchestrator.executeDailyBrainCycle(userId)).rejects.toThrow();
      expect(eventBus.emit).toHaveBeenCalledWith('brain.cycle.failed', expect.any(Object), 'high');
    });
  });

  describe('Analysis Phase', () => {
    test('should compute training load', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.analyses.trainingLoad).toBeDefined();
    });

    test('should detect injury risk', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.analyses.injuryRisk).toBeDefined();
    });

    test('should assess readiness', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.analyses.readiness).toBeDefined();
    });
  });

  describe('Decision Generation Phase', () => {
    test('should generate decision with confidence', async () => {
      const userId = 'user_123';

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.coachDecision.confidence).toBeDefined();
    });

    test('should apply auto-approved adjustments', async () => {
      const userId = 'user_123';

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValueOnce({
        recommendedActions: [
          { type: 'intensity_adjustment', intensityChange: 5, reason: 'Test', confidence: 90 }
        ],
        confidence: 0.9
      });

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.planAdjustments).toBeDefined();
    });

    test('should require approval for major adjustments', async () => {
      const userId = 'user_123';

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValueOnce({
        recommendedActions: [
          { type: 'intensity_adjustment', intensityChange: 35, reason: 'Test', confidence: 80 }
        ],
        confidence: 0.8
      });

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.planAdjustments[0].status).toBe('pending_feedback');
    });
  });

  describe('Notification Generation', () => {
    test('should generate injury alert for high risk', async () => {
      const userId = 'user_123';

      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValueOnce({
        score: 80,
        riskLevel: 'critical',
        probability: 80,
        redFlags: ['High strain'],
        recommendations: []
      });

      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValueOnce({
        readinessScore: 50,
        trainingReadiness: 'limited'
      });

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.notifications.length).toBeGreaterThan(0);
      expect(result.notifications.some((n: any) => n.type === 'injury_alert')).toBe(true);
    });

    test('should dispatch notifications via socket', async () => {
      const userId = 'user_123';

      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValueOnce({
        score: 80,
        riskLevel: 'critical',
        probability: 80,
        redFlags: ['High strain'],
        recommendations: []
      });

      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValueOnce({
        readinessScore: 50,
        trainingReadiness: 'limited'
      });

      await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(socketManager.emitToUser).toHaveBeenCalledWith(
        userId,
        'notification',
        expect.any(Object),
        '/notifications'
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle aggregation failure', async () => {
      const userId = 'user_123';

      mockBiometricServiceInstance.aggregateDayData.mockRejectedValueOnce(new Error('Aggregation failed'));

      await expect(brainOrchestrator.executeDailyBrainCycle(userId)).rejects.toThrow('Aggregation failed');
    });

    test('should emit failure event on error', async () => {
      const userId = 'user_123';

      mockBiometricServiceInstance.aggregateDayData.mockRejectedValueOnce(new Error('Test error'));

      try {
        await brainOrchestrator.executeDailyBrainCycle(userId);
      } catch {
        // Expected
      }

      expect(eventBus.emit).toHaveBeenCalledWith('brain.cycle.failed', expect.any(Object), 'high');
    });
  });

  describe('Weekly Rebalancing', () => {
    test('should skip rebalancing when not needed', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { date: '2026-02-17', context: JSON.stringify({ aggregatedData: { hrvAverage: 50 }, analyses: { trainingLoad: { load: 60 } } }) },
          { date: '2026-02-16', context: JSON.stringify({ aggregatedData: { hrvAverage: 52 }, analyses: { trainingLoad: { load: 55 } } }) },
        ])
      });

      const result = await brainOrchestrator.executeWeeklyRebalancing(userId);

      expect(result.rebalanced).toBe(false);
    });

    test('should trigger rebalancing when needed', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { date: '2026-02-17', context: JSON.stringify({ aggregatedData: { hrvAverage: 35 }, analyses: { trainingLoad: { load: 80 } } }) },
          { date: '2026-02-16', context: JSON.stringify({ aggregatedData: { hrvAverage: 50 }, analyses: { trainingLoad: { load: 80 } } }) },
        ])
      });

      mockPlanAdjusterInstance.rebalanceRemainingDays.mockResolvedValueOnce({ rebalanced: true });

      const result = await brainOrchestrator.executeWeeklyRebalancing(userId);

      expect(mockPlanAdjusterInstance.rebalanceRemainingDays).toHaveBeenCalled();
    });
  });

  describe('Critical Signal Monitoring', () => {
    test('should detect critical HR', async () => {
      const userId = 'user_123';
      const criticalData = { avgHR: 150, avgHRV: 50 };

      const result = await brainOrchestrator.monitorCriticalSignals(userId, criticalData);

      expect(result.type).toBe('critical_signal');
      expect(eventBus.emit).toHaveBeenCalledWith('critical_signal_detected', expect.any(Object), 'high');
    });

    test('should detect critical HRV', async () => {
      const userId = 'user_123';
      const criticalData = { avgHR: 70, avgHRV: 5 };

      const result = await brainOrchestrator.monitorCriticalSignals(userId, criticalData);

      expect(result.type).toBe('critical_signal');
    });

    test('should return normal for healthy values', async () => {
      const userId = 'user_123';
      const normalData = { avgHR: 70, avgHRV: 60 };

      const result = await brainOrchestrator.monitorCriticalSignals(userId, normalData);

      expect(result.status).toBe('normal');
    });
  });

  describe('Performance', () => {
    test('should complete single cycle quickly', async () => {
      const userId = 'user_123';

      const startTime = Date.now();
      await brainOrchestrator.executeDailyBrainCycle(userId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    test('should handle multiple concurrent users', async () => {
      const userIds = ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];

      const results = await Promise.all(
        userIds.map(userId => brainOrchestrator.executeDailyBrainCycle(userId))
      );

      expect(results.length).toBe(5);
      expect(results.every(r => r.userId)).toBe(true);
    });
  });
});

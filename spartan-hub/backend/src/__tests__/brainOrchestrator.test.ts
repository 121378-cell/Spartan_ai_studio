import { BrainOrchestrator } from '../services/brainOrchestrator';
import { getDatabase } from '../database/databaseManager';
import { eventBus } from '../services/eventBus';
import { socketManager } from '../realtime/socketManager';
import { getCoachVitalisService } from '../services/coachVitalisService';
import { AdvancedAnalysisService } from '../services/advancedAnalysisService';
import { MLForecastingService } from '../services/mlForecastingService';
import { PlanAdjusterService } from '../services/planAdjusterService';
import { BiometricService } from '../services/biometricService';

jest.mock('../database/databaseManager');
jest.mock('../services/eventBus');
jest.mock('../realtime/socketManager');
jest.mock('../services/coachVitalisService');
jest.mock('../services/advancedAnalysisService');
jest.mock('../services/mlForecastingService');
jest.mock('../services/planAdjusterService');
jest.mock('../services/biometricService');
jest.mock('../utils/logger');

describe('BrainOrchestrator', () => {
  let brainOrchestrator: BrainOrchestrator;

  const mockDb = {
    prepare: jest.fn().mockReturnThis(),
    run: jest.fn(),
    all: jest.fn(),
    get: jest.fn()
  };

  const mockCoachVitalis = {
    evaluateDailyComprehensive: jest.fn(),
    decidePlanAdjustments: jest.fn()
  };

  const mockBiometricService = {
    aggregateDayData: jest.fn()
  };

  const mockPlanAdjuster = {
    applyAdjustment: jest.fn(),
    rebalanceRemainingDays: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    (getCoachVitalisService as jest.Mock).mockReturnValue(mockCoachVitalis);
    (BiometricService as jest.Mock).mockImplementation(() => mockBiometricService);
    (PlanAdjusterService as unknown as jest.Mock).mockImplementation(() => mockPlanAdjuster);
    (MLForecastingService.getInstance as jest.Mock).mockReturnValue({
      forecastTrainingLoad: jest.fn()
    });

    (BrainOrchestrator as any).instance = null;
    brainOrchestrator = BrainOrchestrator.getInstance();
  });

  describe('executeDailyBrainCycle', () => {
    const userId = 'user-123';
    const today = new Date().toISOString().split('T')[0];

    it('should complete successfully (Happy Path)', async () => {
      mockBiometricService.aggregateDayData.mockResolvedValue({
        heartRateAvg: 70,
        activities: [{ volume: 100, intensity: 5, date: today, calories: 200 }],
        dataQuality: 0.95
      });

      mockDb.prepare.mockImplementation((query: string) => {
        if (query.includes('daily_biometrics')) {
          return {
            all: jest.fn().mockReturnValue([
              { userId, date: '2025-01-01', hrv: '[]', restingHeartRate: '[]', lastUpdated: new Date() }
            ])
          };
        }
        if (query.includes('daily_brain_decisions')) {
          return { run: jest.fn() };
        }
        if (query.includes('notifications')) {
          return { run: jest.fn() };
        }
        return { run: jest.fn(), all: jest.fn(), get: jest.fn() };
      });

      (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({
        current: { tss: 150 },
        trend: { direction: 'stable' },
        riskFactors: []
      });
      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({
        score: 20,
        redFlags: [],
        recommendations: [],
        riskLevel: 'low'
      });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({
        readinessScore: 85
      });

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue({
        recommendedActions: [
          { type: 'intensity_adjustment', intensityChange: 10, reason: 'High readiness', confidence: 90 }
        ],
        decisionType: 'daily_adjustment',
        confidence: 0.9
      });

      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.date).toBe(today);
      expect(result.planAdjustments).toHaveLength(1);
      expect(result.planAdjustments[0].status).toBe('auto_applied');

      expect(mockBiometricService.aggregateDayData).toHaveBeenCalledWith(userId, today);
      expect(mockCoachVitalis.evaluateDailyComprehensive).toHaveBeenCalled();
      expect(mockCoachVitalis.decidePlanAdjustments).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('brain.cycle.complete', expect.anything(), 'high');
      expect(socketManager.emitToUser).toHaveBeenCalledWith(userId, 'brain-cycle-complete', expect.anything(), '/brain');
    });

    it('should generate notifications for critical injury risk', async () => {
      mockBiometricService.aggregateDayData.mockResolvedValue({});
      mockDb.prepare.mockReturnValue({ all: jest.fn().mockReturnValue([]), run: jest.fn() });

      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({
        score: 80,
        redFlags: ['High strain'],
        recommendations: [],
        riskLevel: 'critical',
        probability: 80
      });
      (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({ current: {}, trend: {}, riskFactors: [] });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({ readinessScore: 50, trainingReadiness: 'limited' });
      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue({ recommendedActions: [], confidence: 0.5 });

      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      expect(result.notifications).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'injury_alert', severity: 'critical' })
      ]));
    });

    it('should handle errors gracefully', async () => {
      mockBiometricService.aggregateDayData.mockRejectedValue(new Error('Data source failed'));

      await expect(brainOrchestrator.executeDailyBrainCycle(userId))
        .rejects.toThrow('Data source failed');

      expect(eventBus.emit).toHaveBeenCalledWith('brain.cycle.failed', expect.objectContaining({ userId }), 'high');
    });
  });

  describe('monitorCriticalSignals', () => {
    it('should emit alert when signals exceed threshold', async () => {
      const userId = 'user-123';
      const criticalData = { avgHR: 150, avgHRV: 5 };

      const result = await brainOrchestrator.monitorCriticalSignals(userId, criticalData);

      expect(result.type).toBe('critical_signal');
      expect(eventBus.emit).toHaveBeenCalledWith('critical_signal_detected', expect.anything(), 'high');
      expect(socketManager.emitToUser).toHaveBeenCalledWith(userId, 'critical-alert', expect.anything(), '/alerts');
    });

    it('should return normal status for normal data', async () => {
      const userId = 'user-123';
      const normalData = { avgHR: 70, avgHRV: 60 };

      const result = await brainOrchestrator.monitorCriticalSignals(userId, normalData);

      expect(result.status).toBe('normal');
      expect(eventBus.emit).not.toHaveBeenCalledWith('critical_signal_detected', expect.anything(), expect.anything());
    });
  });

  describe('executeWeeklyRebalancing', () => {
    const userId = 'user-123';

    it('should calculate trends and skip rebalancing if not needed', async () => {
      mockDb.prepare.mockImplementation((query: string) => {
        if (query.includes('FROM daily_brain_decisions')) {
          return {
            all: jest.fn().mockReturnValue([
              { date: '2025-01-07', context: JSON.stringify({ aggregatedData: { hrvAverage: 50 }, analyses: { trainingLoad: { load: 60 } } }) },
              { date: '2025-01-06', context: JSON.stringify({ aggregatedData: { hrvAverage: 52 }, analyses: { trainingLoad: { load: 55 } } }) },
              { date: '2025-01-05', context: JSON.stringify({ aggregatedData: { hrvAverage: 51 }, analyses: { trainingLoad: { load: 50 } } }) },
              { date: '2025-01-04', context: JSON.stringify({ aggregatedData: { hrvAverage: 53 }, analyses: { trainingLoad: { load: 45 } } }) },
            ])
          };
        }
        return { run: jest.fn(), all: jest.fn(), get: jest.fn() };
      });

      const result = await brainOrchestrator.executeWeeklyRebalancing(userId);

      expect(result.rebalanced).toBe(false);
      expect(result.reason).toBe('No rebalancing needed');
      expect(eventBus.emit).not.toHaveBeenCalledWith('brain.weekly.rebalanced', expect.anything(), expect.anything());
    });

    it('should trigger rebalancing if HRV drops significantly', async () => {
      mockDb.prepare.mockImplementation((query: string) => {
        if (query.includes('FROM daily_brain_decisions')) {
          return {
            all: jest.fn().mockReturnValue([
              { date: '2025-01-07', context: JSON.stringify({ aggregatedData: { hrvAverage: 35 }, analyses: { trainingLoad: { load: 80 } } }) },
              { date: '2025-01-06', context: JSON.stringify({ aggregatedData: { hrvAverage: 45 }, analyses: { trainingLoad: { load: 80 } } }) },
              { date: '2025-01-05', context: JSON.stringify({ aggregatedData: { hrvAverage: 50 }, analyses: { trainingLoad: { load: 80 } } }) },
              { date: '2025-01-04', context: JSON.stringify({ aggregatedData: { hrvAverage: 50 }, analyses: { trainingLoad: { load: 80 } } }) },
            ])
          };
        }
        return { run: jest.fn(), all: jest.fn(), get: jest.fn() };
      });

      mockPlanAdjuster.rebalanceRemainingDays.mockResolvedValue({
        adjustments: []
      });

      const result = await brainOrchestrator.executeWeeklyRebalancing(userId);

      expect(mockPlanAdjuster.rebalanceRemainingDays).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('brain.weekly.rebalanced', expect.anything(), 'medium');
    });

    it('should handle errors during rebalancing', async () => {
      mockDb.prepare.mockImplementation(() => { throw new Error('DB Error'); });

      await expect(brainOrchestrator.executeWeeklyRebalancing(userId))
        .rejects.toThrow('DB Error');
    });
  });

  describe('Autonomy Rules (applyPlanChanges)', () => {
    const setupCommonMocks = () => {
      mockBiometricService.aggregateDayData.mockResolvedValue({});
      mockDb.prepare.mockReturnValue({ run: jest.fn(), all: jest.fn().mockReturnValue([]) });
      (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({
        current: { tss: 100 },
        trend: { direction: 'stable' },
        riskFactors: []
      });
      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({
        score: 10,
        redFlags: [],
        recommendations: [],
        riskLevel: 'low'
      });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({ readinessScore: 80 });
    };

    it('should auto-apply minor intensity adjustments', async () => {
      setupCommonMocks();

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue({
        recommendedActions: [
          { type: 'intensity_adjustment', intensityChange: 5, reason: 'test', confidence: 90 }
        ],
        confidence: 0.9
      });
      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments).toHaveLength(1);
      expect(result.planAdjustments[0].status).toBe('auto_applied');
      expect(mockPlanAdjuster.applyAdjustment).toHaveBeenCalled();
    });

    it('should require approval for major intensity adjustments', async () => {
      setupCommonMocks();

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue({
        recommendedActions: [
          { type: 'intensity_adjustment', intensityChange: 35, reason: 'test', confidence: 80 }
        ],
        confidence: 0.8
      });

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments).toHaveLength(1);
      expect(result.planAdjustments[0].status).toBe('pending_feedback');
      expect(result.planAdjustments[0].requiresApproval).toBe(true);
      expect(mockPlanAdjuster.applyAdjustment).not.toHaveBeenCalled();
    });

    it('should auto-apply recovery days', async () => {
      setupCommonMocks();

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue({
        recommendedActions: [
          { type: 'recovery_day', reason: 'High fatigue', confidence: 95 }
        ],
        confidence: 0.95
      });
      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments).toHaveLength(1);
      expect(result.planAdjustments[0].status).toBe('auto_applied');
      expect(mockPlanAdjuster.applyAdjustment).toHaveBeenCalled();
    });

    it('should auto-apply training volume adjustments', async () => {
      setupCommonMocks();

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue({
        recommendedActions: [
          { type: 'duration_adjustment', durationChange: -20, reason: 'Fatigue', confidence: 85 }
        ],
        confidence: 0.85
      });
      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments).toHaveLength(1);
      expect(result.planAdjustments[0].type).toBe('duration');
      expect(result.planAdjustments[0].change).toBe(-20);
      expect(result.planAdjustments[0].status).toBe('auto_applied');
    });

    it('should auto-apply session type changes (exercise_selection)', async () => {
      setupCommonMocks();

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue({
        recommendedActions: [
          { type: 'session_type_change', currentType: 'Strength', recommendedType: 'Yoga', reason: 'Mobility', confidence: 90 }
        ],
        confidence: 0.9
      });
      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments).toHaveLength(1);
      expect(result.planAdjustments[0].type).toBe('session_type');
      expect(result.planAdjustments[0].to).toBe('Yoga');
      expect(result.planAdjustments[0].status).toBe('auto_applied');
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle failure in biometric history retrieval', async () => {
      mockBiometricService.aggregateDayData.mockResolvedValue({ heartRateAvg: 60 });

      mockDb.prepare.mockImplementation((query: string) => {
        if (query.includes('daily_biometrics')) {
          throw new Error('DB Connection Failed');
        }
        if (query.includes('daily_brain_decisions')) {
          return { run: jest.fn() };
        }
        return { run: jest.fn(), all: jest.fn(), get: jest.fn() };
      });

      (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({ current: {}, trend: {}, riskFactors: [] });
      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({ score: 10, redFlags: [], recommendations: [], riskLevel: 'low' });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({ readinessScore: 80 });
      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue({ recommendedActions: [], confidence: 0.5 });

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result).toBeDefined();
    });
  });
});

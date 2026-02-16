import { BrainOrchestrator } from '../services/brainOrchestrator';
import { getDatabase } from '../database/databaseManager';
import { eventBus } from '../services/eventBus';
import { socketManager } from '../realtime/socketManager';
import { getCoachVitalisService } from '../services/coachVitalisService';
import { AdvancedAnalysisService } from '../services/advancedAnalysisService';
import { MLForecastingService } from '../services/mlForecastingService';
import { PlanAdjusterService } from '../services/planAdjusterService';
import { BiometricService } from '../services/biometricService';

// Mock dependencies
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

  // Mock implementations
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

    // Setup DB mock
    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    // Setup Coach Vitalis mock
    (getCoachVitalisService as jest.Mock).mockReturnValue(mockCoachVitalis);

    // Setup BiometricService mock
    (BiometricService as jest.Mock).mockImplementation(() => mockBiometricService);

    // Setup PlanAdjusterService mock
    (PlanAdjusterService as jest.Mock).mockImplementation(() => mockPlanAdjuster);

    // Setup MLForecastingService Singleton mock
    (MLForecastingService.getInstance as jest.Mock).mockReturnValue({
      forecastTrainingLoad: jest.fn()
    });

    // Reset singleton instance if possible or just get the instance implies new mocks are used if constructor called again? 
    // BrainOrchestrator is a singleton. We might need to handle that. 
    // Since it initializes dependencies in constructor, mocking them BEFORE getting instance is key.
    // However, if instance already exists from previous tests (if any), it might hold old mocks.
    // For unit tests usually modules are reset. 

    // Access private instance to reset it for testing purposes if needed, 
    // but here we rely on jest module isolation or we assume clean slate.
    // To be safe, we can try to re-instantiate or just use getInstance.

    // We can cast to any to reset private static instance
    (BrainOrchestrator as any).instance = null;
    brainOrchestrator = BrainOrchestrator.getInstance();
  });

  describe('executeDailyBrainCycle', () => {
    const userId = 'user-123';
    const today = new Date().toISOString().split('T')[0];

    it('should complete successfully (Happy Path)', async () => {
      // 1. Mock Data Aggregation
      mockBiometricService.aggregateDayData.mockResolvedValue({
        heartRateAvg: 70,
        activities: [{ volume: 100, intensity: 5, date: today }],
        dataQuality: 0.95
      });

      // 1b. Mock Recent Biometric Data (DB)
      mockDb.prepare.mockImplementation((query: string) => {
        if (query.includes('daily_biometrics')) {
          return {
            all: jest.fn().mockReturnValue([
              { userId, date: '2025-01-01', hrv: '[]', restingHeartRate: '[]', lastUpdated: new Date() }
            ])
          };
        }
        if (query.includes('daily_brain_decisions')) {
          return { run: jest.fn() }; // For persistBrainDecision
        }
        if (query.includes('notifications')) {
          return { run: jest.fn() };
        }
        return { run: jest.fn(), all: jest.fn(), get: jest.fn() };
      });

      // 2. Mock Analysis Pipeline
      (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({
        current: { tss: 150 },
        trend: { direction: 'stable' },
        riskFactors: []
      });
      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({
        score: 20,
        redFlags: [],
        recommendations: []
      });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({
        readinessScore: 85
      });

      // 3. Mock Coach Decision
      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue([
        { type: 'training_intensity', modification: 'Increase intensity by 10%', reason: 'High readiness', confidence: 90 }
      ]);

      // 4. Mock Plan Adjustments (done implicitly via PlanAdjuster)

      // 5. Mock Persistence (done via DB mock)

      // 6. Mock Apply Changes
      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      // Execute
      const result = await brainOrchestrator.executeDailyBrainCycle(userId);

      // Assertions
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.date).toBe(today);
      expect(result.planAdjustments).toHaveLength(1);
      expect(result.planAdjustments[0].status).toBe('auto_applied'); // Intensity <= 10% is auto-applied

      // Verify dependencies called
      expect(mockBiometricService.aggregateDayData).toHaveBeenCalledWith(userId, today);
      expect(mockCoachVitalis.evaluateDailyComprehensive).toHaveBeenCalled();
      expect(mockCoachVitalis.decidePlanAdjustments).toHaveBeenCalled();
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR REPLACE INTO daily_brain_decisions'));
      expect(eventBus.emit).toHaveBeenCalledWith('brain.cycle.complete', expect.anything(), 'high');
      expect(socketManager.emitToUser).toHaveBeenCalledWith(userId, 'brain-cycle-complete', expect.anything(), '/brain');
    });

    it('should generate notifications for critical injury risk', async () => {
      // Mock critical injury risk
      mockBiometricService.aggregateDayData.mockResolvedValue({});
      mockDb.prepare.mockReturnValue({ all: jest.fn().mockReturnValue([]), run: jest.fn() });

      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({
        score: 80, // Critical
        redFlags: ['High strain'],
        recommendations: []
      });
      (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({ current: {}, trend: {}, riskFactors: [] });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({ readinessScore: 50 });
      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue([]);

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
      const criticalData = { avgHR: 150, avgHRV: 5 }; // Critical values

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
      // Mock decisions history
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
      // Mock decisions history with significant HRV drop (50 -> 35 = 30% drop)
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
    it('should auto-apply minor intensity adjustments', async () => {
      // We test this via executeDailyBrainCycle by mocking a specific decision
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
        recommendations: []
      });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({});

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue([
        { type: 'training_intensity', modification: 'Increase by 5%', reason: 'test', confidence: 90 }
      ]);
      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments[0].status).toBe('auto_applied');
      expect(mockPlanAdjuster.applyAdjustment).toHaveBeenCalled();
    });

    it('should require approval for major intensity adjustments', async () => {
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
        recommendations: []
      });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({});

      // Mock major adjustment (30%)
      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue([
        { type: 'training_intensity', modification: 'Increase by 35%', reason: 'test', confidence: 80 }
      ]);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments[0].status).toBe('pending_feedback');
      expect(result.planAdjustments[0].requiresApproval).toBe(true);
      // Should NOT call applyAdjustment for pending changes
      expect(mockPlanAdjuster.applyAdjustment).not.toHaveBeenCalled();
    });

    it('should auto-apply recovery days', async () => {
      mockBiometricService.aggregateDayData.mockResolvedValue({});
      mockDb.prepare.mockReturnValue({ run: jest.fn(), all: jest.fn().mockReturnValue([]) });
      (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({
        current: { tss: 100 },
        trend: { direction: 'stable' },
        riskFactors: []
      });
      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({});
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({});

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue([
        { type: 'recovery_focus', modification: 'Take a rest day', reason: 'High fatigue', confidence: 95 }
      ]);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments[0].status).toBe('auto_applied');
      expect(mockPlanAdjuster.applyAdjustment).toHaveBeenCalled();
    });

    it('should auto-apply training volume adjustments', async () => {
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
        recommendations: []
      });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({});

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue([
        { type: 'training_volume', modification: 'Reduce volume by 20%', reason: 'Fatigue', confidence: 85 }
      ]);
      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments[0].type).toBe('duration');
      expect(result.planAdjustments[0].change).toBe(-20);
      expect(result.planAdjustments[0].status).toBe('auto_applied');
    });

    it('should auto-apply session type changes (exercise_selection)', async () => {
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
        recommendations: []
      });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({});

      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue([
        { type: 'exercise_selection', modification: 'Yoga', reason: 'Mobility', confidence: 90 }
      ]);
      mockPlanAdjuster.applyAdjustment.mockResolvedValue(true);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      expect(result.planAdjustments[0].type).toBe('session_type');
      expect(result.planAdjustments[0].to).toBe('Yoga');
      expect(result.planAdjustments[0].status).toBe('auto_applied');
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle failure in biometric history retrieval', async () => {
      // Mock biometric service aggregation success
      mockBiometricService.aggregateDayData.mockResolvedValue({ heartRateAvg: 60 });

      // Mock DB prepare to throw ONLY for daily_biometrics query
      mockDb.prepare.mockImplementation((query: string) => {
        if (query.includes('daily_biometrics')) {
          throw new Error('DB Connection Failed');
        }
        // Return valid mocks for other queries to ensure we proceed
        if (query.includes('daily_brain_decisions')) {
          return { run: jest.fn() };
        }
        return { run: jest.fn(), all: jest.fn(), get: jest.fn() };
      });

      // Mocks for subsequent steps that will still run because catch block returns []
      (AdvancedAnalysisService.analyzeTrainingLoadV2 as jest.Mock).mockReturnValue({ current: {}, trend: {}, riskFactors: [] });
      (AdvancedAnalysisService.evaluateInjuryRiskV2 as jest.Mock).mockReturnValue({ score: 10, redFlags: [], recommendations: [] });
      mockCoachVitalis.evaluateDailyComprehensive.mockResolvedValue({});
      mockCoachVitalis.decidePlanAdjustments.mockResolvedValue([]);

      const result = await brainOrchestrator.executeDailyBrainCycle('user-123');

      // Should verify that it continued despite the error (because getRecentBiometricData catches it)
      expect(result).toBeDefined();
      // And we can verify logic that depends on empty history
    });
  });
});

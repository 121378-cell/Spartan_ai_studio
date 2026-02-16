/**
 * Brain Orchestrator
 * 
 * Central orchestration engine for Spartan's decision-making system.
 * Manages the complete flow:
 * 
 * 1. Daily Brain Cycle (executed at end of day ~23:00):
 *    - Data aggregation from all sources (Terra/Garmin/Google Fit)
 *    - Multi-stage analysis (advanced analysis → ML forecasting → Coach Vitalis)
 *    - Decision generation (plan adjustments, recommendations)
 *    - Notification dispatch
 * 
 * 2. Weekly Rebalancing (analysis of 7-day trends):
 *    - Pattern detection
 *    - Dynamic plan reorganization
 *    - Intensity adjustment across remaining week
 * 
 * 3. Critical Signal Monitoring (continuous, real-time):
 *    - HRV anomalies, HR spikes, sleep crashes
 *    - Immediate alerts without waiting for daily cycle
 * 
 * Responsibilities:
 * - Coordinate all analysis services
 * - Persist decisions for feedback loop
 * - Emit events for real-time updates
 * - Handle errors and fallbacks
 */

import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { eventBus } from './eventBus';
import { socketManager } from '../realtime/socketManager';
import { getCoachVitalisService } from './coachVitalisService';
import { AdvancedAnalysisService } from './advancedAnalysisService';
import { MLForecastingService } from './mlForecastingService';
import { PlanAdjusterService } from './planAdjusterService';
import { BiometricService } from './biometricService';
import { DailyBiometrics } from '../models/BiometricData';

interface DailyBrainCycleData {
  userId: string;
  date: string;
  aggregatedData: any;
  analyses: {
    trainingLoad: any;
    injuryRisk: any;
    readiness: any;
  };
  coachDecision: any;
  planAdjustments: any[];
  notifications: any[];
}

interface BrainDecision {
  id: string;
  userId: string;
  date: string;
  decisionType: string;
  context: any;
  recommendations: string[];
  appliedChanges: any[];
  confidence: number;
  feedback?: {
    status: 'auto_applied' | 'user_acknowledged' | 'user_modified' | 'user_rejected';
    modificationReason?: string;
    timestamp?: number;
  };
}

class BrainOrchestrator {
  private static instance: BrainOrchestrator;
  private db: any;
  private coachVitalis: any;
  private mlForecasting: MLForecastingService;
  private planAdjuster: PlanAdjusterService;
  private biometricService: BiometricService;

  private constructor() {
    this.db = getDatabase();
    this.coachVitalis = getCoachVitalisService();
    this.mlForecasting = MLForecastingService.getInstance();
    this.planAdjuster = new PlanAdjusterService();
    this.biometricService = new BiometricService();
    logger.info('BrainOrchestrator initialized', { context: 'brain-orchestrator' });
  }

  static getInstance(): BrainOrchestrator {
    if (!BrainOrchestrator.instance) {
      BrainOrchestrator.instance = new BrainOrchestrator();
    }
    return BrainOrchestrator.instance;
  }

  /**
   * Execute complete daily brain cycle
   * Called at end of day (default 23:00)
   */
  async executeDailyBrainCycle(userId: string): Promise<DailyBrainCycleData> {
    const cycleStartTime = Date.now();
    const today = new Date().toISOString().split('T')[0];

    try {
      logger.info('Starting daily brain cycle', {
        context: 'brain-orchestrator',
        metadata: { userId, date: today }
      });

      // Step 1: Aggregate daily data
      const aggregatedData = await this.aggregateDailyData(userId, today);
      logger.info('Step 1 complete: Data aggregated', {
        context: 'brain-orchestrator',
        metadata: { userId, dataPoints: Object.keys(aggregatedData).length }
      });

      // Step 1b: Retrieve recent biometric history
      const biometricHistory = await this.getRecentBiometricData(userId, 28) as DailyBiometrics[];

      // Step 2: Multi-stage analysis
      const analyses = await this.executeAnalysisPipeline(userId, aggregatedData, biometricHistory);
      logger.info('Step 2 complete: Analysis pipeline finished', {
        context: 'brain-orchestrator',
        metadata: { userId, analysisTypes: Object.keys(analyses).length }
      });

      // Step 3: Coach Vitalis decision
      const coachDecision = await this.generateCoachDecision(userId, aggregatedData, analyses);
      logger.info('Step 3 complete: Coach decision made', {
        context: 'brain-orchestrator',
        metadata: { userId, decisionType: coachDecision.decisionType }
      });

      // Step 4: Generate plan adjustments
      const planAdjustments = await this.generatePlanAdjustments(userId, coachDecision);
      logger.info('Step 4 complete: Plan adjustments generated', {
        context: 'brain-orchestrator',
        metadata: { userId, adjustmentCount: planAdjustments.length }
      });

      // Step 5: Persist decision
      const decisionRecord = await this.persistBrainDecision(userId, today, {
        aggregatedData,
        analyses,
        coachDecision,
        planAdjustments
      });

      // Step 6: Apply changes with autonomy rules
      const appliedChanges = await this.applyPlanChanges(userId, planAdjustments);
      logger.info('Step 5 complete: Plan changes applied', {
        context: 'brain-orchestrator',
        metadata: { userId, appliedCount: appliedChanges.length }
      });

      // Step 7: Generate notifications
      const notifications = await this.generateNotifications(userId, planAdjustments, analyses);
      logger.info('Step 6 complete: Notifications generated', {
        context: 'brain-orchestrator',
        metadata: { userId, notificationCount: notifications.length }
      });

      // Step 8: Dispatch notifications via real-time
      await this.dispatchNotifications(userId, notifications);

      const cycleData: DailyBrainCycleData = {
        userId,
        date: today,
        aggregatedData,
        analyses,
        coachDecision,
        planAdjustments,
        notifications
      };

      // Emit event
      eventBus.emit('brain.cycle.complete', cycleData, 'high');

      // Notify frontend
      socketManager.emitToUser(userId, 'brain-cycle-complete', {
        date: today,
        summary: {
          dataPoints: Object.keys(aggregatedData).length,
          adjustmentsApplied: appliedChanges.length,
          notificationsSent: notifications.length
        },
        cycleTime: Date.now() - cycleStartTime
      }, '/brain');

      logger.info('Daily brain cycle complete', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          date: today,
          cycleTime: Date.now() - cycleStartTime,
          adjustmentCount: planAdjustments.length
        }
      });

      return cycleData;
    } catch (error) {
      logger.error('Daily brain cycle failed', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          date: today,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });

      eventBus.emit('brain.cycle.failed', { userId, error }, 'high');
      throw error;
    }
  }

  /**
   * Aggregate all available data for the day
   */
  private async aggregateDailyData(userId: string, date: string): Promise<any> {
    try {
      const aggregation = await this.biometricService.aggregateDayData(userId, date);

      return {
        heartRateAvg: aggregation.heartRateAvg,
        heartRateMax: aggregation.heartRateMax,
        heartRateMin: aggregation.heartRateMin,
        restingHeartRate: aggregation.restingHeartRate,
        hrvAverage: aggregation.hrvAverage,
        sleepDuration: aggregation.sleepDuration,
        sleepQuality: aggregation.sleepQuality,
        stressAverage: aggregation.stressAverage,
        totalSteps: aggregation.totalSteps,
        totalCalories: aggregation.totalCalories,
        totalDistance: aggregation.totalDistance,
        activities: aggregation.activities,
        workoutPerformed: aggregation.activities?.length > 0 || false,
        dataQuality: aggregation.dataQuality || 0.9,
        sources: aggregation.sources || ['terra']
      };
    } catch (error) {
      logger.error('Failed to aggregate daily data', {
        context: 'brain-orchestrator',
        userId,
        metadata: { date, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Retrieve recent biometric data for multi-day analysis (Phase 2)
   */
  private async getRecentBiometricData(userId: string, days: number): Promise<DailyBiometrics[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM daily_biometrics 
        WHERE userId = ? 
        AND date >= date('now', ?)
        ORDER BY date ASC
        LIMIT ?
      `);

      const results = stmt.all(userId, `-${days} days`, days) as any[];

      return results.map(row => ({
        userId: row.userId,
        date: row.date,
        hrv: row.hrv ? JSON.parse(row.hrv) : [],
        restingHeartRate: row.restingHeartRate ? JSON.parse(row.restingHeartRate) : [],
        sleep: row.sleep ? JSON.parse(row.sleep) : undefined,
        activity: row.activity ? JSON.parse(row.activity) : undefined,
        recoveryIndex: row.recoveryIndex ? JSON.parse(row.recoveryIndex) : undefined,
        sources: new Set(row.sources ? JSON.parse(row.sources) : []),
        lastUpdated: new Date(row.lastUpdated),
        dataCompleteness: row.dataCompleteness || 100
      })) as DailyBiometrics[];
    } catch (error) {
      logger.warn('Could not retrieve biometric history, returning empty array', {
        context: 'brain-orchestrator',
        userId,
        metadata: { days }
      });
      return [];
    }
  }

  /**
   * Execute cascading analysis pipeline
   * Uses Phase 2 static methods for analysis
   */
  private async executeAnalysisPipeline(userId: string, aggregatedData: any, biometricDataArray: DailyBiometrics[]): Promise<any> {
    try {
      // Stage 1: Training Load Analysis (Phase 2.2 - Static method)
      const previousLoad = aggregatedData.activities?.map((a: any) => ({
        volume: a.calories || 0,
        intensity: a.intensity || 0,
        date: a.date
      })) || [];

      const trainingLoad = AdvancedAnalysisService.analyzeTrainingLoadV2(
        biometricDataArray.slice(-28),
        previousLoad
      );

      // Stage 2: Injury Risk Prediction (Phase 2.3 - Static method)
      const injuryRisk = AdvancedAnalysisService.evaluateInjuryRiskV2(
        biometricDataArray.slice(-28)
      );

      // Stage 3: Readiness Assessment (Phase 2.1)
      const readiness = await this.coachVitalis.evaluateDailyComprehensive(userId, aggregatedData);

      return {
        trainingLoad,
        injuryRisk,
        readiness
      };
    } catch (error) {
      logger.error('Analysis pipeline failed', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Generate Coach Vitalis decision
   */
  private async generateCoachDecision(userId: string, aggregatedData: any, analyses: any): Promise<any> {
    try {
      const decision = await this.coachVitalis.decidePlanAdjustments(userId, {
        readiness: analyses.readiness.readinessScore,
        trainingLoad: analyses.trainingLoad,
        injuryRisk: analyses.injuryRisk
      });

      return decision;
    } catch (error) {
      logger.error('Failed to generate coach decision', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Generate specific plan adjustments
   */
  private async generatePlanAdjustments(userId: string, coachDecision: any): Promise<any[]> {
    try {
      const adjustments: any[] = [];

      // Determine which adjustments to make based on decision
      if (coachDecision.recommendedActions) {
        for (const action of coachDecision.recommendedActions) {
          switch (action.type) {
            case 'intensity_adjustment':
              adjustments.push({
                type: 'intensity',
                change: action.intensityChange,
                reason: action.reason,
                confidence: action.confidence
              });
              break;

            case 'session_type_change':
              adjustments.push({
                type: 'session_type',
                from: action.currentType,
                to: action.recommendedType,
                reason: action.reason,
                confidence: action.confidence
              });
              break;

            case 'duration_adjustment':
              adjustments.push({
                type: 'duration',
                change: action.durationChange,
                reason: action.reason,
                confidence: action.confidence
              });
              break;

            case 'recovery_day':
              adjustments.push({
                type: 'recovery_day',
                reason: action.reason,
                confidence: action.confidence
              });
              break;
          }
        }
      }

      return adjustments;
    } catch (error) {
      logger.error('Failed to generate plan adjustments', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Persist brain decision to database
   */
  private async persistBrainDecision(userId: string, date: string, data: any): Promise<BrainDecision> {
    try {
      const decisionId = `decision_${userId}_${date}_${Date.now()}`;

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO daily_brain_decisions (
          id, userId, date, decisionType, context, recommendations, appliedChanges, confidence, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        decisionId,
        userId,
        date,
        'daily_cycle',
        JSON.stringify({
          aggregatedData: data.aggregatedData,
          analyses: data.analyses,
          coachDecision: data.coachDecision
        }),
        JSON.stringify(data.coachDecision.recommendedActions || []),
        JSON.stringify(data.planAdjustments),
        data.coachDecision.confidence || 0.85,
        Date.now()
      );

      logger.info('Brain decision persisted', {
        context: 'brain-orchestrator',
        metadata: { userId, date, decisionId }
      });

      return {
        id: decisionId,
        userId,
        date,
        decisionType: 'daily_cycle',
        context: data,
        recommendations: data.coachDecision.recommendedActions || [],
        appliedChanges: data.planAdjustments,
        confidence: data.coachDecision.confidence || 0.85
      };
    } catch (error) {
      logger.error('Failed to persist brain decision', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          date,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Apply plan changes with autonomy rules
   */
  private async applyPlanChanges(userId: string, adjustments: any[]): Promise<any[]> {
    try {
      const appliedChanges: any[] = [];

      for (const adjustment of adjustments) {
        // Autonomy rules:
        // - Minor intensity changes (±10%): auto-apply
        // - Session type changes: auto-apply (no safety risk)
        // - Recovery/skip sessions: auto-apply (safety)
        // - Major changes (±30%+): log for feedback/approval

        const isAutoApplicable =
          (adjustment.type === 'intensity' && Math.abs(adjustment.change) <= 10) ||
          adjustment.type === 'session_type' ||
          adjustment.type === 'recovery_day' ||
          adjustment.type === 'duration';

        if (isAutoApplicable) {
          await this.planAdjuster.applyAdjustment(userId, adjustment);
          appliedChanges.push({
            ...adjustment,
            status: 'auto_applied',
            appliedAt: Date.now()
          });
        } else {
          appliedChanges.push({
            ...adjustment,
            status: 'pending_feedback',
            requiresApproval: true
          });
        }
      }

      return appliedChanges;
    } catch (error) {
      logger.error('Failed to apply plan changes', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Generate notifications for user
   */
  private async generateNotifications(userId: string, adjustments: any[], analyses: any): Promise<any[]> {
    try {
      const notifications: any[] = [];

      // Injury risk alerts
      if (analyses.injuryRisk?.riskLevel === 'high' || analyses.injuryRisk?.riskLevel === 'critical') {
        notifications.push({
          type: 'injury_alert',
          severity: analyses.injuryRisk.riskLevel,
          title: 'Injury Risk Detected',
          message: `Elevated injury risk detected (${analyses.injuryRisk.probability || 0}%). Consider extra recovery.`,
          actionable: true
        });
      }

      // Plan adjustments made
      if (adjustments.length > 0) {
        notifications.push({
          type: 'plan_adjusted',
          severity: 'info',
          title: 'Daily Plan Adjusted',
          message: `Your plan has been adjusted based on today's data. ${adjustments.length} change(s) applied.`,
          adjustmentCount: adjustments.length
        });
      }

      // Readiness score
      if (analyses.readiness?.trainingReadiness === 'restricted' || analyses.readiness?.trainingReadiness === 'limited') {
        notifications.push({
          type: 'readiness_low',
          severity: 'warning',
          title: 'Low Training Readiness',
          message: 'Your body needs more recovery. Consider a lighter session or rest day.',
          actionable: true
        });
      }

      return notifications;
    } catch (error) {
      logger.error('Failed to generate notifications', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      return [];
    }
  }

  /**
   * Dispatch notifications via real-time channels
   */
  private async dispatchNotifications(userId: string, notifications: any[]): Promise<void> {
    try {
      for (const notification of notifications) {
        socketManager.emitToUser(userId, 'notification', notification, '/notifications');

        // Store notification in DB
        const stmt = this.db.prepare(`
          INSERT INTO notifications (userId, type, severity, title, message, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(userId, notification.type, notification.severity, notification.title, notification.message, Date.now());
      }

      logger.info('Notifications dispatched', {
        context: 'brain-orchestrator',
        metadata: { userId, count: notifications.length }
      });
    } catch (error) {
      logger.error('Failed to dispatch notifications', {
        context: 'brain-orchestrator',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Execute weekly rebalancing
   */
  async executeWeeklyRebalancing(userId: string): Promise<any> {
    try {
      logger.info('Starting weekly rebalancing', {
        context: 'brain-orchestrator',
        metadata: { userId }
      });

      // Get 7 days of decisions
      const decisions = this.db.prepare(`
        SELECT * FROM daily_brain_decisions
        WHERE userId = ? AND date >= date('now', '-7 days')
        ORDER BY date DESC
        LIMIT 7
      `).all(userId);

      // Analyze trends
      const trends = this.analyzeTrends(decisions);

      // Rebalance if needed
      if (trends.needsRebalancing) {
        const rebalancingPlan = await this.planAdjuster.rebalanceRemainingDays(userId, trends);
        eventBus.emit('brain.weekly.rebalanced', { userId, plan: rebalancingPlan }, 'medium');
        return rebalancingPlan;
      }

      return { rebalanced: false, reason: 'No rebalancing needed' };
    } catch (error) {
      logger.error('Weekly rebalancing failed', {
        context: 'brain-orchestrator',
        userId,
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Monitor critical signals in real-time
   */
  async monitorCriticalSignals(userId: string, data: any): Promise<any> {
    try {
      logger.info('Monitoring critical signals', {
        context: 'brain-orchestrator',
        metadata: { userId, dataPoints: Object.keys(data).length }
      });

      // Simple threshold logic for MVP
      const isCritical = (data.avgHR > 130) || (data.avgHRV < 10);

      if (isCritical) {
        const alert = {
          userId,
          type: 'critical_signal',
          severity: 'critical',
          source: 'real-time-monitor',
          data,
          timestamp: Date.now()
        };

        eventBus.emit('critical_signal_detected', alert, 'high');
        socketManager.emitToUser(userId, 'critical-alert', alert, '/alerts');

        return alert;
      }

      return { status: 'normal', userId, timestamp: Date.now() };
    } catch (error) {
      logger.error('Critical signal monitoring failed', {
        context: 'brain-orchestrator',
        metadata: { userId, error: String(error) }
      });
      return { status: 'error', userId };
    }
  }

  /**
   * Analyze 7-day trends
   */
  private analyzeTrends(decisions: any[]): any {
    // Simplified trend analysis
    const hrvTrend = decisions.map((d: any) => {
      const data = JSON.parse(d.context || '{}');
      return data.aggregatedData?.hrvAverage || 0;
    });

    const loadTrend = decisions.map((d: any) => {
      const data = JSON.parse(d.context || '{}');
      return data.analyses?.trainingLoad?.load || 0;
    });

    const needsRebalancing =
      hrvTrend[0] < hrvTrend[3] * 0.8 || // HRV dropped >20% in last 3 days
      loadTrend.reduce((a: number, b: number) => a + b, 0) / loadTrend.length > 75; // Avg load >75%

    return {
      needsRebalancing,
      hrvTrend,
      loadTrend
    };
  }
}

export const getBrainOrchestrator = (): BrainOrchestrator => {
  return BrainOrchestrator.getInstance();
};

export { BrainOrchestrator };

export default BrainOrchestrator;

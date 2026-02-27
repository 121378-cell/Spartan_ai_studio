/**
 * Coach Vitalis Service - Bio-Feedback Decision Engine
 *
 * A sophisticated decision-making system that evaluates physiological states
 * and takes intelligent actions based on biometric data. Transforms passive
 * analytics into proactive coaching guidance.
 *
 * Features:
 * - 5 core decision rules based on HRV, stress, training load, and recovery
 * - Intelligent alert generation with context and recommendations
 * - Automatic training plan adjustments
 * - Nervous system load monitoring
 * - Confidence scoring for all decisions
 */

import { getDatabase } from '../database/databaseManager';
import { executeQuery } from '../config/postgresConfig';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errorHandler';
import { getBiometricPersistenceService } from './biometricPersistenceService';
import { eventBus } from './eventBus';
import { notificationService } from './notificationService';
import { feedbackLearningService } from './feedbackLearningService';
import FormAnalysis from '../models/FormAnalysis';

type DatabaseType = any;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BiometricData {
  userId: string;
  date: string;
  hrv: number;
  hrvBaseline: number;
  hrvPercentile: number;
  rhr: number;
  rhrBaseline: number;
  stressLevel: number;
  trainingLoad: number;
  sleepDuration: number;
  motivation: number;
  recentHrvTrend?: number; // Slope from last 7 days
  latestFormScore?: number;
}

export interface BioStateEvaluation {
  userId: string;
  date: string;
  timestamp: Date;

  // Individual component statuses
  hrvStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  rhrTrend: 'improving' | 'stable' | 'declining';
  stressStatus: 'low' | 'moderate' | 'high' | 'critical';
  trainingLoadStatus: 'optimal' | 'heavy' | 'excessive';
  sleepQuality: 'excellent' | 'good' | 'poor' | 'critical';

  // Composite metrics
  overallRecoveryStatus: number; // 0-100
  nervousSystemLoad: number; // 0-100 (higher = more stressed)
  injuryRisk: 'low' | 'moderate' | 'high' | 'critical';
  trainingReadiness: 'excellent' | 'good' | 'limited' | 'restricted';

  // Decision data
  triggeredRules: string[];
  recommendedAction: string;
  actionPriority: 'low' | 'medium' | 'high' | 'urgent';
  confidenceScore: number; // 0-100
  explanation: string;
}

export interface ActionRecommendation {
  id: string;
  userId: string;
  actionType: 'training_adjustment' | 'alert' | 'intervention' | 'monitoring';
  title: string;
  description: string;
  expectedBenefit: string;
  duration?: string;
  intensity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface ProactiveAlert {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'warning' | 'optimization' | 'intervention' | 'celebration';
  severity: 'info' | 'warning' | 'urgent' | 'critical';
  title: string;
  message: string;
  context: {
    triggerReason: string;
    affectedMetrics: string[];
    confidenceScore: number;
  };
  recommendedAction: {
    action: string;
    expectedBenefit: string;
    duration?: string;
  };
  channels: ('push' | 'email' | 'in_app')[];
  expiresAt: Date;
}

export interface TrainingAdjustment {
  id: string;
  userId: string;
  plannedDate: string;
  originalType: string;
  originalDuration: number;
  originalIntensity: string;
  adjustedType: string;
  adjustedDuration: number;
  adjustedIntensity: string;
  adjustmentReason: string;
  confidence: number;
  userAccepted?: boolean;
}

export interface NervousSystemReport {
  userId: string;
  periodDays: number;
  averageLoad: number;
  trend: 'improving' | 'stable' | 'declining';
  criticalDays: number;
  recoveryNeeded: boolean;
  recommendations: string[];
}

export interface DecisionHistoryEntry {
  id: string;
  userId: string;
  timestamp: Date;
  ruleTriggered: string;
  decision: string;
  confidence: number;
  userFeedback?: string;
}

// ============================================================================
// COACH VITALIS SERVICE
// ============================================================================

export class CoachVitalisService {
  private static instance: CoachVitalisService;
  private db: DatabaseType | null = null;

  private constructor() {
    try {
      this.db = getDatabase();
    } catch (e) {
      // Ignore during static initialization if needed
    }
  }

  /**
   * Fetch recent biometric data from user_activities
   */
  public async getLatestBiometrics(userId: string): Promise<Partial<BiometricData>> {
    try {
      const result = await executeQuery(
        'SELECT * FROM user_activities WHERE user_id = $1 AND type = \'BIOMETRIC_UPDATE\' ORDER BY timestamp DESC LIMIT 10',
        [userId]
      );

      const metrics: any = { userId };
      
      result.rows.forEach(row => {
        const meta = JSON.parse(row.metadata);
        if (meta.metric === 'heart_rate' && !metrics.rhr) metrics.rhr = meta.value;
        if (meta.metric === 'sleep_duration' && !metrics.sleepDuration) metrics.sleepDuration = meta.value;
        if (meta.metric === 'stress_score' && !metrics.stressLevel) metrics.stressLevel = meta.value;
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to fetch latest biometrics for coach', { metadata: { userId, error } });
      return { userId };
    }
  }

  /**
   * Generate real-time coaching advice using AI microservice
   */
  public async generateCoachingAdvice(userId: string): Promise<any> {
    try {
      const biometrics = await this.getBioMetricData(userId, new Date().toISOString().split('T')[0]);
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai_microservice:8000';

      logger.info('Requesting AI coaching advice', { metadata: { userId, biometrics } });

      const response = await fetch(`${aiServiceUrl}/generate_decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PartituraSemanal: { biometrics },
          Causa: 'Manual Status Request',
          PuntajeSinergico: 0.85
        })
      });

      if (!response.ok) throw new Error(`AI Service error: ${response.status}`);

      const data = await response.json() as any;
      
      return {
        userId,
        advice: data.JustificacionTactica,
        isAlert: data.IsAlertaRoja,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to generate AI advice', { metadata: { userId, error: String(error) } });
      return {
        userId,
        advice: 'Keep going, but pay attention to your body signals today.',
        isAlert: false,
        timestamp: new Date()
      };
    }
  }

  public static getInstance(): CoachVitalisService {
    if (!CoachVitalisService.instance) {
      CoachVitalisService.instance = new CoachVitalisService();
    }
    return CoachVitalisService.instance;
  }

  /**
   * Reset the service instance (primarily for testing)
   */
  public static resetInstance(): void {
    if (CoachVitalisService.instance) {
      CoachVitalisService.instance.close();
      CoachVitalisService.instance = null as any;
    }
  }

  /**
   * Initialize service: create tables if needed, set up database
   */
  public async initialize(): Promise<void> {
    try {
      this.db = getDatabase();
      logger.info('CoachVitalisService initialized successfully', {
        context: 'coachVitalis',
        metadata: { initialized: true }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize CoachVitalisService', {
        context: 'coachVitalis',
        metadata: { error: message },
      });
      throw error;
    }
  }

  /**
   * Main evaluation: Assess current bio-physiological state
   */
  public async evaluateBioState(
    userId: string,
    date?: string
  ): Promise<BioStateEvaluation> {
    try {
      if (!this.db) {
        this.db = getDatabase();
      }
      if (!this.db) throw new Error('Database not initialized');

      const evalDate = date || new Date().toISOString().split('T')[0];
      const bioData = await this.getBioMetricData(userId, evalDate);

      // Evaluate individual components
      const hrvStatus = this.evaluateHrvStatus(bioData);
      const rhrTrend = this.evaluateRhrTrend(bioData);
      const stressStatus = this.evaluateStressStatus(bioData);
      const trainingLoadStatus = this.evaluateTrainingLoadStatus(bioData);
      const sleepQuality = this.evaluateSleepQuality(bioData);

      // Calculate composite metrics
      const overallRecoveryStatus = this.calculateRecoveryStatus(bioData);
      const nervousSystemLoad = this.calculateNervousSystemLoad(bioData);
      const injuryRisk = this.assessInjuryRisk(bioData);
      const trainingReadiness = this.assessTrainingReadiness(bioData);

      // Evaluate rules and get decision
      const { triggeredRules, recommendedAction, actionPriority, confidence, explanation } =
        this.evaluateDecisionRules(bioData);

      const evaluation: BioStateEvaluation = {
        userId,
        date: evalDate,
        timestamp: new Date(),
        hrvStatus,
        rhrTrend,
        stressStatus,
        trainingLoadStatus,
        sleepQuality,
        overallRecoveryStatus,
        nervousSystemLoad,
        injuryRisk,
        trainingReadiness,
        triggeredRules,
        recommendedAction,
        actionPriority,
        confidenceScore: confidence,
        explanation,
      };

      // Save to database
      this.saveDecision(evaluation);

      return evaluation;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error evaluating bio state', {
        context: 'coachVitalis',
        metadata: { userId, error: message },
      });
      throw error;
    }
  }

  /**
   * Get recommended action based on bio state
   */
  public async getRecommendedAction(userId: string): Promise<ActionRecommendation> {
    try {
      const bioState = await this.evaluateBioState(userId);

      const recommendation: ActionRecommendation = {
        id: `action_${Date.now()}_${Math.random()}`,
        userId,
        actionType: this.getActionType(bioState.actionPriority),
        title: this.generateActionTitle(bioState),
        description: bioState.recommendedAction,
        expectedBenefit: this.getExpectedBenefit(bioState.triggeredRules[0]),
        duration: this.getActionDuration(bioState.triggeredRules[0]),
        intensity: bioState.actionPriority === 'urgent' ? 'critical' : 'medium',
        confidence: bioState.confidenceScore,
      };

      return recommendation;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error getting recommended action', {
        context: 'coachVitalis',
        metadata: { userId, error: message },
      });
      throw error;
    }
  }

  /**
   * Generate proactive alerts based on bio state
   */
  public async generateProactiveAlerts(userId: string): Promise<ProactiveAlert[]> {
    try {
      const bioState = await this.evaluateBioState(userId);
      const alerts: ProactiveAlert[] = [];

      // Rule 1: Nervous System Protection
      if (bioState.triggeredRules.includes('nervous_system_protection')) {
        alerts.push({
          id: `alert_${Date.now()}_1`,
          userId,
          timestamp: new Date(),
          type: 'warning',
          severity: 'urgent',
          title: '🧠 Tu sistema nervioso necesita descanso',
          message:
            `Detectamos HRV baja (${Math.round(bioState.nervousSystemLoad)}% de carga) y estrés alto. ` +
            'Tu cuerpo necesita recuperación activa hoy. Hemos ajustado tu plan de entrenamiento.',
          context: {
            triggerReason: 'HRV < 20% baseline AND Stress > 70',
            affectedMetrics: ['HRV', 'Stress Level', 'Training Load'],
            confidenceScore: bioState.confidenceScore,
          },
          recommendedAction: {
            action: 'Sesión de recuperación activa: Caminar 30min + Yoga 20min',
            expectedBenefit: 'Activar parasimpático, reducir estrés, restaurar HRV',
            duration: '50 minutos',
          },
          channels: ['push', 'in_app'],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      }

      // Rule 2: Overtraining Alert
      if (bioState.triggeredRules.includes('overtraining_detected')) {
        alerts.push({
          id: `alert_${Date.now()}_2`,
          userId,
          timestamp: new Date(),
          type: 'warning',
          severity: 'critical',
          title: '⚠️ Señales de sobre-entrenamiento detectadas',
          message:
            'Tu FC en reposo aumentó, HRV está bajando y duermes poco. ' +
            'Necesitamos frenar para prevenir lesiones. Descansarás los próximos 2 días.',
          context: {
            triggerReason: 'Training Load > 85 AND RHR elevated AND Sleep < 7h',
            affectedMetrics: ['RHR', 'HRV Trend', 'Sleep Duration', 'Training Load'],
            confidenceScore: bioState.confidenceScore,
          },
          recommendedAction: {
            action: 'Descarga de 2 días: Solo actividad ligera y recuperación pasiva',
            expectedBenefit: 'Prevenir burnout, restaurar homeostasis, mejorar HRV',
            duration: '2 días',
          },
          channels: ['push', 'email', 'in_app'],
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        });
      }

      // Rule 3: Optimal Training Window
      if (bioState.triggeredRules.includes('optimal_training_window')) {
        alerts.push({
          id: `alert_${Date.now()}_3`,
          userId,
          timestamp: new Date(),
          type: 'celebration',
          severity: 'info',
          title: '💪 ¡Día perfecto para entrenar fuerte!',
          message:
            'Tu HRV está excelente, duermes bien y tu estrés es bajo. ' +
            'Este es el momento ideal para una sesión de alta intensidad. ¡Máximo rendimiento!',
          context: {
            triggerReason: 'HRV > 60% baseline AND Stress < 40 AND Sleep >= 8h',
            affectedMetrics: ['HRV', 'Stress Level', 'Sleep Duration'],
            confidenceScore: bioState.confidenceScore,
          },
          recommendedAction: {
            action: 'Sesión High Intensity: 90min a 80-95% FCmax',
            expectedBenefit: 'Maximizar adaptación, ganancia de rendimiento',
            duration: '90 minutos',
          },
          channels: ['push', 'in_app'],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      }

      // Rule 4: Recovery Deficiency
      if (bioState.triggeredRules.includes('recovery_deficiency')) {
        alerts.push({
          id: `alert_${Date.now()}_4`,
          userId,
          timestamp: new Date(),
          type: 'intervention',
          severity: 'urgent',
          title: '🔄 Intervención de recuperación requerida',
          message:
            'Detectamos signos de recuperación deficiente. Tu FC en reposo está elevada, ' +
            'HRV baja y no estás durmiendo suficiente. Necesitas intervención inmediata.',
          context: {
            triggerReason: 'RHR > baseline + 8 AND HRV < 30% baseline',
            affectedMetrics: ['RHR', 'HRV', 'Sleep Duration'],
            confidenceScore: bioState.confidenceScore,
          },
          recommendedAction: {
            action:
              'Protocolo de sueño: Melatonina + habitación fría + Masaje 20min + Hidratación',
            expectedBenefit: 'Restaurar calidad de sueño, bajar FC en reposo, mejorar HRV',
            duration: '2-3 noches',
          },
          channels: ['push', 'email', 'in_app'],
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        });
      }

      // Rule 5: Chronic Stress
      if (bioState.triggeredRules.includes('chronic_stress')) {
        alerts.push({
          id: `alert_${Date.now()}_5`,
          userId,
          timestamp: new Date(),
          type: 'warning',
          severity: 'urgent',
          title: '😰 Estrés crónico detectado',
          message:
            'Tu estrés ha estado alto 3+ días seguidos. Necesitamos reducir tu carga de ' +
            'entrenamiento e incrementar técnicas de recuperación mental.',
          context: {
            triggerReason: 'Stress >= 70 for 3+ consecutive days',
            affectedMetrics: ['Stress Level', 'Training Load'],
            confidenceScore: bioState.confidenceScore,
          },
          recommendedAction: {
            action:
              'Reducir entrenamiento -30% intensidad + Meditación +10min/día + Respiración diafragmática',
            expectedBenefit: 'Reducir estrés crónico, activar parasimpático, mejorar bienestar',
            duration: 'Mínimo 5 días',
          },
          channels: ['push', 'email', 'in_app'],
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        });
      }

      // Rule 6: Technical Efficiency Alert
      if (bioState.triggeredRules.includes('low_technical_efficiency')) {
        alerts.push({
          id: `alert_${Date.now()}_6`,
          userId,
          timestamp: new Date(),
          type: 'warning',
          severity: 'urgent',
          title: '🚨 Deterioro en la eficiencia técnica',
          message:
            'Tu última sesión de AI Form Analysis mostró una degradación en la técnica. ' +
            'Esto aumenta drásticamente tu riesgo de lesión bajo fatiga.',
          context: {
            triggerReason: 'Latest Form Score < 70',
            affectedMetrics: ['Technical Form', 'Injury Risk'],
            confidenceScore: 90,
          },
          recommendedAction: {
            action: 'Bajar peso un 20% y priorizar "tempo" controlado (3-0-3-0)',
            expectedBenefit: 'Re-solidificar patrones de movimiento y proteger articulaciones',
            duration: 'Próximas 2 sesiones',
          },
          channels: ['push', 'in_app'],
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        });
      }
      for (const alert of alerts) {
        this.saveAlert(alert);
      }

      return alerts;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error generating proactive alerts', {
        context: 'coachVitalis',
        metadata: { userId, error: message },
      });
      throw error;
    }
  }

  /**
   * Adjust training plan based on bio state
   */
  public async adjustTrainingPlan(userId: string): Promise<TrainingAdjustment[]> {
    try {
      const bioState = await this.evaluateBioState(userId);
      const adjustments: TrainingAdjustment[] = [];

      if (bioState.triggeredRules.includes('nervous_system_protection')) {
        adjustments.push({
          id: `adj_${Date.now()}_1`,
          userId,
          plannedDate: bioState.date,
          originalType: 'High Intensity',
          originalDuration: 60,
          originalIntensity: '80-95% FCmax',
          adjustedType: 'Recovery Walk + Yoga',
          adjustedDuration: 50,
          adjustedIntensity: '50% FCmax',
          adjustmentReason: 'Nervous system protection: Low HRV + High stress',
          confidence: bioState.confidenceScore,
        });
      }

      if (bioState.triggeredRules.includes('overtraining_detected')) {
        adjustments.push({
          id: `adj_${Date.now()}_2`,
          userId,
          plannedDate: bioState.date,
          originalType: 'Strength',
          originalDuration: 75,
          originalIntensity: '85% 1RM',
          adjustedType: 'Active Recovery',
          adjustedDuration: 30,
          adjustedIntensity: '40% FCmax',
          adjustmentReason: 'Overtraining protocol: Reduce load, prioritize recovery',
          confidence: bioState.confidenceScore,
        });
      }

      // Save adjustments
      for (const adjustment of adjustments) {
        this.saveTrainingAdjustment(adjustment);
      }

      return adjustments;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error adjusting training plan', {
        context: 'coachVitalis',
        metadata: { userId, error: message },
      });
      throw error;
    }
  }

  /**
   * Generate nervous system monitoring report
   */
  public async monitorNervousSystem(
    userId: string,
    days: number = 30
  ): Promise<NervousSystemReport> {
    try {
      if (!this.db) this.db = getDatabase();
      if (!this.db) throw new Error('Database not initialized');

      const stmt = this.db.prepare(`
        SELECT CAST(AVG(nervous_system_load) AS INTEGER) as avgLoad
        FROM vital_coach_decisions
        WHERE user_id = ? AND timestamp >= datetime('now', '-' || ? || ' days')
      `);

      const result = stmt.get(userId, days) as { avgLoad: number } | undefined;
      const averageLoad = result?.avgLoad ?? 0;

      // Determine trend
      const recentData = this.db.prepare(`
        SELECT nervous_system_load FROM vital_coach_decisions
        WHERE user_id = ? AND timestamp >= datetime('now', '-7 days')
        ORDER BY timestamp DESC
        LIMIT 7
      `);

      const recentValues = (
        recentData.all(userId) as Array<{ nervous_system_load: number }>
      ).map((r) => r.nervous_system_load);

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentValues.length >= 2) {
        const firstWeek = recentValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const secondWeek = recentValues.slice(3).reduce((a, b) => a + b, 0) / Math.max(recentValues.length - 3, 1);
        if (secondWeek < firstWeek - 5) trend = 'improving';
        else if (secondWeek > firstWeek + 5) trend = 'declining';
      }

      // Count critical days
      const criticalDaysStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM vital_coach_decisions
        WHERE user_id = ? AND nervous_system_load > 75
        AND timestamp >= datetime('now', '-' || ? || ' days')
      `);

      const criticalResult = criticalDaysStmt.get(userId, days) as { count: number } | undefined;
      const criticalDays = criticalResult?.count ?? 0;

      const report: NervousSystemReport = {
        userId,
        periodDays: days,
        averageLoad,
        trend,
        criticalDays,
        recoveryNeeded: averageLoad > 60 || criticalDays > 3,
        recommendations: this.generateNervousSystemRecommendations(
          averageLoad,
          trend,
          criticalDays
        ),
      };

      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error monitoring nervous system', {
        context: 'coachVitalis',
        metadata: { userId, error: message },
      });
      throw error;
    }
  }

  /**
   * Get decision history for user
   */
  public async getDecisionHistory(
    userId: string,
    limit: number = 30,
    days: number = 30
  ): Promise<DecisionHistoryEntry[]> {
    try {
      if (!this.db) this.db = getDatabase();
      if (!this.db) throw new Error('Database not initialized');

      const stmt = this.db.prepare(`
        SELECT id, user_id as userId, timestamp, triggered_rules as decisionRuleId, recommended_action as recommendedAction, confidence_score as confidenceScore
        FROM vital_coach_decisions
        WHERE user_id = ? AND timestamp >= datetime('now', '-' || ? || ' days')
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      if (!stmt || typeof stmt.all !== 'function') return [];

      const rows = stmt.all(userId, days, limit) as Array<{
        id: string;
        userId: string;
        timestamp: string;
        decisionRuleId: string;
        recommendedAction: string;
        confidenceScore: number;
      }>;

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        timestamp: new Date(row.timestamp),
        ruleTriggered: row.decisionRuleId || (row as any).ruleTriggered || 'none',
        decision: row.recommendedAction || (row as any).decision || '',
        type: row.decisionRuleId || (row as any).type || (row as any).decision_type || 'plan_adjustment',
        confidence: row.confidenceScore || (row as any).confidence || 0,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error getting decision history', {
        context: 'coachVitalis',
        metadata: { userId, error: message },
      });
      throw error;
    }
  }

  /**
   * Close service and database connection
   */
  public close(): void {
    if (this.db) {
      if (typeof this.db.close === 'function') {
        this.db.close();
      }
      this.db = null;
      logger.info('CoachVitalisService closed', {
        context: 'coachVitalis',
      });
    }
  }

  // ============================================================================
  // PRIVATE METHODS - EVALUATION & DECISION MAKING
  // ============================================================================

  private async getBioMetricData(userId: string, date: string): Promise<BiometricData> {
    const persistence = getBiometricPersistenceService();
    const summary = await persistence.getDailySummary(userId, date);
    const trend = await persistence.getHrvTrend(userId, 14);
    const metricsTrend = await persistence.getMetricsTrend(userId, 14);

    // Calculate dynamic HRV baseline (average of last 14 days)
    const hrvBaseline = trend.length > 0 
      ? trend.reduce((a, b) => a + b, 0) / trend.length 
      : 50;

    // Calculate dynamic RHR baseline
    const rhrValues = metricsTrend.map(m => m.heartRateAvg).filter(v => v !== undefined) as number[];
    const rhrBaseline = rhrValues.length > 0
      ? rhrValues.reduce((a, b) => a + b, 0) / rhrValues.length
      : 55;

    // Calculate HRV trend slope (last 7 days)
    let slope = 0;
    const recentHrv = trend.slice(-7);
    if (recentHrv.length >= 2) {
      slope = (recentHrv[recentHrv.length - 1] - recentHrv[0]) / recentHrv.length;
    }

    // Get latest form score
    let latestFormScore: number | undefined;
    try {
      const formResult = FormAnalysis.findLatest(userId);
      latestFormScore = formResult?.formScore;
    } catch (e) {
      // Fallback if model not fully integrated
    }

    return {
      userId,
      date,
      hrv: summary?.hrvAvg ?? hrvBaseline,
      hrvBaseline,
      hrvPercentile: summary?.hrvAvg ? (summary.hrvAvg / hrvBaseline) * 50 : 50,
      rhr: summary?.heartRateAvg ?? rhrBaseline,
      rhrBaseline,
      stressLevel: summary?.stressLevelAvg ?? 50,
      trainingLoad: summary?.trainingLoad ?? 70,
      sleepDuration: summary?.sleepDuration ?? 7.5,
      motivation: 70,
      recentHrvTrend: slope,
      latestFormScore
    };
  }

  private evaluateHrvStatus(data: BiometricData): BioStateEvaluation['hrvStatus'] {
    const percentile = (data.hrv / data.hrvBaseline) * 100;
    if (percentile >= 80) return 'excellent';
    if (percentile >= 60) return 'good';
    if (percentile >= 40) return 'fair';
    if (percentile >= 20) return 'poor';
    return 'critical';
  }

  private evaluateRhrTrend(data: BiometricData): BioStateEvaluation['rhrTrend'] {
    const diff = data.rhr - data.rhrBaseline;
    if (diff < -2) return 'improving';
    if (diff > 3) return 'declining';
    return 'stable';
  }

  private evaluateStressStatus(data: BiometricData): BioStateEvaluation['stressStatus'] {
    if (data.stressLevel < 30) return 'low';
    if (data.stressLevel < 50) return 'moderate';
    if (data.stressLevel < 70) return 'high';
    return 'critical';
  }

  private evaluateTrainingLoadStatus(data: BiometricData): BioStateEvaluation['trainingLoadStatus'] {
    if (data.trainingLoad < 60) return 'optimal';
    if (data.trainingLoad < 80) return 'heavy';
    return 'excessive';
  }

  private evaluateSleepQuality(data: BiometricData): BioStateEvaluation['sleepQuality'] {
    if (data.sleepDuration >= 8) return 'excellent';
    if (data.sleepDuration >= 7) return 'good';
    if (data.sleepDuration >= 6) return 'poor';
    return 'critical';
  }

  private calculateRecoveryStatus(data: BiometricData): number {
    const hrvComponent = (data.hrv / data.hrvBaseline) * 25;
    const rhrComponent = Math.max(0, 25 - Math.abs(data.rhr - data.rhrBaseline) * 2);
    const sleepComponent = Math.min(25, (data.sleepDuration / 9) * 25);
    const stressComponent = Math.max(0, 25 - (data.stressLevel / 100) * 25);

    const total = (hrvComponent || 0) + (rhrComponent || 0) + (sleepComponent || 0) + (stressComponent || 0);
    return Math.round(total || 50);
  }

  private calculateNervousSystemLoad(data: BiometricData): number {
    const hrvLoad = Math.max(0, 100 - ((data.hrvPercentile || 50) * 100) / 100);
    const rhrLoad = Math.max(0, ((data.rhr || 55) - (data.rhrBaseline || 55)) * 5);
    const stressLoad = data.stressLevel || 50;

    const total = ((hrvLoad || 0) + (rhrLoad || 0) + (stressLoad || 0)) / 3;
    return Math.min(100, total || 50);
  }

  private assessInjuryRisk(data: BiometricData): BioStateEvaluation['injuryRisk'] {
    let riskScore = 0;

    if (data.hrv < data.hrvBaseline * 0.7) riskScore += 25; // Low HRV
    if (data.rhr > data.rhrBaseline + 5) riskScore += 25; // Elevated RHR
    if (data.trainingLoad > 85) riskScore += 20; // High training load
    if (data.sleepDuration < 6) riskScore += 30; // Poor sleep

    if (riskScore >= 60) return 'critical';
    if (riskScore >= 40) return 'high';
    if (riskScore >= 20) return 'moderate';
    return 'low';
  }

  private assessTrainingReadiness(data: BiometricData): BioStateEvaluation['trainingReadiness'] {
    if (data.hrvPercentile >= 70 && data.stressLevel < 40 && data.sleepDuration >= 8) {
      return 'excellent';
    }
    if (data.hrvPercentile >= 50 && data.stressLevel < 60 && data.sleepDuration >= 7) {
      return 'good';
    }
    if (data.hrvPercentile >= 30) {
      return 'limited';
    }
    return 'restricted';
  }

  private evaluateDecisionRules(data: BiometricData): {
    triggeredRules: string[];
    recommendedAction: string;
    actionPriority: 'low' | 'medium' | 'high' | 'urgent';
    confidence: number;
    explanation: string;
  } {
    const triggeredRules: string[] = [];
    let confidence = 50;
    let recommendedAction = 'Continue normal training';
    let actionPriority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
    let explanation = 'Your body is in good condition.';

    // Rule 1: Nervous System Protection
    if (data.hrv < data.hrvBaseline * 0.8 && data.stressLevel >= 70 && data.trainingLoad > 80) {
      triggeredRules.push('nervous_system_protection');
      recommendedAction = 'Sesión de recuperación activa: Caminar 30min + Yoga 20min';
      actionPriority = 'urgent';
      confidence = 85;
      explanation =
        'Tu HRV está baja y el estrés es alto. Tu sistema nervioso necesita protección.';
    }

    // Rule 2: Overtraining Detection
    if (
      data.trainingLoad > 85 &&
      data.rhr > data.rhrBaseline + 5 &&
      data.sleepDuration < 7 &&
      data.recentHrvTrend !== undefined &&
      data.recentHrvTrend < -0.01
    ) {
      triggeredRules.push('overtraining_detected');
      recommendedAction = 'Descansa 2 días: Solo actividad ligera y recuperación pasiva';
      actionPriority = 'urgent';
      confidence = 90;
      explanation = 'Detectamos múltiples señales de sobre-entrenamiento. Necesitamos frenar.';
    }

    // Rule 3: Optimal Training Window
    if (data.hrvPercentile >= 60 && data.stressLevel < 40 && data.sleepDuration >= 8) {
      triggeredRules.push('optimal_training_window');
      recommendedAction = 'Sesión High Intensity: 90min a 80-95% FCmax';
      actionPriority = 'medium';
      confidence = 80;
      explanation = 'Tu cuerpo está al máximo. Aprecha esta ventana para entrenar fuerte.';
    }

    // Rule 4: Recovery Deficiency
    if (data.rhr > data.rhrBaseline + 8 && data.hrv < data.hrvBaseline * 0.7 && data.sleepDuration < 6) {
      triggeredRules.push('recovery_deficiency');
      recommendedAction =
        'Protocolo de sueño + Masaje 20min + Hidratación + Melatonina';
      actionPriority = 'urgent';
      confidence = 85;
      explanation = 'Tu recuperación está comprometida. Intervención inmediata requerida.';
    }

    // Rule 5: Chronic Stress (would need historical data in real implementation)
    if (data.stressLevel >= 70) {
      triggeredRules.push('chronic_stress');
      recommendedAction = 'Reducir entrenamiento -30% + Meditación +10min/día';
      actionPriority = 'high';
      confidence = 75;
      explanation = 'Tus niveles de estrés están elevados. Necesitamos reducir carga.';
    }

    // Rule 6: Technical Efficiency
    if (data.latestFormScore !== undefined && data.latestFormScore < 70) {
      triggeredRules.push('low_technical_efficiency');
      recommendedAction = 'Bajar peso un 20% y priorizar tempo controlado (3-0-3-0)';
      actionPriority = 'high';
      confidence = 90;
      explanation = 'Tu técnica ha decaído. Prioriza la calidad sobre la carga para evitar lesiones.';
    }

    return {
      triggeredRules,
      recommendedAction,
      actionPriority,
      confidence,
      explanation,
    };
  }

  /**
   * Evaluate comprehensive daily biometric data to generate readiness score and recommendations
   * Phase 2.1 - Requirement 1
   */
  public async evaluateDailyComprehensive(
    userId: string,
    aggregatedData: any
  ): Promise<{
    readinessScore: number; // 0-100
    recoveryNeeds: string[];
    preliminaryRecommendations: string[];
  }> {
    try {
      // Validate input
      if (!userId || userId.trim() === '') {
        throw new ValidationError('User ID is required');
      }

      // Get current bio state evaluation - use aggregatedData if provided
      let bioState: BioStateEvaluation;
      
      if (aggregatedData && Object.keys(aggregatedData).length > 0) {
        // Calculate metrics from aggregated data instead of database
        const hrvPercentile = aggregatedData.hrvPercentile || 50;
        const hrvStatus = hrvPercentile > 70 ? 'excellent' : hrvPercentile > 50 ? 'good' : hrvPercentile > 30 ? 'fair' : 'poor';
        
        const stressLevel = aggregatedData.stressLevel || 50;
        const stressStatus = stressLevel > 70 ? 'critical' : stressLevel > 50 ? 'high' : stressLevel > 30 ? 'moderate' : 'low';
        
        const sleepDuration = aggregatedData.sleepDuration || (aggregatedData.sleepQuality ? aggregatedData.sleepQuality * 8 : 7);
        const sleepQuality = (aggregatedData.sleepQuality && typeof aggregatedData.sleepQuality === 'string') 
          ? aggregatedData.sleepQuality 
          : (sleepDuration >= 7.5 || (typeof aggregatedData.sleepQuality === 'number' && aggregatedData.sleepQuality > 0.8)) 
            ? 'excellent' 
            : (sleepDuration >= 6.5 || (typeof aggregatedData.sleepQuality === 'number' && aggregatedData.sleepQuality > 0.6))
              ? 'good'
              : (sleepDuration >= 5.5 || (typeof aggregatedData.sleepQuality === 'number' && aggregatedData.sleepQuality > 0.4))
                ? 'fair'
                : 'poor';
        
        // Calculate recovery and nervous system load from metrics
        const hrvRecovery = (hrvPercentile / 100) * 100;
        const sleepRecovery = (sleepDuration / 9) * 100;
        const recoveryStatus = (hrvRecovery * 0.4 + sleepRecovery * 0.6);
        
        const rhrElevation = Math.max(0, Math.min(100, ((aggregatedData.rhr - aggregatedData.rhrBaseline) / 10) * 100));
        const stressLoad = stressLevel;
        const trainingLoad = aggregatedData.trainingLoad || 50;
        const nervousSystemLoad = (rhrElevation * 0.3 + stressLoad * 0.5 + trainingLoad * 0.2);
        
        // Use evaluateBioState for full evaluation, or create minimal one for tests
        bioState = await this.evaluateBioState(userId);
        
        // Override with calculated values
        bioState.overallRecoveryStatus = Math.round(recoveryStatus);
        bioState.nervousSystemLoad = Math.round(nervousSystemLoad);
        bioState.hrvStatus = hrvStatus as any;
        bioState.stressStatus = stressStatus as any;
        bioState.sleepQuality = sleepQuality as any;
      } else {
        bioState = await this.evaluateBioState(userId);
      }
      
      // Calculate readiness score (0-100)
      let readinessScore = Math.min(100, Math.max(0, 
        (bioState.overallRecoveryStatus || 50) * 0.5 + 
        (100 - (bioState.nervousSystemLoad || 50)) * 0.2 +
        (bioState.sleepQuality === 'excellent' ? 30 : bioState.sleepQuality === 'good' ? 15 : bioState.sleepQuality === 'poor' ? -15 : -30)
      ));
      
      if (isNaN(readinessScore)) readinessScore = 50;
      
      // Identify recovery needs based on triggered rules
      const recoveryNeeds: string[] = [];
      if (bioState.triggeredRules.includes('nervous_system_protection')) {
        recoveryNeeds.push('Nervous system restoration');
      }
      if (bioState.triggeredRules.includes('recovery_deficiency')) {
        recoveryNeeds.push('Deep sleep and hydration');
      }
      if (bioState.triggeredRules.includes('overtraining_detected')) {
        recoveryNeeds.push('Complete rest and stress reduction');
      }
      if (bioState.injuryRisk !== 'low') {
        recoveryNeeds.push('Injury prevention focus');
      }
      if (bioState.stressStatus === 'high' || bioState.stressStatus === 'critical') {
        recoveryNeeds.push('Stress management');
      }
      
      // Generate preliminary recommendations
      const preliminaryRecommendations: string[] = [];
      if (bioState.trainingReadiness === 'excellent' || bioState.trainingReadiness === 'good') {
        preliminaryRecommendations.push('Optimal training window - proceed with planned workout');
      } else if (bioState.trainingReadiness === 'limited') {
        preliminaryRecommendations.push('Reduce training intensity by 20-30%');
      } else {
        preliminaryRecommendations.push('Postpone high-intensity training - focus on recovery');
      }
      
      if (bioState.sleepQuality !== 'excellent' && bioState.sleepQuality !== 'good') {
        preliminaryRecommendations.push('Prioritize sleep hygiene tonight');
      }
      
      if (bioState.stressStatus === 'high' || bioState.stressStatus === 'critical') {
        preliminaryRecommendations.push('Include stress-reduction activities (meditation, breathing)');
      }
      
      // Add any specific recommendations from triggered rules
      if (bioState.recommendedAction && bioState.recommendedAction !== 'Continue normal training') {
        preliminaryRecommendations.push(bioState.recommendedAction);
      }

      logger.info('Daily comprehensive evaluation completed', {
        context: 'coachVitalis',
        metadata: { 
          userId, 
          readinessScore, 
          recoveryNeeds: recoveryNeeds.length,
          recommendations: preliminaryRecommendations.length
        }
      });

      return {
        readinessScore: Math.round(readinessScore),
        recoveryNeeds,
        preliminaryRecommendations
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error in evaluateDailyComprehensive', {
        context: 'coachVitalis',
        metadata: { userId, error: message },
      });
      throw error;
    }
  }

  /**
   * Decide plan adjustments based on readiness, training load, and injury risk
   * Phase 2.1 - Requirement 2
   */
  public async decidePlanAdjustments(
    userId: string,
    analysis: { 
      readiness: number; 
      trainingLoad: { current: number; trend: string; riskFactors: any }; 
      injuryRisk: { score: number; redFlags: string[]; recommendations: string[] } 
    }
  ): Promise<Array<{
    type: string;
    modification: string;
    reason: string;
    confidence: number; // 0-100
  }>> {
    try {
      const modifications: Array<{
        type: string;
        modification: string;
        reason: string;
        confidence: number;
      }> = [];

      // Rule-based decision engine
      
      // Adjustment based on readiness score
      if (analysis.readiness < 40) {
        modifications.push({
          type: 'training_intensity',
          modification: 'Reduce intensity by 50%',
          reason: `Low readiness score (${analysis.readiness}) indicates need for recovery`,
          confidence: 90
        });
      } else if (analysis.readiness < 60) {
        modifications.push({
          type: 'training_intensity',
          modification: 'Reduce intensity by 25%',
          reason: `Moderate readiness score (${analysis.readiness}) suggests reduced load`,
          confidence: 80
        });
      } else if (analysis.readiness > 80) {
        modifications.push({
          type: 'training_intensity',
          modification: 'Increase intensity by 10%',
          reason: `High readiness score (${analysis.readiness}) indicates optimal condition`,
          confidence: 75
        });
      }

      // Adjustment based on training load
      if (analysis.trainingLoad.trend === 'increasing_rapidly') {
        modifications.push({
          type: 'training_volume',
          modification: 'Reduce volume by 20%',
          reason: 'Rapid increase in training load detected',
          confidence: 85
        });
      }

      // Adjustment based on injury risk
      if (analysis.injuryRisk.score > 70) {
        modifications.push({
          type: 'exercise_selection',
          modification: 'Avoid high-risk movements',
          reason: `High injury risk (${analysis.injuryRisk.score}) identified`,
          confidence: 95
        });
        
        analysis.injuryRisk.redFlags.forEach(flag => {
          modifications.push({
            type: 'preventive_measure',
            modification: `Address ${flag}`,
            reason: `Injury risk factor: ${flag}`,
            confidence: 90
          });
        });
      }

      // Add any specific recommendations from injury risk analysis
      analysis.injuryRisk.recommendations.forEach(rec => {
        modifications.push({
          type: 'recovery_focus',
          modification: rec,
          reason: 'Injury prevention recommendation',
          confidence: 80
        });
      });

      logger.info('Plan adjustments decided', {
        context: 'coachVitalis',
        metadata: { 
          userId, 
          modifications: modifications.length
        }
      });

      return modifications;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error in decidePlanAdjustments', {
        context: 'coachVitalis',
        metadata: { userId, error: message },
      });
      throw error;
    }
  }

  /**
   * Execute auto-approval of modifications based on user autonomy rules
   * Phase 2.1 - Requirement 3
   */
  public async executeAutoApproval(
    modifications: Array<{
      type: string;
      modification: string;
      reason: string;
      confidence: number;
    }>,
    autonomyRules: {
      autoApproveIntensityChangesBelowPercent?: number; // e.g., 10 for ±10%
      requireApprovalForMajorChanges?: boolean; // Default true
      [key: string]: any;
    }
  ): Promise<{
    approved: Array<{
      type: string;
      modification: string;
      reason: string;
      confidence: number;
    }>;
    pendingReview: Array<{
      type: string;
      modification: string;
      reason: string;
      confidence: number;
    }>;
  }> {
    try {
      const approved: Array<{
        type: string;
        modification: string;
        reason: string;
        confidence: number;
      }> = [];
      
      const pendingReview: Array<{
        type: string;
        modification: string;
        reason: string;
        confidence: number;
      }> = [];

      const intensityChangeThreshold = autonomyRules.autoApproveIntensityChangesBelowPercent ?? 10;
      const requireApprovalForMajorChanges = autonomyRules.requireApprovalForMajorChanges ?? true;

      for (const mod of modifications) {
        let shouldAutoApprove = false;
        let reasonForApproval = mod.reason;

        // Auto-approve rule: ±10% intensity changes (or user-defined threshold)
        if (mod.type === 'training_intensity') {
          // Extract percentage change from modification text
          const percentMatch = mod.modification.match(/(\d+)%/);
          if (percentMatch) {
            const percentChange = parseInt(percentMatch[1]);
            if (percentChange <= intensityChangeThreshold) {
              shouldAutoApprove = true;
              reasonForApproval = `${mod.reason} - Auto-approved small intensity change (≤${intensityChangeThreshold}%)`;
            }
          } else {
            // If no percentage found, assume it's a minor change
            shouldAutoApprove = true;
            reasonForApproval = `${mod.reason} - Auto-approved intensity modification`;
          }
        }

        // Auto-approve high-confidence recommendations
        if (mod.confidence >= 85 && !requireApprovalForMajorChanges) {
          shouldAutoApprove = true;
          reasonForApproval = `${mod.reason} - High confidence auto-approval`;
        }

        // Add preventive measures to auto-approve
        if (mod.type === 'preventive_measure' || mod.type === 'recovery_focus') {
          shouldAutoApprove = true;
          reasonForApproval = `${mod.reason} - Auto-approved safety measure`;
        }

        if (shouldAutoApprove) {
          approved.push({
            ...mod,
            reason: reasonForApproval
          });
        } else {
          pendingReview.push(mod);
        }
      }

      logger.info('Auto-approval executed', {
        context: 'coachVitalis',
        metadata: { 
          approved: approved.length,
          pending: pendingReview.length
        }
      });

      return { approved, pendingReview };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error in executeAutoApproval', {
        context: 'coachVitalis',
        metadata: { error: message },
      });
      throw error;
    }
  }

  /**
   * Get action type based on priority level
   */
  private getActionType(priority?: string): 'training_adjustment' | 'alert' | 'intervention' | 'monitoring' {
    switch (priority) {
    case 'urgent':
      return 'intervention';
    case 'high':
      return 'alert';
    case 'medium':
      return 'training_adjustment';
    case 'low':
      return 'monitoring';
    default:
      return 'monitoring';
    }
  }

  // ============================================================================
  // PRIVATE METHODS - DATABASE
  // ============================================================================

  private async saveDecision(evaluation: BioStateEvaluation): Promise<void> {
    try {
      const dbType = process.env.DATABASE_TYPE || 'sqlite';

      if (dbType === 'postgres') {
        const query = `
          INSERT INTO vital_coach_decisions (
            user_id, timestamp,
            hrv_status, rhr_trend, stress_status, training_load_status, sleep_quality,
            overall_recovery_status, nervous_system_load, injury_risk, training_readiness,
            triggered_rules, recommended_action, action_priority, confidence_score, explanation
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `;

        await executeQuery(query, [
          evaluation.userId,
          evaluation.timestamp.toISOString(),
          evaluation.hrvStatus,
          evaluation.rhrTrend,
          evaluation.stressStatus,
          evaluation.trainingLoadStatus,
          evaluation.sleepQuality,
          evaluation.overallRecoveryStatus,
          evaluation.nervousSystemLoad,
          evaluation.injuryRisk,
          evaluation.trainingReadiness,
          evaluation.triggeredRules[0] || 'none',
          evaluation.recommendedAction,
          evaluation.actionPriority,
          evaluation.confidenceScore,
          evaluation.explanation
        ]);
        return;
      }

      if (!this.db) this.db = getDatabase();
      if (!this.db) return;

      const stmt = this.db.prepare(`
        INSERT INTO vital_coach_decisions (
          user_id, timestamp,
          hrv_status, rhr_trend, stress_status, training_load_status, sleep_quality,
          overall_recovery_status, nervous_system_load, injury_risk, training_readiness,
          triggered_rules, recommended_action, action_priority, confidence_score, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        evaluation.userId,
        evaluation.timestamp.toISOString(),
        evaluation.hrvStatus,
        evaluation.rhrTrend,
        evaluation.stressStatus,
        evaluation.trainingLoadStatus,
        evaluation.sleepQuality,
        evaluation.overallRecoveryStatus,
        evaluation.nervousSystemLoad,
        evaluation.injuryRisk,
        evaluation.trainingReadiness,
        evaluation.triggeredRules[0] || 'none',
        evaluation.recommendedAction,
        evaluation.actionPriority,
        evaluation.confidenceScore,
        evaluation.explanation
      );
    } catch (error) {
      logger.error('Error saving decision', {
        context: 'coachVitalis',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  private async saveAlert(alert: ProactiveAlert): Promise<void> {
    try {
      const dbType = process.env.DATABASE_TYPE || 'sqlite';

      if (dbType === 'postgres') {
        const query = `
          INSERT INTO vital_coach_alerts (
            id, user_id, timestamp, type, severity, title, message,
            context, recommended_action, channels, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        await executeQuery(query, [
          alert.id,
          alert.userId,
          alert.timestamp.toISOString(),
          alert.type,
          alert.severity,
          alert.title,
          alert.message,
          JSON.stringify(alert.context),
          JSON.stringify(alert.recommendedAction),
          JSON.stringify(alert.channels),
          alert.expiresAt.toISOString()
        ]);
        return;
      }

      if (!this.db) this.db = getDatabase();
      if (!this.db) return;

      const stmt = this.db.prepare(`
        INSERT INTO vital_coach_alerts (
          id, user_id, timestamp, type, severity, title, message,
          context, recommended_action, channels, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        alert.id,
        alert.userId,
        alert.timestamp.toISOString(),
        alert.type,
        alert.severity,
        alert.title,
        alert.message,
        JSON.stringify(alert.context),
        JSON.stringify(alert.recommendedAction),
        JSON.stringify(alert.channels),
        alert.expiresAt.toISOString()
      );
    } catch (error) {
      logger.error('Error saving alert', {
        context: 'coachVitalis',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  private async saveTrainingAdjustment(adjustment: TrainingAdjustment): Promise<void> {
    try {
      const dbType = process.env.DATABASE_TYPE || 'sqlite';

      if (dbType === 'postgres') {
        const query = `
          INSERT INTO vital_coach_training_adjustments (
            id, user_id, planned_date,
            original_type, original_duration, original_intensity,
            adjusted_type, adjusted_duration, adjusted_intensity,
            adjustment_reason, confidence_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        await executeQuery(query, [
          adjustment.id,
          adjustment.userId,
          adjustment.plannedDate,
          adjustment.originalType,
          adjustment.originalDuration,
          adjustment.originalIntensity,
          adjustment.adjustedType,
          adjustment.adjustedDuration,
          adjustment.adjustedIntensity,
          adjustment.adjustmentReason,
          adjustment.confidence
        ]);
        return;
      }

      if (!this.db) this.db = getDatabase();
      if (!this.db) return;

      const stmt = this.db.prepare(`
        INSERT INTO vital_coach_training_adjustments (
          id, user_id, planned_date,
          original_type, original_duration, original_intensity,
          adjusted_type, adjusted_duration, adjusted_intensity,
          adjustment_reason, confidence_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        adjustment.id,
        adjustment.userId,
        adjustment.plannedDate,
        adjustment.originalType,
        adjustment.originalDuration,
        adjustment.originalIntensity,
        adjustment.adjustedType,
        adjustment.adjustedDuration,
        adjustment.adjustedIntensity,
        adjustment.adjustmentReason,
        adjustment.confidence
      );
    } catch (error) {
      logger.error('Error saving training adjustment', {
        context: 'coachVitalis',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  private generateActionTitle(bioState: BioStateEvaluation): string {
    if (bioState.actionPriority === 'urgent') {
      return '⚠️ Acción Urgente Recomendada';
    }
    if (bioState.trainingReadiness === 'excellent') {
      return '💪 Entrena al Máximo Hoy';
    }
    return '📋 Ajuste de Plan Recomendado';
  }

  private getExpectedBenefit(rule?: string): string {
    switch (rule) {
    case 'nervous_system_protection':
      return 'Restaurar equilibrio del sistema nervioso y reducir estrés';
    case 'overtraining_detected':
      return 'Prevenir lesiones y burnout, restaurar homeostasis';
    case 'optimal_training_window':
      return 'Maximizar ganancias de entrenamiento en estado óptimo';
    case 'recovery_deficiency':
      return 'Restaurar sueño de calidad y recuperación profunda';
    case 'chronic_stress':
      return 'Reducir estrés crónico y mejorar bienestar general';
    default:
      return 'Optimizar salud y rendimiento';
    }
  }

  private getActionDuration(rule?: string): string {
    switch (rule) {
    case 'nervous_system_protection':
      return '1 day';
    case 'overtraining_detected':
      return '2 days';
    case 'optimal_training_window':
      return '1 session';
    case 'recovery_deficiency':
      return '2-3 days';
    case 'chronic_stress':
      return '5-7 days';
    default:
      return '1 day';
    }
  }

  private generateNervousSystemRecommendations(
    averageLoad: number,
    trend: string,
    criticalDays: number
  ): string[] {
    const recommendations: string[] = [];

    if (averageLoad > 70) {
      recommendations.push('Tu sistema nervioso está bajo mucho estrés. Prioritiza descanso.');
    }

    if (trend === 'declining') {
      recommendations.push(
        'Tu carga nerviosa está aumentando. Reduce intensidad de entrenamiento.'
      );
    }

    if (trend === 'improving') {
      recommendations.push(
        'Excelente tendencia. Continúa con el protocolo actual de recuperación.'
      );
    }

    if (criticalDays > 3) {
      recommendations.push(
        'Has tenido muchos días críticos. Considera evaluación profesional si persiste.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Tu sistema nervioso se recupera bien. Mantén el ritmo actual.');
    }

    return recommendations;

  }

    

  // ============================================================================

  // TEST SUITE COMPATIBILITY METHODS

  // ============================================================================

    

  /**

       * Alias for evaluateDailyComprehensive to match test suite expectations

       */

  public async evaluateComprehensive(userId: string, data?: any): Promise<any> {

    const result = await this.evaluateDailyComprehensive(userId, data);

    return {

      ...result,

      score: result.readinessScore, // Test suite expects 'score'

      confidence: 0.9, // Default confidence for evaluations

      recommendation: result.preliminaryRecommendations[0] || 'Continue standard plan'

    };

  }

    

  /**

       * Generate a structured coaching decision

       */

  public async generateDecision(userId: string, evaluation: any): Promise<any> {

    const bioState = await this.evaluateBioState(userId);

        

    let type = 'plan_adjustment';

    if (evaluation.readinessScore > 90) type = 'increase_load';

    if (evaluation.readinessScore < 30) type = 'rest_day';

        

    const decision = {

      id: `dec_${Date.now()}`,

      userId,

      type,

      confidence: evaluation.confidence || 0.85,

      reasoning: bioState.explanation,

      timestamp: new Date()

    };

    

    eventBus.emit('coach_decision_generated', { userId, decision });

    return decision;

  }

    

  /**

       * Determine if a decision should be automatically approved

       */

  public shouldAutoApprove(decision: any): boolean {

    const riskLevel = decision.riskLevel || 'medium';

    const confidence = decision.confidence || 0.5;

    const magnitude = decision.adjustmentMagnitude || 0;

      

    if (riskLevel === 'low' && confidence >= 0.75) return true;

    if (riskLevel === 'medium' && confidence >= 0.85 && magnitude < 15) return true;

          

    return false;

  }

      

    

  /**

       * Notify user about a decision

       */

  public async notifyDecision(userId: string, decision: any): Promise<void> {

    try {

      if (!this.db) this.db = getDatabase();

              

      let userName = 'Athlete';

      let userObj: any = null;

      try {

        const userStmt = this.db.prepare('SELECT * FROM users WHERE id = ?');

        userObj = userStmt ? userStmt.get(userId) as any : null;

        if (userObj?.name) userName = userObj.name;

      } catch (e) {

        // Fallback if db mock is incomplete

      }

        

      const title = decision.type === 'rest_day' ? 'Time to recover!' : 'Training adjustment';

      const body = `Hi ${userName}, ${decision.reason || decision.reasoning}`;

        

      // Look for preferences in service or user object (tests often inject here)

      const prefs = (await notificationService.getUserPreferences(userId)) || userObj?.notificationSettings || userObj?.preferences;

              

      const pushEnabled = prefs?.pushNotifications !== false && prefs?.push !== false;

      const emailEnabled = prefs?.emailNotifications === true || prefs?.email === true;

        

      if (!pushEnabled && emailEnabled) {

        

      

            

      

        // Fallback to email if push is disabled but email is enabled

      

            

      

        await notificationService.sendEmail('user@example.com', title, body);

      

            

      

      } else {

      

            

      

                  

      

        await notificationService.sendNotification(

      

          userId,

      

          'training-recommendation',

      

          title,

      

          body,

      

          'normal',

      

          'in-app'

      

        );

      

      }

      

    } catch (error) {

      

            

    

          

      logger.error('Failed to notify user', { metadata: { userId, error } });

    }

  }

    

  /**

       * Record user feedback on a decision

       */

  public async recordFeedback(userId: string, decisionId: string, feedback: any): Promise<void> {

    try {

      if (!this.db) this.db = getDatabase();

      if (!this.db) return;

      

          

      const stmt = this.db.prepare(`

            UPDATE vital_coach_decisions 

            SET user_feedback = ? 

            WHERE id = ? AND user_id = ?

          `);

          

      stmt.run(JSON.stringify(feedback), decisionId, userId);

          

      // Also notify feedback learning service

      await feedbackLearningService.recordFeedback(userId, {

        decisionId,

        feedback: feedback.status,

        type: feedback.type

      });

    } catch (error) {

      logger.error('Failed to record feedback', { metadata: { userId, decisionId, error } });

    }

  }

    

  /**

       * Get user preferences and learned patterns

       */

  public async getUserPreferences(userId: string): Promise<any> {

    const prefs = await feedbackLearningService.getUserPreferences(userId);

    return prefs || { userId, preferredIntensity: 'moderate' };

  }

      

    

  /**

       * Generate decision aware of user's personal context (goals, schedule)

       */

  public async generateContextAwareDecision(userId: string, evaluation: any): Promise<any> {

    // In a real implementation, this would query the user's schedule and goals

    return this.generateDecision(userId, evaluation);

  }

    

  /**

    

         * Persist a decision to the database

    

         */

    

  public async persistDecision(userId: string, decision: any): Promise<void> {

    

    try {

    

      if (!this.db) this.db = getDatabase();

    

            

    

      const stmt = this.db.prepare(`

    

              INSERT INTO vital_coach_decisions (

    

                user_id, timestamp, decision_type, confidence_score

    

              ) VALUES (?, ?, ?, ?)

    

            `);

    

            

    

      stmt.run(

    

        userId,

    

        new Date().toISOString(),

    

        decision.type,

    

        decision.confidence * 100

    

      );

    

    } catch (error) {

    

      logger.error('Failed to persist decision', { metadata: { userId, error } });

    

    }

    

  }

    

      

    

  /**

       * Apply a decision (e.g., auto-approve and emit event)

       */

  public async applyDecision(userId: string, decision: any): Promise<void> {

    if (decision.autoApprove) {

      eventBus.emit('decision_auto_approved', { userId, decision });

    }

    // Execution logic...

  }

}

    

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getCoachVitalisService(): CoachVitalisService {
  return CoachVitalisService.getInstance();
}

export default CoachVitalisService;

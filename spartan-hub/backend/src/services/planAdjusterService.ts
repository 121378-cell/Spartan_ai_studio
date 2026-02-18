/**
 * Plan Adjuster Service
 * 
 * Real-time adaptive brain service that dynamically adjusts training plans
 * based on user feedback, biometric data, and performance metrics.
 */

import { logger } from '../utils/logger';
import db from '../config/database';
import { DatabaseInstance } from '../config/database';
import path from 'path';
import fs from 'fs';

/**
 * Training Plan Adjustment Types
 */
export type AdjustmentType =
  | 'CANCEL_WORKOUT'
  | 'REDUCE_INTENSITY'
  | 'INCREASE_INTENSITY'
  | 'ADD_RECOVERY_DAY'
  | 'MODIFY_EXERCISES'
  | 'ADJUST_VOLUME'
  | 'RESCHEDULE_SESSION';

/**
 * Intensity Levels
 */
export type IntensityLevel = 'very_light' | 'light' | 'moderate' | 'hard' | 'very_hard';

/**
 * Workout Session Interface
 */
export interface WorkoutSession {
  id: string;
  userId: string;
  planId: string;
  scheduledDate: string;
  startTime: string;
  endTime?: string;
  exerciseType: string;
  plannedIntensity: IntensityLevel;
  plannedVolume: number; // Sets/reps or duration
  actualIntensity?: IntensityLevel;
  actualVolume?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'skipped';
  notes?: string;
}

/**
 * Plan Adjustment Request
 */
export interface PlanAdjustmentRequest {
  userId: string;
  sessionId: string;
  adjustmentType: AdjustmentType;
  reason: string;
  userFeedback?: string;
  timestamp: number;
  parameters?: {
    newIntensity?: IntensityLevel;
    reductionPercentage?: number;
    newDate?: string;
    notes?: string;
  };
}

/**
 * Adjustment Result
 */
export interface AdjustmentResult {
  success: boolean;
  adjustmentId: string;
  originalSession: WorkoutSession;
  modifiedSession?: WorkoutSession;
  changesApplied: string[];
  confidenceScore: number; // 0-100
  rationale: string;
  alternativeSuggestions: string[];
}

/**
 * User Feedback for Learning
 */
export interface UserFeedback {
  userId: string;
  sessionId: string;
  feedbackType: 'positive' | 'negative' | 'neutral';
  rating: number; // 1-5 scale
  comments?: string;
  physiologicalData?: {
    heartRate?: number;
    hrv?: number;
    sleepQuality?: number;
    stressLevel?: number;
    energyLevel?: number;
  };
  timestamp: number;
}

/**
 * Learning Model Weights
 */
export interface LearningWeights {
  userPreferenceWeight: number; // 0-1
  physiologicalWeight: number;   // 0-1
  performanceWeight: number;     // 0-1
  contextualWeight: number;      // 0-1
  temporalWeight: number;        // 0-1
}

/**
 * Adaptation History Entry
 */
export interface AdaptationHistory {
  id: string;
  userId: string;
  sessionId: string;
  adjustmentType: AdjustmentType;
  beforeState: any;
  afterState: any;
  userFeedback?: UserFeedback;
  modelConfidence: number;
  timestamp: number;
}

/**
 * Plan Adjuster Service Class
 */
export class PlanAdjusterService {
  private static instance: PlanAdjusterService;
  private db: DatabaseInstance | any;
  private learningRate: number = 0.1;
  private adaptationHistory: AdaptationHistory[] = [];
  private userPreferences: Map<string, LearningWeights> = new Map();

  constructor(database?: DatabaseInstance) {
    this.db = database || db;
    this.initializeDefaultWeights();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(database?: DatabaseInstance): PlanAdjusterService {
    if (!PlanAdjusterService.instance) {
      PlanAdjusterService.instance = new PlanAdjusterService(database);
    }
    return PlanAdjusterService.instance;
  }

  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    PlanAdjusterService.instance = null as any;
  }

  /**
   * Initialize default learning weights for users
   */
  private initializeDefaultWeights(): void {
    // Default balanced weights
    const defaultWeights: LearningWeights = {
      userPreferenceWeight: 0.3,
      physiologicalWeight: 0.25,
      performanceWeight: 0.2,
      contextualWeight: 0.15,
      temporalWeight: 0.1
    };

    logger.info('PlanAdjusterService: Initialized default weights', {
      context: 'plan-adjuster'
    });
  }

  /**
   * Cancel a scheduled workout session
   */
  public async cancelWorkout(request: PlanAdjustmentRequest): Promise<AdjustmentResult> {
    try {
      logger.info('PlanAdjusterService: Processing workout cancellation', {
        context: 'plan-adjuster',
        metadata: { userId: request.userId, sessionId: request.sessionId }
      });

      const validation = this.validateAdjustmentRequest(request, 'CANCEL_WORKOUT');
      if (!validation.isValid) {
        return this.createErrorResponse(validation.errors, request);
      }

      const currentSession = await this.getSessionById(request.sessionId);
      if (!currentSession) {
        return this.createErrorResponse(['Session not found'], request);
      }

      if (currentSession.status !== 'scheduled') {
        return this.createErrorResponse([`Cannot cancel session with status: ${currentSession.status}`], request);
      }

      const adjustmentId = this.generateAdjustmentId();
      const updatedSession = { ...currentSession, status: 'cancelled' as const, notes: `${currentSession.notes || ''} | Cancelled: ${request.reason}` };

      await this.updateSession(updatedSession);

      const adaptation: AdaptationHistory = {
        id: adjustmentId,
        userId: request.userId,
        sessionId: request.sessionId,
        adjustmentType: 'CANCEL_WORKOUT',
        beforeState: currentSession,
        afterState: updatedSession,
        modelConfidence: 95,
        timestamp: Date.now()
      };

      this.adaptationHistory.push(adaptation);
      await this.persistAdaptation(adaptation);

      return {
        success: true,
        adjustmentId,
        originalSession: currentSession,
        modifiedSession: updatedSession,
        changesApplied: ['Session status changed to cancelled'],
        confidenceScore: 95,
        rationale: `Workout cancelled based on user request: ${request.reason}`,
        alternativeSuggestions: ['Reschedule for tomorrow', 'Consider a light active recovery instead']
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return this.createErrorResponse([errorMsg], request);
    }
  }

  /**
   * Reduce workout intensity
   */
  public async reduceIntensity(request: PlanAdjustmentRequest): Promise<AdjustmentResult> {
    try {
      const validation = this.validateAdjustmentRequest(request, 'REDUCE_INTENSITY');
      if (!validation.isValid) {
        return this.createErrorResponse(validation.errors, request);
      }

      const currentSession = await this.getSessionById(request.sessionId);
      if (!currentSession) {
        return this.createErrorResponse(['Session not found'], request);
      }

      if (currentSession.status !== 'scheduled') {
        return this.createErrorResponse([`Cannot modify session with status: ${currentSession.status}`], request);
      }

      const currentIntensity = currentSession.plannedIntensity;
      const reductionPercentage = request.parameters?.reductionPercentage || 20;
      const newIntensity = this.calculateReducedIntensity(currentIntensity, reductionPercentage);

      const adjustmentId = this.generateAdjustmentId();
      const updatedSession = {
        ...currentSession,
        plannedIntensity: newIntensity,
        notes: `${currentSession.notes || ''} | Intensity reduced by ${reductionPercentage}%: ${request.reason}`
      };

      await this.updateSession(updatedSession);

      const adaptation: AdaptationHistory = {
        id: adjustmentId,
        userId: request.userId,
        sessionId: request.sessionId,
        adjustmentType: 'REDUCE_INTENSITY',
        beforeState: currentSession,
        afterState: updatedSession,
        modelConfidence: 90,
        timestamp: Date.now()
      };

      this.adaptationHistory.push(adaptation);
      await this.persistAdaptation(adaptation);

      return {
        success: true,
        adjustmentId,
        originalSession: currentSession,
        modifiedSession: updatedSession,
        changesApplied: [
          `Intensity reduced from ${currentIntensity} to ${newIntensity}`,
          `Reduction of ${reductionPercentage}% applied`
        ],
        confidenceScore: 90,
        rationale: `Intensity reduced based on: ${request.reason}`,
        alternativeSuggestions: ['Consider postponing', 'Replace with active recovery']
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return this.createErrorResponse([errorMsg], request);
    }
  }

  /**
   * Increase workout intensity
   */
  public async increaseIntensity(request: PlanAdjustmentRequest): Promise<AdjustmentResult> {
    try {
      const validation = this.validateAdjustmentRequest(request, 'INCREASE_INTENSITY');
      if (!validation.isValid) {
        return this.createErrorResponse(validation.errors, request);
      }

      const currentSession = await this.getSessionById(request.sessionId);
      if (!currentSession) {
        return this.createErrorResponse(['Session not found'], request);
      }

      if (currentSession.status !== 'scheduled') {
        return this.createErrorResponse([`Cannot modify session with status: ${currentSession.status}`], request);
      }

      const currentIntensity = currentSession.plannedIntensity;
      const increasePercentage = request.parameters?.reductionPercentage || 15;
      const newIntensity = this.calculateIncreasedIntensity(currentIntensity, increasePercentage);

      const adjustmentId = this.generateAdjustmentId();
      const updatedSession = {
        ...currentSession,
        plannedIntensity: newIntensity,
        notes: `${currentSession.notes || ''} | Intensity increased by ${increasePercentage}%: ${request.reason}`
      };

      await this.updateSession(updatedSession);

      const adaptation: AdaptationHistory = {
        id: adjustmentId,
        userId: request.userId,
        sessionId: request.sessionId,
        adjustmentType: 'INCREASE_INTENSITY',
        beforeState: currentSession,
        afterState: updatedSession,
        modelConfidence: 85,
        timestamp: Date.now()
      };

      this.adaptationHistory.push(adaptation);
      await this.persistAdaptation(adaptation);

      return {
        success: true,
        adjustmentId,
        originalSession: currentSession,
        modifiedSession: updatedSession,
        changesApplied: [`Intensity increased from ${currentIntensity} to ${newIntensity}`],
        confidenceScore: 85,
        rationale: `Intensity increased based on: ${request.reason}`,
        alternativeSuggestions: ['Consider adding volume instead']
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return this.createErrorResponse([errorMsg], request);
    }
  }

  /**
   * Add recovery day
   */
  public async addRecoveryDay(request: PlanAdjustmentRequest): Promise<AdjustmentResult> {
    try {
      const validation = this.validateAdjustmentRequest(request, 'ADD_RECOVERY_DAY');
      if (!validation.isValid) {
        return this.createErrorResponse(validation.errors, request);
      }

      const currentSession = await this.getSessionById(request.sessionId);
      if (!currentSession) {
        return this.createErrorResponse(['Session not found'], request);
      }

      const adjustmentId = this.generateAdjustmentId();
      const scheduledDate = request.parameters?.newDate || this.calculateNextRecoveryDate(currentSession.scheduledDate);
      
      const newRecoverySession: WorkoutSession = {
        id: this.generateSessionId(),
        userId: request.userId,
        planId: currentSession.planId,
        scheduledDate,
        startTime: '09:00:00',
        exerciseType: 'recovery',
        plannedIntensity: 'very_light',
        plannedVolume: 30,
        status: 'scheduled',
        notes: `Recovery day inserted: ${request.reason}`
      };

      await this.insertSession(newRecoverySession);

      const adaptation: AdaptationHistory = {
        id: adjustmentId,
        userId: request.userId,
        sessionId: request.sessionId,
        adjustmentType: 'ADD_RECOVERY_DAY',
        beforeState: currentSession,
        afterState: newRecoverySession,
        modelConfidence: 95,
        timestamp: Date.now()
      };

      this.adaptationHistory.push(adaptation);
      await this.persistAdaptation(adaptation);

      return {
        success: true,
        adjustmentId,
        originalSession: currentSession,
        modifiedSession: newRecoverySession,
        changesApplied: ['Recovery session created'],
        confidenceScore: 95,
        rationale: `Additional recovery recommended: ${request.reason}`,
        alternativeSuggestions: ['Add yoga/stretching session']
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return this.createErrorResponse([errorMsg], request);
    }
  }

  public async getUserAdaptationHistory(userId: string, limit: number = 50): Promise<AdaptationHistory[]> {
    return this.adaptationHistory
      .filter(a => a.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  public async getUserLearningWeights(userId: string): Promise<LearningWeights> {
    const cached = this.userPreferences.get(userId);
    if (cached) return cached;

    const dbWeights = await this.loadUserLearningWeights(userId);
    if (dbWeights) {
      this.userPreferences.set(userId, dbWeights);
      return dbWeights;
    }

    const defaults = {
      userPreferenceWeight: 0.3,
      physiologicalWeight: 0.25,
      performanceWeight: 0.2,
      contextualWeight: 0.15,
      temporalWeight: 0.1
    };
    this.userPreferences.set(userId, defaults);
    return defaults;
  }

  public async updateUserLearningWeights(userId: string, weights: LearningWeights): Promise<void> {
    this.normalizeWeights(weights);
    this.userPreferences.set(userId, weights);
    await this.saveUserLearningWeights(userId, weights);
  }

  public async processUserFeedback(feedback: UserFeedback): Promise<boolean> {
    try {
      await this.persistUserFeedback(feedback);
      await this.updateLearningModel(feedback);
      return true;
    } catch (error) {
      return false;
    }
  }

  public getStatistics() {
    const successful = this.adaptationHistory.filter(a => a.modelConfidence > 80).length;
    return {
      totalAdjustments: this.adaptationHistory.length,
      successfulAdjustments: successful,
      averageConfidence: this.adaptationHistory.length > 0
        ? Math.round(this.adaptationHistory.reduce((s, a) => s + a.modelConfidence, 0) / this.adaptationHistory.length)
        : 0,
      userCount: new Set(this.adaptationHistory.map(a => a.userId)).size
    };
  }

  public reset(): void {
    this.adaptationHistory = [];
    this.userPreferences.clear();
    this.initializeDefaultWeights();
  }

  private validateAdjustmentRequest(request: PlanAdjustmentRequest, expectedType: AdjustmentType) {
    const errors: string[] = [];
    if (!request.userId) errors.push('Missing userId');
    if (!request.sessionId) errors.push('Missing sessionId');
    if (request.adjustmentType !== expectedType) errors.push(`Expected ${expectedType}, got ${request.adjustmentType}`);
    if (!request.reason) errors.push('Missing reason');

    if (expectedType === 'REDUCE_INTENSITY' || expectedType === 'INCREASE_INTENSITY') {
      const p = request.parameters?.reductionPercentage;
      if (p !== undefined && (p < 5 || p > 100)) {
        errors.push('Reduction percentage must be between 5% and 100%');
      }
    }

    if (expectedType === 'ADD_RECOVERY_DAY') {
      const date = request.parameters?.newDate;
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push('Invalid date format (must be YYYY-MM-DD)');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private createErrorResponse(errors: string[], request: PlanAdjustmentRequest): AdjustmentResult {
    const isInternal = errors.some(e => e.includes('Database connection failed') || e.includes('Internal service error'));
    const prefix = isInternal ? 'Internal service error' : 'Validation failed';
    return {
      success: false,
      adjustmentId: `error_${Date.now()}`,
      originalSession: {} as WorkoutSession,
      changesApplied: [],
      confidenceScore: 0,
      rationale: `${prefix}: ${errors.join(', ')}`,
      alternativeSuggestions: ['Check request parameters']
    };
  }

  private async getSessionById(sessionId: string): Promise<WorkoutSession | null> {
    if (!this.db) throw new Error('Database connection failed');
    const row = this.db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(sessionId);
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      scheduledDate: row.scheduled_date,
      startTime: row.start_time,
      exerciseType: row.exercise_type,
      plannedIntensity: row.planned_intensity,
      plannedVolume: row.planned_volume,
      status: row.status
    } as WorkoutSession;
  }

  private async updateSession(s: WorkoutSession): Promise<void> {
    if (!this.db) return;
    this.db.prepare('UPDATE workout_sessions SET status = ?, notes = ?, planned_intensity = ? WHERE id = ?')
      .run(s.status, s.notes, s.plannedIntensity, s.id);
  }

  private async insertSession(s: WorkoutSession): Promise<void> {
    if (!this.db) return;
    this.db.prepare('INSERT INTO workout_sessions (id, user_id, plan_id, scheduled_date, start_time, exercise_type, planned_intensity, planned_volume, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(s.id, s.userId, s.planId, s.scheduledDate, s.startTime, s.exerciseType, s.plannedIntensity, s.plannedVolume, s.status, s.notes);
  }

  private async persistAdaptation(a: AdaptationHistory): Promise<void> {
    if (!this.db) return;
    this.db.prepare('INSERT INTO plan_adaptations (id, user_id, session_id, type, confidence, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .run(a.id, a.userId, a.sessionId, a.adjustmentType, a.modelConfidence, a.timestamp);
  }

  private async persistUserFeedback(f: UserFeedback): Promise<void> {
    if (!this.db) return;
    this.db.prepare('INSERT INTO user_adaptation_feedback (user_id, session_id, type, rating, timestamp) VALUES (?, ?, ?, ?, ?)')
      .run(f.userId, f.sessionId, f.feedbackType, f.rating, f.timestamp);
  }

  private async loadUserLearningWeights(userId: string): Promise<LearningWeights | null> {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT * FROM user_learning_weights WHERE user_id = ?').get(userId);
    if (!row) return null;
    return {
      userPreferenceWeight: row.user_pref,
      physiologicalWeight: row.physio,
      performanceWeight: row.perf,
      contextualWeight: row.context,
      temporalWeight: row.temporal
    };
  }

  private async saveUserLearningWeights(userId: string, w: LearningWeights): Promise<void> {
    if (!this.db) return;
    this.db.prepare('INSERT OR REPLACE INTO user_learning_weights (user_id, user_pref, physio, perf, context, temporal) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, w.userPreferenceWeight, w.physiologicalWeight, w.performanceWeight, w.contextualWeight, w.temporalWeight);
  }

  private async updateLearningModel(f: UserFeedback): Promise<void> {
    const weights = await this.getUserLearningWeights(f.userId);
    if (f.feedbackType === 'positive') {
      weights.userPreferenceWeight = Math.min(1, weights.userPreferenceWeight + 0.05);
    } else if (f.feedbackType === 'negative') {
      weights.userPreferenceWeight = Math.max(0, weights.userPreferenceWeight - 0.05);
    }
    await this.updateUserLearningWeights(f.userId, weights);
  }

  public normalizeWeights(w: LearningWeights): void {
    const sum = w.userPreferenceWeight + w.physiologicalWeight + w.performanceWeight + w.contextualWeight + w.temporalWeight;
    if (sum > 0) {
      w.userPreferenceWeight /= sum;
      w.physiologicalWeight /= sum;
      w.performanceWeight /= sum;
      w.contextualWeight /= sum;
      w.temporalWeight /= sum;
    }
  }

  /**
   * Apply a plan adjustment (BrainOrchestrator compatibility)
   */
  public async applyAdjustment(userId: string, adjustment: any): Promise<void> {
    logger.info('PlanAdjusterService: Applying adjustment from BrainOrchestrator', {
      context: 'plan-adjuster',
      metadata: { userId, adjustmentType: adjustment.type }
    });

    switch (adjustment.type) {
    case 'intensity': {
      const adjustmentType = adjustment.change < 0 ? 'REDUCE_INTENSITY' : 'INCREASE_INTENSITY';
      const request: PlanAdjustmentRequest = {
        userId,
        sessionId: adjustment.sessionId || 'current',
        adjustmentType,
        reason: adjustment.reason || 'Auto-adjustment from Brain Cycle',
        timestamp: Date.now(),
        parameters: {
          reductionPercentage: adjustment.change ? Math.abs(adjustment.change) : undefined,
          notes: adjustment.notes
        }
      };
      if (adjustment.change < 0) {
        await this.reduceIntensity(request);
      } else {
        await this.increaseIntensity(request);
      }
      break;
    }
    case 'recovery_day': {
      const request: PlanAdjustmentRequest = {
        userId,
        sessionId: adjustment.sessionId || 'current',
        adjustmentType: 'ADD_RECOVERY_DAY',
        reason: adjustment.reason || 'Auto-adjustment from Brain Cycle',
        timestamp: Date.now(),
        parameters: {
          newDate: adjustment.newDate,
          notes: adjustment.notes
        }
      };
      await this.addRecoveryDay(request);
      break;
    }
    case 'session_type':
      break;
    default:
      logger.warn('PlanAdjusterService: Unhandled adjustment type', {
        metadata: { type: adjustment.type }
      });
    }
  }

  /**
   * Rebalance remaining days in the plan (BrainOrchestrator compatibility)
   * 
   * Analyzes trends and adjusts upcoming sessions to optimize training adaptation.
   * Considers fatigue accumulation, recovery status, and performance trajectory.
   */
  public async rebalanceRemainingDays(
    userId: string,
    trends: {
      fatigueTrend?: 'increasing' | 'stable' | 'decreasing';
      recoveryTrend?: 'improving' | 'stable' | 'declining';
      performanceTrend?: 'improving' | 'stable' | 'declining';
      hrvTrend?: number[];
      rhrTrend?: number[];
      currentLoad?: number;
      optimalLoad?: number;
      daysRemaining?: number;
    }
  ): Promise<{
    success: boolean;
    rebalanced: boolean;
    userId: string;
    adjustments: Array<{
      sessionId: string;
      date: string;
      type: 'intensity_change' | 'volume_change' | 'recovery_inserted' | 'no_change';
      oldValue: any;
      newValue: any;
      reason: string;
    }>;
    summary: {
      intensityIncreases: number;
      intensityDecreases: number;
      volumeIncreases: number;
      volumeDecreases: number;
      recoveryDaysAdded: number;
      unchangedSessions: number;
    };
    recommendation: string;
    timestamp: number;
  }> {
    logger.info('PlanAdjusterService: Rebalancing plan based on trends', {
      context: 'plan-adjuster',
      metadata: { userId, trends }
    });

    const adjustments: Array<{
      sessionId: string;
      date: string;
      type: 'intensity_change' | 'volume_change' | 'recovery_inserted' | 'no_change';
      oldValue: any;
      newValue: any;
      reason: string;
    }> = [];

    const summary = {
      intensityIncreases: 0,
      intensityDecreases: 0,
      volumeIncreases: 0,
      volumeDecreases: 0,
      recoveryDaysAdded: 0,
      unchangedSessions: 0
    };

    try {
      const upcomingSessions = await this.getUpcomingSessions(userId);
      
      if (upcomingSessions.length === 0) {
        return {
          success: true,
          rebalanced: false,
          userId,
          adjustments: [],
          summary,
          recommendation: 'No upcoming sessions to rebalance',
          timestamp: Date.now()
        };
      }

      const loadRatio = trends.currentLoad && trends.optimalLoad 
        ? trends.currentLoad / trends.optimalLoad 
        : 1;

      for (let i = 0; i < upcomingSessions.length; i++) {
        const session = upcomingSessions[i];
        const daysOut = i;
        
        const decision = this.calculateSessionAdjustment(session, trends, loadRatio, daysOut);
        
        if (decision.needsChange) {
          await this.applySessionAdjustment(session, decision);
          
          adjustments.push({
            sessionId: session.id,
            date: session.scheduledDate,
            type: decision.type,
            oldValue: decision.oldValue,
            newValue: decision.newValue,
            reason: decision.reason
          });

          if (decision.type === 'intensity_change') {
            if (decision.newValue > decision.oldValue) summary.intensityIncreases++;
            else summary.intensityDecreases++;
          } else if (decision.type === 'volume_change') {
            if (decision.newValue > decision.oldValue) summary.volumeIncreases++;
            else summary.volumeDecreases++;
          } else if (decision.type === 'recovery_inserted') {
            summary.recoveryDaysAdded++;
          }
        } else {
          summary.unchangedSessions++;
        }

        if (decision.insertRecoveryAfter) {
          const recoverySession = await this.insertRecoverySession(session);
          adjustments.push({
            sessionId: recoverySession.id,
            date: recoverySession.scheduledDate,
            type: 'recovery_inserted',
            oldValue: null,
            newValue: 'recovery',
            reason: 'Recovery day inserted due to accumulated fatigue'
          });
          summary.recoveryDaysAdded++;
        }
      }

      const recommendation = this.generateRebalanceRecommendation(summary, trends);

      logger.info('PlanAdjusterService: Rebalance complete', {
        context: 'plan-adjuster',
        metadata: { 
          userId, 
          totalAdjustments: adjustments.length,
          summary
        }
      });

      return {
        success: true,
        rebalanced: adjustments.length > 0,
        userId,
        adjustments,
        summary,
        recommendation,
        timestamp: Date.now()
      };

    } catch (error) {
      logger.error('PlanAdjusterService: Rebalance failed', {
        context: 'plan-adjuster',
        metadata: { userId, error: String(error) }
      });

      return {
        success: false,
        rebalanced: false,
        userId,
        adjustments: [],
        summary,
        recommendation: 'Unable to rebalance plan due to error',
        timestamp: Date.now()
      };
    }
  }

  private calculateSessionAdjustment(
    session: WorkoutSession,
    trends: any,
    loadRatio: number,
    daysOut: number
  ): {
    needsChange: boolean;
    type: 'intensity_change' | 'volume_change' | 'recovery_inserted' | 'no_change';
    oldValue: any;
    newValue: any;
    reason: string;
    insertRecoveryAfter: boolean;
  } {
    type ResultType = {
      needsChange: boolean;
      type: 'intensity_change' | 'volume_change' | 'recovery_inserted' | 'no_change';
      oldValue: any;
      newValue: any;
      reason: string;
      insertRecoveryAfter: boolean;
    };

    const result: ResultType = {
      needsChange: false,
      type: 'no_change',
      oldValue: null,
      newValue: null,
      reason: '',
      insertRecoveryAfter: false
    };

    if (session.status !== 'scheduled') return result;

    const intensityLevels: IntensityLevel[] = ['very_light', 'light', 'moderate', 'hard', 'very_hard'];
    const currentIntensityIdx = intensityLevels.indexOf(session.plannedIntensity);

    if (trends.fatigueTrend === 'increasing' && loadRatio > 1.1) {
      if (currentIntensityIdx > 0) {
        result.needsChange = true;
        result.type = 'intensity_change';
        result.oldValue = session.plannedIntensity;
        result.newValue = intensityLevels[currentIntensityIdx - 1];
        result.reason = 'Reducing intensity due to increasing fatigue trend';
      }
      
      if (loadRatio > 1.3 && daysOut > 0 && daysOut % 3 === 0) {
        result.insertRecoveryAfter = true;
      }
    } 
    else if (trends.recoveryTrend === 'improving' && trends.performanceTrend === 'improving' && loadRatio < 0.9) {
      if (currentIntensityIdx < intensityLevels.length - 1) {
        result.needsChange = true;
        result.type = 'intensity_change';
        result.oldValue = session.plannedIntensity;
        result.newValue = intensityLevels[currentIntensityIdx + 1];
        result.reason = 'Increasing intensity due to good recovery and performance';
      }
    }
    else if (trends.recoveryTrend === 'declining') {
      if (currentIntensityIdx > 1) {
        result.needsChange = true;
        result.type = 'intensity_change';
        result.oldValue = session.plannedIntensity;
        result.newValue = intensityLevels[currentIntensityIdx - 1];
        result.reason = 'Reducing intensity due to declining recovery trend';
      }
    }
    else if (trends.hrvTrend && trends.hrvTrend.length >= 3) {
      const recentHrv = trends.hrvTrend.slice(-3);
      const avgRecent = recentHrv.reduce((a: number, b: number) => a + b, 0) / recentHrv.length;
      const baseline = trends.hrvTrend[0];
      
      if (avgRecent < baseline * 0.8 && currentIntensityIdx > 0) {
        result.needsChange = true;
        result.type = 'intensity_change';
        result.oldValue = session.plannedIntensity;
        result.newValue = intensityLevels[currentIntensityIdx - 1];
        result.reason = 'HRV trending below baseline, reducing load';
      }
    }

    return result;
  }

  private async applySessionAdjustment(
    session: WorkoutSession,
    decision: { type: string; newValue: any; reason: string }
  ): Promise<void> {
    if (decision.type === 'intensity_change') {
      const updatedSession = {
        ...session,
        plannedIntensity: decision.newValue,
        notes: `${session.notes || ''} | Auto-adjusted: ${decision.reason}`
      };
      await this.updateSession(updatedSession);
    } else if (decision.type === 'volume_change') {
      const updatedSession = {
        ...session,
        plannedVolume: decision.newValue,
        notes: `${session.notes || ''} | Volume adjusted: ${decision.reason}`
      };
      await this.updateSession(updatedSession);
    }
  }

  private async getUpcomingSessions(userId: string): Promise<WorkoutSession[]> {
    if (!this.db) return [];
    
    const today = new Date().toISOString().split('T')[0];
    const rows = this.db.prepare(`
      SELECT * FROM workout_sessions 
      WHERE user_id = ? AND scheduled_date >= ? AND status = 'scheduled'
      ORDER BY scheduled_date ASC
      LIMIT 14
    `).all(userId, today);

    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      scheduledDate: row.scheduled_date,
      startTime: row.start_time,
      exerciseType: row.exercise_type,
      plannedIntensity: row.planned_intensity,
      plannedVolume: row.planned_volume,
      status: row.status
    }));
  }

  private async insertRecoverySession(afterSession: WorkoutSession): Promise<WorkoutSession> {
    const nextDate = this.calculateNextRecoveryDate(afterSession.scheduledDate);
    
    const recoverySession: WorkoutSession = {
      id: this.generateSessionId(),
      userId: afterSession.userId,
      planId: afterSession.planId,
      scheduledDate: nextDate,
      startTime: '09:00',
      exerciseType: 'active_recovery',
      plannedIntensity: 'very_light',
      plannedVolume: 30,
      status: 'scheduled',
      notes: 'Auto-inserted recovery session'
    };

    await this.insertSession(recoverySession);
    return recoverySession;
  }

  private generateRebalanceRecommendation(
    summary: {
      intensityIncreases: number;
      intensityDecreases: number;
      volumeIncreases: number;
      volumeDecreases: number;
      recoveryDaysAdded: number;
      unchangedSessions: number;
    },
    trends: any
  ): string {
    const parts: string[] = [];

    if (summary.intensityDecreases > summary.intensityIncreases) {
      parts.push('Overall plan intensity reduced to manage fatigue');
    } else if (summary.intensityIncreases > summary.intensityDecreases) {
      parts.push('Plan intensity increased to capitalize on good recovery');
    }

    if (summary.recoveryDaysAdded > 0) {
      parts.push(`${summary.recoveryDaysAdded} recovery day(s) added`);
    }

    if (summary.unchangedSessions > 0 && parts.length === 0) {
      parts.push('Plan remains appropriate - no significant changes needed');
    }

    if (trends.fatigueTrend === 'increasing') {
      parts.push('Monitor fatigue closely over the next few days');
    }

    if (trends.recoveryTrend === 'improving') {
      parts.push('Recovery trending well - maintain current approach');
    }

    return parts.join('. ') || 'No specific recommendations';
  }

  private mapType(type: string): AdjustmentType {
    const map: Record<string, AdjustmentType> = {
      'intensity': 'REDUCE_INTENSITY',
      'recovery_day': 'ADD_RECOVERY_DAY',
      'session_type': 'MODIFY_EXERCISES'
    };
    return map[type] || 'MODIFY_EXERCISES';
  }

  private generateAdjustmentId(): string { return `adj_${Date.now()}`; }
  private generateSessionId(): string { return `sess_${Date.now()}`; }
  
  private calculateReducedIntensity(curr: IntensityLevel, p: number): IntensityLevel {
    const lvls: IntensityLevel[] = ['very_light', 'light', 'moderate', 'hard', 'very_hard'];
    const idx = lvls.indexOf(curr);
    if (idx <= 0 || p >= 100) return 'very_light';
    const newIdx = Math.max(0, idx - Math.round((p / 100) * 4));
    return lvls[newIdx];
  }

  private calculateIncreasedIntensity(curr: IntensityLevel, p: number): IntensityLevel {
    const lvls: IntensityLevel[] = ['very_light', 'light', 'moderate', 'hard', 'very_hard'];
    const idx = lvls.indexOf(curr);
    if (idx >= lvls.length - 1 || p >= 100) return 'very_hard';
    const newIdx = Math.min(lvls.length - 1, idx + Math.round((p / 100) * 4));
    return lvls[newIdx];
  }

  private calculateNextRecoveryDate(d: string): string {
    const date = new Date(d);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }
}

export const planAdjusterService = PlanAdjusterService.getInstance();
export function getPlanAdjusterService(): PlanAdjusterService { return PlanAdjusterService.getInstance(); }
export default PlanAdjusterService;

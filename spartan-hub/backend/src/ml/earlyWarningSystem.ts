/**
 * Early Warning System
 * Phase B: Advanced ML Models - Week 5 Day 3
 * 
 * Real-time injury risk monitoring and alerts
 */

import { PredictiveInjuryModel, InjuryRiskFactors, InjuryPrediction, InjuryWarning } from './predictiveInjuryModel';
import { logger } from '../utils/logger';

export interface WarningConfig {
  enableEmail: boolean;
  enablePush: boolean;
  enableInApp: boolean;
  severityThreshold: 1 | 2 | 3 | 4 | 5;
  cooldownPeriod: number; // milliseconds
}

export interface WarningHistory {
  userId: string;
  warnings: InjuryWarning[];
  lastWarningTime: number | null;
  totalWarnings: number;
  resolvedWarnings: number;
}

/**
 * Early Warning System
 */
export class EarlyWarningSystem {
  private injuryModel: PredictiveInjuryModel;
  private warningHistory: Map<string, WarningHistory> = new Map();
  private config: WarningConfig;

  constructor(config?: Partial<WarningConfig>) {
    this.injuryModel = new PredictiveInjuryModel();
    this.config = {
      enableEmail: true,
      enablePush: true,
      enableInApp: true,
      severityThreshold: 3,
      cooldownPeriod: 3600000, // 1 hour
      ...config
    };

    logger.info('EarlyWarningSystem initialized', {
      context: 'early-warning',
      metadata: this.config
    });
  }

  /**
   * Monitor user and generate warnings if needed
   */
  monitor(userId: string, riskFactors: InjuryRiskFactors): InjuryWarning | null {
    // Predict injury risk
    const prediction = this.injuryModel.predict(riskFactors);

    // Generate warning if needed
    const warning = this.injuryModel.generateWarning(userId, prediction);

    if (!warning) {
      return null;
    }

    // Check cooldown
    if (!this.shouldSendWarning(userId, warning)) {
      logger.debug('Warning suppressed due to cooldown', {
        context: 'early-warning',
        metadata: { userId, warningId: warning.id }
      });
      return null;
    }

    // Send warning
    this.sendWarning(warning);

    return warning;
  }

  /**
   * Get warning history for user
   */
  getWarningHistory(userId: string): WarningHistory | null {
    return this.warningHistory.get(userId) || null;
  }

  /**
   * Resolve a warning
   */
  resolveWarning(userId: string, warningId: string): boolean {
    const history = this.warningHistory.get(userId);
    if (!history) {
      return false;
    }

    const warning = history.warnings.find(w => w.id === warningId);
    if (!warning) {
      return false;
    }

    (warning as any).resolved = true;
    history.resolvedWarnings++;

    logger.info('Warning resolved', {
      context: 'early-warning',
      metadata: { userId, warningId }
    });

    return true;
  }

  /**
   * Clear warning history
   */
  clearHistory(userId: string): void {
    this.warningHistory.delete(userId);
    
    logger.info('Warning history cleared', {
      context: 'early-warning',
      metadata: { userId }
    });
  }

  // Private methods

  private shouldSendWarning(userId: string, warning: InjuryWarning): boolean {
    // Check severity threshold
    if (warning.severity < this.config.severityThreshold) {
      return false;
    }

    // Check cooldown
    const history = this.warningHistory.get(userId);
    if (history && history.lastWarningTime) {
      const timeSinceLastWarning = Date.now() - history.lastWarningTime;
      if (timeSinceLastWarning < this.config.cooldownPeriod) {
        return false;
      }
    }

    return true;
  }

  private sendWarning(warning: InjuryWarning): void {
    // Update history
    let history = this.warningHistory.get(warning.userId);
    if (!history) {
      history = {
        userId: warning.userId,
        warnings: [],
        lastWarningTime: null,
        totalWarnings: 0,
        resolvedWarnings: 0
      };
    }

    history.warnings.push(warning);
    history.lastWarningTime = Date.now();
    history.totalWarnings++;
    this.warningHistory.set(warning.userId, history);

    // Send notifications based on config
    if (this.config.enableInApp) {
      this.sendInAppNotification(warning);
    }

    if (this.config.enableEmail && warning.severity >= 4) {
      this.sendEmailNotification(warning);
    }

    if (this.config.enablePush && warning.severity >= 4) {
      this.sendPushNotification(warning);
    }

    logger.warn('Warning sent', {
      context: 'early-warning',
      metadata: {
        userId: warning.userId,
        riskLevel: warning.riskLevel,
        severity: warning.severity
      }
    });
  }

  private sendInAppNotification(warning: InjuryWarning): void {
    // In production, this would integrate with notification system
    logger.info('In-app notification sent', {
      context: 'early-warning',
      metadata: { warningId: warning.id }
    });
  }

  private sendEmailNotification(warning: InjuryWarning): void {
    // In production, this would send email
    logger.info('Email notification sent', {
      context: 'early-warning',
      metadata: { warningId: warning.id }
    });
  }

  private sendPushNotification(warning: InjuryWarning): void {
    // In production, this would send push notification
    logger.info('Push notification sent', {
      context: 'early-warning',
      metadata: { warningId: warning.id }
    });
  }
}

/**
 * Prevention Plan Generator
 */
export interface PreventionPlan {
  id: string;
  userId: string;
  riskLevel: InjuryPrediction['riskLevel'];
  duration: number; // days
  phases: PreventionPhase[];
  exercises: PreventionExercise[];
  progressMetrics: string[];
}

export interface PreventionPhase {
  name: string;
  duration: number; // days
  focus: string;
  exercises: string[];
  intensity: 'low' | 'moderate' | 'high';
}

export interface PreventionExercise {
  name: string;
  sets: number;
  reps: number;
  frequency: string;
  purpose: string;
  instructions: string[];
}

export class PreventionPlanGenerator {
  /**
   * Generate prevention plan based on risk prediction
   */
  generatePlan(userId: string, prediction: InjuryPrediction): PreventionPlan {
    const duration = this.calculatePlanDuration(prediction.riskLevel);
    const phases = this.generatePhases(prediction.riskLevel, duration);
    const exercises = this.generateExercises(prediction.primaryRiskFactors, prediction.affectedAreas);
    const progressMetrics = this.generateProgressMetrics(prediction.riskLevel);

    const plan: PreventionPlan = {
      id: `prevention-${userId}-${Date.now()}`,
      userId,
      riskLevel: prediction.riskLevel,
      duration,
      phases,
      exercises,
      progressMetrics
    };

    logger.info('Prevention plan generated', {
      context: 'prevention-plan',
      metadata: {
        userId,
        riskLevel: prediction.riskLevel,
        duration,
        phases: phases.length,
        exercises: exercises.length
      }
    });

    return plan;
  }

  private calculatePlanDuration(riskLevel: InjuryPrediction['riskLevel']): number {
    switch (riskLevel) {
      case 'critical': return 28;
      case 'high': return 21;
      case 'medium': return 14;
      default: return 7;
    }
  }

  private generatePhases(
    riskLevel: InjuryPrediction['riskLevel'],
    totalDuration: number
  ): PreventionPhase[] {
    const phases: PreventionPhase[] = [];

    // Phase 1: Recovery/Correction
    phases.push({
      name: 'Recovery & Correction',
      duration: Math.round(totalDuration * 0.4),
      focus: 'Address primary risk factors',
      exercises: ['mobility', 'activation', 'light_strength'],
      intensity: 'low'
    });

    // Phase 2: Rebuilding
    phases.push({
      name: 'Rebuilding Foundation',
      duration: Math.round(totalDuration * 0.35),
      focus: 'Build strength and stability',
      exercises: ['strength', 'stability', 'control'],
      intensity: 'moderate'
    });

    // Phase 3: Return to Training
    phases.push({
      name: 'Return to Training',
      duration: Math.round(totalDuration * 0.25),
      focus: 'Gradual return to normal training',
      exercises: ['progressive_loading', 'technique', 'integration'],
      intensity: riskLevel === 'critical' || riskLevel === 'high' ? 'moderate' : 'high'
    });

    return phases;
  }

  private generateExercises(
    riskFactors: string[],
    affectedAreas: string[]
  ): PreventionExercise[] {
    const exercises: PreventionExercise[] = [];

    // Add exercises based on risk factors
    if (riskFactors.includes('Poor form quality')) {
      exercises.push({
        name: 'Technique Drills',
        sets: 3,
        reps: 10,
        frequency: 'Daily',
        purpose: 'Improve movement patterns',
        instructions: [
          'Use very light weight or bodyweight',
          'Focus on perfect form',
          'Move slowly and controlled',
          'Record yourself for feedback'
        ]
      });
    }

    if (riskFactors.includes('Limited mobility')) {
      exercises.push({
        name: 'Mobility Flow',
        sets: 2,
        reps: 15,
        frequency: 'Daily',
        purpose: 'Improve range of motion',
        instructions: [
          'Move through full range of motion',
          'Hold stretches for 30 seconds',
          'Breathe deeply',
          'Don\'t force painful positions'
        ]
      });
    }

    if (riskFactors.includes('Poor stability')) {
      exercises.push({
        name: 'Stability Exercises',
        sets: 3,
        reps: 12,
        frequency: '3x per week',
        purpose: 'Improve joint stability',
        instructions: [
          'Focus on control',
          'Use unstable surfaces if appropriate',
          'Engage core throughout',
          'Progress gradually'
        ]
      });
    }

    if (riskFactors.includes('High training load')) {
      exercises.push({
        name: 'Active Recovery',
        sets: 1,
        reps: 20,
        frequency: 'Daily',
        purpose: 'Promote recovery',
        instructions: [
          'Light movement only',
          'Focus on blood flow',
          'Include stretching',
          'Listen to your body'
        ]
      });
    }

    // Add area-specific exercises
    if (affectedAreas.includes('Lower back')) {
      exercises.push({
        name: 'Core Stability',
        sets: 3,
        reps: 15,
        frequency: 'Daily',
        purpose: 'Strengthen core and protect lower back',
        instructions: [
          'Engage core before movement',
          'Maintain neutral spine',
          'Breathe properly',
          'Progress gradually'
        ]
      });
    }

    if (affectedAreas.includes('Shoulders')) {
      exercises.push({
        name: 'Shoulder Health',
        sets: 3,
        reps: 15,
        frequency: 'Daily',
        purpose: 'Improve shoulder mobility and stability',
        instructions: [
          'Include mobility drills',
          'Strengthen rotator cuff',
          'Work on scapular control',
          'Avoid painful ranges'
        ]
      });
    }

    if (affectedAreas.includes('Knees')) {
      exercises.push({
        name: 'Knee Health',
        sets: 3,
        reps: 15,
        frequency: 'Daily',
        purpose: 'Strengthen knees and surrounding muscles',
        instructions: [
          'Focus on VMO activation',
          'Include hip strengthening',
          'Work on balance',
          'Avoid deep flexion if painful'
        ]
      });
    }

    return exercises;
  }

  private generateProgressMetrics(riskLevel: InjuryPrediction['riskLevel']): string[] {
    return [
      'Pain level (0-10)',
      'Form score',
      'Range of motion',
      'Training load',
      'Recovery score',
      'Sleep quality',
      'Energy levels'
    ];
  }
}

export default { EarlyWarningSystem, PreventionPlanGenerator };

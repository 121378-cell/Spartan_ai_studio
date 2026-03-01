/**
 * Real-time Feedback Service
 * Phase A: Video Form Analysis MVP
 * 
 * Processes pose landmarks stream and generates real-time feedback
 */

import { SquatFormAnalyzer, SquatAnalysis } from './SquatFormAnalyzer';
import { DeadliftFormAnalyzer, DeadliftAnalysis } from './DeadliftFormAnalyzer';
import { PoseLandmarks, PoseValidator } from './PoseValidator';
import { InjuryRiskCalculator, InjuryRiskFactors } from './InjuryRiskCalculator';
import { logger } from '../utils/logger';

export interface RealTimeFeedback {
  timestamp: number;
  exerciseType: 'squat' | 'deadlift';
  currentRep: number;
  formScore: number;
  feedback: string[];
  warnings: string[];
  injuryRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  shouldStop: boolean;
}

export interface FeedbackConfig {
  maxFeedbackPerSecond: number;
  warningThreshold: number;
  stopThreshold: number;
  enableInjuryDetection: boolean;
}

export class RealTimeFeedbackService {
  private squatAnalyzer: SquatFormAnalyzer;
  private deadliftAnalyzer: DeadliftFormAnalyzer;
  private validator: PoseValidator;
  private injuryCalculator: InjuryRiskCalculator;
  
  private lastFeedbackTime: Map<string, number> = new Map();
  private feedbackCounts: Map<string, number> = new Map();
  private config: FeedbackConfig;

  constructor(config?: Partial<FeedbackConfig>) {
    this.squatAnalyzer = new SquatFormAnalyzer();
    this.deadliftAnalyzer = new DeadliftFormAnalyzer();
    this.validator = new PoseValidator();
    this.injuryCalculator = new InjuryRiskCalculator();
    
    this.config = {
      maxFeedbackPerSecond: 1, // Max 1 feedback per second
      warningThreshold: 50,
      stopThreshold: 75,
      enableInjuryDetection: true,
      ...config
    };
  }

  /**
   * Process pose landmarks and generate real-time feedback
   */
  processFrame(
    sessionId: string,
    exerciseType: 'squat' | 'deadlift',
    landmarks: PoseLandmarks,
    repData?: any
  ): RealTimeFeedback {
    const timestamp = Date.now();

    // Validate landmarks
    const validation = this.validator.validate(landmarks);
    if (!validation.valid || !validation.normalized) {
      return {
        timestamp,
        exerciseType,
        currentRep: repData?.currentRep || 0,
        formScore: 0,
        feedback: ['Invalid pose data - ensure camera has clear view'],
        warnings: ['Cannot analyze - invalid pose data'],
        injuryRiskLevel: 'low',
        shouldStop: false
      };
    }

    const normalized = validation.normalized;

    // Analyze form based on exercise type
    let analysis: SquatAnalysis | DeadliftAnalysis;
    if (exerciseType === 'squat') {
      analysis = this.squatAnalyzer.analyze(normalized, repData);
    } else {
      analysis = this.deadliftAnalyzer.analyze(normalized, repData);
    }

    // Calculate injury risk
    let injuryRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (this.config.enableInjuryDetection && analysis.injuryRiskScore !== undefined) {
      const riskResult = this.injuryCalculator.calculate({
        formScore: analysis.formScore,
        injuryRiskFromForm: analysis.injuryRiskScore
      });
      injuryRiskLevel = riskResult.riskLevel;
    }

    // Generate feedback
    const feedback = this.generateFeedback(analysis, injuryRiskLevel);
    const warnings = this.generateWarnings(analysis, injuryRiskLevel);

    // Determine if should stop
    const shouldStop = injuryRiskLevel === 'critical' || 
                       (injuryRiskLevel === 'high' && analysis.formScore < 50);

    // Rate limit feedback
    const rateLimitedFeedback = this.rateLimitFeedback(sessionId, feedback, timestamp);

    logger.debug('Real-time feedback generated', {
      context: 'realtime-feedback',
      metadata: {
        sessionId,
        exerciseType,
        formScore: analysis.formScore,
        injuryRiskLevel,
        shouldStop,
        feedbackCount: rateLimitedFeedback.length
      }
    });

    return {
      timestamp,
      exerciseType,
      currentRep: repData?.currentRep || 0,
      formScore: analysis.formScore,
      feedback: rateLimitedFeedback,
      warnings,
      injuryRiskLevel,
      shouldStop
    };
  }

  /**
   * Generate actionable feedback
   */
  private generateFeedback(
    analysis: SquatAnalysis | DeadliftAnalysis,
    injuryRiskLevel: string
  ): string[] {
    const feedback: string[] = [];

    // Form score feedback
    if (analysis.formScore >= 90) {
      feedback.push('Excellent form! Keep it up.');
    } else if (analysis.formScore >= 75) {
      feedback.push('Good form. Minor adjustments needed.');
    } else if (analysis.formScore >= 60) {
      feedback.push('Form needs improvement. Reduce weight.');
    } else {
      feedback.push('Poor form detected. Stop and reset.');
    }

    // Specific recommendations
    if (analysis.recommendations.length > 0) {
      feedback.push(analysis.recommendations[0]); // Top recommendation
    }

    return feedback;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    analysis: SquatAnalysis | DeadliftAnalysis,
    injuryRiskLevel: string
  ): string[] {
    const warnings: string[] = [];

    // Add analysis warnings
    warnings.push(...analysis.warnings.slice(0, 2)); // Top 2 warnings

    // Injury risk warning
    if (injuryRiskLevel === 'critical') {
      warnings.push('HIGH INJURY RISK - Stop immediately!');
    } else if (injuryRiskLevel === 'high') {
      warnings.push('High injury risk detected');
    }

    return warnings;
  }

  /**
   * Rate limit feedback to avoid spam
   */
  private rateLimitFeedback(
    sessionId: string,
    feedback: string[],
    timestamp: number
  ): string[] {
    const lastTime = this.lastFeedbackTime.get(sessionId) || 0;
    const timeSinceLastFeedback = timestamp - lastTime;
    const minInterval = 1000 / this.config.maxFeedbackPerSecond;

    if (timeSinceLastFeedback < minInterval) {
      // Too soon - return empty
      return [];
    }

    // Update last feedback time
    this.lastFeedbackTime.set(sessionId, timestamp);

    // Reset feedback count for new second
    const currentSecond = Math.floor(timestamp / 1000);
    const lastSecond = this.feedbackCounts.get(`${sessionId}-${currentSecond}`) || 0;
    
    if (lastSecond >= this.config.maxFeedbackPerSecond) {
      return [];
    }

    this.feedbackCounts.set(`${sessionId}-${currentSecond}`, lastSecond + 1);

    return feedback;
  }

  /**
   * Clear session data
   */
  clearSession(sessionId: string): void {
    this.lastFeedbackTime.delete(sessionId);
    this.feedbackCounts.forEach((_, key) => {
      if (key.startsWith(sessionId)) {
        this.feedbackCounts.delete(key);
      }
    });
    
    logger.debug('Session feedback data cleared', {
      context: 'realtime-feedback',
      metadata: { sessionId }
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    feedbackCount: number;
    lastFeedbackTime: number | null;
    averageFeedbackPerSecond: number;
  } {
    const lastTime = this.lastFeedbackTime.get(sessionId) || 0;
    let totalFeedback = 0;
    let secondsWithFeedback = 0;

    this.feedbackCounts.forEach((count, key) => {
      if (key.startsWith(sessionId)) {
        totalFeedback += count;
        secondsWithFeedback++;
      }
    });

    return {
      feedbackCount: totalFeedback,
      lastFeedbackTime: lastTime || null,
      averageFeedbackPerSecond: secondsWithFeedback > 0 ? totalFeedback / secondsWithFeedback : 0
    };
  }
}

export default RealTimeFeedbackService;

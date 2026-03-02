/**
 * Predictive Injury Model
 * Phase B: Advanced ML Models - Week 5 Day 3
 * 
 * Predicts injury risk based on form patterns and biomechanics
 */

import { logger } from '../utils/logger';

export interface InjuryRiskFactors {
  // Form-related factors
  poorFormScore: number; // 0-100
  formDeclineRate: number; // Points per week
  asymmetryScore: number; // 0-100 (higher = more asymmetry)
  stabilityIssues: number; // 0-100
  
  // Load-related factors
  trainingLoad: number; // Weekly volume
  loadIncreaseRate: number; // % increase per week
  recoveryScore: number; // 0-100
  
  // History-related factors
  previousInjuries: number; // Count
  painLevel: number; // 0-10
  fatigueLevel: number; // 0-10
  
  // Biomechanical factors
  rangeOfMotion: number; // 0-100
  movementQuality: number; // 0-100
  controlScore: number; // 0-100
}

export interface InjuryPrediction {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  probability: number; // 0-1 (likelihood of injury in next 4 weeks)
  primaryRiskFactors: string[];
  affectedAreas: string[];
  timeline: 'immediate' | 'short_term' | 'long_term';
  recommendedActions: string[];
}

export interface InjuryWarning {
  id: string;
  userId: string;
  riskLevel: InjuryPrediction['riskLevel'];
  message: string;
  timestamp: number;
  triggeredBy: string[];
  severity: 1 | 2 | 3 | 4 | 5;
}

/**
 * Predictive Injury Model
 */
export class PredictiveInjuryModel {
  private riskThresholds = {
    low: 30,
    medium: 50,
    high: 70,
    critical: 85
  };

  /**
   * Predict injury risk
   */
  predict(factors: InjuryRiskFactors): InjuryPrediction {
    const riskScore = this.calculateRiskScore(factors);
    const riskLevel = this.determineRiskLevel(riskScore);
    const probability = this.calculateProbability(riskScore, factors);
    const primaryRiskFactors = this.identifyPrimaryRiskFactors(factors);
    const affectedAreas = this.identifyAffectedAreas(factors);
    const timeline = this.determineTimeline(riskLevel, factors);
    const recommendedActions = this.generateRecommendedActions(factors, primaryRiskFactors);

    logger.info('Injury risk prediction completed', {
      context: 'injury-prediction',
      metadata: {
        riskScore,
        riskLevel,
        probability,
        primaryRiskFactors: primaryRiskFactors.length,
        affectedAreas: affectedAreas.length
      }
    });

    return {
      riskLevel,
      riskScore: Math.round(riskScore),
      probability: Math.round(probability * 100) / 100,
      primaryRiskFactors,
      affectedAreas,
      timeline,
      recommendedActions
    };
  }

  /**
   * Generate early warning
   */
  generateWarning(userId: string, prediction: InjuryPrediction): InjuryWarning | null {
    // Only generate warnings for medium+ risk
    if (prediction.riskLevel === 'low') {
      return null;
    }

    const severity = this.riskLevelToSeverity(prediction.riskLevel);
    const message = this.generateWarningMessage(prediction);

    const warning: InjuryWarning = {
      id: `warning-${userId}-${Date.now()}`,
      userId,
      riskLevel: prediction.riskLevel,
      message,
      timestamp: Date.now(),
      triggeredBy: prediction.primaryRiskFactors,
      severity
    };

    logger.warn('Injury warning generated', {
      context: 'injury-prediction',
      metadata: {
        userId,
        riskLevel: prediction.riskLevel,
        severity,
        triggeredBy: prediction.primaryRiskFactors.length
      }
    });

    return warning;
  }

  // Private calculation methods

  private calculateRiskScore(factors: InjuryRiskFactors): number {
    // Weighted risk calculation
    const weights = {
      // Form factors (40% total)
      poorFormScore: 0.15,
      formDeclineRate: 0.1,
      asymmetryScore: 0.1,
      stabilityIssues: 0.05,
      
      // Load factors (25% total)
      trainingLoad: 0.1,
      loadIncreaseRate: 0.1,
      recoveryScore: 0.05,
      
      // History factors (20% total)
      previousInjuries: 0.1,
      painLevel: 0.07,
      fatigueLevel: 0.03,
      
      // Biomechanical factors (15% total)
      rangeOfMotion: 0.07,
      movementQuality: 0.05,
      controlScore: 0.03
    };

    let riskScore = 0;

    // Form factors (higher = more risk)
    riskScore += factors.poorFormScore * weights.poorFormScore;
    riskScore += Math.min(factors.formDeclineRate * 10, 100) * weights.formDeclineRate;
    riskScore += factors.asymmetryScore * weights.asymmetryScore;
    riskScore += factors.stabilityIssues * weights.stabilityIssues;

    // Load factors
    riskScore += Math.min(factors.trainingLoad / 10, 100) * weights.trainingLoad;
    riskScore += Math.min(factors.loadIncreaseRate * 5, 100) * weights.loadIncreaseRate;
    riskScore += (100 - factors.recoveryScore) * weights.recoveryScore;

    // History factors
    riskScore += Math.min(factors.previousInjuries * 20, 100) * weights.previousInjuries;
    riskScore += factors.painLevel * 10 * weights.painLevel;
    riskScore += factors.fatigueLevel * 10 * weights.fatigueLevel;

    // Biomechanical factors (higher = less risk, so invert)
    riskScore += (100 - factors.rangeOfMotion) * weights.rangeOfMotion;
    riskScore += (100 - factors.movementQuality) * weights.movementQuality;
    riskScore += (100 - factors.controlScore) * weights.controlScore;

    return Math.min(100, riskScore);
  }

  private determineRiskLevel(riskScore: number): InjuryPrediction['riskLevel'] {
    if (riskScore >= this.riskThresholds.critical) {
      return 'critical';
    } else if (riskScore >= this.riskThresholds.high) {
      return 'high';
    } else if (riskScore >= this.riskThresholds.medium) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private calculateProbability(riskScore: number, factors: InjuryRiskFactors): number {
    // Base probability from risk score
    let probability = riskScore / 100;

    // Adjust based on specific high-risk factors
    if (factors.painLevel > 5) {
      probability *= 1.3;
    }

    if (factors.formDeclineRate > 10) {
      probability *= 1.2;
    }

    if (factors.previousInjuries > 2) {
      probability *= 1.15;
    }

    // Cap at 0.95 (never 100% certain)
    return Math.min(0.95, probability);
  }

  private identifyPrimaryRiskFactors(factors: InjuryRiskFactors): string[] {
    const riskFactors: { factor: string; value: number; threshold: number }[] = [
      { factor: 'Poor form quality', value: factors.poorFormScore, threshold: 40 },
      { factor: 'Rapid form decline', value: factors.formDeclineRate * 10, threshold: 30 },
      { factor: 'Muscular asymmetry', value: factors.asymmetryScore, threshold: 40 },
      { factor: 'Poor stability', value: factors.stabilityIssues, threshold: 40 },
      { factor: 'High training load', value: factors.trainingLoad / 10, threshold: 50 },
      { factor: 'Rapid load increase', value: factors.loadIncreaseRate * 5, threshold: 20 },
      { factor: 'Poor recovery', value: 100 - factors.recoveryScore, threshold: 40 },
      { factor: 'Previous injuries', value: factors.previousInjuries * 20, threshold: 40 },
      { factor: 'Current pain', value: factors.painLevel * 10, threshold: 30 },
      { factor: 'High fatigue', value: factors.fatigueLevel * 10, threshold: 40 },
      { factor: 'Limited mobility', value: 100 - factors.rangeOfMotion, threshold: 40 },
      { factor: 'Poor movement quality', value: 100 - factors.movementQuality, threshold: 40 }
    ];

    // Filter factors above threshold and sort by severity
    return riskFactors
      .filter(f => f.value >= f.threshold)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(f => f.factor);
  }

  private identifyAffectedAreas(factors: InjuryRiskFactors): string[] {
    const affectedAreas: string[] = [];

    // Infer affected areas based on risk factors
    if (factors.asymmetryScore > 50 || factors.stabilityIssues > 50) {
      affectedAreas.push('Lower back');
    }

    if (factors.rangeOfMotion < 60) {
      affectedAreas.push('Shoulders');
      affectedAreas.push('Hips');
    }

    if (factors.movementQuality < 60) {
      affectedAreas.push('Knees');
    }

    if (factors.poorFormScore > 50) {
      affectedAreas.push('Multiple joints');
    }

    if (factors.fatigueLevel > 7) {
      affectedAreas.push('Central nervous system');
    }

    return affectedAreas.length > 0 ? affectedAreas : ['General'];
  }

  private determineTimeline(
    riskLevel: InjuryPrediction['riskLevel'],
    factors: InjuryRiskFactors
  ): InjuryPrediction['timeline'] {
    if (riskLevel === 'critical') {
      return 'immediate';
    }

    if (riskLevel === 'high' || factors.painLevel > 6) {
      return 'short_term';
    }

    return 'long_term';
  }

  private generateRecommendedActions(
    factors: InjuryRiskFactors,
    primaryRiskFactors: string[]
  ): string[] {
    const actions: string[] = [];

    // Form-related actions
    if (primaryRiskFactors.includes('Poor form quality')) {
      actions.push('Reduce training weight by 20-30%');
      actions.push('Focus on technique over load');
      actions.push('Consider working with a coach');
    }

    if (primaryRiskFactors.includes('Rapid form decline')) {
      actions.push('Take a deload week immediately');
      actions.push('Assess recovery protocols');
    }

    // Load-related actions
    if (primaryRiskFactors.includes('High training load')) {
      actions.push('Reduce training volume by 30-50%');
      actions.push('Add rest days');
    }

    if (primaryRiskFactors.includes('Rapid load increase')) {
      actions.push('Follow progressive overload principles');
      actions.push('Limit weekly increases to 5-10%');
    }

    // Recovery actions
    if (primaryRiskFactors.includes('Poor recovery')) {
      actions.push('Prioritize 7-9 hours of sleep');
      actions.push('Improve nutrition and hydration');
      actions.push('Add active recovery sessions');
    }

    // Pain/fatigue actions
    if (primaryRiskFactors.includes('Current pain')) {
      actions.push('Consult healthcare professional');
      actions.push('Avoid exercises that cause pain');
    }

    if (primaryRiskFactors.includes('High fatigue')) {
      actions.push('Take 2-3 rest days');
      actions.push('Reduce training intensity');
    }

    // Mobility actions
    if (primaryRiskFactors.includes('Limited mobility')) {
      actions.push('Add daily mobility work');
      actions.push('Focus on problem areas');
      actions.push('Consider professional assessment');
    }

    // Default actions if none specific
    if (actions.length === 0) {
      actions.push('Maintain current training approach');
      actions.push('Continue monitoring form');
      actions.push('Prioritize recovery');
    }

    return actions.slice(0, 5);
  }

  private riskLevelToSeverity(riskLevel: InjuryPrediction['riskLevel']): InjuryWarning['severity'] {
    switch (riskLevel) {
      case 'critical': return 5;
      case 'high': return 4;
      case 'medium': return 3;
      default: return 1;
    }
  }

  private generateWarningMessage(prediction: InjuryPrediction): string {
    const messages = {
      critical: 'CRITICAL: High injury risk detected. Stop training and assess immediately.',
      high: 'HIGH RISK: Significant injury risk detected. Modify training immediately.',
      medium: 'MODERATE RISK: Elevated injury risk detected. Monitor closely and adjust training.',
      low: 'LOW RISK: Minor risk factors detected. Continue monitoring.'
    };

    return messages[prediction.riskLevel];
  }
}

export default PredictiveInjuryModel;

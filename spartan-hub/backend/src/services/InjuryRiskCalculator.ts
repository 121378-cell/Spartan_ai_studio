/**
 * Injury Risk Calculator
 * Phase A: Video Form Analysis MVP
 * 
 * Calculates injury risk based on form analysis and biometric data
 */

import { logger } from '../utils/logger';

export interface InjuryRiskFactors {
  // Form analysis scores
  formScore?: number;
  injuryRiskFromForm?: number;
  
  // Biometric data
  hrv?: number;
  hrvBaseline?: number;
  restingHR?: number;
  restingHRBaseline?: number;
  sleepHours?: number;
  sleepQuality?: number;
  stressLevel?: number;
  
  // Training load
  weeklyVolume?: number;
  acuteChronicRatio?: number;
  consecutiveTrainingDays?: number;
  
  // History
  previousInjuries?: number;
  painLevel?: number;
}

export interface InjuryRiskResult {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendations: string[];
  shouldTrainToday: boolean;
  recommendedIntensity: 'rest' | 'active_recovery' | 'light' | 'moderate' | 'heavy';
}

export class InjuryRiskCalculator {
  /**
   * Calculate comprehensive injury risk
   */
  calculate(factors: InjuryRiskFactors): InjuryRiskResult {
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    let totalRiskScore = 0;

    // 1. Form-related risk (30% weight)
    const formRisk = this.calculateFormRisk(factors);
    totalRiskScore += formRisk.score * 0.3;
    if (formRisk.warnings.length > 0) {
      riskFactors.push(...formRisk.warnings);
      recommendations.push(...formRisk.recommendations);
    }

    // 2. Recovery risk (30% weight)
    const recoveryRisk = this.calculateRecoveryRisk(factors);
    totalRiskScore += recoveryRisk.score * 0.3;
    if (recoveryRisk.warnings.length > 0) {
      riskFactors.push(...recoveryRisk.warnings);
      recommendations.push(...recoveryRisk.recommendations);
    }

    // 3. Training load risk (25% weight)
    const loadRisk = this.calculateLoadRisk(factors);
    totalRiskScore += loadRisk.score * 0.25;
    if (loadRisk.warnings.length > 0) {
      riskFactors.push(...loadRisk.warnings);
      recommendations.push(...loadRisk.recommendations);
    }

    // 4. History risk (15% weight)
    const historyRisk = this.calculateHistoryRisk(factors);
    totalRiskScore += historyRisk.score * 0.15;
    if (historyRisk.warnings.length > 0) {
      riskFactors.push(...historyRisk.warnings);
      recommendations.push(...historyRisk.recommendations);
    }

    // Round score
    const riskScore = Math.round(totalRiskScore);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Determine if should train
    const shouldTrainToday = riskScore < 70;

    // Determine recommended intensity
    const recommendedIntensity = this.determineRecommendedIntensity(riskScore, factors);

    logger.info('Injury risk calculation completed', {
      context: 'injury-risk-calculator',
      metadata: {
        riskScore,
        riskLevel,
        shouldTrainToday,
        recommendedIntensity,
        riskFactorsCount: riskFactors.length
      }
    });

    return {
      riskScore,
      riskLevel,
      riskFactors,
      recommendations,
      shouldTrainToday,
      recommendedIntensity
    };
  }

  /**
   * Calculate form-related risk
   */
  private calculateFormRisk(factors: InjuryRiskFactors): { score: number; warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Poor form score increases risk
    if (factors.formScore !== undefined) {
      if (factors.formScore < 60) {
        score += 80;
        warnings.push('Very poor form detected');
        recommendations.push('Reduce weight significantly and focus on technique');
      } else if (factors.formScore < 75) {
        score += 50;
        warnings.push('Below average form detected');
        recommendations.push('Consider reducing weight to improve form');
      } else if (factors.formScore < 85) {
        score += 25;
        warnings.push('Minor form issues detected');
        recommendations.push('Review technique cues before next set');
      }
    }

    // Direct injury risk from form analysis
    if (factors.injuryRiskFromForm !== undefined) {
      score += factors.injuryRiskFromForm * 0.5;
    }

    return {
      score: Math.min(100, score),
      warnings,
      recommendations
    };
  }

  /**
   * Calculate recovery-related risk
   */
  private calculateRecoveryRisk(factors: InjuryRiskFactors): { score: number; warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // HRV analysis
    if (factors.hrv !== undefined && factors.hrvBaseline !== undefined) {
      const hrvRatio = factors.hrv / factors.hrvBaseline;
      if (hrvRatio < 0.7) {
        score += 40;
        warnings.push('HRV significantly below baseline');
        recommendations.push('Consider active recovery instead of intense training');
      } else if (hrvRatio < 0.85) {
        score += 20;
        warnings.push('HRV below baseline');
        recommendations.push('Monitor recovery closely');
      }
    }

    // Resting heart rate
    if (factors.restingHR !== undefined && factors.restingHRBaseline !== undefined) {
      const rhrDifference = factors.restingHR - factors.restingHRBaseline;
      if (rhrDifference > 10) {
        score += 30;
        warnings.push('Elevated resting heart rate');
        recommendations.push('May indicate fatigue or illness - consider rest');
      } else if (rhrDifference > 5) {
        score += 15;
        warnings.push('Slightly elevated resting heart rate');
      }
    }

    // Sleep analysis
    if (factors.sleepHours !== undefined) {
      if (factors.sleepHours < 5) {
        score += 40;
        warnings.push('Severe sleep deprivation');
        recommendations.push('Prioritize sleep - aim for 7-9 hours');
      } else if (factors.sleepHours < 7) {
        score += 20;
        warnings.push('Below optimal sleep');
        recommendations.push('Try to get more sleep for better recovery');
      }
    }

    // Stress level
    if (factors.stressLevel !== undefined) {
      if (factors.stressLevel > 8) {
        score += 30;
        warnings.push('High stress levels detected');
        recommendations.push('Consider stress management techniques');
      } else if (factors.stressLevel > 6) {
        score += 15;
        warnings.push('Elevated stress levels');
      }
    }

    return {
      score: Math.min(100, score),
      warnings,
      recommendations
    };
  }

  /**
   * Calculate training load risk
   */
  private calculateLoadRisk(factors: InjuryRiskFactors): { score: number; warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Acute:Chronic workload ratio
    if (factors.acuteChronicRatio !== undefined) {
      if (factors.acuteChronicRatio > 1.5) {
        score += 50;
        warnings.push('Very high acute:chronic workload ratio');
        recommendations.push('Reduce training load to prevent overtraining');
      } else if (factors.acuteChronicRatio > 1.3) {
        score += 30;
        warnings.push('Elevated workload ratio');
        recommendations.push('Consider deload week');
      }
    }

    // Consecutive training days
    if (factors.consecutiveTrainingDays !== undefined) {
      if (factors.consecutiveTrainingDays > 5) {
        score += 30;
        warnings.push('Multiple consecutive training days');
        recommendations.push('Schedule rest day for recovery');
      } else if (factors.consecutiveTrainingDays > 3) {
        score += 15;
        warnings.push('Several consecutive training days');
      }
    }

    // Weekly volume
    if (factors.weeklyVolume !== undefined) {
      if (factors.weeklyVolume > 150) { // Arbitrary threshold
        score += 25;
        warnings.push('High weekly training volume');
        recommendations.push('Ensure adequate nutrition and sleep');
      }
    }

    return {
      score: Math.min(100, score),
      warnings,
      recommendations
    };
  }

  /**
   * Calculate injury history risk
   */
  private calculateHistoryRisk(factors: InjuryRiskFactors): { score: number; warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    // Previous injuries
    if (factors.previousInjuries !== undefined) {
      if (factors.previousInjuries > 2) {
        score += 30;
        warnings.push('Multiple previous injuries');
        recommendations.push('Focus on injury prevention exercises');
      } else if (factors.previousInjuries > 0) {
        score += 15;
        warnings.push('History of injuries');
        recommendations.push('Continue preventive measures');
      }
    }

    // Current pain level
    if (factors.painLevel !== undefined) {
      if (factors.painLevel > 7) {
        score += 50;
        warnings.push('High pain level detected');
        recommendations.push('Consider consulting healthcare professional');
      } else if (factors.painLevel > 4) {
        score += 25;
        warnings.push('Moderate pain level');
        recommendations.push('Modify exercises to avoid pain');
      } else if (factors.painLevel > 0) {
        score += 10;
        warnings.push('Minor pain detected');
      }
    }

    return {
      score: Math.min(100, score),
      warnings,
      recommendations
    };
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) {
      return 'critical';
    } else if (score >= 50) {
      return 'high';
    } else if (score >= 25) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determine recommended training intensity
   */
  private determineRecommendedIntensity(score: number, factors: InjuryRiskFactors): 'rest' | 'active_recovery' | 'light' | 'moderate' | 'heavy' {
    if (score >= 75) {
      return 'rest';
    } else if (score >= 50) {
      return 'active_recovery';
    } else if (score >= 35) {
      return 'light';
    } else if (score >= 20) {
      return 'moderate';
    } else {
      return 'heavy';
    }
  }
}

export default InjuryRiskCalculator;

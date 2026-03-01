/**
 * Deadlift Form Analyzer
 * Phase A: Video Form Analysis MVP
 * 
 * Analyzes deadlift exercise form using pose landmarks
 */

import { PoseLandmarks, PoseValidator } from './PoseValidator';
import { logger } from '../utils/logger';

export interface DeadliftMetrics {
  repsCompleted: number;
  durationSeconds: number;
  backRounding?: 'neutral' | 'slight' | 'excessive';
  barPathDeviation?: number; // cm from ideal vertical path
  hipHeight?: 'optimal' | 'too_high' | 'too_low';
  shoulderPosition?: 'over_bar' | 'in_front' | 'behind';
  lockoutQuality?: 'complete' | 'partial' | 'incomplete';
}

export interface DeadliftAnalysis {
  formScore: number; // 0-100
  metrics: DeadliftMetrics;
  warnings: string[];
  recommendations: string[];
  injuryRiskScore?: number;
}

export class DeadliftFormAnalyzer {
  private validator: PoseValidator;

  constructor() {
    this.validator = new PoseValidator();
  }

  /**
   * Analyze deadlift form from pose landmarks
   */
  analyze(landmarks: PoseLandmarks, repData?: any): DeadliftAnalysis {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate landmarks
    const validation = this.validator.validate(landmarks);
    if (!validation.valid || !validation.normalized) {
      return {
        formScore: 0,
        metrics: { repsCompleted: 0, durationSeconds: 0 },
        warnings: ['Invalid pose data detected'],
        recommendations: ['Ensure camera has clear side view of your body']
      };
    }

    const normalized = validation.normalized;

    // Calculate metrics
    const metrics = this.calculateMetrics(normalized, repData);

    // Analyze form
    const formAnalysis = this.analyzeForm(normalized, metrics);
    warnings.push(...formAnalysis.warnings);
    recommendations.push(...formAnalysis.recommendations);

    // Calculate form score
    const formScore = this.calculateFormScore(metrics, warnings);

    // Calculate injury risk
    const injuryRiskScore = this.calculateInjuryRisk(metrics, warnings);

    logger.info('Deadlift analysis completed', {
      context: 'deadlift-analyzer',
      metadata: {
        formScore,
        injuryRiskScore,
        warnings: warnings.length,
        recommendations: recommendations.length
      }
    });

    return {
      formScore,
      metrics,
      warnings,
      recommendations,
      injuryRiskScore
    };
  }

  /**
   * Calculate deadlift metrics from landmarks
   */
  private calculateMetrics(landmarks: PoseLandmarks, repData?: any): DeadliftMetrics {
    // Get key landmarks
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];

    // Calculate hip midpoint
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    // Calculate shoulder midpoint
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    // Calculate back rounding
    const backRounding = this.calculateBackRounding(shoulderMidpoint, hipMidpoint, landmarks);

    // Calculate hip height
    const hipHeight = this.calculateHipHeight(hipMidpoint, leftKnee, rightKnee);

    // Calculate shoulder position
    const shoulderPosition = this.calculateShoulderPosition(shoulderMidpoint, landmarks);

    // Calculate bar path deviation (simplified)
    const barPathDeviation = this.calculateBarPathDeviation(landmarks, repData);

    // Calculate lockout quality
    const lockoutQuality = this.calculateLockoutQuality(landmarks, repData);

    return {
      repsCompleted: repData?.reps || 1,
      durationSeconds: repData?.duration || 0,
      backRounding,
      barPathDeviation,
      hipHeight,
      shoulderPosition,
      lockoutQuality
    };
  }

  /**
   * Calculate back rounding
   */
  private calculateBackRounding(shoulders: any, hips: any, landmarks: PoseLandmarks): 'neutral' | 'slight' | 'excessive' {
    // Calculate angle between shoulders and hips
    const dx = shoulders.x - hips.x;
    const dy = shoulders.y - hips.y;
    const backAngle = Math.atan2(dx, dy) * (180 / Math.PI);

    // Check for excessive rounding based on angle
    if (Math.abs(backAngle) > 60) {
      return 'excessive';
    } else if (Math.abs(backAngle) > 30) {
      return 'slight';
    } else {
      return 'neutral';
    }
  }

  /**
   * Calculate hip height relative to knees
   */
  private calculateHipHeight(hip: any, leftKnee: any, rightKnee: any): 'optimal' | 'too_high' | 'too_low' {
    const kneeY = (leftKnee.y + rightKnee.y) / 2;
    const hipKneeDiff = hip.y - kneeY;

    // Optimal hip position is slightly above or level with knees
    if (hipKneeDiff < -0.1) {
      return 'too_high';
    } else if (hipKneeDiff > 0.1) {
      return 'too_low';
    } else {
      return 'optimal';
    }
  }

  /**
   * Calculate shoulder position relative to bar
   */
  private calculateShoulderPosition(shoulders: any, landmarks: PoseLandmarks): 'over_bar' | 'in_front' | 'behind' {
    // Simplified: assume bar is at mid-foot position
    // In production, would use actual bar detection
    const shoulderX = shoulders.x;
    
    // Ideal: shoulders slightly over or in line with bar
    if (shoulderX < 0.45) {
      return 'behind';
    } else if (shoulderX > 0.55) {
      return 'in_front';
    } else {
      return 'over_bar';
    }
  }

  /**
   * Calculate bar path deviation
   */
  private calculateBarPathDeviation(landmarks: PoseLandmarks, repData?: any): number {
    // Simplified calculation
    // In production, would track actual bar path across frames
    return repData?.barPathDeviation || 0;
  }

  /**
   * Calculate lockout quality
   */
  private calculateLockoutQuality(landmarks: PoseLandmarks, repData?: any): 'complete' | 'partial' | 'incomplete' {
    // Check if hips and knees are fully extended at top
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const hipKneeAngle = this.calculateAngle(leftHip, leftKnee, landmarks[27]); // ankle

    if (hipKneeAngle > 170) {
      return 'complete';
    } else if (hipKneeAngle > 150) {
      return 'partial';
    } else {
      return 'incomplete';
    }
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(p1: any, p2: any, p3: any): number {
    const vector1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const vector2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
    const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
    const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);
    
    const cosAngle = dotProduct / (magnitude1 * magnitude2);
    const angle = Math.acos(cosAngle) * (180 / Math.PI);
    
    return angle;
  }

  /**
   * Analyze form and generate warnings/recommendations
   */
  private analyzeForm(landmarks: PoseLandmarks, metrics: DeadliftMetrics): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check back rounding
    if (metrics.backRounding === 'excessive') {
      warnings.push('Excessive back rounding detected');
      recommendations.push('Keep your back neutral throughout the lift');
      recommendations.push('Engage your lats and core before pulling');
      recommendations.push('Consider reducing weight to maintain form');
    } else if (metrics.backRounding === 'slight') {
      warnings.push('Slight back rounding detected');
      recommendations.push('Focus on keeping chest up and back flat');
    }

    // Check hip height
    if (metrics.hipHeight === 'too_high') {
      warnings.push('Hips starting too high');
      recommendations.push('Lower your hips to engage legs more effectively');
    } else if (metrics.hipHeight === 'too_low') {
      warnings.push('Hips starting too low');
      recommendations.push('Raise hips slightly for optimal leverage');
    }

    // Check shoulder position
    if (metrics.shoulderPosition === 'behind') {
      warnings.push('Shoulders behind the bar');
      recommendations.push('Position shoulders directly over or slightly in front of bar');
    }

    // Check lockout
    if (metrics.lockoutQuality === 'incomplete') {
      warnings.push('Incomplete lockout at top');
      recommendations.push('Fully extend hips and knees at the top');
      recommendations.push('Squeeze glutes to achieve full lockout');
    } else if (metrics.lockoutQuality === 'partial') {
      warnings.push('Partial lockout detected');
      recommendations.push('Focus on complete hip extension');
    }

    // Check bar path
    if ((metrics.barPathDeviation || 0) > 5) {
      warnings.push('Bar path deviation detected');
      recommendations.push('Keep bar close to your body throughout the lift');
    }

    return { warnings, recommendations };
  }

  /**
   * Calculate overall form score
   */
  private calculateFormScore(metrics: DeadliftMetrics, warnings: string[]): number {
    let score = 100;

    // Deduct for back rounding
    if (metrics.backRounding === 'excessive') {
      score -= 35;
    } else if (metrics.backRounding === 'slight') {
      score -= 15;
    }

    // Deduct for hip position
    if (metrics.hipHeight === 'too_high' || metrics.hipHeight === 'too_low') {
      score -= 15;
    }

    // Deduct for shoulder position
    if (metrics.shoulderPosition === 'behind') {
      score -= 15;
    }

    // Deduct for lockout issues
    if (metrics.lockoutQuality === 'incomplete') {
      score -= 20;
    } else if (metrics.lockoutQuality === 'partial') {
      score -= 10;
    }

    // Deduct for warnings
    score -= warnings.length * 5;

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate injury risk score
   */
  private calculateInjuryRisk(metrics: DeadliftMetrics, warnings: string[]): number {
    let riskScore = 0;

    // High risk factors
    if (metrics.backRounding === 'excessive') {
      riskScore += 50; // High risk of back injury
    }

    if (metrics.shoulderPosition === 'behind') {
      riskScore += 25;
    }

    // Medium risk factors
    if (metrics.backRounding === 'slight') {
      riskScore += 20;
    }

    if (metrics.hipHeight === 'too_high') {
      riskScore += 20;
    }

    if (metrics.lockoutQuality === 'incomplete') {
      riskScore += 15;
    }

    // Low risk factors
    riskScore += warnings.length * 5;

    // Cap at 100
    return Math.min(100, riskScore);
  }
}

export default DeadliftFormAnalyzer;

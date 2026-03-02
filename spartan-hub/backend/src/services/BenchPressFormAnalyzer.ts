/**
 * Bench Press Form Analyzer
 * Phase B: Additional Exercises
 * 
 * Analyzes bench press exercise form using pose landmarks
 */

import { PoseLandmarks, PoseValidator } from './PoseValidator';
import { logger } from '../utils/logger';

export interface BenchPressMetrics {
  repsCompleted: number;
  durationSeconds: number;
  elbowTuckAngle?: number; // Degrees (ideal: 45-75°)
  barPathDeviation?: number; // cm from ideal path
  shoulderPosition?: 'optimal' | 'too_high' | 'too_low';
  archQuality?: 'good' | 'moderate' | 'excessive' | 'none';
  lockoutQuality?: 'complete' | 'partial' | 'incomplete';
  touchAndGo?: boolean;
}

export interface BenchPressAnalysis {
  formScore: number; // 0-100
  metrics: BenchPressMetrics;
  warnings: string[];
  recommendations: string[];
  injuryRiskScore?: number;
}

export class BenchPressFormAnalyzer {
  private validator: PoseValidator;

  constructor() {
    this.validator = new PoseValidator();
  }

  /**
   * Analyze bench press form from pose landmarks
   */
  analyze(landmarks: PoseLandmarks, repData?: any): BenchPressAnalysis {
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

    logger.info('Bench press analysis completed', {
      context: 'bench-press-analyzer',
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
   * Calculate bench press metrics from landmarks
   */
  private calculateMetrics(landmarks: PoseLandmarks, repData?: any): BenchPressMetrics {
    // Get key landmarks
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    // Calculate elbow tuck angle
    const elbowTuckAngle = this.calculateElbowTuckAngle(leftShoulder, leftElbow, leftWrist, rightShoulder, rightElbow, rightWrist);

    // Calculate bar path deviation
    const barPathDeviation = this.calculateBarPathDeviation(landmarks, repData);

    // Calculate shoulder position
    const shoulderPosition = this.calculateShoulderPosition(leftShoulder, rightShoulder, leftHip, rightHip);

    // Calculate arch quality
    const archQuality = this.calculateArchQuality(leftShoulder, leftHip, rightHip);

    // Calculate lockout quality
    const lockoutQuality = this.calculateLockoutQuality(leftElbow, rightElbow);

    // Check touch and go
    const touchAndGo = this.checkTouchAndGo(landmarks, repData);

    return {
      repsCompleted: repData?.reps || 1,
      durationSeconds: repData?.duration || 0,
      elbowTuckAngle,
      barPathDeviation,
      shoulderPosition,
      archQuality,
      lockoutQuality,
      touchAndGo
    };
  }

  /**
   * Calculate elbow tuck angle
   */
  private calculateElbowTuckAngle(
    leftShoulder: any, leftElbow: any, leftWrist: any,
    rightShoulder: any, rightElbow: any, rightWrist: any
  ): number {
    // Calculate angle between upper arm and torso
    const leftAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Average of both arms
    const avgAngle = (leftAngle + rightAngle) / 2;
    
    // Ideal elbow tuck is 45-75 degrees
    return Math.round(avgAngle * 10) / 10;
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
   * Calculate shoulder position on bench
   */
  private calculateShoulderPosition(
    leftShoulder: any, rightShoulder: any,
    leftHip: any, rightHip: any
  ): 'optimal' | 'too_high' | 'too_low' {
    // Calculate shoulder-hip relationship
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const difference = shoulderY - hipY;
    
    // Optimal: shoulders slightly lower than hips (arch)
    if (difference > 0.1) {
      return 'too_high';
    } else if (difference < -0.05) {
      return 'too_low';
    } else {
      return 'optimal';
    }
  }

  /**
   * Calculate arch quality
   */
  private calculateArchQuality(shoulder: any, leftHip: any, rightHip: any): 'good' | 'moderate' | 'excessive' | 'none' {
    const hipY = (leftHip.y + rightHip.y) / 2;
    const archAngle = Math.abs(shoulder.y - hipY);
    
    if (archAngle > 0.15) {
      return 'excessive';
    } else if (archAngle > 0.08) {
      return 'good';
    } else if (archAngle > 0.03) {
      return 'moderate';
    } else {
      return 'none';
    }
  }

  /**
   * Calculate lockout quality
   */
  private calculateLockoutQuality(leftElbow: any, rightElbow: any): 'complete' | 'partial' | 'incomplete' {
    // Check if elbows are fully extended at top
    // Simplified - would need full range of motion tracking
    const leftAngle = this.calculateAngleFromVertical(leftElbow);
    const rightAngle = this.calculateAngleFromVertical(rightElbow);
    const avgAngle = (leftAngle + rightAngle) / 2;
    
    if (avgAngle > 170) {
      return 'complete';
    } else if (avgAngle > 150) {
      return 'partial';
    } else {
      return 'incomplete';
    }
  }

  /**
   * Check touch and go
   */
  private checkTouchAndGo(landmarks: PoseLandmarks, repData?: any): boolean {
    // Check if bar touches chest and immediately goes up
    return repData?.touchAndGo || false;
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
   * Calculate angle from vertical
   */
  private calculateAngleFromVertical(point: any): number {
    // Simplified calculation
    return 180 - (point.y * 180);
  }

  /**
   * Analyze form and generate warnings/recommendations
   */
  private analyzeForm(landmarks: PoseLandmarks, metrics: BenchPressMetrics): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check elbow tuck
    if (metrics.elbowTuckAngle && metrics.elbowTuckAngle > 75) {
      warnings.push('Elbows flared out too wide');
      recommendations.push('Tuck elbows at 45-75° angle from torso');
      recommendations.push('This reduces shoulder stress and injury risk');
    } else if (metrics.elbowTuckAngle && metrics.elbowTuckAngle < 45) {
      warnings.push('Elbows tucked too tight');
      recommendations.push('Allow elbows to flare slightly (45-75°)');
    }

    // Check shoulder position
    if (metrics.shoulderPosition === 'too_high') {
      warnings.push('Shoulders too high on bench');
      recommendations.push('Position shoulders firmly on bench');
      recommendations.push('Retract and depress shoulder blades');
    }

    // Check arch
    if (metrics.archQuality === 'excessive') {
      warnings.push('Excessive lower back arch');
      recommendations.push('Reduce arch to protect lower back');
      recommendations.push('Keep feet flat on floor');
    } else if (metrics.archQuality === 'none') {
      warnings.push('No arch - missing stability');
      recommendations.push('Create slight arch for stability');
      recommendations.push('Retract shoulder blades and brace core');
    }

    // Check lockout
    if (metrics.lockoutQuality === 'incomplete') {
      warnings.push('Incomplete lockout at top');
      recommendations.push('Fully extend elbows at top of each rep');
      recommendations.push('Control the weight throughout full ROM');
    } else if (metrics.lockoutQuality === 'partial') {
      warnings.push('Partial lockout detected');
      recommendations.push('Focus on complete elbow extension');
    }

    // Check touch and go
    if (!metrics.touchAndGo) {
      warnings.push('Not using touch and go technique');
      recommendations.push('Lightly touch chest and press immediately');
      recommendations.push('Avoid bouncing bar off chest');
    }

    return { warnings, recommendations };
  }

  /**
   * Calculate overall form score
   */
  private calculateFormScore(metrics: BenchPressMetrics, warnings: string[]): number {
    let score = 100;

    // Deduct for elbow flare
    if (metrics.elbowTuckAngle && metrics.elbowTuckAngle > 75) {
      score -= 25;
    } else if (metrics.elbowTuckAngle && metrics.elbowTuckAngle < 45) {
      score -= 15;
    }

    // Deduct for shoulder position
    if (metrics.shoulderPosition === 'too_high') {
      score -= 20;
    }

    // Deduct for arch issues
    if (metrics.archQuality === 'excessive') {
      score -= 20;
    } else if (metrics.archQuality === 'none') {
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
  private calculateInjuryRisk(metrics: BenchPressMetrics, warnings: string[]): number {
    let riskScore = 0;

    // High risk factors
    if (metrics.elbowTuckAngle && metrics.elbowTuckAngle > 85) {
      riskScore += 40; // High shoulder injury risk
    }

    if (metrics.archQuality === 'excessive') {
      riskScore += 30; // Lower back injury risk
    }

    // Medium risk factors
    if (metrics.shoulderPosition === 'too_high') {
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

export default BenchPressFormAnalyzer;

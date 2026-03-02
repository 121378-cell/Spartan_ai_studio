/**
 * Overhead Press Form Analyzer
 * Phase B: Additional Exercises
 * 
 * Analyzes overhead press (military press) exercise form using pose landmarks
 */

import { PoseLandmarks, PoseValidator } from './PoseValidator';
import { logger } from '../utils/logger';

export interface OverheadPressMetrics {
  repsCompleted: number;
  durationSeconds: number;
  shoulderMobilityScore?: number; // 0-100 (higher = better mobility)
  barPathDeviation?: number; // cm from ideal vertical path
  coreEngagement?: 'good' | 'moderate' | 'poor';
  elbowPosition?: 'optimal' | 'too_forward' | 'too_back';
  lockoutQuality?: 'complete' | 'partial' | 'incomplete';
  archQuality?: 'neutral' | 'excessive' | 'good';
  breathingPattern?: 'correct' | 'incorrect';
}

export interface OverheadPressAnalysis {
  formScore: number; // 0-100
  metrics: OverheadPressMetrics;
  warnings: string[];
  recommendations: string[];
  injuryRiskScore?: number;
}

export class OverheadPressFormAnalyzer {
  private validator: PoseValidator;

  constructor() {
    this.validator = new PoseValidator();
  }

  /**
   * Analyze overhead press form from pose landmarks
   */
  analyze(landmarks: PoseLandmarks, repData?: any): OverheadPressAnalysis {
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

    logger.info('Overhead press analysis completed', {
      context: 'overhead-press-analyzer',
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
   * Calculate overhead press metrics from landmarks
   */
  private calculateMetrics(landmarks: PoseLandmarks, repData?: any): OverheadPressMetrics {
    // Get key landmarks
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];

    // Calculate shoulder mobility score
    const shoulderMobilityScore = this.calculateShoulderMobility(leftShoulder, leftElbow, leftWrist, rightShoulder, rightElbow, rightWrist);

    // Calculate bar path deviation
    const barPathDeviation = this.calculateBarPathDeviation(landmarks, repData);

    // Calculate core engagement
    const coreEngagement = this.calculateCoreEngagement(leftHip, rightHip, nose);

    // Calculate elbow position
    const elbowPosition = this.calculateElbowPosition(leftElbow, rightElbow, leftShoulder, rightShoulder);

    // Calculate lockout quality
    const lockoutQuality = this.calculateLockoutQuality(leftElbow, rightElbow);

    // Calculate arch quality
    const archQuality = this.calculateArchQuality(landmarks, repData);

    // Check breathing pattern
    const breathingPattern = this.checkBreathingPattern(repData);

    return {
      repsCompleted: repData?.reps || 1,
      durationSeconds: repData?.duration || 0,
      shoulderMobilityScore,
      barPathDeviation,
      coreEngagement,
      elbowPosition,
      lockoutQuality,
      archQuality,
      breathingPattern
    };
  }

  /**
   * Calculate shoulder mobility score
   */
  private calculateShoulderMobility(
    leftShoulder: any, leftElbow: any, leftWrist: any,
    rightShoulder: any, rightElbow: any, rightWrist: any
  ): number {
    // Calculate range of motion
    const leftROM = this.calculateShoulderROM(leftShoulder, leftElbow, leftWrist);
    const rightROM = this.calculateShoulderROM(rightShoulder, rightElbow, rightWrist);
    
    // Average of both sides
    const avgROM = (leftROM + rightROM) / 2;
    
    // Score based on ROM (ideal: 180° full extension)
    const score = Math.min(100, (avgROM / 180) * 100);
    
    return Math.round(score);
  }

  /**
   * Calculate shoulder range of motion
   */
  private calculateShoulderROM(shoulder: any, elbow: any, wrist: any): number {
    // Calculate angle at shoulder joint
    const angle = this.calculateAngle(shoulder, elbow, wrist);
    return angle;
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
   * Calculate core engagement
   */
  private calculateCoreEngagement(
    leftHip: any, rightHip: any,
    nose: any
  ): 'good' | 'moderate' | 'poor' {
    // Check if torso remains stable
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    // Calculate hip-nose alignment (should be vertical)
    const deviation = Math.abs(hipCenter.x - nose.x);
    
    if (deviation < 0.05) {
      return 'good';
    } else if (deviation < 0.15) {
      return 'moderate';
    } else {
      return 'poor';
    }
  }

  /**
   * Calculate elbow position
   */
  private calculateElbowPosition(
    leftElbow: any, rightElbow: any,
    leftShoulder: any, rightShoulder: any
  ): 'optimal' | 'too_forward' | 'too_back' {
    // Check if elbows are slightly in front of bar (optimal)
    const leftElbowPos = leftElbow.x - leftShoulder.x;
    const rightElbowPos = rightElbow.x - rightShoulder.x;
    const avgPos = (leftElbowPos + rightElbowPos) / 2;
    
    if (avgPos > 0.05 && avgPos < 0.15) {
      return 'optimal';
    } else if (avgPos <= 0.05) {
      return 'too_back';
    } else {
      return 'too_forward';
    }
  }

  /**
   * Calculate lockout quality
   */
  private calculateLockoutQuality(leftElbow: any, rightElbow: any): 'complete' | 'partial' | 'incomplete' {
    // Check if elbows are fully extended at top
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
   * Calculate arch quality
   */
  private calculateArchQuality(landmarks: PoseLandmarks, repData?: any): 'neutral' | 'excessive' | 'good' {
    // Check for excessive lower back arch
    return repData?.archQuality || 'neutral';
  }

  /**
   * Check breathing pattern
   */
  private checkBreathingPattern(repData?: any): 'correct' | 'incorrect' {
    // Check if user breathes correctly (inhale before press, exhale during press)
    return repData?.breathingPattern === 'correct' ? 'correct' : 'incorrect';
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
  private analyzeForm(landmarks: PoseLandmarks, metrics: OverheadPressMetrics): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check shoulder mobility
    if (metrics.shoulderMobilityScore && metrics.shoulderMobilityScore < 70) {
      warnings.push('Limited shoulder mobility detected');
      recommendations.push('Work on shoulder mobility exercises');
      recommendations.push('Consider reducing weight to improve form');
      recommendations.push('Perform shoulder dislocates and wall slides');
    }

    // Check core engagement
    if (metrics.coreEngagement === 'poor') {
      warnings.push('Poor core engagement - torso leaning back');
      recommendations.push('Brace your core throughout the movement');
      recommendations.push('Keep ribs down and avoid excessive arch');
      recommendations.push('Reduce weight and focus on form');
    } else if (metrics.coreEngagement === 'moderate') {
      warnings.push('Core engagement could be better');
      recommendations.push('Focus on keeping torso stable');
    }

    // Check elbow position
    if (metrics.elbowPosition === 'too_forward') {
      warnings.push('Elbows too far forward');
      recommendations.push('Keep elbows slightly in front of bar, not too far forward');
      recommendations.push('This improves pressing mechanics');
    } else if (metrics.elbowPosition === 'too_back') {
      warnings.push('Elbows too far back');
      recommendations.push('Bring elbows slightly forward');
      recommendations.push('Elbows should be under or slightly in front of bar');
    }

    // Check lockout
    if (metrics.lockoutQuality === 'incomplete') {
      warnings.push('Incomplete lockout at top');
      recommendations.push('Fully extend elbows at top of each rep');
      recommendations.push('Finish each rep with arms straight overhead');
    } else if (metrics.lockoutQuality === 'partial') {
      warnings.push('Partial lockout detected');
      recommendations.push('Focus on complete elbow extension');
    }

    // Check arch
    if (metrics.archQuality === 'excessive') {
      warnings.push('Excessive lower back arch');
      recommendations.push('Reduce arch to protect lower back');
      recommendations.push('Keep core tight and ribs down');
      recommendations.push('Consider reducing weight');
    }

    // Check breathing
    if (metrics.breathingPattern === 'incorrect') {
      warnings.push('Incorrect breathing pattern');
      recommendations.push('Inhale before pressing, exhale during press');
      recommendations.push('Hold breath at bottom for stability');
    }

    return { warnings, recommendations };
  }

  /**
   * Calculate overall form score
   */
  private calculateFormScore(metrics: OverheadPressMetrics, warnings: string[]): number {
    let score = 100;

    // Deduct for poor shoulder mobility
    if (metrics.shoulderMobilityScore && metrics.shoulderMobilityScore < 70) {
      score -= 25;
    } else if (metrics.shoulderMobilityScore && metrics.shoulderMobilityScore < 85) {
      score -= 15;
    }

    // Deduct for core engagement issues
    if (metrics.coreEngagement === 'poor') {
      score -= 30;
    } else if (metrics.coreEngagement === 'moderate') {
      score -= 15;
    }

    // Deduct for elbow position
    if (metrics.elbowPosition !== 'optimal') {
      score -= 15;
    }

    // Deduct for lockout issues
    if (metrics.lockoutQuality === 'incomplete') {
      score -= 20;
    } else if (metrics.lockoutQuality === 'partial') {
      score -= 10;
    }

    // Deduct for excessive arch
    if (metrics.archQuality === 'excessive') {
      score -= 20;
    }

    // Deduct for breathing
    if (metrics.breathingPattern === 'incorrect') {
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
  private calculateInjuryRisk(metrics: OverheadPressMetrics, warnings: string[]): number {
    let riskScore = 0;

    // High risk factors
    if (metrics.coreEngagement === 'poor') {
      riskScore += 35; // Lower back injury risk
    }

    if (metrics.archQuality === 'excessive') {
      riskScore += 30; // Lower back compression
    }

    // Medium risk factors
    if (metrics.shoulderMobilityScore && metrics.shoulderMobilityScore < 60) {
      riskScore += 25; // Shoulder impingement risk
    }

    if (metrics.elbowPosition !== 'optimal') {
      riskScore += 20;
    }

    // Low risk factors
    if (metrics.lockoutQuality === 'incomplete') {
      riskScore += 15;
    }

    if (metrics.breathingPattern === 'incorrect') {
      riskScore += 10;
    }

    // Add for warnings
    riskScore += warnings.length * 5;

    // Cap at 100
    return Math.min(100, riskScore);
  }
}

export default OverheadPressFormAnalyzer;

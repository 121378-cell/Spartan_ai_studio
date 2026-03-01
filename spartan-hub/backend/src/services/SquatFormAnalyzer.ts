/**
 * Squat Form Analyzer
 * Phase A: Video Form Analysis MVP
 * 
 * Analyzes squat exercise form using pose landmarks
 */

import { PoseLandmarks, PoseValidator } from './PoseValidator';
import { logger } from '../utils/logger';

export interface SquatMetrics {
  repsCompleted: number;
  durationSeconds: number;
  kneeValgusAngle?: number; // Degrees
  squatDepth?: 'parallel' | 'above_parallel' | 'below_parallel';
  torsoAngle?: number; // Degrees from vertical
  kneeTracking?: 'good' | 'slight_valgus' | 'excessive_valgus';
  depthQuality?: 'excellent' | 'good' | 'needs_improvement';
}

export interface SquatAnalysis {
  formScore: number; // 0-100
  metrics: SquatMetrics;
  warnings: string[];
  recommendations: string[];
  injuryRiskScore?: number;
}

export class SquatFormAnalyzer {
  private validator: PoseValidator;

  constructor() {
    this.validator = new PoseValidator();
  }

  /**
   * Analyze squat form from pose landmarks
   */
  analyze(landmarks: PoseLandmarks, repData?: any): SquatAnalysis {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate landmarks
    const validation = this.validator.validate(landmarks);
    if (!validation.valid || !validation.normalized) {
      return {
        formScore: 0,
        metrics: { repsCompleted: 0, durationSeconds: 0 },
        warnings: ['Invalid pose data detected'],
        recommendations: ['Ensure camera has clear view of your body']
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

    logger.info('Squat analysis completed', {
      context: 'squat-analyzer',
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
   * Calculate squat metrics from landmarks
   */
  private calculateMetrics(landmarks: PoseLandmarks, repData?: any): SquatMetrics {
    // Get key landmarks
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    // Calculate knee valgus angle (knee collapse inward)
    const kneeValgusAngle = this.calculateKneeValgus(leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle);

    // Calculate squat depth
    const squatDepth = this.calculateSquatDepth(leftHip, leftKnee, leftAnkle);

    // Calculate torso angle
    const torsoAngle = this.calculateTorsoAngle(leftHip, leftShoulder, rightShoulder);

    // Determine knee tracking quality
    const kneeTracking = this.determineKneeTracking(kneeValgusAngle);

    // Determine depth quality
    const depthQuality = this.determineDepthQuality(squatDepth);

    return {
      repsCompleted: repData?.reps || 1,
      durationSeconds: repData?.duration || 0,
      kneeValgusAngle,
      squatDepth,
      torsoAngle,
      kneeTracking,
      depthQuality
    };
  }

  /**
   * Calculate knee valgus angle
   */
  private calculateKneeValgus(
    leftHip: any, leftKnee: any, leftAnkle: any,
    rightHip: any, rightKnee: any, rightAnkle: any
  ): number {
    // Simplified calculation - in production would use proper 3D geometry
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // Average of both knees
    const avgAngle = (leftKneeAngle + rightKneeAngle) / 2;
    
    // Ideal squat knee angle is around 130-140 degrees
    // Deviation indicates valgus
    const idealAngle = 135;
    const deviation = Math.abs(avgAngle - idealAngle);
    
    return Math.min(deviation * 2, 30); // Cap at 30 degrees
  }

  /**
   * Calculate squat depth
   */
  private calculateSquatDepth(hip: any, knee: any, ankle: any): 'parallel' | 'above_parallel' | 'below_parallel' {
    const kneeAngle = this.calculateAngle(hip, knee, ankle);
    
    if (kneeAngle < 90) {
      return 'below_parallel'; // Deep squat
    } else if (kneeAngle >= 90 && kneeAngle <= 100) {
      return 'parallel'; // Good depth
    } else {
      return 'above_parallel'; // Shallow squat
    }
  }

  /**
   * Calculate torso angle from vertical
   */
  private calculateTorsoAngle(hip: any, leftShoulder: any, rightShoulder: any): number {
    // Calculate midpoint between shoulders
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };

    // Calculate angle from vertical
    const dx = shoulderMidpoint.x - hip.x;
    const dy = shoulderMidpoint.y - hip.y;
    
    const angle = Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
    
    return Math.round(angle * 10) / 10;
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
   * Determine knee tracking quality
   */
  private determineKneeTracking(valgusAngle: number): 'good' | 'slight_valgus' | 'excessive_valgus' {
    if (valgusAngle < 5) {
      return 'good';
    } else if (valgusAngle >= 5 && valgusAngle < 15) {
      return 'slight_valgus';
    } else {
      return 'excessive_valgus';
    }
  }

  /**
   * Determine depth quality
   */
  private determineDepthQuality(depth: 'parallel' | 'above_parallel' | 'below_parallel'): 'excellent' | 'good' | 'needs_improvement' {
    if (depth === 'parallel' || depth === 'below_parallel') {
      return 'excellent';
    } else if (depth === 'above_parallel') {
      return 'needs_improvement';
    }
    return 'good';
  }

  /**
   * Analyze form and generate warnings/recommendations
   */
  private analyzeForm(landmarks: PoseLandmarks, metrics: SquatMetrics): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check knee valgus
    if (metrics.kneeTracking === 'excessive_valgus') {
      warnings.push('Excessive knee valgus detected (knees caving inward)');
      recommendations.push('Focus on pushing your knees out during the ascent');
      recommendations.push('Consider reducing weight to focus on form');
    } else if (metrics.kneeTracking === 'slight_valgus') {
      warnings.push('Slight knee valgus detected');
      recommendations.push('Work on keeping knees aligned with toes');
    }

    // Check squat depth
    if (metrics.squatDepth === 'above_parallel') {
      warnings.push('Squat depth is shallow (above parallel)');
      recommendations.push('Aim to squat until hips are at least parallel to knees');
      recommendations.push('Work on ankle and hip mobility');
    }

    // Check torso angle
    if ((metrics.torsoAngle || 0) > 45) {
      warnings.push('Excessive forward lean detected');
      recommendations.push('Keep your chest up and core engaged');
      recommendations.push('Check ankle mobility - limited dorsiflexion may cause lean');
    }

    return { warnings, recommendations };
  }

  /**
   * Calculate overall form score
   */
  private calculateFormScore(metrics: SquatMetrics, warnings: string[]): number {
    let score = 100;

    // Deduct for knee valgus
    if (metrics.kneeTracking === 'excessive_valgus') {
      score -= 30;
    } else if (metrics.kneeTracking === 'slight_valgus') {
      score -= 15;
    }

    // Deduct for poor depth
    if (metrics.squatDepth === 'above_parallel') {
      score -= 20;
    }

    // Deduct for excessive forward lean
    if ((metrics.torsoAngle || 0) > 45) {
      score -= 15;
    }

    // Deduct for warnings
    score -= warnings.length * 5;

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate injury risk score
   */
  private calculateInjuryRisk(metrics: SquatMetrics, warnings: string[]): number {
    let riskScore = 0;

    // High risk factors
    if (metrics.kneeTracking === 'excessive_valgus') {
      riskScore += 40;
    }

    if ((metrics.torsoAngle || 0) > 60) {
      riskScore += 30;
    }

    // Medium risk factors
    if (metrics.kneeTracking === 'slight_valgus') {
      riskScore += 20;
    }

    if (metrics.squatDepth === 'above_parallel') {
      riskScore += 15;
    }

    // Low risk factors
    riskScore += warnings.length * 5;

    // Cap at 100
    return Math.min(100, riskScore);
  }
}

export default SquatFormAnalyzer;

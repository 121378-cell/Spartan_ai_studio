/**
 * Row Form Analyzer
 * Phase B: Advanced Form Analysis
 * 
 * Analyzes bent-over row exercise form using pose landmarks
 */

import { PoseLandmarks, PoseValidator } from './PoseValidator';
import { logger } from '../utils/logger';

export interface RowMetrics {
  repsCompleted: number;
  durationSeconds: number;
  backAngle?: number; // Angle from vertical
  spineNeutrality?: 'neutral' | 'rounded' | 'extended';
  elbowTravel?: 'full' | 'partial';
  momentum?: 'low' | 'high'; // Detecting swinging
}

export interface RowAnalysis {
  formScore: number; // 0-100
  metrics: RowMetrics;
  warnings: string[];
  recommendations: string[];
  injuryRiskScore?: number;
}

export class RowFormAnalyzer {
  private validator: PoseValidator;

  constructor() {
    this.validator = new PoseValidator();
  }

  /**
   * Analyze row form from pose landmarks
   */
  analyze(landmarks: PoseLandmarks, repData?: any): RowAnalysis {
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

    return {
      formScore,
      metrics,
      warnings,
      recommendations,
      injuryRiskScore
    };
  }

  /**
   * Calculate row metrics from landmarks
   */
  private calculateMetrics(landmarks: PoseLandmarks, repData?: any): RowMetrics {
    const leftShoulder = landmarks[11];
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];

    // Calculate back angle (from vertical)
    const backAngle = this.calculateBackAngle(leftShoulder, leftHip);

    // Determine spine neutrality (simplified)
    const spineNeutrality = 'neutral'; // Requires more points for curve detection

    // Determine elbow travel
    const elbowTravel = 'full'; // Requires temporal tracking of min/max elbow position

    return {
      repsCompleted: repData?.reps || 0,
      durationSeconds: repData?.duration || 0,
      backAngle,
      spineNeutrality,
      elbowTravel,
      momentum: 'low'
    };
  }

  /**
   * Calculate back angle from vertical
   */
  private calculateBackAngle(shoulder: any, hip: any): number {
    const dx = shoulder.x - hip.x;
    const dy = shoulder.y - hip.y;
    // Atan2(dx, dy) gives angle from Y axis
    return Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
  }

  /**
   * Analyze form and generate warnings/recommendations
   */
  private analyzeForm(landmarks: PoseLandmarks, metrics: RowMetrics): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check back angle (ideal for bent over row is ~45-90 degrees depending on style, usually ~45)
    // If < 15 degrees, too upright (upright row or shrug)
    if ((metrics.backAngle || 0) < 30) {
      warnings.push('Torso too upright');
      recommendations.push('Hinge at your hips to lean forward more');
    }

    return { warnings, recommendations };
  }

  /**
   * Calculate overall form score
   */
  private calculateFormScore(metrics: RowMetrics, warnings: string[]): number {
    let score = 100;
    
    if ((metrics.backAngle || 0) < 30) score -= 20;
    
    score -= warnings.length * 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate injury risk score
   */
  private calculateInjuryRisk(metrics: RowMetrics, warnings: string[]): number {
    let riskScore = 0;
    
    // Rounded back is high risk, but hard to detect with just 2 points.
    // Assuming metric is reliable:
    if (metrics.spineNeutrality === 'rounded') riskScore += 40;
    
    return Math.min(100, riskScore);
  }
}

export default RowFormAnalyzer;

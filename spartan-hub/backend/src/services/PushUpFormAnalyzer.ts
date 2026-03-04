/**
 * PushUp Form Analyzer
 * Phase B: Advanced Form Analysis
 * 
 * Analyzes push-up exercise form using pose landmarks
 */

import { PoseLandmarks, PoseValidator } from './PoseValidator';
import { logger } from '../utils/logger';

export interface PushUpMetrics {
  repsCompleted: number;
  durationSeconds: number;
  elbowAngle?: number; // Degrees at bottom
  backAlignment?: 'neutral' | 'sagging' | 'piked'; // Hips position relative to shoulder-ankle line
  depth?: 'full' | 'partial' | 'shallow';
  handPosition?: 'optimal' | 'too_wide' | 'too_narrow';
}

export interface PushUpAnalysis {
  formScore: number; // 0-100
  metrics: PushUpMetrics;
  warnings: string[];
  recommendations: string[];
  injuryRiskScore?: number;
}

export class PushUpFormAnalyzer {
  private validator: PoseValidator;

  constructor() {
    this.validator = new PoseValidator();
  }

  /**
   * Analyze push-up form from pose landmarks
   */
  analyze(landmarks: PoseLandmarks, repData?: any): PushUpAnalysis {
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
   * Calculate push-up metrics from landmarks
   */
  private calculateMetrics(landmarks: PoseLandmarks, repData?: any): PushUpMetrics {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    // Calculate elbow angle (average)
    const leftElbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
    const elbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Calculate back alignment (hip deviation from shoulder-ankle line)
    const backAlignment = this.calculateBackAlignment(leftShoulder, leftHip, leftAnkle);

    // Calculate depth based on elbow angle
    const depth = this.calculateDepth(elbowAngle);

    // Calculate hand position (simplified width check relative to shoulder width)
    const handPosition = 'optimal'; // Placeholder for more complex width calculation

    return {
      repsCompleted: repData?.reps || 0,
      durationSeconds: repData?.duration || 0,
      elbowAngle,
      backAlignment,
      depth,
      handPosition
    };
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
   * Calculate back alignment
   */
  private calculateBackAlignment(shoulder: any, hip: any, ankle: any): 'neutral' | 'sagging' | 'piked' {
    // Calculate angle at the hip
    const hipAngle = this.calculateAngle(shoulder, hip, ankle);
    
    // Ideal is 180 (straight line)
    // < 160 implies piking (hips high) or sagging depending on orientation
    // Assuming horizontal pushup:
    // If y of hip is lower (larger value) than line between shoulder and ankle -> Sagging
    
    // Simple angle check first
    if (hipAngle > 170) return 'neutral';
    
    // Determine direction based on y-coordinates (assuming standard camera view)
    // This is a simplified heuristic
    return 'sagging'; 
  }

  /**
   * Calculate depth
   */
  private calculateDepth(elbowAngle: number): 'full' | 'partial' | 'shallow' {
    if (elbowAngle < 90) return 'full';
    if (elbowAngle < 135) return 'partial';
    return 'shallow';
  }

  /**
   * Analyze form and generate warnings/recommendations
   */
  private analyzeForm(landmarks: PoseLandmarks, metrics: PushUpMetrics): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (metrics.backAlignment === 'sagging') {
      warnings.push('Hips are sagging');
      recommendations.push('Engage your core and glutes to keep body straight');
    }

    if (metrics.depth === 'shallow') {
      warnings.push('Push-up depth is too shallow');
      recommendations.push('Try to lower your chest closer to the floor');
    }

    return { warnings, recommendations };
  }

  /**
   * Calculate overall form score
   */
  private calculateFormScore(metrics: PushUpMetrics, warnings: string[]): number {
    let score = 100;
    
    if (metrics.backAlignment !== 'neutral') score -= 20;
    if (metrics.depth === 'shallow') score -= 20;
    if (metrics.depth === 'partial') score -= 10;
    
    score -= warnings.length * 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate injury risk score
   */
  private calculateInjuryRisk(metrics: PushUpMetrics, warnings: string[]): number {
    let riskScore = 0;
    
    if (metrics.backAlignment === 'sagging') riskScore += 30; // Lower back stress
    
    // Cap at 100
    return Math.min(100, riskScore);
  }
}

export default PushUpFormAnalyzer;

/**
 * Plank Form Analyzer
 * Phase B: Advanced Form Analysis
 * 
 * Analyzes plank exercise form using pose landmarks
 */

import { PoseLandmarks, PoseValidator } from './PoseValidator';
import { logger } from '../utils/logger';

export interface PlankMetrics {
  durationSeconds: number;
  backAlignment?: 'neutral' | 'sagging' | 'piked';
  headPosition?: 'neutral' | 'dropped' | 'lifted';
  stabilityScore?: number; // 0-100 based on movement
}

export interface PlankAnalysis {
  formScore: number; // 0-100
  metrics: PlankMetrics;
  warnings: string[];
  recommendations: string[];
  injuryRiskScore?: number;
}

export class PlankFormAnalyzer {
  private validator: PoseValidator;

  constructor() {
    this.validator = new PoseValidator();
  }

  /**
   * Analyze plank form from pose landmarks
   */
  analyze(landmarks: PoseLandmarks, repData?: any): PlankAnalysis {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate landmarks
    const validation = this.validator.validate(landmarks);
    if (!validation.valid || !validation.normalized) {
      return {
        formScore: 0,
        metrics: { durationSeconds: 0 },
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
   * Calculate plank metrics from landmarks
   */
  private calculateMetrics(landmarks: PoseLandmarks, repData?: any): PlankMetrics {
    const leftShoulder = landmarks[11];
    const leftHip = landmarks[23];
    const leftAnkle = landmarks[27];
    const nose = landmarks[0];

    // Calculate back alignment
    const backAlignment = this.calculateBackAlignment(leftShoulder, leftHip, leftAnkle);

    // Calculate head position (relative to shoulder line)
    const headPosition = 'neutral'; // Placeholder

    return {
      durationSeconds: repData?.duration || 0,
      backAlignment,
      headPosition,
      stabilityScore: 100 // Placeholder for time-series variance analysis
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
    const hipAngle = this.calculateAngle(shoulder, hip, ankle);
    
    if (hipAngle > 170) return 'neutral';
    
    // Check y-coordinates to determine sag vs pike
    // Assuming standard view: higher Y is lower in screen (sagging)
    // But normalized coordinates: 0 is top, 1 is bottom.
    // If hip.y > line_y, hip is lower -> sagging.
    
    // Simple angle heuristic for now
    return 'sagging';
  }

  /**
   * Analyze form and generate warnings/recommendations
   */
  private analyzeForm(landmarks: PoseLandmarks, metrics: PlankMetrics): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (metrics.backAlignment === 'sagging') {
      warnings.push('Hips are sagging');
      recommendations.push('Lift your hips to align with shoulders and ankles');
    } else if (metrics.backAlignment === 'piked') {
      warnings.push('Hips are too high');
      recommendations.push('Lower your hips to form a straight line');
    }

    return { warnings, recommendations };
  }

  /**
   * Calculate overall form score
   */
  private calculateFormScore(metrics: PlankMetrics, warnings: string[]): number {
    let score = 100;
    
    if (metrics.backAlignment !== 'neutral') score -= 30;
    
    score -= warnings.length * 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate injury risk score
   */
  private calculateInjuryRisk(metrics: PlankMetrics, warnings: string[]): number {
    let riskScore = 0;
    
    if (metrics.backAlignment === 'sagging') riskScore += 40; // High lumbar stress
    
    return Math.min(100, riskScore);
  }
}

export default PlankFormAnalyzer;

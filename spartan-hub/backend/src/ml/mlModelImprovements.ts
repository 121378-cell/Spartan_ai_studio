/**
 * ML Model Improvements
 * Phase B: Advanced ML Models - Week 5 Day 1
 * 
 * Enhanced feature engineering and model improvements
 * for form analysis accuracy
 */

import { logger } from '../utils/logger';

export interface ModelFeatures {
  // Basic features
  jointAngles: number[];
  velocities: number[];
  accelerations: number[];
  
  // Advanced features
  symmetryScore: number;
  stabilityScore: number;
  rangeOfMotion: number;
  controlScore: number;
  
  // Temporal features
  movementTime: number;
  eccentricTime: number;
  concentricTime: number;
  pauseDuration: number;
  
  // Quality metrics
  smoothness: number;
  efficiency: number;
  consistency: number;
}

export interface ModelPrediction {
  formScore: number;
  confidence: number;
  riskFactors: string[];
  recommendations: string[];
}

/**
 * Enhanced Feature Engineering
 */
export class FeatureEngineering {
  /**
   * Extract comprehensive features from pose data
   */
  extractFeatures(poseData: any[], exerciseType: string): ModelFeatures {
    const jointAngles = this.calculateJointAngles(poseData);
    const velocities = this.calculateVelocities(poseData);
    const accelerations = this.calculateAccelerations(poseData);
    
    const symmetryScore = this.calculateSymmetry(poseData);
    const stabilityScore = this.calculateStability(poseData);
    const rangeOfMotion = this.calculateRangeOfMotion(poseData, exerciseType);
    const controlScore = this.calculateControl(poseData);
    
    const temporalFeatures = this.extractTemporalFeatures(poseData);
    
    const smoothness = this.calculateSmoothness(velocities);
    const efficiency = this.calculateEfficiency(jointAngles, velocities);
    const consistency = this.calculateConsistency(poseData);
    
    return {
      jointAngles,
      velocities,
      accelerations,
      symmetryScore,
      stabilityScore,
      rangeOfMotion,
      controlScore,
      movementTime: temporalFeatures.movementTime,
      eccentricTime: temporalFeatures.eccentricTime,
      concentricTime: temporalFeatures.concentricTime,
      pauseDuration: temporalFeatures.pauseDuration,
      smoothness,
      efficiency,
      consistency
    };
  }

  /**
   * Calculate joint angles for all relevant joints
   */
  private calculateJointAngles(poseData: any[]): number[] {
    const angles: number[] = [];
    
    // Calculate angles for key joints based on exercise type
    // This is simplified - would use actual biomechanical calculations
    for (let i = 0; i < poseData.length - 1; i++) {
      const angle = this.calculateAngle3D(
        poseData[i],
        poseData[i + 1],
        poseData[i + 2]
      );
      angles.push(angle);
    }
    
    return angles;
  }

  /**
   * Calculate velocities from position data
   */
  private calculateVelocities(poseData: any[]): number[] {
    const velocities: number[] = [];
    
    for (let i = 1; i < poseData.length; i++) {
      const velocity = this.calculateVelocity(poseData[i - 1], poseData[i]);
      velocities.push(velocity);
    }
    
    return velocities;
  }

  /**
   * Calculate accelerations from velocity data
   */
  private calculateAccelerations(poseData: any[]): number[] {
    const velocities = this.calculateVelocities(poseData);
    const accelerations: number[] = [];
    
    for (let i = 1; i < velocities.length; i++) {
      const acceleration = velocities[i] - velocities[i - 1];
      accelerations.push(acceleration);
    }
    
    return accelerations;
  }

  /**
   * Calculate symmetry score between left and right sides
   */
  private calculateSymmetry(poseData: any[]): number {
    // Compare left and right side joint angles
    // Higher score = more symmetrical
    const leftSide = this.extractSideFeatures(poseData, 'left');
    const rightSide = this.extractSideFeatures(poseData, 'right');
    
    const difference = Math.abs(leftSide - rightSide);
    const symmetryScore = Math.max(0, 100 - difference * 10);
    
    return symmetryScore;
  }

  /**
   * Calculate stability score
   */
  private calculateStability(poseData: any[]): number {
    // Measure how stable the user is throughout the movement
    // Lower variance = higher stability
    const positions = poseData.map(p => p.centerOfMass || { x: 0.5, y: 0.5 });
    
    const meanX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const meanY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
    
    const variance = positions.reduce((sum, p) => {
      return sum + Math.pow(p.x - meanX, 2) + Math.pow(p.y - meanY, 2);
    }, 0) / positions.length;
    
    const stabilityScore = Math.max(0, 100 - variance * 100);
    return stabilityScore;
  }

  /**
   * Calculate range of motion
   */
  private calculateRangeOfMotion(poseData: any[], exerciseType: string): number {
    // Calculate ROM based on exercise type
    // Different exercises have different ROM requirements
    
    if (poseData.length === 0) return 0;
    
    const minAngle = Math.min(...poseData.map(p => p.primaryJointAngle || 0));
    const maxAngle = Math.max(...poseData.map(p => p.primaryJointAngle || 0));
    
    const rom = maxAngle - minAngle;
    const idealROM = this.getIdealROM(exerciseType);
    
    // Score based on how close to ideal ROM
    const romScore = Math.max(0, 100 - Math.abs(rom - idealROM));
    
    return romScore;
  }

  /**
   * Calculate control score
   */
  private calculateControl(poseData: any[]): number {
    // Measure how controlled the movement is
    // Smooth, deliberate movements = high control
    
    if (poseData.length < 3) return 50;
    
    const jerkiness = this.calculateJerkiness(poseData);
    const controlScore = Math.max(0, 100 - jerkiness * 10);
    
    return controlScore;
  }

  /**
   * Extract temporal features
   */
  private extractTemporalFeatures(poseData: any[]): {
    movementTime: number;
    eccentricTime: number;
    concentricTime: number;
    pauseDuration: number;
  } {
    if (poseData.length === 0) {
      return {
        movementTime: 0,
        eccentricTime: 0,
        concentricTime: 0,
        pauseDuration: 0
      };
    }
    
    const movementTime = poseData.length * (1 / 30); // Assuming 30fps
    
    // Detect phases based on velocity
    const velocities = this.calculateVelocities(poseData);
    const eccentricPhase = velocities.filter(v => v < 0).length;
    const concentricPhase = velocities.filter(v => v > 0).length;
    
    const eccentricTime = eccentricPhase * (1 / 30);
    const concentricTime = concentricPhase * (1 / 30);
    
    // Detect pauses (near-zero velocity)
    const pauses = velocities.filter(v => Math.abs(v) < 0.01).length;
    const pauseDuration = pauses * (1 / 30);
    
    return {
      movementTime,
      eccentricTime,
      concentricTime,
      pauseDuration
    };
  }

  /**
   * Calculate movement smoothness
   */
  private calculateSmoothness(velocities: number[]): number {
    if (velocities.length < 3) return 50;
    
    // Calculate jerk (rate of change of acceleration)
    const jerks: number[] = [];
    for (let i = 2; i < velocities.length; i++) {
      const jerk = velocities[i] - 2 * velocities[i - 1] + velocities[i - 2];
      jerks.push(Math.abs(jerk));
    }
    
    const avgJerk = jerks.reduce((sum, j) => sum + j, 0) / jerks.length;
    const smoothness = Math.max(0, 100 - avgJerk * 10);
    
    return smoothness;
  }

  /**
   * Calculate movement efficiency
   */
  private calculateEfficiency(jointAngles: number[], velocities: number[]): number {
    // Efficiency = good form / energy expended
    const angleVariance = this.calculateVariance(jointAngles);
    const velocityVariance = this.calculateVariance(velocities);
    
    const formQuality = Math.max(0, 100 - angleVariance);
    const energyCost = (angleVariance + velocityVariance) / 2;
    
    const efficiency = formQuality / (1 + energyCost / 100);
    
    return Math.min(100, efficiency);
  }

  /**
   * Calculate consistency across reps
   */
  private calculateConsistency(poseData: any[]): number {
    // Compare each rep to the average rep
    // Higher consistency = more uniform reps
    
    if (poseData.length < 2) return 50;
    
    const repFeatures = this.segmentReps(poseData);
    if (repFeatures.length < 2) return 50;
    
    const avgFeatures = this.averageFeatures(repFeatures);
    const consistency = repFeatures.reduce((sum, features) => {
      const diff = this.featureDifference(features, avgFeatures);
      return sum + (100 - diff);
    }, 0) / repFeatures.length;
    
    return consistency;
  }

  // Helper methods
  private calculateAngle3D(p1: any, p2: any, p3: any): number {
    // Simplified 3D angle calculation
    return Math.acos(0.5) * (180 / Math.PI); // Placeholder
  }

  private calculateVelocity(p1: any, p2: any): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private extractSideFeatures(poseData: any[], side: string): number {
    // Extract features for left or right side
    return 0.5; // Placeholder
  }

  private getIdealROM(exerciseType: string): number {
    const idealROMs: Record<string, number> = {
      squat: 120,
      deadlift: 140,
      bench_press: 90,
      overhead_press: 180
    };
    return idealROMs[exerciseType] || 90;
  }

  private calculateJerkiness(poseData: any[]): number {
    // Calculate movement jerkiness
    return 0.5; // Placeholder
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }

  private segmentReps(poseData: any[]): any[] {
    // Segment continuous data into individual reps
    return [poseData]; // Placeholder
  }

  private averageFeatures(features: any[]): any {
    return features[0]; // Placeholder
  }

  private featureDifference(f1: any, f2: any): number {
    return 0; // Placeholder
  }
}

/**
 * Enhanced Model Prediction
 */
export class EnhancedModelPredictor {
  private featureEngineering: FeatureEngineering;

  constructor() {
    this.featureEngineering = new FeatureEngineering();
  }

  /**
   * Predict form quality with enhanced features
   */
  predict(poseData: any[], exerciseType: string): ModelPrediction {
    const features = this.featureEngineering.extractFeatures(poseData, exerciseType);
    
    // Calculate form score based on weighted features
    const formScore = this.calculateFormScore(features);
    const confidence = this.calculateConfidence(features);
    const riskFactors = this.identifyRiskFactors(features, exerciseType);
    const recommendations = this.generateRecommendations(features, riskFactors);
    
    logger.info('Enhanced ML prediction completed', {
      context: 'ml-model',
      metadata: {
        exerciseType,
        formScore,
        confidence,
        riskFactors: riskFactors.length,
        recommendations: recommendations.length
      }
    });
    
    return {
      formScore,
      confidence,
      riskFactors,
      recommendations
    };
  }

  private calculateFormScore(features: ModelFeatures): number {
    // Weighted combination of features
    const weights = {
      symmetryScore: 0.15,
      stabilityScore: 0.15,
      rangeOfMotion: 0.2,
      controlScore: 0.2,
      smoothness: 0.15,
      efficiency: 0.15
    };
    
    const formScore =
      features.symmetryScore * weights.symmetryScore +
      features.stabilityScore * weights.stabilityScore +
      features.rangeOfMotion * weights.rangeOfMotion +
      features.controlScore * weights.controlScore +
      features.smoothness * weights.smoothness +
      features.efficiency * weights.efficiency;
    
    return Math.round(formScore);
  }

  private calculateConfidence(features: ModelFeatures): number {
    // Confidence based on data quality and feature consistency
    const dataQuality = features.consistency;
    const featureReliability = (features.smoothness + features.efficiency) / 2;
    
    const confidence = (dataQuality + featureReliability) / 2;
    return Math.round(confidence);
  }

  private identifyRiskFactors(features: ModelFeatures, exerciseType: string): string[] {
    const riskFactors: string[] = [];
    
    if (features.symmetryScore < 70) {
      riskFactors.push('Muscular imbalance detected');
    }
    
    if (features.stabilityScore < 60) {
      riskFactors.push('Poor stability/control');
    }
    
    if (features.rangeOfMotion < 70) {
      riskFactors.push('Limited range of motion');
    }
    
    if (features.controlScore < 60) {
      riskFactors.push('Poor movement control');
    }
    
    if (features.smoothness < 60) {
      riskFactors.push('Jerky movement pattern');
    }
    
    return riskFactors;
  }

  private generateRecommendations(features: ModelFeatures, riskFactors: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskFactors.includes('Muscular imbalance detected')) {
      recommendations.push('Focus on unilateral exercises to address imbalances');
    }
    
    if (riskFactors.includes('Poor stability/control')) {
      recommendations.push('Reduce weight and focus on stability');
      recommendations.push('Engage core throughout movement');
    }
    
    if (riskFactors.includes('Limited range of motion')) {
      recommendations.push('Work on mobility and flexibility');
      recommendations.push('Start with partial ROM and progress gradually');
    }
    
    if (riskFactors.includes('Poor movement control')) {
      recommendations.push('Slow down the movement tempo');
      recommendations.push('Focus on mind-muscle connection');
    }
    
    if (riskFactors.includes('Jerky movement pattern')) {
      recommendations.push('Use controlled tempo throughout');
      recommendations.push('Reduce weight to maintain smooth movement');
    }
    
    return recommendations;
  }
}

export default { FeatureEngineering, EnhancedModelPredictor };

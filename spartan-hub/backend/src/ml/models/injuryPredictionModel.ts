/**
 * Injury Prediction ML Model Wrapper
 * Bridges ML predictions with Phase 3 Advanced Analysis
 */

import { logger } from '../../utils/logger';
import { FeatureEngineeringService, BiometricRawData, FeatureSet } from '../services/featureEngineeringService';
import { MLInferenceService } from '../services/mlInferenceService';

export interface InjuryPredictionMLResult {
  injuryRisk: number;          // 0-100
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;          // 0-1
  mlSource: boolean;           // True if from ML model
  areaRisks: {
    lowerBody: number;
    upperBody: number;
    core: number;
    cardiovascular: number;
  };
  injuryTypes: {
    type: string;
    probability: number;
    affectedAreas: string[];
  }[];
  riskFactors: {
    highTrainingLoad: boolean;
    inadequateRecovery: boolean;
    muscleImbalance: boolean;
    overusePattern: boolean;
    inflammationMarkers: boolean;
    sleepDeprivation: boolean;
    rapidIntensityIncrease: boolean;
  };
  preventionRecommendations: string[];
}

/**
 * Injury Prediction ML Model
 */
export class InjuryPredictionModel {
  /**
   * Predict injury risk using ML + Phase 3 hybrid approach
   */
  static async predict(
    biometricHistory: any[],
    trainingLoad?: any
  ): Promise<InjuryPredictionMLResult> {
    logger.info('Injury prediction started', {
      context: 'ml/injuryPredictionModel',
      metadata: { dataPoints: biometricHistory.length },
    });

    try {
      // Get ML inference (with Phase 3 fallback)
      const mlResult = await MLInferenceService.predictInjuryRisk(biometricHistory, trainingLoad);

      // Extract features for detailed analysis
      const features = FeatureEngineeringService.extractFeatures(biometricHistory);

      // Assess risk factors
      const riskFactors = this.assessRiskFactors(features, biometricHistory);

      // Calculate area-specific risks
      const areaRisks = this.calculateAreaRisks(features, riskFactors);

      // Identify injury types
      const injuryTypes = this.identifyInjuryTypes(riskFactors, areaRisks);

      // Generate prevention recommendations
      const recommendations = this.generateRecommendations(riskFactors, areaRisks);

      // Determine risk level
      const riskScore = mlResult.prediction.riskScore ||
                        (mlResult.prediction.injuryRisk || 40);
      const riskLevel = this.getRiskLevel(riskScore);
      const confidence = mlResult.mlConfidence || 0.65;

      const result: InjuryPredictionMLResult = {
        injuryRisk: riskScore,
        riskLevel,
        confidence,
        mlSource: mlResult.source === 'ml',
        areaRisks,
        injuryTypes,
        riskFactors,
        preventionRecommendations: recommendations,
      };

      logger.info('Injury prediction completed', {
        context: 'ml/injuryPredictionModel',
        metadata: {
          riskScore,
          riskLevel,
          mlSource: result.mlSource,
          confidence,
        },
      });

      return result;
    } catch (error) {
      logger.error('Error in injury prediction', {
        context: 'ml/injuryPredictionModel',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Assess individual risk factors
   */
  private static assessRiskFactors(
    features: FeatureSet,
    biometricHistory: BiometricRawData[]
  ) {
    const last3Days = biometricHistory.slice(-3);
    const last7Days = biometricHistory.slice(-7);

    // High training load: ACR > 1.3
    const highTrainingLoad = features.trainingLoadFeatures.acuteToChronicRatio > 1.3;

    // Inadequate recovery: 3+ days with recovery score < 50
    const lowRecoveryDays = last7Days.filter(d => (d.recoveryScore || 0) < 50).length;
    const inadequateRecovery = lowRecoveryDays >= 3;

    // Muscle imbalance: HRV variability > 20%
    const {hrvVariability} = features.recoveryFeatures;
    const {hrvMean} = features.recoveryFeatures;
    const muscleImbalance = hrvMean > 0 ? (hrvVariability / hrvMean) > 0.2 : false;

    // Overuse pattern: 4+ consecutive days with low recovery
    let consecutiveLowRecovery = 0;
    let maxConsecutive = 0;
    for (const day of last7Days) {
      if ((day.recoveryScore || 0) < 50) {
        consecutiveLowRecovery++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveLowRecovery);
      } else {
        consecutiveLowRecovery = 0;
      }
    }
    const overusePattern = maxConsecutive >= 4;

    // Inflammation markers: HRV < 80% of baseline
    const baselineHRV = 80;  // Typical baseline
    const inflammationMarkers = features.recoveryFeatures.hrvMean < (baselineHRV * 0.8);

    // Sleep deprivation: < 6 hours for 2+ nights
    const shortSleepNights = last7Days.filter(d => (d.sleepHours || 0) < 6).length;
    const sleepDeprivation = shortSleepNights >= 2;

    // Rapid intensity increase: >20% week-over-week
    const rapidIntensity = features.trainingLoadFeatures.loadProgression > 0.2;

    return {
      highTrainingLoad,
      inadequateRecovery,
      muscleImbalance,
      overusePattern,
      inflammationMarkers,
      sleepDeprivation,
      rapidIntensityIncrease: rapidIntensity,
    };
  }

  /**
   * Calculate area-specific risks
   */
  private static calculateAreaRisks(
    features: FeatureSet,
    riskFactors: ReturnType<typeof this.assessRiskFactors>
  ) {
    // Base risk from training load and recovery
    const baseRisk = features.trainingLoadFeatures.acuteToChronicRatio > 1.3 ? 40 : 20;

    // Add risk from factors
    let multiplier = 1;
    if (riskFactors.inadequateRecovery) multiplier += 0.2;
    if (riskFactors.muscleImbalance) multiplier += 0.15;
    if (riskFactors.overusePattern) multiplier += 0.25;
    if (riskFactors.sleepDeprivation) multiplier += 0.15;

    const adjustedBase = baseRisk * multiplier;

    return {
      // Lower body = 60% of risk (most injuries occur here)
      lowerBody: Math.min(100, adjustedBase * 1.2 + (riskFactors.highTrainingLoad ? 10 : 0)),

      // Upper body = 25% of risk
      upperBody: Math.min(100, adjustedBase * 0.8),

      // Core = stability indicator
      core: Math.min(100, adjustedBase * 0.7 + (riskFactors.muscleImbalance ? 15 : 0)),

      // Cardiovascular = overtraining indicator
      cardiovascular: Math.min(100, adjustedBase * 0.9 + (riskFactors.rapidIntensityIncrease ? 10 : 0)),
    };
  }

  /**
   * Identify likely injury types
   */
  private static identifyInjuryTypes(
    riskFactors: ReturnType<typeof this.assessRiskFactors>,
    areaRisks: ReturnType<typeof this.calculateAreaRisks>
  ) {
    const injuryTypes = [];

    // Muscle strain: High training load + inadequate recovery
    if (riskFactors.highTrainingLoad && riskFactors.inadequateRecovery) {
      injuryTypes.push({
        type: 'muscle-strain',
        probability: 65,
        affectedAreas: areaRisks.lowerBody > 50 ? ['quadriceps', 'hamstrings'] :
          areaRisks.upperBody > 50 ? ['shoulders', 'arms'] :
            ['core', 'back'],
        timeline: 'short-term' as const,
      });
    }

    // Joint stress: Rapid intensity increase
    if (riskFactors.rapidIntensityIncrease) {
      injuryTypes.push({
        type: 'joint-stress',
        probability: 50,
        affectedAreas: areaRisks.lowerBody > areaRisks.upperBody ? ['knees', 'ankles'] : ['shoulders', 'elbows'],
        timeline: 'short-term' as const,
      });
    }

    // Overuse injury: Overuse pattern + high load
    if (riskFactors.overusePattern) {
      injuryTypes.push({
        type: 'overuse',
        probability: 55,
        affectedAreas: ['tendons', 'ligaments', 'fascia'],
        timeline: 'medium-term' as const,
      });
    }

    // Stress fracture: High training load + sleep deprivation
    if (riskFactors.highTrainingLoad && riskFactors.sleepDeprivation) {
      injuryTypes.push({
        type: 'stress-fracture',
        probability: 35,
        affectedAreas: areaRisks.lowerBody > 60 ? ['tibia', 'fibula', 'metatarsals'] : ['ribs', 'pelvis'],
        timeline: 'medium-term' as const,
      });
    }

    // Tendinitis: Inflammation markers + muscle imbalance
    if (riskFactors.inflammationMarkers && riskFactors.muscleImbalance) {
      injuryTypes.push({
        type: 'tendinitis',
        probability: 45,
        affectedAreas: ['achilles', 'patellar', 'rotator-cuff'],
        timeline: 'medium-term' as const,
      });
    }

    return injuryTypes;
  }

  /**
   * Generate prevention recommendations
   */
  private static generateRecommendations(
    riskFactors: ReturnType<typeof this.assessRiskFactors>,
    areaRisks: ReturnType<typeof this.calculateAreaRisks>
  ) {
    const recommendations: string[] = [];

    if (riskFactors.highTrainingLoad) {
      recommendations.push('Reduce training volume by 20-30% for next 7 days');
      recommendations.push('Increase rest days to 2-3 per week');
    }

    if (riskFactors.inadequateRecovery) {
      recommendations.push('Implement active recovery sessions (yoga, walking)');
      recommendations.push('Focus on nutrition: increase protein and carbohydrates');
      recommendations.push('Consider massage or foam rolling for 10-15 minutes daily');
    }

    if (riskFactors.muscleImbalance) {
      recommendations.push('Add corrective exercises: glute bridges, lateral raises');
      recommendations.push('Include mobility work: 15 minutes daily');
      recommendations.push('Consider professional assessment of movement patterns');
    }

    if (riskFactors.overusePattern) {
      recommendations.push('Implement deload week with 50% reduced volume');
      recommendations.push('Vary training stimuli: change exercise selection');
      recommendations.push('Add flexibility/mobility work: 20 minutes daily');
    }

    if (riskFactors.inflammationMarkers) {
      recommendations.push('Anti-inflammatory nutrition: omega-3s, antioxidants');
      recommendations.push('Ice baths or contrast therapy: 2-3x per week');
      recommendations.push('Monitor HRV closely for recovery trends');
    }

    if (riskFactors.sleepDeprivation) {
      recommendations.push('Prioritize 7-9 hours sleep nightly');
      recommendations.push('Optimize sleep environment: cool, dark, quiet');
      recommendations.push('Avoid caffeine after 2 PM');
      recommendations.push('Consider magnesium supplementation');
    }

    if (riskFactors.rapidIntensityIncrease) {
      recommendations.push('Limit intensity increases to 10% per week');
      recommendations.push('Build mileage/volume more gradually');
      recommendations.push('Ensure adequate recovery between high-intensity sessions');
    }

    // Area-specific recommendations
    if (areaRisks.lowerBody > 60) {
      recommendations.push('Lower body focus: Single-leg exercises, balance training');
    }
    if (areaRisks.upperBody > 60) {
      recommendations.push('Upper body focus: Scapular stability, rotator cuff work');
    }
    if (areaRisks.cardiovascular > 60) {
      recommendations.push('Consider aerobic base building instead of high intensity');
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Maintain current training with focus on consistency');
      recommendations.push('Continue monitoring biometric data');
    }

    return recommendations;
  }

  /**
   * Determine risk level from score
   */
  private static getRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
    if (score < 25) return 'low';
    if (score < 50) return 'moderate';
    if (score < 75) return 'high';
    return 'critical';
  }
}

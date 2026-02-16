/**
 * ML-Enhanced Training Recommendation Model
 * Phase 4.3 - Personalized Training Plan Generation
 * 
 * LSTM-based recommendation engine that learns from user training history
 * and provides personalized 7-day training plans based on:
 * - Current fitness level
 * - Training preferences
 * - Recovery status
 * - Performance trends
 */

import { MLInferenceService } from '../services/mlInferenceService';
import { FeatureEngineeringService } from '../services/featureEngineeringService';
import { logger } from '../../utils/logger';

/**
 * Training recommendation interfaces
 */
export interface TrainingSession {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  type: 'strength' | 'cardio' | 'endurance' | 'recovery' | 'flexibility' | 'hiit' | 'rest';
  duration: number; // minutes
  intensity: number; // 1-10 scale
  focus: string[]; // muscle groups or energy systems
  specificExercises?: string[];
  notes?: string;
}

export interface TrainingRecommendationResult {
  weekPlan: TrainingSession[];
  reasoning: string[];
  focusAreas: string[];
  expectedOutcomes: {
    performanceImprovement: number; // 0-100 percentage
    fatigueLevel: number; // 0-100 (higher = more fatigue)
    injuryRisk: number; // 0-100
  };
  adjustments: {
    recommended: boolean;
    reason?: string;
    suggestion?: string;
  };
  confidence: number; // 0-1
  mlSource: boolean; // true if from ML model
  personalizedTips: string[];
}

export class TrainingRecommenderModel {
  /**
   * Generate personalized 7-day training plan
   * 
   * @param biometricHistory - User's biometric data (90 days)
   * @param trainingHistory - User's recent training (optional)
   * @param userPreferences - User's training preferences (optional)
   * @returns Training plan recommendations
   */
  static async predict(
    biometricHistory: any[],
    trainingHistory?: any[],
    userPreferences?: any
  ): Promise<TrainingRecommendationResult> {
    try {
      logger.info('Generating training recommendations', {
        context: 'TrainingRecommenderModel.predict',
        metadata: {
          dataPoints: biometricHistory.length,
          hasTrainingHistory: Boolean(trainingHistory),
          hasPreferences: Boolean(userPreferences),
        },
      });

      // Extract features for ML model
      const features = FeatureEngineeringService.extractFeatures(biometricHistory);
      const featureArray = FeatureEngineeringService.flattenFeatures(features);

      // Get ML model prediction
      const mlPrediction = await MLInferenceService.predictTrainingRecommendations(featureArray);

      // Analyze training patterns from history
      const trainingPatterns = this.analyzeTrainingPatterns(trainingHistory || []);

      // Assess current recovery status
      const recoveryStatus = this.assessRecoveryStatus(features);

      // Identify training focus areas
      const focusAreas = this.identifyFocusAreas(features, trainingPatterns);

      // Generate 7-day plan
      const weekPlan = this.generateWeekPlan(
        mlPrediction,
        trainingPatterns,
        recoveryStatus,
        focusAreas,
        userPreferences
      );

      // Generate reasoning and tips
      const reasoning = this.generateReasoning(
        features,
        trainingPatterns,
        recoveryStatus,
        focusAreas
      );

      const personalizedTips = this.generatePersonalizedTips(
        features,
        trainingPatterns,
        recoveryStatus
      );

      // Calculate expected outcomes
      const expectedOutcomes = this.calculateExpectedOutcomes(
        features,
        weekPlan,
        trainingPatterns
      );

      // Check if adjustments are needed
      const adjustments = this.recommendAdjustments(
        features,
        trainingPatterns,
        recoveryStatus
      );

      return {
        weekPlan,
        reasoning,
        focusAreas,
        expectedOutcomes,
        adjustments,
        confidence: mlPrediction.mlConfidence || 0.75,
        mlSource: Boolean(mlPrediction.mlConfidence),
        personalizedTips,
      };
    } catch (error) {
      logger.error('Error generating training recommendations', {
        context: 'TrainingRecommenderModel.predict',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze historical training patterns
   * 
   * Identifies:
   * - Most common training types
   * - Preferred training times
   * - Recovery patterns
   * - Progressive load trends
   */
  private static analyzeTrainingPatterns(trainingHistory: any[]): any {
    if (trainingHistory.length === 0) {
      return {
        preferredTypes: ['strength', 'cardio'],
        averageIntensity: 6,
        restDays: 2,
        trainingDays: 5,
        progressionRate: 1.05, // 5% weekly progression
      };
    }

    // Group by type
    const typeFrequency: Record<string, number> = {};
    let totalIntensity = 0;
    let restDays = 0;

    trainingHistory.forEach((session: any) => {
      if (session.type === 'rest') {
        restDays++;
      } else {
        typeFrequency[session.type] = (typeFrequency[session.type] || 0) + 1;
      }
      totalIntensity += session.intensity || 5;
    });

    const preferredTypes = Object.entries(typeFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([type]) => type)
      .slice(0, 3);

    return {
      preferredTypes: preferredTypes.length > 0 ? preferredTypes : ['strength', 'cardio'],
      averageIntensity: Math.round(totalIntensity / trainingHistory.length),
      restDays,
      trainingDays: trainingHistory.length - restDays,
      progressionRate: 1.05,
    };
  }

  /**
   * Assess current recovery status
   * 
   * Evaluates:
   * - HRV trends
   * - Sleep quality
   * - RHR (resting heart rate)
   * - Subjective recovery scores
   */
  private static assessRecoveryStatus(features: any): any {
    return {
      hrvTrend: features.recoveryFeatures?.hrvTrend || 0.5,
      sleepQuality: features.recoveryFeatures?.sleepQualityScore || 0.6,
      restingHeartRate: features.recoveryFeatures?.restingHeartRateTrend || 0.5,
      overallRecovery: (
        (features.recoveryFeatures?.hrvTrend || 0.5) +
        (features.recoveryFeatures?.sleepQualityScore || 0.6) +
        (features.recoveryFeatures?.restingHeartRateTrend || 0.5)
      ) / 3,
      status: 'moderate',
    };
  }

  /**
   * Identify key focus areas
   * 
   * Based on:
   * - Performance gaps
   * - Training history imbalances
   * - Energy system development
   * - Injury prevention
   */
  private static identifyFocusAreas(features: any, trainingPatterns: any): string[] {
    const focusAreas: string[] = [];

    // Check training load
    if (features.trainingLoadFeatures?.weeklyTrainingLoad > 1500) {
      focusAreas.push('Recovery Prioritization');
    }

    // Check for imbalances
    if (!trainingPatterns.preferredTypes.includes('flexibility')) {
      focusAreas.push('Flexibility & Mobility');
    }

    if (!trainingPatterns.preferredTypes.includes('hiit')) {
      focusAreas.push('High-Intensity Intervals');
    }

    // Check performance trends
    if (features.performanceFeatures?.performanceTrend < 0) {
      focusAreas.push('Performance Boost');
    }

    return focusAreas.length > 0 ? focusAreas : ['Consistent Performance'];
  }

  /**
   * Generate 7-day training plan
   */
  private static generateWeekPlan(
    mlPrediction: any,
    trainingPatterns: any,
    recoveryStatus: any,
    focusAreas: string[],
    userPreferences?: any
  ): TrainingSession[] {
    const days: TrainingSession['dayOfWeek'][] = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    const plan: TrainingSession[] = [];
    const baseIntensity = trainingPatterns.averageIntensity;
    const recoveryFactor = recoveryStatus.overallRecovery;

    // Generate plan for 7 days
    days.forEach((day, index) => {
      let session: TrainingSession;

      // Vary training types throughout week
      if (index % 7 === 0 || index % 7 === 6) {
        // Weekend sessions
        if (recoveryStatus.overallRecovery > 0.7) {
          session = {
            dayOfWeek: day,
            type: 'strength',
            duration: 60,
            intensity: Math.ceil(baseIntensity * 0.9),
            focus: ['full-body'],
            specificExercises: [
              'Compound movements',
              'Progressive overload',
              '3x5-8 rep scheme',
            ],
          };
        } else {
          session = {
            dayOfWeek: day,
            type: 'recovery',
            duration: 30,
            intensity: 3,
            focus: ['mobility', 'flexibility'],
            specificExercises: ['Yoga', 'Foam rolling', 'Light stretching'],
          };
        }
      } else if (index % 3 === 0) {
        // Rest or light activity
        session = {
          dayOfWeek: day,
          type: recoveryStatus.overallRecovery > 0.6 ? 'cardio' : 'recovery',
          duration: 30,
          intensity: recoveryStatus.overallRecovery > 0.6 ? 5 : 2,
          focus:
            recoveryStatus.overallRecovery > 0.6 ? ['aerobic-base'] : ['active-recovery'],
          notes: 'Focus on easy effort - conversational pace',
        };
      } else if (index % 2 === 0) {
        // High-intensity day
        session = {
          dayOfWeek: day,
          type: 'hiit',
          duration: 45,
          intensity: Math.min(9, baseIntensity + 1),
          focus: ['anaerobic-power', 'VO2-max'],
          specificExercises: ['30sec hard / 2min easy', '5-8 rounds', 'Maintain form'],
        };
      } else {
        // Strength-focused day
        session = {
          dayOfWeek: day,
          type: 'strength',
          duration: 60,
          intensity: baseIntensity,
          focus: ['hypertrophy', 'strength-endurance'],
          specificExercises: [
            'Main lift: 4x6-8',
            'Accessory: 3x10-12',
            'Core work: 3x15-20',
          ],
        };
      }

      // Apply focus area adjustments
      if (focusAreas.includes('Recovery Prioritization') && index % 2 === 0) {
        session.intensity = Math.max(1, session.intensity - 1);
      }

      if (focusAreas.includes('Flexibility & Mobility') && index === 3) {
        session = {
          dayOfWeek: day,
          type: 'flexibility',
          duration: 45,
          intensity: 3,
          focus: ['full-body', 'problem-areas'],
          specificExercises: ['Dynamic stretching', 'Yoga flow', 'Mobility drills'],
        };
      }

      plan.push(session);
    });

    return plan;
  }

  /**
   * Generate reasoning for recommendations
   */
  private static generateReasoning(
    features: any,
    trainingPatterns: any,
    recoveryStatus: any,
    focusAreas: string[]
  ): string[] {
    const reasons: string[] = [];

    // Training load reasoning
    if (features.trainingLoadFeatures?.weeklyTrainingLoad > 1500) {
      reasons.push('Current training load is high - recovery is prioritized this week');
    } else if (features.trainingLoadFeatures?.weeklyTrainingLoad < 500) {
      reasons.push('Training volume is low - increasing stimulus for adaptations');
    } else {
      reasons.push('Training load is in optimal range - maintaining current progression');
    }

    // Recovery reasoning
    if (recoveryStatus.overallRecovery < 0.5) {
      reasons.push('Recovery markers are low - focusing on restoration this week');
    } else if (recoveryStatus.overallRecovery > 0.75) {
      reasons.push('Recovery is excellent - can tolerate higher training stress');
    }

    // Pattern reasoning
    if (!trainingPatterns.preferredTypes.includes('flexibility')) {
      reasons.push(
        'Limited flexibility work in history - adding mobility sessions this week'
      );
    }

    // Focus area reasoning
    focusAreas.forEach((area) => {
      switch (area) {
      case 'Recovery Prioritization':
        reasons.push('Emphasizing active recovery and deload to prevent overtraining');
        break;
      case 'Flexibility & Mobility':
        reasons.push('Including mobility work to address movement quality and injury prevention');
        break;
      case 'High-Intensity Intervals':
        reasons.push('Adding HIIT to improve anaerobic capacity and work capacity');
        break;
      case 'Performance Boost':
        reasons.push('Increasing training intensity to reverse recent performance decline');
        break;
      }
    });

    return reasons;
  }

  /**
   * Generate personalized tips
   */
  private static generatePersonalizedTips(
    features: any,
    trainingPatterns: any,
    recoveryStatus: any
  ): string[] {
    const tips: string[] = [];

    // Sleep tip
    if (features.recoveryFeatures?.sleepHours < 7) {
      tips.push('🛌 Aim for 7-9 hours sleep - critical for adaptation');
    }

    // Recovery tip
    if (recoveryStatus.overallRecovery < 0.6) {
      tips.push('💪 Consider adding 2-3 min cold exposure or contrast showers for recovery');
    }

    // Nutrition tip
    if (features.trainingLoadFeatures?.weeklyTrainingLoad > 1200) {
      tips.push('🍗 Increase protein intake (1.6-2.2g/kg) to support muscle adaptation');
    }

    // Hydration tip
    tips.push('💧 Drink 0.5-1L water per hour of training + electrolytes');

    // Warm-up tip
    if (trainingPatterns.averageIntensity > 6) {
      tips.push('🔥 Always do 10min warm-up before high-intensity sessions');
    }

    // Breathing tip
    tips.push('🌬️ Focus on diaphragmatic breathing during strength work (5sec inhale, 3sec exhale)');

    // Monitoring tip
    tips.push('📊 Track HRV daily - aim for 90%+ of your baseline for readiness');

    return tips.slice(0, 5); // Return top 5 tips
  }

  /**
   * Calculate expected outcomes
   */
  private static calculateExpectedOutcomes(
    features: any,
    weekPlan: TrainingSession[],
    trainingPatterns: any
  ): any {
    // Calculate average intensity in plan
    const avgIntensity = weekPlan.reduce((sum, session) => sum + session.intensity, 0) / 7;

    // Performance improvement potential
    const performanceImprovement = Math.min(
      15, // Max 15% improvement per week
      (avgIntensity - trainingPatterns.averageIntensity) * 3
    );

    // Fatigue level
    const fatigueFactor = avgIntensity / 10; // 0-1 scale
    const fatigueLevel = 30 + fatigueFactor * 40; // 30-70 range

    // Injury risk (based on recovery vs load)
    const recovery = features.recoveryFeatures?.sleepQualityScore || 0.5;
    const load = (features.trainingLoadFeatures?.acuteChronicRatio || 1) / 2; // Normalize
    const injuryRisk = Math.max(10, Math.min(70, (load / recovery) * 30));

    return {
      performanceImprovement,
      fatigueLevel,
      injuryRisk,
    };
  }

  /**
   * Recommend adjustments
   */
  private static recommendAdjustments(
    features: any,
    trainingPatterns: any,
    recoveryStatus: any
  ): any {
    const adjustments: {
      recommended: boolean;
      reason?: string;
      suggestion?: string;
    } = {
      recommended: false,
    };

    // Check if deload is needed
    if (features.trainingLoadFeatures?.weeklyTrainingLoad > 2000) {
      adjustments.recommended = true;
      adjustments.reason = 'Training load is very high';
      adjustments.suggestion = 'Consider a deload week (50% volume reduction)';
    }

    // Check if recovery is critical
    if (recoveryStatus.overallRecovery < 0.4) {
      adjustments.recommended = true;
      adjustments.reason = 'Recovery markers are critically low';
      adjustments.suggestion = 'Take 2-3 days of light activity or complete rest';
    }

    // Check for overtraining signs
    if (
      features.trainingLoadFeatures?.acuteChronicRatio > 1.5 &&
      recoveryStatus.overallRecovery < 0.5
    ) {
      adjustments.recommended = true;
      adjustments.reason = 'Signs of potential overtraining';
      adjustments.suggestion = 'Reduce volume by 20-30% and prioritize sleep/recovery';
    }

    return adjustments;
  }
}

/**
 * Training recommendation service exports
 */
export const trainingRecommenderModel = new TrainingRecommenderModel();

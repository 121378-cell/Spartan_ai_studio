/**
 * Advanced Analysis Service
 * 
 * Injury prediction, training recommendations, and performance analytics
 */

import { DailyBiometrics } from '../models/BiometricData';
import {
  InjuryRiskAssessment,
  TrainingLoadAnalysis,
  TrainingRecommendation,
  PeriodizationPlan,
  MovementQualityAssessment,
  PerformanceForecast,
  RecoveryProtocol,
  AdvancedPerformanceDashboard,
  LoadRecoveryCorrelation,
  AdaptiveTrainingAdjustment,
} from '../models/AdvancedAnalysis';
import logger from '../utils/logger';

export class AdvancedAnalysisService {
  /**
   * Predict injury risk based on biometric patterns
   */
  static predictInjuryRisk(
    biometricHistory: DailyBiometrics[],
    trainingLoad?: { volume: number; intensity: number }[]
  ): InjuryRiskAssessment {
    try {
      if (!biometricHistory || biometricHistory.length < 7) {
        throw new Error('Minimum 7 days of data required for injury prediction');
      }

      const today = biometricHistory[biometricHistory.length - 1];
      const last7Days = biometricHistory.slice(-7);
      const last30Days = biometricHistory.slice(-30);

      // Calculate risk factors
      const riskFactors = this.calculateInjuryRiskFactors(
        biometricHistory,
        trainingLoad
      );

      // Calculate injury risk score
      let injuryRisk = 0;
      if (riskFactors.highTrainingLoad) injuryRisk += 15;
      if (riskFactors.inadequateRecovery) injuryRisk += 20;
      if (riskFactors.muscleImbalance) injuryRisk += 15;
      if (riskFactors.overusePattern) injuryRisk += 20;
      if (riskFactors.inflammationMarkers) injuryRisk += 15;
      if (riskFactors.sleepDeprivation) injuryRisk += 10;
      if (riskFactors.rapidIntensityIncrease) injuryRisk += 15;

      injuryRisk = Math.min(100, injuryRisk);

      // Determine risk level
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (injuryRisk > 75) riskLevel = 'critical';
      else if (injuryRisk > 50) riskLevel = 'high';
      else if (injuryRisk > 25) riskLevel = 'moderate';

      // Calculate area-specific risks
      const areaRisks = this.calculateAreaRisks(last30Days, riskFactors);

      // Identify likely injury types
      const injuryTypes = this.identifyInjuryTypes(riskFactors, areaRisks);

      // Generate prevention recommendations
      const preventionRecommendations =
        this.generateInjuryPreventionRecommendations(riskFactors, riskLevel);

      // Set medical alert threshold
      const medicalAlertThreshold =
        riskLevel === 'critical'
          ? 'Consult physician immediately if symptoms appear'
          : riskLevel === 'high'
            ? 'Seek medical advice if symptoms persist > 2 days'
            : undefined;

      return {
        date: today.date,
        injuryRisk: Math.round(injuryRisk),
        riskLevel,
        confidence: this.calculateConfidence(biometricHistory.length),
        areaRisks,
        riskFactors,
        injuryTypes,
        preventionRecommendations,
        medicalAlertThreshold,
      };
    } catch (error) {
      logger.error('Error predicting injury risk', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Analyze training load and recovery balance
   */
  static analyzeTrainingLoad(
    trainingData: { date: string; volume: number; intensity: number }[],
    biometricHistory: DailyBiometrics[]
  ): TrainingLoadAnalysis {
    try {
      if (!trainingData || trainingData.length === 0) {
        throw new Error('Training data required');
      }

      const today = trainingData[trainingData.length - 1];
      const lastWeek = trainingData.slice(-7);
      const last4Weeks = trainingData.slice(-28);

      // Calculate weekly metrics
      const weeklyLoad = this.calculateWeeklyLoad(lastWeek);

      // Calculate distribution
      const distribution = this.calculateTrainingDistribution(lastWeek);

      // Calculate acute-to-chronic ratio
      const acuteToChronic = this.calculateAcuteToChronic(lastWeek, last4Weeks);

      // Calculate progression
      const progression = this.calculateLoadProgression(trainingData);

      return {
        date: today.date,
        weeklyLoad,
        distribution,
        acuteToChronic,
        progression,
      };
    } catch (error) {
      logger.error('Error analyzing training load', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Generate personalized training recommendations
   */
  static generateTrainingRecommendations(
    injuryRisk: InjuryRiskAssessment,
    trainingLoad: TrainingLoadAnalysis,
    biometricHistory: DailyBiometrics[]
  ): TrainingRecommendation {
    try {
      // Determine recommended focus
      let recommendedFocus: 'strength' | 'endurance' | 'power' | 'recovery' | 'technique' =
        'recovery';

      if (injuryRisk.riskLevel === 'low' && trainingLoad.acuteToChronic.ratio < 0.9) {
        recommendedFocus = 'strength';
      } else if (injuryRisk.riskLevel === 'low' && trainingLoad.acuteToChronic.ratio > 1.3) {
        recommendedFocus = 'endurance';
      } else if (injuryRisk.riskLevel === 'moderate') {
        recommendedFocus = 'technique';
      }

      // Generate suggestions
      const suggestions = this.generateDetailedSuggestions(
        injuryRisk,
        trainingLoad,
        recommendedFocus
      );

      // Create weekly plan
      const weeklyPlan = this.createWeeklyPlan(
        recommendedFocus,
        injuryRisk.riskLevel
      );

      // Set targets
      const targets = this.setPerformanceTargets(recommendedFocus);

      // Nutrition guidance
      const nutritionGuidance = this.generateNutritionGuidance(recommendedFocus);

      const today = biometricHistory[biometricHistory.length - 1];

      return {
        date: today.date,
        recommendedFocus,
        suggestions,
        weeklyPlan,
        targets,
        nutritionGuidance,
      };
    } catch (error) {
      logger.error('Error generating training recommendations', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Create periodization plan
   */
  static createPeriodizationPlan(
    startDate: string,
    durationWeeks: number = 12,
    goal: 'strength' | 'endurance' | 'power' | 'hypertrophy' = 'strength'
  ): PeriodizationPlan {
    try {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationWeeks * 7);

      // Determine periodization phase
      const phases = this.createPeriodizationPhases(durationWeeks, goal);

      // Set milestones
      const milestones = this.createMilestones(durationWeeks, phases);

      return {
        startDate,
        endDate: endDate.toISOString().split('T')[0],
        totalWeeks: durationWeeks,
        macrocycle: {
          phase: phases[0].phase,
          objective: phases[0].focusAreas.join(', '),
          expectedOutcome: `Improved ${goal} capacity and work capacity`,
        },
        phases,
        milestones,
      };
    } catch (error) {
      logger.error('Error creating periodization plan', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Assess movement quality
   */
  static assessMovementQuality(
    biometricHistory: DailyBiometrics[]
  ): MovementQualityAssessment {
    try {
      if (!biometricHistory || biometricHistory.length === 0) {
        throw new Error('Biometric data required');
      }

      const today = biometricHistory[biometricHistory.length - 1];
      const last30Days = biometricHistory.slice(-30);

      // Infer movement patterns from biometric data
      const patterns = this.inferMovementPatterns(last30Days);

      // Assess flexibility
      const flexibility = this.assessFlexibility(last30Days);

      // Identify strength imbalances
      const strengthImbalances = this.identifyStrengthImbalances(last30Days);

      // Calculate overall quality score
      const qualityScore = this.calculateMovementQualityScore(
        patterns,
        flexibility,
        strengthImbalances
      );

      // Main concerns
      const mainConcerns: string[] = [];
      if (patterns.some((p) => p.asymmetry > 15)) {
        mainConcerns.push('Significant movement asymmetry detected');
      }
      if (strengthImbalances.length > 0) {
        mainConcerns.push('Strength imbalances identified');
      }
      if (flexibility.some((f) => f.status === 'restricted')) {
        mainConcerns.push('Restricted mobility in key areas');
      }

      return {
        date: today.date,
        patterns,
        flexibility,
        strengthImbalances,
        qualityScore,
        mainConcerns,
        prioritizedCorrections: this.generateCorrections(
          patterns,
          flexibility,
          strengthImbalances
        ),
        estimatedCorrectionTimeline: '4-6 weeks',
      };
    } catch (error) {
      logger.error('Error assessing movement quality', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Forecast performance potential
   */
  static forecastPerformance(
    biometricHistory: DailyBiometrics[],
    trainingLoad?: { date: string; volume: number; intensity: number }[],
    weeksForecast: number = 12
  ): PerformanceForecast {
    try {
      if (!biometricHistory || biometricHistory.length < 14) {
        throw new Error('Minimum 14 days of data required');
      }

      const today = biometricHistory[biometricHistory.length - 1];
      const trend = this.calculatePerformanceTrend(biometricHistory);

      // Baseline metrics
      const currentBaseline = this.extractBaselineMetrics(biometricHistory);

      // Create projections
      const projections = this.createPerformanceProjections(
        currentBaseline,
        trend,
        weeksForecast
      );

      // Plateau analysis
      const plateauRisk = this.analyzePageauRisk(biometricHistory, weeksForecast);

      // Optimal path
      const optimalPath = this.determineOptimalPath(trend, biometricHistory);

      return {
        date: today.date,
        evaluationPeriod: weeksForecast,
        currentBaseline,
        projections,
        plateauRisk,
        optimalPath,
      };
    } catch (error) {
      logger.error('Error forecasting performance', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Prescribe recovery protocol
   */
  static prescribeRecoveryProtocol(
    injuryRisk: InjuryRiskAssessment,
    biometricHistory: DailyBiometrics[]
  ): RecoveryProtocol {
    try {
      const today = biometricHistory[biometricHistory.length - 1];

      // Determine recovery level needed
      let recoveryNeeded: 'light' | 'moderate' | 'intensive' | 'emergency' = 'light';
      if (injuryRisk.riskLevel === 'critical') {
        recoveryNeeded = 'emergency';
      } else if (injuryRisk.riskLevel === 'high') {
        recoveryNeeded = 'intensive';
      } else if (injuryRisk.riskLevel === 'moderate') {
        recoveryNeeded = 'moderate';
      }

      // Select modalities
      const modalities = this.selectRecoveryModalities(recoveryNeeded);

      // Timeline
      const timeline = this.estimateRecoveryTimeline(recoveryNeeded);

      // Monitoring metrics
      const monitoringMetrics = this.setupMonitoringMetrics(recoveryNeeded);

      return {
        date: today.date,
        recoveryNeeded,
        modalities,
        timeline,
        monitoringMetrics,
      };
    } catch (error) {
      logger.error('Error prescribing recovery protocol', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive advanced dashboard
   */
  static generateAdvancedDashboard(
    userId: string,
    biometricHistory: DailyBiometrics[],
    trainingLoad?: { date: string; volume: number; intensity: number }[]
  ): AdvancedPerformanceDashboard {
    try {
      // Generate all analyses
      const injuryRisk = this.predictInjuryRisk(biometricHistory, trainingLoad);
      const trainingLoadAnalysis = trainingLoad
        ? this.analyzeTrainingLoad(trainingLoad, biometricHistory)
        : this.createDefaultTrainingLoad();
      const trainingRecommendation = this.generateTrainingRecommendations(
        injuryRisk,
        trainingLoadAnalysis,
        biometricHistory
      );
      const movementQuality = this.assessMovementQuality(biometricHistory);
      const recoveryProtocol = this.prescribeRecoveryProtocol(
        injuryRisk,
        biometricHistory
      );
      const performanceForecast = this.forecastPerformance(
        biometricHistory,
        trainingLoad,
        12
      );
      const periodizationPlan = this.createPeriodizationPlan(
        biometricHistory[biometricHistory.length - 1].date,
        12
      );

      // Calculate overall readiness
      const overallReadiness = Math.round(
        (100 - injuryRisk.injuryRisk + (biometricHistory[biometricHistory.length - 1].recoveryIndex?.score ?? 50)) / 2
      );

      // Training status
      let trainingStatus: 'ready' | 'caution' | 'stop' = 'ready';
      if (injuryRisk.riskLevel === 'critical') trainingStatus = 'stop';
      else if (injuryRisk.riskLevel === 'high') trainingStatus = 'caution';

      return {
        userId,
        generatedAt: new Date(),
        currentStatus: {
          injuryRisk,
          trainingLoad: trainingLoadAnalysis,
          movementQuality,
        },
        recommendations: {
          training: trainingRecommendation,
          recovery: recoveryProtocol,
          periodization: periodizationPlan,
        },
        forecasts: {
          performance: performanceForecast,
        },
        summary: {
          overallReadiness,
          trainingStatus,
          keyWarnings: this.generateKeyWarnings(injuryRisk, trainingLoadAnalysis),
          topPriorities: this.generateTopPriorities(injuryRisk, movementQuality),
          expectedOutcome: this.generateExpectedOutcome(
            trainingRecommendation,
            performanceForecast
          ),
        },
      };
    } catch (error) {
      logger.error('Error generating advanced dashboard', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  // ========================
  // HELPER METHODS
  // ========================

  private static calculateInjuryRiskFactors(
    biometricHistory: DailyBiometrics[],
    trainingLoad?: { volume: number; intensity: number }[]
  ): any {
    const last7 = biometricHistory.slice(-7);
    const last30 = biometricHistory.slice(-30);

    // Check for high training load
    const avgRecovery =
      last7.reduce((sum, b) => sum + (b.recoveryIndex?.score ?? 50), 0) /
      last7.length;
    const highTrainingLoad = avgRecovery < 40;

    // Check for inadequate recovery
    const inadequateRecovery = last7.filter(
      (b) => (b.recoveryIndex?.score ?? 50) < 50
    ).length >= 3;

    // Check for muscle imbalance (inferred from HRV variability)
    const hrvValues = last7.map((b) => b.hrv?.[0]?.value ?? 50);
    const hrvVariability =
      Math.max(...hrvValues) - Math.min(...hrvValues);
    const muscleImbalance = hrvVariability > 40;

    // Check for overuse pattern
    const overusePattern = last7.filter(
      (b) => (b.recoveryIndex?.score ?? 50) < 45
    ).length >= 4;

    // Check for inflammation markers (low HRV)
    const baseline =
      last30.slice(0, 10).reduce((sum, b) => sum + (b.hrv?.[0]?.value ?? 50), 0) / 10;
    const current = last7[last7.length - 1].hrv?.[0]?.value ?? 50;
    const inflammationMarkers = current < baseline * 0.8;

    // Check for sleep deprivation
    const sleepDeprivation = last7.filter(
      (b) => (b.sleep?.duration ?? 0) < 360
    ).length >= 2;

    // Check for rapid intensity increase
    const rapidIntensityIncrease = trainingLoad
      ? trainingLoad.slice(-7).some((d, i, arr) =>
        i > 0 ? d.intensity > arr[i - 1].intensity * 1.2 : false
      )
      : false;

    return {
      highTrainingLoad,
      inadequateRecovery,
      muscleImbalance,
      overusePattern,
      inflammationMarkers,
      sleepDeprivation,
      rapidIntensityIncrease,
    };
  }

  private static calculateAreaRisks(
    biometrics: DailyBiometrics[],
    riskFactors: any
  ): any {
    return {
      lowerBody: riskFactors.overusePattern ? 60 : 30,
      upperBody: riskFactors.muscleImbalance ? 55 : 25,
      core: riskFactors.inadequateRecovery ? 50 : 20,
      cardiovascular: riskFactors.inflammationMarkers ? 65 : 25,
    };
  }

  private static identifyInjuryTypes(riskFactors: any, areaRisks: any): any[] {
    const types = [];

    if (riskFactors.overusePattern) {
      types.push({
        type: 'overuse',
        probability: 70,
        affectedAreas: ['lower body', 'knees'],
        timeline: 'short-term',
      });
    }

    if (riskFactors.muscleImbalance) {
      types.push({
        type: 'muscle-strain',
        probability: 55,
        affectedAreas: ['hamstrings', 'quadriceps'],
        timeline: 'short-term',
      });
    }

    if (riskFactors.inadequateRecovery) {
      types.push({
        type: 'tendinitis',
        probability: 45,
        affectedAreas: ['patellar tendon', 'achilles'],
        timeline: 'long-term',
      });
    }

    if (riskFactors.inflammationMarkers) {
      types.push({
        type: 'stress-fracture',
        probability: 35,
        affectedAreas: ['tibia', 'fibula'],
        timeline: 'long-term',
      });
    }

    return types;
  }

  private static generateInjuryPreventionRecommendations(
    riskFactors: any,
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('URGENT: Reduce training volume by 50% immediately');
      recommendations.push('Implement daily recovery modalities');
      recommendations.push('Seek medical evaluation within 48 hours');
    } else if (riskLevel === 'high') {
      recommendations.push('Reduce training volume by 30-40%');
      recommendations.push('Increase recovery focus (sleep, nutrition)');
      recommendations.push('Add mobility and flexibility work');
    }

    if (riskFactors.muscleImbalance) {
      recommendations.push('Add corrective exercises for identified imbalances');
    }

    if (riskFactors.overusePattern) {
      recommendations.push('Vary training stimuli to prevent overuse');
      recommendations.push('Include active recovery days');
    }

    if (riskFactors.sleepDeprivation) {
      recommendations.push('Prioritize 8-9 hours of sleep per night');
    }

    return recommendations;
  }

  private static calculateConfidence(dataPoints: number): number {
    if (dataPoints < 7) return 40;
    if (dataPoints < 14) return 60;
    if (dataPoints < 30) return 75;
    return 90;
  }

  private static calculateWeeklyLoad(week: any[]): any {
    const volumes = week.map((d) => d.volume);
    const intensities = week.map((d) => d.intensity);

    return {
      totalVolume: Math.round(volumes.reduce((a, b) => a + b, 0)),
      totalIntensity: Math.round(
        intensities.reduce((a, b) => a + b, 0) / intensities.length
      ),
      peakLoad: Math.round(Math.max(...volumes)),
      averageLoad: Math.round(
        volumes.reduce((a, b) => a + b, 0) / volumes.length
      ),
      loadVariability: Math.round((Math.max(...volumes) - Math.min(...volumes)) / 2),
    };
  }

  private static calculateTrainingDistribution(week: any[]): any {
    return {
      strength: 30,
      cardio: 40,
      flexibility: 15,
      rest: 15,
      intensity: 'mixed' as const,
    };
  }

  private static calculateAcuteToChronic(week: any[], month: any[]): any {
    const weekAvg = week.reduce((sum, d) => sum + d.volume, 0) / week.length;
    const monthAvg = month.reduce((sum, d) => sum + d.volume, 0) / month.length;
    const ratio = monthAvg > 0 ? weekAvg / monthAvg : 1;

    let status: 'undertraining' | 'optimal' | 'overtraining' = 'optimal';
    if (ratio < 0.8) status = 'undertraining';
    else if (ratio > 1.3) status = 'overtraining';

    return {
      ratio: Math.round(ratio * 100) / 100,
      status,
      trend: 0,
    };
  }

  private static calculateLoadProgression(data: any[]): any {
    if (data.length < 2) {
      return {
        weekOverWeek: 0,
        monthOverMonth: 0,
        recommendation: 'maintain',
        safeIncreasePercent: 10,
      };
    }

    const currentWeek = data.slice(-7).reduce((s, d) => s + d.volume, 0);
    const previousWeek = data.slice(-14, -7).reduce((s, d) => s + d.volume, 0);
    const weekOverWeek =
      previousWeek > 0 ? ((currentWeek - previousWeek) / previousWeek) * 100 : 0;

    let recommendation: 'increase' | 'maintain' | 'decrease' = 'maintain';
    if (weekOverWeek > 10) recommendation = 'decrease';
    else if (weekOverWeek < 5) recommendation = 'increase';

    return {
      weekOverWeek: Math.round(weekOverWeek),
      monthOverMonth: Math.round(weekOverWeek * 2),
      recommendation,
      safeIncreasePercent: 10,
    };
  }

  private static generateDetailedSuggestions(
    injury: InjuryRiskAssessment,
    load: TrainingLoadAnalysis,
    focus: string
  ): any[] {
    return [
      {
        priority: 1,
        category: 'intensity' as const,
        suggestion: 'Maintain moderate intensity given current risk profile',
        rationale: `Injury risk is ${injury.riskLevel} - progressive intensity increase not recommended`,
        expectedBenefit: 'Reduced injury risk',
        estimatedTimeToResult: '1-2 weeks',
      },
      {
        priority: 2,
        category: 'volume' as const,
        suggestion: `Training volume should be ${load.progression.recommendation}`,
        rationale: `Current load ratio is ${load.acuteToChronic.ratio}`,
        expectedBenefit: 'Better recovery adaptation',
        estimatedTimeToResult: '2-3 weeks',
      },
    ];
  }

  private static createWeeklyPlan(focus: string, riskLevel: string): any[] {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return days.map((day, i) => ({
      dayOfWeek: day,
      recommendedActivity:
        i % 2 === 0
          ? 'strength'
          : i % 3 === 0
            ? 'rest'
            : 'cardio',
      intensity: riskLevel === 'high' ? 'low' : 'moderate',
      duration: 45,
      notes: `Focus on ${focus}`,
    }));
  }

  private static setPerformanceTargets(focus: string): any[] {
    return [
      {
        metric: 'strength' as const,
        current: 100,
        target: 120,
        timeline: '8 weeks',
        progressionPath: [
          'Week 1-2: Base building',
          'Week 3-4: Strength blocks',
          'Week 5-8: Peak strength',
        ],
      },
    ];
  }

  private static generateNutritionGuidance(focus: string): any {
    return {
      macroRatios: {
        protein: 35,
        carbs: 45,
        fats: 20,
      },
      timing: 'Pre: 2-3 hours before | Post: within 30 minutes',
      supplementation: ['creatine', 'beta-alanine'],
    };
  }

  private static createPeriodizationPhases(
    weeks: number,
    goal: string
  ): any[] {
    return [
      {
        name: 'Accumulation Phase',
        weekStart: 1,
        weekEnd: 4,
        focusAreas: ['Hypertrophy', 'Work capacity'],
        volumeProgression: 'high',
        intensityProgression: 'moderate',
        keyElements: [],
        deloadWeek: 4,
      },
      {
        name: 'Intensification Phase',
        weekStart: 5,
        weekEnd: 8,
        focusAreas: ['Strength', 'Power'],
        volumeProgression: 'moderate',
        intensityProgression: 'high',
        keyElements: [],
        deloadWeek: 8,
      },
      {
        name: 'Realization Phase',
        weekStart: 9,
        weekEnd: 12,
        focusAreas: ['Peak performance'],
        volumeProgression: 'low',
        intensityProgression: 'peak',
        keyElements: [],
      },
    ];
  }

  private static createMilestones(weeks: number, phases: any[]): any[] {
    return [
      { week: 3, focus: 'Build aerobic base', expectedImprovement: '5-10%', assessmentMetric: 'VO2 max' },
      {
        week: 6,
        focus: 'Increase strength',
        expectedImprovement: '10-15%',
        assessmentMetric: '1RM tests',
      },
      { week: 10, focus: 'Peak performance', expectedImprovement: '15-20%', assessmentMetric: 'Performance test' },
    ];
  }

  private static inferMovementPatterns(biometrics: DailyBiometrics[]): any[] {
    return [
      { pattern: 'squat', qualityScore: 75, asymmetry: 8, limitations: [], compensationPatterns: [], riskAreas: [] },
      { pattern: 'hinge', qualityScore: 80, asymmetry: 5, limitations: [], compensationPatterns: [], riskAreas: [] },
    ];
  }

  private static assessFlexibility(biometrics: DailyBiometrics[]): any[] {
    return [
      { area: 'hip', range: 85, status: 'normal' as const, limitingFactories: [] },
      { area: 'shoulder', range: 90, status: 'normal' as const, limitingFactories: [] },
    ];
  }

  private static identifyStrengthImbalances(biometrics: DailyBiometrics[]): any[] {
    return [];
  }

  private static calculateMovementQualityScore(
    patterns: any[],
    flexibility: any[],
    imbalances: any[]
  ): number {
    const patternScore = patterns.reduce((sum, p) => sum + p.qualityScore, 0) / Math.max(1, patterns.length);
    return Math.round(patternScore);
  }

  private static generateCorrections(
    patterns: any[],
    flexibility: any[],
    imbalances: any[]
  ): string[] {
    return ['Implement daily mobility routine', 'Add corrective exercises', 'Improve squat pattern'];
  }

  private static calculatePerformanceTrend(biometrics: DailyBiometrics[]): any {
    return { direction: 'improving', strength: 0.5 };
  }

  private static extractBaselineMetrics(biometrics: DailyBiometrics[]): any[] {
    return [
      { metric: 'Recovery Score', currentValue: 65, unit: '0-100' },
      { metric: 'HRV', currentValue: 55, unit: 'ms' },
      { metric: 'RHR', currentValue: 62, unit: 'bpm' },
    ];
  }

  private static createPerformanceProjections(
    baseline: any[],
    trend: any,
    weeks: number
  ): any[] {
    return [
      {
        timeframe: '4 weeks',
        estimatedImprovement: [
          { metric: 'Recovery', projectedValue: 72, improvementPercent: 10, confidence: 80 },
        ],
        assumptions: [],
        riskFactors: [],
      },
    ];
  }

  private static analyzePageauRisk(biometrics: DailyBiometrics[], weeks: number): any {
    return {
      hasPlateauRisk: false,
      expectedPlateauWeek: weeks + 4,
      breakthroughStrategy: ['Increase training variation'],
    };
  }

  private static determineOptimalPath(trend: any, biometrics: DailyBiometrics[]): any {
    return {
      recommendedFocus: 'strength',
      trainingModalities: ['Strength training', 'Conditioning'],
      frequencyRecommendation: '4-5 days/week',
      expectedTimelineToGoal: '12 weeks',
    };
  }

  private static selectRecoveryModalities(level: string): any[] {
    return [
      {
        name: 'sleep',
        frequency: 'daily',
        duration: 480,
        intensity: 'high',
        priority: 1,
        expectedBenefit: 'Nervous system recovery',
        instructions: ['Consistent sleep schedule', 'Dark, cool room'],
      },
    ];
  }

  private static estimateRecoveryTimeline(level: string): any {
    return {
      hoursUntilFull: level === 'emergency' ? 72 : level === 'intensive' ? 48 : 24,
      milestoneDays: [
        { day: 1, recoveryPercent: 50, status: 'Acute phase' },
        { day: 3, recoveryPercent: 75, status: 'Adaptation phase' },
      ],
    };
  }

  private static setupMonitoringMetrics(level: string): any[] {
    return [
      {
        metric: 'HRV',
        threshold: 30,
        checkFrequency: 'daily',
        action: 'Continue recovery if < threshold',
      },
    ];
  }

  private static createDefaultTrainingLoad(): TrainingLoadAnalysis {
    return {
      date: new Date().toISOString().split('T')[0],
      weeklyLoad: {
        totalVolume: 100,
        totalIntensity: 50,
        peakLoad: 100,
        averageLoad: 80,
        loadVariability: 20,
      },
      distribution: {
        strength: 40,
        cardio: 40,
        flexibility: 15,
        rest: 5,
        intensity: 'moderate',
      },
      acuteToChronic: {
        ratio: 1.0,
        status: 'optimal',
        trend: 0,
      },
      progression: {
        weekOverWeek: 0,
        monthOverMonth: 0,
        recommendation: 'maintain',
        safeIncreasePercent: 10,
      },
    };
  }

  private static generateKeyWarnings(injury: any, load: any): string[] {
    const warnings: string[] = [];
    if (injury.riskLevel === 'high' || injury.riskLevel === 'critical') {
      warnings.push(`High injury risk detected: ${injury.injuryRisk}%`);
    }
    if (load.acuteToChronic.status === 'overtraining') {
      warnings.push('Overtraining pattern detected');
    }
    return warnings;
  }

  private static generateTopPriorities(injury: any, movement: any): string[] {
    return [
      injury.riskLevel !== 'low' ? 'Reduce injury risk' : 'Maintain current status',
      movement.mainConcerns.length > 0
        ? `Address movement concerns: ${movement.mainConcerns[0]}`
        : 'Continue current training',
    ];
  }

  private static generateExpectedOutcome(recommendation: any, forecast: any): string {
    return 'Following recommendations should improve performance by ~10% in 8 weeks';
  }

  // ============================================================================
  // PHASE 2.2 - New Methods for Brain Orchestrator Integration
  // ============================================================================

  /**
   * Analyze training load using TSS (Training Stress Score) calculation
   * Phase 2.2 - Task 2.2.1
   * 
   * @param biometricData - Array of daily biometric points
   * @param previousLoad - Previous training load context
   * @returns TrainingLoadAnalysis with current load, trend, and risk factors
   */
  static analyzeTrainingLoadV2(
    biometricData: DailyBiometrics[],
    previousLoad?: { volume: number; intensity: number; date: string }[]
  ): {
    current: {
      tss: number; // Training Stress Score (0-100+)
      volume: number; // Total volume this week
      intensity: number; // Average intensity (1-10)
      loadStatus: 'low' | 'optimal' | 'high' | 'excessive';
    };
    trend: {
      direction: 'increasing' | 'decreasing' | 'stable';
      rate: number; // Percentage change per week
      acuteToChronic: number; // AC ratio
    };
    riskFactors: {
      overtraining: boolean;
      insufficientRecovery: boolean;
      rapidIncrease: boolean;
      chronicFatigue: boolean;
    };
  } {
    try {
      if (!biometricData || biometricData.length < 7) {
        throw new Error('Minimum 7 days of biometric data required');
      }

      const last7Days = biometricData.slice(-7);
      const last28Days = biometricData.slice(-28);

      // Calculate TSS (Training Stress Score)
      // TSS = (trainingLoad / fitness) * 100
      // Simplified: TSS = volume * intensity * multiplier
      const currentWeekVolume = last7Days.reduce((sum, day) => {
        const activity = day.activity?.activeCalories || 0;
        return sum + activity;
      }, 0);

      const currentWeekIntensity = last7Days.reduce((sum, day) => {
        const heartRate = day.restingHeartRate?.[0]?.value || 120;
        // Normalize heart rate to intensity scale (1-10)
        const intensity = Math.min(10, Math.max(1, (heartRate - 100) / 10));
        return sum + intensity;
      }, 0) / 7;

      const tss = Math.round((currentWeekVolume / 20) * currentWeekIntensity * 1.5);

      // Determine load status based on TSS (más sensible a cargas altas)
      let loadStatus: 'low' | 'optimal' | 'high' | 'excessive';
      if (tss < 150) loadStatus = 'low';
      else if (tss < 300) loadStatus = 'optimal';
      else if (tss < 500) loadStatus = 'high';
      else loadStatus = 'excessive';

      // Calculate trend (acute vs chronic)
      const acuteLoad = last7Days.reduce((sum, day) => {
        const activity = day.activity?.activeCalories || 0;
        return sum + activity;
      }, 0) / 7;

      const chronicLoad = last28Days.length >= 21
        ? last28Days.slice(-21).reduce((sum, day) => {
          const activity = day.activity?.activeCalories || 0;
          return sum + activity;
        }, 0) / 21
        : acuteLoad;

      const acuteToChronic = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

      let direction: 'increasing' | 'decreasing' | 'stable';
      if (acuteToChronic > 1.1) direction = 'increasing';
      else if (acuteToChronic < 0.9) direction = 'decreasing';
      else direction = 'stable';

      const rate = Math.round((acuteToChronic - 1) * 100);
      const hasRecoveryDebt = last7Days.some(day => (day.recoveryIndex?.score ?? 50) < 45);

      // Identify risk factors
      const riskFactors = {
        overtraining: tss >= 350 || acuteToChronic > 1.4 || (loadStatus === 'high' && hasRecoveryDebt),
        insufficientRecovery: hasRecoveryDebt,
        rapidIncrease: acuteToChronic > 1.25,
        chronicFatigue: last7Days.filter(day => (day.sleep?.score ?? 50) < 60).length >= 3,
      };

      logger.info('Training load analysis completed', {
        context: 'advanced-analysis',
        metadata: { tss, loadStatus, acuteToChronic }
      });

      return {
        current: {
          tss,
          volume: Math.round(currentWeekVolume),
          intensity: Math.round(currentWeekIntensity * 10) / 10,
          loadStatus,
        },
        trend: {
          direction,
          rate,
          acuteToChronic: Math.round(acuteToChronic * 100) / 100,
        },
        riskFactors,
      };
    } catch (error) {
      logger.error('Error in analyzeTrainingLoadV2', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Evaluate injury risk with HRV monitoring and overuse detection
   * Phase 2.2 - Task 2.2.2
   * 
   * @param biometricData - Recent biometric data (last 7-30 days)
   * @param history - Injury history and previous assessments
   * @returns InjuryRiskAssessment with score, red flags, and recommendations
   */
  static evaluateInjuryRiskV2(
    biometricData: DailyBiometrics[],
    history?: {
      previousInjuries: string[];
      lastAssessment?: { date: string; score: number };
      highRiskActivities?: string[];
    }
  ): {
    score: number; // 0-100
    redFlags: string[];
    recommendations: string[];
    hrvStatus: {
      current: number;
      baseline: number;
      deviation: number; // Percentage deviation from baseline
      status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
    };
    overuseIndicators: {
      consecutiveHighLoadDays: number;
      recoveryDebt: number; // Accumulated recovery deficit
      tissueStress: 'low' | 'moderate' | 'high' | 'severe';
    };
  } {
    try {
      if (!biometricData || biometricData.length < 7) {
        throw new Error('Minimum 7 days of data required for injury risk evaluation');
      }

      const last7Days = biometricData.slice(-7);
      const last30Days = biometricData.slice(-30);

      // HRV Analysis
      const hrvValues = last7Days
        .map(day => day.hrv?.[0]?.value)
        .filter((v): v is number => v !== undefined);

      const currentHRV = hrvValues.length > 0
        ? hrvValues[hrvValues.length - 1]
        : 50;

      // Calculate baseline from first 10 days of last 30
      const baselineHRV = last30Days.length >= 10
        ? last30Days.slice(0, 10).reduce((sum, day) => {
          const hrv = day.hrv?.[0]?.value;
          return sum + (hrv || 50);
        }, 0) / 10
        : currentHRV;

      const hrvDeviation = baselineHRV > 0
        ? ((currentHRV - baselineHRV) / baselineHRV) * 100
        : 0;

      let hrvStatus: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      if (hrvDeviation >= -10) hrvStatus = 'optimal';
      else if (hrvDeviation >= -20) hrvStatus = 'acceptable';
      else if (hrvDeviation >= -30) hrvStatus = 'concerning';
      else hrvStatus = 'critical';

      // Overuse Detection
      const highLoadDays = last7Days.filter(day => {
        const activity = day.activity?.activeCalories || 0;
        return activity > 500; // Threshold for high load
      }).length;

      const consecutiveHighLoad = last7Days.reduce((max, day, index, arr) => {
        let count = 0;
        for (let i = index; i < arr.length; i++) {
          const activity = arr[i].activity?.activeCalories || 0;
          if (activity > 500) count++;
          else break;
        }
        return Math.max(max, count);
      }, 0);

      const recoveryDebt = last7Days.reduce((sum, day) => {
        const recovery = day.recoveryIndex?.score ?? 50;
        return sum + Math.max(0, 70 - recovery); // Deficit below optimal 70
      }, 0);

      let tissueStress: 'low' | 'moderate' | 'high' | 'severe';
      if (recoveryDebt < 50) tissueStress = 'low';
      else if (recoveryDebt < 120) tissueStress = 'moderate';
      else if (recoveryDebt < 250) tissueStress = 'high';
      else tissueStress = 'severe';

      // Calculate injury risk score
      let riskScore = 0;

      // HRV component (max 30 points)
      if (hrvStatus === 'critical') riskScore += 30;
      else if (hrvStatus === 'concerning') riskScore += 20;
      else if (hrvStatus === 'acceptable') riskScore += 10;

      // Overuse component (max 30 points)
      if (consecutiveHighLoad >= 5) riskScore += 30;
      else if (consecutiveHighLoad >= 3) riskScore += 20;
      else if (consecutiveHighLoad >= 2) riskScore += 10;

      // Recovery debt component (max 20 points)
      if (recoveryDebt > 150) riskScore += 20;
      else if (recoveryDebt > 100) riskScore += 15;
      else if (recoveryDebt > 50) riskScore += 10;

      // Sleep quality component (max 10 points)
      const poorSleepDays = last7Days.filter(day =>
        (day.sleep?.duration ?? 0) < 360 // Less than 6 hours
      ).length;
      if (poorSleepDays >= 3) riskScore += 10;
      else if (poorSleepDays >= 2) riskScore += 5;

      // History component (max 10 points)
      if (history?.previousInjuries && history.previousInjuries.length > 0) {
        riskScore += Math.min(10, history.previousInjuries.length * 3);
      }

      riskScore = Math.min(100, riskScore);

      // Identify red flags
      const redFlags: string[] = [];
      if (hrvStatus === 'critical') redFlags.push('HRV critically suppressed');
      if (hrvStatus === 'concerning') redFlags.push('HRV below baseline');
      if (consecutiveHighLoad >= 4) redFlags.push('Extended high-load streak');
      if (recoveryDebt > 100) redFlags.push('Significant recovery debt');
      if (poorSleepDays >= 3) redFlags.push('Sleep deprivation pattern');
      if (tissueStress === 'high' || tissueStress === 'severe') {
        redFlags.push(`Elevated tissue stress: ${tissueStress}`);
      }
      if (history?.previousInjuries?.some(injury =>
        ['ACL', 'meniscus', 'rotator cuff'].some(key => injury.toLowerCase().includes(key))
      )) {
        redFlags.push('Previous major injury');
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (riskScore > 70) {
        recommendations.push('IMMEDIATE: Reduce training volume by 50%');
        recommendations.push('Prioritize sleep: 8+ hours nightly');
        recommendations.push('Daily recovery: foam rolling + stretching');
      } else if (riskScore > 50) {
        recommendations.push('Reduce training volume by 25%');
        recommendations.push('Add recovery day every 3 training days');
        recommendations.push('Monitor HRV daily');
      } else if (riskScore > 30) {
        recommendations.push('Maintain current load with caution');
        recommendations.push('Ensure 1 full rest day per week');
      } else {
        recommendations.push('Continue current training plan');
        recommendations.push('Monitor for early warning signs');
      }

      if (hrvStatus === 'critical' || hrvStatus === 'concerning') {
        recommendations.push('Practice daily breathing exercises (5-10 min)');
      }

      logger.info('Injury risk evaluation completed', {
        context: 'advanced-analysis',
        metadata: { riskScore, hrvStatus, redFlags: redFlags.length }
      });

      return {
        score: Math.round(riskScore),
        redFlags,
        recommendations,
        hrvStatus: {
          current: Math.round(currentHRV),
          baseline: Math.round(baselineHRV),
          deviation: Math.round(hrvDeviation * 10) / 10,
          status: hrvStatus,
        },
        overuseIndicators: {
          consecutiveHighLoadDays: consecutiveHighLoad,
          recoveryDebt: Math.round(recoveryDebt),
          tissueStress,
        },
      };
    } catch (error) {
      logger.error('Error in evaluateInjuryRiskV2', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

export default AdvancedAnalysisService;

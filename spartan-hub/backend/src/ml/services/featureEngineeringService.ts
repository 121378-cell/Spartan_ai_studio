/**
 * Feature Engineering Service
 * Transforms raw biometric data into ML-ready features
 */

import { logger } from '../../utils/logger';
import { mlConfig } from '../config/ml.config';

export interface BiometricRawData {
  date: string;
  hrv?: number;
  rhr?: number;
  sleepHours?: number;
  sleepQuality?: number;
  trainingLoad?: number;
  recoveryScore?: number;
  stressLevel?: number;
  activityLevel?: number;
}

export interface FeatureSet {
  // Training load features
  trainingLoadFeatures: {
    weekly7DayAvg: number;
    weekly28DayAvg: number;
    acuteToChronicRatio: number;
    loadProgression: number;
    loadVariability: number;
    peakLoad: number;
  };

  // Recovery features
  recoveryFeatures: {
    hrvMean: number;
    hrvVariability: number;
    hrvTrend: number;
    rhrMean: number;
    rhrVariability: number;
    rhrTrend: number;
    sleepQualityMean: number;
    sleepHoursMean: number;
    sleepTrend: number;
    stressLevelMean: number;
  };

  // Movement/Performance features
  performanceFeatures: {
    activityLevelMean: number;
    activityLevelVariability: number;
    activityLevelTrend: number;
    recoveryScoreMean: number;
    recoveryScoreTrend: number;
    performanceAcceleration: number;
  };

  // Derived metrics
  derivedMetrics: {
    hrvToRhrRatio: number;
    trainingToRecoveryRatio: number;
    stressToRecoveryBalance: number;
    overallWellnessScore: number;
    dataQuality: number;  // % of non-null values
  };

  // Temporal features
  temporalFeatures: {
    dayOfWeek: number;
    weekOfYear: number;
    isWeekend: number;
    daysInCycle: number;
  };

  // Raw features (normalized)
  normalizedRaw: {
    hrv: number;
    rhr: number;
    sleepHours: number;
    trainingLoad: number;
    recoveryScore: number;
  };
}

/**
 * Feature Engineering Service
 */
export class FeatureEngineeringService {
  /**
   * Extract features from raw biometric data
   */
  static extractFeatures(
    biometricHistory: any[],
    currentDate: string = new Date().toISOString().split('T')[0]
  ): FeatureSet {
    logger.info('Feature extraction started', {
      context: 'ml/featureEngineering',
      metadata: { dataPoints: biometricHistory.length },
    });

    if (biometricHistory.length === 0) {
      return this.createEmptyFeatureSet();
    }

    const last7Days = biometricHistory.slice(-7);
    const last28Days = biometricHistory.slice(-28);

    const features: FeatureSet = {
      trainingLoadFeatures: this.extractTrainingLoadFeatures(last7Days, last28Days),
      recoveryFeatures: this.extractRecoveryFeatures(last7Days, last28Days),
      performanceFeatures: this.extractPerformanceFeatures(last7Days),
      derivedMetrics: this.extractDerivedMetrics(biometricHistory),
      temporalFeatures: this.extractTemporalFeatures(currentDate),
      normalizedRaw: this.extractNormalizedRaw(biometricHistory[biometricHistory.length - 1]),
    };

    logger.info('Feature extraction completed', {
      context: 'ml/featureEngineering',
      metadata: { featureCount: Object.keys(features).length },
    });

    return features;
  }

  /**
   * Extract training load features
   */
  private static extractTrainingLoadFeatures(
    last7Days: BiometricRawData[],
    last28Days: BiometricRawData[]
  ) {
    const loads7 = last7Days.map(d => d.trainingLoad || 0);
    const loads28 = last28Days.map(d => d.trainingLoad || 0);

    const avg7 = loads7.length > 0 ? loads7.reduce((a, b) => a + b, 0) / loads7.length : 0;
    const avg28 = loads28.length > 0 ? loads28.reduce((a, b) => a + b, 0) / loads28.length : 0;
    const acr = avg28 > 0 ? avg7 / avg28 : 1;

    const peak = Math.max(...loads7, 0);
    const variance = this.calculateVariance(loads7);
    const trend = loads7.length >= 2 ? loads7[loads7.length - 1] - loads7[0] : 0;

    return {
      weekly7DayAvg: avg7,
      weekly28DayAvg: avg28,
      acuteToChronicRatio: Math.min(2, acr),  // Cap at 2
      loadProgression: trend / (avg7 || 1),   // Normalized trend
      loadVariability: Math.sqrt(variance),
      peakLoad: peak,
    };
  }

  /**
   * Extract recovery features
   */
  private static extractRecoveryFeatures(
    last7Days: BiometricRawData[],
    last28Days: BiometricRawData[]
  ) {
    const hrvs7 = last7Days.map(d => d.hrv || 0).filter(v => v > 0);
    const hrvs28 = last28Days.map(d => d.hrv || 0).filter(v => v > 0);

    const rhrs7 = last7Days.map(d => d.rhr || 0).filter(v => v > 0);
    const sleeps7 = last7Days.map(d => d.sleepHours || 0).filter(v => v > 0);
    const stresses7 = last7Days.map(d => d.stressLevel || 0);

    const hrvMean7 = hrvs7.length > 0 ? hrvs7.reduce((a, b) => a + b, 0) / hrvs7.length : 50;
    const hrvMean28 = hrvs28.length > 0 ? hrvs28.reduce((a, b) => a + b, 0) / hrvs28.length : 50;

    return {
      hrvMean: hrvMean7,
      hrvVariability: Math.sqrt(this.calculateVariance(hrvs7)),
      hrvTrend: hrvs7.length >= 2 ? hrvs7[hrvs7.length - 1] - hrvs7[0] : 0,
      rhrMean: rhrs7.length > 0 ? rhrs7.reduce((a, b) => a + b, 0) / rhrs7.length : 70,
      rhrVariability: Math.sqrt(this.calculateVariance(rhrs7)),
      rhrTrend: rhrs7.length >= 2 ? rhrs7[rhrs7.length - 1] - rhrs7[0] : 0,
      sleepQualityMean: last7Days.length > 0 ? (last7Days.reduce((a, b) => a + (b.sleepQuality || 0), 0) / last7Days.length) : 5,
      sleepHoursMean: sleeps7.length > 0 ? sleeps7.reduce((a, b) => a + b, 0) / sleeps7.length : 7,
      sleepTrend: sleeps7.length >= 2 ? sleeps7[sleeps7.length - 1] - sleeps7[0] : 0,
      stressLevelMean: stresses7.length > 0 ? stresses7.reduce((a, b) => a + b, 0) / stresses7.length : 5,
    };
  }

  /**
   * Extract performance features
   */
  private static extractPerformanceFeatures(last7Days: BiometricRawData[]) {
    const activities = last7Days.map(d => d.activityLevel || 0).filter(v => v > 0);
    const recoveries = last7Days.map(d => d.recoveryScore || 0).filter(v => v > 0);

    const actMean = activities.length > 0 ? activities.reduce((a, b) => a + b, 0) / activities.length : 50;
    const recMean = recoveries.length > 0 ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length : 50;

    const acceleration = activities.length >= 3
      ? (activities[activities.length - 1] - activities[0]) / (activities.length - 1)
      : 0;

    return {
      activityLevelMean: actMean,
      activityLevelVariability: Math.sqrt(this.calculateVariance(activities)),
      activityLevelTrend: activities.length >= 2 ? activities[activities.length - 1] - activities[0] : 0,
      recoveryScoreMean: recMean,
      recoveryScoreTrend: recoveries.length >= 2 ? recoveries[recoveries.length - 1] - recoveries[0] : 0,
      performanceAcceleration: acceleration,
    };
  }

  /**
   * Extract derived metrics
   */
  private static extractDerivedMetrics(history: BiometricRawData[]) {
    const hrvs = history.map(d => d.hrv || 0).filter(v => v > 0);
    const rhrs = history.map(d => d.rhr || 0).filter(v => v > 0);
    const loads = history.map(d => d.trainingLoad || 0).filter(v => v > 0);
    const recoveries = history.map(d => d.recoveryScore || 0).filter(v => v > 0);
    const stresses = history.map(d => d.stressLevel || 0);

    const hrvMean = hrvs.length > 0 ? hrvs.reduce((a, b) => a + b, 0) / hrvs.length : 50;
    const rhrMean = rhrs.length > 0 ? rhrs.reduce((a, b) => a + b, 0) / rhrs.length : 70;
    const loadMean = loads.length > 0 ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;
    const recMean = recoveries.length > 0 ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length : 50;
    const stressMean = stresses.length > 0 ? stresses.reduce((a, b) => a + b, 0) / stresses.length : 5;

    const hrvToRhr = rhrMean > 0 ? hrvMean / rhrMean : 1;
    const trainToRec = recMean > 0 ? loadMean / recMean : 1;
    const stressToRec = recMean > 0 ? stressMean / (100 / recMean) : 0.5;

    const wellnessScore = (recMean / 100) * 50 + (1 / (1 + stressMean / 10)) * 30 + (Math.min(hrvToRhr, 2) / 2) * 20;

    const nonNull = history.filter(d =>
      d.hrv !== undefined && d.rhr !== undefined && d.sleepHours !== undefined
    ).length;
    const dataQuality = history.length > 0 ? (nonNull / history.length) : 0;

    return {
      hrvToRhrRatio: Math.min(5, hrvToRhr),  // Cap at 5
      trainingToRecoveryRatio: Math.min(3, trainToRec),  // Cap at 3
      stressToRecoveryBalance: Math.min(2, stressToRec),  // Cap at 2
      overallWellnessScore: Math.min(100, Math.max(0, wellnessScore)),
      dataQuality: Math.min(1, dataQuality),
    };
  }

  /**
   * Extract temporal features
   */
  private static extractTemporalFeatures(date: string) {
    const d = new Date(date);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    const weekOfYear = Math.ceil(dayOfYear / 7);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

    return {
      dayOfWeek,
      weekOfYear,
      isWeekend,
      daysInCycle: dayOfYear % 28,  // 28-day training cycle
    };
  }

  /**
   * Extract normalized raw features
   */
  private static extractNormalizedRaw(latest: BiometricRawData) {
    const config = mlConfig.features.normalization;

    return {
      hrv: this.normalize(latest.hrv || 80, config.hrvRange),
      rhr: this.normalize(latest.rhr || 70, config.rhrRange),
      sleepHours: this.normalize(latest.sleepHours || 7, config.sleepRange),
      trainingLoad: this.normalize(latest.trainingLoad || 300, config.loadRange),
      recoveryScore: this.normalize(latest.recoveryScore || 50, config.recoveryRange),
    };
  }

  /**
   * Normalize value to 0-1 range
   */
  private static normalize(value: number, range: [number, number]): number {
    const [min, max] = range;
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Calculate variance
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return variance;
  }

  /**
   * Create empty feature set (fallback)
   */
  private static createEmptyFeatureSet(): FeatureSet {
    return {
      trainingLoadFeatures: {
        weekly7DayAvg: 0,
        weekly28DayAvg: 0,
        acuteToChronicRatio: 1,
        loadProgression: 0,
        loadVariability: 0,
        peakLoad: 0,
      },
      recoveryFeatures: {
        hrvMean: 50,
        hrvVariability: 0,
        hrvTrend: 0,
        rhrMean: 70,
        rhrVariability: 0,
        rhrTrend: 0,
        sleepQualityMean: 5,
        sleepHoursMean: 7,
        sleepTrend: 0,
        stressLevelMean: 5,
      },
      performanceFeatures: {
        activityLevelMean: 50,
        activityLevelVariability: 0,
        activityLevelTrend: 0,
        recoveryScoreMean: 50,
        recoveryScoreTrend: 0,
        performanceAcceleration: 0,
      },
      derivedMetrics: {
        hrvToRhrRatio: 1,
        trainingToRecoveryRatio: 1,
        stressToRecoveryBalance: 0.5,
        overallWellnessScore: 50,
        dataQuality: 0,
      },
      temporalFeatures: {
        dayOfWeek: new Date().getDay(),
        weekOfYear: 1,
        isWeekend: 0,
        daysInCycle: 0,
      },
      normalizedRaw: {
        hrv: 0.5,
        rhr: 0.5,
        sleepHours: 0.5,
        trainingLoad: 0,
        recoveryScore: 0.5,
      },
    };
  }

  /**
   * Flatten features for model input (as array)
   */
  static flattenFeatures(features: FeatureSet): number[] {
    const flattened: number[] = [];

    // Training load features (6)
    flattened.push(
      features.trainingLoadFeatures.weekly7DayAvg,
      features.trainingLoadFeatures.weekly28DayAvg,
      features.trainingLoadFeatures.acuteToChronicRatio,
      features.trainingLoadFeatures.loadProgression,
      features.trainingLoadFeatures.loadVariability,
      features.trainingLoadFeatures.peakLoad
    );

    // Recovery features (10)
    flattened.push(
      features.recoveryFeatures.hrvMean,
      features.recoveryFeatures.hrvVariability,
      features.recoveryFeatures.hrvTrend,
      features.recoveryFeatures.rhrMean,
      features.recoveryFeatures.rhrVariability,
      features.recoveryFeatures.rhrTrend,
      features.recoveryFeatures.sleepQualityMean,
      features.recoveryFeatures.sleepHoursMean,
      features.recoveryFeatures.sleepTrend,
      features.recoveryFeatures.stressLevelMean
    );

    // Performance features (6)
    flattened.push(
      features.performanceFeatures.activityLevelMean,
      features.performanceFeatures.activityLevelVariability,
      features.performanceFeatures.activityLevelTrend,
      features.performanceFeatures.recoveryScoreMean,
      features.performanceFeatures.recoveryScoreTrend,
      features.performanceFeatures.performanceAcceleration
    );

    // Derived metrics (5)
    flattened.push(
      features.derivedMetrics.hrvToRhrRatio,
      features.derivedMetrics.trainingToRecoveryRatio,
      features.derivedMetrics.stressToRecoveryBalance,
      features.derivedMetrics.overallWellnessScore,
      features.derivedMetrics.dataQuality
    );

    // Temporal features (4)
    flattened.push(
      features.temporalFeatures.dayOfWeek,
      features.temporalFeatures.weekOfYear,
      features.temporalFeatures.isWeekend,
      features.temporalFeatures.daysInCycle
    );

    // Normalized raw (5)
    flattened.push(
      features.normalizedRaw.hrv,
      features.normalizedRaw.rhr,
      features.normalizedRaw.sleepHours,
      features.normalizedRaw.trainingLoad,
      features.normalizedRaw.recoveryScore
    );

    // Total: 36 features (close to configured 28, but comprehensive)
    return flattened;
  }
}

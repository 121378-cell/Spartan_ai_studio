/**
 * Integrated Biometric Service
 * 
 * Consolidates data from multiple wearable sources:
 * - Apple Health
 * - Garmin Connect
 * - Google Fit
 * - HealthConnect (Android)
 * - WHOOP
 * - Oura Ring
 */

import { logger } from '../utils/logger';
import {
  DailyBiometrics,
  HRVData,
  RestingHeartRateData,
  SleepData,
  ActivityData,
  BodyMetrics,
  RecoveryIndex,
  WearableDevice,
  BiometricIntegrations
} from '../models/BiometricData';

export class BiometricService {
  /**
   * Calculate Recovery Index from multiple metrics
   * 
   * Formula considers:
   * - HRV (Heart Rate Variability): 30% weight
   * - RHR (Resting Heart Rate): 20% weight
   * - Sleep Quality: 30% weight
   * - Stress Level: 20% weight
   */
  calculateRecoveryIndex(
    hrv: number | undefined, // milliseconds
    rhr: number | undefined, // bpm
    sleepScore: number | undefined, // 0-100
    stressLevel: number | undefined, // 0-100
    previousHRV: number = 60, // baseline ms
    previousRHR: number = 60 // baseline bpm
  ): RecoveryIndex {
    try {
      // Normalize HRV (convert to 0-100 scale)
      const hrvNormalized = hrv
        ? Math.min(100, (hrv / previousHRV) * 100)
        : 50;

      // Normalize RHR (inverse relationship - lower is better)
      const rhrNormalized = rhr
        ? Math.max(0, 100 - ((rhr / previousRHR) * 100))
        : 50;

      // Sleep quality is already 0-100
      const sleepNormalized = sleepScore ?? 50;

      // Stress is inverse - higher stress = lower recovery
      const stressNormalized = stressLevel ? 100 - stressLevel : 50;

      // Calculate weighted score
      const recoveryScore = Math.round(
        (hrvNormalized * 0.30) +
        (rhrNormalized * 0.20) +
        (sleepNormalized * 0.30) +
        (stressNormalized * 0.20)
      );

      // Determine recommendation and readiness
      const recommendation = this.getRecoveryRecommendation(recoveryScore);
      const readiness = this.getTrainingReadiness(recoveryScore);

      logger.info('Recovery Index calculated', {
        context: 'biometric',
        metadata: {
          score: recoveryScore,
          hrv: hrvNormalized,
          rhr: rhrNormalized,
          sleep: sleepNormalized,
          stress: stressNormalized
        }
      });

      return {
        date: new Date().toISOString().split('T')[0],
        score: recoveryScore,
        components: {
          hrv: Math.round(hrvNormalized),
          rhr: Math.round(rhrNormalized),
          sleepQuality: Math.round(sleepNormalized),
          stressLevel: Math.round(stressNormalized)
        },
        recommendation,
        readinessToTrain: readiness
      };
    } catch (error) {
      logger.error('Error calculating recovery index:', {
        metadata: { error: String(error) }
      });

      // Return neutral recovery index on error
      return {
        date: new Date().toISOString().split('T')[0],
        score: 50,
        components: {
          hrv: 50,
          rhr: 50,
          sleepQuality: 50,
          stressLevel: 50
        },
        recommendation: 'Train at moderate intensity',
        readinessToTrain: 'caution'
      };
    }
  }

  /**
   * Get recovery recommendation based on score
   */
  private getRecoveryRecommendation(score: number): string {
    if (score >= 80) {
      return 'Excellent recovery! Push hard today. Consider increasing intensity or volume.';
    } else if (score >= 60) {
      return 'Good recovery. Train at normal intensity.';
    } else if (score >= 40) {
      return 'Moderate recovery. Consider a lighter workout or focus on technique.';
    } else {
      return 'Poor recovery. Take an easy day or rest. Focus on sleep and stress management.';
    }
  }

  /**
   * Get training readiness based on recovery score
   */
  private getTrainingReadiness(score: number): 'ready' | 'caution' | 'need-rest' {
    if (score >= 70) return 'ready';
    if (score >= 40) return 'caution';
    return 'need-rest';
  }

  /**
   * Aggregate biometric data from all sources for a given day
   */
  async aggregateDailyBiometrics(
    userId: string,
    date: string, // ISO date YYYY-MM-DD
    dataPoints: {
      hrvData?: HRVData[];
      rhrData?: RestingHeartRateData[];
      sleepData?: SleepData;
      activityData?: ActivityData;
      bodyMetrics?: BodyMetrics;
    }
  ): Promise<DailyBiometrics> {
    try {
      // Determine data completeness
      const dataCompleteness = this.calculateDataCompleteness(dataPoints);

      // Extract unique sources
      const sources = new Set<string>();
      dataPoints.hrvData?.forEach(d => sources.add(d.source));
      dataPoints.rhrData?.forEach(d => sources.add(d.source));
      if (dataPoints.sleepData) sources.add(dataPoints.sleepData.source);
      if (dataPoints.activityData) sources.add(dataPoints.activityData.source);

      logger.info('Daily biometrics aggregated', {
        context: 'biometric',
        metadata: {
          userId,
          date,
          sources: Array.from(sources),
          completeness: dataCompleteness
        }
      });

      const dailyBiometrics: DailyBiometrics = {
        userId,
        date,
        hrv: dataPoints.hrvData,
        restingHeartRate: dataPoints.rhrData,
        sleep: dataPoints.sleepData,
        activity: dataPoints.activityData,
        bodyMetrics: dataPoints.bodyMetrics,
        sources,
        lastUpdated: new Date(),
        dataCompleteness
      };

      return dailyBiometrics;
    } catch (error) {
      logger.error('Error aggregating daily biometrics:', {
        metadata: { error: String(error), userId, date }
      });
      throw error;
    }
  }

  /**
   * Aggregate data for a specific day (simplified for Brain Orchestrator)
   */
  async aggregateDayData(userId: string, date: string): Promise<any> {
    try {
      // In a real scenario, this would fetch from DB or sources
      // For now, we'll return a structure compatible with BrainOrchestrator's expectations
      return {
        heartRateAvg: 65,
        heartRateMax: 140,
        heartRateMin: 50,
        restingHeartRate: 58,
        hrvAverage: 45,
        sleepDuration: 450,
        sleepQuality: 0.85,
        stressAverage: 25,
        totalSteps: 10000,
        totalCalories: 2500,
        totalDistance: 8000,
        activities: [],
        dataQuality: 0.95,
        sources: ['manual']
      };
    } catch (error) {
      logger.error('Error in aggregateDayData:', { userId, metadata: { date, error: String(error) } });
      throw error;
    }
  }

  /**
   * Calculate data completeness percentage
   */
  private calculateDataCompleteness(dataPoints: {
    hrvData?: HRVData[];
    rhrData?: RestingHeartRateData[];
    sleepData?: SleepData;
    activityData?: ActivityData;
    bodyMetrics?: BodyMetrics;
  }): number {
    let completeness = 0;
    const totalPoints = 5; // Total possible data types

    if (dataPoints.hrvData && dataPoints.hrvData.length > 0) completeness++;
    if (dataPoints.rhrData && dataPoints.rhrData.length > 0) completeness++;
    if (dataPoints.sleepData) completeness++;
    if (dataPoints.activityData) completeness++;
    if (dataPoints.bodyMetrics) completeness++;

    return Math.round((completeness / totalPoints) * 100);
  }

  /**
   * Validate biometric data against reasonable ranges
   */
  validateBiometricData(data: {
    hrv?: number;
    rhr?: number;
    sleepMinutes?: number;
    steps?: number;
    weight?: number;
    bodyFat?: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // HRV: typically 20-200ms, competitive athletes 100+ms
    if (data.hrv !== undefined) {
      if (data.hrv < 0 || data.hrv > 500) {
        errors.push(`HRV ${data.hrv}ms is outside normal range (0-500ms)`);
      }
    }

    // RHR: typically 40-100 bpm
    if (data.rhr !== undefined) {
      if (data.rhr < 30 || data.rhr > 150) {
        errors.push(`RHR ${data.rhr} bpm is outside normal range (30-150 bpm)`);
      }
    }

    // Sleep: typically 360-540 minutes (6-9 hours)
    if (data.sleepMinutes !== undefined) {
      if (data.sleepMinutes < 0 || data.sleepMinutes > 1440) {
        errors.push(`Sleep ${data.sleepMinutes}min is outside valid range (0-1440 min)`);
      }
    }

    // Steps: typically 0-50000 per day
    if (data.steps !== undefined) {
      if (data.steps < 0 || data.steps > 100000) {
        errors.push(`Steps ${data.steps} is outside typical range (0-100000)`);
      }
    }

    // Body Fat: 0-60%
    if (data.bodyFat !== undefined) {
      if (data.bodyFat < 0 || data.bodyFat > 60) {
        errors.push(`Body fat ${data.bodyFat}% is outside valid range (0-60%)`);
      }
    }

    logger.info('Biometric data validated', {
      context: 'biometric',
      metadata: {
        isValid: errors.length === 0,
        errorCount: errors.length
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize data from different sources into standard units
   */
  normalizeSourceData(
    sourceType: 'apple-health' | 'garmin' | 'google-fit' | 'healthconnect' | 'whoop' | 'oura',
    rawData: Record<string, any>
  ): Partial<DailyBiometrics> {
    try {
      const normalized: Partial<DailyBiometrics> = {};

      switch (sourceType) {
      case 'apple-health':
        normalized.hrv = this.normalizeAppleHealthHRV(rawData);
        normalized.restingHeartRate = this.normalizeAppleHealthRHR(rawData);
        normalized.sleep = this.normalizeAppleHealthSleep(rawData);
        break;

      case 'garmin':
        normalized.hrv = this.normalizeGarminHRV(rawData);
        normalized.restingHeartRate = this.normalizeGarminRHR(rawData);
        normalized.sleep = this.normalizeGarminSleep(rawData);
        normalized.activity = this.normalizeGarminActivity(rawData);
        break;

      case 'google-fit':
        normalized.activity = this.normalizeGoogleFitActivity(rawData);
        break;

      case 'healthconnect':
        normalized.hrv = this.normalizeHealthConnectHRV(rawData);
        normalized.sleep = this.normalizeHealthConnectSleep(rawData);
        normalized.activity = this.normalizeHealthConnectActivity(rawData);
        break;

      case 'whoop':
        normalized.hrv = this.normalizeWhoopHRV(rawData);
        normalized.restingHeartRate = this.normalizeWhoopRHR(rawData);
        normalized.sleep = this.normalizeWhoopSleep(rawData);
        break;

      case 'oura':
        normalized.sleep = this.normalizeOuraSleep(rawData);
        normalized.restingHeartRate = this.normalizeOuraRHR(rawData);
        break;
      }

      logger.info('Source data normalized', {
        context: 'biometric',
        metadata: { sourceType }
      });

      return normalized;
    } catch (error) {
      logger.error('Error normalizing source data:', {
        metadata: { error: String(error), sourceType }
      });
      return {};
    }
  }

  // Normalization methods for each source
  private normalizeAppleHealthHRV(data: Record<string, any>): HRVData[] {
    // Apple Health provides HRV in milliseconds
    return data.hrv ? [{
      timestamp: new Date(data.timestamp),
      value: data.hrv,
      source: 'apple-health',
      quality: this.assessHRVQuality(data.hrv)
    }] : [];
  }

  private normalizeAppleHealthRHR(data: Record<string, any>): RestingHeartRateData[] {
    return data.rhr ? [{
      timestamp: new Date(data.timestamp),
      value: data.rhr,
      source: 'apple-health'
    }] : [];
  }

  private normalizeAppleHealthSleep(data: Record<string, any>): SleepData | undefined {
    if (!data.sleepStart || !data.sleepEnd) return undefined;

    return {
      date: new Date(data.sleepStart).toISOString().split('T')[0],
      startTime: new Date(data.sleepStart),
      endTime: new Date(data.sleepEnd),
      duration: (new Date(data.sleepEnd).getTime() - new Date(data.sleepStart).getTime()) / 60000,
      quality: data.sleepQuality || 'fair',
      source: 'apple-health',
      score: data.sleepScore
    };
  }

  private normalizeGarminHRV(data: Record<string, any>): HRVData[] {
    return data.hrv ? [{
      timestamp: new Date(data.timestamp),
      value: data.hrv,
      source: 'garmin',
      quality: this.assessHRVQuality(data.hrv)
    }] : [];
  }

  private normalizeGarminRHR(data: Record<string, any>): RestingHeartRateData[] {
    return data.restingHeartRate ? [{
      timestamp: new Date(data.timestamp),
      value: data.restingHeartRate,
      source: 'garmin'
    }] : [];
  }

  private normalizeGarminSleep(data: Record<string, any>): SleepData | undefined {
    if (!data.sleepStartTime || !data.sleepEndTime) return undefined;

    return {
      date: new Date(data.sleepStartTime).toISOString().split('T')[0],
      startTime: new Date(data.sleepStartTime),
      endTime: new Date(data.sleepEndTime),
      duration: (new Date(data.sleepEndTime).getTime() - new Date(data.sleepStartTime).getTime()) / 60000,
      quality: data.sleepQuality || 'fair',
      source: 'garmin',
      stages: {
        light: data.lightSleep,
        deep: data.deepSleep,
        rem: data.remSleep,
        awake: data.awakeSleep
      },
      score: data.sleepScore
    };
  }

  private normalizeGarminActivity(data: Record<string, any>): ActivityData | undefined {
    if (!data.date) return undefined;

    return {
      date: data.date,
      steps: data.steps,
      distance: data.distance ? { value: data.distance, unit: 'km' } : undefined,
      caloriesBurned: data.totalCalories,
      activeCalories: data.activeCalories,
      source: 'garmin'
    };
  }

  private normalizeGoogleFitActivity(data: Record<string, any>): ActivityData | undefined {
    if (!data.date) return undefined;

    return {
      date: data.date,
      steps: data.steps,
      caloriesBurned: data.calories,
      source: 'google-fit'
    };
  }

  private normalizeHealthConnectHRV(data: Record<string, any>): HRVData[] {
    return data.hrvRmssd ? [{
      timestamp: new Date(data.time),
      value: data.hrvRmssd,
      source: 'healthconnect',
      quality: this.assessHRVQuality(data.hrvRmssd)
    }] : [];
  }

  private normalizeHealthConnectSleep(data: Record<string, any>): SleepData | undefined {
    if (!data.startTime || !data.endTime) return undefined;

    return {
      date: new Date(data.startTime).toISOString().split('T')[0],
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      duration: (new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000,
      source: 'healthconnect',
      stages: {
        light: data.lightSleepDuration,
        deep: data.deepSleepDuration,
        rem: data.remSleepDuration,
        awake: data.awakeDuration
      }
    };
  }

  private normalizeHealthConnectActivity(data: Record<string, any>): ActivityData | undefined {
    if (!data.date) return undefined;

    return {
      date: data.date,
      steps: data.steps,
      distance: data.distance ? { value: data.distance, unit: 'km' } : undefined,
      caloriesBurned: data.calories,
      source: 'healthconnect'
    };
  }

  private normalizeWhoopHRV(data: Record<string, any>): HRVData[] {
    return data.hrv ? [{
      timestamp: new Date(data.timestamp),
      value: data.hrv,
      source: 'whoop',
      quality: this.assessHRVQuality(data.hrv)
    }] : [];
  }

  private normalizeWhoopRHR(data: Record<string, any>): RestingHeartRateData[] {
    return data.restingHeartRate ? [{
      timestamp: new Date(data.timestamp),
      value: data.restingHeartRate,
      source: 'whoop'
    }] : [];
  }

  private normalizeWhoopSleep(data: Record<string, any>): SleepData | undefined {
    if (!data.sleepStart || !data.sleepEnd) return undefined;

    return {
      date: new Date(data.sleepStart).toISOString().split('T')[0],
      startTime: new Date(data.sleepStart),
      endTime: new Date(data.sleepEnd),
      duration: (new Date(data.sleepEnd).getTime() - new Date(data.sleepStart).getTime()) / 60000,
      source: 'whoop',
      score: data.sleepScore,
      restlessness: data.restlessness
    };
  }

  private normalizeOuraSleep(data: Record<string, any>): SleepData | undefined {
    if (!data.bedtimeStart || !data.bedtimeEnd) return undefined;

    return {
      date: new Date(data.bedtimeStart).toISOString().split('T')[0],
      startTime: new Date(data.bedtimeStart),
      endTime: new Date(data.bedtimeEnd),
      duration: (new Date(data.bedtimeEnd).getTime() - new Date(data.bedtimeStart).getTime()) / 60000,
      source: 'oura',
      stages: {
        light: data.light,
        deep: data.deep,
        rem: data.rem,
        awake: data.awake
      },
      score: data.sleepScore,
      deepSleepPercentage: data.deepSleepPercentage,
      remPercentage: data.remPercentage
    };
  }

  private normalizeOuraRHR(data: Record<string, any>): RestingHeartRateData[] {
    return data.restingHeartRate ? [{
      timestamp: new Date(data.timestamp),
      value: data.restingHeartRate,
      source: 'oura'
    }] : [];
  }

  /**
   * Assess HRV quality
   */
  private assessHRVQuality(hrv: number): 'good' | 'fair' | 'poor' {
    if (hrv > 100) return 'good';
    if (hrv > 50) return 'fair';
    return 'poor';
  }

  // ============================================================================
  // PHASE 2.5 - Enhanced Aggregation for Brain Orchestrator
  // ============================================================================

  /**
   * Phase 2.5: Aggregate daily data with enhanced metrics for Brain Orchestrator
   * Provides comprehensive daily summary with calculated derived metrics
   */
  async aggregateDailyDataV2(
    userId: string,
    date: string,
    terraData?: {
      hrv?: { value: number; baseline: number; percentile: number }[];
      sleep?: { duration: number; quality: number; deep: number; rem: number }[];
      activity?: { steps: number; calories: number; moderate: number; vigorous: number }[];
      rhr?: { value: number }[];
    }
  ): Promise<{
    date: string;
    hrvAvg: number;
    hrvBaseline: number;
    rhrAvg: number;
    sleepDuration: number;
    sleepQuality: number;
    stressLevel: number;
    recoveryIndex: number;
    activityCalories: number;
    steps: number;
    trainingLoad: number;
    dataQuality: number;
    sources: string[];
  }> {
    try {
      // Default values
      let hrvAvg = 50;
      let hrvBaseline = 50;
      let rhrAvg = 60;
      let sleepDuration = 420;
      let sleepQuality = 70;
      let activityCalories = 400;
      let steps = 8000;
      let moderateMinutes = 30;
      let vigorousMinutes = 0;
      const sources: string[] = [];

      // Process Terra data if available
      if (terraData) {
        if (terraData.hrv && terraData.hrv.length > 0) {
          hrvAvg = terraData.hrv.reduce((sum, h) => sum + h.value, 0) / terraData.hrv.length;
          hrvBaseline = terraData.hrv[0].baseline;
          sources.push('wearable-hrv');
        }

        if (terraData.rhr && terraData.rhr.length > 0) {
          rhrAvg = terraData.rhr.reduce((sum, r) => sum + r.value, 0) / terraData.rhr.length;
          sources.push('wearable-rhr');
        }

        if (terraData.sleep && terraData.sleep.length > 0) {
          sleepDuration = terraData.sleep.reduce((sum, s) => sum + s.duration, 0);
          sleepQuality = terraData.sleep.reduce((sum, s) => sum + s.quality, 0) / terraData.sleep.length;
          sources.push('wearable-sleep');
        }

        if (terraData.activity && terraData.activity.length > 0) {
          activityCalories = terraData.activity.reduce((sum, a) => sum + a.calories, 0);
          steps = terraData.activity.reduce((sum, a) => sum + a.steps, 0);
          moderateMinutes = terraData.activity.reduce((sum, a) => sum + (a.moderate || 0), 0);
          vigorousMinutes = terraData.activity.reduce((sum, a) => sum + (a.vigorous || 0), 0);
          sources.push('wearable-activity');
        }
      }

      // Calculate derived metrics
      const recovery = this.calculateRecoveryIndex(hrvAvg, rhrAvg, sleepQuality, undefined, hrvBaseline, 60);

      // Estimate stress level (inverse relationship with HRV percentile)
      const stressLevel = Math.max(0, Math.min(100, 100 - (hrvAvg / hrvBaseline) * 50));

      // Calculate training load (TSS-like metric)
      const trainingLoad = this.calculateTrainingLoad(
        activityCalories,
        moderateMinutes,
        vigorousMinutes,
        recovery.score
      );

      // Calculate data quality
      const dataQuality = this.calculateDataQualityV2(terraData);

      logger.info('Daily data aggregated V2', {
        context: 'biometric',
        metadata: {
          userId,
          date,
          hrvAvg,
          recoveryScore: recovery.score,
          trainingLoad,
          dataQuality,
          sourceCount: sources.length
        }
      });

      return {
        date,
        hrvAvg: Math.round(hrvAvg),
        hrvBaseline: Math.round(hrvBaseline),
        rhrAvg: Math.round(rhrAvg),
        sleepDuration: Math.round(sleepDuration),
        sleepQuality: Math.round(sleepQuality),
        stressLevel: Math.round(stressLevel),
        recoveryIndex: recovery.score,
        activityCalories: Math.round(activityCalories),
        steps: Math.round(steps),
        trainingLoad: Math.round(trainingLoad),
        dataQuality,
        sources: sources.length > 0 ? sources : ['estimated']
      };
    } catch (error) {
      logger.error('Error in aggregateDailyDataV2', {
        context: 'biometric',
        metadata: { userId, date, error: String(error) }
      });

      // Return conservative defaults on error
      return {
        date,
        hrvAvg: 50,
        hrvBaseline: 50,
        rhrAvg: 60,
        sleepDuration: 420,
        sleepQuality: 70,
        stressLevel: 40,
        recoveryIndex: 50,
        activityCalories: 400,
        steps: 8000,
        trainingLoad: 100,
        dataQuality: 0.5,
        sources: ['fallback']
      };
    }
  }

  /**
   * Calculate training load (TSS-like metric)
   */
  private calculateTrainingLoad(
    calories: number,
    moderateMinutes: number,
    vigorousMinutes: number,
    recoveryScore: number
  ): number {
    // Base load from calories
    const calorieLoad = calories / 5;

    // Intensity multiplier
    const intensityLoad = moderateMinutes * 1.5 + vigorousMinutes * 2.5;

    // Recovery adjustment (lower recovery = higher effective load)
    const recoveryMultiplier = 1 + (100 - recoveryScore) / 100;

    return Math.round((calorieLoad + intensityLoad) * recoveryMultiplier);
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQualityV2(terraData?: any): number {
    if (!terraData) return 0.3;

    let quality = 0;
    let count = 0;

    if (terraData.hrv?.length > 0) { quality += 0.25; count++; }
    if (terraData.rhr?.length > 0) { quality += 0.20; count++; }
    if (terraData.sleep?.length > 0) { quality += 0.25; count++; }
    if (terraData.activity?.length > 0) { quality += 0.30; count++; }

    // Bonus for having multiple sources
    if (count >= 3) quality += 0.1;

    return Math.min(1, quality);
  }

  /**
   * Normalize Terra webhook payload to standard format
   */
  normalizeTerraPayload(
    source: 'garmin' | 'apple' | 'whoop' | 'oura' | 'google_fit',
    payload: Record<string, any>
  ): {
    hrv?: { value: number; baseline: number; percentile: number }[];
    sleep?: { duration: number; quality: number; deep: number; rem: number }[];
    activity?: { steps: number; calories: number; moderate: number; vigorous: number }[];
    rhr?: { value: number }[];
  } {
    const result: any = {};

    switch (source) {
    case 'garmin':
      if (payload.hrv_summary) {
        result.hrv = [{
          value: payload.hrv_summary.weekly_avg || payload.hrv_summary.daily_avg || 50,
          baseline: payload.hrv_summary.baseline || 50,
          percentile: payload.hrv_summary.percentile || 50
        }];
      }
      if (payload.sleep_data) {
        result.sleep = [{
          duration: payload.sleep_data.duration_seconds / 60 || 420,
          quality: payload.sleep_data.overall_score || 70,
          deep: payload.sleep_data.deep_sleep_seconds / 60 || 90,
          rem: payload.sleep_data.rem_sleep_seconds / 60 || 60
        }];
      }
      if (payload.activity_data) {
        result.activity = [{
          steps: payload.activity_data.steps || 0,
          calories: payload.activity_data.active_calories || 0,
          moderate: payload.activity_data.moderate_intensity_minutes || 0,
          vigorous: payload.activity_data.vigorous_intensity_minutes || 0
        }];
      }
      if (payload.heart_rate_data?.resting_hr) {
        result.rhr = [{ value: payload.heart_rate_data.resting_hr }];
      }
      break;

    case 'apple':
      if (payload.heart_rate_variability) {
        result.hrv = [{
          value: payload.heart_rate_variability.avg || 50,
          baseline: 55,
          percentile: 65
        }];
      }
      if (payload.sleep) {
        result.sleep = [{
          duration: payload.sleep.duration / 60 || 420,
          quality: payload.sleep.quality_score || 75,
          deep: payload.sleep.deep_sleep / 60 || 100,
          rem: payload.sleep.rem_sleep / 60 || 80
        }];
      }
      break;

    case 'whoop':
      if (payload.recovery) {
        result.hrv = [{
          value: payload.recovery.hrv || 55,
          baseline: 60,
          percentile: payload.recovery.recovery_score || 70
        }];
      }
      if (payload.sleep) {
        result.sleep = [{
          duration: payload.sleep.duration / 60 || 450,
          quality: payload.sleep.sleep_performance || 80,
          deep: payload.sleep.deep_sleep / 60 || 100,
          rem: payload.sleep.rem_sleep / 60 || 70
        }];
      }
      break;

    case 'oura':
      if (payload.hrv) {
        result.hrv = [{
          value: payload.hrv.average || 50,
          baseline: 55,
          percentile: payload.hrv.baseline_deviation || 50
        }];
      }
      if (payload.sleep) {
        result.sleep = [{
          duration: payload.sleep.duration / 60 || 480,
          quality: payload.sleep.score || 75,
          deep: payload.sleep.deep / 60 || 100,
          rem: payload.sleep.rem / 60 || 80
        }];
      }
      break;

    case 'google_fit':
      if (payload.heart_rate) {
        result.rhr = [{ value: payload.heart_rate.resting || 60 }];
      }
      if (payload.activity) {
        result.activity = [{
          steps: payload.activity.steps || 0,
          calories: payload.activity.calories || 0,
          moderate: payload.activity.moderate_minutes || 0,
          vigorous: payload.activity.vigorous_minutes || 0
        }];
      }
      break;
    }

    return result;
  }
}

export const biometricService = new BiometricService();

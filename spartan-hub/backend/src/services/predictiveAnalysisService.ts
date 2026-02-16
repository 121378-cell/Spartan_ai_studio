/**
 * Predictive Analysis Service
 * 
 * Core logic for trend analysis, fatigue prediction, and historical comparisons
 */

import { DailyBiometrics } from '../models/BiometricData';
import {
  TrendAnalysis,
  RecoveryTrendPoint,
  FatiguePrediction,
  HistoricalComparison,
  OvertainingDetection,
  AnomalyDetection,
  TrainingLoadBalance,
  PeriodizationSuggestion,
  PredictiveAnalyticsSummary,
} from '../models/PredictiveAnalysis';
import logger from '../utils/logger';

export class PredictiveAnalysisService {
  /**
   * Calculate trend analysis for a time period
   */
  static calculateTrendAnalysis(
    biometricHistory: DailyBiometrics[],
    period: '7d' | '30d' | '90d' | 'custom' = '30d',
    customDays?: number
  ): TrendAnalysis {
    try {
      if (!biometricHistory || biometricHistory.length === 0) {
        throw new Error('No biometric history available');
      }

      // Sort by date
      const sorted = [...biometricHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const startDate = sorted[0].date;
      const endDate = sorted[sorted.length - 1].date;

      // Extract recovery scores
      const recoveryScores = sorted
        .map((b) => b.recoveryIndex?.score ?? 50)
        .filter((s) => s !== null && s !== undefined);

      // Calculate statistics
      const stats = this.calculateStatistics(recoveryScores);

      // Detect outliers using z-score
      const dataPoints: RecoveryTrendPoint[] = sorted.map((biometric) => ({
        date: biometric.date,
        score: biometric.recoveryIndex?.score ?? 50,
        components: {
          hrv: biometric.recoveryIndex?.components.hrv ?? 50,
          rhr: biometric.recoveryIndex?.components.rhr ?? 50,
          sleepQuality: biometric.recoveryIndex?.components.sleepQuality ?? 50,
          stressLevel: biometric.recoveryIndex?.components.stressLevel ?? 50,
        },
        isOutlier:
          Math.abs((biometric.recoveryIndex?.score ?? 50 - stats.mean) / stats.stdDev) >
          2,
      }));

      // Calculate trend direction (first half vs second half)
      const midPoint = Math.floor(recoveryScores.length / 2);
      const firstHalf = recoveryScores.slice(0, midPoint);
      const secondHalf = recoveryScores.slice(midPoint);

      const firstHalfMean =
        firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfMean =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      let trendStrength = 0;

      if (secondHalfMean > firstHalfMean + 5) {
        trend = 'improving';
        trendStrength = Math.min(100, ((secondHalfMean - firstHalfMean) / 50) * 100);
      } else if (secondHalfMean < firstHalfMean - 5) {
        trend = 'declining';
        trendStrength = Math.min(100, ((firstHalfMean - secondHalfMean) / 50) * 100);
      }

      // Component trends
      const componentTrends = this.analyzeComponentTrends(sorted);

      // Generate insights
      const insights = this.generateTrendInsights(trend, stats, componentTrends);

      // Generate recommendations
      const recommendations = this.generateTrendRecommendations(
        trend,
        stats,
        componentTrends
      );

      return {
        period,
        startDate,
        endDate,
        dataPoints,
        statistics: {
          mean: stats.mean,
          median: stats.median,
          stdDev: stats.stdDev,
          min: stats.min,
          max: stats.max,
          trend,
          trendStrength,
        },
        componentTrends,
        insights,
        recommendations,
      };
    } catch (error) {
      logger.error('Error calculating trend analysis', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Predict fatigue risk for upcoming days
   */
  static predictFatigue(
    recentBiometrics: DailyBiometrics[],
    daysAhead: number = 7
  ): FatiguePrediction {
    try {
      if (!recentBiometrics || recentBiometrics.length < 3) {
        throw new Error('Insufficient data for fatigue prediction');
      }

      const sorted = [...recentBiometrics]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-14); // Last 14 days

      const today = sorted[sorted.length - 1];
      const avgRecovery = sorted.reduce((sum, b) => sum + (b.recoveryIndex?.score ?? 50), 0) / sorted.length;
      const lastThree = sorted.slice(-3);
      const isDeclinng = lastThree[2].recoveryIndex?.score! <
        lastThree[1].recoveryIndex?.score! &&
        lastThree[1].recoveryIndex?.score! <
          lastThree[0].recoveryIndex?.score!;

      // Identify risk factors
      const riskFactors = {
        lowHRV: this.checkLowHRV(sorted),
        elevatedRHR: this.checkElevatedRHR(sorted),
        poorSleep: this.checkPoorSleep(sorted),
        highStress: this.checkHighStress(sorted),
        overtraining: this.checkOvertraining(sorted),
        consecutiveBadDays: this.countConsecutiveBadDays(sorted),
      };

      // Calculate fatigue risk score (0-100)
      let fatigueRisk = 0;
      if (riskFactors.lowHRV) fatigueRisk += 20;
      if (riskFactors.elevatedRHR) fatigueRisk += 15;
      if (riskFactors.poorSleep) fatigueRisk += 20;
      if (riskFactors.highStress) fatigueRisk += 15;
      if (riskFactors.overtraining) fatigueRisk += 20;
      fatigueRisk += riskFactors.consecutiveBadDays * 3;

      fatigueRisk = Math.min(100, fatigueRisk);

      // Determine fatigue level
      let fatigueLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (fatigueRisk > 75) fatigueLevel = 'critical';
      else if (fatigueRisk > 50) fatigueLevel = 'high';
      else if (fatigueRisk > 25) fatigueLevel = 'moderate';

      // Predict next days
      const nextDaysPrediction = this.predictNextDays(sorted, daysAhead);

      // Generate recommendations
      const recommendations = this.generateFatigueRecommendations(
        fatigueLevel,
        riskFactors
      );

      // Check for specific warnings
      const overtrainingWarning = riskFactors.overtraining
        ? 'Overtraining detected. Consider reducing training intensity.'
        : undefined;

      const injuryRisk =
        fatigueLevel === 'critical'
          ? 'High injury risk. Prioritize recovery and consider medical consultation.'
          : undefined;

      return {
        date: today.date,
        fatigueRisk: Math.round(fatigueRisk),
        fatigueLevel,
        confidence: 75, // Based on data quality and amount
        riskFactors,
        nextDaysPrediction,
        recommendations,
        overtrainingWarning,
        injuryRisk,
      };
    } catch (error) {
      logger.error('Error predicting fatigue', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Compare current period with previous period
   */
  static compareHistoricalData(
    currentPeriodData: DailyBiometrics[],
    previousPeriodData: DailyBiometrics[]
  ): HistoricalComparison {
    try {
      const currentStats = this.calculatePeriodStats(currentPeriodData);
      const previousStats = this.calculatePeriodStats(previousPeriodData);

      const changes = {
        recoveryDelta: currentStats.avgRecovery - previousStats.avgRecovery,
        hrvDelta: currentStats.avgHRV - previousStats.avgHRV,
        rhrDelta: previousStats.avgRHR - currentStats.avgRHR, // Inverse for RHR
        sleepDurationDelta:
          currentStats.avgSleepDuration - previousStats.avgSleepDuration,
      };

      let assessment: 'improving' | 'declining' | 'stable' = 'stable';
      let improvementPercent = 0;

      if (changes.recoveryDelta > 5) {
        assessment = 'improving';
        improvementPercent =
          (changes.recoveryDelta / previousStats.avgRecovery) * 100;
      } else if (changes.recoveryDelta < -5) {
        assessment = 'declining';
      }

      return {
        currentPeriod: {
          start: currentPeriodData[0].date,
          end: currentPeriodData[currentPeriodData.length - 1].date,
          averageRecovery: currentStats.avgRecovery,
          averageHRV: currentStats.avgHRV,
          averageRHR: currentStats.avgRHR,
          averageSleepDuration: currentStats.avgSleepDuration,
          averageSleepQuality: this.calculateSleepQuality(
            currentStats.avgSleepDuration
          ),
        },
        previousPeriod: {
          start: previousPeriodData[0].date,
          end: previousPeriodData[previousPeriodData.length - 1].date,
          averageRecovery: previousStats.avgRecovery,
          averageHRV: previousStats.avgHRV,
          averageRHR: previousStats.avgRHR,
          averageSleepDuration: previousStats.avgSleepDuration,
          averageSleepQuality: this.calculateSleepQuality(
            previousStats.avgSleepDuration
          ),
        },
        changes,
        assessment,
        improvementPercent: Math.abs(improvementPercent),
      };
    } catch (error) {
      logger.error('Error comparing historical data', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Detect overtraining syndrome
   */
  static detectOvertraining(
    biometricHistory: DailyBiometrics[]
  ): OvertainingDetection {
    try {
      const sorted = [...biometricHistory]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30); // Last 30 days

      const indicators = {
        consecutiveHighStress: this.countConsecutiveHighStress(sorted),
        consecutiveLowRecovery: this.countConsecutiveLowRecovery(sorted),
        hrv_declining: this.isHRVDeclining(sorted),
        rhr_elevated: this.isRHRElevated(sorted),
        sleep_disrupted: this.isSleepDisrupted(sorted),
      };

      // Calculate severity score
      let severityScore = 0;
      if (indicators.consecutiveHighStress > 5) severityScore += 20;
      if (indicators.consecutiveLowRecovery > 4) severityScore += 25;
      if (indicators.hrv_declining) severityScore += 15;
      if (indicators.rhr_elevated) severityScore += 15;
      if (indicators.sleep_disrupted) severityScore += 15;

      severityScore = Math.min(100, severityScore);

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (severityScore > 75) riskLevel = 'critical';
      else if (severityScore > 50) riskLevel = 'high';
      else if (severityScore > 25) riskLevel = 'moderate';

      const isOvertrained =
        indicators.consecutiveHighStress > 3 ||
        indicators.consecutiveLowRecovery > 3;

      // Recommendations
      const recommendations =
        this.generateOvertainingRecommendations(riskLevel);

      // Suggested actions
      let recommendedAction: 'continue' | 'deload' | 'rest' | 'medical-consultation' =
        'continue';
      let deloadDuration = 0;

      if (riskLevel === 'critical') {
        recommendedAction = 'medical-consultation';
        deloadDuration = 7;
      } else if (riskLevel === 'high') {
        recommendedAction = 'rest';
        deloadDuration = 5;
      } else if (riskLevel === 'moderate') {
        recommendedAction = 'deload';
        deloadDuration = 3;
      }

      const suggestedActions = {
        recommendedAction,
        deloadDuration: deloadDuration > 0 ? deloadDuration : undefined,
        justification: this.generateOvertainingJustification(
          riskLevel,
          indicators
        ),
      };

      return {
        isOvertrained,
        riskLevel,
        indicators,
        severityScore: Math.round(severityScore),
        recommendations,
        suggestedActions,
      };
    } catch (error) {
      logger.error('Error detecting overtraining', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Detect anomalies in biometric data
   */
  static detectAnomalies(
    recentBiometrics: DailyBiometrics[],
    historicalBaseline: DailyBiometrics[]
  ): AnomalyDetection {
    try {
      const latest = recentBiometrics[recentBiometrics.length - 1];
      const baselineStats = this.calculateStatistics(
        historicalBaseline.map((b) => b.recoveryIndex?.score ?? 50)
      );

      const anomalies: any[] = [];

      // Check HRV
      if (latest.hrv && latest.hrv.length > 0) {
        const latestHRV = latest.hrv[0].value;
        const deviation =
          Math.abs(latestHRV - baselineStats.mean) / baselineStats.stdDev;
        if (deviation > 2) {
          anomalies.push({
            metric: 'hrv' as const,
            value: latestHRV,
            expected: baselineStats.mean,
            deviation,
            severity: deviation > 3 ? 'severe' : 'moderate',
            possibleCause:
              latestHRV < baselineStats.mean
                ? 'Stress or insufficient recovery'
                : 'Unusually good recovery',
          });
        }
      }

      // Check sleep
      if (latest.sleep) {
        const sleepDuration = latest.sleep.duration;
        if (sleepDuration < 360) {
          // Less than 6 hours
          anomalies.push({
            metric: 'sleep' as const,
            value: sleepDuration,
            expected: 480, // 8 hours
            deviation: (480 - sleepDuration) / 60,
            severity: 'moderate',
            possibleCause: 'Sleep deprivation - may impact recovery',
          });
        }
      }

      // Check RHR
      if (latest.restingHeartRate && latest.restingHeartRate.length > 0) {
        const latestRHR = latest.restingHeartRate[0].value;
        if (latestRHR > 65) {
          anomalies.push({
            metric: 'rhr' as const,
            value: latestRHR,
            expected: 55,
            deviation: (latestRHR - 55) / 5,
            severity: 'moderate',
            possibleCause:
              'Elevated resting heart rate - may indicate stress or illness',
          });
        }
      }

      return {
        date: latest.date,
        anomalies,
        hasAnomalies: anomalies.length > 0,
        anomalyCount: anomalies.length,
      };
    } catch (error) {
      logger.error('Error detecting anomalies', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  // ========================
  // HELPER METHODS
  // ========================

  private static calculateStatistics(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const variance =
      values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: Math.round(mean),
      median: Math.round(median),
      stdDev: Math.round(stdDev),
      min: Math.round(sorted[0]),
      max: Math.round(sorted[sorted.length - 1]),
    };
  }

  private static analyzeComponentTrends(biometrics: DailyBiometrics[]) {
    const components = {
      hrv: biometrics.map((b) => b.recoveryIndex?.components.hrv ?? 50),
      rhr: biometrics.map((b) => b.recoveryIndex?.components.rhr ?? 50),
      sleepQuality: biometrics.map(
        (b) => b.recoveryIndex?.components.sleepQuality ?? 50
      ),
      stressLevel: biometrics.map(
        (b) => b.recoveryIndex?.components.stressLevel ?? 50
      ),
    };

    const calculateTrend = (values: number[]) => {
      const midPoint = Math.floor(values.length / 2);
      const firstHalf =
        values.slice(0, midPoint).reduce((a, b) => a + b, 0) /
        midPoint;
      const secondHalf =
        values.slice(midPoint).reduce((a, b) => a + b, 0) /
        (values.length - midPoint);
      const changePercent = ((secondHalf - firstHalf) / firstHalf) * 100;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (changePercent > 5) trend = 'improving';
      else if (changePercent < -5) trend = 'declining';

      return {
        mean: Math.round(firstHalf + secondHalf / 2),
        trend,
        changePercent: Math.round(changePercent),
        volatility: Math.round(
          (Math.max(...values) - Math.min(...values)) / 2
        ),
      };
    };

    return {
      hrv: calculateTrend(components.hrv),
      rhr: calculateTrend(components.rhr),
      sleepQuality: calculateTrend(components.sleepQuality),
      stressLevel: calculateTrend(components.stressLevel),
    };
  }

  private static generateTrendInsights(
    trend: string,
    stats: any,
    componentTrends: any
  ): string[] {
    const insights: string[] = [];

    if (trend === 'improving') {
      insights.push(
        `Recovery is improving with an average score of ${stats.mean}`
      );
      if (componentTrends.hrv.trend === 'improving') {
        insights.push('HRV showing positive trend - nervous system recovering well');
      }
    } else if (trend === 'declining') {
      insights.push(`Recovery is declining. Average score is ${stats.mean}`);
      if (componentTrends.sleepQuality.trend === 'declining') {
        insights.push('Sleep quality is declining - prioritize sleep hygiene');
      }
    } else {
      insights.push(`Recovery is stable at average score of ${stats.mean}`);
    }

    if (stats.stdDev > 15) {
      insights.push('High variability in recovery scores - be mindful of consistency');
    }

    return insights;
  }

  private static generateTrendRecommendations(
    trend: string,
    stats: any,
    componentTrends: any
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'declining') {
      recommendations.push('Prioritize quality sleep - aim for 8-9 hours');
      recommendations.push('Consider reducing training intensity this week');
      recommendations.push('Increase stress management activities (meditation, yoga)');
    } else if (trend === 'improving') {
      recommendations.push('Maintain current training and recovery habits');
      recommendations.push('Continue monitoring metrics for consistency');
    }

    if (componentTrends.rhr.trend === 'declining') {
      recommendations.push('RHR improving - cardiovascular fitness increasing');
    }

    return recommendations;
  }

  private static checkLowHRV(biometrics: DailyBiometrics[]): boolean {
    const lastFive = biometrics.slice(-5);
    const lowHRVCount = lastFive.filter((b) => {
      const hrv = b.hrv?.[0]?.value ?? 0;
      return hrv < 30; // Low HRV threshold
    }).length;
    return lowHRVCount >= 3; // 3+ days of low HRV
  }

  private static checkElevatedRHR(biometrics: DailyBiometrics[]): boolean {
    const lastFive = biometrics.slice(-5);
    const elevatedRHRCount = lastFive.filter((b) => {
      const rhr = b.restingHeartRate?.[0]?.value ?? 0;
      return rhr > 70; // Elevated RHR threshold
    }).length;
    return elevatedRHRCount >= 3;
  }

  private static checkPoorSleep(biometrics: DailyBiometrics[]): boolean {
    const lastFive = biometrics.slice(-5);
    const poorSleepCount = lastFive.filter((b) => {
      const sleepDuration = b.sleep?.duration ?? 0;
      return sleepDuration < 360; // Less than 6 hours
    }).length;
    return poorSleepCount >= 2;
  }

  private static checkHighStress(biometrics: DailyBiometrics[]): boolean {
    const lastFive = biometrics.slice(-5);
    const highStressCount = lastFive.filter((b) => {
      const stressLevel = b.recoveryIndex?.components.stressLevel ?? 50;
      return stressLevel > 70; // High stress threshold
    }).length;
    return highStressCount >= 3;
  }

  private static checkOvertraining(biometrics: DailyBiometrics[]): boolean {
    // Simple overtraining check: multiple bad days + elevated RHR + low HRV
    const lastFive = biometrics.slice(-5);
    const badDays = lastFive.filter(
      (b) => (b.recoveryIndex?.score ?? 50) < 40
    ).length;

    const hasLowHRV = this.checkLowHRV(biometrics);
    const hasElevatedRHR = this.checkElevatedRHR(biometrics);

    return badDays >= 3 && hasLowHRV && hasElevatedRHR;
  }

  private static countConsecutiveBadDays(biometrics: DailyBiometrics[]): number {
    let count = 0;
    for (let i = biometrics.length - 1; i >= 0; i--) {
      if ((biometrics[i].recoveryIndex?.score ?? 50) < 40) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private static countConsecutiveHighStress(biometrics: DailyBiometrics[]): number {
    let count = 0;
    for (let i = biometrics.length - 1; i >= 0; i--) {
      const stressLevel = biometrics[i].recoveryIndex?.components.stressLevel ?? 50;
      if (stressLevel > 70) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private static countConsecutiveLowRecovery(biometrics: DailyBiometrics[]): number {
    let count = 0;
    for (let i = biometrics.length - 1; i >= 0; i--) {
      if ((biometrics[i].recoveryIndex?.score ?? 50) < 40) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private static isHRVDeclining(biometrics: DailyBiometrics[]): boolean {
    const last7 = biometrics.slice(-7);
    const first = last7[0].hrv?.[0]?.value ?? 50;
    const last = last7[last7.length - 1].hrv?.[0]?.value ?? 50;
    return last < first * 0.85; // 15% decline
  }

  private static isRHRElevated(biometrics: DailyBiometrics[]): boolean {
    const last7 = biometrics.slice(-7);
    const avgRHR =
      last7.reduce((sum, b) => sum + (b.restingHeartRate?.[0]?.value ?? 60), 0) /
      last7.length;
    return avgRHR > 70;
  }

  private static isSleepDisrupted(biometrics: DailyBiometrics[]): boolean {
    const last7 = biometrics.slice(-7);
    const poorSleepDays = last7.filter(
      (b) => (b.sleep?.duration ?? 0) < 360
    ).length;
    return poorSleepDays >= 3;
  }

  private static predictNextDays(
    recentBiometrics: DailyBiometrics[],
    daysAhead: number
  ) {
    const predictions = [];
    const trend = this.estimateTrend(recentBiometrics);

    for (let i = 1; i <= daysAhead; i++) {
      const nextDate = new Date(
        new Date(recentBiometrics[recentBiometrics.length - 1].date).getTime() +
          i * 24 * 60 * 60 * 1000
      );
      const predictedScore = Math.max(
        20,
        Math.min(
          100,
          (recentBiometrics[recentBiometrics.length - 1].recoveryIndex?.score ??
            50) + trend * i
        )
      );

      let level: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
      if (predictedScore > 70) level = 'high';
      else if (predictedScore < 40) level = 'low';

      predictions.push({
        date: nextDate.toISOString().split('T')[0],
        predictedFatigueLevel: level,
      });
    }

    return predictions;
  }

  private static estimateTrend(biometrics: DailyBiometrics[]): number {
    const last3 = biometrics.slice(-3);
    if (last3.length < 3) return 0;

    const scores = last3.map((b) => b.recoveryIndex?.score ?? 50);
    return (scores[2] - scores[0]) / 2; // Average daily change
  }

  private static generateFatigueRecommendations(
    level: string,
    riskFactors: any
  ): string[] {
    const recommendations: string[] = [];

    if (level === 'critical') {
      recommendations.push('URGENT: Significantly reduce training intensity');
      recommendations.push('Prioritize 8-9 hours of sleep tonight');
      recommendations.push('Consider taking a complete rest day');
      recommendations.push(
        'Consult with a sports medicine professional if fatigue persists'
      );
    } else if (level === 'high') {
      recommendations.push('Reduce training volume by 30-50%');
      recommendations.push('Focus on light recovery activities (walking, yoga)');
      recommendations.push('Ensure adequate sleep (8+ hours)');
      recommendations.push('Increase protein intake for recovery');
    } else if (level === 'moderate') {
      recommendations.push('Maintain current training but monitor closely');
      recommendations.push('Prioritize sleep quality and duration');
      recommendations.push('Include active recovery in your routine');
    }

    if (riskFactors.lowHRV) {
      recommendations.push(
        'Low HRV detected - reduce sympathetic nervous system stress'
      );
    }
    if (riskFactors.poorSleep) {
      recommendations.push('Improve sleep hygiene: consistent schedule, dark room, no screens 1hr before bed');
    }
    if (riskFactors.highStress) {
      recommendations.push('Practice stress management: meditation, breathing exercises');
    }

    return recommendations;
  }

  private static calculatePeriodStats(biometrics: DailyBiometrics[]) {
    if (biometrics.length === 0) {
      return {
        avgRecovery: 50,
        avgHRV: 50,
        avgRHR: 60,
        avgSleepDuration: 480,
      };
    }

    const avgRecovery =
      biometrics.reduce((sum, b) => sum + (b.recoveryIndex?.score ?? 50), 0) /
      biometrics.length;

    const avgHRV =
      biometrics.reduce((sum, b) => sum + (b.hrv?.[0]?.value ?? 50), 0) /
      biometrics.length;

    const avgRHR =
      biometrics.reduce(
        (sum, b) => sum + (b.restingHeartRate?.[0]?.value ?? 60),
        0
      ) / biometrics.length;

    const avgSleepDuration =
      biometrics.reduce((sum, b) => sum + (b.sleep?.duration ?? 480), 0) /
      biometrics.length;

    return {
      avgRecovery: Math.round(avgRecovery),
      avgHRV: Math.round(avgHRV),
      avgRHR: Math.round(avgRHR),
      avgSleepDuration: Math.round(avgSleepDuration),
    };
  }

  private static calculateSleepQuality(
    duration: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (duration >= 480) return 'excellent'; // 8+ hours
    if (duration >= 420) return 'good'; // 7-8 hours
    if (duration >= 360) return 'fair'; // 6-7 hours
    return 'poor'; // < 6 hours
  }

  private static generateOvertainingRecommendations(riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('URGENT: Consider medical consultation immediately');
      recommendations.push('Plan a 7-day deload with light activity only');
      recommendations.push(
        'Focus on sleep, nutrition, and stress management'
      );
    } else if (riskLevel === 'high') {
      recommendations.push('Implement 5-day deload period');
      recommendations.push('Reduce training volume and intensity significantly');
      recommendations.push('Increase recovery modalities (massage, ice baths, etc.)');
    } else if (riskLevel === 'moderate') {
      recommendations.push('Plan a 3-day lighter training week');
      recommendations.push('Incorporate more active recovery');
      recommendations.push('Monitor metrics closely for improvement');
    }

    return recommendations;
  }

  private static generateOvertainingJustification(
    riskLevel: string,
    indicators: any
  ): string {
    const factors: string[] = [];

    if (indicators.consecutiveHighStress > 3) {
      factors.push(`${indicators.consecutiveHighStress} consecutive high-stress days`);
    }
    if (indicators.consecutiveLowRecovery > 3) {
      factors.push(
        `${indicators.consecutiveLowRecovery} consecutive low-recovery days`
      );
    }
    if (indicators.hrv_declining) {
      factors.push('HRV declining trend detected');
    }
    if (indicators.rhr_elevated) {
      factors.push('Resting heart rate elevated');
    }
    if (indicators.sleep_disrupted) {
      factors.push('Sleep patterns disrupted');
    }

    return `Overtraining indicators: ${factors.join(', ')}`;
  }
}

export default PredictiveAnalysisService;

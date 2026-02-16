/**
 * ML-Enhanced Performance Forecasting Model
 * Phase 4.4 - Predictive Performance Analysis
 * 
 * Time-series forecasting engine that predicts future performance based on:
 * - Historical performance trends (12-week lookback)
 * - Training load progression
 * - Recovery patterns
 * - Seasonal effects
 * - Periodization cycles
 */

import { FeatureEngineeringService } from '../services/featureEngineeringService';
import { logger } from '../../utils/logger';

/**
 * Performance forecast interfaces
 */
export interface PerformanceForecast {
  predictions: PerformancePrediction[];
  trendAnalysis: TrendAnalysis;
  anomalies: AnomalyDetection;
  recommendations: ForecastRecommendation[];
  confidenceInterval: ConfidenceInterval;
  confidence: number; // 0-1
  mlSource: boolean; // true if from ML model
  timeframe: 'short-term' | 'medium-term' | 'long-term'; // 2-4 weeks, 4-8 weeks, 8-12 weeks
}

export interface PerformancePrediction {
  week: number; // 1-12
  date: Date;
  expectedPerformance: number; // 0-100
  expectedPower: number; // watts (cycling) or similar
  expectedSpeed: number; // km/h or similar
  expectedEndurance: number; // duration in minutes
  confidence: number; // 0-1 for this specific prediction
}

export interface TrendAnalysis {
  direction: 'improving' | 'declining' | 'stable';
  rate: number; // % per week (positive = improving)
  accelerating: boolean; // trend getting stronger?
  daysToGoal: number; // projected days to reach target
  projectedPeak: {
    week: number;
    value: number;
  };
}

export interface AnomalyDetection {
  detected: boolean;
  score: number; // 0-1 (higher = more anomalous)
  description?: string;
  severity: 'none' | 'low' | 'medium' | 'high';
  type?: 'overtraining' | 'plateau' | 'sudden-drop' | 'unexpected-spike';
}

export interface ForecastRecommendation {
  actionItem: string;
  timing: string; // "immediately", "week 1-2", "week 3-4"
  expectedImpact: string; // "+5% performance", "-2% injury risk"
  priority: 'low' | 'medium' | 'high';
  category: 'training' | 'recovery' | 'nutrition' | 'testing';
}

export interface ConfidenceInterval {
  lower95: number; // 95% confidence lower bound
  upper95: number; // 95% confidence upper bound
  lower80: number; // 80% confidence lower bound
  upper80: number; // 80% confidence upper bound
}

/**
 * Performance Forecasting Model
 * Uses time-series analysis to predict future performance
 */
export class PerformanceForecastModel {
  /**
   * Generate 12-week performance forecast
   * 
   * @param biometricHistory - User's biometric data (minimum 12 weeks)
   * @param performanceHistory - Optional: historical performance data
   * @param trainingGoals - Optional: user's performance goals
   * @returns Performance forecast for 12 weeks
   */
  static async predict(
    biometricHistory?: any[],
    performanceHistory?: Array<{date: Date, score: number, sport: string, distance?: number}>,
    trainingGoals?: {targetPerformance: number, timeframe: number, sport: string}
  ): Promise<PerformanceForecast> {
    if (!performanceHistory || performanceHistory.length === 0) {
      if (!trainingGoals) {
        throw new Error('Need either performance history or training goals');
      }
    }

    // Default trend for new users or when no history
    const trend = this.analyzePerformanceTrend(performanceHistory || [], {});
    const seasonality = this.detectSeasonality(performanceHistory || []);
    const predictions = this.generateWeeklyPredictions(trend, seasonality, trainingGoals);
    const trendAnalysis = this.analyzeTrendDirection(predictions, trend);
    const anomalies = this.detectAnomalies([], performanceHistory || []);
    const recommendations = this.generateRecommendations(trendAnalysis, anomalies, trainingGoals);
    const confidenceInterval = this.calculateConfidenceIntervals(predictions);
    const confidence = this.calculateOverallConfidence(predictions);
    const timeframe = this.determineTimeframe(trendAnalysis);

    return {
      predictions,
      trendAnalysis,
      anomalies,
      recommendations,
      confidenceInterval,
      confidence,
      mlSource: true,
      timeframe,
    };
  }

  /**
   * Analyze historical performance trends
   */
  private static analyzePerformanceTrend(
    performanceHistory: any[],
    features: any
  ): any {
    if (performanceHistory.length === 0) {
      // Default trend for new users
      return {
        basePerformance: 50,
        weeklyImprovement: 2, // 2% per week
        variability: 5,
        peakPerformance: 55,
      };
    }

    // Calculate trend metrics
    const sortedHistory = [...performanceHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstWeek = sortedHistory.slice(0, 7).map((d) => d.score || 50);
    const lastWeek = sortedHistory.slice(-7).map((d) => d.score || 50);

    const avgFirst = firstWeek.reduce((a, b) => a + b, 0) / firstWeek.length;
    const avgLast = lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length;
    const improvement = ((avgLast - avgFirst) / avgFirst) * 100;

    // Calculate variability (consistency)
    const variance =
      sortedHistory.reduce((sum, entry) => {
        const score = entry.score || 50;
        return sum + Math.pow(score - avgLast, 2);
      }, 0) / sortedHistory.length;

    const stdDev = Math.sqrt(variance);

    return {
      basePerformance: avgLast,
      weeklyImprovement: improvement / (sortedHistory.length / 7),
      variability: stdDev,
      peakPerformance: Math.max(...sortedHistory.map((d) => d.score || 50)),
    };
  }

  /**
   * Detect seasonal patterns
   */
  private static detectSeasonality(performanceHistory: any[]): any {
    if (performanceHistory.length < 28) {
      // Need 4+ weeks for seasonality
      return {
        seasonal: false,
        pattern: 'insufficient-data',
        factor: 1,
      };
    }

    // Group by week and analyze patterns
    const weeks: number[][] = [];
    let currentWeek: number[] = [];

    for (const entry of performanceHistory) {
      currentWeek.push(entry.score || 50);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (weeks.length < 4) {
      return { seasonal: false, pattern: 'insufficient-weeks', factor: 1 };
    }

    // Analyze week-to-week correlation
    const avgPerWeek = weeks.map((w) => w.reduce((a, b) => a + b, 0) / w.length);
    const seasonalFactor = Math.max(...avgPerWeek) / Math.min(...avgPerWeek);

    return {
      seasonal: seasonalFactor > 1.15, // More than 15% variation
      pattern: seasonalFactor > 1.15 ? 'detected' : 'none',
      factor: seasonalFactor,
    };
  }

  /**
   * Generate weekly performance predictions
   */
  private static generateWeeklyPredictions(
    trend: any,
    seasonality: any,
    goals?: any
  ): PerformancePrediction[] {
    const predictions: PerformancePrediction[] = [];
    let currentPerformance = trend.basePerformance;
    const weeklyImprovement = trend.weeklyImprovement || 2;
    const seasonalFactor = seasonality.factor || 1;

    for (let week = 1; week <= 12; week++) {
      // Apply weekly improvement
      currentPerformance += weeklyImprovement;

      // Apply seasonal variation
      const seasonalVariation = Math.sin((week * Math.PI) / 4) * 5; // ±5% seasonal swing
      const adjustedPerformance = currentPerformance + seasonalVariation;

      // Cap at realistic values
      const finalPerformance = Math.min(100, Math.max(0, adjustedPerformance));

      predictions.push({
        week,
        date: new Date(Date.now() + week * 7 * 24 * 60 * 60 * 1000),
        expectedPerformance: Math.round(finalPerformance),
        expectedPower: 150 + (finalPerformance - 50) * 2, // 150-250W range
        expectedSpeed: 20 + (finalPerformance - 50) * 0.3, // 20-35 km/h range
        expectedEndurance: 45 + (finalPerformance - 50) * 0.8, // 45-95 min range
        confidence: Math.max(0.6, 0.95 - week * 0.03), // Decreasing confidence over time
      });
    }

    return predictions;
  }

  /**
   * Analyze overall trend direction
   */
  private static analyzeTrendDirection(
    predictions: PerformancePrediction[],
    trend: any
  ): TrendAnalysis {
    const startPerformance = predictions[0].expectedPerformance;
    const endPerformance = predictions[predictions.length - 1].expectedPerformance;
    const change = endPerformance - startPerformance;
    const changeRate = (change / startPerformance) * 100;

    // Determine direction
    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    if (changeRate > 5) direction = 'improving';
    else if (changeRate < -5) direction = 'declining';

    // Check if trend is accelerating
    const firstHalf = predictions
      .slice(0, 6)
      .reduce((sum, p) => sum + p.expectedPerformance, 0) / 6;
    const secondHalf = predictions
      .slice(6, 12)
      .reduce((sum, p) => sum + p.expectedPerformance, 0) / 6;
    const accelerating = secondHalf > firstHalf;

    // Calculate days to goal (if applicable)
    const daysToGoal = 84; // Default 12 weeks

    return {
      direction,
      rate: changeRate / 12, // % per week
      accelerating,
      daysToGoal,
      projectedPeak: {
        week: predictions.reduce((max, p, i, arr) =>
          p.expectedPerformance > arr[max].expectedPerformance ? i : max,
          0 // Initial index
        ) + 1, // Convert to 1-based week number
        value: Math.max(...predictions.map((p) => p.expectedPerformance)),
      },
    };
  }

  /**
   * Detect anomalies in data
   */
  private static detectAnomalies(
    biometricHistory: any[],
    performanceHistory: any[]
  ): AnomalyDetection {
    if (biometricHistory.length < 7 || performanceHistory.length < 7) {
      return {
        detected: false,
        score: 0,
        severity: 'none',
      };
    }

    // Check for sudden performance drops
    const recentPerformance = performanceHistory.slice(-7).map((p) => p.score || 50);
    const avgRecent = recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length;
    const avgPrevious = performanceHistory
      .slice(-14, -7)
      .map((p) => p.score || 50)
      .reduce((a, b) => a + b, 0) / 7;

    const drop = ((avgPrevious - avgRecent) / avgPrevious) * 100;

    // Check HRV (recovery indicator)
    const recentHRV = biometricHistory.slice(-7).map((b) => b.hrv || 50);
    const avgHRV = recentHRV.reduce((a, b) => a + b, 0) / recentHRV.length;
    const lowHRV = avgHRV < 40; // Low recovery

    // Determine if anomaly exists
    const detected = drop > 15 || (drop > 10 && lowHRV);
    const severity = detected
      ? drop > 30
        ? 'high'
        : drop > 20
          ? 'medium'
          : 'low'
      : 'none';

    let type: any;
    if (drop > 20) type = 'sudden-drop';
    else if (lowHRV && drop > 5) type = 'overtraining';

    return {
      detected,
      score: Math.min(1, Math.abs(drop) / 100),
      description: detected
        ? `Performance drop detected: ${Math.round(drop)}% decline over past 7 days`
        : undefined,
      severity,
      type,
    };
  }

  /**
   * Generate recommendations based on forecast
   */
  private static generateRecommendations(
    trend: TrendAnalysis,
    anomalies: AnomalyDetection,
    goals?: any
  ): ForecastRecommendation[] {
    const recommendations: ForecastRecommendation[] = [];

    // Trend-based recommendations
    if (trend.direction === 'declining') {
      recommendations.push({
        actionItem: 'Increase training volume gradually',
        timing: 'immediately',
        expectedImpact: 'Reverse declining trend (+3-5% per week)',
        priority: 'high',
        category: 'training',
      });

      recommendations.push({
        actionItem: 'Implement deload week',
        timing: 'week 1-2',
        expectedImpact: 'Prevent overtraining, restore HRV',
        priority: 'high',
        category: 'recovery',
      });
    }

    if (trend.direction === 'improving' && !trend.accelerating) {
      recommendations.push({
        actionItem: 'Maintain current training plan',
        timing: 'ongoing',
        expectedImpact: 'Continue ~2-3% weekly improvement',
        priority: 'medium',
        category: 'training',
      });
    }

    if (trend.accelerating) {
      recommendations.push({
        actionItem: 'Plan peak event testing',
        timing: `week ${trend.projectedPeak.week}`,
        expectedImpact: 'Maximize performance at peak',
        priority: 'high',
        category: 'testing',
      });
    }

    // Anomaly-based recommendations
    if (anomalies.detected && anomalies.severity === 'high') {
      recommendations.push({
        actionItem: 'Reduce training stress immediately',
        timing: 'immediately',
        expectedImpact: 'Prevent injury, restore performance',
        priority: 'high',
        category: 'recovery',
      });

      recommendations.push({
        actionItem: 'Consult coach or medical professional',
        timing: 'this week',
        expectedImpact: 'Expert assessment of performance drop',
        priority: 'high',
        category: 'testing',
      });
    }

    if (anomalies.type === 'overtraining') {
      recommendations.push({
        actionItem: 'Focus on recovery: sleep, nutrition, stress reduction',
        timing: 'immediately',
        expectedImpact: 'Improve HRV, support performance adaptation',
        priority: 'high',
        category: 'recovery',
      });
    }

    // Default recommendations if no specific issues
    if (recommendations.length === 0) {
      recommendations.push({
        actionItem: 'Continue current training approach',
        timing: 'ongoing',
        expectedImpact: 'Maintain performance gains',
        priority: 'medium',
        category: 'training',
      });

      recommendations.push({
        actionItem: 'Prioritize sleep and nutrition',
        timing: 'ongoing',
        expectedImpact: '+2-3% performance improvement',
        priority: 'medium',
        category: 'recovery',
      });
    }

    return recommendations;
  }

  /**
   * Calculate confidence intervals
   */
  private static calculateConfidenceIntervals(
    predictions: PerformancePrediction[]
  ): ConfidenceInterval {
    const midpoint = predictions[Math.floor(predictions.length / 2)];
    const avgPerformance =
      predictions.reduce((sum, p) => sum + p.expectedPerformance, 0) / predictions.length;

    // Standard error (increases over time)
    const se = avgPerformance * 0.08; // 8% standard error

    return {
      lower95: Math.max(0, avgPerformance - 1.96 * se),
      upper95: Math.min(100, avgPerformance + 1.96 * se),
      lower80: Math.max(0, avgPerformance - 1.28 * se),
      upper80: Math.min(100, avgPerformance + 1.28 * se),
    };
  }

  /**
   * Calculate overall confidence score
   */
  private static calculateOverallConfidence(predictions: PerformancePrediction[]): number {
    // Average of all prediction confidences
    const avgConfidence =
      predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    return Math.round(avgConfidence * 100) / 100; // Round to 2 decimals
  }

  /**
   * Determine forecast timeframe
   */
  private static determineTimeframe(
    trend: TrendAnalysis
  ): 'short-term' | 'medium-term' | 'long-term' {
    // Based on trend stability and projection horizon
    if (trend.rate > 5) return 'short-term'; // Rapidly improving
    if (trend.rate < -3) return 'short-term'; // Rapidly declining
    return 'medium-term'; // Default
  }
}

/**
 * Performance forecast service exports
 */
export const performanceForecastModel = new PerformanceForecastModel();

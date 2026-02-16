/**
 * Readiness Analytics Service
 * 
 * Implements advanced analytics algorithms for:
 * - Recovery score calculation
 * - Readiness to train scoring
 * - Trend analysis
 * - Personalized recommendations
 * - Injury risk assessment
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../utils/logger';
import { BiometricDataType } from '../types/biometric';

export interface RecoveryComponents {
  sleep: number;
  hrv: number;
  rhr: number;
  stress: number;
}

export interface RecoveryScore {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  components: RecoveryComponents;
  recommendation: string;
}

export interface ReadinessScore {
  score: number; // 0-100
  status: 'high' | 'normal' | 'low' | 'very_low';
  fatigue: number;
  baseline_comparison: number;
  recommendation: string;
}

export interface TrendData {
  metric: string;
  values: number[];
  movingAverage7d: number[];
  trend: 'improving' | 'declining' | 'stable';
  slope: number;
  anomalies: boolean[];
}

export interface Recommendation {
  type: 'recovery' | 'training' | 'injury_prevention';
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionItems?: string[];
}

export interface InjuryRiskAssessment {
  riskLevel: 'low' | 'moderate' | 'high';
  score: number;
  factors: {
    elevatedRhr: boolean;
    suppressedHrv: boolean;
    overtraining: boolean;
    sleepDeprivation: boolean;
  };
  recommendation: string;
}

export class ReadinessAnalyticsService {
  private db: DatabaseType | null = null;

  private getDb(): DatabaseType {
    if (!this.db) {
      this.db = new Database(process.env.DATABASE_PATH || ':memory:');
      this.db.pragma('foreign_keys = ON');
    }
    return this.db;
  }

  /**
   * Calculate recovery score for a specific date
   * Recovery = How well has the user recovered (0-100)
   */
  async calculateRecoveryScore(userId: string, date: string): Promise<RecoveryScore> {
    try {
      const db = this.getDb();
      const biometricData = this.getBiometricDataForDate(userId, date);

      // Get baseline (30-day average)
      const baseline = this.getBaseline(userId, 30);

      // Calculate components
      const sleepComponent = this.calculateSleepComponent(biometricData);
      const hrvComponent = this.calculateHrvComponent(biometricData, baseline);
      const rhrComponent = this.calculateRhrComponent(biometricData, baseline);
      const stressComponent = this.calculateStressComponent(biometricData);

      // Weighted average
      const score = Math.max(
        0,
        Math.min(
          100,
          sleepComponent * 0.25 + hrvComponent * 0.25 + rhrComponent * 0.2 + stressComponent * 0.3
        )
      );

      // Determine status
      const status = this.getRecoveryStatus(score);
      const recommendation = this.getRecoveryRecommendation(score, biometricData, baseline);

      logger.info('Recovery score calculated', {
        context: 'analytics.recovery',
        metadata: { userId, date, score, status }
      });

      return {
        score,
        status,
        components: {
          sleep: sleepComponent,
          hrv: hrvComponent,
          rhr: rhrComponent,
          stress: stressComponent
        },
        recommendation
      };
    } catch (error) {
      logger.error('Failed to calculate recovery score', {
        context: 'analytics.recovery',
        metadata: { userId, date, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Calculate readiness to train score
   * Readiness = Can the user handle hard training? (0-100)
   */
  async calculateReadinessScore(userId: string, date: string): Promise<ReadinessScore> {
    try {
      const db = this.getDb();
      const biometricData = this.getBiometricDataForDate(userId, date);
      const baseline = this.getBaseline(userId, 30);
      const trainingHistory = this.getTrainingHistory(userId, 7);

      // Components
      const baselineComponent = this.calculateBaselineComponent(
        biometricData,
        baseline,
        trainingHistory
      );
      const fatigueComponent = this.calculateFatigueComponent(trainingHistory);
      const motivationComponent = this.calculateMotivationComponent(userId, 30);

      // Weighted average
      const score = Math.max(
        0,
        Math.min(
          100,
          baselineComponent * 0.4 + fatigueComponent * 0.3 + motivationComponent * 0.3
        )
      );

      const status = this.getReadinessStatus(score);
      const recommendation = this.getReadinessRecommendation(
        score,
        biometricData,
        trainingHistory,
        baseline
      );

      logger.info('Readiness score calculated', {
        context: 'analytics.readiness',
        metadata: { userId, date, score, status }
      });

      return {
        score,
        status,
        fatigue: 100 - fatigueComponent,
        baseline_comparison: baselineComponent,
        recommendation
      };
    } catch (error) {
      logger.error('Failed to calculate readiness score', {
        context: 'analytics.readiness',
        metadata: { userId, date, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Analyze trends over a period
   */
  async analyzeTrends(
    userId: string,
    metric: BiometricDataType | string,
    days: number = 30
  ): Promise<TrendData> {
    try {
      const values = this.getMetricHistory(userId, metric, days);

      // Calculate moving averages
      const movingAverage7d = this.calculateMovingAverage(values, 7);

      // Detect trend
      const trend = this.detectTrend(movingAverage7d);
      const slope = this.calculateSlope(movingAverage7d);

      // Detect anomalies
      const anomalies = this.detectAnomalies(values);

      logger.info('Trend analysis completed', {
        context: 'analytics.trends',
        metadata: { userId, metric, days, trend, slope }
      });

      return {
        metric,
        values,
        movingAverage7d,
        trend,
        slope,
        anomalies
      };
    } catch (error) {
      logger.error('Failed to analyze trends', {
        context: 'analytics.trends',
        metadata: { userId, metric, days, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Generate personalized recommendations
   */
  async generateRecommendations(userId: string, date: string): Promise<Recommendation[]> {
    try {
      const recovery = await this.calculateRecoveryScore(userId, date);
      const readiness = await this.calculateReadinessScore(userId, date);
      const biometricData = this.getBiometricDataForDate(userId, date);
      const baseline = this.getBaseline(userId, 30);
      const injuryRisk = await this.assessInjuryRisk(userId, date);

      const recommendations: Recommendation[] = [];

      // Recovery recommendations
      if (recovery.score < 40) {
        recommendations.push({
          type: 'recovery',
          message: 'Take a rest day - your body needs recovery',
          priority: 'high',
          actionItems: [
            'Prioritize sleep tonight (aim for 8+ hours)',
            'Avoid strenuous activities',
            'Try relaxation techniques (meditation, massage)'
          ]
        });
      } else if (recovery.score < 60) {
        recommendations.push({
          type: 'recovery',
          message: 'Light activity only - focus on recovery',
          priority: 'medium'
        });
      }

      // Sleep recommendations
      if (biometricData.sleep && biometricData.sleep < 6) {
        recommendations.push({
          type: 'recovery',
          message: 'You got less than 6 hours - that\'s below optimal',
          priority: 'high',
          actionItems: [
            'Establish consistent sleep schedule',
            'Avoid screens 1 hour before bed',
            'Keep room cool and dark'
          ]
        });
      } else if (biometricData.sleep && biometricData.sleep > 10) {
        recommendations.push({
          type: 'recovery',
          message: 'Consider reducing sleep duration (aiming for 7-9 hours)',
          priority: 'low'
        });
      }

      // Stress recommendations
      if (biometricData.stress && biometricData.stress > 70) {
        recommendations.push({
          type: 'recovery',
          message: 'Stress levels are high - reduce training intensity',
          priority: 'high',
          actionItems: [
            'Practice stress management (yoga, meditation)',
            'Reduce training volume today',
            'Focus on breathing exercises'
          ]
        });
      }

      // HRV recommendations
      if (biometricData.hrv && biometricData.hrv < baseline.hrv * 0.8) {
        recommendations.push({
          type: 'recovery',
          message: 'HRV is suppressed - you\'re accumulating fatigue',
          priority: 'high',
          actionItems: [
            'Reduce training intensity',
            'Prioritize sleep and recovery',
            'Monitor HRV trends closely'
          ]
        });
      }

      // Training recommendations
      if (readiness.score > 70) {
        recommendations.push({
          type: 'training',
          message: 'You\'re well-recovered - perfect day for high-intensity training',
          priority: 'medium',
          actionItems: [
            'Schedule hard workouts today',
            'Attempt new personal records',
            'Push training intensity to 80-90% max HR'
          ]
        });
      } else if (readiness.score < 40) {
        recommendations.push({
          type: 'training',
          message: 'Low readiness - avoid intense training',
          priority: 'high',
          actionItems: [
            'Do easy recovery work only',
            'Keep intensity below 60% max HR',
            'Focus on technique and form'
          ]
        });
      }

      // Injury prevention alerts
      if (injuryRisk.riskLevel === 'high') {
        recommendations.push({
          type: 'injury_prevention',
          message: 'HIGH INJURY RISK - reduce training immediately',
          priority: 'high',
          actionItems: [
            `Risk factors: ${Object.entries(injuryRisk.factors)
              .filter(([_, v]) => v)
              .map(([k]) => k)
              .join(', ')}`,
            'Take a complete rest day',
            'Seek professional evaluation if symptoms persist'
          ]
        });
      } else if (injuryRisk.riskLevel === 'moderate') {
        recommendations.push({
          type: 'injury_prevention',
          message: 'Moderate injury risk - monitor closely',
          priority: 'medium',
          actionItems: ['Reduce training volume by 20-30%', 'Include extra warm-up and cool-down']
        });
      }

      logger.info('Recommendations generated', {
        context: 'analytics.recommendations',
        metadata: { userId, date, count: recommendations.length }
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to generate recommendations', {
        context: 'analytics.recommendations',
        metadata: { userId, date, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Assess injury risk
   */
  async assessInjuryRisk(userId: string, date: string): Promise<InjuryRiskAssessment> {
    try {
      const biometricData = this.getBiometricDataForDate(userId, date);
      const baseline = this.getBaseline(userId, 30);
      const trainingHistory = this.getTrainingHistory(userId, 7);

      let riskScore = 0;
      const factors = {
        elevatedRhr: false,
        suppressedHrv: false,
        overtraining: false,
        sleepDeprivation: false
      };

      // Check elevated resting heart rate (strong indicator of overtraining)
      if (biometricData.rhr && baseline.rhr && biometricData.rhr > baseline.rhr + 15) {
        riskScore += 30;
        factors.elevatedRhr = true;
      }

      // Check suppressed HRV (fatigue indicator)
      if (biometricData.hrv && baseline.hrv && biometricData.hrv < baseline.hrv * 0.7) {
        riskScore += 25;
        factors.suppressedHrv = true;
      }

      // Check overtraining (consecutive hard days)
      const consecutiveHardDays = this.countConsecutiveHardDays(trainingHistory);
      if (consecutiveHardDays > 4) {
        riskScore += 25;
        factors.overtraining = true;
      }

      // Check sleep deprivation
      if (biometricData.sleep && biometricData.sleep < 6) {
        riskScore += 20;
        factors.sleepDeprivation = true;
      }

      const riskLevel = riskScore > 60 ? 'high' : riskScore > 40 ? 'moderate' : 'low';
      const recommendation =
        riskLevel === 'high'
          ? 'Reduce training immediately and prioritize recovery'
          : riskLevel === 'moderate'
            ? 'Monitor closely and reduce training volume'
            : 'Continue current routine with normal precautions';

      logger.info('Injury risk assessed', {
        context: 'analytics.injury_risk',
        metadata: { userId, date, riskLevel, score: riskScore }
      });

      return {
        riskLevel,
        score: Math.min(100, riskScore),
        factors,
        recommendation
      };
    } catch (error) {
      logger.error('Failed to assess injury risk', {
        context: 'analytics.injury_risk',
        metadata: { userId, date, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getBiometricDataForDate(userId: string, date: string) {
    const db = this.getDb();
    const result = db
      .prepare(
        `
      SELECT 
        COALESCE(
          (SELECT AVG(value) FROM biometric_data_points 
           WHERE userId = ? AND dataType = 'heart_rate' 
           AND DATE(timestamp/1000, 'unixepoch') = ?),
          0
        ) as avg_hr,
        COALESCE(
          (SELECT AVG(value) FROM biometric_data_points 
           WHERE userId = ? AND dataType = 'rhr' 
           AND DATE(timestamp/1000, 'unixepoch') = ?),
          0
        ) as rhr,
        COALESCE(
          (SELECT AVG(value) FROM biometric_data_points 
           WHERE userId = ? AND dataType = 'hrv' 
           AND DATE(timestamp/1000, 'unixepoch') = ?),
          0
        ) as hrv,
        COALESCE(
          (SELECT AVG(value) FROM biometric_data_points 
           WHERE userId = ? AND dataType = 'stress_level' 
           AND DATE(timestamp/1000, 'unixepoch') = ?),
          0
        ) as stress,
        COALESCE(
          (SELECT AVG(value) FROM biometric_data_points 
           WHERE userId = ? AND dataType = 'sleep_duration' 
           AND DATE(timestamp/1000, 'unixepoch') = ?),
          0
        ) as sleep,
        COALESCE(
          (SELECT SUM(value) FROM biometric_data_points 
           WHERE userId = ? AND dataType = 'activity' 
           AND DATE(timestamp/1000, 'unixepoch') = ?),
          0
        ) as total_activity
    `
      )
      .get(
        userId,
        date,
        userId,
        date,
        userId,
        date,
        userId,
        date,
        userId,
        date,
        userId,
        date
      ) as {
        avg_hr: number;
        rhr: number;
        hrv: number;
        stress: number;
        sleep: number;
        total_activity: number;
      };

    return {
      avg_hr: result.avg_hr,
      rhr: result.rhr,
      hrv: result.hrv,
      stress: result.stress,
      sleep: result.sleep,
      total_activity: result.total_activity
    };
  }

  private getBaseline(userId: string, days: number) {
    const db = this.getDb();
    const result = db
      .prepare(
        `
      SELECT 
        AVG(COALESCE((SELECT AVG(value) FROM biometric_data_points 
                      WHERE userId = ? AND dataType = 'heart_rate' 
                      AND DATE(timestamp/1000, 'unixepoch') = d.date), 0)) as baseline_hr,
        AVG(COALESCE((SELECT AVG(value) FROM biometric_data_points 
                      WHERE userId = ? AND dataType = 'rhr' 
                      AND DATE(timestamp/1000, 'unixepoch') = d.date), 0)) as baseline_rhr,
        AVG(COALESCE((SELECT AVG(value) FROM biometric_data_points 
                      WHERE userId = ? AND dataType = 'hrv' 
                      AND DATE(timestamp/1000, 'unixepoch') = d.date), 0)) as baseline_hrv
      FROM (
        SELECT DATE('now', '-' || ? || ' days') as date
        UNION ALL SELECT DATE('now', '-' || (? - 1) || ' days')
      ) d
    `
      )
      .get(userId, userId, userId, days, days) as {
        baseline_hr: number;
        baseline_rhr: number;
        baseline_hrv: number;
      };

    return {
      hr: result.baseline_hr || 70,
      rhr: result.baseline_rhr || 60,
      hrv: result.baseline_hrv || 50
    };
  }

  private getTrainingHistory(userId: string, days: number) {
    const db = this.getDb();
    return db
      .prepare(
        `
      SELECT 
        DATE(timestamp/1000, 'unixepoch') as date,
        SUM(value) as total_activity,
        COUNT(*) as activity_count
      FROM biometric_data_points
      WHERE userId = ? 
        AND dataType = 'activity'
        AND timestamp > datetime('now', '-' || ? || ' days')
      GROUP BY date
      ORDER BY date DESC
    `
      )
      .all(userId, days) as Array<{
        date: string;
        total_activity: number;
        activity_count: number;
      }>;
  }

  private getMetricHistory(userId: string, metric: string, days: number) {
    const db = this.getDb();
    const results = db
      .prepare(
        `
      SELECT value
      FROM biometric_data_points
      WHERE userId = ? 
        AND dataType = ?
        AND timestamp > datetime('now', '-' || ? || ' days')
      ORDER BY timestamp ASC
    `
      )
      .all(userId, metric, days) as Array<{ value: number }>;

    return results.map(r => r.value);
  }

  private calculateSleepComponent(data: any): number {
    if (!data.sleep || data.sleep === 0) return 0;

    let sleepScore = 0;
    if (data.sleep < 4) sleepScore = 0;
    else if (data.sleep < 6) sleepScore = 50;
    else if (data.sleep < 9) sleepScore = 100;
    else if (data.sleep < 10) sleepScore = 80;
    else sleepScore = 50;

    return sleepScore;
  }

  private calculateHrvComponent(data: any, baseline: any): number {
    if (!data.hrv || !baseline.hrv) return 50;

    const ratio = data.hrv / baseline.hrv;
    if (ratio < 0.8) return 25;
    if (ratio < 1.0) return 60;
    if (ratio < 1.2) return 85;
    return 100;
  }

  private calculateRhrComponent(data: any, baseline: any): number {
    if (!data.rhr || !baseline.rhr) return 70;

    const diff = data.rhr - baseline.rhr;
    if (diff < -5) return 100;
    if (diff < 0) return 90;
    if (diff < 5) return 70;
    if (diff < 10) return 40;
    return 10;
  }

  private calculateStressComponent(data: any): number {
    if (!data.stress) return 75;

    if (data.stress <= 35) return 100;
    if (data.stress <= 50) return 80;
    if (data.stress <= 65) return 50;
    if (data.stress <= 80) return 25;
    return 10;
  }

  private calculateBaselineComponent(data: any, baseline: any, trainingHistory: any[]): number {
    if (!data.avg_hr || !baseline.hr) return 50;

    const hrRatio = data.avg_hr / baseline.hr;
    let score = 0;

    if (hrRatio < 0.95) score += 50; // Better efficiency
    else if (hrRatio < 1.05) score += 40;
    else if (hrRatio < 1.15) score += 20;
    else score += 0;

    // Add power/capacity if available
    score += 50;

    return Math.min(100, score);
  }

  private calculateFatigueComponent(trainingHistory: any[]): number {
    if (!trainingHistory || trainingHistory.length === 0) return 75;

    let fatigueScore = 100;

    // Penalize consecutive hard days
    const consecutiveDays = this.countConsecutiveHardDays(trainingHistory);
    fatigueScore -= consecutiveDays * 10;

    // Penalize high weekly load
    const weeklyLoad = trainingHistory.reduce((sum, day) => sum + day.total_activity, 0);
    if (weeklyLoad > 600) fatigueScore -= 20;
    if (weeklyLoad > 800) fatigueScore -= 30;

    return Math.max(0, Math.min(100, fatigueScore));
  }

  private calculateMotivationComponent(userId: string, days: number): number {
    const db = this.getDb();
    const result = db
      .prepare(
        `
      SELECT COUNT(DISTINCT DATE(timestamp/1000, 'unixepoch')) as activity_days
      FROM biometric_data_points
      WHERE userId = ? 
        AND dataType = 'activity'
        AND timestamp > datetime('now', '-' || ? || ' days')
    `
      )
      .get(userId, days) as { activity_days: number };

    const consistency = (result.activity_days / days) * 100;
    return Math.min(100, Math.max(0, consistency * 1.5)); // Reward consistent exercisers
  }

  private getRecoveryStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'critical';
  }

  private getReadinessStatus(score: number): 'high' | 'normal' | 'low' | 'very_low' {
    if (score >= 70) return 'high';
    if (score >= 50) return 'normal';
    if (score >= 30) return 'low';
    return 'very_low';
  }

  private getRecoveryRecommendation(score: number, data: any, baseline: any): string {
    if (score >= 80)
      return 'Excellent recovery - ready for challenging training or competition';
    if (score >= 60) return 'Good recovery - ready for moderate to hard training';
    if (score >= 40) return 'Fair recovery - light to moderate activity recommended';
    if (score >= 20) return 'Poor recovery - rest and recovery focus recommended';
    return 'Critical - mandatory rest day needed';
  }

  private getReadinessRecommendation(
    score: number,
    data: any,
    trainingHistory: any[],
    baseline: any
  ): string {
    if (score >= 70) return 'Perfect day for high-intensity training or competition';
    if (score >= 50) return 'Moderate intensity training appropriate';
    if (score >= 30) return 'Light training or active recovery recommended';
    return 'Rest day recommended - training will add unnecessary stress';
  }

  private calculateMovingAverage(values: number[], window: number): number[] {
    return values.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const windowValues = values.slice(start, i + 1);
      return windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
    });
  }

  private detectTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const threshold = avgFirst * 0.05; // 5% change

    if (avgSecond > avgFirst + threshold) return 'improving';
    if (avgSecond < avgFirst - threshold) return 'declining';
    return 'stable';
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + (xi - xMean) ** 2, 0);

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private detectAnomalies(values: number[]): boolean[] {
    if (values.length < 3) return values.map(() => false);

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);

    return values.map(val => Math.abs(val - mean) > 2 * stddev);
  }

  private countConsecutiveHardDays(trainingHistory: any[]): number {
    let consecutive = 0;
    for (const day of trainingHistory) {
      if (day.total_activity > 400) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default new ReadinessAnalyticsService();

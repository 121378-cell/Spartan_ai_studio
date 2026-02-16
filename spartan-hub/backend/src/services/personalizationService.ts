import Database from 'better-sqlite3';
import { logger } from '../utils/logger';
import db from '../config/database';
import { DatabaseInstance } from '../config/database';

/**
 * User Baseline Metrics
 */
export interface UserBaseline {
  userId: string;
  date: string;
  restingHeartRate: {
    value: number;
    baseline: number;
    percentileChange: number; // -10 to +20 (% above baseline)
  };
  heartRateVariability: {
    value: number;
    baseline: number;
    percentileChange: number;
  };
  sleepDuration: {
    value: number;
    baseline: number;
    deficit: number; // hours below baseline
  };
  stressLevel: {
    value: number;
    baseline: number;
    trend: 'improving' | 'stable' | 'worsening';
  };
  activityLevel: {
    value: number;
    baseline: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
}

/**
 * User Readiness Threshold
 */
export interface PersonalizedThreshold {
  userId: string;
  metric: 'recovery' | 'readiness' | 'injury_risk';
  poorThreshold: number; // Score < this = poor
  fairThreshold: number; // Score < this = fair
  goodThreshold: number; // Score < this = good
  baselineAdjustment: number; // +/- points based on individual patterns
  lastUpdated: string;
  confidenceScore: number; // 0-100, based on data volume
}

/**
 * User Response Pattern
 */
export interface ResponsePattern {
  userId: string;
  pattern: 'responder' | 'non_responder' | 'delayed_responder' | 'over_responder';
  averageRecoveryTime: number; // hours to recover from hard session
  trainingLoad: 'high_responder' | 'moderate_responder' | 'low_responder';
  stressResponse: 'stress_sensitive' | 'stress_resilient' | 'balanced';
  sleepQuality: 'sleep_dependent' | 'sleep_flexible' | 'sleep_optimized';
  confidenceScore: number; // 0-100, based on observation count
  lastUpdated: string;
  nextReviewDate: string;
}

/**
 * Personalized Recommendation Timing
 */
export interface RecommendationTiming {
  userId: string;
  recommendationType: string;
  optimalTime: 'morning' | 'afternoon' | 'evening' | 'anytime';
  frequency: number; // days between recommendations
  priority: 'high' | 'medium' | 'low';
  engagementScore: number; // 0-100, how likely user is to act
}

/**
 * Personalized Score Adjustment
 */
export interface ScoreAdjustment {
  userId: string;
  date: string;
  metric: 'recovery' | 'readiness' | 'injury_risk';
  rawScore: number;
  personalizedScore: number;
  adjustmentFactors: {
    baselineDeviation: number; // +/- points
    responsePattern: number; // +/- points
    recentTrend: number; // +/- points
    stressInteraction: number; // +/- points
  };
  confidence: number; // 0-100
}

/**
 * Personalization Service
 * Manages individual user baselines and adaptive algorithms
 */
export class PersonalizationService {
  private static instance: PersonalizationService;
  private database: DatabaseInstance;

  private constructor() {
    this.database = null;
  }

  public static getInstance(): PersonalizationService {
    if (!PersonalizationService.instance) {
      PersonalizationService.instance = new PersonalizationService();
    }
    return PersonalizationService.instance;
  }

  /**
   * Reset the service instance (primarily for testing)
   */
  public static resetInstance(): void {
    if (PersonalizationService.instance) {
      PersonalizationService.instance.database = null as any;
      PersonalizationService.instance = null as any;
    }
  }

  private getDb() {
    const { getDatabase } = require('../database/databaseManager');
    return getDatabase();
  }

  /**
   * Initialize service and create tables if needed
   */
  public async initialize(): Promise<void> {
    try {
      this.database = this.getDb();
      this.createTables();
      logger.info('Personalization service initialized', { context: 'personalization' });
    } catch (error) {
      logger.error('Error initializing personalization service', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create required database tables
   */
  private createTables(): void {
    if (typeof (this.getDb() as any)?.exec !== 'function') {
      // Graceful degradation for non-SQLite databases
      return;
    }

    const schema = `
      CREATE TABLE IF NOT EXISTS user_baselines (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        date TEXT NOT NULL,
        rhr_value REAL,
        rhr_baseline REAL,
        rhr_percentile_change REAL,
        hrv_value REAL,
        hrv_baseline REAL,
        hrv_percentile_change REAL,
        sleep_value REAL,
        sleep_baseline REAL,
        sleep_deficit REAL,
        stress_value REAL,
        stress_baseline REAL,
        stress_trend TEXT,
        activity_value REAL,
        activity_baseline REAL,
        activity_trend TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, date)
      );

      CREATE TABLE IF NOT EXISTS personalized_thresholds (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        metric TEXT NOT NULL,
        poor_threshold INTEGER,
        fair_threshold INTEGER,
        good_threshold INTEGER,
        baseline_adjustment INTEGER,
        confidence_score INTEGER,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, metric)
      );

      CREATE TABLE IF NOT EXISTS response_patterns (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        pattern TEXT NOT NULL,
        avg_recovery_time INTEGER,
        training_load TEXT,
        stress_response TEXT,
        sleep_quality TEXT,
        confidence_score INTEGER,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        next_review_date TEXT,
        PRIMARY KEY (userId)
      );

      CREATE TABLE IF NOT EXISTS recommendation_timings (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        recommendation_type TEXT NOT NULL,
        optimal_time TEXT,
        frequency INTEGER,
        priority TEXT,
        engagement_score INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, recommendation_type)
      );

      CREATE TABLE IF NOT EXISTS score_adjustments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        date TEXT NOT NULL,
        metric TEXT NOT NULL,
        raw_score REAL,
        personalized_score REAL,
        baseline_deviation REAL,
        response_pattern_adj REAL,
        recent_trend_adj REAL,
        stress_interaction_adj REAL,
        confidence_score INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, date, metric)
      );

      CREATE INDEX IF NOT EXISTS idx_user_baselines_userId ON user_baselines(userId);
      CREATE INDEX IF NOT EXISTS idx_personalized_thresholds_userId ON personalized_thresholds(userId);
      CREATE INDEX IF NOT EXISTS idx_score_adjustments_userId ON score_adjustments(userId);
    `;

    try {
      (this.getDb() as any).exec(schema);
      logger.info('Personalization tables created/verified', { context: 'personalization' });
    } catch (error) {
      logger.error('Error creating personalization tables', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Calculate 30-day user baseline
   */
  public async calculateUserBaseline(userId: string, date: string): Promise<UserBaseline> {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        logger.warn('Database not available, returning default baseline', {
          context: 'personalization',
          metadata: { userId },
        });
        return this.getDefaultBaseline(userId, date);
      }

      const stmt = (this.getDb() as any).prepare(`
        SELECT 
          AVG(rhr) as avg_rhr,
          AVG(hrv) as avg_hrv,
          AVG(sleep_duration) as avg_sleep,
          AVG(stress_level) as avg_stress,
          AVG(activity_calories) as avg_activity
        FROM daily_biometric_summaries
        WHERE user_id = ? AND date BETWEEN date(?, '-30 days') AND ?
      `);

      const row = stmt.get(userId, date, date) as any;

      const currentStats = (this.getDb() as any)
        .prepare(`
          SELECT rhr, hrv, sleep_duration, stress_level, activity_calories
          FROM daily_biometric_summaries
          WHERE user_id = ? AND date = ?
        `)
        .get(userId, date) as any;

      const baseline: UserBaseline = {
        userId,
        date,
        restingHeartRate: {
          value: currentStats?.rhr || 0,
          baseline: row?.avg_rhr || 60,
          percentileChange: row
            ? ((currentStats?.rhr || 0) - row.avg_rhr) / row.avg_rhr * 100
            : 0,
        },
        heartRateVariability: {
          value: currentStats?.hrv || 0,
          baseline: row?.avg_hrv || 50,
          percentileChange: row
            ? ((currentStats?.hrv || 0) - row.avg_hrv) / row.avg_hrv * 100
            : 0,
        },
        sleepDuration: {
          value: currentStats?.sleep_duration || 0,
          baseline: row?.avg_sleep || 7,
          deficit: Math.max(0, (row?.avg_sleep || 7) - (currentStats?.sleep_duration || 0)),
        },
        stressLevel: {
          value: currentStats?.stress_level || 50,
          baseline: row?.avg_stress || 50,
          trend: this.calculateStressTrend(userId, date),
        },
        activityLevel: {
          value: currentStats?.activity_calories || 0,
          baseline: row?.avg_activity || 2000,
          trend: this.calculateActivityTrend(userId, date),
        },
      };

      // Save baseline
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveBaseline(baseline);
      }

      return baseline;
    } catch (error) {
      logger.error('Error calculating user baseline', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
        metadata: { userId, date },
      });
      return this.getDefaultBaseline(userId, date);
    }
  }

  /**
   * Get personalized readiness threshold
   */
  public async getPersonalizedThreshold(
    userId: string,
    metric: 'recovery' | 'readiness' | 'injury_risk'
  ): Promise<PersonalizedThreshold> {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        return this.getDefaultThreshold(userId, metric);
      }

      const stmt = (this.getDb() as any).prepare(`
        SELECT * FROM personalized_thresholds
        WHERE userId = ? AND metric = ?
      `);

      const row = stmt.get(userId, metric) as any;

      if (row) {
        return {
          userId: row.userId,
          metric: row.metric,
          poorThreshold: row.poor_threshold,
          fairThreshold: row.fair_threshold,
          goodThreshold: row.good_threshold,
          baselineAdjustment: row.baseline_adjustment,
          lastUpdated: row.last_updated,
          confidenceScore: row.confidence_score,
        };
      }

      return this.getDefaultThreshold(userId, metric);
    } catch (error) {
      logger.error('Error getting personalized threshold', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
      return this.getDefaultThreshold(userId, metric);
    }
  }

  /**
   * Update personalized threshold based on user performance
   */
  public async updatePersonalizedThreshold(
    userId: string,
    metric: 'recovery' | 'readiness' | 'injury_risk',
    adjustment: number,
    confidence: number
  ): Promise<PersonalizedThreshold> {
    try {
      const baseThreshold = this.getDefaultThreshold(userId, metric);
      const updatedThreshold: PersonalizedThreshold = {
        ...baseThreshold,
        poorThreshold: Math.max(0, Math.min(100, baseThreshold.poorThreshold + adjustment)),
        fairThreshold: Math.max(0, Math.min(100, baseThreshold.fairThreshold + adjustment)),
        goodThreshold: Math.max(0, Math.min(100, baseThreshold.goodThreshold + adjustment)),
        baselineAdjustment: adjustment,
        confidenceScore: Math.min(100, confidence),
        lastUpdated: new Date().toISOString(),
      };

      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveThreshold(updatedThreshold);
      }

      logger.info('Personalized threshold updated', {
        context: 'personalization',
        metadata: { userId, metric, adjustment, confidence },
      });

      return updatedThreshold;
    } catch (error) {
      logger.error('Error updating personalized threshold', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze user response patterns
   */
  public async analyzeResponsePattern(userId: string): Promise<ResponsePattern> {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        return this.getDefaultResponsePattern(userId);
      }

      // Get last 60 days of data
      const stmt = (this.getDb() as any).prepare(`
        SELECT 
          COUNT(*) as observation_count,
          AVG(CASE WHEN hard_session THEN recovery_time ELSE NULL END) as avg_recovery,
          (SELECT COUNT(*) FROM daily_biometric_summaries d2 
           WHERE d2.user_id = d1.user_id AND d2.date BETWEEN date(d1.date, '-60 days') AND d1.date 
           AND activity_load > 300) as high_load_sessions
        FROM daily_biometric_summaries d1
        WHERE user_id = ? AND date BETWEEN date('now', '-60 days') AND 'now'
      `);

      const stats = stmt.get(userId) as any;
      const observations = stats?.observation_count || 0;
      const avgRecovery = stats?.avg_recovery || 24;
      const highLoadSessions = stats?.high_load_sessions || 0;

      // Determine pattern classification
      let pattern: 'responder' | 'non_responder' | 'delayed_responder' | 'over_responder';
      if (avgRecovery <= 24) {
        pattern = 'responder';
      } else if (avgRecovery > 48) {
        pattern = 'delayed_responder';
      } else if (observations < 5) {
        pattern = 'non_responder';
      } else {
        pattern = 'over_responder';
      }

      // Determine training load responsiveness
      let trainingLoad: 'high_responder' | 'moderate_responder' | 'low_responder';
      const loadRatio = highLoadSessions / Math.max(1, observations);
      if (loadRatio > 0.4) {
        trainingLoad = 'high_responder';
      } else if (loadRatio > 0.2) {
        trainingLoad = 'moderate_responder';
      } else {
        trainingLoad = 'low_responder';
      }

      // Analyze stress response
      const stressStmt = (this.getDb() as any).prepare(`
        SELECT 
          AVG(ABS(stress_level - (SELECT AVG(stress_level) FROM daily_biometric_summaries d2 
                                   WHERE d2.user_id = d1.user_id 
                                   AND d2.date BETWEEN date(d1.date, '-60 days') AND d1.date))) as stress_variance
        FROM daily_biometric_summaries d1
        WHERE user_id = ? AND date BETWEEN date('now', '-60 days') AND 'now'
      `);

      const stressData = stressStmt.get(userId) as any;
      let stressResponse: 'stress_sensitive' | 'stress_resilient' | 'balanced';
      if ((stressData?.stress_variance || 0) > 15) {
        stressResponse = 'stress_sensitive';
      } else if ((stressData?.stress_variance || 0) < 8) {
        stressResponse = 'stress_resilient';
      } else {
        stressResponse = 'balanced';
      }

      // Analyze sleep dependency
      const sleepStmt = (this.getDb() as any).prepare(`
        SELECT CORR(sleep_duration, recovery_score) as sleep_recovery_corr
        FROM daily_biometric_summaries
        WHERE user_id = ? AND date BETWEEN date('now', '-60 days') AND 'now'
      `);

      const sleepData = sleepStmt.get(userId) as any;
      let sleepQuality: 'sleep_dependent' | 'sleep_flexible' | 'sleep_optimized';
      const correlation = sleepData?.sleep_recovery_corr || 0;
      if (correlation > 0.6) {
        sleepQuality = 'sleep_dependent';
      } else if (correlation < 0.3) {
        sleepQuality = 'sleep_flexible';
      } else {
        sleepQuality = 'sleep_optimized';
      }

      const pattern_obj: ResponsePattern = {
        userId,
        pattern,
        averageRecoveryTime: Math.round(avgRecovery),
        trainingLoad,
        stressResponse,
        sleepQuality,
        confidenceScore: Math.min(100, observations * 2),
        lastUpdated: new Date().toISOString(),
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      // Save pattern
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveResponsePattern(pattern_obj);
      }

      return pattern_obj;
    } catch (error) {
      logger.error('Error analyzing response pattern', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
      return this.getDefaultResponsePattern(userId);
    }
  }

  /**
   * Calculate personalized recommendation timing
   */
  public async getRecommendationTiming(
    userId: string,
    recommendationType: string
  ): Promise<RecommendationTiming> {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        return this.getDefaultRecommendationTiming(userId, recommendationType);
      }

      const stmt = (this.getDb() as any).prepare(`
        SELECT * FROM recommendation_timings
        WHERE userId = ? AND recommendation_type = ?
      `);

      const row = stmt.get(userId, recommendationType) as any;

      if (row) {
        return {
          userId: row.userId,
          recommendationType: row.recommendation_type,
          optimalTime: row.optimal_time,
          frequency: row.frequency,
          priority: row.priority,
          engagementScore: row.engagement_score,
        };
      }

      return this.getDefaultRecommendationTiming(userId, recommendationType);
    } catch (error) {
      logger.error('Error getting recommendation timing', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
      return this.getDefaultRecommendationTiming(userId, recommendationType);
    }
  }

  /**
   * Update recommendation timing based on engagement
   */
  public async updateRecommendationTiming(
    userId: string,
    recommendationType: string,
    engagementScore: number
  ): Promise<RecommendationTiming> {
    try {
      const current = await this.getRecommendationTiming(userId, recommendationType);

      // Adjust frequency based on engagement
      let newFrequency = current.frequency;
      if (engagementScore >= 80) {
        newFrequency = Math.max(1, current.frequency - 1); // More frequent
      } else if (engagementScore <= 20) {
        newFrequency = Math.min(30, current.frequency + 2); // Less frequent
      }

      const updated: RecommendationTiming = {
        ...current,
        frequency: newFrequency,
        engagementScore,
      };

      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveRecommendationTiming(updated);
      }

      return updated;
    } catch (error) {
      logger.error('Error updating recommendation timing', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Apply personalization adjustments to raw scores
   */
  public async personalizeScore(
    userId: string,
    date: string,
    metric: 'recovery' | 'readiness' | 'injury_risk',
    rawScore: number
  ): Promise<ScoreAdjustment> {
    try {
      const baseline = await this.calculateUserBaseline(userId, date);
      const pattern = await this.analyzeResponsePattern(userId);

      // Calculate adjustment factors
      const baselineDeviation = this.calculateBaselineDeviation(baseline, metric);
      const responsePatternAdj = this.calculateResponsePatternAdjustment(pattern, metric);
      const recentTrendAdj = await this.calculateRecentTrendAdjustment(userId, metric);
      const stressInteractionAdj = this.calculateStressInteraction(baseline, metric);

      const personalizedScore = Math.max(
        0,
        Math.min(
          100,
          rawScore + baselineDeviation + responsePatternAdj + recentTrendAdj + stressInteractionAdj
        )
      );

      const adjustment: ScoreAdjustment = {
        userId,
        date,
        metric,
        rawScore,
        personalizedScore,
        adjustmentFactors: {
          baselineDeviation,
          responsePattern: responsePatternAdj,
          recentTrend: recentTrendAdj,
          stressInteraction: stressInteractionAdj,
        },
        confidence: Math.max(0, pattern.confidenceScore - 20),
      };

      // Save adjustment
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveScoreAdjustment(adjustment);
      }

      return adjustment;
    } catch (error) {
      logger.error('Error personalizing score', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
        metadata: { userId, metric },
      });

      // Return raw score with no adjustment
      return {
        userId,
        date,
        metric,
        rawScore,
        personalizedScore: rawScore,
        adjustmentFactors: {
          baselineDeviation: 0,
          responsePattern: 0,
          recentTrend: 0,
          stressInteraction: 0,
        },
        confidence: 0,
      };
    }
  }

  /**
   * Get user personalization profile
   */
  public async getUserProfile(userId: string): Promise<{
    baseline: UserBaseline | null;
    responsePattern: ResponsePattern | null;
    thresholds: {
      recovery: PersonalizedThreshold;
      readiness: PersonalizedThreshold;
      injuryRisk: PersonalizedThreshold;
    };
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const baseline = await this.calculateUserBaseline(userId, today);
      const pattern = await this.analyzeResponsePattern(userId);

      return {
        baseline,
        responsePattern: pattern,
        thresholds: {
          recovery: await this.getPersonalizedThreshold(userId, 'recovery'),
          readiness: await this.getPersonalizedThreshold(userId, 'readiness'),
          injuryRisk: await this.getPersonalizedThreshold(userId, 'injury_risk'),
        },
      };
    } catch (error) {
      logger.error('Error getting user profile', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============ PRIVATE HELPER METHODS ============

  private calculateStressTrend(userId: string, date: string): 'improving' | 'stable' | 'worsening' {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        return 'stable';
      }

      const stmt = (this.getDb() as any).prepare(`
        SELECT 
          AVG(CASE WHEN date BETWEEN date(?, '-7 days') AND ? THEN stress_level ELSE NULL END) as recent,
          AVG(CASE WHEN date BETWEEN date(?, '-30 days') AND date(?, '-7 days') THEN stress_level ELSE NULL END) as older
        FROM daily_biometric_summaries
        WHERE user_id = ?
      `);

      const row = stmt.get(date, date, date, date, userId) as any;
      const diff = (row?.older || 50) - (row?.recent || 50);

      return diff > 5 ? 'improving' : diff < -5 ? 'worsening' : 'stable';
    } catch {
      return 'stable';
    }
  }

  private calculateActivityTrend(userId: string, date: string): 'increasing' | 'stable' | 'decreasing' {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        return 'stable';
      }

      const stmt = (this.getDb() as any).prepare(`
        SELECT 
          AVG(CASE WHEN date BETWEEN date(?, '-7 days') AND ? THEN activity_calories ELSE NULL END) as recent,
          AVG(CASE WHEN date BETWEEN date(?, '-30 days') AND date(?, '-7 days') THEN activity_calories ELSE NULL END) as older
        FROM daily_biometric_summaries
        WHERE user_id = ?
      `);

      const row = stmt.get(date, date, date, date, userId) as any;
      const diff = ((row?.recent || 2000) - (row?.older || 2000)) / (row?.older || 2000);

      return diff > 0.1 ? 'increasing' : diff < -0.1 ? 'decreasing' : 'stable';
    } catch {
      return 'stable';
    }
  }

  private calculateBaselineDeviation(baseline: UserBaseline, metric: string): number {
    switch (metric) {
      case 'recovery':
        // Higher RHR and lower HRV = worse recovery = lower score
        const rhrDeviation = (baseline.restingHeartRate.percentileChange / 10) * -2;
        const hrvDeviation = (baseline.heartRateVariability.percentileChange / 10) * 2;
        return Math.round(rhrDeviation + hrvDeviation);

      case 'readiness':
        // Sleep deficit and stress = worse readiness
        const sleepDeviation = (baseline.sleepDuration.deficit * -5);
        return Math.round(Math.min(0, sleepDeviation)); // Only penalize

      case 'injury_risk':
        // All elevated metrics increase injury risk
        return Math.round(
          baseline.restingHeartRate.percentileChange * 0.5 +
            baseline.stressLevel.value - baseline.stressLevel.baseline
        );

      default:
        return 0;
    }
  }

  private calculateResponsePatternAdjustment(pattern: ResponsePattern, metric: string): number {
    if (pattern.confidenceScore < 30) return 0; // Not confident enough

    switch (metric) {
      case 'recovery':
        // Delayed responders need more recovery time
        return pattern.pattern === 'delayed_responder' ? -5 : pattern.pattern === 'responder' ? 5 : 0;

      case 'readiness':
        // High responders to training load need more caution
        return pattern.trainingLoad === 'high_responder' ? -5 : 0;

      case 'injury_risk':
        // Stress-sensitive individuals have higher risk
        return pattern.stressResponse === 'stress_sensitive' ? 5 : 0;

      default:
        return 0;
    }
  }

  private async calculateRecentTrendAdjustment(
    userId: string,
    metric: string
  ): Promise<number> {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        return 0;
      }

      // Get last 7 days trend
      const stmt = (this.getDb() as any).prepare(`
        SELECT 
          (SELECT AVG(recovery_score) FROM daily_biometric_summaries d2 
           WHERE d2.user_id = d1.user_id AND d2.date BETWEEN date(d1.date, '-7 days') AND d1.date) as recent_recovery,
          (SELECT AVG(recovery_score) FROM daily_biometric_summaries d2 
           WHERE d2.user_id = d1.user_id AND d2.date BETWEEN date(d1.date, '-30 days') AND date(d1.date, '-7 days')) as older_recovery
        FROM daily_biometric_summaries d1
        WHERE user_id = ? ORDER BY date DESC LIMIT 1
      `);

      const row = stmt.get(userId) as any;
      const trend = (row?.recent_recovery || 50) - (row?.older_recovery || 50);

      return Math.round(Math.max(-10, Math.min(10, trend / 5)));
    } catch {
      return 0;
    }
  }

  private calculateStressInteraction(baseline: UserBaseline, metric: string): number {
    if (metric === 'recovery') {
      // High stress reduces recovery
      return baseline.stressLevel.value > 70 ? -3 : baseline.stressLevel.value < 30 ? 2 : 0;
    }
    return 0;
  }

  private getDefaultBaseline(userId: string, date: string): UserBaseline {
    return {
      userId,
      date,
      restingHeartRate: { value: 0, baseline: 60, percentileChange: 0 },
      heartRateVariability: { value: 0, baseline: 50, percentileChange: 0 },
      sleepDuration: { value: 0, baseline: 7, deficit: 0 },
      stressLevel: { value: 50, baseline: 50, trend: 'stable' },
      activityLevel: { value: 0, baseline: 2000, trend: 'stable' },
    };
  }

  private getDefaultThreshold(
    userId: string,
    metric: 'recovery' | 'readiness' | 'injury_risk'
  ): PersonalizedThreshold {
    const thresholds: Record<string, { poor: number; fair: number; good: number }> = {
      recovery: { poor: 20, fair: 40, good: 60 },
      readiness: { poor: 20, fair: 40, good: 60 },
      injury_risk: { poor: 60, fair: 40, good: 20 },
    };

    const t = thresholds[metric] || { poor: 20, fair: 40, good: 60 };

    return {
      userId,
      metric,
      poorThreshold: t.poor,
      fairThreshold: t.fair,
      goodThreshold: t.good,
      baselineAdjustment: 0,
      lastUpdated: new Date().toISOString(),
      confidenceScore: 0,
    };
  }

  private getDefaultResponsePattern(userId: string): ResponsePattern {
    return {
      userId,
      pattern: 'non_responder',
      averageRecoveryTime: 24,
      trainingLoad: 'moderate_responder',
      stressResponse: 'balanced',
      sleepQuality: 'sleep_optimized',
      confidenceScore: 0,
      lastUpdated: new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    };
  }

  private getDefaultRecommendationTiming(userId: string, recommendationType: string): RecommendationTiming {
    return {
      userId,
      recommendationType,
      optimalTime: 'morning',
      frequency: 7,
      priority: 'medium',
      engagementScore: 50,
    };
  }

  private saveBaseline(baseline: UserBaseline): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`
        INSERT OR REPLACE INTO user_baselines 
        (id, userId, date, rhr_value, rhr_baseline, rhr_percentile_change, 
         hrv_value, hrv_baseline, hrv_percentile_change, 
         sleep_value, sleep_baseline, sleep_deficit,
         stress_value, stress_baseline, stress_trend,
         activity_value, activity_baseline, activity_trend)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `baseline_${baseline.userId}_${baseline.date}`;
      stmt.run(
        id,
        baseline.userId,
        baseline.date,
        baseline.restingHeartRate.value,
        baseline.restingHeartRate.baseline,
        baseline.restingHeartRate.percentileChange,
        baseline.heartRateVariability.value,
        baseline.heartRateVariability.baseline,
        baseline.heartRateVariability.percentileChange,
        baseline.sleepDuration.value,
        baseline.sleepDuration.baseline,
        baseline.sleepDuration.deficit,
        baseline.stressLevel.value,
        baseline.stressLevel.baseline,
        baseline.stressLevel.trend,
        baseline.activityLevel.value,
        baseline.activityLevel.baseline,
        baseline.activityLevel.trend
      );
    } catch (error) {
      logger.error('Error saving baseline', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveThreshold(threshold: PersonalizedThreshold): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`
        INSERT OR REPLACE INTO personalized_thresholds
        (id, userId, metric, poor_threshold, fair_threshold, good_threshold, baseline_adjustment, confidence_score, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `threshold_${threshold.userId}_${threshold.metric}`;
      stmt.run(
        id,
        threshold.userId,
        threshold.metric,
        threshold.poorThreshold,
        threshold.fairThreshold,
        threshold.goodThreshold,
        threshold.baselineAdjustment,
        threshold.confidenceScore,
        threshold.lastUpdated
      );
    } catch (error) {
      logger.error('Error saving threshold', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveResponsePattern(pattern: ResponsePattern): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`
        INSERT OR REPLACE INTO response_patterns
        (id, userId, pattern, avg_recovery_time, training_load, stress_response, sleep_quality, confidence_score, last_updated, next_review_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `pattern_${pattern.userId}`;
      stmt.run(
        id,
        pattern.userId,
        pattern.pattern,
        pattern.averageRecoveryTime,
        pattern.trainingLoad,
        pattern.stressResponse,
        pattern.sleepQuality,
        pattern.confidenceScore,
        pattern.lastUpdated,
        pattern.nextReviewDate
      );
    } catch (error) {
      logger.error('Error saving response pattern', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveRecommendationTiming(timing: RecommendationTiming): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`
        INSERT OR REPLACE INTO recommendation_timings
        (id, userId, recommendation_type, optimal_time, frequency, priority, engagement_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `timing_${timing.userId}_${timing.recommendationType}`;
      stmt.run(
        id,
        timing.userId,
        timing.recommendationType,
        timing.optimalTime,
        timing.frequency,
        timing.priority,
        timing.engagementScore
      );
    } catch (error) {
      logger.error('Error saving recommendation timing', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveScoreAdjustment(adjustment: ScoreAdjustment): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`
        INSERT OR REPLACE INTO score_adjustments
        (id, userId, date, metric, raw_score, personalized_score, baseline_deviation, 
         response_pattern_adj, recent_trend_adj, stress_interaction_adj, confidence_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `adjustment_${adjustment.userId}_${adjustment.date}_${adjustment.metric}`;
      stmt.run(
        id,
        adjustment.userId,
        adjustment.date,
        adjustment.metric,
        adjustment.rawScore,
        adjustment.personalizedScore,
        adjustment.adjustmentFactors.baselineDeviation,
        adjustment.adjustmentFactors.responsePattern,
        adjustment.adjustmentFactors.recentTrend,
        adjustment.adjustmentFactors.stressInteraction,
        adjustment.confidence
      );
    } catch (error) {
      logger.error('Error saving score adjustment', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Cleanup and close service
   */
  public close(): void {
    try {
      if (this.getDb()) {
        logger.info('Personalization service closed', { context: 'personalization' });
      }
    } catch (error) {
      logger.error('Error closing personalization service', {
        context: 'personalization',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function getPersonalizationService(): PersonalizationService {
  return PersonalizationService.getInstance();
}

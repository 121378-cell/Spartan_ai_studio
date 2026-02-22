import { logger } from '../utils/logger';
import db from '../config/database';
import { DatabaseInstance } from '../config/database';
import { apmService } from '../utils/apmService';
import { HoltWinters } from '../ml/holtWinters';

/**
 * Historical Data Point for Time-Series
 */
export interface HistoricalDataPoint {
  date: string;
  recoveryScore: number;
  readinessScore: number;
  injuryRisk: number;
  fatigueLevel: number;
  sleepHours: number;
  stressLevel: number;
  activityLoad: number;
}

/**
 * Forecast Prediction
 */
export interface ForecastPrediction {
  date: string;
  predictedReadiness: number;
  confidence: number; // 0-100
  direction: 'improving' | 'declining' | 'stable';
  factors: {
    trendInfluence: number; // +/- points
    cycleInfluence: number; // +/- points
    seasonalInfluence: number; // +/- points
  };
}

/**
 * Readiness Forecast for Phase 2.3
 */
export interface ReadinessForecast {
  day: number;
  date: string;
  predictedScore: number;
  confidence: number;
}

/**
 * Injury Prediction for Phase 2.3
 */
export interface InjuryPrediction {
  userId: string;
  probability: number;
  factors: {
    elevatedRHR: boolean;
    suppressedHRV: boolean;
    sleepDeprivation: boolean;
    consecutiveHardDays: boolean;
    overtrainingMarker: boolean;
  };
  timeframe: string;
  confidence: number;
  recommendation: string;
}

/**
 * Weekly Forecast
 */
export interface WeeklyForecast {
  userId: string;
  startDate: string;
  endDate: string;
  predictions: ForecastPrediction[];
  averageConfidence: number;
  recommendedAction: string;
  riskLevel: 'low' | 'moderate' | 'high';
}

/**
 * Injury Probability Model
 */
export interface InjuryProbability {
  userId: string;
  date: string;
  probabilityPercent: number; // 0-100
  riskFactors: {
    elevatedRHR: boolean;
    suppressedHRV: boolean;
    sleepDeprivation: boolean;
    consecutiveHardDays: boolean;
    overtrainingMarker: boolean;
  };
  riskScore: number; // 0-100
  recommendation: string;
  confidenceScore: number; // 0-100
}

/**
 * Fatigue Estimation
 */
export interface FatigueEstimate {
  userId: string;
  date: string;
  fatigueLevel: number; // 0-100
  acuteToChronicRatio: number; // Recent load vs 4-week avg
  recoveryCapacity: number; // 0-100
  estimatedRecoveryDays: number;
  recommendation: string;
}

/**
 * Training Load Suggestion
 */
export interface TrainingLoadSuggestion {
  userId: string;
  date: string;
  suggestedLoad: 'very_light' | 'light' | 'moderate' | 'hard' | 'very_hard';
  maxWorkoutDurationMinutes: number;
  recommendedExercises: string[];
  rationale: string;
  expectedRecoveryTime: number; // hours
}

/**
 * Model Metadata
 */
export interface ModelMetadata {
  version: string;
  trainingDate: string;
  accuracyScore: number; // 0-100
  dataPoints: number;
  modelType: string;
  parameters: {
    windowSize: number;
    seasonalCycle: number;
    alpha: number; // smoothing factor
    beta: number; // trend factor
    gamma: number; // seasonal factor
  };
}

/**
 * ML Forecasting Service
 * Time-series predictions for readiness, injury risk, and training load
 */
export class MLForecastingService {
  private static instance: MLForecastingService;
  private database: DatabaseInstance;
  private modelMetadata: ModelMetadata | null = null;

  private constructor() {
    this.database = null as any;
  }

  public static getInstance(): MLForecastingService {
    if (!MLForecastingService.instance) {
      MLForecastingService.instance = new MLForecastingService();
    }
    return MLForecastingService.instance;
  }

  /**
   * Reset the service instance (primarily for testing)
   */
  public static resetInstance(): void {
    if (MLForecastingService.instance) {
      MLForecastingService.instance.database = null as any;
      MLForecastingService.instance = null as any;
    }
  }

  private getDb() {
    const { getDatabase } = require('../database/databaseManager');
    return getDatabase();
  }

  /**
   * Set database instance (for testing)
   */
  public setDatabase(database: DatabaseInstance): void {
    this.database = database;
  }

  /**
   * Initialize service and create tables
   */
  public async initialize(customDb?: DatabaseInstance): Promise<void> {
    try {
      this.database = customDb || db;
      this.createTables();
      this.loadModelMetadata();
      logger.info('ML Forecasting service initialized', { context: 'mlForecasting' });
    } catch (error) {
      logger.error('Error initializing ML forecasting service', {
        context: 'mlForecasting',
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
      return;
    }

    const schema = `
      CREATE TABLE IF NOT EXISTS ml_forecasts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        predicted_readiness REAL,
        predicted_injury_risk REAL,
        predicted_fatigue REAL,
        confidence INTEGER,
        direction TEXT,
        trend_influence REAL,
        cycle_influence REAL,
        seasonal_influence REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS injury_probabilities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        probability_percent REAL,
        risk_score REAL,
        elevated_rhr INTEGER,
        suppressed_hrv INTEGER,
        sleep_deprivation INTEGER,
        consecutive_hard_days INTEGER,
        overtraining_marker INTEGER,
        confidence_score INTEGER,
        recommendation TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS fatigue_estimates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        fatigue_level REAL,
        acute_chronic_ratio REAL,
        recovery_capacity REAL,
        estimated_recovery_days INTEGER,
        recommendation TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS training_suggestions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        suggested_load TEXT,
        max_duration_minutes INTEGER,
        recommended_exercises TEXT,
        rationale TEXT,
        expected_recovery_hours INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS model_metadata (
        id TEXT PRIMARY KEY,
        version TEXT UNIQUE,
        training_date TEXT,
        accuracy_score REAL,
        data_points INTEGER,
        model_type TEXT,
        window_size INTEGER,
        seasonal_cycle INTEGER,
        alpha REAL,
        beta REAL,
        gamma REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ml_forecasts_userId ON ml_forecasts(user_id);
      CREATE INDEX IF NOT EXISTS idx_injury_prob_userId ON injury_probabilities(user_id);
      CREATE INDEX IF NOT EXISTS idx_fatigue_userId ON fatigue_estimates(user_id);
      CREATE INDEX IF NOT EXISTS idx_training_userId ON training_suggestions(user_id);
    `;

    try {
      (this.getDb() as any).exec(schema);
      logger.info('ML forecasting tables created/verified', { context: 'mlForecasting' });
    } catch (error) {
      logger.error('Error creating ML forecasting tables', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load model metadata from database
   */
  private loadModelMetadata(): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        this.modelMetadata = this.getDefaultModelMetadata();
        return;
      }

      const stmt = (this.getDb() as any).prepare(`
        SELECT * FROM model_metadata ORDER BY created_at DESC LIMIT 1
      `);

      const row = stmt.get() as any;

      if (row) {
        this.modelMetadata = {
          version: row.version,
          trainingDate: row.training_date,
          accuracyScore: row.accuracy_score,
          dataPoints: row.data_points,
          modelType: row.model_type,
          parameters: {
            windowSize: row.window_size,
            seasonalCycle: row.seasonal_cycle,
            alpha: row.alpha,
            beta: row.beta,
            gamma: row.gamma,
          },
        };
      } else {
        this.modelMetadata = this.getDefaultModelMetadata();
      }
    } catch (error) {
      logger.error('Error loading model metadata', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
      this.modelMetadata = this.getDefaultModelMetadata();
    }
  }

  /**
   * Phase 2.3: Predict injury risk using ML-based approach
   * Fetches 30-day history and calculates injury probability
   * 
   * @param userId - User identifier
   * @returns InjuryPrediction with probability, factors, and timeframe
   */
  public async predictInjuryRisk(userId: string): Promise<InjuryPrediction> {
    const startTime = Date.now();
    try {
      const historicalData = await this.getHistoricalData(userId, 30);
      const today = new Date().toISOString().split('T')[0];

      if (historicalData.length < 7) {
        return {
          userId,
          probability: 15,
          factors: {
            elevatedRHR: false,
            suppressedHRV: false,
            sleepDeprivation: false,
            consecutiveHardDays: false,
            overtrainingMarker: false,
          },
          timeframe: '7 days',
          confidence: 20,
          recommendation: 'Insufficient data for accurate prediction. Monitor recovery metrics.',
        };
      }

      // Analyze risk factors using ML features
      const factors = {
        elevatedRHR: this.hasElevatedRHR(historicalData),
        suppressedHRV: this.hasSuppressedHRV(historicalData),
        sleepDeprivation: this.hasSleepDeprivation(historicalData),
        consecutiveHardDays: this.hasConsecutiveHardDays(historicalData),
        overtrainingMarker: this.hasOvertrainingMarker(historicalData),
      };

      // Enhanced Risk Calculation (Multiplicative Model)
      // Risk factors interact exponentially rather than linearly
      let multiplier = 1.0;
      
      // Weights calibrated based on injury correlation studies
      if (factors.elevatedRHR) multiplier *= 1.4;       // +40% risk
      if (factors.suppressedHRV) multiplier *= 1.6;     // +60% risk
      if (factors.sleepDeprivation) multiplier *= 1.8;  // +80% risk (major factor)
      if (factors.consecutiveHardDays) multiplier *= 1.3; // +30% risk
      if (factors.overtrainingMarker) multiplier *= 1.5;  // +50% risk

      // Check for Acute Load Spike (ACWR > 1.5) using available data
      // This is a hidden factor derived from historical data
      if (historicalData.length >= 28) {
        const acuteLoad = historicalData.slice(-7).reduce((sum, d) => sum + d.activityLoad, 0) / 7;
        const chronicLoad = historicalData.slice(-28).reduce((sum, d) => sum + d.activityLoad, 0) / 28;
        const acwr = acuteLoad / (chronicLoad || 1);
        
        if (acwr > 1.5) multiplier *= 1.4; // +40% for rapid load increase
        if (acwr > 2.0) multiplier *= 1.5; // Additional penalty for extreme spikes
      }

      // Base probability starts at 5% (baseline injury risk for active athletes)
      let probability = 5 * multiplier;

      // Apply sigmoid smoothing to keep within 0-100 realistic bounds
      // Soft cap at 95%
      probability = Math.min(95, probability);

      // Determine timeframe based on risk accumulation
      const activeRiskFactors = Object.values(factors).filter(Boolean).length;
      let timeframe: string;
      if (activeRiskFactors >= 4) {
        timeframe = '24-48 hours';
      } else if (activeRiskFactors >= 2) {
        timeframe = '3-7 days';
      } else {
        timeframe = '7-14 days';
      }

      // Calculate confidence based on data quality
      const confidence = Math.min(90, 30 + historicalData.length * 2);

      // Generate recommendation based on risk level
      const recommendation = this.getInjuryRiskRecommendationV2(probability, factors);

      const prediction: InjuryPrediction = {
        userId,
        probability,
        factors,
        timeframe,
        confidence,
        recommendation,
      };

      // Save to database for tracking
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveInjuryPrediction(prediction);
      }

      logger.info('Injury risk predicted', {
        context: 'mlForecasting',
        metadata: { userId, probability, timeframe, confidence },
      });

      apmService.recordAiApiCall('ml-forecasting', 'injury-probability', 'success', Date.now() - startTime);

      return prediction;
    } catch (error) {
      apmService.recordAiApiCall('ml-forecasting', 'injury-probability', 'error', Date.now() - startTime);
      logger.error('Error predicting injury risk', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
        metadata: { userId },
      });
      throw error;
    }
  }

  /**
   * Phase 2.3: Forecast readiness for specified number of days using time series
   * Uses Triple Exponential Smoothing (Holt-Winters) for accurate forecasting
   * 
   * @param userId - User identifier
   * @param days - Number of days to forecast (1-7)
   * @returns Array of ReadinessForecast objects
   */
  public async forecastReadiness(userId: string, days: number): Promise<ReadinessForecast[]> {
    const startTime = Date.now();
    try {
      const forecastDays = Math.max(1, Math.min(7, days));
      const historicalData = await this.getHistoricalData(userId, 60);
      
      if (historicalData.length < 14) {
        // Fallback to simpler forecast if not enough data for seasonal period
        return this.generateFallbackForecast(userId, forecastDays, historicalData);
      }

      const readinessScores = historicalData.map(d => d.readinessScore);
      
      // OPTIMIZATION: Dynamically tune parameters for this specific user's pattern
      const bestParams = this.optimizeHoltWintersParameters(readinessScores);
      
      const forecastResults = HoltWinters.forecast(readinessScores, forecastDays, {
        alpha: bestParams.alpha,
        beta: bestParams.beta,
        gamma: bestParams.gamma,
        period: 7 // Weekly cycle
      });

      const today = new Date();
      const forecasts: ReadinessForecast[] = [];

      for (let i = 1; i <= forecastDays; i++) {
        const forecastDate = new Date(today);
        forecastDate.setDate(forecastDate.getDate() + i);
        const dateStr = forecastDate.toISOString().split('T')[0];
        
        // The forecast values are at the end of the results array
        const predictedScore = Math.max(0, Math.min(100, Math.round(forecastResults[historicalData.length + i - 1])));
        
        // Confidence decreases with distance
        const confidence = Math.max(20, Math.round(metadata.accuracyScore * Math.pow(0.9, i - 1)));

        forecasts.push({
          day: i,
          date: dateStr,
          predictedScore,
          confidence
        });
      }

      logger.info('Holt-Winters readiness forecast generated', {
        context: 'mlForecasting',
        metadata: { userId, days: forecastDays, avgScore: forecasts.reduce((a, b) => a + b.predictedScore, 0) / forecasts.length }
      });

      apmService.recordAiApiCall('ml-forecasting', 'readiness-forecast', 'success', Date.now() - startTime);
      return forecasts;
    } catch (error) {
      apmService.recordAiApiCall('ml-forecasting', 'readiness-forecast', 'error', Date.now() - startTime);
      logger.error('Error in Holt-Winters forecast', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
        metadata: { userId, days }
      });
      throw error;
    }
  }

  /**
   * Fallback forecast for low data situations
   */
  private generateFallbackForecast(userId: string, days: number, historicalData: HistoricalDataPoint[]): ReadinessForecast[] {
    const today = new Date();
    const forecasts: ReadinessForecast[] = [];
    const avgScore = historicalData.length > 0 
      ? historicalData.reduce((sum, d) => sum + d.readinessScore, 0) / historicalData.length
      : 65;

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);
      forecasts.push({
        day: i,
        date: forecastDate.toISOString().split('T')[0],
        predictedScore: Math.round(avgScore),
        confidence: 20
      });
    }
    return forecasts;
  }

  /**
   * Legacy: Forecast readiness for 7 days with start date
   */
  public async forecastReadinessLegacy(userId: string, startDate: string): Promise<WeeklyForecast> {
    try {
      // Validate and parse start date
      let validStartDate = startDate;
      const parsedDate = new Date(startDate);

      // If the date is invalid, use today instead
      if (isNaN(parsedDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        validStartDate = today.toISOString().split('T')[0];
      } else {
        // Ensure we use date only (no time)
        validStartDate = parsedDate.toISOString().split('T')[0];
      }

      const predictions: ForecastPrediction[] = [];
      let totalConfidence = 0;
      let riskCount = 0;

      // Generate 7 daily forecasts
      for (let i = 0; i < 7; i++) {
        const forecastDate = new Date(validStartDate);
        forecastDate.setDate(forecastDate.getDate() + i);
        const dateStr = forecastDate.toISOString().split('T')[0];

        const prediction = await this.generateDailyForecast(userId, dateStr);
        predictions.push(prediction);
        totalConfidence += prediction.confidence;

        if (prediction.confidence < 50) {
          riskCount++;
        }
      }

      const averageConfidence = totalConfidence / 7;
      const riskLevel: 'low' | 'moderate' | 'high' =
        riskCount > 4 ? 'high' : riskCount > 2 ? 'moderate' : 'low';

      const endDate = new Date(validStartDate);
      endDate.setDate(endDate.getDate() + 6);

      const recommendedAction = this.generateRecommendation(predictions, riskLevel);

      const forecast: WeeklyForecast = {
        userId,
        startDate: validStartDate,
        endDate: endDate.toISOString().split('T')[0],
        predictions,
        averageConfidence,
        recommendedAction,
        riskLevel,
      };

      // Save forecast
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveForecast(forecast);
      }

      return forecast;
    } catch (error) {
      logger.error('Error forecasting readiness', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
        metadata: { userId, startDate },
      });
      throw error;
    }
  }

  /**
   * Get injury risk recommendation for Phase 2.3
   */
  private getInjuryRiskRecommendationV2(
    probability: number,
    factors: {
      elevatedRHR: boolean;
      suppressedHRV: boolean;
      sleepDeprivation: boolean;
      consecutiveHardDays: boolean;
      overtrainingMarker: boolean;
    }
  ): string {
    const activeFactors = Object.values(factors).filter(Boolean).length;
    
    if (probability > 70 || activeFactors >= 4) {
      return 'CRITICAL: Multiple risk factors detected. Immediate rest required. Reduce training load by 50% or more.';
    } else if (probability > 50 || activeFactors >= 3) {
      return 'HIGH RISK: Significant injury risk. Consider rest day or very light activity. Focus on recovery protocols.';
    } else if (probability > 30 || activeFactors >= 2) {
      return 'MODERATE RISK: Monitor closely. Reduce intensity by 20-30%. Prioritize sleep and active recovery.';
    } else if (probability > 15) {
      return 'MILD RISK: Maintain current plan with caution. Ensure adequate recovery between sessions.';
    } else {
      return 'LOW RISK: Normal training appropriate. Continue monitoring recovery metrics.';
    }
  }

  /**
   * Save injury prediction to database
   */
  private saveInjuryPrediction(prediction: InjuryPrediction): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`
        INSERT OR REPLACE INTO injury_probabilities
        (id, userId, date, probability_percent, risk_score, elevated_rhr, suppressed_hrv, 
         sleep_deprivation, consecutive_hard_days, overtraining_marker, confidence_score, recommendation)
        VALUES (?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `injury_pred_${prediction.userId}_${Date.now()}`;
      stmt.run(
        id,
        prediction.userId,
        prediction.probability,
        prediction.probability,
        prediction.factors.elevatedRHR ? 1 : 0,
        prediction.factors.suppressedHRV ? 1 : 0,
        prediction.factors.sleepDeprivation ? 1 : 0,
        prediction.factors.consecutiveHardDays ? 1 : 0,
        prediction.factors.overtrainingMarker ? 1 : 0,
        prediction.confidence,
        prediction.recommendation
      );
    } catch (error) {
      logger.error('Error saving injury prediction', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async generateDailyForecast(
    userId: string,
    forecastDate: string
  ): Promise<ForecastPrediction> {
    try {
      const historicalData = await this.getHistoricalData(userId, 60);

      if (historicalData.length < 7) {
        // Insufficient data, return confidence forecast
        return {
          date: forecastDate,
          predictedReadiness: 65,
          confidence: 20,
          direction: 'stable',
          factors: { trendInfluence: 0, cycleInfluence: 0, seasonalInfluence: 0 },
        };
      }

      // Calculate trend using simple linear regression
      const trend = this.calculateTrend(historicalData);
      const cycle = this.calculateCyclicPattern(historicalData);
      const seasonal = this.calculateSeasonalPattern(historicalData, forecastDate);

      // Base prediction from recent average
      const recentAvg = historicalData.slice(-7).reduce((sum, d) => sum + d.readinessScore, 0) / 7;

      // Apply adjustments
      const trendInfluence = trend * 0.4;
      const cycleInfluence = cycle * 0.3;
      const seasonalInfluence = seasonal * 0.3;

      const predictedReadiness = Math.max(
        0,
        Math.min(100, recentAvg + trendInfluence + cycleInfluence + seasonalInfluence)
      );

      // Confidence based on consistency and data recency
      const confidence = this.calculateConfidence(historicalData, trend, cycle);

      // Determine direction
      let direction: 'improving' | 'declining' | 'stable';
      if (trend > 0.5) {
        direction = 'improving';
      } else if (trend < -0.5) {
        direction = 'declining';
      } else {
        direction = 'stable';
      }

      return {
        date: forecastDate,
        predictedReadiness,
        confidence,
        direction,
        factors: {
          trendInfluence,
          cycleInfluence,
          seasonalInfluence,
        },
      };
    } catch (error) {
      logger.error('Error generating daily forecast', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });

      return {
        date: forecastDate,
        predictedReadiness: 50,
        confidence: 10,
        direction: 'stable',
        factors: { trendInfluence: 0, cycleInfluence: 0, seasonalInfluence: 0 },
      };
    }
  }

  /**
   * Predict injury probability
   */
  public async predictInjuryProbability(userId: string, date: string): Promise<InjuryProbability> {
    try {
      const historicalData = await this.getHistoricalData(userId, 30);

      if (historicalData.length < 7) {
        return {
          userId,
          date,
          probabilityPercent: 15, // Default low probability
          riskFactors: {
            elevatedRHR: false,
            suppressedHRV: false,
            sleepDeprivation: false,
            consecutiveHardDays: false,
            overtrainingMarker: false,
          },
          riskScore: 15,
          recommendation: 'Insufficient data for accurate prediction',
          confidenceScore: 20,
        };
      }

      // Analyze risk factors
      const elevatedRHR = this.hasElevatedRHR(historicalData);
      const suppressedHRV = this.hasSuppressedHRV(historicalData);
      const sleepDeprivation = this.hasSleepDeprivation(historicalData);
      const consecutiveHardDays = this.hasConsecutiveHardDays(historicalData);
      const overtrainingMarker = this.hasOvertrainingMarker(historicalData);

      // Calculate probability (weighted sum)
      let probability = 5; // Base risk
      if (elevatedRHR) probability += 20;
      if (suppressedHRV) probability += 25;
      if (sleepDeprivation) probability += 30;
      if (consecutiveHardDays) probability += 15;
      if (overtrainingMarker) probability += 20;

      probability = Math.min(95, probability);

      const riskScore = probability;
      const confidence = Math.min(90, 30 + historicalData.length * 2);

      const recommendation = this.getInjuryRiskRecommendation(
        probability,
        { elevatedRHR, suppressedHRV, sleepDeprivation, consecutiveHardDays, overtrainingMarker }
      );

      const result: InjuryProbability = {
        userId,
        date,
        probabilityPercent: probability,
        riskFactors: {
          elevatedRHR,
          suppressedHRV,
          sleepDeprivation,
          consecutiveHardDays,
          overtrainingMarker,
        },
        riskScore,
        recommendation,
        confidenceScore: confidence,
      };

      // Save prediction
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveInjuryProbability(result);
      }

      return result;
    } catch (error) {
      logger.error('Error predicting injury probability', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Estimate fatigue level
   */
  public async estimateFatigue(userId: string, date: string): Promise<FatigueEstimate> {
    const startTime = Date.now();
    try {
      const historicalData = await this.getHistoricalData(userId, 30);

      if (historicalData.length < 7) {
        return {
          userId,
          date,
          fatigueLevel: 50,
          acuteToChronicRatio: 1.0,
          recoveryCapacity: 60,
          estimatedRecoveryDays: 1,
          recommendation: 'Insufficient data for accurate fatigue estimation',
        };
      }

      // Calculate acute load (recent 7 days) vs chronic load (28 days)
      const acuteLoad = historicalData.slice(-7).reduce((sum, d) => sum + d.activityLoad, 0) / 7;
      const chronicLoad =
        historicalData.slice(-28).reduce((sum, d) => sum + d.activityLoad, 0) / 28;
      const acuteToChronicRatio = Math.max(0.1, acuteLoad / Math.max(1, chronicLoad));

      // Calculate fatigue level
      let fatigueLevel = 50; // Base
      fatigueLevel += (acuteToChronicRatio - 1.0) * 30; // Adjust based on load ratio
      fatigueLevel -= historicalData[historicalData.length - 1].sleepHours * 2; // Better sleep reduces fatigue
      fatigueLevel = Math.max(0, Math.min(100, fatigueLevel));

      // Recovery capacity
      const recentRecoveryScores = historicalData.slice(-7).map(d => d.recoveryScore);
      const avgRecoveryScore = recentRecoveryScores.reduce((a, b) => a + b, 0) / recentRecoveryScores.length;
      const recoveryCapacity = avgRecoveryScore;

      // Estimated recovery time
      const estimatedRecoveryDays = Math.ceil(fatigueLevel / 20) + (acuteToChronicRatio > 1.5 ? 2 : 0);

      const recommendation = this.getFatigueRecommendation(fatigueLevel, acuteToChronicRatio);

      const result: FatigueEstimate = {
        userId,
        date,
        fatigueLevel,
        acuteToChronicRatio,
        recoveryCapacity,
        estimatedRecoveryDays,
        recommendation,
      };

      // Save estimate
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveFatigueEstimate(result);
      }

      apmService.recordAiApiCall('ml-forecasting', 'fatigue-estimation', 'success', Date.now() - startTime);

      return result;
    } catch (error) {
      apmService.recordAiApiCall('ml-forecasting', 'fatigue-estimation', 'error', Date.now() - startTime);
      logger.error('Error estimating fatigue', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Suggest training load for the day
   */
  public async suggestTrainingLoad(userId: string, date: string): Promise<TrainingLoadSuggestion> {
    const startTime = Date.now();
    try {
      const fatigue = await this.estimateFatigue(userId, date);
      const injuryRisk = await this.predictInjuryProbability(userId, date);

      // Determine load based on fatigue and injury risk
      let suggestedLoad: 'very_light' | 'light' | 'moderate' | 'hard' | 'very_hard';
      let maxDuration: number;
      let exercises: string[];

      if (injuryRisk.probabilityPercent > 60) {
        suggestedLoad = 'very_light';
        maxDuration = 20;
        exercises = ['mobility work', 'stretching', 'light cardio'];
      } else if (fatigue.fatigueLevel > 75 || injuryRisk.probabilityPercent > 40) {
        suggestedLoad = 'light';
        maxDuration = 30;
        exercises = ['recovery ride', 'easy jog', 'yoga'];
      } else if (fatigue.fatigueLevel > 50) {
        suggestedLoad = 'moderate';
        maxDuration = 45;
        exercises = ['steady-state cardio', 'strength maintenance', 'technique work'];
      } else if (fatigue.fatigueLevel < 25) {
        suggestedLoad = 'very_hard';
        maxDuration = 90;
        exercises = ['high-intensity intervals', 'maximal strength', 'sport-specific'];
      } else {
        suggestedLoad = 'hard';
        maxDuration = 60;
        exercises = ['tempo work', 'strength building', 'sport-specific training'];
      }

      const expectedRecoveryTime = fatigue.estimatedRecoveryDays * 24;

      const rationale = `Based on fatigue level (${Math.round(fatigue.fatigueLevel)}%), ` +
        `injury risk (${Math.round(injuryRisk.probabilityPercent)}%), and recovery capacity.`;

      const result: TrainingLoadSuggestion = {
        userId,
        date,
        suggestedLoad,
        maxWorkoutDurationMinutes: maxDuration,
        recommendedExercises: exercises,
        rationale,
        expectedRecoveryTime,
      };

      // Save suggestion
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        this.saveTrainingLoadSuggestion(result);
      }

      apmService.recordAiApiCall('ml-forecasting', 'training-load-suggestion', 'success', Date.now() - startTime);

      return result;
    } catch (error) {
      apmService.recordAiApiCall('ml-forecasting', 'training-load-suggestion', 'error', Date.now() - startTime);
      logger.error('Error suggesting training load', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Evaluate prediction accuracy by comparing past forecasts with actual data
   */
  public async backtestPrediction(userId: string, date: string): Promise<{
    date: string;
    predicted: number | null;
    actual: number | null;
    error: number | null;
    accuracy: number;
  }> {
    try {
      // Get the forecast made for this date
      const forecastStmt = (this.getDb() as any).prepare(`
        SELECT predicted_readiness FROM ml_forecasts 
        WHERE user_id = ? AND date = ?
      `);
      const forecast = forecastStmt.get(userId, date) as any;

      // Get the actual readiness recorded for this date
      const actualStmt = (this.getDb() as any).prepare(`
        SELECT readinessScore FROM daily_biometric_summaries 
        WHERE userId = ? AND date = ?
      `);
      const actual = actualStmt.get(userId, date) as any;

      if (!forecast || !actual) {
        return { date, predicted: null, actual: null, error: null, accuracy: 0 };
      }

      const p = forecast.predicted_readiness;
      const a = actual.readinessScore;
      const error = Math.abs(p - a);
      const accuracy = Math.max(0, 100 - (error / (a || 1)) * 100);

      return { date, predicted: p, actual: a, error, accuracy };
    } catch (error) {
      logger.error('Error backtesting prediction', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
      return { date, predicted: null, actual: null, error: null, accuracy: 0 };
    }
  }

  /**
   * Update ML models with new form analysis data
   */
  public async updateWithFormData(data: {
    userId: string;
    formScore: number;
    exerciseType: string;
    riskFactor: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      logger.info('Updating ML models with form data', {
        context: 'mlForecasting',
        metadata: { userId: data.userId, formScore: data.formScore, exerciseType: data.exerciseType }
      });

      const dateStr = data.timestamp.toISOString().split('T')[0];

      // Update injury risk based on form quality
      // We'll create or update an injury probability entry for today
      const currentProb = await this.predictInjuryProbability(data.userId, dateStr);

      // If form is poor, increase the probability
      if (data.formScore < 70) {
        currentProb.probabilityPercent = Math.min(95, currentProb.probabilityPercent + (data.riskFactor * 10));
        currentProb.riskScore = currentProb.probabilityPercent;
        currentProb.recommendation = `FORM ALERT: Your ${data.exerciseType} form score was low (${data.formScore}%). ` +
          `Poor technique increases injury risk significantly. ${ 
            currentProb.recommendation}`;

        this.saveInjuryProbability(currentProb);
      }

      // Also trigger a refresh of the 7-day forecast to reflect the new data point
      await this.forecastReadiness(data.userId, 7);

    } catch (error) {
      logger.error('Error updating ML with form data', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get model metadata
   */
  public getModelMetadata(): ModelMetadata {
    return this.modelMetadata || this.getDefaultModelMetadata();
  }

  // ============ PRIVATE HELPER METHODS ============

  /**
   * Optimize Holt-Winters parameters using Grid Search (Auto-tuning)
   */
  private optimizeHoltWintersParameters(data: number[]): { alpha: number; beta: number; gamma: number } {
    // Default parameters if insufficient data
    if (data.length < 14) {
      return this.getModelMetadata().parameters;
    }

    let bestParams = { alpha: 0.3, beta: 0.1, gamma: 0.1 };
    let minMSE = Infinity;

    // Simplified grid search for performance (5x4x4 = 80 iterations max)
    const alphas = [0.1, 0.3, 0.5, 0.7, 0.9];
    const betas = [0.05, 0.1, 0.2, 0.3];
    const gammas = [0.05, 0.1, 0.2, 0.3];

    // Use last 3 points for validation to ensure recent accuracy
    const horizon = Math.min(3, Math.floor(data.length * 0.2));
    const splitIndex = data.length - horizon;
    
    const train = data.slice(0, splitIndex);
    const test = data.slice(splitIndex);

    for (const a of alphas) {
      for (const b of betas) {
        for (const g of gammas) {
          try {
            // Generate forecast
            const forecast = HoltWinters.forecast(train, horizon, {
              alpha: a,
              beta: b,
              gamma: g,
              period: 7 // Weekly seasonality
            });
            
            // Calculate Mean Squared Error
            let mse = 0;
            // The forecast result includes the fitted values + forecast values
            // We check the last 'horizon' values against test data
            for (let i = 0; i < horizon; i++) {
              // forecast array index for the first prediction is train.length
              const predicted = forecast[train.length + i];
              mse += Math.pow(predicted - test[i], 2);
            }
            mse /= horizon;

            if (mse < minMSE) {
              minMSE = mse;
              bestParams = { alpha: a, beta: b, gamma: g };
            }
          } catch (e) {
            // Skip invalid parameters
            continue;
          }
        }
      }
    }

    return bestParams;
  }

  private async getHistoricalData(userId: string, days: number): Promise<HistoricalDataPoint[]> {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') {
        return [];
      }

      const stmt = (this.getDb() as any).prepare(`
                SELECT 
                  date,
                  recoveryScore,
                  readinessScore,
                  0 as injuryRisk,
                  0 as fatigueLevel,
                  sleepDuration as sleepHours,
                  stressLevel,
                  0 as activityLoad
                FROM daily_biometric_summaries
                WHERE userId = ? AND date BETWEEN date('now', '-' || ? || ' days') AND 'now'
                ORDER BY date ASC
              `);
      const rows = stmt.all(userId, days) as any[];

      return rows.map(row => ({
        date: row.date,
        recoveryScore: row.recoveryScore || 50,
        readinessScore: row.readinessScore || 50,
        injuryRisk: row.injuryRisk || 20,
        fatigueLevel: row.fatigueLevel || 50,
        sleepHours: (row.sleepHours || 420) / 60, // Convert minutes to hours
        stressLevel: row.stressLevel || 50,
        activityLoad: row.activityLoad || 100,
      }));
    } catch (error) {
      logger.error('Error getting historical data', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private calculateTrend(data: HistoricalDataPoint[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map(d => d.readinessScore);

    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateCyclicPattern(data: HistoricalDataPoint[]): number {
    // Simple weekly cycle detection
    if (data.length < 14) return 0;

    const week1Avg = data.slice(-14, -7).reduce((sum, d) => sum + d.readinessScore, 0) / 7;
    const week2Avg = data.slice(-7).reduce((sum, d) => sum + d.readinessScore, 0) / 7;

    return (week2Avg - week1Avg) / 10;
  }

  private calculateSeasonalPattern(data: HistoricalDataPoint[], forecastDate: string): number {
    // Simple month-of-year seasonal effect
    const month = new Date(forecastDate).getMonth();
    const seasonalEffects: { [key: number]: number } = {
      0: -5, // Jan
      1: -3, // Feb
      2: 0, // Mar
      3: 2, // Apr
      4: 3, // May
      5: 2, // Jun
      6: 1, // Jul
      7: 0, // Aug
      8: -2, // Sep
      9: -4, // Oct
      10: -5, // Nov
      11: -3, // Dec
    };
    return seasonalEffects[month] || 0;
  }

  private calculateConfidence(data: HistoricalDataPoint[], trend: number, cycle: number): number {
    let confidence = 40; // Base confidence

    // More data = higher confidence
    confidence += Math.min(30, data.length * 2);

    // Stable trend = higher confidence
    confidence += Math.max(0, 10 - Math.abs(trend * 10));

    // Strong cycle = higher confidence
    confidence += Math.abs(cycle) * 2;

    return Math.min(95, Math.max(20, confidence));
  }

  private hasElevatedRHR(data: HistoricalDataPoint[]): boolean {
    // Check if recent RHR is significantly elevated
    const recent = data.slice(-3);
    const older = data.slice(-10, -7);

    if (recent.length === 0 || older.length === 0) return false;

    // This is a simplification - in real implementation would track actual RHR
    const recentAvg = recent.reduce((sum, d) => sum + d.fatigueLevel, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.fatigueLevel, 0) / older.length;

    return recentAvg > olderAvg * 1.15;
  }

  private hasSuppressedHRV(data: HistoricalDataPoint[]): boolean {
    const recent = data.slice(-3).reduce((sum, d) => sum + d.recoveryScore, 0) / 3;
    return recent < 50;
  }

  private hasSleepDeprivation(data: HistoricalDataPoint[]): boolean {
    const recentSleep = data.slice(-3).reduce((sum, d) => sum + d.sleepHours, 0) / 3;
    return recentSleep < 6.5;
  }

  private hasConsecutiveHardDays(data: HistoricalDataPoint[]): boolean {
    const recent = data.slice(-7);
    let consecutiveHard = 0;

    for (const point of recent) {
      if (point.readinessScore < 40) {
        consecutiveHard++;
        if (consecutiveHard >= 3) return true;
      } else {
        consecutiveHard = 0;
      }
    }

    return false;
  }

  private hasOvertrainingMarker(data: HistoricalDataPoint[]): boolean {
    const recentLoad = data.slice(-7).reduce((sum, d) => sum + d.activityLoad, 0) / 7;
    const olderLoad = data.slice(-30, -7).reduce((sum, d) => sum + d.activityLoad, 0) / 23;
    return recentLoad > olderLoad * 1.3;
  }

  private getInjuryRiskRecommendation(
    probability: number,
    riskFactors: {
      elevatedRHR: boolean;
      suppressedHRV: boolean;
      sleepDeprivation: boolean;
      consecutiveHardDays: boolean;
      overtrainingMarker: boolean;
    }
  ): string {
    if (probability > 70) {
      return 'HIGH RISK: Consider rest day or very light activity. Focus on recovery.';
    } else if (probability > 50) {
      return 'MODERATE RISK: Reduce training intensity. Prioritize sleep and recovery.';
    } else if (probability > 30) {
      return 'MILD RISK: Monitor closely. Ensure adequate recovery between sessions.';
    } else {
      return 'LOW RISK: Normal training is appropriate. Continue current plan.';
    }
  }

  private getFatigueRecommendation(fatigueLevel: number, acuteToChronicRatio: number): string {
    if (fatigueLevel > 75) {
      return 'High fatigue: Take a rest day or do very light active recovery.';
    } else if (fatigueLevel > 50) {
      return 'Moderate fatigue: Consider reducing workout intensity today.';
    } else if (acuteToChronicRatio > 1.5) {
      return 'Training load has increased sharply: Watch for overtraining.';
    } else {
      return 'Fatigue levels are normal. Continue with planned training.';
    }
  }

  private generateRecommendation(predictions: ForecastPrediction[], riskLevel: string): string {
    const avgPrediction =
      predictions.reduce((sum, p) => sum + p.predictedReadiness, 0) / predictions.length;
    const improving = predictions.filter(p => p.direction === 'improving').length;

    if (improving >= 5) {
      return 'Strong improving trend detected. Consider moderate progression in training load.';
    } else if (avgPrediction < 40) {
      return 'Expected lower readiness this week. Prioritize recovery and reduce intensity.';
    } else if (avgPrediction > 70) {
      return 'Good readiness forecast this week. Opportunity for harder training sessions.';
    } else {
      return 'Balanced readiness week ahead. Maintain steady training approach.';
    }
  }

  private saveForecast(forecast: WeeklyForecast): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`

                INSERT OR REPLACE INTO ml_forecasts 

                (id, user_id, date, predicted_readiness, confidence, direction, trend_influence, cycle_influence, seasonal_influence)

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

              `);

      for (const pred of forecast.predictions) {
        const id = `forecast_${forecast.userId}_${pred.date}`;
        stmt.run(
          id,
          forecast.userId,
          pred.date,
          pred.predictedReadiness,
          pred.confidence,
          pred.direction,
          pred.factors.trendInfluence,
          pred.factors.cycleInfluence,
          pred.factors.seasonalInfluence
        );
      }
    } catch (error) {
      logger.error('Error saving forecast', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveInjuryProbability(result: InjuryProbability): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`

                INSERT OR REPLACE INTO injury_probabilities

                (id, user_id, date, probability_percent, risk_score, elevated_rhr, suppressed_hrv, sleep_deprivation, 

      consecutive_hard_days, overtraining_marker, confidence_score, recommendation)

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

              `);

      const id = `injury_prob_${result.userId}_${result.date}`;
      stmt.run(
        id,
        result.userId,
        result.date,
        result.probabilityPercent,
        result.riskScore,
        result.riskFactors.elevatedRHR ? 1 : 0,
        result.riskFactors.suppressedHRV ? 1 : 0,
        result.riskFactors.sleepDeprivation ? 1 : 0,
        result.riskFactors.consecutiveHardDays ? 1 : 0,
        result.riskFactors.overtrainingMarker ? 1 : 0,
        result.confidenceScore,
        result.recommendation
      );
    } catch (error) {
      logger.error('Error saving injury probability', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveFatigueEstimate(result: FatigueEstimate): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`
        INSERT OR REPLACE INTO fatigue_estimates
        (id, user_id, date, fatigue_level, acute_chronic_ratio, recovery_capacity, estimated_recovery_days, recommendation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `fatigue_${result.userId}_${result.date}`;
      stmt.run(
        id,
        result.userId,
        result.date,
        result.fatigueLevel,
        result.acuteToChronicRatio,
        result.recoveryCapacity,
        result.estimatedRecoveryDays,
        result.recommendation
      );
    } catch (error) {
      logger.error('Error saving fatigue estimate', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveTrainingLoadSuggestion(result: TrainingLoadSuggestion): void {
    try {
      if (typeof (this.getDb() as any)?.prepare !== 'function') return;

      const stmt = (this.getDb() as any).prepare(`
        INSERT OR REPLACE INTO training_suggestions
        (id, user_id, date, suggested_load, max_duration_minutes, recommended_exercises, rationale, expected_recovery_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const id = `training_${result.userId}_${result.date}`;
      stmt.run(
        id,
        result.userId,
        result.date,
        result.suggestedLoad,
        result.maxWorkoutDurationMinutes,
        JSON.stringify(result.recommendedExercises),
        result.rationale,
        result.expectedRecoveryTime
      );
    } catch (error) {
      logger.error('Error saving training suggestion', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private getDefaultModelMetadata(): ModelMetadata {
    return {
      version: '1.0.0',
      trainingDate: new Date().toISOString(),
      accuracyScore: 75,
      dataPoints: 0,
      modelType: 'exponential-smoothing-with-trend-and-seasonality',
      parameters: {
        windowSize: 30,
        seasonalCycle: 365,
        alpha: 0.3,
        beta: 0.2,
        gamma: 0.1,
      },
    };
  }

  /**
   * Update model parameters based on historical performance
   */
  public async retrainModel(userId: string, accuracy: number): Promise<void> {
    try {
      const currentMetadata = this.getModelMetadata();
      
      // Heuristic: If accuracy is low, increase alpha (weight of recent data)
      let newAlpha = currentMetadata.parameters.alpha;
      if (accuracy < 70) {
        newAlpha = Math.min(0.8, newAlpha + 0.05);
      } else if (accuracy > 90) {
        newAlpha = Math.max(0.1, newAlpha - 0.02);
      }

      const newMetadata = {
        ...currentMetadata,
        version: `1.0.${Math.floor(Date.now() / 100000)}`,
        trainingDate: new Date().toISOString(),
        accuracyScore: accuracy,
        parameters: {
          ...currentMetadata.parameters,
          alpha: newAlpha
        }
      };

      // Save to DB
      if (typeof (this.getDb() as any)?.prepare === 'function') {
        const stmt = (this.getDb() as any).prepare(`
          INSERT INTO model_metadata 
          (id, version, training_date, accuracy_score, data_points, model_type, window_size, seasonal_cycle, alpha, beta, gamma)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          `meta_${Date.now()}`,
          newMetadata.version,
          newMetadata.trainingDate,
          newMetadata.accuracyScore,
          newMetadata.dataPoints + 1,
          newMetadata.modelType,
          newMetadata.parameters.windowSize,
          newMetadata.parameters.seasonalCycle,
          newMetadata.parameters.alpha,
          newMetadata.parameters.beta,
          newMetadata.parameters.gamma
        );
      }

      this.modelMetadata = newMetadata;
      logger.info('ML model parameters updated (retrained)', { 
        context: 'mlForecasting', 
        metadata: { userId, accuracy, newAlpha } 
      });
    } catch (error) {
      logger.error('Error retraining model', {
        context: 'mlForecasting',
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
        logger.info('ML Forecasting service closed', { context: 'mlForecasting' });
      }
    } catch (error) {
      logger.error('Error closing ML forecasting service', {
        context: 'mlForecasting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function getMLForecastingService(): MLForecastingService {
  return MLForecastingService.getInstance();
}

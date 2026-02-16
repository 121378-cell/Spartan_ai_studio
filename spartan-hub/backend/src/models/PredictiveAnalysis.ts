/**
 * Predictive Analysis Models
 * 
 * Data structures for trend analysis, fatigue prediction, and historical comparisons
 */

/**
 * Recovery Trend Data Point
 */
export interface RecoveryTrendPoint {
  date: string; // ISO date
  score: number; // 0-100
  components: {
    hrv: number;
    rhr: number;
    sleepQuality: number;
    stressLevel: number;
  };
  isOutlier?: boolean; // Detected anomaly
}

/**
 * Trend Analysis for a Time Period
 */
export interface TrendAnalysis {
  period: '7d' | '30d' | '90d' | 'custom';
  startDate: string;
  endDate: string;
  dataPoints: RecoveryTrendPoint[];
  
  // Statistical measures
  statistics: {
    mean: number; // Average recovery score
    median: number;
    stdDev: number; // Standard deviation
    min: number;
    max: number;
    trend: 'improving' | 'declining' | 'stable'; // Direction
    trendStrength: number; // 0-100 (higher = more significant)
  };
  
  // Component trends
  componentTrends: {
    hrv: TrendMetric;
    rhr: TrendMetric;
    sleepQuality: TrendMetric;
    stressLevel: TrendMetric;
  };
  
  // Insights
  insights: string[];
  recommendations: string[];
}

/**
 * Individual Component Trend
 */
export interface TrendMetric {
  mean: number;
  trend: 'improving' | 'declining' | 'stable';
  changePercent: number; // % change from start to end
  volatility: number; // How much it varies (0-100)
}

/**
 * Fatigue Prediction Model
 */
export interface FatiguePrediction {
  date: string;
  
  // Prediction
  fatigueRisk: number; // 0-100 (higher = more fatigue risk)
  fatigueLevel: 'low' | 'moderate' | 'high' | 'critical';
  
  // Confidence score
  confidence: number; // 0-100
  
  // Risk factors
  riskFactors: {
    lowHRV: boolean;
    elevatedRHR: boolean;
    poorSleep: boolean;
    highStress: boolean;
    overtraining: boolean;
    consecutiveBadDays: number; // Count of consecutive poor recovery days
  };
  
  // Predictions for next days
  nextDaysPrediction: {
    date: string;
    predictedFatigueLevel: 'low' | 'moderate' | 'high' | 'critical';
  }[];
  
  // Recommendations
  recommendations: string[];
  
  // Warning flags
  overtrainingWarning?: string;
  injuryRisk?: string;
}

/**
 * Historical Comparison Data
 */
export interface HistoricalComparison {
  currentPeriod: {
    start: string;
    end: string;
    averageRecovery: number;
    averageHRV: number;
    averageRHR: number;
    averageSleepDuration: number;
    averageSleepQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  
  previousPeriod: {
    start: string;
    end: string;
    averageRecovery: number;
    averageHRV: number;
    averageRHR: number;
    averageSleepDuration: number;
    averageSleepQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  
  // Deltas
  changes: {
    recoveryDelta: number; // Current vs Previous
    hrvDelta: number;
    rhrDelta: number;
    sleepDurationDelta: number;
  };
  
  // Assessment
  assessment: 'improving' | 'declining' | 'stable';
  improvementPercent?: number; // % improvement
}

/**
 * Overtraining Detection
 */
export interface OvertainingDetection {
  isOvertrained: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  
  // Indicators
  indicators: {
    consecutiveHighStress: number; // days
    consecutiveLowRecovery: number; // days
    hrv_declining: boolean;
    rhr_elevated: boolean;
    sleep_disrupted: boolean;
    mood_declining?: boolean;
  };
  
  // Severity score
  severityScore: number; // 0-100
  
  // Recommendations
  recommendations: string[];
  
  // Suggested actions
  suggestedActions: {
    recommendedAction: 'continue' | 'deload' | 'rest' | 'medical-consultation';
    deloadDuration?: number; // days
    justification: string;
  };
}

/**
 * Weekly Summary for Trend Analysis
 */
export interface WeeklySummary {
  week: number; // 1-52
  year: number; // 2024, 2025, etc
  startDate: string;
  endDate: string;
  
  // Metrics
  metrics: {
    averageRecovery: number;
    averageHRV: number;
    averageRHR: number;
    totalSleepMinutes: number;
    workoutDays: number;
    restDays: number;
    stressLevel: 'low' | 'moderate' | 'high';
  };
  
  // Performance
  performance: {
    bestDay: string; // Date of highest recovery
    worstDay: string; // Date of lowest recovery
    consistency: number; // 0-100 (how consistent was the week)
  };
  
  // Notes
  notes?: string;
}

/**
 * Anomaly Detection
 */
export interface AnomalyDetection {
  date: string;
  anomalies: {
    metric: 'hrv' | 'rhr' | 'sleep' | 'recovery';
    value: number;
    expected: number;
    deviation: number; // Standard deviations from mean
    severity: 'minor' | 'moderate' | 'severe';
    possibleCause?: string;
  }[];
  
  // Overall assessment
  hasAnomalies: boolean;
  anomalyCount: number;
}

/**
 * Predictive Analytics Summary
 */
export interface PredictiveAnalyticsSummary {
  userId: string;
  generatedAt: Date;
  
  // Core predictions
  trends: TrendAnalysis;
  fatigueRisk: FatiguePrediction;
  overtrainingDetection: OvertainingDetection;
  historicalComparison: HistoricalComparison;
  
  // Overall assessment
  overallHealthAssessment: {
    score: number; // 0-100
    status: 'excellent' | 'good' | 'fair' | 'concerning';
    keyInsights: string[];
    actionItems: string[];
  };
}

/**
 * Training Load vs Recovery Balance
 */
export interface TrainingLoadBalance {
  date: string;
  
  // Training metrics (from wearable or manual input)
  trainingLoad: {
    intensity: number; // 0-100
    duration: number; // minutes
    volume: number; // arbitrary units
    type: 'strength' | 'cardio' | 'flexibility' | 'mixed' | 'rest';
  };
  
  // Recovery metrics (from biometric data)
  recoveryScore: number;
  hrvRecovery: boolean; // Is HRV adequate for training load?
  sleepQuality: number;
  
  // Balance assessment
  balance: {
    ratio: number; // training load / recovery capacity
    isBalanced: boolean; // ratio should be 0.8-1.2 for optimal balance
    recommendation: string; // What to do
  };
}

/**
 * Periodization Suggestion (Training Cycles)
 */
export interface PeriodizationSuggestion {
  currentPhase: 'accumulation' | 'intensification' | 'realization' | 'recovery';
  
  // Phase metrics
  phaseMetrics: {
    durationDays: number;
    trainingVolume: 'low' | 'moderate' | 'high';
    trainingIntensity: 'low' | 'moderate' | 'high';
    expectedRecovery: 'good' | 'challenging' | 'difficult';
  };
  
  // Recommendations for next phase
  nextPhaseRecommendation: {
    phase: 'accumulation' | 'intensification' | 'realization' | 'recovery';
    durationDays: number;
    reasoning: string;
  };
  
  // Deload week suggestions
  deloadSuggestions: {
    isDeloadNeeded: boolean;
    recommendedTiming: string; // e.g., "in 2 weeks" or "immediately"
    deloadDuration: number; // days
    expectedBenefit: string;
  };
}

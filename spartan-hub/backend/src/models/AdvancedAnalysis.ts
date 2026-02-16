/**
 * Advanced Analysis Models
 * 
 * Data structures for injury prediction, training recommendations,
 * and advanced performance analytics
 */

/**
 * Injury Risk Assessment
 */
export interface InjuryRiskAssessment {
  date: string;
  
  // Overall injury risk
  injuryRisk: number; // 0-100
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number; // 0-100 (based on data quality)
  
  // Risk by body area
  areaRisks: {
    lowerBody: number; // Legs, knees, ankles
    upperBody: number; // Shoulders, arms, elbows
    core: number; // Back, abs, hips
    cardiovascular: number; // Heart, lungs
  };
  
  // Risk factors detected
  riskFactors: {
    highTrainingLoad: boolean;
    inadequateRecovery: boolean;
    muscleImbalance: boolean; // Inferred from HRV asymmetry
    overusePattern: boolean; // Consecutive high-intensity days
    inflammationMarkers: boolean; // HRV < baseline
    sleepDeprivation: boolean;
    rapidIntensityIncrease: boolean;
  };
  
  // Injury types at risk
  injuryTypes: {
    type: 'muscle-strain' | 'joint-stress' | 'overuse' | 'stress-fracture' | 'tendinitis';
    probability: number; // 0-100
    affectedAreas: string[];
    timeline: 'immediate' | 'short-term' | 'long-term'; // days to weeks
  }[];
  
  // Recommendations to prevent injury
  preventionRecommendations: string[];
  
  // When to seek medical attention
  medicalAlertThreshold?: string;
}

/**
 * Training Load Analysis
 */
export interface TrainingLoadAnalysis {
  date: string;
  
  // Weekly metrics
  weeklyLoad: {
    totalVolume: number; // Training units (arbitrary)
    totalIntensity: number; // 0-100 average
    peakLoad: number; // Highest single day
    averageLoad: number; // Daily average
    loadVariability: number; // Consistency (0-100)
  };
  
  // Training distribution
  distribution: {
    strength: number; // % of week
    cardio: number;
    flexibility: number;
    rest: number;
    intensity: 'low' | 'moderate' | 'high' | 'mixed';
  };
  
  // Acute-to-chronic ratio (Acute Load / 4-week avg)
  acuteToChronic: {
    ratio: number; // Recommended: 0.8-1.3
    status: 'undertraining' | 'optimal' | 'overtraining';
    trend: number; // Change from last week
  };
  
  // Load progression
  progression: {
    weekOverWeek: number; // % change
    monthOverMonth: number; // % change
    recommendation: 'increase' | 'maintain' | 'decrease';
    safeIncreasePercent: number; // Max safe weekly increase
  };
}

/**
 * Personalized Training Recommendation
 */
export interface TrainingRecommendation {
  date: string;
  
  // Overall recommendation
  recommendedFocus: 'strength' | 'endurance' | 'power' | 'recovery' | 'technique';
  
  // Detailed suggestions
  suggestions: {
    priority: number; // 1 = highest priority
    category: 'intensity' | 'volume' | 'frequency' | 'modality' | 'recovery';
    suggestion: string;
    rationale: string;
    expectedBenefit: string;
    estimatedTimeToResult: string; // e.g., "2-3 weeks"
  }[];
  
  // Weekly training plan
  weeklyPlan: {
    dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    recommendedActivity: 'strength' | 'cardio' | 'flexibility' | 'rest' | 'mixed';
    intensity: 'low' | 'moderate' | 'high' | 'variable';
    duration: number; // minutes
    notes: string;
  }[];
  
  // Performance targets
  targets: {
    metric: 'strength' | 'endurance' | 'power' | 'speed' | 'recovery';
    current: number;
    target: number;
    timeline: string; // e.g., "8 weeks"
    progressionPath: string[];
  }[];
  
  // Nutrition recommendations
  nutritionGuidance: {
    macroRatios: {
      protein: number; // % of calories
      carbs: number;
      fats: number;
    };
    timing: string; // Pre/post workout
    supplementation?: string[];
  };
}

/**
 * Periodization Plan
 */
export interface PeriodizationPlan {
  startDate: string;
  endDate: string;
  totalWeeks: number;
  
  // Overall periodization
  macrocycle: {
    phase: 'accumulation' | 'intensification' | 'realization' | 'recovery';
    objective: string;
    expectedOutcome: string;
  };
  
  // Detailed phases
  phases: {
    name: string; // e.g., "Hypertrophy Phase"
    weekStart: number;
    weekEnd: number;
    focusAreas: string[];
    volumeProgression: 'low' | 'moderate' | 'high' | 'peak';
    intensityProgression: 'low' | 'moderate' | 'high' | 'peak';
    keyElements: {
      exercise: string;
      sets: number;
      reps: number;
      intensity: string; // % of 1RM or RPE
      rest: string; // seconds/minutes
    }[];
    deloadWeek?: number; // Week number for deload
  }[];
  
  // Milestone milestones
  milestones: {
    week: number;
    focus: string;
    expectedImprovement: string;
    assessmentMetric: string;
  }[];
  
  // Competition timeline (if applicable)
  competitions?: {
    date: string;
    event: string;
    peakWeek: number; // Week to peak for this event
  }[];
}

/**
 * Movement Quality Assessment
 */
export interface MovementQualityAssessment {
  date: string;
  
  // Movement patterns evaluated
  patterns: {
    pattern: 'squat' | 'hinge' | 'push' | 'pull' | 'carry' | 'rotation' | 'gait';
    qualityScore: number; // 0-100
    asymmetry: number; // Left vs right difference (0-100)
    limitations: string[];
    compensationPatterns: string[];
    riskAreas: string[];
  }[];
  
  // Flexibility assessment
  flexibility: {
    area: 'hip' | 'shoulder' | 'ankle' | 'thoracic' | 'lumbar';
    range: number; // degrees or ROM rating
    status: 'restricted' | 'normal' | 'excessive';
    limitingFactories: string[];
  }[];
  
  // Strength imbalances
  strengthImbalances: {
    type: 'unilateral' | 'opposite-muscle-groups' | 'upper-lower';
    leftVsRight?: number; // % difference
    muscleGroupImbalance?: string; // e.g., "quads > hamstrings"
    severity: 'minor' | 'moderate' | 'major';
    correctionExercises: string[];
  }[];
  
  // Overall assessment
  qualityScore: number; // 0-100
  mainConcerns: string[];
  prioritizedCorrections: string[];
  estimatedCorrectionTimeline: string;
}

/**
 * Performance Potential Forecast
 */
export interface PerformanceForecast {
  date: string;
  evaluationPeriod: number; // weeks ahead
  
  // Baseline metrics
  currentBaseline: {
    metric: string;
    currentValue: number;
    unit: string;
  }[];
  
  // Projections
  projections: {
    timeframe: string; // e.g., "4 weeks", "8 weeks", "12 weeks"
    estimatedImprovement: {
      metric: string;
      projectedValue: number;
      improvementPercent: number;
      confidence: number; // 0-100
    }[];
    assumptions: string[];
    riskFactors: string[];
  }[];
  
  // Plateau analysis
  plateauRisk: {
    hasPlateauRisk: boolean;
    expectedPlateauWeek?: number;
    breakthroughStrategy?: string[];
    alternativeApproaches?: string[];
  };
  
  // Optimal training for goals
  optimalPath: {
    recommendedFocus: string;
    trainingModalities: string[];
    frequencyRecommendation: string;
    expectedTimelineToGoal: string;
  };
}

/**
 * Recovery Protocols
 */
export interface RecoveryProtocol {
  date: string;
  recoveryNeeded: 'light' | 'moderate' | 'intensive' | 'emergency';
  
  // Modalities recommended
  modalities: {
    name: 'sleep' | 'nutrition' | 'stretching' | 'massage' | 'contrast-therapy' | 'compression' | 'active-recovery' | 'meditation';
    frequency: string; // per day/week
    duration: number; // minutes
    intensity: 'low' | 'moderate' | 'high';
    priority: number; // 1 = highest
    expectedBenefit: string;
    instructions: string[];
  }[];
  
  // Timeline
  timeline: {
    hoursUntilFull: number;
    milestoneDays: {
      day: number;
      recoveryPercent: number;
      status: string;
    }[];
  };
  
  // Monitoring
  monitoringMetrics: {
    metric: string;
    threshold: number;
    checkFrequency: string;
    action: string; // What to do if threshold exceeded
  }[];
}

/**
 * Advanced Performance Dashboard
 */
export interface AdvancedPerformanceDashboard {
  userId: string;
  generatedAt: Date;
  
  // Current status
  currentStatus: {
    injuryRisk: InjuryRiskAssessment;
    trainingLoad: TrainingLoadAnalysis;
    movementQuality: MovementQualityAssessment;
  };
  
  // Recommendations
  recommendations: {
    training: TrainingRecommendation;
    recovery: RecoveryProtocol;
    periodization?: PeriodizationPlan;
  };
  
  // Projections
  forecasts: {
    performance: PerformanceForecast;
  };
  
  // Summary
  summary: {
    overallReadiness: number; // 0-100
    trainingStatus: 'ready' | 'caution' | 'stop';
    keyWarnings: string[];
    topPriorities: string[];
    expectedOutcome: string;
  };
}

/**
 * Correlation Analysis (Training Load vs Recovery)
 */
export interface LoadRecoveryCorrelation {
  period: string;
  
  // Metrics correlation
  correlations: {
    metric: string;
    trainingLoadCorrelation: number; // -1 to 1
    recoveryCorrelation: number; // -1 to 1
    strength: 'weak' | 'moderate' | 'strong' | 'very-strong';
    interpretation: string;
  }[];
  
  // Optimal balance
  optimalRatio: {
    trainingToRecovery: number; // Ideal ratio
    currentRatio: number;
    assessment: 'suboptimal' | 'optimal' | 'excessive-recovery';
    adjustment: string;
  };
  
  // Pattern identification
  patterns: {
    pattern: string;
    frequency: number; // How often observed
    impact: string;
    actionableInsight: string;
  }[];
}

/**
 * Adaptive Training Adjustment
 */
export interface AdaptiveTrainingAdjustment {
  date: string;
  triggerMetric: string; // What triggered the adjustment
  triggerValue: number;
  
  // Adjustment recommendation
  adjustment: {
    parameter: 'volume' | 'intensity' | 'frequency' | 'exercise-selection' | 'technique';
    currentValue: string;
    recommendedValue: string;
    magnitude: number; // % change
    direction: 'increase' | 'decrease' | 'modify';
  }[];
  
  // Rationale
  rationale: string;
  expectedOutcome: string;
  
  // Alternative options
  alternatives: {
    option: string;
    pros: string[];
    cons: string[];
    recommendation: string;
  }[];
  
  // Implementation timeline
  timeline: {
    startDate: string;
    duration: string; // "1 week", "2-3 weeks", etc
    reassessmentDate: string;
  };
}

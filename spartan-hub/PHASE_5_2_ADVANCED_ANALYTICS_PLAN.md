# Phase 5.2: Advanced Analytics (Readiness & Recovery Scores)

**Phase**: 5.2  
**Status**: PLANNING  
**Start Date**: January 25, 2026  
**Estimated Duration**: 4-6 hours  

---

## Overview

Implement comprehensive readiness and recovery scoring algorithms that analyze aggregated biometric data from Garmin, Google Fit, HealthConnect, and manual entries to provide actionable coaching insights.

---

## Goals

1. ✅ **Recovery Score Algorithm**: Calculate recovery readiness based on sleep quality, HRV, resting heart rate, and stress
2. ✅ **Readiness to Train Score**: Assess current training capacity vs baseline
3. ✅ **Performance Trend Analysis**: Identify trends in aerobic capacity, strength, and endurance
4. ✅ **Personalized Recommendations**: Generate data-driven coaching recommendations
5. ✅ **Injury Risk Assessment**: Detect anomalies that indicate high injury risk
6. ✅ **ML-Ready Data Pipeline**: Prepare data for future ML models

---

## Architecture

### Core Components

```
ReadinessAnalyticsService (NEW)
├── Recovery Score Calculator
│   ├── Sleep Quality Component (25%)
│   ├── HRV Component (25%)
│   ├── Resting Heart Rate Component (20%)
│   └── Stress Component (30%)
├── Readiness Score Calculator
│   ├── Baseline Comparison (40%)
│   ├── Fatigue Assessment (30%)
│   └── Motivation Index (30%)
├── Trend Analyzer
│   ├── 7-day rolling average
│   ├── 30-day trend detection
│   └── Anomaly identification
└── Recommendation Engine
    ├── Recovery recommendations
    ├── Training adjustments
    └── Injury prevention alerts
```

### Data Flow

```
biometric_data_points (from Garmin, Manual, etc)
    ↓
DailyBiometricSummary (aggregation)
    ↓
ReadinessAnalyticsService
    ├─→ calculateRecoveryScore()
    ├─→ calculateReadinessScore()
    ├─→ analyzeTrends()
    └─→ generateRecommendations()
    ↓
daily_biometric_summaries (with scores)
    ↓
AnalyticsController (expose via API)
    ↓
Frontend Dashboard (display insights)
```

---

## Detailed Algorithm Specifications

### 1. Recovery Score Algorithm

**Purpose**: Measure daily recovery readiness (0-100)

**Components**:

#### A. Sleep Quality (Weight: 25%)
```
sleep_quality_component = (
  (sleep_efficiency / 100) × 40 +     // Sleep efficiency (85-100% = good)
  (deep_sleep_ratio / 100) × 30 +     // Deep sleep percentage (15-20% = good)
  (sleep_duration_score) × 30          // Duration score (6-9 hours = 100)
)

where:
  sleep_efficiency = (actual_sleep_time / time_in_bed) × 100
  deep_sleep_ratio = (deep_sleep_minutes / total_sleep_minutes) × 100
  sleep_duration_score = {
    < 4 hours: 0
    4-6 hours: 50
    6-8 hours: 100
    8-9 hours: 100
    9-10 hours: 80
    > 10 hours: 50
  }
```

#### B. HRV Component (Weight: 25%)
```
hrv_component = (
  (current_hrv / baseline_hrv) × 50 +  // Ratio to baseline
  (hrv_trend_score) × 50                // Recent trend
)

where:
  baseline_hrv = average of last 30 days
  hrv_trend_score = {
    increasing trend: 100
    stable: 75
    slightly decreasing: 50
    significantly decreasing: 25
  }

Conditions:
  - Low HRV (< baseline × 0.8) = stress/fatigue warning
  - High HRV (> baseline × 1.2) = excellent recovery
  - Very high HRV = over-training possible
```

#### C. Resting Heart Rate (Weight: 20%)
```
rhr_component = {
  if rhr < baseline - 5: 100  // Excellent recovery
  if rhr < baseline: 90       // Good recovery
  if rhr ≈ baseline: 70       // Normal
  if rhr > baseline + 5: 40   // Poor recovery
  if rhr > baseline + 10: 10  // Critical fatigue
}

where:
  baseline_rhr = average of last 30 days
```

#### D. Stress Level (Weight: 30%)
```
stress_component = {
  if stress_level ≤ 35: 100    // Low stress
  if stress_level ≤ 50: 80     // Moderate
  if stress_level ≤ 65: 50     // Elevated
  if stress_level ≤ 80: 25     // High
  if stress_level > 80: 10     // Very high
}

where:
  stress_level = device stress metric (0-100)
  alternative = heart_rate_variability based estimation
```

#### Final Recovery Score
```
recovery_score = min(100, max(0,
  (sleep_quality_component × 0.25) +
  (hrv_component × 0.25) +
  (rhr_component × 0.20) +
  (stress_component × 0.30)
))

recovery_status = {
  80-100: "Excellent" → Ready for hard training
  60-79:  "Good"      → Ready for moderate training
  40-59:  "Fair"      → Light to moderate activity
  20-39:  "Poor"      → Rest recommended
  0-19:   "Critical"  → Mandatory rest day
}
```

---

### 2. Readiness to Train Score Algorithm

**Purpose**: Assess current training capacity vs baseline (0-100)

**Components**:

#### A. Baseline Comparison (Weight: 40%)
```
baseline_component = (
  (current_avg_hr / baseline_avg_hr) × 40 +    // HR efficiency
  (current_aerobic_capacity / baseline_capacity) × 40 +
  (current_power_output / baseline_power) × 20  // Strength/power
)

where:
  current_avg_hr = average of last 3 training sessions
  baseline_avg_hr = average of all historical sessions
  
Interpretation:
  - Lower HR for same intensity = improved fitness
  - Higher HR for same intensity = fatigue
```

#### B. Fatigue Index (Weight: 30%)
```
fatigue_component = 100 - (
  (accumulated_training_load / optimal_training_load) × 50 +
  (consecutive_hard_days / recommended_max_days) × 50
)

where:
  accumulated_training_load = sum of intensity × duration for last 7 days
  optimal_training_load = personalized threshold (e.g., 600 pts/week)
  consecutive_hard_days = days with intensity > 75%
  recommended_max_days = 3-4 days before mandatory rest
```

#### C. Motivation Index (Weight: 30%)
```
motivation_component = (
  (activity_consistency) × 40 +    // Regular exerciser?
  (recovery_compliance) × 30 +     // Following rest days?
  (nutrition_consistency) × 30      // Good habits?
)

where:
  activity_consistency = (days_with_activity / total_days) × 100
  recovery_compliance = (actual_rest_days / recommended_rest_days) × 100
  nutrition_consistency = estimated from biometric stability
```

#### Final Readiness Score
```
readiness_score = min(100, max(0,
  (baseline_component × 0.40) +
  (fatigue_component × 0.30) +
  (motivation_component × 0.30)
))

readiness_status = {
  70-100: "High"    → Push hard, competition ready
  50-69:  "Normal"  → Standard training
  30-49:  "Low"     → Easy days, recovery focus
  0-29:   "Very Low" → Rest needed
}
```

---

### 3. Trend Analysis Algorithm

**Purpose**: Identify patterns and predict trajectory

#### A. 7-Day Moving Average
```typescript
const moving_avg_7d = (metric: number[]): number[] => {
  return metric.map((_, i) => {
    const start = Math.max(0, i - 6);
    const window = metric.slice(start, i + 1);
    return window.reduce((a, b) => a + b) / window.length;
  });
};
```

#### B. 30-Day Trend Detection
```typescript
const trend_slope = (metric: number[]): 'improving' | 'declining' | 'stable' => {
  const last_30 = metric.slice(-30);
  const first_half = last_30.slice(0, 15);
  const second_half = last_30.slice(15);
  
  const avg_first = first_half.reduce((a,b) => a+b) / first_half.length;
  const avg_second = second_half.reduce((a,b) => a+b) / second_half.length;
  
  const difference = avg_second - avg_first;
  const threshold = avg_first * 0.05; // 5% change
  
  if (difference > threshold) return 'improving';
  if (difference < -threshold) return 'declining';
  return 'stable';
};
```

#### C. Anomaly Detection
```typescript
const detect_anomalies = (metric: number[]): boolean[] => {
  const mean = metric.reduce((a,b) => a+b) / metric.length;
  const stddev = Math.sqrt(
    metric.reduce((sum, val) => sum + (val - mean) ** 2, 0) / metric.length
  );
  
  // Anomaly = > 2 std devs from mean
  return metric.map(val => Math.abs(val - mean) > 2 * stddev);
};
```

---

### 4. Recommendation Engine

**Purpose**: Generate actionable coaching recommendations

#### A. Recovery Recommendations
```typescript
const recovery_recommendations = (recovery_score: number, data: BiometricData) => {
  const recommendations = [];
  
  if (recovery_score < 40) {
    recommendations.push("Take a rest day - your body needs recovery");
  }
  
  if (data.sleep < 6 || data.sleep > 10) {
    recommendations.push("Aim for 7-9 hours of sleep");
  }
  
  if (data.stress > 70) {
    recommendations.push("Stress levels high - consider meditation or yoga");
  }
  
  if (data.hrv < data.baseline_hrv * 0.8) {
    recommendations.push("HRV is suppressed - you're accumulating fatigue");
  }
  
  if (data.rhr > data.baseline_rhr + 10) {
    recommendations.push("Resting heart rate elevated - reduce training intensity");
  }
  
  return recommendations;
};
```

#### B. Training Adjustments
```typescript
const training_recommendations = (readiness: number, data: BiometricData) => {
  const recommendations = [];
  
  if (readiness > 70) {
    recommendations.push("You're well-recovered - perfect day for high-intensity training");
  } else if (readiness > 50) {
    recommendations.push("Moderate intensity training is appropriate");
  } else if (readiness > 30) {
    recommendations.push("Consider light training or active recovery");
  } else {
    recommendations.push("Rest day recommended - training will add stress");
  }
  
  // Training load management
  const 7day_load = calculateWeeklyTrainingLoad(data.activities);
  if (7day_load > data.optimal_load) {
    recommendations.push("Weekly training load is high - reduce frequency or intensity");
  }
  
  return recommendations;
};
```

#### C. Injury Prevention Alerts
```typescript
const injury_risk_assessment = (data: BiometricData): AlertLevel => {
  let risk_score = 0;
  
  // Rapid HR increase risk
  if (data.rhr > data.baseline_rhr + 15) risk_score += 30;
  
  // Overtraining risk
  if (data.hrv < data.baseline_hrv * 0.7) risk_score += 25;
  
  // Accumulated fatigue
  if (data.consecutive_hard_days > 4) risk_score += 25;
  
  // Sleep deprivation
  if (data.sleep < 6) risk_score += 20;
  
  return {
    risk_level: risk_score > 60 ? 'HIGH' : risk_score > 40 ? 'MODERATE' : 'LOW',
    recommendation: risk_score > 60 ? 'Reduce training immediately' : 'Monitor closely',
    metrics: {
      elevated_rhr: data.rhr > data.baseline_rhr + 15,
      suppressed_hrv: data.hrv < data.baseline_hrv * 0.7,
      overtraining: data.consecutive_hard_days > 4,
      sleep_deprivation: data.sleep < 6
    }
  };
};
```

---

## Implementation Plan

### Phase 5.2.1: Core Analytics Service

**Files to Create**:
1. `readinessAnalyticsService.ts` (500+ lines)
   - Recovery score calculator
   - Readiness score calculator
   - Trend analysis
   - Recommendation engine

2. `readinessAnalyticsService.test.ts` (400+ lines)
   - Unit tests for all algorithms
   - Edge case handling
   - Integration with HealthConnect

**Key Methods**:
```typescript
class ReadinessAnalyticsService {
  // Recovery
  calculateRecoveryScore(userId: string, date: string): Promise<number>;
  
  // Readiness
  calculateReadinessScore(userId: string, date: string): Promise<number>;
  
  // Trends
  analyzeTrends(userId: string, days: number): Promise<TrendAnalysis>;
  
  // Recommendations
  generateRecommendations(userId: string, date: string): Promise<Recommendation[]>;
  
  // Assessment
  assessInjuryRisk(userId: string, date: string): Promise<InjuryRiskAssessment>;
}
```

---

### Phase 5.2.2: API Routes & Controllers

**Files to Create**:
1. `analyticsController.ts` (300+ lines)
   - Expose readiness/recovery scores
   - Serve trend data
   - Return recommendations

2. `analyticsRoutes.ts` (200+ lines)
   - GET /api/analytics/readiness/:userId
   - GET /api/analytics/recovery/:userId
   - GET /api/analytics/trends/:userId
   - GET /api/analytics/recommendations/:userId
   - GET /api/analytics/injury-risk/:userId

**Endpoints**:
```typescript
GET /api/analytics/readiness/:userId
  Query: ?startDate=2026-01-20&endDate=2026-01-25
  Response: { date, score, status, trend }

GET /api/analytics/recovery/:userId
  Query: ?date=2026-01-25
  Response: { score, status, components: { sleep, hrv, rhr, stress } }

GET /api/analytics/trends/:userId
  Query: ?days=30&metrics=hrv,rhr,sleep
  Response: { trend, direction, slope, anomalies }

GET /api/analytics/recommendations/:userId
  Query: ?date=2026-01-25
  Response: { recovery_recs, training_recs, injury_alerts }

GET /api/analytics/injury-risk/:userId
  Query: ?date=2026-01-25
  Response: { risk_level, score, metrics }
```

---

### Phase 5.2.3: Data Model Updates

**Update**: `biometric.ts`
```typescript
// Add to DailyBiometricSummary
export interface DailyBiometricSummary {
  // ... existing fields ...
  
  analytics?: {
    recoveryScore: number;
    readinessScore: number;
    trainingLoad: number;
    injuryRisk: 'low' | 'moderate' | 'high';
    recommendations: Recommendation[];
    trends: TrendAnalysis;
  };
}

// New types
export interface RecoveryComponent {
  sleep: number;      // 0-100
  hrv: number;        // 0-100
  rhr: number;        // 0-100
  stress: number;     // 0-100
  overallScore: number; // 0-100
}

export interface Recommendation {
  type: 'recovery' | 'training' | 'injury_prevention';
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionItems?: string[];
}

export interface TrendAnalysis {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  slope: number;
  averageValue: number;
  anomalies: number[];
}

export interface InjuryRiskAssessment {
  riskLevel: 'low' | 'moderate' | 'high';
  score: number; // 0-100
  factors: {
    elevatedRhr: boolean;
    suppressedHrv: boolean;
    overtrained: boolean;
    sleepDeprived: boolean;
  };
  recommendation: string;
}
```

---

### Phase 5.2.4: Database Schema Extension

**Update**: Add to `daily_biometric_summaries` table
```sql
ALTER TABLE daily_biometric_summaries ADD COLUMN (
  recoveryScore REAL,
  recoveryStatus TEXT CHECK(recoveryStatus IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  readinessScore REAL,
  readinessStatus TEXT CHECK(readinessStatus IN ('high', 'normal', 'low')),
  trainingLoad REAL,
  injuryRisk TEXT CHECK(injuryRisk IN ('low', 'moderate', 'high')),
  trendDirection TEXT CHECK(trendDirection IN ('improving', 'declining', 'stable')),
  recommendations TEXT -- JSON array
);

-- Add indexes for fast queries
CREATE INDEX idx_analytics_user_date ON daily_biometric_summaries(userId, date DESC);
CREATE INDEX idx_analytics_recovery_score ON daily_biometric_summaries(userId, recoveryScore DESC);
```

---

### Phase 5.2.5: Testing Strategy

**Test Coverage**: 50+ tests
```
RecoveryScore Algorithm:
  - Sleep quality calculation (4 tests)
  - HRV component calculation (4 tests)
  - RHR component calculation (4 tests)
  - Stress component calculation (3 tests)
  - Edge cases (< 1 day data, > 90 days, etc) (3 tests)

ReadinessScore Algorithm:
  - Baseline comparison (4 tests)
  - Fatigue index (4 tests)
  - Motivation index (3 tests)
  - Trend weighting (3 tests)

Trend Analysis:
  - 7-day moving average (2 tests)
  - 30-day trend detection (3 tests)
  - Anomaly detection (3 tests)

Recommendations:
  - Recovery recommendations (3 tests)
  - Training recommendations (3 tests)
  - Injury risk assessment (3 tests)
  - Edge cases (3 tests)

Integration:
  - Full flow with real data (5 tests)
  - API endpoints (4 tests)
```

---

## Resource Requirements

### Development Time
- Service Implementation: 2 hours
- Test Writing: 1.5 hours
- Routes/Controllers: 1 hour
- Documentation: 0.5 hours
- **Total**: 5 hours (conservative)

### Code Changes
- New Service: 500+ lines
- Tests: 400+ lines
- Routes/Controllers: 500+ lines
- Type Updates: 150+ lines
- **Total**: 1550+ lines

### Dependencies
- No new dependencies needed
- Uses existing libraries (better-sqlite3, TypeScript)

---

## Success Criteria

✅ **All Tests Passing**: 50+ tests with >95% pass rate  
✅ **API Endpoints Working**: All 5 endpoints return correct data  
✅ **Data Integrity**: Scores are consistent and reproducible  
✅ **Performance**: Queries execute in <500ms  
✅ **Documentation**: Complete algorithm documentation  

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Algorithm inaccuracy | Validate against industry standards (Oura, HRV4Training) |
| Floating point precision | Use consistent rounding (0.01 precision) |
| Missing baseline data | Default to safe conservative scores |
| Performance issues | Add indexes, cache results daily |
| User confusion | Include explanation in API response |

---

## Timeline

```
Hour 1: Algorithm implementation (recovery + readiness)
Hour 2: Trend analysis + recommendations
Hour 3: Routes/Controllers + type updates
Hour 4: Comprehensive testing
Hour 5: Documentation + commit
```

---

## Next Steps (Post Phase 5.2)

### Phase 5.3: ML-Based Predictions
- Predict future readiness (7-day forecast)
- Personalize thresholds per athlete
- Injury prediction models

### Phase 5.4: Advanced Features
- Periodization analysis
- Peak performance windows
- Comparative analytics (vs other users)

### Phase 5.5: Mobile Integration
- Push notifications for injury alerts
- Weekly readiness reports
- Personalized training plans

---

## References

### Scientific Basis
- **Recovery Score**: Based on HRV4Training, Oura Ring methodology
- **Readiness Model**: Inspired by Whoop, Garmin Body Battery
- **Trend Analysis**: Standard moving average + anomaly detection
- **Injury Risk**: Correlation studies from sports science research

### Tools & Standards
- HRV: RMSSD, SDNN, LF/HF ratio (IEEE standard)
- Sleep: AASM sleep staging standards
- Activity: VO2 max estimation (Karvonen formula)
- Training Load: TRIMP (Edwards), TSS (Coggan)

---

*Plan Created: January 25, 2026*  
*Status: READY FOR IMPLEMENTATION*  
*Estimated Completion: 5 hours from start*

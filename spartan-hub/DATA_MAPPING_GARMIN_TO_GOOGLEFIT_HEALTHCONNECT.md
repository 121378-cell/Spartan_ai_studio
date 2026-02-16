# Garmin to Google Fit / HealthConnect Data Mapping

## Overview

This document specifies how biometric data exported from Garmin Connect is transformed and correctly received by Google Fit and HealthConnect services in Spartan Hub.

---

## Data Flow Architecture

```
Garmin Connect API
        ↓
[GarminHealthService]
        ↓
Standardized BiometricDataPoint
        ↓
    ┌───┴───┐
    ↓       ↓
Google Fit  HealthConnect
```

---

## Heart Rate Data Mapping

### Garmin Source Format

```typescript
interface GarminHeartRateData {
  calendarDate: string;              // "2026-01-25"
  maxHeartRate?: number;              // 165 bpm
  minHeartRate?: number;              // 48 bpm
  restingHeartRate?: number;          // 62 bpm
  lastNightFiveMinuteValues?: Array<{
    timestamp: number;                 // Unix seconds
    value: number;                     // bpm
  }>;
  lastNightAverage?: number;           // bpm
}
```

### Standardized Format (BiometricDataPoint)

```typescript
interface HeartRateDataPoint extends BiometricDataPoint {
  dataType: BiometricDataType.HEART_RATE;
  value: number;                       // bpm (72)
  unit: string;                        // "bpm"
  device: string;                      // "garmin"
  source: string;                      // "garmin" or "garmin_manual"
  confidence: number;                  // 1.0 (API) or 0.8 (manual)
  timestamp: number;                   // milliseconds
}
```

### Multiple Data Points Generated

```typescript
// From one Garmin data structure, create multiple standardized points:

1. HEART_RATE (current/average)
   dataType: BiometricDataType.HEART_RATE
   value: 72 (from lastNightFiveMinuteValues[0])
   confidence: 1.0

2. HEART_RATE_MAX
   dataType: BiometricDataType.HEART_RATE_MAX
   value: 165
   confidence: 1.0

3. HEART_RATE_MIN
   dataType: BiometricDataType.HEART_RATE_MIN
   value: 48
   confidence: 1.0

4. RHR (Resting Heart Rate)
   dataType: BiometricDataType.RHR
   value: 62
   confidence: 1.0
```

### Google Fit Integration

```typescript
// Google Fit receives standardized data as:

fitness.users.dataset.aggregate({
  userId: 'me',
  requestBody: {
    aggregateBy: [{
      dataTypeName: 'com.google.heart_rate.bpm',
      dataSourceId: 'derived:com.google.heart_rate.bpm:garmin'
    }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: timestamp,
    endTimeMillis: timestamp + 86400000
  }
});
```

### HealthConnect Integration

```typescript
// HealthConnect Hub stores standardized data:

INSERT INTO biometric_data_points (
  userId, timestamp, dataType, value, unit, device, source, confidence
) VALUES (
  'user123',
  1706172000000,
  'heart_rate',
  72,
  'bpm',
  'garmin',
  'garmin',
  1.0
);
```

---

## Sleep Data Mapping

### Garmin Source Format

```typescript
interface GarminSleepData {
  calendarDate: string;                // "2026-01-25"
  startTimeInSeconds: number;          // 1706155200
  endTimeInSeconds: number;            // 1706185200
  duration: number;                    // 30000 (seconds)
  sleepQuality?: 'POOR'|'FAIR'|'GOOD'|'EXCELLENT';
  deepSleepDuration?: number;          // seconds
  lightSleepDuration?: number;         // seconds
  remSleepDuration?: number;           // seconds
  awakeDuration?: number;              // seconds
}
```

### Standardized Format

```typescript
interface SleepDataPoint extends BiometricDataPoint {
  dataType: BiometricDataType.SLEEP_DURATION;
  value: number;                       // 8 (hours)
  unit: string;                        // "hours"
  timestamp: number;                   // startTimeInSeconds * 1000
  confidence: number;                  // Quality-based (0.25-1.0)
  rawData?: {
    stages?: {
      deep: number;
      light: number;
      rem: number;
      awake: number;
    };
    quality?: string;
  };
}
```

### Confidence Scoring for Sleep

```typescript
const qualityConfidence: Record<string, number> = {
  'POOR': 0.25,
  'FAIR': 0.5,
  'GOOD': 0.75,
  'EXCELLENT': 1.0
};

// Sleep with "EXCELLENT" quality → confidence: 1.0
// Sleep with "FAIR" quality → confidence: 0.5
```

### Sleep Data Validation

```typescript
// Duration calculation
durationHours = (endTimeInSeconds - startTimeInSeconds) / 3600;

// Sleep stages validation
totalSleep = deep + light + rem + awake;
expect(totalSleep).toEqual(duration); // Must be consistent

// Time ordering
expect(endTimeInSeconds).toBeGreaterThan(startTimeInSeconds);
```

---

## Activity Data Mapping

### Garmin Source Format

```typescript
interface GarminActivityData {
  activityId: number;
  activityName: string;                // "Running"
  startTimeInSeconds: number;          // 1706172000
  duration: number;                    // 3600 (seconds)
  calories: number;                    // 500
  distance?: number;                   // 5000 (meters)
  steps?: number;                      // 5500
  avgHeartRate?: number;               // 140 bpm
  maxHeartRate?: number;               // 160 bpm
  activityType: string;                // "RUNNING"
}
```

### Multiple Data Points Generated

```typescript
// From one Garmin activity, create multiple points:

1. ACTIVITY (primary)
   dataType: BiometricDataType.ACTIVITY
   value: 3600 (duration in seconds)
   unit: 'seconds'
   confidence: 0.9

2. CALORIES
   dataType: BiometricDataType.CALORIES
   value: 500
   unit: 'kcal'
   confidence: 0.9

3. ACTIVITY (distance metric)
   dataType: BiometricDataType.ACTIVITY
   value: 5000
   unit: 'meters'
   confidence: 0.9
   rawData: { metric: 'distance' }

4. HEART_RATE_AVG
   dataType: BiometricDataType.HEART_RATE_AVG
   value: 140
   unit: 'bpm'
   confidence: 0.9

5. HEART_RATE_MAX
   dataType: BiometricDataType.HEART_RATE_MAX
   value: 160
   unit: 'bpm'
   confidence: 0.9
```

### Activity Type Mapping

```typescript
enum ActivityType {
  WALKING = 'walking',
  RUNNING = 'running',
  CYCLING = 'cycling',
  SWIMMING = 'swimming',
  ELLIPTICAL = 'elliptical',
  ROWING = 'rowing',
  HIKING = 'hiking',
  STRENGTH = 'strength',
  YOGA = 'yoga',
  PILATES = 'pilates',
  STRETCHING = 'stretching',
  SPORTS = 'sports',
  OTHER = 'other'
}

// Garmin "RUNNING" → ActivityType.RUNNING
// Garmin "CYCLING" → ActivityType.CYCLING
```

---

## Stress Data Mapping

### Garmin Source Format

```typescript
interface GarminStressData {
  calendarDate: string;                // "2026-01-25"
  dayAverage?: number;                 // 45 (0-100)
  maxStress?: number;                  // 75
  minStress?: number;                  // 20
  stressValues?: Array<{
    timestamp: number;
    value: number;
  }>;
}
```

### Standardized Format

```typescript
interface StressDataPoint extends BiometricDataPoint {
  dataType: BiometricDataType.STRESS_LEVEL;
  value: number;                       // 45 (0-100)
  unit: string;                        // "index"
  confidence: number;                  // 0.85
  rawData?: {
    min?: number;                       // 20
    max?: number;                       // 75
  };
}
```

### Stress Range Validation

```typescript
// Valid range: 0-100
expect(value).toBeGreaterThanOrEqual(0);
expect(value).toBeLessThanOrEqual(100);

// Consistency check
expect(minStress).toBeLessThanOrEqual(dayAverage);
expect(dayAverage).toBeLessThanOrEqual(maxStress);
```

---

## Weight Data Mapping

### Garmin Source Format

```typescript
interface GarminWeightData {
  timestamp: number;                   // Unix seconds
  weight: number;                      // 75 kg
  bmi?: number;                        // 25.5
  bodyFatPercentage?: number;          // 18
}
```

### Standardized Format

```typescript
interface WeightDataPoint extends BiometricDataPoint {
  dataType: BiometricDataType.WEIGHT;
  value: number;                       // 75
  unit: string;                        // "kg"
  confidence: number;                  // 0.95
  rawData?: {
    bmi?: number;
    bodyFatPercentage?: number;
  };
}
```

### Weight Range Validation

```typescript
// Valid range: 20-300 kg
expect(weight).toBeGreaterThanOrEqual(20);
expect(weight).toBeLessThanOrEqual(300);
```

---

## Blood Pressure Data Mapping

### Standardized Format

```typescript
interface BloodPressureDataPoint extends BiometricDataPoint {
  dataType: BiometricDataType.BLOOD_PRESSURE;
  value: number;                       // Systolic (e.g., 120)
  unit: string;                        // "mmHg"
  confidence: number;                  // 0.9
  rawData?: {
    systolic: number;                  // 120 mmHg
    diastolic: number;                 // 80 mmHg
  };
}
```

### Blood Pressure Validation

```typescript
// Systolic range: 70-200 mmHg
expect(systolic).toBeGreaterThanOrEqual(70);
expect(systolic).toBeLessThanOrEqual(200);

// Diastolic range: 40-130 mmHg
expect(diastolic).toBeGreaterThanOrEqual(40);
expect(diastolic).toBeLessThanOrEqual(130);

// Systolic must be greater than diastolic
expect(systolic).toBeGreaterThan(diastolic);
```

---

## Timestamp Conversion

### Garmin to Standard Format

```typescript
// Garmin uses Unix seconds
garminTimestamp: 1706172000  // seconds

// Standard format uses milliseconds
standardTimestamp: 1706172000 * 1000 = 1706172000000  // milliseconds

// Conversion function
function garminToStandardTimestamp(seconds: number): number {
  return seconds * 1000;
}
```

### Date String Handling

```typescript
// Garmin date string
garminDate: "2026-01-25"

// Convert to timestamp
const date = new Date(garminDate);
const timestamp = date.getTime();  // milliseconds since epoch

// Convert back
new Date(timestamp).toISOString().split('T')[0];  // "2026-01-25"
```

---

## Source Tracking

### API Data vs Manual Entry

```typescript
// Data from Garmin API
{
  source: 'garmin',
  confidence: 1.0
}

// Manual data entry
{
  source: 'garmin_manual',
  confidence: 0.8
}

// Data can be filtered by source
WHERE source = 'garmin'         // Only API data
WHERE source = 'garmin_manual'  // Only manual entries
```

---

## Validation Rules

### Universal Rules

1. **All timestamps must be positive**
   ```typescript
   expect(timestamp).toBeGreaterThan(0);
   ```

2. **All numeric values must match their unit**
   ```typescript
   // Heart rate in bpm
   expect(value).toBeGreaterThanOrEqual(0);
   expect(value).toBeLessThanOrEqual(250);
   ```

3. **Required fields must be present**
   ```typescript
   const required = ['userId', 'timestamp', 'dataType', 'value', 'unit', 'device', 'source'];
   ```

4. **Data type must be from BiometricDataType enum**
   ```typescript
   const validTypes = Object.values(BiometricDataType);
   expect(validTypes).toContain(dataType);
   ```

### Data-Specific Rules

#### Heart Rate
- Range: 0-250 bpm
- MaxHR ≥ AvgHR ≥ MinHR ≥ RestingHR

#### Sleep
- Duration: 1-14 hours
- endTime > startTime
- Sleep stages sum ≤ total duration

#### Activity
- Duration > 0
- Distance > 0 (if present)
- avgHeartRate ≤ maxHeartRate

#### Stress
- Range: 0-100
- minStress ≤ dayAverage ≤ maxStress

#### Weight
- Range: 20-300 kg

#### Blood Pressure
- Systolic: 70-200 mmHg
- Diastolic: 40-130 mmHg
- Systolic > Diastolic

---

## Error Handling

### Data Validation Errors

```typescript
// Heart rate out of range
Error: "Heart rate must be between 0 and 250 bpm"

// Sleep inconsistency
Error: "End time must be after start time"

// Activity missing name
Error: "Activity name is required"

// Stress out of range
Error: "Stress level must be between 0 and 100"

// Blood pressure invalid
Error: "Systolic pressure must be greater than diastolic"
```

### Recovery Strategy

1. **Skip invalid records** - Log warning, continue processing
2. **Partial data** - Accept if core fields valid
3. **Type mismatch** - Convert if possible, else reject
4. **Timestamp issues** - Use server time as fallback

---

## Testing Checklist

- [ ] All Garmin data types transform correctly
- [ ] Timestamps convert from seconds to milliseconds
- [ ] All required fields present in standardized format
- [ ] Data types use correct BiometricDataType enum values
- [ ] Confidence scoring applied correctly
- [ ] Source field set to "garmin" for API data
- [ ] Manual entries use source "garmin_manual"
- [ ] Validation ranges enforced for all numeric values
- [ ] Consistency checks pass (e.g., min ≤ avg ≤ max)
- [ ] Multiple data points generated from single Garmin entry
- [ ] Error messages are descriptive
- [ ] Database stores all transformed data correctly
- [ ] Google Fit receives data via standardized format
- [ ] HealthConnect Hub retrieves data correctly

---

## Database Schema

```sql
CREATE TABLE biometric_data_points (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  timestamp INTEGER NOT NULL,           -- milliseconds
  dataType TEXT NOT NULL,               -- BiometricDataType enum value
  value REAL NOT NULL,                  -- numeric value
  unit TEXT NOT NULL,                   -- unit string ("bpm", "kg", etc)
  device TEXT NOT NULL,                 -- "garmin"
  source TEXT NOT NULL,                 -- "garmin" or "garmin_manual"
  confidence REAL,                      -- 0-1 scale
  rawData TEXT,                         -- JSON metadata
  createdAt INTEGER DEFAULT (...),
  FOREIGN KEY(userId) REFERENCES users(id),
  INDEX idx_biometric_user_timestamp (userId, timestamp DESC),
  INDEX idx_biometric_user_type (userId, dataType)
);
```

---

## Performance Considerations

### Bulk Operations

```typescript
// Insert multiple data points efficiently
const stmt = db.prepare(`
  INSERT INTO biometric_data_points (...) VALUES (...)
`);

const transaction = db.transaction(() => {
  for (const point of dataPoints) {
    stmt.run(...);
  }
});

transaction();  // Atomic insert
```

### Query Optimization

```typescript
// Use indexes for fast retrieval
SELECT * FROM biometric_data_points
WHERE userId = ? AND timestamp DESC LIMIT 100;

-- Uses index: idx_biometric_user_timestamp

SELECT * FROM biometric_data_points
WHERE userId = ? AND dataType = ?;

-- Uses index: idx_biometric_user_type
```

---

## Example Complete Flow

```typescript
// 1. Fetch from Garmin API
const garminHeartRate = await garminService.syncHeartRateData(userId, deviceId);
// Result:
// {
//   calendarDate: "2026-01-25",
//   maxHeartRate: 165,
//   minHeartRate: 48,
//   restingHeartRate: 62,
//   lastNightFiveMinuteValues: [{ timestamp: 1706172000, value: 72 }]
// }

// 2. Transform to standardized format
const biometricPoints: BiometricDataPoint[] = [
  {
    userId: 'user123',
    timestamp: 1706172000000,  // converted to ms
    dataType: BiometricDataType.HEART_RATE,
    value: 72,
    unit: 'bpm',
    device: 'garmin',
    source: 'garmin',
    confidence: 1.0
  },
  // ... more data points
];

// 3. Store in database
db.transaction(() => {
  const stmt = db.prepare(`INSERT INTO biometric_data_points (...) VALUES (...)`);
  for (const point of biometricPoints) {
    stmt.run(...);
  }
})();

// 4. Google Fit receives via standardized format
// - Queries use dataType = 'heart_rate'
// - Reads value = 72, unit = 'bpm'
// - Identifies source = 'garmin' (high confidence)

// 5. HealthConnect Hub processes data
// - Aggregates by userId and date
// - Computes daily summaries
// - Updates readiness/recovery scores
```

---

**Last Updated**: January 25, 2026  
**Status**: ✅ Production Ready

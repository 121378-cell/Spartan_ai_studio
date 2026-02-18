/**
 * Terra Health Data Mocks
 * 
 * Mock fixtures for wearable data integration tests
 * Covers: Garmin, Apple Health, WHOOP, Oura, Google Fit
 */

export interface MockTerraHRVData {
  user_id: string;
  data: Array<{
    timestamp: string;
    hrv: number;
    hrv_baseline: number;
    hrv_percentile: number;
  }>;
}

export interface MockTerraSleepData {
  user_id: string;
  data: Array<{
    sleep_duration: number;
    sleep_quality: number;
    deep_sleep: number;
    rem_sleep: number;
    light_sleep: number;
    awake_time: number;
  }>;
}

export interface MockTerraActivityData {
  user_id: string;
  data: Array<{
    steps: number;
    active_calories: number;
    activity_minutes: {
      moderate?: number;
      vigorous?: number;
    };
    distance_km: number;
  }>;
}

export interface MockTerraRecoveryData {
  user_id: string;
  recovery_score: number;
  strain: number;
  sleep_performance: number;
  day_strain: number;
}

export interface MockDailyBiometrics {
  date: string;
  hrv: number;
  rhr: number;
  sleep_duration: number;
  sleep_quality: number;
  stress_level: number;
  recovery_score: number;
  activity_calories: number;
  steps: number;
}

// ============ GARMIN MOCKS ============

export const mockGarminHRV: MockTerraHRVData = {
  user_id: 'test-garmin-user',
  data: [
    { timestamp: '2026-02-17T08:00:00Z', hrv: 55, hrv_baseline: 50, hrv_percentile: 65 },
    { timestamp: '2026-02-16T08:00:00Z', hrv: 52, hrv_baseline: 50, hrv_percentile: 58 },
    { timestamp: '2026-02-15T08:00:00Z', hrv: 48, hrv_baseline: 50, hrv_percentile: 45 },
  ]
};

export const mockGarminSleep: MockTerraSleepData = {
  user_id: 'test-garmin-user',
  data: [
    { sleep_duration: 480, sleep_quality: 85, deep_sleep: 120, rem_sleep: 90, light_sleep: 240, awake_time: 30 },
    { sleep_duration: 420, sleep_quality: 75, deep_sleep: 100, rem_sleep: 80, light_sleep: 210, awake_time: 30 },
    { sleep_duration: 450, sleep_quality: 80, deep_sleep: 110, rem_sleep: 85, light_sleep: 225, awake_time: 30 },
  ]
};

export const mockGarminActivity: MockTerraActivityData = {
  user_id: 'test-garmin-user',
  data: [
    { steps: 10000, active_calories: 500, activity_minutes: { moderate: 45, vigorous: 20 }, distance_km: 8.5 },
    { steps: 8500, active_calories: 420, activity_minutes: { moderate: 35, vigorous: 15 }, distance_km: 7.2 },
    { steps: 12000, active_calories: 620, activity_minutes: { moderate: 55, vigorous: 30 }, distance_km: 10.1 },
  ]
};

// ============ APPLE HEALTH MOCKS ============

export const mockAppleHealthHRV: MockTerraHRVData = {
  user_id: 'test-apple-user',
  data: [
    { timestamp: '2026-02-17T07:30:00Z', hrv: 62, hrv_baseline: 55, hrv_percentile: 72 },
    { timestamp: '2026-02-16T07:30:00Z', hrv: 58, hrv_baseline: 55, hrv_percentile: 65 },
    { timestamp: '2026-02-15T07:30:00Z', hrv: 60, hrv_baseline: 55, hrv_percentile: 68 },
  ]
};

export const mockAppleHealthSleep: MockTerraSleepData = {
  user_id: 'test-apple-user',
  data: [
    { sleep_duration: 510, sleep_quality: 90, deep_sleep: 130, rem_sleep: 95, light_sleep: 255, awake_time: 30 },
    { sleep_duration: 450, sleep_quality: 78, deep_sleep: 105, rem_sleep: 82, light_sleep: 223, awake_time: 40 },
    { sleep_duration: 480, sleep_quality: 85, deep_sleep: 118, rem_sleep: 88, light_sleep: 234, awake_time: 40 },
  ]
};

// ============ WHOOP MOCKS ============

export const mockWHOOPRecovery: MockTerraRecoveryData = {
  user_id: 'test-whoop-user',
  recovery_score: 78,
  strain: 12.5,
  sleep_performance: 85,
  day_strain: 10.2
};

export const mockWHOOPHRV: MockTerraHRVData = {
  user_id: 'test-whoop-user',
  data: [
    { timestamp: '2026-02-17T06:00:00Z', hrv: 68, hrv_baseline: 60, hrv_percentile: 78 },
    { timestamp: '2026-02-16T06:00:00Z', hrv: 65, hrv_baseline: 60, hrv_percentile: 72 },
    { timestamp: '2026-02-15T06:00:00Z', hrv: 70, hrv_baseline: 60, hrv_percentile: 82 },
  ]
};

// ============ OURA MOCKS ============

export const mockOuraSleep: MockTerraSleepData = {
  user_id: 'test-oura-user',
  data: [
    { sleep_duration: 495, sleep_quality: 88, deep_sleep: 125, rem_sleep: 92, light_sleep: 248, awake_time: 30 },
    { sleep_duration: 465, sleep_quality: 82, deep_sleep: 112, rem_sleep: 86, light_sleep: 232, awake_time: 35 },
    { sleep_duration: 510, sleep_quality: 92, deep_sleep: 135, rem_sleep: 98, light_sleep: 247, awake_time: 30 },
  ]
};

// ============ SCENARIO FIXTURES ============

export const fixtureOptimalUser: MockDailyBiometrics[] = generateBiometricsSeries(30, {
  hrvBase: 65,
  hrvVariance: 5,
  rhrBase: 52,
  rhrVariance: 3,
  sleepBase: 480,
  sleepVariance: 30,
  stressBase: 25,
  stressVariance: 10,
  recoveryBase: 85,
  recoveryVariance: 5,
  activityBase: 550,
  activityVariance: 100,
  stepsBase: 10000,
  stepsVariance: 2000
});

export const fixtureHighRiskUser: MockDailyBiometrics[] = generateBiometricsSeries(30, {
  hrvBase: 35,
  hrvVariance: 8,
  rhrBase: 72,
  rhrVariance: 5,
  sleepBase: 300,
  sleepVariance: 60,
  stressBase: 75,
  stressVariance: 15,
  recoveryBase: 35,
  recoveryVariance: 10,
  activityBase: 700,
  activityVariance: 150,
  stepsBase: 14000,
  stepsVariance: 3000
});

export const fixtureOvertrainingUser: MockDailyBiometrics[] = generateBiometricsSeries(14, {
  hrvBase: 40,
  hrvVariance: 10,
  rhrBase: 68,
  rhrVariance: 8,
  sleepBase: 350,
  sleepVariance: 50,
  stressBase: 70,
  stressVariance: 12,
  recoveryBase: 38,
  recoveryVariance: 12,
  activityBase: 750,
  activityVariance: 100,
  stepsBase: 15000,
  stepsVariance: 2000
});

export const fixtureInsufficientData: MockDailyBiometrics[] = generateBiometricsSeries(5, {
  hrvBase: 50,
  hrvVariance: 5,
  rhrBase: 60,
  rhrVariance: 3,
  sleepBase: 420,
  sleepVariance: 30,
  stressBase: 40,
  stressVariance: 10,
  recoveryBase: 60,
  recoveryVariance: 10,
  activityBase: 450,
  activityVariance: 100,
  stepsBase: 8000,
  stepsVariance: 1500
});

// ============ HELPER FUNCTIONS ============

interface BiometricsConfig {
  hrvBase: number;
  hrvVariance: number;
  rhrBase: number;
  rhrVariance: number;
  sleepBase: number;
  sleepVariance: number;
  stressBase: number;
  stressVariance: number;
  recoveryBase: number;
  recoveryVariance: number;
  activityBase: number;
  activityVariance: number;
  stepsBase: number;
  stepsVariance: number;
}

function generateBiometricsSeries(days: number, config: BiometricsConfig): MockDailyBiometrics[] {
  const data: MockDailyBiometrics[] = [];
  const baseDate = new Date('2026-02-17');

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      hrv: Math.round(config.hrvBase + (Math.random() - 0.5) * config.hrvVariance * 2),
      rhr: Math.round(config.rhrBase + (Math.random() - 0.5) * config.rhrVariance * 2),
      sleep_duration: Math.round(config.sleepBase + (Math.random() - 0.5) * config.sleepVariance * 2),
      sleep_quality: Math.min(100, Math.max(0, Math.round((config.sleepBase / 480) * 100 + (Math.random() - 0.5) * 20))),
      stress_level: Math.min(100, Math.max(0, Math.round(config.stressBase + (Math.random() - 0.5) * config.stressVariance * 2))),
      recovery_score: Math.min(100, Math.max(0, Math.round(config.recoveryBase + (Math.random() - 0.5) * config.recoveryVariance * 2))),
      activity_calories: Math.round(config.activityBase + (Math.random() - 0.5) * config.activityVariance * 2),
      steps: Math.round(config.stepsBase + (Math.random() - 0.5) * config.stepsVariance * 2)
    });
  }

  return data;
}

export function generateTrendData(days: number, trend: 'improving' | 'declining' | 'stable'): MockDailyBiometrics[] {
  const data: MockDailyBiometrics[] = [];
  const baseDate = new Date('2026-02-17');

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);

    const progressFactor = (days - i) / days;

    let hrvBase: number;
    let recoveryBase: number;

    switch (trend) {
    case 'improving':
      hrvBase = 40 + progressFactor * 25;
      recoveryBase = 45 + progressFactor * 30;
      break;
    case 'declining':
      hrvBase = 65 - progressFactor * 25;
      recoveryBase = 75 - progressFactor * 30;
      break;
    default:
      hrvBase = 55;
      recoveryBase = 60;
    }

    data.push({
      date: date.toISOString().split('T')[0],
      hrv: Math.round(hrvBase + (Math.random() - 0.5) * 10),
      rhr: Math.round(60 + (Math.random() - 0.5) * 8),
      sleep_duration: Math.round(420 + (Math.random() - 0.5) * 60),
      sleep_quality: Math.round(70 + (Math.random() - 0.5) * 20),
      stress_level: Math.round(40 + (Math.random() - 0.5) * 20),
      recovery_score: Math.round(recoveryBase + (Math.random() - 0.5) * 10),
      activity_calories: Math.round(450 + (Math.random() - 0.5) * 200),
      steps: Math.round(9000 + (Math.random() - 0.5) * 4000)
    });
  }

  return data;
}

export function normalizeTerraToDailyBiometrics(
  hrvData: MockTerraHRVData,
  sleepData: MockTerraSleepData,
  activityData: MockTerraActivityData
): MockDailyBiometrics[] {
  const result: MockDailyBiometrics[] = [];
  const days = Math.min(hrvData.data.length, sleepData.data.length);

  for (let i = 0; i < days; i++) {
    const hrv = hrvData.data[i];
    const sleep = sleepData.data[i];
    const activity = activityData.data[i] || activityData.data[0];

    result.push({
      date: new Date(hrv.timestamp).toISOString().split('T')[0],
      hrv: hrv.hrv,
      rhr: 60 + Math.round((100 - hrv.hrv_percentile) * 0.2),
      sleep_duration: sleep.sleep_duration,
      sleep_quality: sleep.sleep_quality,
      stress_level: Math.max(0, 100 - hrv.hrv_percentile),
      recovery_score: Math.round((hrv.hrv_percentile + sleep.sleep_quality) / 2),
      activity_calories: activity.active_calories,
      steps: activity.steps
    });
  }

  return result;
}

/**
 * Standardized Biometric Data Schema
 * Unified interface for all wearable devices (Apple Health, Garmin, etc.)
 */

// Heart Rate Variability (HRV) - Measured in milliseconds
export interface HRVData {
  timestamp: number; // Unix timestamp in milliseconds
  rmssd: number; // Root Mean Square of Successive Differences (ms)
  sdnn: number; // Standard Deviation of NN intervals (ms)
  lf: number; // Low Frequency power (normalized)
  hf: number; // High Frequency power (normalized)
  lfHfRatio: number; // LF/HF ratio
  pnn50: number; // Percentage of successive differences > 50ms
  confidence: number; // 0-100, device confidence score
  device?: string; // Apple Watch, Garmin, Oura, etc.
}

// Resting Heart Rate
export interface RestingHeartRateData {
  timestamp: number; // Time measurement was taken (usually morning)
  rhr: number; // Beats per minute
  trend?: 'up' | 'down' | 'stable'; // Trend from baseline
  device?: string;
}

// Sleep Data
export interface SleepData {
  date: string; // YYYY-MM-DD
  startTime: number; // Unix timestamp when sleep began
  endTime: number; // Unix timestamp when sleep ended
  duration: number; // Total sleep duration in minutes
  
  // Sleep stages breakdown
  stages: {
    awake: number; // Minutes awake
    light: number; // Light sleep (N1-N2)
    deep: number; // Deep sleep (N3)
    rem: number; // REM sleep
  };
  
  // Sleep quality metrics
  quality: {
    score: number; // 0-100 sleep quality score
    efficiency: number; // Sleep efficiency (0-100)
    latency: number; // Time to fall asleep (minutes)
    wakeups: number; // Number of wakeups
    awakeningsPerHour: number;
  };
  
  // Environmental factors
  environment?: {
    temperature?: number; // Celsius
    humidity?: number; // Percentage
    lightLevel?: number; // Lux
    noiseLevel?: number; // Decibels
  };
  
  // Restorative metrics
  restorative?: {
    bodyBattery?: number; // 0-100 (Garmin)
    readinessScore?: number; // 0-100 (Oura)
  };
  
  device?: string;
}

// Active Recovery Heart Rate
export interface ActiveRecoveryData {
  timestamp: number; // Time of measurement
  heartRate: number; // BPM
  heartRateRecovery: number; // BPM drop in first 60 seconds post-exercise
  vo2Max?: number; // Estimated VO2 max (ml/kg/min)
  device?: string;
}

// Blood Oxygen (SpO2)
export interface BloodOxygenData {
  timestamp: number;
  spo2: number; // Percentage (95-100 is normal)
  confidence: number; // 0-100
  device?: string;
}

// Body Temperature
export interface BodyTemperatureData {
  timestamp: number;
  temperature: number; // Celsius
  location: 'wrist' | 'core' | 'skin'; // Measurement location
  unit: 'celsius' | 'fahrenheit';
  device?: string;
}

// Activity/Exercise Data
export interface ActivityData {
  id: string; // Unique activity identifier
  date: string; // YYYY-MM-DD
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  duration: number; // Duration in seconds
  
  // Activity details
  activityType: ActivityType;
  intensity: 'light' | 'moderate' | 'vigorous';
  
  // Metrics
  calories: number; // Total calories burned
  steps?: number; // Step count
  distance?: number; // Distance in kilometers
  
  // Heart rate data
  heartRate?: {
    average: number; // Average BPM
    max: number; // Maximum BPM
    min: number; // Minimum BPM
    zones?: HeartRateZones;
  };
  
  // GPS/Location
  gps?: {
    route?: Array<{ latitude: number; longitude: number; elevation?: number }>;
    totalAscent?: number; // Meters
    totalDescent?: number; // Meters
  };
  
  // Additional metrics
  powerOutput?: number; // Watts (for cycling)
  cadence?: number; // RPM or steps/min
  pace?: number; // Minutes per km
  
  device?: string;
  rawData?: object; // Original device data for reference
}

// Heart Rate Zones (typically: Zone 1-5)
export interface HeartRateZones {
  zone1: number; // Minutes in zone (50-60% max HR) - Rest
  zone2: number; // (60-70%) - Recovery
  zone3: number; // (70-80%) - Aerobic
  zone4: number; // (80-90%) - Threshold
  zone5: number; // (90-100%) - Max effort
}

// Activity Types
export enum ActivityType {
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

// Stress Level (from wearables like Apple Watch, Garmin)
export interface StressData {
  timestamp: number;
  stressLevel: number; // 0-100 or similar scale
  category: 'low' | 'moderate' | 'high';
  device?: string;
}

// Unified Biometric Data Point
export interface BiometricDataPoint {
  id?: string;
  userId: string;
  timestamp: number;
  dataType: BiometricDataType;
  value: number;
  unit: string;
  device: string;
  source: 'apple-health' | 'garmin' | 'garmin_manual' | 'oura' | 'withings' | 'terra-api' | 'other';
  confidence?: number; // 0-100
  rawData?: object | string;
  metadata?: string;
}

// Biometric Data Types
export enum BiometricDataType {
  HEART_RATE = 'heart_rate',
  HEART_RATE_AVG = 'heart_rate_avg',
  HEART_RATE_MAX = 'heart_rate_max',
  HEART_RATE_MIN = 'heart_rate_min',
  RHR = 'resting_heart_rate',
  HRV = 'hrv',
  SPO2 = 'spo2',
  TEMPERATURE = 'temperature',
  SLEEP = 'sleep',
  SLEEP_DURATION = 'sleep_duration',
  ACTIVITY = 'activity',
  STRESS = 'stress',
  STRESS_LEVEL = 'stress_level',
  BLOOD_PRESSURE = 'blood_pressure',
  GLUCOSE = 'glucose',
  WEIGHT = 'weight',
  CALORIES = 'calories',
  DISTANCE = 'distance',
  PACE = 'pace',
  STEPS = 'steps'
}

// Daily Aggregated Biometric Summary
export interface DailyBiometricSummary {
  userId: string;
  date: string; // YYYY-MM-DD
  
  // Heart metrics
  heartRate?: {
    average: number;
    min: number;
    max: number;
    resting: number;
  };
  
  // HRV
  hrv?: {
    average: number;
    min: number;
    max: number;
  };
  
  // Sleep
  sleep?: SleepData;
  
  // Activity
  activities?: ActivityData[];
  totalSteps?: number;
  totalCalories?: number;
  totalDistance?: number;
  
  // Recovery
  recovery?: {
    score: number; // 0-100
    status: 'poor' | 'fair' | 'good' | 'excellent';
    recommendations?: string[];
  };
  
  // Readiness/Training Load
  readiness?: {
    score: number; // 0-100
    status: 'low' | 'normal' | 'high';
  };
  
  // Data sources
  dataSources: string[]; // Devices that contributed to this summary
  lastUpdated: number;
}

// Wearable Device Configuration
export interface WearableDevice {
  id: string; // Unique device identifier
  userId: string;
  deviceId: string; // Unique device identifier
  deviceType: 'apple-watch' | 'apple-health' | 'garmin' | 'terra' | 'oura' | 'withings' | 'other';
  deviceName: string; // e.g., "Apple Watch Series 7"
  
  // Authentication
  accessToken?: string; // For OAuth-based services
  refreshToken?: string;
  tokenExpiresAt?: number;
  
  // Connection status
  isActive: boolean;
  lastSyncTime?: number;
  nextSyncTime?: number;
  syncInterval?: number; // Milliseconds between syncs
  
  // Data permissions
  permissions?: {
    heartRate: boolean;
    sleep: boolean;
    activity: boolean;
    nutrition: boolean;
    mindfulness: boolean;
  };
  
  // Pairing info
  pairedAt?: number;
  unpairedAt?: number;
  
  // Metadata
  metadata?: object;
}

// Wearable Health Data Summary
export interface WearableHealthSummary {
  userId: string;
  timeRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string;
  };
  
  // Aggregated metrics
  averageHeartRate: number;
  averageRestingHeartRate: number;
  averageHRV: number;
  totalSleep: number; // Minutes
  totalSteps: number;
  totalCalories: number;
  
  // Trends
  trends: {
    heartRate: 'increasing' | 'decreasing' | 'stable';
    hrv: 'increasing' | 'decreasing' | 'stable';
    sleep: 'improving' | 'declining' | 'stable';
  };
  
  // Recovery Score
  recoveryScore: number; // 0-100
  trainingLoad: 'low' | 'moderate' | 'high';
  
  // Recommendations
  recommendations: string[];
}

// HealthConnect Hub Configuration
export interface HealthConnectConfig {
  enableAppleHealth: boolean;
  enableGarmin: boolean;
  enableOura: boolean;
  enableWithings: boolean;
  
  // Sync settings
  autoSync: boolean;
  syncInterval: number; // Minutes
  
  // Data retention
  retentionDays: number;
  archiveAfterDays: number;
  
  // Processing
  enableDataProcessing: boolean; // ML/analytics
  enableAnomalyDetection: boolean;
  enablePredictions: boolean;
}

// Request/Response Types

export interface SyncBiometricDataRequest {
  deviceType: string;
  data: BiometricDataPoint[];
  batchId?: string;
  timestamp: number;
}

export interface SyncBiometricDataResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

export interface GetBiometricDataRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dataTypes?: BiometricDataType[];
  devices?: string[];
}

export interface GetBiometricDataResponse {
  userId: string;
  data: BiometricDataPoint[];
  summary?: DailyBiometricSummary[];
  timeRange: {
    start: string;
    end: string;
  };
}

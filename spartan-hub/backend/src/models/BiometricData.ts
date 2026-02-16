/**
 * Standardized Biometric Data Model
 * 
 * Consolidates biometric data from multiple sources:
 * - Apple Health
 * - Garmin Connect
 * - Google Fit
 * - HealthConnect
 * 
 * Normalizes all data into a single schema for consistent analysis
 */

/**
 * Heart Rate Variability (HRV) - Marker of recovery and autonomic nervous system
 */
export interface HRVData {
  timestamp: Date;
  value: number; // milliseconds
  source: 'apple-health' | 'garmin' | 'google-fit' | 'healthconnect' | 'manual' | 'whoop' | 'oura';
  quality?: 'good' | 'fair' | 'poor';
  notes?: string;
}

/**
 * Resting Heart Rate (RHR) - Key recovery indicator
 */
export interface RestingHeartRateData {
  timestamp: Date;
  value: number; // bpm
  source: 'apple-health' | 'garmin' | 'google-fit' | 'healthconnect' | 'manual' | 'whoop' | 'oura';
  notes?: string;
}

/**
 * Sleep Data - Comprehensive sleep tracking
 */
export interface SleepData {
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: Date; // When sleep started
  endTime: Date; // When user woke up
  duration: number; // minutes
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  source: 'apple-health' | 'garmin' | 'google-fit' | 'healthconnect' | 'manual' | 'whoop' | 'oura';
  
  // Sleep stages (when available)
  stages?: {
    light?: number; // minutes
    deep?: number; // minutes
    rem?: number; // minutes
    awake?: number; // minutes
  };
  
  // Sleep quality metrics
  score?: number; // 0-100
  restlessness?: number; // 0-100 (higher = more restless)
  deepSleepPercentage?: number; // 0-100
  remPercentage?: number; // 0-100
  
  notes?: string;
}

/**
 * Body Metrics - Weight, Body Fat, Measurements
 */
export interface BodyMetrics {
  timestamp: Date;
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
    source: 'apple-health' | 'garmin' | 'scale' | 'manual';
  };
  bodyFat?: {
    value: number; // percentage
    source: 'bioimpedance' | 'manual' | 'estimation';
  };
  muscleMass?: {
    value: number;
    unit: 'kg' | 'lbs';
  };
  boneMass?: {
    value: number;
    unit: 'kg' | 'lbs';
  };
  waistCircumference?: {
    value: number;
    unit: 'cm' | 'in';
  };
  notes?: string;
}

/**
 * Activity Data - Steps, Calories, Exercise
 */
export interface ActivityData {
  date: string; // ISO date string
  steps?: number;
  distance?: {
    value: number;
    unit: 'km' | 'miles';
  };
  caloriesBurned?: number; // total daily
  activeCalories?: number; // exercise only
  activityMinutes?: {
    moderate?: number;
    vigorous?: number;
  };
  source: 'apple-health' | 'garmin' | 'google-fit' | 'healthconnect' | 'manual' | 'whoop' | 'oura';
  notes?: string;
}

/**
 * Stress and Recovery Metrics
 */
export interface StressData {
  timestamp: Date;
  stressLevel: number; // 0-100 (higher = more stressed)
  source: 'garmin' | 'apple-watch' | 'manual';
  measurementType?: 'heart-rate-variability' | 'skin-temperature' | 'self-reported';
  notes?: string;
}

/**
 * Recovery Index - Comprehensive recovery assessment
 */
export interface RecoveryIndex {
  date: string; // ISO date string
  score: number; // 0-100
  components: {
    hrv: number; // weighted HRV contribution
    rhr: number; // weighted RHR contribution
    sleepQuality: number; // weighted sleep quality
    stressLevel: number; // weighted stress
    muscleRecovery?: number; // training-related recovery
  };
  recommendation?: string; // "push hard", "take it easy", "rest day"
  readinessToTrain?: 'ready' | 'caution' | 'need-rest';
}

/**
 * Aggregate Daily Biometrics - Single source of truth for daily data
 */
export interface DailyBiometrics {
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  
  // Core metrics
  hrv?: HRVData[];
  restingHeartRate?: RestingHeartRateData[];
  sleep?: SleepData;
  bodyMetrics?: BodyMetrics;
  activity?: ActivityData;
  stress?: StressData;
  
  // Derived metrics
  recoveryIndex?: RecoveryIndex;
  
  // Metadata
  sources: Set<string>; // Which wearables contributed data
  lastUpdated: Date;
  dataCompleteness: number; // percentage 0-100
}

/**
 * Wearable Device Registration
 */
export interface WearableDevice {
  id: string;
  userId: string;
  type: 'apple-watch' | 'apple-health' | 'garmin' | 'fitbit' | 'whoop' | 'oura';
  name: string;
  model?: string;
  serialNumber?: string;
  
  // Connection info
  connectedAt: Date;
  lastSyncAt: Date;
  isActive: boolean;
  
  // Permissions
  permissions: {
    hrv: boolean;
    rhr: boolean;
    sleep: boolean;
    activity: boolean;
    stress: boolean;
    bodyMetrics: boolean;
  };
  
  // Status
  syncStatus: 'syncing' | 'synced' | 'error' | 'pending';
  syncError?: string;
}

/**
 * Integration Configuration per User
 */
export interface BiometricIntegrations {
  userId: string;
  
  // Apple Health
  appleHealth?: {
    enabled: boolean;
    connectedAt?: Date;
    permissions: string[];
    lastSync?: Date;
  };
  
  // Garmin
  garmin?: {
    enabled: boolean;
    connectedAt?: Date;
    accessToken?: string; // encrypted
    refreshToken?: string; // encrypted
    lastSync?: Date;
    permissions: string[];
  };
  
  // Google Fit
  googleFit?: {
    enabled: boolean;
    connectedAt?: Date;
    accessToken?: string; // encrypted
    refreshToken?: string; // encrypted
    lastSync?: Date;
    permissions: string[];
  };
  
  // HealthConnect (Android)
  healthConnect?: {
    enabled: boolean;
    connectedAt?: Date;
    permissions: string[];
    lastSync?: Date;
  };
  
  // WHOOP
  whoop?: {
    enabled: boolean;
    connectedAt?: Date;
    accessToken?: string; // encrypted
    lastSync?: Date;
    permissions: string[];
  };
  
  // Oura Ring
  oura?: {
    enabled: boolean;
    connectedAt?: Date;
    accessToken?: string; // encrypted
    lastSync?: Date;
    permissions: string[];
  };
  
  // Sync preferences
  syncPreferences: {
    autoSync: boolean;
    syncInterval: number; // minutes
    prioritySources: ('apple-health' | 'garmin' | 'google-fit' | 'healthconnect' | 'whoop' | 'oura')[];
  };
}

/**
 * Biometric Export - For analysis and backup
 */
export interface BiometricExport {
  userId: string;
  exportDate: Date;
  startDate: string; // ISO date
  endDate: string; // ISO date
  
  dailyData: DailyBiometrics[];
  devices: WearableDevice[];
  integrations: BiometricIntegrations;
  
  // Metrics summaries
  summaries: {
    averageHRV: number;
    averageRHR: number;
    totalSleepMinutes: number;
    averageSleepQuality: string;
    averageRecoveryScore: number;
  };
}

/**
 * User model extensions for biometric data
 */
export interface UserWithBiometrics {
  id: string;
  email: string;
  
  // Biometric data
  biometricIntegrations?: BiometricIntegrations;
  wearableDevices?: WearableDevice[];
  
  // Latest metrics (cache for performance)
  latestBiometrics?: {
    today?: DailyBiometrics;
    lastWeek?: DailyBiometrics[];
    lastMonth?: DailyBiometrics[];
  };
}

/**
 * BiometricModel - Implementation for ML injury prediction routes
 */
export class BiometricModel {
  static find(query: {
    userId?: string;
    date?: {
      $gte?: Date;
      $lte?: Date;
    };
  }) {
    const db = require('../services/databaseServiceFactory').userDb;
    
    const results = db.all().filter((item: any) => {
      let matches = true;
      
      if (query.userId && item.userId !== query.userId) {
        matches = false;
      }
      
      if (query.date && item.date) {
        const itemDate = new Date(item.date);
        if (query.date.$gte && itemDate < query.date.$gte) {
          matches = false;
        }
        if (query.date.$lte && itemDate > query.date.$lte) {
          matches = false;
        }
      }
      
      return matches;
    }) as DailyBiometrics[];
    
    return {
      sort: (sortQuery: any) => {
        const { date } = sortQuery;
        const sorted = [...results].sort((a: any, b: any) => {
          const aDate = new Date(a.date).getTime();
          const bDate = new Date(b.date).getTime();
          return date === -1 ? bDate - aDate : aDate - bDate;
        });
        return Promise.resolve(sorted as DailyBiometrics[]);
      }
    };
  }

  static async findOne(query: { userId?: string; date?: string }): Promise<unknown | null> {
    const db = require('../services/databaseServiceFactory').userDb;
    
    const result = db.all().find((item: any) => {
      let matches = true;
      
      if (query.userId && item.userId !== query.userId) {
        matches = false;
      }
      
      if (query.date && item.date !== query.date) {
        matches = false;
      }
      
      return matches;
    });
    
    return result || null;
  }

  static async create(data: DailyBiometrics): Promise<DailyBiometrics> {
    const db = require('../services/databaseServiceFactory').userDb;
    return db.create(data);
  }

  static async update(query: { userId: string; date: string }, data: Partial<DailyBiometrics>): Promise<void> {
    const db = require('../services/databaseServiceFactory').userDb;
    const items = db.all();
    const item = items.find((i: any) => 
      i.userId === query.userId && i.date === query.date
    );
    
    if (item) {
      Object.assign(item, data);
    }
  }
}

/**
 * Garmin Manual Data Entry - Type Definitions
 *
 * Type definitions for manual biometric data entry
 */

export interface ManualHeartRateInput {
  timestamp: number; // milliseconds
  value: number; // bpm (0-250)
  unit?: string;
}

export interface ManualSleepInput {
  date: string; // YYYY-MM-DD
  startTime: number; // unix timestamp in seconds
  endTime: number; // unix timestamp in seconds
  duration?: number; // in seconds
  quality?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  notes?: string;
}

export interface ManualActivityInput {
  date: string; // YYYY-MM-DD
  name: string; // Activity name (e.g., "Running", "Cycling")
  startTime: number; // unix timestamp in seconds
  duration: number; // in seconds
  calories?: number; // kcal
  distance?: number; // meters
  steps?: number; // count
  avgHeartRate?: number; // bpm
  maxHeartRate?: number; // bpm
  minHeartRate?: number; // bpm
  notes?: string;
}

export interface ManualStressInput {
  date: string; // YYYY-MM-DD
  dayAverage: number; // 0-100 stress index
  minStress?: number; // 0-100
  maxStress?: number; // 0-100
  time?: number; // unix timestamp
}

export interface BulkImportDataPoint {
  timestamp: number;
  dataType: string; // 'heart_rate', 'sleep_duration', 'steps', etc.
  value: number;
  unit?: string;
  confidence?: number; // 0-1
  notes?: string;
}

export interface BiometricDataPoint {
  id: string;
  userId: string;
  deviceId: string;
  dataType: string;
  value: number;
  unit: string;
  timestamp: number;
  source: string;
  device: string;
  confidence: number;
  metadata?: Record<string, any>;
  createdAt?: number;
}

export interface ManualDataQueryOptions {
  startDate?: Date;
  endDate?: Date;
  dataType?: string;
  limit?: number;
  offset?: number;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    index: number;
    reason: string;
  }>;
}

/**
 * Manual Data Entry Service
 * 
 * Allows users to manually input biometric data when API credentials are not available
 * Supports: Heart Rate, Sleep, Activity, Stress, and other health metrics
 */

import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { BiometricDataPoint, BiometricDataType } from '../types/biometric';
import { sanitizeInput, validateAndSanitizeString } from '../utils/sanitization';

export interface ManualHeartRateInput {
  timestamp: number;
  value: number; // bpm
  device?: string;
}

export interface ManualSleepInput {
  startTime: number; // milliseconds
  endTime: number;
  quality?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  notes?: string;
}

export interface ManualActivityInput {
  name: string;
  startTime: number;
  duration: number; // milliseconds
  calories?: number;
  distance?: number;
  steps?: number;
  avgHeartRate?: number;
  notes?: string;
}

export interface ManualStressInput {
  timestamp: number;
  level: number; // 0-100
  notes?: string;
}

export interface ManualWeightInput {
  timestamp: number;
  weight: number; // kg
  notes?: string;
}

export interface ManualBloodPressureInput {
  timestamp: number;
  systolic: number;
  diastolic: number;
  notes?: string;
}

export class ManualDataEntryService {
  private db = getDatabase();
  private readonly CONFIDENCE_MANUAL = 0.8; // Lower confidence for manual entries
  private readonly SOURCE_MANUAL = 'garmin_manual';

  /**
   * Add manual heart rate data
   */
  async addHeartRateData(
    userId: string,
    data: ManualHeartRateInput
  ): Promise<BiometricDataPoint> {
    try {
      // Validate inputs
      if (!userId || userId.length === 0) {
        throw new Error('User ID is required');
      }

      if (!data.timestamp || data.timestamp <= 0) {
        throw new Error('Valid timestamp is required');
      }

      if (data.value < 30 || data.value > 220) {
        throw new Error('Heart rate must be between 30 and 220 bpm');
      }

      const id = `${userId}_hr_${data.timestamp}`;
      const device = data.device || 'manual-input';

      const stmt = this.db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        userId,
        data.timestamp,
        BiometricDataType.HEART_RATE,
        data.value,
        'bpm',
        device,
        this.SOURCE_MANUAL,
        this.CONFIDENCE_MANUAL
      );

      logger.info('Manual heart rate data added', {
        context: 'manual-data-entry',
        metadata: { userId, dataId: id, value: data.value }
      });

      return {
        id,
        userId,
        timestamp: data.timestamp,
        dataType: BiometricDataType.HEART_RATE,
        value: data.value,
        unit: 'bpm',
        device,
        source: this.SOURCE_MANUAL,
        confidence: this.CONFIDENCE_MANUAL
      };
    } catch (error) {
      logger.error('Failed to add manual heart rate data', {
        context: 'manual-data-entry',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Add manual sleep data
   */
  async addSleepData(
    userId: string,
    data: ManualSleepInput
  ): Promise<BiometricDataPoint> {
    try {
      if (!userId || userId.length === 0) {
        throw new Error('User ID is required');
      }

      if (!data.startTime || !data.endTime || data.startTime >= data.endTime) {
        throw new Error('Valid start time and end time are required (start < end)');
      }

      const duration = data.endTime - data.startTime;
      if (duration < 60000) { // Less than 1 minute
        throw new Error('Sleep duration must be at least 1 minute');
      }

      if (duration > 14 * 60 * 60 * 1000) { // More than 14 hours
        throw new Error('Sleep duration cannot exceed 14 hours');
      }

      const id = `${userId}_sleep_${data.startTime}`;
      const quality = data.quality || 'FAIR';

      const stmt = this.db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const metadata = JSON.stringify({
        quality,
        notes: data.notes || '',
        startTime: data.startTime,
        endTime: data.endTime
      });

      stmt.run(
        id,
        userId,
        data.startTime,
        BiometricDataType.SLEEP_DURATION,
        duration / (1000 * 60 * 60), // Convert to hours
        'hours',
        'manual-input',
        this.SOURCE_MANUAL,
        this.CONFIDENCE_MANUAL,
        metadata
      );

      logger.info('Manual sleep data added', {
        context: 'manual-data-entry',
        metadata: { userId, dataId: id, durationHours: duration / (1000 * 60 * 60) }
      });

      return {
        id,
        userId,
        timestamp: data.startTime,
        dataType: BiometricDataType.SLEEP_DURATION,
        value: duration / (1000 * 60 * 60),
        unit: 'hours',
        device: 'manual-input',
        source: this.SOURCE_MANUAL,
        confidence: this.CONFIDENCE_MANUAL,
        metadata
      };
    } catch (error) {
      logger.error('Failed to add manual sleep data', {
        context: 'manual-data-entry',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Add manual activity data
   */
  async addActivityData(
    userId: string,
    data: ManualActivityInput
  ): Promise<BiometricDataPoint> {
    try {
      if (!userId || userId.length === 0) {
        throw new Error('User ID is required');
      }

      const validated = validateAndSanitizeString(data.name, 2, 100);
      if (!validated.isValid) {
        throw new Error(`Activity name: ${validated.error}`);
      }

      if (!data.startTime || data.duration <= 0) {
        throw new Error('Valid start time and duration are required');
      }

      if (data.calories && (data.calories < 0 || data.calories > 10000)) {
        throw new Error('Calories must be between 0 and 10000');
      }

      if (data.distance && (data.distance < 0 || data.distance > 1000000)) {
        throw new Error('Distance must be between 0 and 1,000,000 meters');
      }

      if (data.steps && (data.steps < 0 || data.steps > 1000000)) {
        throw new Error('Steps must be between 0 and 1,000,000');
      }

      const id = `${userId}_activity_${data.startTime}`;
      const metadata = JSON.stringify({
        calories: data.calories || 0,
        distance: data.distance || 0,
        steps: data.steps || 0,
        avgHeartRate: data.avgHeartRate || 0,
        notes: data.notes || ''
      });

      const stmt = this.db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        userId,
        data.startTime,
        BiometricDataType.ACTIVITY,
        data.duration / (1000 * 60), // Convert to minutes
        'minutes',
        'manual-input',
        this.SOURCE_MANUAL,
        this.CONFIDENCE_MANUAL,
        metadata
      );

      logger.info('Manual activity data added', {
        context: 'manual-data-entry',
        metadata: { userId, dataId: id, activity: validated.value }
      });

      return {
        id,
        userId,
        timestamp: data.startTime,
        dataType: BiometricDataType.ACTIVITY,
        value: data.duration / (1000 * 60),
        unit: 'minutes',
        device: 'manual-input',
        source: this.SOURCE_MANUAL,
        confidence: this.CONFIDENCE_MANUAL,
        metadata
      };
    } catch (error) {
      logger.error('Failed to add manual activity data', {
        context: 'manual-data-entry',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Add manual stress data
   */
  async addStressData(
    userId: string,
    data: ManualStressInput
  ): Promise<BiometricDataPoint> {
    try {
      if (!userId || userId.length === 0) {
        throw new Error('User ID is required');
      }

      if (!data.timestamp || data.timestamp <= 0) {
        throw new Error('Valid timestamp is required');
      }

      if (data.level < 0 || data.level > 100) {
        throw new Error('Stress level must be between 0 and 100');
      }

      const id = `${userId}_stress_${data.timestamp}`;

      const stmt = this.db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const metadata = JSON.stringify({
        notes: data.notes || ''
      });

      stmt.run(
        id,
        userId,
        data.timestamp,
        BiometricDataType.STRESS_LEVEL,
        data.level,
        'points',
        'manual-input',
        this.SOURCE_MANUAL,
        this.CONFIDENCE_MANUAL,
        metadata
      );

      logger.info('Manual stress data added', {
        context: 'manual-data-entry',
        metadata: { userId, dataId: id, level: data.level }
      });

      return {
        id,
        userId,
        timestamp: data.timestamp,
        dataType: BiometricDataType.STRESS_LEVEL,
        value: data.level,
        unit: 'points',
        device: 'manual-input',
        source: this.SOURCE_MANUAL,
        confidence: this.CONFIDENCE_MANUAL,
        metadata
      };
    } catch (error) {
      logger.error('Failed to add manual stress data', {
        context: 'manual-data-entry',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Add manual weight data
   */
  async addWeightData(
    userId: string,
    data: ManualWeightInput
  ): Promise<BiometricDataPoint> {
    try {
      if (!userId || userId.length === 0) {
        throw new Error('User ID is required');
      }

      if (!data.timestamp || data.timestamp <= 0) {
        throw new Error('Valid timestamp is required');
      }

      if (data.weight < 20 || data.weight > 300) {
        throw new Error('Weight must be between 20 and 300 kg');
      }

      const id = `${userId}_weight_${data.timestamp}`;

      const stmt = this.db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const metadata = JSON.stringify({
        notes: data.notes || ''
      });

      stmt.run(
        id,
        userId,
        data.timestamp,
        BiometricDataType.WEIGHT,
        data.weight,
        'kg',
        'manual-input',
        this.SOURCE_MANUAL,
        this.CONFIDENCE_MANUAL,
        metadata
      );

      logger.info('Manual weight data added', {
        context: 'manual-data-entry',
        metadata: { userId, dataId: id, weight: data.weight }
      });

      return {
        id,
        userId,
        timestamp: data.timestamp,
        dataType: BiometricDataType.WEIGHT,
        value: data.weight,
        unit: 'kg',
        device: 'manual-input',
        source: this.SOURCE_MANUAL,
        confidence: this.CONFIDENCE_MANUAL,
        metadata
      };
    } catch (error) {
      logger.error('Failed to add manual weight data', {
        context: 'manual-data-entry',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Add manual blood pressure data
   */
  async addBloodPressureData(
    userId: string,
    data: ManualBloodPressureInput
  ): Promise<BiometricDataPoint> {
    try {
      if (!userId || userId.length === 0) {
        throw new Error('User ID is required');
      }

      if (!data.timestamp || data.timestamp <= 0) {
        throw new Error('Valid timestamp is required');
      }

      if (data.systolic < 70 || data.systolic > 200) {
        throw new Error('Systolic pressure must be between 70 and 200 mmHg');
      }

      if (data.diastolic < 40 || data.diastolic > 130) {
        throw new Error('Diastolic pressure must be between 40 and 130 mmHg');
      }

      if (data.systolic <= data.diastolic) {
        throw new Error('Systolic pressure must be higher than diastolic pressure');
      }

      const id = `${userId}_bp_${data.timestamp}`;

      const stmt = this.db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const bpValue = `${data.systolic}/${data.diastolic}`;
      const metadata = JSON.stringify({
        systolic: data.systolic,
        diastolic: data.diastolic,
        notes: data.notes || ''
      });

      stmt.run(
        id,
        userId,
        data.timestamp,
        BiometricDataType.BLOOD_PRESSURE,
        data.systolic, // Store systolic as main value
        'mmHg',
        'manual-input',
        this.SOURCE_MANUAL,
        this.CONFIDENCE_MANUAL,
        metadata
      );

      logger.info('Manual blood pressure data added', {
        context: 'manual-data-entry',
        metadata: { userId, dataId: id, bp: bpValue }
      });

      return {
        id,
        userId,
        timestamp: data.timestamp,
        dataType:        BiometricDataType.BLOOD_PRESSURE,
        value: data.systolic,
        unit: 'mmHg',
        device: 'manual-input',
        source: this.SOURCE_MANUAL,
        confidence: this.CONFIDENCE_MANUAL,
        metadata
      };
    } catch (error) {
      logger.error('Failed to add manual blood pressure data', {
        context: 'manual-data-entry',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get all manual data for a user
   */
  async getUserManualData(userId: string, limit: number = 100): Promise<BiometricDataPoint[]> {
    try {
      if (!userId || userId.length === 0) {
        throw new Error('User ID is required');
      }

      const stmt = this.db.prepare(`
        SELECT * FROM biometric_data_points 
        WHERE userId = ? AND source = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);

      const results = stmt.all(userId, this.SOURCE_MANUAL, limit) as any[];

      return results.map(row => ({
        id: row.id,
        userId: row.userId,
        timestamp: row.timestamp,
        dataType: row.dataType,
        value: row.value,
        unit: row.unit,
        device: row.device,
        source: row.source,
        confidence: row.confidence,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      logger.error('Failed to fetch user manual data', {
        context: 'manual-data-entry',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Delete manual data entry
   */
  async deleteManualData(userId: string, dataId: string): Promise<boolean> {
    try {
      if (!userId || userId.length === 0) {
        throw new Error('User ID is required');
      }

      if (!dataId || dataId.length === 0) {
        throw new Error('Data ID is required');
      }

      const stmt = this.db.prepare(`
        DELETE FROM biometric_data_points 
        WHERE id = ? AND userId = ? AND source = ?
      `);

      const result = stmt.run(dataId, userId, this.SOURCE_MANUAL);

      logger.info('Manual data deleted', {
        context: 'manual-data-entry',
        metadata: { userId, dataId }
      });

      return (result as any).changes > 0;
    } catch (error) {
      logger.error('Failed to delete manual data', {
        context: 'manual-data-entry',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
}

export default ManualDataEntryService;

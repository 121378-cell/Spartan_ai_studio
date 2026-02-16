/**
 * Garmin Manual Data Entry Service
 *
 * Handles manual biometric data entry for Garmin devices
 * Until API credentials are available, users can input data manually
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { BiometricDataPoint, BiometricDataType, WearableDevice } from '../types/biometric';
import { getDatabase } from '../database/databaseManager';
import logger from '../utils/logger';

export interface ManualHeartRateInput {
  timestamp: number;
  value: number;
  unit?: string;
}

export interface ManualSleepInput {
  date: string;
  startTime: number;
  endTime: number;
  duration: number;
  quality?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
}

export interface ManualActivityInput {
  date: string;
  name: string;
  startTime: number;
  duration: number;
  calories?: number;
  distance?: number;
  steps?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
}

export interface ManualStressInput {
  date: string;
  dayAverage: number;
  minStress?: number;
  maxStress?: number;
}

class GarminManualDataService {
  private db: DatabaseType | null = null;

  private getDb(): DatabaseType {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  /**
   * Add manual heart rate data point
   */
  async addManualHeartRateData(
    userId: string,
    deviceId: string,
    data: ManualHeartRateInput
  ): Promise<BiometricDataPoint> {
    try {
      if (!userId || !deviceId) {
        throw new Error('User ID and Device ID are required');
      }

      if (data.value < 0 || data.value > 250) {
        throw new Error('Heart rate must be between 0 and 250 bpm');
      }

      if (data.timestamp <= 0) {
        throw new Error('Invalid timestamp');
      }

      const dataPoint: BiometricDataPoint = {
        userId,
        timestamp: data.timestamp,
        dataType: BiometricDataType.HEART_RATE,
        value: data.value,
        unit: data.unit || 'bpm',
        device: 'garmin',
        source: 'garmin_manual',
        confidence: 1.0
      };

      // Insert into database
      const stmt = this.getDb().prepare(`
        INSERT INTO biometric_data_points (
          userId, timestamp, dataType, value, unit, device, source, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        dataPoint.userId,
        dataPoint.timestamp,
        dataPoint.dataType,
        dataPoint.value,
        dataPoint.unit,
        dataPoint.device,
        dataPoint.source,
        dataPoint.confidence
      );

      logger.info('Manual heart rate data added', {
        context: 'garmin-manual',
        metadata: { userId, deviceId, value: data.value }
      });

      return dataPoint;
    } catch (error) {
      logger.error('Failed to add manual heart rate data', {
        context: 'garmin-manual',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Add manual sleep data
   */
  async addManualSleepData(
    userId: string,
    deviceId: string,
    data: ManualSleepInput
  ): Promise<BiometricDataPoint> {
    try {
      if (!userId || !deviceId) {
        throw new Error('User ID and Device ID are required');
      }

      if (data.endTime <= data.startTime) {
        throw new Error('End time must be after start time');
      }

      if (data.duration <= 0) {
        throw new Error('Sleep duration must be greater than 0');
      }

      const qualityScore: Record<string, number> = {
        'POOR': 0.25,
        'FAIR': 0.5,
        'GOOD': 0.75,
        'EXCELLENT': 1.0
      };

      const quality = data.quality || 'FAIR';
      const confidence = qualityScore[quality] || 0.5;

      const dataPoint: BiometricDataPoint = {
        userId,
        timestamp: data.startTime * 1000,
        dataType: BiometricDataType.SLEEP_DURATION,
        value: data.duration / 3600, // Convert to hours
        unit: 'hours',
        device: 'garmin',
        source: 'garmin_manual',
        confidence
      };

      // Insert into database
      const stmt = this.getDb().prepare(`
        INSERT INTO biometric_data_points (
          userId, timestamp, dataType, value, unit, device, source, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        dataPoint.userId,
        dataPoint.timestamp,
        dataPoint.dataType,
        dataPoint.value,
        dataPoint.unit,
        dataPoint.device,
        dataPoint.source,
        dataPoint.confidence
      );

      logger.info('Manual sleep data added', {
        context: 'garmin-manual',
        metadata: { userId, deviceId, hours: dataPoint.value, quality }
      });

      return dataPoint;
    } catch (error) {
      logger.error('Failed to add manual sleep data', {
        context: 'garmin-manual',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Add manual activity data
   */
  async addManualActivityData(
    userId: string,
    deviceId: string,
    data: ManualActivityInput
  ): Promise<BiometricDataPoint[]> {
    try {
      if (!userId || !deviceId) {
        throw new Error('User ID and Device ID are required');
      }

      if (data.duration <= 0) {
        throw new Error('Activity duration must be greater than 0');
      }

      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Activity name is required');
      }

      const dataPoints: BiometricDataPoint[] = [];
      const baseTimestamp = data.startTime * 1000;

      // Primary activity entry
      const activityPoint: BiometricDataPoint = {
        userId,
        timestamp: baseTimestamp,
        dataType: BiometricDataType.ACTIVITY,
        value: data.duration,
        unit: 'seconds',
        device: 'garmin',
        source: 'garmin_manual',
        confidence: 0.9,
        rawData: {
          name: data.name,
          calories: data.calories,
          distance: data.distance,
          steps: data.steps,
          avgHeartRate: data.avgHeartRate,
          maxHeartRate: data.maxHeartRate
        }
      };
      dataPoints.push(activityPoint);

      // Add distance data if provided
      if (data.distance && data.distance > 0) {
        dataPoints.push({
          userId,
          timestamp: baseTimestamp,
          dataType: BiometricDataType.ACTIVITY,
          value: data.distance,
          unit: 'meters',
          device: 'garmin',
          source: 'garmin_manual',
          confidence: 0.9,
          rawData: { metric: 'distance' }
        });
      }

      // Add calories data if provided
      if (data.calories && data.calories > 0) {
        dataPoints.push({
          userId,
          timestamp: baseTimestamp,
          dataType: BiometricDataType.CALORIES,
          value: data.calories,
          unit: 'kcal',
          device: 'garmin',
          source: 'garmin_manual',
          confidence: 0.85
        });
      }

      // Add steps data if provided
      if (data.steps && data.steps > 0) {
        dataPoints.push({
          userId,
          timestamp: baseTimestamp,
          dataType: BiometricDataType.ACTIVITY,
          value: data.steps,
          unit: 'count',
          device: 'garmin',
          source: 'garmin_manual',
          confidence: 0.95,
          rawData: { metric: 'steps' }
        });
      }

      // Add avg heart rate if provided
      if (data.avgHeartRate && data.avgHeartRate > 0) {
        dataPoints.push({
          userId,
          timestamp: baseTimestamp,
          dataType: BiometricDataType.HEART_RATE_AVG,
          value: data.avgHeartRate,
          unit: 'bpm',
          device: 'garmin',
          source: 'garmin_manual',
          confidence: 0.8
        });
      }

      // Add max heart rate if provided
      if (data.maxHeartRate && data.maxHeartRate > 0) {
        dataPoints.push({
          userId,
          timestamp: baseTimestamp,
          dataType: BiometricDataType.HEART_RATE_MAX,
          value: data.maxHeartRate,
          unit: 'bpm',
          device: 'garmin',
          source: 'garmin_manual',
          confidence: 0.8
        });
      }

      // Insert all data points
      const stmt = this.getDb().prepare(`
        INSERT INTO biometric_data_points (
          userId, timestamp, dataType, value, unit, device, source, confidence, rawData
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const point of dataPoints) {
        stmt.run(
          point.userId,
          point.timestamp,
          point.dataType,
          point.value,
          point.unit,
          point.device,
          point.source,
          point.confidence,
          point.rawData ? JSON.stringify(point.rawData) : null
        );
      }

      logger.info('Manual activity data added', {
        context: 'garmin-manual',
        metadata: { userId, deviceId, activity: data.name, pointsAdded: dataPoints.length }
      });

      return dataPoints;
    } catch (error) {
      logger.error('Failed to add manual activity data', {
        context: 'garmin-manual',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Add manual stress data
   */
  async addManualStressData(
    userId: string,
    deviceId: string,
    data: ManualStressInput
  ): Promise<BiometricDataPoint> {
    try {
      if (!userId || !deviceId) {
        throw new Error('User ID and Device ID are required');
      }

      if (data.dayAverage < 0 || data.dayAverage > 100) {
        throw new Error('Stress level must be between 0 and 100');
      }

      const timestamp = new Date(data.date).getTime();
      if (timestamp <= 0) {
        throw new Error('Invalid date');
      }

      const dataPoint: BiometricDataPoint = {
        userId,
        timestamp,
        dataType: BiometricDataType.STRESS_LEVEL,
        value: data.dayAverage,
        unit: 'index',
        device: 'garmin',
        source: 'garmin_manual',
        confidence: 0.85
      };

      // Insert into database
      const stmt = this.getDb().prepare(`
        INSERT INTO biometric_data_points (
          userId, timestamp, dataType, value, unit, device, source, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        dataPoint.userId,
        dataPoint.timestamp,
        dataPoint.dataType,
        dataPoint.value,
        dataPoint.unit,
        dataPoint.device,
        dataPoint.source,
        dataPoint.confidence
      );

      logger.info('Manual stress data added', {
        context: 'garmin-manual',
        metadata: { userId, deviceId, stress: data.dayAverage }
      });

      return dataPoint;
    } catch (error) {
      logger.error('Failed to add manual stress data', {
        context: 'garmin-manual',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get manual data entries for a user
   */
  async getManualDataEntries(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BiometricDataPoint[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      let query = `
        SELECT * FROM biometric_data_points 
        WHERE userId = ? AND source = 'garmin_manual'
      `;
      const params: any[] = [userId];

      if (startDate) {
        query += ' AND timestamp >= ?';
        params.push(startDate.getTime());
      }

      if (endDate) {
        query += ' AND timestamp <= ?';
        params.push(endDate.getTime());
      }

      query += ' ORDER BY timestamp DESC';

      const dataPoints = this.getDb().prepare(query).all(...params) as BiometricDataPoint[];

      logger.info('Retrieved manual data entries', {
        context: 'garmin-manual',
        metadata: { userId, count: dataPoints.length }
      });

      return dataPoints;
    } catch (error) {
      logger.error('Failed to get manual data entries', {
        context: 'garmin-manual',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Bulk import manual data
   */
  async bulkImportManualData(
    userId: string,
    deviceId: string,
    dataPoints: Array<{
      timestamp: number;
      dataType: string;
      value: number;
      unit: string;
      confidence?: number;
    }>
  ): Promise<number> {
    try {
      if (!userId || !deviceId) {
        throw new Error('User ID and Device ID are required');
      }

      if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
        throw new Error('Data points array is required and must not be empty');
      }

      const stmt = this.getDb().prepare(`
        INSERT INTO biometric_data_points (
          userId, timestamp, dataType, value, unit, device, source, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let inserted = 0;
      for (const point of dataPoints) {
        if (!point.timestamp || !point.dataType || typeof point.value !== 'number') {
          logger.warn('Skipping invalid data point', {
            context: 'garmin-manual',
            metadata: { point }
          });
          continue;
        }

        stmt.run(
          userId,
          point.timestamp,
          point.dataType,
          point.value,
          point.unit || 'unit',
          'garmin',
          'garmin_manual',
          point.confidence || 0.8
        );
        inserted++;
      }

      logger.info('Bulk import completed', {
        context: 'garmin-manual',
        metadata: { userId, deviceId, inserted, total: dataPoints.length }
      });

      return inserted;
    } catch (error) {
      logger.error('Failed to bulk import manual data', {
        context: 'garmin-manual',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
}

export default new GarminManualDataService();

import { logger } from '../utils/logger';
import {
  BiometricDataPoint,
  BiometricDataType,
  DailyBiometricSummary,
  WearableDevice,
  WearableHealthSummary,
  ActivityType
} from '../types/biometric';
const Database = require('better-sqlite3');
type DatabaseType = any;

/**
 * HealthConnect Hub Service
 * Centralizes biometric data from multiple wearable devices
 * Standardizes and processes health data
 */

export class HealthConnectHubService {
  private db: DatabaseType | null = null;

  constructor(database?: DatabaseType) {
    this.db = database || null;
  }

  /**
   * Initialize HealthConnect Hub
   * Creates necessary database tables
   */
  async initialize(): Promise<void> {
    if (!this.db) {
      logger.warn('Database not initialized for HealthConnect', {
        context: 'healthConnect'
      });
      return;
    }

    try {
      // Create wearable devices table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS wearable_devices (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          deviceType TEXT NOT NULL,
          deviceName TEXT NOT NULL,
          accessToken TEXT,
          refreshToken TEXT,
          tokenExpiresAt INTEGER,
          isActive INTEGER DEFAULT 1,
          lastSyncTime INTEGER,
          nextSyncTime INTEGER,
          syncInterval INTEGER DEFAULT 3600000,
          permissions TEXT,
          pairedAt INTEGER,
          unpairedAt INTEGER,
          metadata TEXT,
          createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          updatedAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id)
        );
      `);

      // Create biometric data points table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS biometric_data_points (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          dataType TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          device TEXT NOT NULL,
          source TEXT NOT NULL,
          confidence REAL,
          rawData TEXT,
          createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id)
        );
      `);

      // Create daily summaries table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS daily_biometric_summaries (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          date TEXT NOT NULL,
          heartRateAvg REAL,
          heartRateMin REAL,
          heartRateMax REAL,
          rhhr REAL,
          hrvAvg REAL,
          hrvMin REAL,
          hrvMax REAL,
          sleepDuration INTEGER,
          sleepQuality REAL,
          totalSteps INTEGER,
          totalCalories REAL,
          totalDistance REAL,
          recoveryScore REAL,
          readinessScore REAL,
          dataSources TEXT,
          lastUpdated INTEGER,
          createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          updatedAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id),
          UNIQUE(userId, date)
        );
      `);

      // Create indexes for performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_biometric_user_timestamp 
          ON biometric_data_points(userId, timestamp DESC);
        
        CREATE INDEX IF NOT EXISTS idx_biometric_user_type 
          ON biometric_data_points(userId, dataType);
        
        CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date 
          ON daily_biometric_summaries(userId, date DESC);
        
        CREATE INDEX IF NOT EXISTS idx_wearable_device_user 
          ON wearable_devices(userId);
      `);

      logger.info('HealthConnect Hub initialized successfully', {
        context: 'healthConnect'
      });
    } catch (error) {
      logger.error('Failed to initialize HealthConnect Hub', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Register a wearable device
   */
  async registerDevice(device: WearableDevice): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const deviceId = `${device.userId}_${device.deviceType}_${Date.now()}`;
      const now = Date.now();

      const stmt = this.db.prepare(`
        INSERT INTO wearable_devices (
          id, userId, deviceType, deviceName, accessToken, refreshToken,
          tokenExpiresAt, isActive, lastSyncTime, syncInterval, permissions,
          pairedAt, metadata, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        deviceId,
        device.userId,
        device.deviceType,
        device.deviceName,
        device.accessToken || null,
        device.refreshToken || null,
        device.tokenExpiresAt || null,
        device.isActive ? 1 : 0,
        device.lastSyncTime || null,
        device.syncInterval || 3600000,
        JSON.stringify(device.permissions || {}),
        now,
        JSON.stringify(device.metadata || {}),
        now,
        now
      );

      logger.info('Wearable device registered', {
        context: 'healthConnect',
        metadata: { userId: device.userId, deviceType: device.deviceType, deviceId }
      });

      return deviceId;
    } catch (error) {
      logger.error('Failed to register wearable device', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Update a wearable device configuration or tokens
   */
  async updateDevice(deviceId: string, updates: Partial<WearableDevice>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const allowedFields = [
        'accessToken', 'refreshToken', 'tokenExpiresAt', 
        'isActive', 'lastSyncTime', 'nextSyncTime', 
        'syncInterval', 'permissions', 'metadata'
      ];

      const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));
      
      if (fieldsToUpdate.length === 0) {
        return;
      }

      const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
      const values = fieldsToUpdate.map(field => {
        const value = updates[field as keyof WearableDevice];
        if (field === 'permissions' || field === 'metadata') {
          return JSON.stringify(value);
        }
        return value;
      });

      // Add updatedAt
      values.push(Date.now());
      values.push(deviceId);

      const stmt = this.db.prepare(`
        UPDATE wearable_devices
        SET ${setClause}, updatedAt = ?
        WHERE id = ? OR deviceId = ?
      `);

      // We bind deviceId twice for the OR condition to handle both internal ID and external deviceId
      stmt.run(...values, deviceId);

      logger.info('Wearable device updated', {
        context: 'healthConnect',
        metadata: { deviceId, updatedFields: fieldsToUpdate }
      });
    } catch (error) {
      logger.error('Failed to update wearable device', {
        context: 'healthConnect',
        metadata: { deviceId, error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Store biometric data point
   */
  async storeBiometricData(dataPoint: BiometricDataPoint): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const dataPointId = `bp_${dataPoint.userId}_${dataPoint.timestamp}_${dataPoint.dataType}`;

      const stmt = this.db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source,
          confidence, rawData, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        dataPointId,
        dataPoint.userId,
        dataPoint.timestamp,
        dataPoint.dataType,
        dataPoint.value,
        dataPoint.unit,
        dataPoint.device,
        dataPoint.source,
        dataPoint.confidence || null,
        dataPoint.rawData ? JSON.stringify(dataPoint.rawData) : null,
        Date.now()
      );

      logger.debug('Biometric data point stored', {
        context: 'healthConnect',
        metadata: {
          userId: dataPoint.userId,
          dataType: dataPoint.dataType,
          value: dataPoint.value
        }
      });

      return dataPointId;
    } catch (error) {
      logger.error('Failed to store biometric data point', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get biometric data for date range
   */
  async getBiometricData(
    userId: string,
    startDate: string,
    endDate: string,
    dataTypes?: BiometricDataType[]
  ): Promise<BiometricDataPoint[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime() + 86400000; // End of day

      let query = `
        SELECT 
          id, userId, timestamp, dataType, value, unit, device, source,
          confidence, rawData, createdAt
        FROM biometric_data_points
        WHERE userId = ? AND timestamp BETWEEN ? AND ?
      `;

      const params: any[] = [userId, startTimestamp, endTimestamp];

      if (dataTypes && dataTypes.length > 0) {
        const placeholders = dataTypes.map(() => '?').join(',');
        query += ` AND dataType IN (${placeholders})`;
        params.push(...dataTypes);
      }

      query += ' ORDER BY timestamp DESC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map(row => ({
        userId: row.userId,
        timestamp: row.timestamp,
        dataType: row.dataType,
        value: row.value,
        unit: row.unit,
        device: row.device,
        source: row.source,
        confidence: row.confidence,
        rawData: row.rawData ? JSON.parse(row.rawData) : undefined
      }));
    } catch (error) {
      logger.error('Failed to retrieve biometric data', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get daily biometric summary
   */
  async getDailySummary(userId: string, date: string): Promise<DailyBiometricSummary | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM daily_biometric_summaries
        WHERE userId = ? AND date = ?
      `);

      const row = stmt.get(userId, date) as any;

      if (!row) {
        return null;
      }

      return {
        userId: row.userId,
        date: row.date,
        heartRate: row.heartRateAvg ? {
          average: row.heartRateAvg,
          min: row.heartRateMin,
          max: row.heartRateMax,
          resting: row.rhhr
        } : undefined,
        hrv: row.hrvAvg ? {
          average: row.hrvAvg,
          min: row.hrvMin,
          max: row.hrvMax
        } : undefined,
        totalSteps: row.totalSteps,
        totalCalories: row.totalCalories,
        totalDistance: row.totalDistance,
        recovery: row.recoveryScore ? {
          score: row.recoveryScore,
          status: row.recoveryScore > 75 ? 'excellent' : 
            row.recoveryScore > 50 ? 'good' :
              row.recoveryScore > 25 ? 'fair' : 'poor'
        } : undefined,
        readiness: row.readinessScore ? {
          score: row.readinessScore,
          status: row.readinessScore > 60 ? 'high' :
            row.readinessScore > 40 ? 'normal' : 'low'
        } : undefined,
        dataSources: row.dataSources ? JSON.parse(row.dataSources) : [],
        lastUpdated: row.lastUpdated
      };
    } catch (error) {
      logger.error('Failed to get daily summary', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Create or update daily summary
   */
  async upsertDailySummary(summary: DailyBiometricSummary): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const summaryId = `ds_${summary.userId}_${summary.date}`;
      const now = Date.now();

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO daily_biometric_summaries (
          id, userId, date, heartRateAvg, heartRateMin, heartRateMax, rhhr,
          hrvAvg, hrvMin, hrvMax, sleepDuration, sleepQuality, totalSteps,
          totalCalories, totalDistance, recoveryScore, readinessScore,
          dataSources, lastUpdated, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        summaryId,
        summary.userId,
        summary.date,
        summary.heartRate?.average || null,
        summary.heartRate?.min || null,
        summary.heartRate?.max || null,
        summary.heartRate?.resting || null,
        summary.hrv?.average || null,
        summary.hrv?.min || null,
        summary.hrv?.max || null,
        summary.sleep?.duration || null,
        summary.sleep?.quality?.score || null,
        summary.totalSteps || null,
        summary.totalCalories || null,
        summary.totalDistance || null,
        summary.recovery?.score || null,
        summary.readiness?.score || null,
        JSON.stringify(summary.dataSources || []),
        now,
        now,
        now
      );

      logger.debug('Daily biometric summary upserted', {
        context: 'healthConnect',
        metadata: { userId: summary.userId, date: summary.date }
      });
    } catch (error) {
      logger.error('Failed to upsert daily summary', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get user's connected devices
   */
  async getUserDevices(userId: string): Promise<WearableDevice[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM wearable_devices
        WHERE userId = ? AND unpairedAt IS NULL
        ORDER BY pairedAt DESC
      `);

      const rows = stmt.all(userId) as any[];

      return rows.map(row => ({
        id: row.id,
        userId: row.userId,
        deviceId: row.id,
        deviceType: row.deviceType,
        deviceName: row.deviceName,
        accessToken: row.accessToken,
        refreshToken: row.refreshToken,
        tokenExpiresAt: row.tokenExpiresAt,
        isActive: row.isActive === 1,
        lastSyncTime: row.lastSyncTime,
        nextSyncTime: row.nextSyncTime,
        syncInterval: row.syncInterval,
        permissions: row.permissions ? JSON.parse(row.permissions) : {},
        pairedAt: row.pairedAt,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
    } catch (error) {
      logger.error('Failed to get user devices', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Update device sync status
   */
  async updateDeviceSyncStatus(
    deviceId: string,
    lastSyncTime: number,
    nextSyncTime: number
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        UPDATE wearable_devices
        SET lastSyncTime = ?, nextSyncTime = ?, updatedAt = ?
        WHERE id = ?
      `);

      stmt.run(lastSyncTime, nextSyncTime, Date.now(), deviceId);

      logger.debug('Device sync status updated', {
        context: 'healthConnect',
        metadata: { deviceId, lastSyncTime }
      });
    } catch (error) {
      logger.error('Failed to update device sync status', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get health summary for date range
   */
  async getHealthSummary(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<WearableHealthSummary> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime() + 86400000;

      // Get daily summaries
      const summaryStmt = this.db.prepare(`
        SELECT * FROM daily_biometric_summaries
        WHERE userId = ? AND date BETWEEN ? AND ?
        ORDER BY date ASC
      `);

      const summaries = summaryStmt.all(
        userId,
        startDate,
        endDate
      ) as any[];

      // Calculate aggregates
      const validHR = summaries.filter(s => s.heartRateAvg);
      const validRHR = summaries.filter(s => s.rhhr);
      const validHRV = summaries.filter(s => s.hrvAvg);

      const averageHeartRate = validHR.length > 0
        ? validHR.reduce((sum, s) => sum + s.heartRateAvg, 0) / validHR.length
        : 0;

      const averageRestingHeartRate = validRHR.length > 0
        ? validRHR.reduce((sum, s) => sum + s.rhhr, 0) / validRHR.length
        : 0;

      const averageHRV = validHRV.length > 0
        ? validHRV.reduce((sum, s) => sum + s.hrvAvg, 0) / validHRV.length
        : 0;

      const totalSleep = summaries.reduce((sum, s) => sum + (s.sleepDuration || 0), 0);
      const totalSteps = summaries.reduce((sum, s) => sum + (s.totalSteps || 0), 0);
      const totalCalories = summaries.reduce((sum, s) => sum + (s.totalCalories || 0), 0);

      // Determine trends
      const trends = {
        heartRate: this.determineTrend(validHR, 'heartRateAvg'),
        hrv: this.determineTrend(validHRV, 'hrvAvg'),
        sleep: this.determineTrend(summaries.filter(s => s.sleepQuality), 'sleepQuality') === 'increasing'
          ? 'improving' as const
          : this.determineTrend(summaries.filter(s => s.sleepQuality), 'sleepQuality') === 'decreasing'
            ? 'declining' as const
            : 'stable' as const
      };

      return {
        userId,
        timeRange: { startDate, endDate },
        averageHeartRate,
        averageRestingHeartRate,
        averageHRV,
        totalSleep,
        totalSteps,
        totalCalories,
        trends,
        recoveryScore: Math.round((averageHRV > 0 ? Math.min(100, (averageHRV / 100) * 40) : 50) +
          (averageRestingHeartRate > 0 ? Math.max(0, 100 - ((averageRestingHeartRate / 100) * 100)) : 50) * 0.3 +
          (totalSleep > 0 ? Math.min(100, (totalSleep / (7 * 60 * 8)) * 100) : 50) * 0.3),
        trainingLoad: 'moderate',
        recommendations: []
      };
    } catch (error) {
      logger.error('Failed to get health summary', {
        context: 'healthConnect',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Determine trend from data
   */
  private determineTrend(
    data: any[],
    field: string
  ): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d[field], 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d[field], 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }
}

// Singleton instance
let instance: HealthConnectHubService | null = null;

export const getHealthConnectHub = (database?: DatabaseType): HealthConnectHubService => {
  if (!instance) {
    instance = new HealthConnectHubService(database);
  }
  return instance;
};

export default HealthConnectHubService;

/**
 * Database Migration 001: Create Biometric Tables
 * 
 * Creates the core tables for biometric data storage:
 * - wearable_devices: Device credentials and sync status
 * - biometric_data_points: Individual biometric measurements
 * - daily_biometric_summaries: Aggregated daily metrics
 * 
 * Run: npm run db:migrate
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../../utils/logger';

export interface MigrationResult {
  success: boolean;
  tablesCreated: string[];
  indexesCreated: string[];
  errors: string[];
  duration: number;
}

/**
 * Execute migration to create biometric tables
 */
export const migrate_001_create_biometric_tables = (db: DatabaseType): MigrationResult => {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: true,
    tablesCreated: [],
    indexesCreated: [],
    errors: [],
    duration: 0
  };

  try {
    logger.info('Starting migration 001: Create biometric tables', {
      context: 'database.migration'
    });

    // Create wearable_devices table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS wearable_devices (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          deviceType TEXT NOT NULL COLLATE NOCASE,
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
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
          CHECK(length(id) > 0),
          CHECK(length(userId) > 0),
          CHECK(length(deviceType) > 0)
        )
      `);
      result.tablesCreated.push('wearable_devices');
      logger.debug('Created table: wearable_devices', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table wearable_devices already exists', { context: 'database.migration' });
    }

    // Create biometric_data_points table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS biometric_data_points (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          dataType TEXT NOT NULL COLLATE NOCASE,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          device TEXT NOT NULL COLLATE NOCASE,
          source TEXT NOT NULL,
          confidence REAL DEFAULT 0.95,
          rawData TEXT,
          createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
          CHECK(length(id) > 0),
          CHECK(length(userId) > 0),
          CHECK(timestamp > 0),
          CHECK(length(dataType) > 0),
          CHECK(value >= 0 OR dataType IN ('blood_pressure', 'temperature'))
        )
      `);
      result.tablesCreated.push('biometric_data_points');
      logger.debug('Created table: biometric_data_points', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table biometric_data_points already exists', { context: 'database.migration' });
    }

    // Create daily_biometric_summaries table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS daily_biometric_summaries (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          date TEXT NOT NULL COLLATE NOCASE,
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
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(userId, date),
          CHECK(length(id) > 0),
          CHECK(length(userId) > 0),
          CHECK(length(date) = 10)
        )
      `);
      result.tablesCreated.push('daily_biometric_summaries');
      logger.debug('Created table: daily_biometric_summaries', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table daily_biometric_summaries already exists', { context: 'database.migration' });
    }

    // Create performance indexes
    const indexes = [
      {
        name: 'idx_biometric_user_timestamp',
        query: `CREATE INDEX IF NOT EXISTS idx_biometric_user_timestamp 
                ON biometric_data_points(userId, timestamp DESC)`
      },
      {
        name: 'idx_biometric_user_type',
        query: `CREATE INDEX IF NOT EXISTS idx_biometric_user_type 
                ON biometric_data_points(userId, dataType)`
      },
      {
        name: 'idx_biometric_user_date',
        query: `CREATE INDEX IF NOT EXISTS idx_biometric_user_date 
                ON biometric_data_points(userId, date(timestamp / 1000, 'unixepoch'))`
      },
      {
        name: 'idx_daily_summary_user_date',
        query: `CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date 
                ON daily_biometric_summaries(userId, date DESC)`
      },
      {
        name: 'idx_wearable_device_user',
        query: `CREATE INDEX IF NOT EXISTS idx_wearable_device_user 
                ON wearable_devices(userId)`
      },
      {
        name: 'idx_wearable_device_active',
        query: `CREATE INDEX IF NOT EXISTS idx_wearable_device_active 
                ON wearable_devices(userId, isActive)`
      }
    ];

    for (const index of indexes) {
      try {
        db.exec(index.query);
        result.indexesCreated.push(index.name);
        logger.debug(`Created index: ${index.name}`, { context: 'database.migration' });
      } catch (error) {
        if (!(error instanceof Error && error.message.includes('already exists'))) {
          throw error;
        }
        logger.debug(`Index ${index.name} already exists`, { context: 'database.migration' });
      }
    }

    // Create pragmas for performance
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -64000;
      PRAGMA temp_store = MEMORY;
      PRAGMA query_only = FALSE;
    `);

    logger.info('Migration 001 completed successfully', {
      context: 'database.migration',
      metadata: {
        tablesCreated: result.tablesCreated,
        indexesCreated: result.indexesCreated,
        duration: `${Date.now() - startTime}ms`
      }
    });

    result.duration = Date.now() - startTime;
    return result;
  } catch (error) {
    result.success = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMessage);

    logger.error('Migration 001 failed', {
      context: 'database.migration',
      metadata: { error: errorMessage }
    });

    result.duration = Date.now() - startTime;
    return result;
  }
};

export default migrate_001_create_biometric_tables;

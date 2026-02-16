/**
 * Database Migration 022: Critical Signal Alerts & OAuth States
 * 
 * Creates tables for:
 * - critical_signal_alerts: Real-time critical biometric signal detection
 * - oauth_states: OAuth flow state tracking for security
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

export const migrate_022_critical_signals_oauth = (db: DatabaseType): MigrationResult => {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: true,
    tablesCreated: [],
    indexesCreated: [],
    errors: [],
    duration: 0
  };

  try {
    logger.info('Starting migration 022: Critical signals & OAuth states', {
      context: 'database.migration'
    });

    // Create critical_signal_alerts table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS critical_signal_alerts (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          signalType TEXT NOT NULL,
          severity TEXT NOT NULL,
          currentValue REAL,
          threshold REAL,
          recommendation TEXT,
          interventionProposed TEXT,
          interventionAccepted INTEGER,
          acknowledged INTEGER DEFAULT 0,
          acknowledgedAt INTEGER,
          timestamp INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      result.tablesCreated.push('critical_signal_alerts');
      logger.debug('Created table: critical_signal_alerts', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table critical_signal_alerts already exists', { context: 'database.migration' });
    }

    // Create oauth_states table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS oauth_states (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          state TEXT NOT NULL UNIQUE,
          provider TEXT NOT NULL,
          expiresAt INTEGER NOT NULL,
          createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      result.tablesCreated.push('oauth_states');
      logger.debug('Created table: oauth_states', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table oauth_states already exists', { context: 'database.migration' });
    }

    // Create notifications table (if not exists already)
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          read INTEGER DEFAULT 0,
          readAt INTEGER,
          timestamp INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      result.tablesCreated.push('notifications');
      logger.debug('Created table: notifications', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table notifications already exists', { context: 'database.migration' });
    }

    // Create indexes
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_critical_signal_alerts_userId ON critical_signal_alerts(userId);
        CREATE INDEX IF NOT EXISTS idx_critical_signal_alerts_signalType ON critical_signal_alerts(signalType);
        CREATE INDEX IF NOT EXISTS idx_critical_signal_alerts_severity ON critical_signal_alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_critical_signal_alerts_timestamp ON critical_signal_alerts(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_oauth_states_userId ON oauth_states(userId);
        CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
        CREATE INDEX IF NOT EXISTS idx_oauth_states_expiresAt ON oauth_states(expiresAt);
        CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);
      `);
      result.indexesCreated.push(
        'idx_critical_signal_alerts_userId',
        'idx_critical_signal_alerts_signalType',
        'idx_critical_signal_alerts_severity',
        'idx_critical_signal_alerts_timestamp',
        'idx_oauth_states_userId',
        'idx_oauth_states_state',
        'idx_oauth_states_expiresAt',
        'idx_notifications_userId',
        'idx_notifications_type',
        'idx_notifications_timestamp'
      );
      logger.debug('Created indexes for alert/oauth tables', { context: 'database.migration' });
    } catch (error) {
      logger.warn('Error creating indexes', { context: 'database.migration', metadata: { error } });
    }

    result.duration = Date.now() - startTime;
    logger.info('Migration 022 completed successfully', {
      context: 'database.migration',
      metadata: result as unknown as Record<string, unknown>
    });
    return result;
  } catch (error) {
    result.success = false;
    result.duration = Date.now() - startTime;
    result.errors.push(error instanceof Error ? error.message : String(error));

    logger.error('Migration 022 failed', {
      context: 'database.migration',
      metadata: { error, result }
    });
    return result;
  }
};

export default migrate_022_critical_signals_oauth;

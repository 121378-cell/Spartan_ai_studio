/**
 * Database Migration 020: Terra Integration
 * 
 * Creates tables for Terra API unified wearable integration:
 * - terra_devices: Connected devices via Terra API
 * - terra_webhooks_log: Webhook events received from Terra
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

export const migrate_020_terra_integration = (db: DatabaseType): MigrationResult => {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: true,
    tablesCreated: [],
    indexesCreated: [],
    errors: [],
    duration: 0
  };

  try {
    logger.info('Starting migration 020: Terra integration', {
      context: 'database.migration'
    });

    // Create terra_devices table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS terra_devices (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          terraUserId TEXT NOT NULL UNIQUE,
          dataProvider TEXT NOT NULL,
          deviceModel TEXT,
          lastWebhookUpdate INTEGER,
          disconnectReason TEXT,
          isActive INTEGER DEFAULT 1,
          metadata TEXT,
          createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          updatedAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      result.tablesCreated.push('terra_devices');
      logger.debug('Created table: terra_devices', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table terra_devices already exists', { context: 'database.migration' });
    }

    // Create terra_webhooks_log table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS terra_webhooks_log (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          eventType TEXT NOT NULL,
          dataType TEXT,
          webookPayload TEXT,
          processed INTEGER DEFAULT 0,
          processedAt INTEGER,
          error TEXT,
          timestamp INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      result.tablesCreated.push('terra_webhooks_log');
      logger.debug('Created table: terra_webhooks_log', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table terra_webhooks_log already exists', { context: 'database.migration' });
    }

    // Create indexes
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_terra_devices_userId ON terra_devices(userId);
        CREATE INDEX IF NOT EXISTS idx_terra_devices_terraUserId ON terra_devices(terraUserId);
        CREATE INDEX IF NOT EXISTS idx_terra_webhooks_log_userId ON terra_webhooks_log(userId);
        CREATE INDEX IF NOT EXISTS idx_terra_webhooks_log_eventType ON terra_webhooks_log(eventType);
        CREATE INDEX IF NOT EXISTS idx_terra_webhooks_log_timestamp ON terra_webhooks_log(timestamp DESC);
      `);
      result.indexesCreated.push(
        'idx_terra_devices_userId',
        'idx_terra_devices_terraUserId',
        'idx_terra_webhooks_log_userId',
        'idx_terra_webhooks_log_eventType',
        'idx_terra_webhooks_log_timestamp'
      );
      logger.debug('Created indexes for Terra tables', { context: 'database.migration' });
    } catch (error) {
      logger.warn('Error creating indexes', { context: 'database.migration', metadata: { error } });
    }

    result.duration = Date.now() - startTime;
    logger.info('Migration 020 completed successfully', {
      context: 'database.migration',
      metadata: result as unknown as Record<string, unknown>
    });
    return result;
  } catch (error) {
    result.success = false;
    result.duration = Date.now() - startTime;
    result.errors.push(error instanceof Error ? error.message : String(error));

    logger.error('Migration 020 failed', {
      context: 'database.migration',
      metadata: { error, result }
    });
    return result;
  }
};

export default migrate_020_terra_integration;

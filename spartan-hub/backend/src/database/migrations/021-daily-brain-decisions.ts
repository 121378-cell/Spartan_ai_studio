/**
 * Database Migration 021: Daily Brain Decisions
 * 
 * Creates tables for the Brain Orchestrator daily decision cycle:
 * - daily_brain_decisions: Records of brain evaluations and decisions
 * - plan_modifications_log: Track all plan adjustments applied
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

export const migrate_021_daily_brain_decisions = (db: DatabaseType): MigrationResult => {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: true,
    tablesCreated: [],
    indexesCreated: [],
    errors: [],
    duration: 0
  };

  try {
    logger.info('Starting migration 021: Daily brain decisions', {
      context: 'database.migration'
    });

    // Create daily_brain_decisions table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS daily_brain_decisions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          date TEXT NOT NULL,
          decisionType TEXT NOT NULL,
          context TEXT NOT NULL,
          recommendations TEXT,
          appliedChanges TEXT,
          confidence REAL,
          userApprovalStatus TEXT DEFAULT 'auto_applied',
          modificationReason TEXT,
          actualOutcome TEXT,
          feedbackScore REAL,
          feedbackTimestamp INTEGER,
          timestamp INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(userId, date, decisionType)
        )
      `);
      result.tablesCreated.push('daily_brain_decisions');
      logger.debug('Created table: daily_brain_decisions', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table daily_brain_decisions already exists', { context: 'database.migration' });
    }

    // Create plan_modifications_log table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS plan_modifications_log (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          decisionId TEXT NOT NULL,
          planId TEXT NOT NULL,
          modificationType TEXT NOT NULL,
          previousValue TEXT,
          newValue TEXT,
          reason TEXT,
          confidence REAL,
          reversible INTEGER DEFAULT 1,
          appliedStatus TEXT DEFAULT 'applied',
          appliedAt INTEGER,
          userFeedback TEXT,
          feedbackTimestamp INTEGER,
          timestamp INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(decisionId) REFERENCES daily_brain_decisions(id) ON DELETE CASCADE,
          FOREIGN KEY(planId) REFERENCES training_plans(id) ON DELETE CASCADE
        )
      `);
      result.tablesCreated.push('plan_modifications_log');
      logger.debug('Created table: plan_modifications_log', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table plan_modifications_log already exists', { context: 'database.migration' });
    }

    // Create feedback_learning table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS feedback_learning (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          decisionId TEXT NOT NULL,
          feedbackType TEXT NOT NULL,
          feedbackValue REAL,
          feedbackComment TEXT,
          improvedMetrics TEXT,
          timestamp INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(decisionId) REFERENCES daily_brain_decisions(id) ON DELETE CASCADE
        )
      `);
      result.tablesCreated.push('feedback_learning');
      logger.debug('Created table: feedback_learning', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table feedback_learning already exists', { context: 'database.migration' });
    }

    // Create indexes
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_daily_brain_decisions_userId ON daily_brain_decisions(userId);
        CREATE INDEX IF NOT EXISTS idx_daily_brain_decisions_date ON daily_brain_decisions(date DESC);
        CREATE INDEX IF NOT EXISTS idx_daily_brain_decisions_userId_date ON daily_brain_decisions(userId, date DESC);
        CREATE INDEX IF NOT EXISTS idx_plan_modifications_log_userId ON plan_modifications_log(userId);
        CREATE INDEX IF NOT EXISTS idx_plan_modifications_log_decisionId ON plan_modifications_log(decisionId);
        CREATE INDEX IF NOT EXISTS idx_plan_modifications_log_planId ON plan_modifications_log(planId);
        CREATE INDEX IF NOT EXISTS idx_feedback_learning_userId ON feedback_learning(userId);
        CREATE INDEX IF NOT EXISTS idx_feedback_learning_decisionId ON feedback_learning(decisionId);
      `);
      result.indexesCreated.push(
        'idx_daily_brain_decisions_userId',
        'idx_daily_brain_decisions_date',
        'idx_daily_brain_decisions_userId_date',
        'idx_plan_modifications_log_userId',
        'idx_plan_modifications_log_decisionId',
        'idx_plan_modifications_log_planId',
        'idx_feedback_learning_userId',
        'idx_feedback_learning_decisionId'
      );
      logger.debug('Created indexes for brain decision tables', { context: 'database.migration' });
    } catch (error) {
      logger.warn('Error creating indexes', { context: 'database.migration', metadata: { error } });
    }

    result.duration = Date.now() - startTime;
    logger.info('Migration 021 completed successfully', {
      context: 'database.migration',
      metadata: result as unknown as Record<string, unknown>
    });
    return result;
  } catch (error) {
    result.success = false;
    result.duration = Date.now() - startTime;
    result.errors.push(error instanceof Error ? error.message : String(error));

    logger.error('Migration 021 failed', {
      context: 'database.migration',
      metadata: { error, result }
    });
    return result;
  }
};

export default migrate_021_daily_brain_decisions;

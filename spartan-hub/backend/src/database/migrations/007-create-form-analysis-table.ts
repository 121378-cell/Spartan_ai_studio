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
 * Execute migration to create form_analyses table
 */
export const migrate_007_create_form_analysis_table = (db: DatabaseType): MigrationResult => {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: true,
    tablesCreated: [],
    indexesCreated: [],
    errors: [],
    duration: 0
  };

  try {
    logger.info('Starting migration 007: Create form_analyses table', {
      context: 'database.migration'
    });

    // Create form_analyses table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS form_analyses (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          exerciseType TEXT NOT NULL,
          formScore INTEGER NOT NULL,
          metrics TEXT NOT NULL, -- JSON string
          warnings TEXT NOT NULL, -- JSON string
          recommendations TEXT NOT NULL, -- JSON string
          createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      result.tablesCreated.push('form_analyses');
      logger.debug('Created table: form_analyses', { context: 'database.migration' });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
      logger.debug('Table form_analyses already exists', { context: 'database.migration' });
    }

    // Create performance indexes
    const indexes = [
      {
        name: 'idx_form_analysis_user_created',
        query: `CREATE INDEX IF NOT EXISTS idx_form_analysis_user_created 
                ON form_analyses(userId, createdAt DESC)`
      },
      {
        name: 'idx_form_analysis_type',
        query: `CREATE INDEX IF NOT EXISTS idx_form_analysis_type 
                ON form_analyses(userId, exerciseType)`
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

    logger.info('Migration 007 completed successfully', {
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

    logger.error('Migration 007 failed', {
      context: 'database.migration',
      metadata: { error: errorMessage }
    });

    result.duration = Date.now() - startTime;
    return result;
  }
};

export default migrate_007_create_form_analysis_table;

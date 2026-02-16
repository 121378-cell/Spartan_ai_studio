/**
 * Database Initialization Module
 * 
 * Handles database setup, migration execution, and health checks
 * Runs on application startup to ensure schema is ready
 */

import DatabaseConstructor = require('better-sqlite3');
type DatabaseType = InstanceType<typeof DatabaseConstructor>;
type DatabaseWithTx = DatabaseType & {
  transaction: <T>(fn: (...args: any[]) => T) => (...args: any[]) => T;
};
type Statement = ReturnType<DatabaseType['prepare']>;
import * as path from 'path';
import * as fs from 'fs';
import logger from '../utils/logger';
import migrate_000_core_tables from './migrations/000-core-tables';
import migrate_001_create_biometric_tables from './migrations/001-create-biometric-tables';
import createAdvancedRAGTables from './migrations/003-advanced-rag-tables';
import createCoachVitalisTables from './migrations/004-coach-vitalis-tables';
import addStressLevelColumn from './migrations/005-add-stress-level';
import fixCoachVitalisColumns from './migrations/006-fix-coach-vitalis-columns';
import createFormAnalysisTable from './migrations/007-create-form-analysis-table';
import { up as createPlanAdjustmentTables } from './migrations/008-create-plan-adjustment-tables';
import { up as createEngagementEngineTables } from './migrations/009-create-engagement-engine-tables';
import { up as createCommunityFeaturesTables } from './migrations/010-create-community-features-tables';
import { up as createRetentionAnalyticsTables } from './migrations/011-create-retention-analytics-tables';
import { up as createFormAnalysisTablesNew } from './migrations/012-create-form-analysis-tables';
import { up as addInjuryRiskColumn } from './migrations/013-add-injury-risk-column';
import { up as createEnterpriseCoachTables } from './migrations/023-enterprise-coach-tables';
import migrate_021_daily_brain_decisions from './migrations/021-daily-brain-decisions';

export interface DatabaseInitOptions {
  dbPath?: string;
  readonly?: boolean;
  verbose?: boolean;
  timeout?: number;
}

export interface InitializationResult {
  success: boolean;
  initialized: boolean;
  schemaVersion: number;
  tablesCount: number;
  indexesCount: number;
  migrationsRun: string[];
  errors: string[];
  duration: number;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private db: DatabaseWithTx | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  private constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Get or create DatabaseManager singleton
   */
  static getInstance(dbPath?: string): DatabaseManager {
    const path_to_db = dbPath || process.env.DB_PATH || process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'spartan.db');

    if (!DatabaseManager.instance || (dbPath && DatabaseManager.instance.dbPath !== dbPath)) {
      if (DatabaseManager.instance) {
        DatabaseManager.instance.close();
      }
      DatabaseManager.instance = new DatabaseManager(path_to_db);
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection
   */
  async initialize(options: DatabaseInitOptions = {}): Promise<InitializationResult> {
    const startTime = Date.now();
    const result: InitializationResult = {
      success: false,
      initialized: false,
      schemaVersion: 0,
      tablesCount: 0,
      indexesCount: 0,
      migrationsRun: [],
      errors: [],
      duration: 0
    };

    try {
      logger.info('Initializing database', {
        context: 'database.init',
        metadata: { dbPath: this.dbPath }
      });

      // Create database directory if needed
      const dbDir = path.dirname(this.dbPath);
      if (this.dbPath !== ':memory:' && !fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.debug('Created database directory', {
          context: 'database.init',
          metadata: { directory: dbDir }
        });
      }

      // Create database connection synchronously
      const verboseOption = options.verbose ? (msg: unknown) => logger.debug(String(msg)) : undefined;
      this.db = new DatabaseConstructor(this.dbPath, {
        readonly: options.readonly || false,
        timeout: options.timeout || 10000, // Increased timeout for Windows stability
        verbose: verboseOption
      } as any) as DatabaseWithTx;

      logger.debug('Database connection established', {
        context: 'database.init',
        metadata: { dbPath: this.dbPath }
      });

      // Optimization for Windows and concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('foreign_keys = ON');

      this.initialized = true; // Mark as initialized (connected) so getDatabase works

      // Run core tables migration
      const coreMigrationResult = migrate_000_core_tables(this.db);
      if (!coreMigrationResult.success) {
        throw new Error(`Core migration failed: ${coreMigrationResult.errors.join(', ')}`);
      }
      result.migrationsRun.push('000-core-tables');

      // Run migrations
      const migrationResult = migrate_001_create_biometric_tables(this.db);

      if (!migrationResult.success) {
        throw new Error(`Migration failed: ${migrationResult.errors.join(', ')}`);
      }

      result.migrationsRun.push('001-create-biometric-tables');

      // Run Daily Brain Decisions migration early - needed for orchestrator
      const brainMigrationResult = migrate_021_daily_brain_decisions(this.db);
      if (brainMigrationResult.success) {
        result.migrationsRun.push('021-daily-brain-decisions');
      } else {
        logger.warn('Daily brain decisions migration failed', {
          context: 'database.init',
          metadata: { errors: brainMigrationResult.errors }
        });
      }

      // Run other functional migrations in try/catch to be resilient
      try {
        // Run advanced RAG tables migration
        createAdvancedRAGTables(this.db);
        result.migrationsRun.push('003-advanced-rag-tables');

        // Run Coach Vitalis tables migration
        createCoachVitalisTables(this.db);
        addStressLevelColumn(this.db);
        fixCoachVitalisColumns(this.db);
        result.migrationsRun.push('004-coach-vitalis-tables');
        result.migrationsRun.push('005-add-stress-level');
        result.migrationsRun.push('006-fix-coach-vitalis-columns');

        // Run Form Analysis table migration
        createFormAnalysisTable(this.db);
        result.migrationsRun.push('007-create-form-analysis-table');

        // Run Plan Adjustment tables migration
        await createPlanAdjustmentTables(this.db);
        result.migrationsRun.push('008-create-plan-adjustment-tables');

        // Run Engagement Engine tables migration
        await createEngagementEngineTables(this.db);
        result.migrationsRun.push('009-create-engagement-engine-tables');

        // Run Community Features tables migration
        await createCommunityFeaturesTables(this.db);
        result.migrationsRun.push('010-create-community-features-tables');

        // Run Retention Analytics tables migration
        await createRetentionAnalyticsTables(this.db);
        result.migrationsRun.push('011-create-retention-analytics-tables');

        // Run New Form Analysis tables migration
        await createFormAnalysisTablesNew(this.db);
        result.migrationsRun.push('012-create-form-analysis-tables');

        // Add injury risk column
        await addInjuryRiskColumn(this.db);
        result.migrationsRun.push('013-add-injury-risk-column');

        // Run Enterprise Coach Dashboard tables migration
        await createEnterpriseCoachTables(this.db);
        result.migrationsRun.push('023-enterprise-coach-tables');

      } catch (migrationError) {
        logger.warn('Some optional database migrations had issues', {
          context: 'database.init',
          metadata: {
            error: migrationError instanceof Error ? migrationError.message : String(migrationError)
          }
        });
      }

      // Verify tables
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as any[];

      result.tablesCount = tables.length;

      // Verify indexes
      const indexes = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all() as any[];

      result.indexesCount = indexes.length;

      logger.info('Database initialization successful', {
        context: 'database.init',
        metadata: {
          tablesCount: result.tablesCount,
          indexesCount: result.indexesCount,
          migrationsRun: result.migrationsRun
        }
      });

      result.success = true;
      result.initialized = true;
      result.schemaVersion = 1;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);

      logger.error('Database initialization failed', {
        context: 'database.init',
        metadata: { error: errorMessage }
      });

      this.close();
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    connected: boolean;
    tables: number;
    errors: string[];
  }> {
    const result = {
      healthy: true,
      connected: false,
      tables: 0,
      errors: [] as string[]
    };

    try {
      if (!this.db) {
        result.errors.push('Database not initialized');
        result.healthy = false;
        return result;
      }

      // Test connection
      this.db.prepare('SELECT 1').get();
      result.connected = true;

      // Count tables
      const tables = this.db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).get() as any;

      result.tables = tables.count;

      logger.debug('Database health check passed', {
        context: 'database.health',
        metadata: { tables: result.tables }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      result.healthy = false;

      logger.error('Database health check failed', {
        context: 'database.health',
        metadata: { error: errorMessage }
      });
    }

    return result;
  }

  /**
   * Get database instance
   */
  getDatabase(): DatabaseType {
    let isAlive = false;
    if (this.db) {
      try {
        this.db.pragma('schema_version');
        isAlive = true;
      } catch (e) {
        isAlive = false;
      }
    }

    if (!this.db || !isAlive) {
      // If not connected or closed, try to connect quickly if we have a path
      if (this.dbPath) {
        logger.debug('Re-opening database connection', { 
          context: 'database.getDatabase', 
          metadata: { dbPath: this.dbPath } 
        });
        this.db = new DatabaseConstructor(this.testNormalizePath(this.dbPath), {
          timeout: 10000
        } as any) as DatabaseWithTx;
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('foreign_keys = ON');
        this.initialized = true;
        return this.db;
      }
      throw new Error('Database not connected and no path available.');
    }
    return this.db;
  }

  /**
   * Helper to normalize path for better-sqlite3
   */
  private testNormalizePath(dbPath: string): string {
    return dbPath === ':memory:' ? dbPath : path.resolve(dbPath);
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      try {
        this.db.close();
        logger.info('Database connection closed', { context: 'database.close' });
      } catch (error) {
        logger.error('Error closing database', {
          context: 'database.close',
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
      }
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Execute SQL query
   */
  exec(sql: string): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.exec(sql);
  }

  /**
   * Prepare and execute statement
   */
  prepare(sql: string): Statement {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql);
  }

  /**
   * Start transaction
   */
  transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.transaction(fn)();
  }
}

/**
 * Initialize database globally
 */
export async function initializeDatabase(
  options: DatabaseInitOptions = {}
): Promise<InitializationResult> {
  return DatabaseManager.getInstance(options.dbPath).initialize(options);
}

/**
 * Get database instance
 */
export function getDatabase(dbPath?: string): DatabaseType {
  const manager = DatabaseManager.getInstance(dbPath);
  return manager.getDatabase();
}

/**
 * Get database manager
 */
export function getDatabaseManager(dbPath?: string): DatabaseManager {
  return DatabaseManager.getInstance(dbPath);
}

export default DatabaseManager;

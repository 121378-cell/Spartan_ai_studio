/**
 * Database Backup & Recovery Module
 * 
 * Handles automated backups, recovery procedures, and data integrity verification
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

export interface BackupOptions {
  backupDir?: string;
  retain?: number;  // Number of backups to keep
  compress?: boolean;
  timestamp?: boolean;
}

export interface BackupResult {
  success: boolean;
  backupPath: string;
  timestamp: number;
  size: number;
  errors: string[];
  duration: number;
}

export interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  recovered_at: number;
  errors: string[];
  duration: number;
}

export interface IntegrityCheckResult {
  healthy: boolean;
  errors: string[];
  warnings: string[];
  tables: Array<{ name: string; integrity: string }>;
  duration: number;
}

class BackupManager {
  private db: DatabaseType;
  private backupDir: string;

  constructor(db: DatabaseType, backupDir: string = 'data/backups') {
    this.db = db;
    this.backupDir = backupDir;

    // Create backup directory if needed
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  }

  /**
   * Create database backup
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    const startTime = Date.now();
    const result: BackupResult = {
      success: false,
      backupPath: '',
      timestamp: Date.now(),
      size: 0,
      errors: [],
      duration: 0
    };

    try {
      logger.info('Starting database backup', { context: 'database.backup' });

      const backupDir = options.backupDir || this.backupDir;
      const timestamp = options.timestamp !== false ? `_${Date.now()}` : '';
      const ext = options.compress ? '.db.gz' : '.db';
      const backupPath = path.join(backupDir, `spartan-hub-backup${timestamp}${ext}`);

      // Create backup using SQLite backup mechanism
      const stmt = this.db.prepare(`
        PRAGMA integrity_check
      `);

      const backupDb = new Database(backupPath);

      try {
        // Copy database using backup API
        await this.db.backup(backupPath);

        backupDb.close();

        // Get backup file size
        const stats = fs.statSync(backupPath);
        result.size = stats.size;
        result.backupPath = backupPath;
        result.success = true;

        logger.info('Database backup completed', {
          context: 'database.backup',
          metadata: {
            backupPath,
            size: `${(result.size / 1024 / 1024).toFixed(2)} MB`
          }
        });

        // Cleanup old backups if retain option is set
        if (options.retain) {
          await this.cleanupOldBackups(backupDir, options.retain);
        }
      } catch (error) {
        backupDb.close();
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);

      logger.error('Database backup failed', {
        context: 'database.backup',
        metadata: { error: errorMessage }
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(backupPath: string): Promise<RecoveryResult> {
    const startTime = Date.now();
    const result: RecoveryResult = {
      success: false,
      recovered: false,
      recovered_at: 0,
      errors: [],
      duration: 0
    };

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      logger.info('Starting database recovery', {
        context: 'database.recovery',
        metadata: { backupPath }
      });

      // Create temporary backup of current database
      const currentDbPath = this.db.name;
      const tempPath = `${currentDbPath}.temp_backup`;

      fs.copyFileSync(currentDbPath, tempPath);

      try {
        // Restore from backup
        const backupDb = new Database(backupPath);
        const currentDb = this.db;

        // Use backup API to restore
        await backupDb.backup(currentDbPath);

        backupDb.close();

        // Verify integrity after restore
        const integrityCheck = await this.verifyIntegrity();
        if (!integrityCheck.healthy) {
          throw new Error('Restored database failed integrity check');
        }

        result.recovered = true;
        result.recovered_at = Date.now();
        result.success = true;

        // Cleanup temp backup
        fs.unlinkSync(tempPath);

        logger.info('Database recovery completed', {
          context: 'database.recovery',
          metadata: { backupPath }
        });
      } catch (error) {
        // Restore original database
        fs.copyFileSync(tempPath, currentDbPath);
        fs.unlinkSync(tempPath);
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);

      logger.error('Database recovery failed', {
        context: 'database.recovery',
        metadata: { error: errorMessage }
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Verify database integrity
   */
  async verifyIntegrity(): Promise<IntegrityCheckResult> {
    const startTime = Date.now();
    const result: IntegrityCheckResult = {
      healthy: true,
      errors: [],
      warnings: [],
      tables: [],
      duration: 0
    };

    try {
      logger.debug('Starting database integrity check', {
        context: 'database.integrity'
      });

      // Run PRAGMA integrity_check
      const integrityCheck = this.db.prepare('PRAGMA integrity_check').all() as any[];

      if (integrityCheck.length > 1 || integrityCheck[0]?.integrity !== 'ok') {
        result.healthy = false;
        result.errors.push(
          `Database integrity check failed: ${ 
            JSON.stringify(integrityCheck)}`
        );
      }

      // Check individual tables
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as any[];

      for (const table of tables) {
        const tableIntegrity = this.db.prepare(
          `PRAGMA integrity_check(${table.name})`
        ).all() as any[];

        result.tables.push({
          name: table.name,
          integrity: tableIntegrity[0]?.integrity || 'unknown'
        });

        if (tableIntegrity[0]?.integrity !== 'ok') {
          result.healthy = false;
          result.warnings.push(`Table ${table.name} has integrity issues`);
        }
      }

      // Check foreign keys
      const foreignKeyCheck = this.db.prepare('PRAGMA foreign_key_check').all() as any[];
      if (foreignKeyCheck.length > 0) {
        result.warnings.push(`Foreign key violations detected: ${foreignKeyCheck.length}`);
      }

      logger.info('Database integrity check completed', {
        context: 'database.integrity',
        metadata: {
          healthy: result.healthy,
          tables: result.tables.length,
          warnings: result.warnings.length
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      result.healthy = false;

      logger.error('Database integrity check failed', {
        context: 'database.integrity',
        metadata: { error: errorMessage }
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Optimize database
   */
  async optimize(): Promise<{ success: boolean; duration: number; errors: string[] }> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      logger.info('Starting database optimization', { context: 'database.optimize' });

      // VACUUM compacts the database file
      this.db.exec('VACUUM');

      // ANALYZE updates statistics for query planner
      this.db.exec('ANALYZE');

      logger.info('Database optimization completed', {
        context: 'database.optimize',
        metadata: { duration: `${Date.now() - startTime}ms` }
      });

      return {
        success: true,
        duration: Date.now() - startTime,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      logger.error('Database optimization failed', {
        context: 'database.optimize',
        metadata: { error: errorMessage }
      });

      return {
        success: false,
        duration: Date.now() - startTime,
        errors
      };
    }
  }

  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(backupDir: string, retain: number): Promise<void> {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('spartan-hub-backup') && f.endsWith('.db'))
        .map(f => ({
          file: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);

      for (let i = retain; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
        logger.debug('Deleted old backup', {
          context: 'database.backup',
          metadata: { file: files[i].file }
        });
      }
    } catch (error) {
      logger.warn('Failed to cleanup old backups', {
        context: 'database.backup',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * List available backups
   */
  listBackups(): Array<{ name: string; path: string; size: number; created: number }> {
    try {
      return fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('spartan-hub-backup') && (f.endsWith('.db') || f.endsWith('.db.gz')))
        .map(f => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            name: f,
            path: filePath,
            size: stats.size,
            created: stats.mtimeMs
          };
        })
        .sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Failed to list backups', {
        context: 'database.backup',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      return [];
    }
  }
}

export default BackupManager;

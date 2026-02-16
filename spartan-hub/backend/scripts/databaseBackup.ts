/**
 * Database Backup Script
 * Implements automated database backup strategy with retention policies
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const Database = require('better-sqlite3');
type DatabaseType = any;
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import dotenv from 'dotenv';
import { logger } from '../src/utils/logger';

const execAsync = promisify(exec);
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Load environment variables
dotenv.config();

// Get database path directly
const usePostgres = process.env.DATABASE_TYPE === 'postgres';

// Database file path (used for SQLite only)
let dbPath = '';
if (!usePostgres) {
  // Use the same path as the main application
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Database file path
  dbPath = path.join(dbDir, 'spartan.db');
  
  // Check if database file exists in current working directory first
  if (!fs.existsSync(dbPath)) {
    // Try alternative locations
    const altDbPath1 = path.join(process.cwd(), '..', 'data', 'spartan.db');
    const altDbPath2 = path.join(__dirname, '..', '..', 'data', 'spartan.db');
    
    if (fs.existsSync(altDbPath1)) {
      dbPath = altDbPath1;
    } else if (fs.existsSync(altDbPath2)) {
      dbPath = altDbPath2;
    } else {
      // If no existing database found, create a new one at the primary location
      logger.info('Creating new database at: ' + dbPath, { context: 'backup' });
    }
  }
}

interface BackupConfig {
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  backupDir: string;
  compress: boolean;
}

export class DatabaseBackup {
  private config: BackupConfig;
  private usePostgres: boolean;

  constructor() {
    this.config = {
      retention: {
        daily: parseInt(process.env.BACKUP_RETENTION_DAILY || '7', 10),
        weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY || '4', 10),
        monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY || '12', 10),
      },
      backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../../backups'),
      compress: process.env.BACKUP_COMPRESS !== 'false',
    };

    this.usePostgres = process.env.DATABASE_TYPE === 'postgres';
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      logger.info(`Created backup directory: ${this.config.backupDir}`);
    }
  }

  /**
   * Create a backup of the database
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${this.usePostgres ? 'postgres' : 'sqlite'}_${timestamp}.db${this.config.compress ? '.gz' : ''}`;
    const backupPath = path.join(this.config.backupDir, fileName);

    try {
      if (this.usePostgres) {
        await this.createPostgresBackup(backupPath);
      } else {
        await this.createSqliteBackup(backupPath);
      }

      // Verify backup integrity
      const isVerified = await this.verifyBackup(backupPath);
      
      if (!isVerified) {
        throw new Error(`Backup verification failed for: ${backupPath}`);
      }

      logger.info('Database backup completed successfully', {
        context: 'backup',
        metadata: {
          backupPath,
          databaseType: this.usePostgres ? 'PostgreSQL' : 'SQLite',
          timestamp
        }
      });

      // Apply retention policy
      await this.applyRetentionPolicy();

      return backupPath;
    } catch (error) {
      logger.error('Database backup failed', {
        context: 'backup',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          backupPath
        }
      });
      throw error;
    }
  }

  /**
   * Create SQLite backup
   */
  private async createSqliteBackup(backupPath: string): Promise<void> {
    // Initialize database connection directly
    let sqliteDb: DatabaseType;
    
    try {
      // Check if database file exists before opening
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file does not exist: ${dbPath}`);
      }
      
      sqliteDb = new Database(dbPath, {
        readonly: true, // Open in read-only mode to avoid conflicts
      });
    } catch (error) {
      throw new Error(`Failed to open database for backup: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      // If compression is enabled, we need to create a temporary file first
      if (this.config.compress) {
        const tempPath = backupPath.replace('.gz', '');
        
        // Perform the backup (async operation)
        await sqliteDb.backup(tempPath);
        
        // Verify the temporary file was created successfully
        if (!fs.existsSync(tempPath)) {
          throw new Error(`Backup file was not created at: ${tempPath}`);
        }
        
        // Read the temporary file and compress it
        const data = fs.readFileSync(tempPath);
        const compressedData = await gzip(data);
        fs.writeFileSync(backupPath, compressedData);
        
        // Remove the temporary uncompressed file
        fs.unlinkSync(tempPath);
      } else {
        // Direct backup without compression (async operation)
        await sqliteDb.backup(backupPath);
      }
    } finally {
      // Always close the database connection
      sqliteDb.close();
    }
  }

  /**
   * Create PostgreSQL backup
   */
  private async createPostgresBackup(backupPath: string): Promise<void> {
    const pgHost = process.env.PGHOST || 'localhost';
    const pgPort = process.env.PGPORT || '5432';
    const pgDatabase = process.env.PGDATABASE || 'spartan_fitness';
    const pgUser = process.env.PGUSER || 'spartan_user';
    const pgPassword = process.env.PGPASSWORD || '';

    if (!pgPassword) {
      throw new Error('PGPASSWORD environment variable is required for PostgreSQL backup');
    }

    const pgDumpCmd = `pg_dump -h ${pgHost} -p ${pgPort} -U ${pgUser} -d ${pgDatabase} -f "${backupPath.replace('.gz', '')}"`;
    
    // Set password in environment for pg_dump
    const env = { ...process.env, PGPASSWORD: pgPassword };
    
    if (this.config.compress) {
      const tempPath = backupPath.replace('.gz', '');
      await execAsync(pgDumpCmd, { env });
      
      // Read the temporary file and compress it
      const data = fs.readFileSync(tempPath);
      const compressedData = await gzip(data);
      fs.writeFileSync(backupPath, compressedData);
      
      // Remove the temporary uncompressed file
      fs.unlinkSync(tempPath);
    } else {
      await execAsync(pgDumpCmd, { env });
    }
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      if (this.usePostgres) {
        // For PostgreSQL, we can check if the SQL file is valid by looking for basic SQL structure
        const backupContent = fs.readFileSync(backupPath.replace('.gz', this.config.compress ? '.sql' : ''), 'utf8');
        return backupContent.includes('SET') || backupContent.includes('CREATE') || backupContent.includes('INSERT');
      } else {
        // For SQLite, we can try to open the database
        let checkPath = backupPath;
        if (this.config.compress) {
          // For compressed files, we need to temporarily decompress to check
          const tempPath = backupPath.replace('.gz', '');
                  
          // Read the compressed file and decompress it
          const compressedData = fs.readFileSync(backupPath);
          const decompressedData = await gunzip(compressedData);
          fs.writeFileSync(tempPath, decompressedData);
                  
          // Verify it's a valid SQLite database
          const backupDb = new Database(tempPath);
          backupDb.prepare('SELECT 1').run();
          backupDb.close();
                  
          // Remove the temporary decompressed file
          fs.unlinkSync(tempPath);
        } else {
          const backupDb = new Database(checkPath);
          backupDb.prepare('SELECT 1').run();
          backupDb.close();
        }
        
        return true;
      }
    } catch (error) {
      logger.error('Backup verification failed', {
        context: 'backup',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          backupPath
        }
      });
      return false;
    }
  }

  /**
   * Apply retention policy to remove old backups
   */
  private async applyRetentionPolicy(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.backupDir)
        .filter(file => file.startsWith('backup_') && (file.endsWith('.db') || file.endsWith('.db.gz') || file.endsWith('.sql') || file.endsWith('.sql.gz')))
        .map(file => {
          const filePath = path.join(this.config.backupDir, file);
          const stat = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            birthTime: stat.birthtime,
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort by most recent first

      // Group files by type (daily, weekly, monthly)
      const now = new Date();
      const dailyBackups: typeof files = [];
      const weeklyBackups: typeof files = [];
      const monthlyBackups: typeof files = [];

      files.forEach(file => {
        const fileDate = new Date(file.mtime);
        const daysDiff = Math.floor((now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));

        // Monthly backups: keep one per month for the last 12 months
        if (daysDiff < this.config.retention.monthly * 30) {
          const monthKey = `${fileDate.getFullYear()}-${fileDate.getMonth()}`;
          const existingMonthly = monthlyBackups.find(b => {
            const bDate = new Date(b.mtime);
            return `${bDate.getFullYear()}-${bDate.getMonth()}` === monthKey;
          });
          
          if (!existingMonthly) {
            monthlyBackups.push(file);
          }
        }

        // Weekly backups: keep one per week for the last 4 weeks
        if (daysDiff < this.config.retention.weekly * 7) {
          const weekNumber = Math.floor(fileDate.getTime() / (1000 * 60 * 60 * 24 * 7));
          const existingWeekly = weeklyBackups.find(b => {
            const bDate = new Date(b.mtime);
            return Math.floor(bDate.getTime() / (1000 * 60 * 60 * 24 * 7)) === weekNumber;
          });
          
          if (!existingWeekly) {
            weeklyBackups.push(file);
          }
        }

        // Daily backups: keep the last N days
        if (daysDiff < this.config.retention.daily) {
          dailyBackups.push(file);
        }
      });

      // Delete files that exceed retention limits
      const filesToKeep = new Set([
        ...dailyBackups.map(f => f.name),
        ...weeklyBackups.map(f => f.name),
        ...monthlyBackups.map(f => f.name)
      ]);

      const filesToDelete = files.filter(f => !filesToKeep.has(f.name));

      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        logger.info(`Deleted old backup: ${file.name}`, {
          context: 'backup-retention'
        });
      }

      logger.info('Backup retention policy applied', {
        context: 'backup-retention',
        metadata: {
          totalBackups: files.length,
          backupsDeleted: filesToDelete.length,
          retention: this.config.retention
        }
      });
    } catch (error) {
      logger.error('Failed to apply retention policy', {
        context: 'backup-retention',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Get backup status and information
   */
  async getBackupStatus(): Promise<any> {
    try {
      const files = fs.readdirSync(this.config.backupDir)
        .filter(file => file.startsWith('backup_') && (file.endsWith('.db') || file.endsWith('.db.gz') || file.endsWith('.sql') || file.endsWith('.sql.gz')))
        .map(file => {
          const filePath = path.join(this.config.backupDir, file);
          const stat = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stat.size,
            createdAt: stat.birthtime,
            modifiedAt: stat.mtime
          };
        })
        .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

      return {
        totalBackups: files.length,
        latestBackup: files[0] || null,
        backups: files,
        retention: this.config.retention,
        backupDir: this.config.backupDir
      };
    } catch (error) {
      logger.error('Failed to get backup status', {
        context: 'backup-status',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    }
  }
}

/**
 * Backup Status Monitoring Script
 * Provides backup status information and health checks
 */

import { DatabaseBackup } from './databaseBackup';
import { logger } from '../src/utils/logger';

export class BackupStatus {
  private databaseBackup: DatabaseBackup;

  constructor() {
    this.databaseBackup = new DatabaseBackup();
  }

  /**
   * Get backup status information
   */
  async getBackupStatus(): Promise<any> {
    try {
      const status = await this.databaseBackup.getBackupStatus();
      
      if (!status) {
        throw new Error('Failed to retrieve backup status');
      }

      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get backup status', {
        context: 'backup-status',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if the latest backup is recent (within 24 hours for daily backup)
   */
  async isBackupHealthy(): Promise<boolean> {
    try {
      const status = await this.databaseBackup.getBackupStatus();
      
      if (!status || !status.latestBackup) {
        logger.warn('No backups found', {
          context: 'backup-health'
        });
        return false;
      }

      const latestBackupTime = new Date(status.latestBackup.modifiedAt).getTime();
      const currentTime = new Date().getTime();
      const timeDiffHours = (currentTime - latestBackupTime) / (1000 * 60 * 60);

      // Check if latest backup is within 25 hours (allowing for scheduling variance)
      const isRecent = timeDiffHours <= 25;
      
      logger.info('Backup health check completed', {
        context: 'backup-health',
        metadata: {
          isRecent,
          timeDiffHours,
          latestBackup: status.latestBackup.name
        }
      });

      return isRecent;
    } catch (error) {
      logger.error('Backup health check failed', {
        context: 'backup-health',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return false;
    }
  }

  /**
   * Generate backup report
   */
  async generateReport(): Promise<string> {
    try {
      const status = await this.databaseBackup.getBackupStatus();
      
      if (!status) {
        return 'Failed to generate backup report: Could not retrieve status';
      }

      const report = `
Backup Report - ${new Date().toISOString()}

Database Type: ${process.env.DATABASE_TYPE || 'sqlite'}
Backup Directory: ${status.backupDir}
Total Backups: ${status.totalBackups}

Retention Policy:
- Daily: Keep last ${status.retention.daily} days
- Weekly: Keep last ${status.retention.weekly} weeks  
- Monthly: Keep last ${status.retention.monthly} months

Latest Backup:
${status.latestBackup ? `- Name: ${status.latestBackup.name}
- Size: ${(status.latestBackup.size / (1024 * 1024)).toFixed(2)} MB
- Created: ${status.latestBackup.createdAt.toISOString()}
- Modified: ${status.latestBackup.modifiedAt.toISOString()}` : '- No backups found'}

All Backups:
${status.backups.map((backup: any) => `- ${backup.name} (${(backup.size / (1024 * 1024)).toFixed(2)} MB, ${backup.modifiedAt.toISOString()})`).join('\n')}
      `.trim();

      return report;
    } catch (error) {
      logger.error('Failed to generate backup report', {
        context: 'backup-report',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return `Failed to generate backup report: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
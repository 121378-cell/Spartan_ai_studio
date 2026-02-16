"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupStatus = void 0;
const databaseBackup_1 = require("./databaseBackup");
const logger_1 = require("../src/utils/logger");
class BackupStatus {
    databaseBackup;
    constructor() {
        this.databaseBackup = new databaseBackup_1.DatabaseBackup();
    }
    async getBackupStatus() {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get backup status', {
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
    async isBackupHealthy() {
        try {
            const status = await this.databaseBackup.getBackupStatus();
            if (!status || !status.latestBackup) {
                logger_1.logger.warn('No backups found', {
                    context: 'backup-health'
                });
                return false;
            }
            const latestBackupTime = new Date(status.latestBackup.modifiedAt).getTime();
            const currentTime = new Date().getTime();
            const timeDiffHours = (currentTime - latestBackupTime) / (1000 * 60 * 60);
            const isRecent = timeDiffHours <= 25;
            logger_1.logger.info('Backup health check completed', {
                context: 'backup-health',
                metadata: {
                    isRecent,
                    timeDiffHours,
                    latestBackup: status.latestBackup.name
                }
            });
            return isRecent;
        }
        catch (error) {
            logger_1.logger.error('Backup health check failed', {
                context: 'backup-health',
                metadata: {
                    error: error instanceof Error ? error.message : String(error)
                }
            });
            return false;
        }
    }
    async generateReport() {
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
${status.backups.map((backup) => `- ${backup.name} (${(backup.size / (1024 * 1024)).toFixed(2)} MB, ${backup.modifiedAt.toISOString()})`).join('\n')}
      `.trim();
            return report;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate backup report', {
                context: 'backup-report',
                metadata: {
                    error: error instanceof Error ? error.message : String(error)
                }
            });
            return `Failed to generate backup report: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
exports.BackupStatus = BackupStatus;
//# sourceMappingURL=backupStatus.js.map
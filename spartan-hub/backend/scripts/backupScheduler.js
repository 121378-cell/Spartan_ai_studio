"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupScheduler = void 0;
const cron = __importStar(require("node-cron"));
const logger_1 = require("../src/utils/logger");
const databaseBackup_1 = require("./databaseBackup");
class BackupScheduler {
    databaseBackup;
    scheduledTasks = [];
    constructor() {
        this.databaseBackup = new databaseBackup_1.DatabaseBackup();
    }
    start() {
        const dailyBackup = cron.schedule('0 2 * * *', async () => {
            logger_1.logger.info('Starting scheduled daily backup...', {
                context: 'backup-scheduler'
            });
            try {
                await this.databaseBackup.createBackup();
                logger_1.logger.info('Daily backup completed successfully', {
                    context: 'backup-scheduler'
                });
            }
            catch (error) {
                logger_1.logger.error('Daily backup failed', {
                    context: 'backup-scheduler',
                    metadata: {
                        error: error instanceof Error ? error.message : String(error)
                    }
                });
            }
        });
        const weeklyBackup = cron.schedule('0 3 * * 0', async () => {
            logger_1.logger.info('Starting scheduled weekly backup...', {
                context: 'backup-scheduler'
            });
            try {
                await this.databaseBackup.createBackup();
                logger_1.logger.info('Weekly backup completed successfully', {
                    context: 'backup-scheduler'
                });
            }
            catch (error) {
                logger_1.logger.error('Weekly backup failed', {
                    context: 'backup-scheduler',
                    metadata: {
                        error: error instanceof Error ? error.message : String(error)
                    }
                });
            }
        });
        const monthlyBackup = cron.schedule('0 4 1 * *', async () => {
            logger_1.logger.info('Starting scheduled monthly backup...', {
                context: 'backup-scheduler'
            });
            try {
                await this.databaseBackup.createBackup();
                logger_1.logger.info('Monthly backup completed successfully', {
                    context: 'backup-scheduler'
                });
            }
            catch (error) {
                logger_1.logger.error('Monthly backup failed', {
                    context: 'backup-scheduler',
                    metadata: {
                        error: error instanceof Error ? error.message : String(error)
                    }
                });
            }
        });
        this.scheduledTasks.push(dailyBackup, weeklyBackup, monthlyBackup);
        logger_1.logger.info('Backup scheduler started successfully', {
            context: 'backup-scheduler',
            metadata: {
                tasks: this.scheduledTasks.length,
                schedules: [
                    'Daily: 0 2 * * * (2:00 AM)',
                    'Weekly: 0 3 * * 0 (Sunday 3:00 AM)',
                    'Monthly: 0 4 1 * * (1st of month 4:00 AM)'
                ]
            }
        });
    }
    stop() {
        this.scheduledTasks.forEach(task => {
            task.stop();
        });
        this.scheduledTasks = [];
        logger_1.logger.info('Backup scheduler stopped', {
            context: 'backup-scheduler'
        });
    }
    getStatus() {
        return {
            runningTasks: this.scheduledTasks.length,
            tasks: this.scheduledTasks.map((_, index) => ({
                id: index,
                status: 'active',
                cronPattern: [
                    '0 2 * * *',
                    '0 3 * * 0',
                    '0 4 1 * *'
                ][index]
            }))
        };
    }
}
exports.BackupScheduler = BackupScheduler;
//# sourceMappingURL=backupScheduler.js.map
/**
 * Backup Scheduler Service
 * Schedules automated database backups using cron
 */

import * as cron from 'node-cron';
import { logger } from '../src/utils/logger';
import { DatabaseBackup } from './databaseBackup';

export class BackupScheduler {
  private databaseBackup: DatabaseBackup;
  private scheduledTasks: cron.ScheduledTask[] = [];

  constructor() {
    this.databaseBackup = new DatabaseBackup();
  }

  /**
   * Start the backup scheduler
   */
  start(): void {
    // Schedule daily backup at 2:00 AM
    const dailyBackup = cron.schedule('0 2 * * *', async () => {
      logger.info('Starting scheduled daily backup...', {
        context: 'backup-scheduler'
      });
      
      try {
        await this.databaseBackup.createBackup();
        logger.info('Daily backup completed successfully', {
          context: 'backup-scheduler'
        });
      } catch (error) {
        logger.error('Daily backup failed', {
          context: 'backup-scheduler',
          metadata: {
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }); // Remove the options object that was causing the error

    // Schedule weekly backup (Sunday at 3:00 AM)
    const weeklyBackup = cron.schedule('0 3 * * 0', async () => {
      logger.info('Starting scheduled weekly backup...', {
        context: 'backup-scheduler'
      });
      
      try {
        await this.databaseBackup.createBackup();
        logger.info('Weekly backup completed successfully', {
          context: 'backup-scheduler'
        });
      } catch (error) {
        logger.error('Weekly backup failed', {
          context: 'backup-scheduler',
          metadata: {
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    });

    // Schedule monthly backup (1st of month at 4:00 AM)
    const monthlyBackup = cron.schedule('0 4 1 * *', async () => {
      logger.info('Starting scheduled monthly backup...', {
        context: 'backup-scheduler'
      });
      
      try {
        await this.databaseBackup.createBackup();
        logger.info('Monthly backup completed successfully', {
          context: 'backup-scheduler'
        });
      } catch (error) {
        logger.error('Monthly backup failed', {
          context: 'backup-scheduler',
          metadata: {
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    });

    // Add all tasks to the array
    this.scheduledTasks.push(dailyBackup, weeklyBackup, monthlyBackup);

    logger.info('Backup scheduler started successfully', {
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

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    this.scheduledTasks.forEach(task => {
      task.stop();
    });
    
    this.scheduledTasks = [];
    
    logger.info('Backup scheduler stopped', {
      context: 'backup-scheduler'
    });
  }

  /**
   * Get scheduler status
   */
  getStatus(): any {
    return {
      runningTasks: this.scheduledTasks.length,
      tasks: this.scheduledTasks.map((_, index) => ({
        id: index,
        status: 'active',
        cronPattern: [
          '0 2 * * *', // daily
          '0 3 * * 0', // weekly
          '0 4 1 * *'  // monthly
        ][index]
      }))
    };
  }
}
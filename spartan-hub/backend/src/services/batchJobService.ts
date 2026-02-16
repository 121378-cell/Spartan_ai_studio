/**
 * Batch Job Service
 * 
 * Manages scheduled batch processing jobs for:
 * - Daily analytics computation
 * - Cache pre-warming
 * - Database maintenance
 * 
 * Uses cron scheduling with queue management and retry logic
 */

import cron, { ScheduledTask } from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ReadinessAnalyticsService } from './readinessAnalyticsService';
import { CacheService, getCacheService } from './cacheService';
import db from '../config/database';

export interface BatchJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  rowsProcessed: number;
  retryCount: number;
  maxRetries: number;
}

export interface BatchJobConfig {
  enableDailyAnalytics: boolean;
  enableCacheWarming: boolean;
  enableDatabaseMaintenance: boolean;
  analyticsSchedule: string; // Cron expression
  cacheWarmingSchedule: string;
  maintenanceSchedule: string;
  maxConcurrentJobs: number;
  defaultMaxRetries: number;
}

export class BatchJobService {
  private jobs: Map<string, ScheduledTask> = new Map();
  private activeJobs: Map<string, BatchJob> = new Map();
  private config: BatchJobConfig;
  private analyticsService: ReadinessAnalyticsService;
  private cacheService: CacheService;

  constructor(config?: Partial<BatchJobConfig>) {
    this.config = {
      enableDailyAnalytics: config?.enableDailyAnalytics ?? process.env.BATCH_DAILY_ANALYTICS !== 'false',
      enableCacheWarming: config?.enableCacheWarming ?? process.env.BATCH_CACHE_WARMING !== 'false',
      enableDatabaseMaintenance: config?.enableDatabaseMaintenance ?? process.env.BATCH_DB_MAINTENANCE !== 'false',
      analyticsSchedule: config?.analyticsSchedule ?? process.env.BATCH_SCHEDULE_ANALYTICS ?? '0 2 * * *', // 2 AM daily
      cacheWarmingSchedule: config?.cacheWarmingSchedule ?? process.env.BATCH_SCHEDULE_CACHE ?? '0 * * * *', // Hourly
      maintenanceSchedule: config?.maintenanceSchedule ?? process.env.BATCH_SCHEDULE_MAINTENANCE ?? '0 3 * * 0', // 3 AM Sundays
      maxConcurrentJobs: config?.maxConcurrentJobs ?? parseInt(process.env.BATCH_MAX_CONCURRENT ?? '5'),
      defaultMaxRetries: config?.defaultMaxRetries ?? parseInt(process.env.BATCH_RETRY_ATTEMPTS ?? '3'),
    };

    this.analyticsService = new ReadinessAnalyticsService();
    this.cacheService = getCacheService();
  }

  /**
   * Initialize and schedule all batch jobs
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing batch job service', {
        context: 'batchJob.init',
        metadata: {
          dailyAnalytics: this.config.enableDailyAnalytics,
          cacheWarming: this.config.enableCacheWarming,
          databaseMaintenance: this.config.enableDatabaseMaintenance,
        },
      });

      if (this.config.enableDailyAnalytics) {
        this.scheduleDailyAnalyticsJob();
      }

      if (this.config.enableCacheWarming) {
        this.scheduleCacheWarmingJob();
      }

      if (this.config.enableDatabaseMaintenance) {
        this.scheduleDatabaseMaintenanceJob();
      }

      logger.info('Batch job service initialized', {
        context: 'batchJob.init',
        metadata: { jobCount: this.jobs.size },
      });
    } catch (error) {
      logger.error('Failed to initialize batch job service', {
        context: 'batchJob.init',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  /**
   * Schedule daily analytics computation job
   */
  private scheduleDailyAnalyticsJob(): void {
    const task = cron.schedule(this.config.analyticsSchedule, () => {
      this.runDailyAnalyticsJob();
    });

    this.jobs.set('daily-analytics', task);

    logger.info('Daily analytics job scheduled', {
      context: 'batchJob.dailyAnalytics',
      metadata: { schedule: this.config.analyticsSchedule },
    });
  }

  /**
   * Schedule cache pre-warming job
   */
  private scheduleCacheWarmingJob(): void {
    const task = cron.schedule(this.config.cacheWarmingSchedule, () => {
      this.runCacheWarmingJob();
    });

    this.jobs.set('cache-warming', task);

    logger.info('Cache warming job scheduled', {
      context: 'batchJob.cacheWarming',
      metadata: { schedule: this.config.cacheWarmingSchedule },
    });
  }

  /**
   * Schedule database maintenance job
   */
  private scheduleDatabaseMaintenanceJob(): void {
    const task = cron.schedule(this.config.maintenanceSchedule, () => {
      this.runDatabaseMaintenanceJob();
    });

    this.jobs.set('db-maintenance', task);

    logger.info('Database maintenance job scheduled', {
      context: 'batchJob.dbMaintenance',
      metadata: { schedule: this.config.maintenanceSchedule },
    });
  }

  /**
   * Run daily analytics computation for all active users
   */
  private async runDailyAnalyticsJob(): Promise<void> {
    const jobId = uuidv4();
    const job: BatchJob = {
      id: jobId,
      type: 'daily-analytics',
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      rowsProcessed: 0,
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
    };

    this.activeJobs.set(jobId, job);

    try {
      logger.info('Starting daily analytics job', {
        context: 'batchJob.dailyAnalytics',
        metadata: { jobId },
      });

      if (!db || typeof db !== 'object' || 'type' in db) {
        throw new Error('Database not available');
      }
      const today = new Date().toISOString().split('T')[0];

      // Get all active users
      const users = db
        .prepare('SELECT DISTINCT user_id FROM biometric_data_points WHERE DATE(created_at) >= DATE(?, "-30 days")')
        .all(today) as Array<{ user_id: string }>;

      let successCount = 0;
      let failureCount = 0;

      for (const user of users) {
        try {
          // Compute today's analytics for each user
          await this.analyticsService.calculateRecoveryScore(user.user_id, today);
          await this.analyticsService.calculateReadinessScore(user.user_id, today);
          await this.analyticsService.analyzeTrends(user.user_id, 'hrv', 30);

          successCount++;
          job.rowsProcessed++;
        } catch (error) {
          failureCount++;
          logger.warn('Failed to compute analytics for user', {
            context: 'batchJob.dailyAnalytics',
            metadata: {
              jobId,
              userId: user.user_id,
              errorMessage: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();

      logger.info('Daily analytics job completed', {
        context: 'batchJob.dailyAnalytics',
        metadata: {
          jobId,
          processed: successCount,
          failed: failureCount,
          duration: new Date().getTime() - job.startedAt!.getTime(),
        },
      });
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      logger.error('Daily analytics job failed', {
        context: 'batchJob.dailyAnalytics',
        metadata: {
          jobId,
          errorMessage: job.errorMessage,
        },
      });

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        logger.info('Retrying daily analytics job', {
          context: 'batchJob.dailyAnalytics',
          metadata: {
            jobId,
            attempt: job.retryCount,
            maxRetries: job.maxRetries,
          },
        });

        // Retry after exponential backoff (30 seconds, 60 seconds, 120 seconds)
        setTimeout(() => this.runDailyAnalyticsJob(), Math.pow(2, job.retryCount) * 30000);
      }
    }

    this.activeJobs.delete(jobId);
  }

  /**
   * Run cache pre-warming job
   */
  private async runCacheWarmingJob(): Promise<void> {
    const jobId = uuidv4();
    const job: BatchJob = {
      id: jobId,
      type: 'cache-warming',
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      rowsProcessed: 0,
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
    };

    this.activeJobs.set(jobId, job);

    try {
      logger.info('Starting cache warming job', {
        context: 'batchJob.cacheWarming',
        metadata: { jobId },
      });

      if (!db || typeof db !== 'object' || 'type' in db) {
        throw new Error('Database not available');
      }
      const today = new Date().toISOString().split('T')[0];

      // Get top 100 most active users (by biometric data points in last 7 days)
      const topUsers = db
        .prepare(
          `
        SELECT user_id, COUNT(*) as data_points
        FROM biometric_data_points
        WHERE DATE(created_at) >= DATE(?, "-7 days")
        GROUP BY user_id
        ORDER BY data_points DESC
        LIMIT 100
      `
        )
        .all(today) as Array<{ user_id: string; data_points: number }>;

      for (const user of topUsers) {
        try {
          // Pre-compute and cache recovery scores
          const recoveryKey = `recovery_score:${user.user_id}:${today}`;
          const recovery = await this.analyticsService.calculateRecoveryScore(user.user_id, today);
          await this.cacheService.set(recoveryKey, recovery, 'recovery_score');

          // Pre-compute and cache readiness scores
          const readinessKey = `readiness_score:${user.user_id}:${today}`;
          const readiness = await this.analyticsService.calculateReadinessScore(user.user_id, today);
          await this.cacheService.set(readinessKey, readiness, 'readiness_score');

          job.rowsProcessed++;
        } catch (error) {
          logger.debug('Cache warming skipped for user', {
            context: 'batchJob.cacheWarming',
            metadata: {
              jobId,
              userId: user.user_id,
              errorMessage: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();

      logger.info('Cache warming job completed', {
        context: 'batchJob.cacheWarming',
        metadata: {
          jobId,
          warmed: job.rowsProcessed,
          duration: new Date().getTime() - job.startedAt!.getTime(),
        },
      });
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      logger.error('Cache warming job failed', {
        context: 'batchJob.cacheWarming',
        metadata: {
          jobId,
          errorMessage: job.errorMessage,
        },
      });
    }

    this.activeJobs.delete(jobId);
  }

  /**
   * Run database maintenance job
   */
  private async runDatabaseMaintenanceJob(): Promise<void> {
    const jobId = uuidv4();
    const job: BatchJob = {
      id: jobId,
      type: 'db-maintenance',
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      rowsProcessed: 0,
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
    };

    this.activeJobs.set(jobId, job);

    try {
      logger.info('Starting database maintenance job', {
        context: 'batchJob.dbMaintenance',
        metadata: { jobId },
      });

      if (!db || typeof db !== 'object' || 'type' in db) {
        throw new Error('Database not available');
      }

      // Clean up old biometric data (>1 year)
      const deleteOldData = db.prepare(
        `
        DELETE FROM biometric_data_points
        WHERE DATE(created_at) < DATE('now', '-1 year')
      `
      );

      const deleteResult = deleteOldData.run();
      job.rowsProcessed += deleteResult.changes || 0;

      logger.info('Cleaned up old biometric data', {
        context: 'batchJob.dbMaintenance',
        metadata: {
          jobId,
          deletedRows: deleteResult.changes,
        },
      });

      // Optimize database if using SQLite
      try {
        db.prepare('VACUUM').run();
        logger.info('Database vacuumed', {
          context: 'batchJob.dbMaintenance',
          metadata: { jobId },
        });
      } catch (error) {
        logger.debug('VACUUM not supported (PostgreSQL)', {
          context: 'batchJob.dbMaintenance',
          metadata: { jobId },
        });
      }

      // Analyze tables for query optimization
      try {
        db.prepare('ANALYZE').run();
        logger.info('Database analyzed', {
          context: 'batchJob.dbMaintenance',
          metadata: { jobId },
        });
      } catch (error) {
        logger.debug('ANALYZE not supported', {
          context: 'batchJob.dbMaintenance',
          metadata: { jobId },
        });
      }

      job.status = 'completed';
      job.completedAt = new Date();

      logger.info('Database maintenance job completed', {
        context: 'batchJob.dbMaintenance',
        metadata: {
          jobId,
          rowsProcessed: job.rowsProcessed,
          duration: new Date().getTime() - job.startedAt!.getTime(),
        },
      });
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      logger.error('Database maintenance job failed', {
        context: 'batchJob.dbMaintenance',
        metadata: {
          jobId,
          errorMessage: job.errorMessage,
        },
      });
    }

    this.activeJobs.delete(jobId);
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): Array<{ name: string; schedule: string; enabled: boolean }> {
    return [
      {
        name: 'daily-analytics',
        schedule: this.config.analyticsSchedule,
        enabled: this.config.enableDailyAnalytics && this.jobs.has('daily-analytics'),
      },
      {
        name: 'cache-warming',
        schedule: this.config.cacheWarmingSchedule,
        enabled: this.config.enableCacheWarming && this.jobs.has('cache-warming'),
      },
      {
        name: 'db-maintenance',
        schedule: this.config.maintenanceSchedule,
        enabled: this.config.enableDatabaseMaintenance && this.jobs.has('db-maintenance'),
      },
    ];
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): BatchJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get job status by ID
   */
  getJobStatus(jobId: string): BatchJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'failed';
      job.errorMessage = 'Job cancelled by user';
      job.completedAt = new Date();
      this.activeJobs.delete(jobId);
      logger.info('Job cancelled', {
        context: 'batchJob.cancel',
        metadata: { jobId },
      });
      return true;
    }
    return false;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    for (const [name, task] of this.jobs.entries()) {
      task.stop();
      logger.info('Job stopped', {
        context: 'batchJob.stop',
        metadata: { jobName: name },
      });
    }
    this.jobs.clear();
  }

  /**
   * Get batch job service health status
   */
  async getHealth(): Promise<{
    active: boolean;
    jobCount: number;
    activeJobs: number;
    config: Partial<BatchJobConfig>;
  }> {
    return {
      active: this.jobs.size > 0,
      jobCount: this.jobs.size,
      activeJobs: this.activeJobs.size,
      config: {
        enableDailyAnalytics: this.config.enableDailyAnalytics,
        enableCacheWarming: this.config.enableCacheWarming,
        enableDatabaseMaintenance: this.config.enableDatabaseMaintenance,
        analyticsSchedule: this.config.analyticsSchedule,
        cacheWarmingSchedule: this.config.cacheWarmingSchedule,
        maintenanceSchedule: this.config.maintenanceSchedule,
        maxConcurrentJobs: this.config.maxConcurrentJobs,
      },
    };
  }
}

// Singleton instance
let batchJobInstance: BatchJobService | null = null;

export function getBatchJobService(config?: Partial<BatchJobConfig>): BatchJobService {
  if (!batchJobInstance) {
    batchJobInstance = new BatchJobService(config);
  }
  return batchJobInstance;
}

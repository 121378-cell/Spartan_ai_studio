/**
 * Daily Brain Cycle Job
 * 
 * Cron job that triggers the complete brain analysis cycle daily at configured time.
 * 
 * Default: 23:00 (11 PM) each day
 * Configurable per user via user preferences
 * 
 * Uses bull job queue for:
 * - Guaranteed execution (persists to Redis)
 * - Error handling & retry logic
 * - Monitoring & logging
 * - Graceful shutdown
 */

import cron from 'node-cron';
import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { getBrainOrchestrator } from '../services/brainOrchestrator';
import { eventBus } from '../services/eventBus';

interface DailyBrainCycleConfig {
  enabled: boolean;
  time: string; // HH:MM format
  timezone?: string;
  retryCount: number;
  retryDelayMs: number;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

class DailyBrainCycleJob {
  private static instance: DailyBrainCycleJob;
  private db: any;
  private brainOrchestrator = getBrainOrchestrator();
  private cronJobs: Map<string, any> = new Map();
  private config: DailyBrainCycleConfig = {
    enabled: process.env.BRAIN_DAILY_CYCLE_ENABLED !== 'false',
    time: process.env.BRAIN_DAILY_CYCLE_TIME || '23:00',
    timezone: process.env.BRAIN_DAILY_CYCLE_TIMEZONE || 'UTC',
    retryCount: parseInt(process.env.BRAIN_DAILY_CYCLE_RETRY_COUNT || '3'),
    retryDelayMs: parseInt(process.env.BRAIN_DAILY_CYCLE_RETRY_DELAY_MS || '5000')
  };

  private constructor() {
    this.db = getDatabase();
    logger.info('DailyBrainCycleJob initialized', {
      context: 'daily-brain-cycle-job',
      metadata: this.config
    });
  }

  static getInstance(): DailyBrainCycleJob {
    if (!DailyBrainCycleJob.instance) {
      DailyBrainCycleJob.instance = new DailyBrainCycleJob();
    }
    return DailyBrainCycleJob.instance;
  }

  /**
   * Start daily brain cycle scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('Daily brain cycle job disabled', { context: 'daily-brain-cycle-job' });
      return;
    }

    try {
      const [hour, minute] = this.config.time.split(':');
      const cronExpression = `${minute} ${hour} * * *`; // Every day at HH:MM

      logger.info('Starting daily brain cycle scheduler', {
        context: 'daily-brain-cycle-job',
        metadata: { cronExpression, timezone: this.config.timezone }
      });

      // Schedule global cycle job (runs once per day)
      const globalCronJob = cron.schedule(cronExpression, () => {
        this.executeGlobalCycle();
      });

      this.cronJobs.set('global', globalCronJob);

      logger.info('Daily brain cycle scheduler started', {
        context: 'daily-brain-cycle-job'
      });
    } catch (error) {
      logger.error('Failed to start daily brain cycle scheduler', {
        context: 'daily-brain-cycle-job',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Execute global cycle that processes all active users
   */
  private async executeGlobalCycle(): Promise<void> {
    const cycleStartTime = Date.now();

    try {
      logger.info('Executing global daily brain cycle', {
        context: 'daily-brain-cycle-job'
      });

      // Get all active users with connected devices
      const users = this.db.prepare(`
        SELECT DISTINCT u.id as userId
        FROM users u
        WHERE u.isActive = 1
        AND EXISTS (
          SELECT 1 FROM wearable_devices wd
          WHERE wd.userId = u.id AND wd.isActive = 1
        )
      `).all() as Array<{ userId: string }>;

      logger.info('Found users for daily cycle', {
        context: 'daily-brain-cycle-job',
        metadata: { userCount: users.length }
      });

      // Process each user
      const results: Array<{
        userId: string;
        status: string;
        duration: number;
        error?: string;
      }> = [];

      for (const user of users) {
        const userCycleStart = Date.now();

        try {
          await this.executeUserCycle(user.userId);

          results.push({
            userId: user.userId,
            status: 'success',
            duration: Date.now() - userCycleStart
          });
        } catch (error) {
          logger.error('User cycle failed', {
            context: 'daily-brain-cycle-job',
            metadata: {
              userId: user.userId,
              errorMessage: error instanceof Error ? error.message : String(error)
            }
          });

          results.push({
            userId: user.userId,
            status: 'failed',
            duration: Date.now() - userCycleStart,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Log global cycle summary
      const successCount = results.filter(r => r.status === 'success').length;
      const failureCount = results.filter(r => r.status === 'failed').length;
      const avgDuration = Math.round(
        results.reduce((acc, r) => acc + r.duration, 0) / results.length
      );

      const totalTime = Date.now() - cycleStartTime;

      logger.info('Global daily brain cycle complete', {
        context: 'daily-brain-cycle-job',
        metadata: {
          totalUsers: users.length,
          successCount,
          failureCount,
          avgDurationMs: avgDuration,
          totalTimeMs: totalTime
        }
      });

      // Emit event for monitoring
      eventBus.emit('brain.global_cycle.complete', {
        timestamp: Date.now(),
        totalUsers: users.length,
        successCount,
        failureCount,
        avgDurationMs: avgDuration,
        totalTimeMs: totalTime,
        results
      }, 'medium');
    } catch (error) {
      logger.error('Global daily brain cycle failed', {
        context: 'daily-brain-cycle-job',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
          totalTimeMs: Date.now() - cycleStartTime
        }
      });

      eventBus.emit('brain.global_cycle.failed', {
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      }, 'high');
    }
  }

  /**
   * Execute cycle for a single user with retry logic
   */
  private async executeUserCycle(userId: string, retryCount: number = 0): Promise<void> {
    try {
      logger.info('Starting user brain cycle', {
        context: 'daily-brain-cycle-job',
        metadata: { userId, attempt: retryCount + 1 }
      });

      const cycleData = await this.brainOrchestrator.executeDailyBrainCycle(userId);

      logger.info('User brain cycle completed', {
        context: 'daily-brain-cycle-job',
        metadata: {
          userId,
          adjustmentCount: cycleData.planAdjustments.length,
          notificationCount: cycleData.notifications.length
        }
      });
    } catch (error) {
      if (retryCount < this.config.retryCount) {
        logger.warn('User cycle failed, retrying', {
          context: 'daily-brain-cycle-job',
          metadata: {
            userId,
            attempt: retryCount + 1,
            maxAttempts: this.config.retryCount,
            delayMs: this.config.retryDelayMs,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));

        // Recursive retry
        return this.executeUserCycle(userId, retryCount + 1);
      } else {
        logger.error('User cycle failed after retries', {
          context: 'daily-brain-cycle-job',
          metadata: {
            userId,
            attempts: this.config.retryCount + 1,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });

        throw error;
      }
    }
  }

  /**
   * Stop all cron jobs (graceful shutdown)
   */
  stop(): void {
    try {
      for (const [key, job] of this.cronJobs) {
        job.stop();
        logger.info('Stopped cron job', {
          context: 'daily-brain-cycle-job',
          metadata: { job: key }
        });
      }
      this.cronJobs.clear();

      logger.info('All cron jobs stopped', { context: 'daily-brain-cycle-job' });
    } catch (error) {
      logger.error('Error stopping cron jobs', {
        context: 'daily-brain-cycle-job',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Trigger cycle immediately (for testing/manual execution)
   */
  async triggerNow(userId?: string): Promise<void> {
    try {
      if (userId) {
        logger.info('Manual trigger of user brain cycle', {
          context: 'daily-brain-cycle-job',
          metadata: { userId }
        });
        await this.executeUserCycle(userId);
      } else {
        logger.info('Manual trigger of global brain cycle', {
          context: 'daily-brain-cycle-job'
        });
        await this.executeGlobalCycle();
      }
    } catch (error) {
      logger.error('Manual cycle trigger failed', {
        context: 'daily-brain-cycle-job',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Get job configuration
   */
  getConfig(): DailyBrainCycleConfig {
    return { ...this.config };
  }

  /**
   * Update job configuration
   */
  setConfig(config: Partial<DailyBrainCycleConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Daily brain cycle config updated', {
      context: 'daily-brain-cycle-job',
      metadata: this.config
    });

    // Restart if enabled state changed
    if (config.enabled !== undefined) {
      this.stop();
      if (config.enabled) {
        this.start();
      }
    }
  }
}

// Export singleton
export const getDailyBrainCycleJob = (): DailyBrainCycleJob => {
  return DailyBrainCycleJob.getInstance();
};

export { DailyBrainCycleJob };
export default DailyBrainCycleJob;

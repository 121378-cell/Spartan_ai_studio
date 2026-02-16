/**
 * ML Validation and Retraining Job
 * 
 * Runs daily to:
 * 1. Backtest predictions from the previous day.
 * 2. Calculate model accuracy per user.
 * 3. Trigger parameter refinement (retraining) if accuracy drops.
 * 4. Log accuracy metrics to APM.
 */

import cron from 'node-cron';
import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { getMLForecastingService } from '../services/mlForecastingService';
import { apmService } from '../utils/apmService';

export class MLValidationJob {
  private static instance: MLValidationJob;
  private db: any;
  private mlService = getMLForecastingService();
  private cronJob: any = null;

  private constructor() {
    this.db = getDatabase();
  }

  static getInstance(): MLValidationJob {
    if (!MLValidationJob.instance) {
      MLValidationJob.instance = new MLValidationJob();
    }
    return MLValidationJob.instance;
  }

  /**
   * Start the validation job (scheduled at 01:00 AM daily)
   */
  start(): void {
    const cronExpression = '0 1 * * *'; 

    this.cronJob = cron.schedule(cronExpression, () => {
      this.executeValidation();
    });

    logger.info('ML Validation Job scheduled', { context: 'ml-jobs', metadata: { cronExpression } });
  }

  /**
   * Execute validation for all active users
   */
  async executeValidation(): Promise<void> {
    const startTime = Date.now();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    try {
      logger.info('Starting ML Validation Cycle', { context: 'ml-jobs', metadata: { date: dateStr } });

      const users = this.db.prepare(`
        SELECT DISTINCT user_id FROM ml_forecasts 
        WHERE date = ?
      `).all(dateStr) as Array<{ user_id: string }>;

      let totalAccuracy = 0;
      let count = 0;

      for (const user of users) {
        const result = await this.mlService.backtestPrediction(user.user_id, dateStr);
        
        if (result.predicted !== null && result.actual !== null) {
          totalAccuracy += result.accuracy;
          count++;

          // Trigger retraining if accuracy is low for this user
          if (result.accuracy < 75) {
            await this.mlService.retrainModel(user.user_id, result.accuracy);
          }
        }
      }

      const avgAccuracy = count > 0 ? totalAccuracy / count : 0;

      // Log to APM
      // Using a generic metric recording since we don't have a specific accuracy gauge yet
      // but we can use the existing aiApiCalls or similar if repurposed, 
      // for now we'll just log it clearly.
      logger.info('ML Validation Cycle Complete', {
        context: 'ml-jobs',
        metadata: {
          processedUsers: users.length,
          avgAccuracy: `${avgAccuracy.toFixed(2)}%`,
          durationMs: Date.now() - startTime
        }
      });

    } catch (error) {
      logger.error('ML Validation Cycle failed', {
        context: 'ml-jobs',
        metadata: { error: String(error) }
      });
    }
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }
  }
}

export const getMLValidationJob = () => MLValidationJob.getInstance();

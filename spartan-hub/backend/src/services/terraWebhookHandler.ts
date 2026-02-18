/**
 * Terra Webhook Handler Service - Functional Implementation for Sandbox
 */

import { logger } from '../utils/logger';
import { executeQuery } from '../config/postgresConfig';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class TerraWebhookHandler {
  private static instance: TerraWebhookHandler;

  public constructor() {}

  static getInstance(): TerraWebhookHandler {
    if (!TerraWebhookHandler.instance) {
      TerraWebhookHandler.instance = new TerraWebhookHandler();
    }
    return TerraWebhookHandler.instance;
  }

  /**
   * Main entry point for all Terra webhooks
   */
  async handleWebhook(payload: any, signature: string): Promise<any> {
    const {type} = payload;
    const userId = payload.user?.reference_id || payload.user?.user_id;

    logger.info(`Received Terra webhook: ${type}`, { 
      context: 'terra-webhook', 
      metadata: { type, userId, hasSignature: Boolean(signature) } 
    });

    // Signature verification (Placeholder logic for sandbox)
    if (!signature && process.env.NODE_ENV !== 'development') {
      throw new Error('Missing signature');
    }

    try {
      switch (type) {
      case 'body':
        await this.processBiometrics(userId, payload.data);
        break;
      case 'daily':
        await this.processDaily(userId, payload.data);
        break;
      case 'sleep':
        await this.processSleep(userId, payload.data);
        break;
      case 'activity':
        await this.processActivity(userId, payload.data);
        break;
      default:
        logger.info(`Unhandled webhook type: ${type}`);
      }

      return { success: true, processed: true };
    } catch (error) {
      logger.error('Error processing Terra webhook', { metadata: { error: String(error) } });
      throw error;
    }
  }

  private async processBiometrics(userId: string, data: any[]): Promise<void> {
    for (const entry of data) {
      const timestamp = entry.metadata?.start_time || new Date().toISOString();
      const heartRate = entry.heart_data?.summary_data?.avg_hr_bpm;
      
      if (heartRate) {
        await this.saveMetric(userId, 'heart_rate', heartRate, timestamp);
      }
    }
  }

  private async processDaily(userId: string, data: any[]): Promise<void> {
    for (const entry of data) {
      const timestamp = entry.metadata?.start_time || new Date().toISOString();
      const steps = entry.distance_data?.steps;
      
      if (steps) {
        await this.saveMetric(userId, 'steps', steps, timestamp);
      }
    }
  }

  private async processSleep(userId: string, data: any[]): Promise<void> {
    for (const entry of data) {
      const timestamp = entry.metadata?.start_time || new Date().toISOString();
      const duration = entry.sleep_durations_data?.other?.total_sleep_duration_seconds;
      
      if (duration) {
        await this.saveMetric(userId, 'sleep_duration', duration / 3600, timestamp); // Store in hours
      }
    }
  }

  private async processActivity(userId: string, data: any[]): Promise<void> {
    // In sandbox, we just log activities
    logger.info(`Activity processed for user ${userId}`);
  }

  private async saveMetric(userId: string, type: string, value: number, timestamp: string): Promise<void> {
    try {
      const id = uuidv4();
      await executeQuery(`
        INSERT INTO user_activities (id, user_id, type, description, metadata, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        id, 
        userId, 
        'BIOMETRIC_UPDATE', 
        `Updated ${type} to ${value}`, 
        JSON.stringify({ metric: type, value, source: 'terra' }),
        timestamp
      ]);
      
      logger.debug(`Saved metric ${type} for user ${userId}`);
    } catch (e) {
      logger.error('Failed to save metric to Postgres', { metadata: { error: String(e) } });
    }
  }
}

export const terraWebhookHandler = TerraWebhookHandler.getInstance();
export default TerraWebhookHandler;

/**
 * Message Queue Utility for AI Requests
 * Provides a queue system to handle AI requests efficiently and prevent overload
 */

import { EventEmitter } from 'events';
import { logger } from './logger';
import { alertService, AlertType, AlertSeverity } from '../services/alertService';
import { queueConfig } from '../config/queueConfig';
import { v4 as uuidv4 } from 'uuid';

// Interface for queue items
export interface QueueItem {
  id: string;
  type: 'alert_prediction' | 'decision_generation';
  payload: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timestamp: number;
  retries: number;
}

// Queue configuration
interface QueueConfig {
  maxSize: number;
  maxRetries: number;
  retryDelay: number;
  processingTimeout: number;
  concurrencyLimit: number;
}

export class MessageQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processing: Set<string> = new Set();
  private config: QueueConfig;
  private isProcessing: boolean = false;
  private concurrencyCount: number = 0;

  constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = { 
      maxSize: queueConfig.maxSize,
      maxRetries: queueConfig.maxRetries,
      retryDelay: queueConfig.retryDelay,
      processingTimeout: queueConfig.processingTimeout,
      concurrencyLimit: queueConfig.concurrencyLimit,
      ...config 
    };
    this.startProcessing();
    
    // Log queue initialization
    if (queueConfig.enableLogging) {
      logger.info('AI message queue initialized', {
        context: 'messageQueue',
        metadata: this.config as unknown as Record<string, unknown>
      });
    }
  }

  /**
   * Add an item to the queue
   * @param type Type of AI request
   * @param payload Request data
   * @returns Promise that resolves when the request is processed
   */
  async enqueue(type: QueueItem['type'], payload: unknown): Promise<unknown> {
    // Check queue size limit
    if (this.queue.length >= this.config.maxSize) {
      const error = new Error('AI request queue is full. Please try again later.');
      logger.warn('AI queue is full', {
        context: 'messageQueue',
        metadata: {
          queueLength: this.queue.length,
          maxSize: this.config.maxSize
        }
      });
      
      // Create alert for queue overflow
      alertService.createAlert(
        AlertType.SERVICE_UNAVAILABLE,
        AlertSeverity.MEDIUM,
        'AI request queue is full',
        'messageQueue',
        {
          queueLength: this.queue.length,
          maxSize: this.config.maxSize
        }
      );
      
      throw error;
    }

    // Check if we should create an alert for high queue usage
    const usagePercentage = (this.queue.length / this.config.maxSize) * 100;
    if (usagePercentage >= queueConfig.alertThreshold) {
      alertService.createAlert(
        AlertType.PERFORMANCE_DEGRADATION,
        AlertSeverity.LOW,
        `AI request queue usage at ${usagePercentage.toFixed(1)}%`,
        'messageQueue',
        {
          queueLength: this.queue.length,
          maxSize: this.config.maxSize,
          usagePercentage
        }
      );
    }

    return new Promise((resolve, reject) => {
      const item: QueueItem = {
        id: this.generateId(),
        type,
        payload,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0
      };

      this.queue.push(item);
      this.emit('enqueue', item);
      
      if (queueConfig.enableLogging) {
        logger.debug('AI request enqueued', {
          context: 'messageQueue',
          metadata: {
            itemId: item.id,
            type: item.type,
            queueLength: this.queue.length
          }
        });
      }

      // Start processing if not already started
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process items in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    if (queueConfig.enableLogging) {
      logger.debug('Starting AI queue processing', {
        context: 'messageQueue',
        metadata: {
          queueLength: this.queue.length
        }
      });
    }

    while (this.queue.length > 0) {
      // Respect concurrency limit
      if (this.concurrencyCount >= this.config.concurrencyLimit) {
        await this.wait(100);
        continue;
      }

      const item = this.queue.shift();
      if (!item) continue;

      // Skip if already being processed
      if (this.processing.has(item.id)) {
        continue;
      }

      this.processing.add(item.id);
      this.concurrencyCount++;

      // Process the item
      this.processItem(item)
        .catch(error => {
          logger.error('Error processing queue item', {
            context: 'messageQueue',
            metadata: {
              itemId: item.id,
              type: item.type,
              error: error.message || String(error)
            }
          });
        })
        .finally(() => {
          this.processing.delete(item.id);
          this.concurrencyCount--;
          this.emit('processed', item);
        });
    }

    this.isProcessing = false;
    
    if (queueConfig.enableLogging) {
      logger.debug('Finished AI queue processing', {
        context: 'messageQueue',
        metadata: {
          queueLength: this.queue.length
        }
      });
    }
  }

  /**
   * Process a single queue item
   * @param item Queue item to process
   */
  private async processItem(item: QueueItem): Promise<void> {
    try {
      if (queueConfig.enableLogging) {
        logger.debug('Processing AI request', {
          context: 'messageQueue',
          metadata: {
            itemId: item.id,
            type: item.type,
            retries: item.retries
          }
        });
      }

      // Set a timeout for processing
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI request processing timeout')), this.config.processingTimeout);
      });

      // Import the AI service dynamically to avoid circular dependencies
      const { processAiRequest } = await import('../services/aiService');
      
      // Process the request with timeout
      const result = await Promise.race([
        processAiRequest(item.type as any, item.payload as Record<string, unknown>),
        timeoutPromise
      ]);

      item.resolve(result);
      
      if (queueConfig.enableLogging) {
        logger.debug('AI request processed successfully', {
          context: 'messageQueue',
          metadata: {
            itemId: item.id,
            type: item.type
          }
        });
      }
    } catch (error: any) {
      logger.warn('AI request processing failed', {
        context: 'messageQueue',
        metadata: {
          itemId: item.id,
          type: item.type,
          retries: item.retries,
          error: error.message || String(error)
        }
      });

      // Retry logic
      if (item.retries < this.config.maxRetries) {
        item.retries++;
        logger.info(`Retrying AI request (${item.retries}/${this.config.maxRetries})`, {
          context: 'messageQueue',
          metadata: {
            itemId: item.id,
            type: item.type
          }
        });

        // Add back to front of queue for retry
        this.queue.unshift(item);
        await this.wait(this.config.retryDelay * Math.pow(2, item.retries)); // Exponential backoff
      } else {
        // Max retries exceeded
        const errorMessage = `AI request failed after ${this.config.maxRetries} retries: ${error.message}`;
        logger.error('AI request failed permanently', {
          context: 'messageQueue',
          metadata: {
            itemId: item.id,
            type: item.type,
            retries: item.retries,
            error: errorMessage
          }
        });

        // Create alert for persistent AI failures
        alertService.createAlert(
          AlertType.AI_SERVICE_FAILURE,
          AlertSeverity.HIGH,
          'AI request failed after maximum retries',
          'messageQueue',
          {
            itemId: item.id,
            type: item.type,
            errorMessage,
            retries: item.retries
          }
        );

        item.reject(new Error(errorMessage));
      }
    }
  }

  /**
   * Start periodic processing
   */
  private startProcessing(): void {
    setInterval(() => {
      if (this.queue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, 1000); // Check every second
  }

  /**
   * Wait for a specified time
   * @param ms Time to wait in milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique ID for queue items
   */
  private generateId(): string {
    return `${Date.now()}-${uuidv4().replace(/-/g, '').substring(0, 9)}`;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueLength: number;
    processingCount: number;
    concurrencyCount: number;
    maxSize: number;
    usagePercentage: number;
    } {
    const queueLength = this.queue.length;
    const usagePercentage = (queueLength / this.config.maxSize) * 100;
    
    return {
      queueLength,
      processingCount: this.processing.size,
      concurrencyCount: this.concurrencyCount,
      maxSize: this.config.maxSize,
      usagePercentage
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    const clearedItems = this.queue.length;
    this.queue = [];
    logger.info('AI queue cleared', {
      context: 'messageQueue',
      metadata: {
        clearedItems
      }
    });
  }
}

// Export a singleton instance
export const aiMessageQueue = new MessageQueue();

export default {
  MessageQueue,
  aiMessageQueue
};
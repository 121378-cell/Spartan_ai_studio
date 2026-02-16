/**
 * Queue Configuration
 * Configuration settings for the AI message queue system
 */

// Environment-based configuration
export const queueConfig = {
  // Maximum number of items allowed in the queue
  maxSize: parseInt(process.env.AI_QUEUE_MAX_SIZE || '100', 10),
  
  // Maximum number of retries for failed requests
  maxRetries: parseInt(process.env.AI_QUEUE_MAX_RETRIES || '3', 10),
  
  // Delay between retries in milliseconds (will use exponential backoff)
  retryDelay: parseInt(process.env.AI_QUEUE_RETRY_DELAY || '1000', 10),
  
  // Timeout for processing requests in milliseconds
  processingTimeout: parseInt(process.env.AI_QUEUE_PROCESSING_TIMEOUT || '30000', 10),
  
  // Maximum concurrent AI requests
  concurrencyLimit: parseInt(process.env.AI_QUEUE_CONCURRENCY_LIMIT || '3', 10),
  
  // Enable/disable queue logging
  enableLogging: process.env.AI_QUEUE_LOGGING_ENABLED === 'true',
  
  // Alert threshold - when queue reaches this percentage of max size
  alertThreshold: parseInt(process.env.AI_QUEUE_ALERT_THRESHOLD || '80', 10)
};

// Validate configuration
if (queueConfig.maxSize <= 0) {
  throw new Error('AI_QUEUE_MAX_SIZE must be greater than 0');
}

if (queueConfig.maxRetries < 0) {
  throw new Error('AI_QUEUE_MAX_RETRIES must be non-negative');
}

if (queueConfig.retryDelay <= 0) {
  throw new Error('AI_QUEUE_RETRY_DELAY must be greater than 0');
}

if (queueConfig.processingTimeout <= 0) {
  throw new Error('AI_QUEUE_PROCESSING_TIMEOUT must be greater than 0');
}

if (queueConfig.concurrencyLimit <= 0) {
  throw new Error('AI_QUEUE_CONCURRENCY_LIMIT must be greater than 0');
}

if (queueConfig.alertThreshold < 0 || queueConfig.alertThreshold > 100) {
  throw new Error('AI_QUEUE_ALERT_THRESHOLD must be between 0 and 100');
}

export default queueConfig;
import axios from 'axios';
import logger from './logger';

// AI service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

// Service status tracking
let isAiServiceAvailable = false;
let healthCheckTimer: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

// Interface for health check response
interface HealthCheckResponse {
  status: string;
  ollama_available: boolean;
  model?: string;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Initialize AI service monitoring
 */
export function initializeAiServiceMonitoring() {
  // Skip monitoring in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  logger.info('🔄 Initializing AI service monitoring...');

  try {
    // Start health check
    startHealthCheck();

    logger.info('✅ AI service monitoring initialized');
  } catch (error) {
    logger.error('❌ Error initializing AI service monitoring:', { metadata: { error } });
  }
}

/**
 * Stop AI service monitoring (useful for tests and cleanup)
 */
export function stopAiServiceMonitoring() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/**
 * Start periodic health checks
 */
function startHealthCheck() {
  try {
    // Clear any existing timer
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
    }

    // Start health check interval
    healthCheckTimer = setInterval(async () => {
      try {
        await checkAiServiceHealth();
      } catch (error) {
        logger.error('❌ Error in health check interval:', { metadata: { error } });
      }
    }, HEALTH_CHECK_INTERVAL);

    // Perform initial check
    checkAiServiceHealth().catch(error => {
      logger.error('❌ Error in initial health check:', { metadata: { error } });
    });
  } catch (error) {
    logger.error('❌ Error starting health check:', { metadata: { error } });
  }
}

/**
 * Check AI service health
 */
async function checkAiServiceHealth(): Promise<boolean> {
  try {
    const response = await axios.get<HealthCheckResponse>(`${AI_SERVICE_URL}/health`, {
      timeout: 3000
    });

    const isHealthy = response.status === 200 && response.data.status === 'healthy';
    updateServiceStatus(isHealthy);

    return isHealthy;
  } catch (error: any) {
    logger.warn('⚠️ AI service health check failed:', { metadata: { error: error.message || error } });
    updateServiceStatus(false);
    return false;
  }
}

/**
 * Update service status and handle transitions
 */
function updateServiceStatus(isAvailable: boolean) {
  const previousStatus = isAiServiceAvailable;
  isAiServiceAvailable = isAvailable;

  // Handle status transition
  if (previousStatus !== isAvailable) {
    if (isAvailable) {
      logger.info('✅ AI service is now available');
      // Reset reconnect attempts on successful connection
      reconnectAttempts = 0;
      // Clear any pending reconnect timers
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    } else {
      logger.warn('⚠️ AI service is unavailable');
      // Schedule reconnection attempt
      scheduleReconnection();
    }
  }
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnection() {
  // Clear any existing timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  // Check if we've reached max reconnect attempts
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error('❌ Maximum AI service reconnection attempts reached. Giving up.');
    return;
  }

  reconnectAttempts++;
  logger.info(`🔄 Scheduling AI service reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_INTERVAL}ms`);

  reconnectTimer = setTimeout(() => {
    attemptAiServiceReconnection();
  }, RECONNECT_INTERVAL);
}

/**
 * Attempt to reconnect to the AI service
 */
async function attemptAiServiceReconnection() {
  try {
    logger.info('🔄 Attempting to reconnect to AI service...');
    const isHealthy = await checkAiServiceHealth();

    if (isHealthy) {
      // Reset reconnect attempts on successful connection
      reconnectAttempts = 0;
      logger.info('✅ AI service reconnected successfully');
    } else {
      // Schedule another reconnection attempt
      scheduleReconnection();
    }
  } catch (error: any) {
    logger.error('❌ AI service reconnection failed:', { metadata: { error: error.message || error } });
    // Schedule another reconnection attempt
    scheduleReconnection();
  }
}

/**
 * Check if AI service is available
 */
export function isAiServiceReady(): boolean {
  return isAiServiceAvailable;
}

/**
 * Execute an AI operation with automatic reconnection
 * 
 * @param operation - Function to execute
 * @param retries - Number of retries (default: 3)
 */
export async function executeAiOperationWithReconnection<T>(
  operation: () => Promise<T>,
  retries: number = 3
): Promise<T | null> {
  let lastError: unknown = null;

  for (let i = 0; i <= retries; i++) {
    try {
      // Check if AI service is available
      if (!isAiServiceAvailable) {
        logger.warn('⚠️ AI service not available, checking status...');
        await checkAiServiceHealth();

        if (!isAiServiceAvailable) {
          throw new Error('AI service not available');
        }
      }

      return await operation();
    } catch (error: any) {
      lastError = error;
      logger.error(`❌ AI operation failed (attempt ${i + 1}/${retries + 1}):`, { metadata: { error: error.message || error } });

      // If this isn't the last retry, try to reconnect
      if (i < retries) {
        logger.info('🔄 Attempting to reconnect to AI service before retry...');
        await checkAiServiceHealth();
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // If we get here, all retries failed
  logger.error('❌ All retry attempts failed for AI operation');
  return null;
}

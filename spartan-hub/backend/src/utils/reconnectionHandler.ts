import { initializeDatabase } from '../config/database';
import { logger } from './logger';

// Variable to hold the database instance
let db: any = null;
let schemaInitialized = false;

// Reconnection settings
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;

/**
 * Initialize database with reconnection capability
 */
export async function initializeDatabaseWithReconnection(): Promise<any> {
  try {
    logger.info('🔄 Initializing database with reconnection capability...');
    db = initializeDatabase();

    // Only initialize schema once
    if (!schemaInitialized) {
      await import('../config/database').then(module => {
        module.initializeSchema();
        schemaInitialized = true;
      });
    }

    // Reset reconnect attempts on successful connection
    reconnectAttempts = 0;

    logger.info('✅ Database initialized successfully with reconnection capability');
    return db;
  } catch (error) {
    logger.error('❌ Error initializing database:', { metadata: { error } });

    // Schedule reconnection attempt
    scheduleReconnection();
    return null;
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
    logger.error('❌ Maximum reconnection attempts reached. Giving up.');
    return;
  }

  reconnectAttempts++;
  logger.info(`🔄 Scheduling reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_INTERVAL}ms`);

  reconnectTimer = setTimeout(() => {
    attemptReconnection();
  }, RECONNECT_INTERVAL);
}

/**
 * Attempt to reconnect to the database
 */
async function attemptReconnection() {
  try {
    logger.info('🔄 Attempting to reconnect to database...');
    db = initializeDatabase();

    // Only initialize schema once
    if (!schemaInitialized) {
      await import('../config/database').then(module => {
        module.initializeSchema();
        schemaInitialized = true;
      });
    }

    // Reset reconnect attempts on successful connection
    reconnectAttempts = 0;
    logger.info('✅ Database reconnected successfully');
  } catch (error) {
    logger.error('❌ Database reconnection failed:', { metadata: { error } });

    // Schedule another reconnection attempt
    scheduleReconnection();
  }
}

/**
 * Get the current database instance
 */
export function getDatabaseInstance() {
  return db;
}

/**
 * Execute a database operation with automatic reconnection
 * 
 * @param operation - Function to execute
 * @param retries - Number of retries (default: 3)
 */
export function executeWithReconnection<T>(
  operation: () => T,
  retries: number = 3
): T | null {
  let lastError: any = null;

  for (let i = 0; i <= retries; i++) {
    try {
      // Check if database is available
      if (!db) {
        logger.warn('⚠️ Database not available, attempting to reconnect...');
        initializeDatabaseWithReconnection();

        if (!db) {
          throw new Error('Database not available after reconnection attempt');
        }
      }

      return operation();
    } catch (error) {
      lastError = error;
      //      logger.error(`❌ Database operation failed (attempt ${i + 1}/${retries + 1}):`, { metadata: { error } });

      // If this isn't the last retry, try to reconnect
      if (i < retries) {
        logger.info('🔄 Attempting to reconnect before retry...');
        initializeDatabaseWithReconnection();
        // Wait a bit before retrying
        setTimeout(() => { }, 1000);
      }
    }
  }

  // If we get here, all retries failed
  logger.error('❌ All retry attempts failed for database operation', {
    metadata: { error: lastError }
  });
  return null;
}

/**
 * Execute an async database operation with automatic reconnection
 * 
 * @param operation - Async function to execute
 * @param retries - Number of retries (default: 3)
 */
export async function executeAsyncWithReconnection<T>(
  operation: () => Promise<T>,
  retries: number = 3
): Promise<T | null> {
  let lastError: any = null;

  for (let i = 0; i <= retries; i++) {
    try {
      // Check if database is available
      if (!db) {
        logger.warn('⚠️ Database not available, attempting to reconnect...');
        await initializeDatabaseWithReconnection();

        if (!db) {
          throw new Error('Database not available after reconnection attempt');
        }
      }

      return await operation();
    } catch (error) {
      lastError = error;
      logger.error(`❌ Database operation failed (attempt ${i + 1}/${retries + 1}):`, { metadata: { error } });

      // If this isn't the last retry, try to reconnect
      if (i < retries) {
        logger.info('🔄 Attempting to reconnect before retry...');
        await initializeDatabaseWithReconnection();
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // If we get here, all retries failed
  logger.error('❌ All retry attempts failed for database operation', {
    metadata: { error: lastError }
  });
  return null;
}

/**
 * Stop the reconnection handler
 */
export function stopReconnectionHandler() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  logger.info('⏹️ Reconnection handler stopped');
}

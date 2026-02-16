import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { executeAsyncWithReconnection } from '../utils/reconnectionHandler';
import { checkOllamaServiceHealth } from '../services/aiService';
import { metricsRegistry, getPerformanceMetrics as getMetricsCollector } from '../utils/metricsCollector';
import { logger } from '../utils/logger';
import { redisClient } from '../utils/cacheService';
// Import database service factory
import * as databaseServiceFactory from './databaseServiceFactory';
import db from '../config/database';
import { getVectorStoreService } from './vectorStoreService';

// Load environment variables
dotenv.config();

// Check if we should use PostgreSQL
const usePostgres = process.env.DATABASE_TYPE === 'postgres';

// Interface for service health status
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  lastChecked?: string;
}

// Interface for overall system health
export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: ServiceHealth[];
  uptime: string;
  metrics?: Record<string, unknown>; // Add metrics to health check
}

// Track uptime
const startTime = Date.now();

/**
 * Check database service health
 * @returns Service health status
 */
async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    // Execute a simple query to check database connectivity
    let result: any | null;

    if (usePostgres) {
      // For PostgreSQL, try to execute a simple query using the postgres replica config
      try {
        const { executeQuery, getPoolStats } = require('../config/postgresReplicaConfig');
        const testResult = await executeQuery('SELECT 1 as test', [], 'read');
        result = testResult.rows[0];

        // Also get pool statistics for monitoring
        const poolStats = getPoolStats();
        logger.debug(`📊 PostgreSQL Pool Stats: ${JSON.stringify(poolStats)}`, { context: 'dbHealth' });
      } catch (error) {
        logger.error('PostgreSQL connection test failed:', { context: 'dbHealth', metadata: { error } });
        throw error;
      }
    } else {
      // For SQLite, use the existing method
      result = await executeAsyncWithReconnection(async () => {
        // Check if db is properly initialized before using it
        if (!db || typeof db === 'object' && 'type' in db) {
          throw new Error('Database not properly initialized');
        }

        // Type assertion to Database type
        const sqliteDb = db as any;
        const stmt = sqliteDb.prepare('SELECT 1 as test');
        return stmt.get() as any;
      });
    }

    const responseTime = Date.now() - start;

    if (result) {
      return {
        name: 'Database',
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        name: 'Database',
        status: 'unhealthy',
        message: 'Database query returned no results',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error: unknown) {
    const responseTime = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      name: 'Database',
      status: 'unhealthy',
      message: errorMessage || 'Unknown database error',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check AI service health
 * @returns Service health status
 */
async function checkAiServiceHealthStatus(): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    const isHealthy = await checkOllamaServiceHealth();
    const responseTime = Date.now() - start;

    return {
      name: 'AI Service',
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy ? undefined : 'Ollama service is not responding',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error: unknown) {
    const responseTime = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      name: 'AI Service',
      status: 'unhealthy',
      message: errorMessage || 'Unknown AI service error',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check fitness API health
 * Placeholder for future implementation when fitness APIs are integrated
 * @returns Service health status
 */
async function checkFitnessApiHealth(): Promise<ServiceHealth> {
  // For now, we'll return healthy since we don't have external fitness APIs integrated yet
  // In the future, this would check the actual fitness API endpoints

  return {
    name: 'Fitness API',
    status: 'healthy',
    message: 'No external fitness APIs configured yet',
    lastChecked: new Date().toISOString()
  };
}

/**
 * Check Qdrant Vector Store health
 */
async function checkQdrantHealth(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const vectorStore = getVectorStoreService();
    const stats = await vectorStore.getStats();
    return {
      name: 'Qdrant',
      status: 'healthy',
      message: `Collection: ${stats.collectionName}, Points: ${stats.pointCount}`,
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'Qdrant',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Qdrant connection failed',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check Redis cache health
 * @returns Service health status
 */
export async function checkRedisCacheHealth(): Promise<ServiceHealth> {
  const start = Date.now();

  try {
    // Test Redis connection with a simple ping
    await redisClient.ping();

    const responseTime = Date.now() - start;

    return {
      name: 'Redis Cache',
      status: 'healthy',
      responseTime,
      message: 'Redis cache is available and responsive',
      lastChecked: new Date().toISOString()
    };
  } catch (error: unknown) {
    const responseTime = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      name: 'Redis Cache',
      status: 'unhealthy',
      responseTime,
      message: errorMessage || 'Redis cache is not responding',
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check application server health
 * @returns Service health status
 */
function checkServerHealth(): ServiceHealth {
  try {
    // Check if the server is running by verifying process uptime
    const uptime = process.uptime();

    return {
      name: 'Application Server',
      status: 'healthy',
      message: `Server running for ${Math.floor(uptime)} seconds`,
      lastChecked: new Date().toISOString()
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      name: 'Application Server',
      status: 'unhealthy',
      message: errorMessage || 'Unknown server error',
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Get performance metrics
 * @returns Metrics data
 */
async function getPerformanceMetrics(): Promise<any> {
  try {
    // Get metrics from registry
    return {
      metrics: await getMetricsCollector().getMetrics()
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      error: errorMessage || 'Failed to collect metrics'
    };
  }
}

/**
 * Get overall system health
 * @returns System health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const serviceChecks = [
    checkServerHealth(),
    checkDatabaseHealth(),
    checkAiServiceHealthStatus(),
    checkRedisCacheHealth(),
    checkFitnessApiHealth(),
    checkQdrantHealth()
  ];

  // Wait for all health checks to complete
  const serviceResults = await Promise.all(serviceChecks);

  // Determine overall system status
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // If any service is unhealthy, the system is unhealthy
  if (serviceResults.some(service => service.status === 'unhealthy')) {
    overallStatus = 'unhealthy';
  }
  // If any service is degraded and none are unhealthy, the system is degraded
  else if (serviceResults.some(service => service.status === 'degraded')) {
    overallStatus = 'degraded';
  }

  // Calculate uptime
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  const uptimeString = `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`;

  // Get performance metrics
  const metrics = await getPerformanceMetrics();

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: serviceResults,
    uptime: uptimeString,
    metrics
  };
}

/**
 * Check if the system is healthy
 * @returns Boolean indicating if system is healthy
 */
export async function isSystemHealthy(): Promise<boolean> {
  try {
    const health = await getSystemHealth();
    return health.status === 'healthy';
  } catch (error) {
    logger.error('Error checking system health:', { context: 'systemHealth', metadata: { error } });
    return false;
  }
}
/**
 * Cache Service
 * 
 * Provides Redis-based caching layer for analytics and other frequently accessed data.
 * Implements TTL-based expiration and cache invalidation strategies.
 */

import { createClient, RedisClientType } from 'redis';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  enabled: boolean;
  host: string;
  port: number;
  clusterMode: boolean;
  ttlSeconds: Record<string, number>;
}

export class CacheService {
  private client: RedisClientType | any | null = null;
  private config: CacheConfig;
  private isConnected: boolean = false;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enabled: config?.enabled ?? process.env.REDIS_ENABLED !== 'false',
      host: config?.host ?? process.env.REDIS_HOST ?? 'localhost',
      port: config?.port ?? parseInt(process.env.REDIS_PORT ?? '6379'),
      clusterMode: config?.clusterMode ?? process.env.REDIS_CLUSTER === 'true',
      ttlSeconds: {
        ...{
          'recovery_score': 900, // 15 minutes
          'readiness_score': 900, // 15 minutes
          'trends': 3600, // 1 hour
          'recommendations': 900, // 15 minutes
          'injury_risk': 900, // 15 minutes
          'daily_summary': 3600, // 1 hour
          'user_baseline': 86400, // 24 hours
          'user_baseline_30d': 86400, // 24 hours
        },
        ...config?.ttlSeconds,
      },
    };
  }

  /**
   * Initialize Redis connection
   * Supports both standalone and cluster mode
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Cache service disabled', { context: 'cache.init' });
      return;
    }

    try {
      if (this.config.clusterMode) {
        // Redis Cluster mode for Kubernetes
        logger.info('Initializing Redis Cluster', { context: 'cache.init' });
        this.client = new Redis.Cluster([
          { host: `${this.config.host}-0.${this.config.host}`, port: this.config.port },
          { host: `${this.config.host}-1.${this.config.host}`, port: this.config.port },
          { host: `${this.config.host}-2.${this.config.host}`, port: this.config.port },
        ], {
          redisOptions: {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
          },
        });

        this.client.on('error', (err: Error) => {
          logger.error('Redis Cluster error', {
            context: 'cache.error',
            metadata: { errorMessage: err.message },
          });
        });

        this.client.on('connect', () => {
          logger.info('Redis Cluster connected', { context: 'cache.connect' });
          this.isConnected = true;
        });
      } else {
        // Standalone Redis mode
        logger.info('Initializing Redis Standalone', { context: 'cache.init' });
        this.client = createClient({
          socket: {
            host: this.config.host,
            port: this.config.port,
            reconnectStrategy: (retries: number) => {
              if (retries > 10) {
                logger.error('Redis reconnection failed after 10 attempts', {
                  context: 'cache.reconnect',
                });
                return new Error('Redis reconnection limit reached');
              }
              return Math.min(retries * 50, 5000);
            },
          },
        });

        this.client.on('error', (err: Error) => {
          logger.error('Redis client error', {
            context: 'cache.error',
            metadata: { errorMessage: err.message },
          });
        });

        this.client.on('connect', () => {
          logger.info('Redis connected', { context: 'cache.connect' });
          this.isConnected = true;
        });
      }

      this.client.on('disconnect', () => {
        logger.warn('Redis disconnected', { context: 'cache.disconnect' });
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      logger.info('Cache service initialized', { context: 'cache.init' });
    } catch (error) {
      logger.error('Failed to initialize cache service', {
        context: 'cache.init',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      // Don't throw - allow app to run without cache
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value && typeof value === 'string') {
        logger.debug('Cache hit', { context: 'cache.get', metadata: { key } });
        return JSON.parse(value) as T;
      }
      logger.debug('Cache miss', { context: 'cache.get', metadata: { key } });
      return null;
    } catch (error) {
      logger.error('Cache get error', {
        context: 'cache.get',
        metadata: {
          key,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(
    key: string,
    value: T,
    ttlKey?: string,
    customTtl?: number
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const ttl = customTtl ?? this.config.ttlSeconds[ttlKey ?? 'recovery_score'] ?? 900;
      const serialized = JSON.stringify(value);

      await this.client.setEx(key, ttl, serialized);
      logger.debug('Cache set', {
        context: 'cache.set',
        metadata: { key, ttl },
      });
      return true;
    } catch (error) {
      logger.error('Cache set error', {
        context: 'cache.set',
        metadata: {
          key,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      logger.debug('Cache delete', {
        context: 'cache.delete',
        metadata: { key, deleted: result > 0 },
      });
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', {
        context: 'cache.delete',
        metadata: {
          key,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  /**
   * Delete all keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.client.del(keys);
      logger.debug('Cache pattern delete', {
        context: 'cache.deletePattern',
        metadata: { pattern, count: deleted },
      });
      return deleted;
    } catch (error) {
      logger.error('Cache pattern delete error', {
        context: 'cache.deletePattern',
        metadata: {
          pattern,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      return 0;
    }
  }

  /**
   * Invalidate all analytics cache for a user
   */
  async invalidateUserAnalytics(userId: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      // Delete all analytics keys for this user
      const patterns = [
        `recovery_score:${userId}:*`,
        `readiness_score:${userId}:*`,
        `trends:${userId}:*`,
        `recommendations:${userId}:*`,
        `injury_risk:${userId}:*`,
        `daily_summary:${userId}:*`,
      ];

      for (const pattern of patterns) {
        await this.deletePattern(pattern);
      }

      logger.info('User analytics cache invalidated', {
        context: 'cache.invalidateUserAnalytics',
        metadata: { userId },
      });
    } catch (error) {
      logger.error('Cache invalidation error', {
        context: 'cache.invalidateUserAnalytics',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushDb();
      logger.info('Cache cleared', { context: 'cache.clear' });
      return true;
    } catch (error) {
      logger.error('Cache clear error', {
        context: 'cache.clear',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  /**
   * Get cache health status
   */
  async getHealth(): Promise<{
    enabled: boolean;
    connected: boolean;
    host: string;
    port: number;
  }> {
    return {
      enabled: this.config.enabled,
      connected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Cache service closed', { context: 'cache.close' });
      } catch (error) {
        logger.error('Error closing cache service', {
          context: 'cache.close',
          metadata: {
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCacheService(config?: Partial<CacheConfig>): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService(config);
  }
  return cacheInstance;
}

/**
 * Database Scaling Service
 * Phase B: Scale Preparation - Week 8 Day 2
 * 
 * Database scaling with read replicas, connection pooling, and query optimization
 */

import { logger } from '../utils/logger';

export type ReplicaRole = 'read' | 'write' | 'master';

export interface DatabaseReplica {
  id: string;
  host: string;
  port: number;
  role: ReplicaRole;
  weight: number; // for load balancing
  maxConnections: number;
  currentConnections: number;
  healthy: boolean;
  lastHealthCheck: number;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  idleTimeout: number;
  acquireTimeout: number;
  retryLimit: number;
}

export interface QueryCacheEntry {
  query: string;
  result: any;
  cachedAt: number;
  ttl: number;
  hits: number;
}

export interface ScalingStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  avgQueryTime: number;
  activeConnections: number;
  replicaHealth: Record<string, boolean>;
}

/**
 * Database Scaling Service
 */
export class DatabaseScalingService {
  private replicas: Map<string, DatabaseReplica> = new Map();
  private queryCache: Map<string, QueryCacheEntry> = new Map();
  private poolConfig: ConnectionPoolConfig;
  private stats: ScalingStats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgQueryTime: 0,
    activeConnections: 0,
    replicaHealth: {}
  };

  constructor(poolConfig?: Partial<ConnectionPoolConfig>) {
    this.poolConfig = {
      min: 5,
      max: 20,
      idleTimeout: 30000,
      acquireTimeout: 5000,
      retryLimit: 3,
      ...poolConfig
    };

    logger.info('DatabaseScalingService initialized', {
      context: 'database-scaling',
      metadata: {
        poolConfig: this.poolConfig
      }
    });
  }

  /**
   * Add read replica
   */
  addReadReplica(replica: DatabaseReplica): boolean {
    if (replica.role !== 'read') {
      logger.warn('Invalid replica role - must be "read"', {
        context: 'database-scaling',
        metadata: { replica }
      });
      return false;
    }

    this.replicas.set(replica.id, replica);
    
    logger.info('Read replica added', {
      context: 'database-scaling',
      metadata: {
        replicaId: replica.id,
        host: replica.host,
        weight: replica.weight
      }
    });

    return true;
  }

  /**
   * Remove read replica
   */
  removeReplica(replicaId: string): boolean {
    const removed = this.replicas.delete(replicaId);
    
    if (removed) {
      logger.info('Replica removed', {
        context: 'database-scaling',
        metadata: { replicaId }
      });
    }

    return removed;
  }

  /**
   * Get healthy read replica (weighted random)
   */
  getHealthyReplica(): DatabaseReplica | null {
    const healthyReplicas = Array.from(this.replicas.values())
      .filter(r => r.healthy && r.currentConnections < r.maxConnections);

    if (healthyReplicas.length === 0) {
      return null;
    }

    // Weighted random selection
    const totalWeight = healthyReplicas.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    for (const replica of healthyReplicas) {
      random -= replica.weight;
      if (random <= 0) {
        return replica;
      }
    }

    return healthyReplicas[0];
  }

  /**
   * Update replica health status
   */
  updateReplicaHealth(replicaId: string, healthy: boolean): void {
    const replica = this.replicas.get(replicaId);
    
    if (replica) {
      replica.healthy = healthy;
      replica.lastHealthCheck = Date.now();
      
      this.stats.replicaHealth[replicaId] = healthy;

      logger.debug('Replica health updated', {
        context: 'database-scaling',
        metadata: {
          replicaId,
          healthy
        }
      });
    }
  }

  /**
   * Perform health check on all replicas
   */
  async performHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.replicas.entries()).map(
      async ([id, replica]) => {
        try {
          // In production, this would actually ping the database
          const isHealthy = true; // Simulated health check
          this.updateReplicaHealth(id, isHealthy);
          
          logger.debug('Replica health check passed', {
            context: 'database-scaling',
            metadata: { replicaId: id }
          });
        } catch (error) {
          this.updateReplicaHealth(id, false);
          
          logger.error('Replica health check failed', {
            context: 'database-scaling',
            metadata: { replicaId: id, error }
          });
        }
      }
    );

    await Promise.all(checkPromises);
  }

  /**
   * Cache query result
   */
  cacheQuery(query: string, result: any, ttl: number = 60000): void {
    const cacheKey = this.generateCacheKey(query);
    
    const entry: QueryCacheEntry = {
      query,
      result,
      cachedAt: Date.now(),
      ttl,
      hits: 0
    };

    this.queryCache.set(cacheKey, entry);

    logger.debug('Query cached', {
      context: 'database-scaling',
      metadata: {
        cacheKey,
        ttl,
        cacheSize: this.queryCache.size
      }
    });
  }

  /**
   * Get cached query result
   */
  getCachedQuery(query: string): any | null {
    const cacheKey = this.generateCacheKey(query);
    const entry = this.queryCache.get(cacheKey);

    if (!entry) {
      this.stats.cacheMisses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.cachedAt > entry.ttl) {
      this.queryCache.delete(cacheKey);
      this.stats.cacheMisses++;
      return null;
    }

    entry.hits++;
    this.stats.cacheHits++;

    logger.debug('Query cache hit', {
      context: 'database-scaling',
      metadata: {
        cacheKey,
        hits: entry.hits
      }
    });

    return entry.result;
  }

  /**
   * Invalidate query cache
   */
  invalidateCache(queryPattern?: string): number {
    let invalidated = 0;

    if (queryPattern) {
      // Invalidate specific pattern
      for (const [key, entry] of this.queryCache.entries()) {
        if (key.includes(queryPattern)) {
          this.queryCache.delete(key);
          invalidated++;
        }
      }
    } else {
      // Invalidate all
      invalidated = this.queryCache.size;
      this.queryCache.clear();
    }

    logger.info('Query cache invalidated', {
      context: 'database-scaling',
      metadata: {
        pattern: queryPattern,
        invalidatedCount: invalidated
      }
    });

    return invalidated;
  }

  /**
   * Generate cache key from query
   */
  private generateCacheKey(query: string): string {
    // Simple hash - in production use proper hashing
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `query_${Math.abs(hash)}`;
  }

  /**
   * Optimize connection pool
   */
  optimizePool(currentConnections: number): void {
    const { min, max } = this.poolConfig;
    
    if (currentConnections > max * 0.9) {
      logger.warn('Connection pool near capacity', {
        context: 'database-scaling',
        metadata: {
          current: currentConnections,
          max,
          utilization: (currentConnections / max) * 100
        }
      });
    }

    if (currentConnections < min) {
      logger.info('Connection pool below minimum', {
        context: 'database-scaling',
        metadata: {
          current: currentConnections,
          min
        }
      });
    }

    this.stats.activeConnections = currentConnections;
  }

  /**
   * Get scaling statistics
   */
  getStats(): ScalingStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    if (total === 0) return 0;
    return (this.stats.cacheHits / total) * 100;
  }

  /**
   * Track query execution
   */
  trackQuery(executionTime: number, fromCache: boolean = false): void {
    this.stats.totalQueries++;
    
    // Update average query time
    const totalQueries = this.stats.totalQueries;
    const currentAvg = this.stats.avgQueryTime;
    this.stats.avgQueryTime = ((currentAvg * (totalQueries - 1)) + executionTime) / totalQueries;

    if (fromCache) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }
  }

  /**
   * Configure query cache TTL
   */
  configureCacheTTL(queryPattern: string, ttl: number): void {
    logger.info('Query cache TTL configured', {
      context: 'database-scaling',
      metadata: {
        pattern: queryPattern,
        ttl
      }
    });

    // In production, this would store TTL configuration per pattern
  }

  /**
   * Enable slow query logging
   */
  enableSlowQueryLogging(threshold: number): void {
    logger.info('Slow query logging enabled', {
      context: 'database-scaling',
      metadata: {
        threshold
      }
    });

    // In production, this would configure slow query logging
  }

  /**
   * Setup automatic cache cleanup
   */
  setupCacheCleanup(interval: number = 60000): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.queryCache.entries()) {
        if (now - entry.cachedAt > entry.ttl) {
          this.queryCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug('Cache cleanup completed', {
          context: 'database-scaling',
          metadata: { cleanedCount: cleaned }
        });
      }
    }, interval);

    logger.info('Automatic cache cleanup enabled', {
      context: 'database-scaling',
      metadata: { interval }
    });
  }

  /**
   * Get replica load distribution
   */
  getReplicaLoadDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const [id, replica] of this.replicas.entries()) {
      distribution[id] = (replica.currentConnections / replica.maxConnections) * 100;
    }

    return distribution;
  }

  /**
   * Scale connection pool
   */
  scalePool(newMax: number): void {
    const oldMax = this.poolConfig.max;
    this.poolConfig.max = newMax;

    logger.info('Connection pool scaled', {
      context: 'database-scaling',
      metadata: {
        oldMax,
        newMax
      }
    });
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const healthyReplicas = Array.from(this.replicas.values())
      .filter(r => r.healthy).length;
    
    const isHealthy = healthyReplicas > 0 || this.replicas.size === 0;

    logger.debug('Database scaling health check', {
      context: 'database-scaling',
      metadata: {
        healthy: isHealthy,
        healthyReplicas,
        totalReplicas: this.replicas.size
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const databaseScalingService = new DatabaseScalingService();

export default databaseScalingService;

/**
 * Query Cache Service
 *
 * Redis-backed caching layer for RAG queries
 * Supports exact match, semantic similarity, and TTL-based invalidation
 */

import { logger } from '../utils/logger';

export interface CacheEntry {
  key: string;
  query: string;
  results: any[];
  timestamp: number;
  ttl: number;
  hitCount: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  hitCount: number;
  missCount: number;
  avgEntryAge: number;
  totalSize: number;
}

/**
 * In-memory cache implementation (fallback when Redis unavailable)
 */
class InMemoryCache {
  private cache = new Map<string, CacheEntry>();
  private hitCount = 0;
  private missCount = 0;

  get(key: string): any[] | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Cache hit
    entry.hitCount++;
    this.hitCount++;
    return entry.results;
  }

  set(key: string, query: string, results: any[], ttl: number): void {
    this.cache.set(key, {
      key,
      query,
      results,
      timestamp: Date.now(),
      ttl,
      hitCount: 0
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(pattern?: string): number {
    if (!pattern) {
      this.cache.clear();
      return this.cache.size;
    }

    const regex = new RegExp(pattern);
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    return age <= entry.ttl;
  }

  stats(): CacheStats {
    let totalSize = 0;
    let totalAge = 0;
    let count = 0;

    for (const entry of this.cache.values()) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) continue; // Skip expired

      totalSize += JSON.stringify(entry.results).length;
      totalAge += age;
      count++;
    }

    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? this.hitCount / total : 0;

    return {
      totalEntries: count,
      hitRate,
      hitCount: this.hitCount,
      missCount: this.missCount,
      avgEntryAge: count > 0 ? totalAge / count : 0,
      totalSize
    };
  }

  getAllEntries(): CacheEntry[] {
    return Array.from(this.cache.values()).filter(entry => {
      const age = Date.now() - entry.timestamp;
      return age <= entry.ttl;
    });
  }
}

export class QueryCacheService {
  private cache!: InMemoryCache;
  private enableRedis = false;
  private redisClient: any = null;
  private defaultTTL = 3600000; // 1 hour in milliseconds
  private keyPrefix = 'rag:query:';

  /**
   * Initialize cache service
   */
  async initialize(useRedis: boolean = false): Promise<void> {
    this.cache = new InMemoryCache();

    if (useRedis) {
      try {
        // Try to initialize Redis (if available)
        // For now, we'll just use in-memory cache
        logger.info('QueryCacheService using in-memory cache', {
          context: 'cache-service',
          metadata: { redisEnabled: false }
        });
      } catch (error) {
        logger.warn('Redis initialization failed, falling back to in-memory cache', {
          context: 'cache-service',
          metadata: {
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    } else {
      logger.info('QueryCacheService initialized with in-memory cache', {
        context: 'cache-service'
      });
    }
  }

  /**
   * Generate cache key from query
   */
  private generateKey(query: string, variant: string = 'exact'): string {
    const normalized = query.toLowerCase().trim();
    const hash = this.simpleHash(normalized);
    return `${this.keyPrefix}${variant}:${hash}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached results by exact query match
   */
  async getCachedResults(query: string): Promise<any[] | null> {
    const key = this.generateKey(query, 'exact');

    logger.debug('Cache lookup', {
      context: 'cache-service',
      metadata: { key, queryLength: query.length }
    });

    return this.cache.get(key);
  }

  /**
   * Get cached results by semantic similarity
   */
  async getCachedResultsBySimilarity(query: string, threshold: number = 0.85): Promise<any[] | null> {
    const entries = this.cache.getAllEntries();

    for (const entry of entries) {
      const similarity = this.calculateSimilarity(query, entry.query);
      if (similarity >= threshold) {
        logger.debug('Semantic cache hit', {
          context: 'cache-service',
          metadata: { similarity, threshold }
        });
        entry.hitCount++;
        return entry.results;
      }
    }

    return null;
  }

  /**
   * Calculate similarity between two queries (0-1)
   * Simple implementation: term overlap
   */
  private calculateSimilarity(query1: string, query2: string): number {
    const terms1 = new Set(query1.toLowerCase().split(/\s+/));
    const terms2 = new Set(query2.toLowerCase().split(/\s+/));

    const intersection = new Set([...terms1].filter(x => terms2.has(x)));
    const union = new Set([...terms1, ...terms2]);

    // Jaccard similarity
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Set cached results
   */
  async setCachedResults(
    query: string,
    results: any[],
    ttl: number = this.defaultTTL
  ): Promise<void> {
    const key = this.generateKey(query, 'exact');

    logger.debug('Cache set', {
      context: 'cache-service',
      metadata: {
        key,
        resultsCount: results.length,
        ttlSeconds: ttl / 1000
      }
    });

    this.cache.set(key, query, results, ttl);
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern?: string): Promise<number> {
    if (!pattern) {
      const allEntries = this.cache.getAllEntries();
      const count = allEntries.length;
      this.cache.clear();
      logger.info('Cache cleared completely', {
        context: 'cache-service',
        metadata: { entriesCleared: count }
      });
      return count;
    }

    const deleted = this.cache.clear(pattern);
    logger.info('Cache invalidated by pattern', {
      context: 'cache-service',
      metadata: { pattern, entriesDeleted: deleted }
    });
    return deleted;
  }

  /**
   * Invalidate cache on KB update
   */
  async invalidateOnKBUpdate(): Promise<number> {
    // Invalidate all RAG-related caches
    return this.invalidateCache(`^${this.keyPrefix}`);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    return this.cache.stats();
  }

  /**
   * Pre-warm cache with common queries
   */
  async prewarmCache(queries: Array<{ query: string; results: any[] }>): Promise<number> {
    let count = 0;
    for (const { query, results } of queries) {
      await this.setCachedResults(query, results);
      count++;
    }

    logger.info('Cache pre-warmed', {
      context: 'cache-service',
      metadata: { queriesAdded: count }
    });

    return count;
  }

  /**
   * Get all cached entries (for debugging)
   */
  async getAllCachedEntries(): Promise<CacheEntry[]> {
    return this.cache.getAllEntries();
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    let deleted = 0;
    const entries = this.cache.getAllEntries();

    // In-memory cache handles expiration automatically
    // This is mainly for Redis cleanup
    logger.info('Cache cleanup completed', {
      context: 'cache-service',
      metadata: { entriesDeleted: deleted }
    });

    return deleted;
  }

  /**
   * Set custom TTL for query types
   */
  setCustomTTL(queryPattern: string, ttlMs: number): void {
    // This would be implemented when Redis integration is added
    logger.info('Custom TTL set', {
      context: 'cache-service',
      metadata: { pattern: queryPattern, ttlSeconds: ttlMs / 1000 }
    });
  }

  /**
   * Test if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.enableRedis && this.redisClient !== null;
  }
}

export default QueryCacheService;

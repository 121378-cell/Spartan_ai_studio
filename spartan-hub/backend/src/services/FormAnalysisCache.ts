/**
 * Form Analysis Cache Service
 * Phase A: Video Form Analysis MVP
 * 
 * Caches form analysis results for improved performance
 */

import { logger } from '../utils/logger';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in seconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class FormAnalysisCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };
  
  private defaultTTL: number = 300; // 5 minutes
  private maxEntries: number = 1000;

  constructor(options?: { defaultTTL?: number; maxEntries?: number }) {
    if (options?.defaultTTL) {
      this.defaultTTL = options.defaultTTL;
    }
    if (options?.maxEntries) {
      this.maxEntries = options.maxEntries;
    }

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get cached form analysis
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      logger.debug('Cache miss', {
        context: 'form-analysis-cache',
        metadata: { key }
      });
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // Convert to seconds
    
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug('Cache entry expired', {
        context: 'form-analysis-cache',
        metadata: { key, age: Math.round(age) }
      });
      return null;
    }

    this.stats.hits++;
    logger.debug('Cache hit', {
      context: 'form-analysis-cache',
      metadata: { key, age: Math.round(age) }
    });

    return entry.data as T;
  }

  /**
   * Cache form analysis result
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL
    });

    logger.debug('Cache entry created', {
      context: 'form-analysis-cache',
      metadata: { key, ttl: ttl ?? this.defaultTTL }
    });
  }

  /**
   * Delete cached entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug('Cache entry deleted', {
        context: 'form-analysis-cache',
        metadata: { key }
      });
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared', {
      context: 'form-analysis-cache'
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
    logger.info('Cache stats reset', {
      context: 'form-analysis-cache'
    });
  }

  /**
   * Get keys matching pattern
   */
  getKeys(pattern: string): string[] {
    const regex = new RegExp(pattern);
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Evicted oldest cache entry', {
        context: 'form-analysis-cache',
        metadata: { key: oldestKey }
      });
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);

    logger.debug('Cache cleanup interval started', {
      context: 'form-analysis-cache'
    });
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      const age = (now - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.debug('Cache cleanup completed', {
        context: 'form-analysis-cache',
        metadata: { cleaned }
      });
    }
  }
}

// Singleton instance
let instance: FormAnalysisCache | null = null;

export function getFormAnalysisCache(): FormAnalysisCache {
  if (!instance) {
    instance = new FormAnalysisCache();
  }
  return instance;
}

export default FormAnalysisCache;

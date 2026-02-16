/**
 * Cache service for external API results
 * Provides in-memory caching with TTL (Time To Live) support and event-based invalidation
 */

import logger from './logger';
import { createClient } from 'redis';
import config from '../config/configService';

// Interface for cache entry - unified interface for both Redis and in-memory storage
interface CacheEntry<T = any> {
  data: T;
  expiry: number; // Timestamp when the entry expires
  contentType?: string; // Optional content type for expiration policies
  tags?: string[]; // Optional tags for event-based invalidation
  timestamp: number; // Creation timestamp
  ttl: number; // Time to live in milliseconds
}

// Redis client for distributed cache
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Initialize Redis connection
redisClient.on('error', (err) => {
  logger.error('Redis Client Error', {
    context: 'redis',
    metadata: { error: err.message }
  });
});

// Connect to Redis with proper error handling for tests
const connectPromise = redisClient.connect();
if (connectPromise && typeof connectPromise.catch === 'function') {
  connectPromise.catch(err => {
    logger.error('Failed to connect to Redis', {
      context: 'redis',
      metadata: { error: err.message }
    });
  });
}

// Cache storage - fallback to in-memory if Redis fails
let cacheStore: Map<string, CacheEntry<any>> | null = new Map<string, CacheEntry<any>>();

// Tag to cache keys mapping for efficient invalidation
let tagIndex: Map<string, Set<string>> | null = new Map<string, Set<string>>();

// Track Redis availability
let redisAvailable = true;

// Initialize cache storage based on Redis availability
async function initializeCacheStorage() {
  try {
    // Test Redis connection
    await redisClient.ping();
    redisAvailable = true;
    logger.info('Redis connection established', { context: 'cache' });
    
    // Clear in-memory fallback if Redis is available
    cacheStore = null;
    tagIndex = null;
  } catch (error) {
    redisAvailable = false;
    logger.warn('Redis unavailable, using in-memory cache', {
      context: 'cache',
      metadata: { error: (error as Error).message }
    });
    
    // Initialize in-memory fallback
    cacheStore = new Map<string, CacheEntry<any>>();
    tagIndex = new Map<string, Set<string>>();
  }
}

// Initialize cache storage on module load
initializeCacheStorage();

// Default TTL (5 minutes)
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Content type based TTL policies (in milliseconds)
const CONTENT_TYPE_TTL_POLICIES: Record<string, number> = {
  // User-specific data - shorter TTL as it changes frequently
  'user/profile': 2 * 60 * 1000, // 2 minutes
  'user/preferences': 5 * 60 * 1000, // 5 minutes
  'user/progress': 3 * 60 * 1000, // 3 minutes

  // Exercise data - longer TTL as it rarely changes
  'exercise/list': 60 * 60 * 1000, // 1 hour
  'exercise/detail': 30 * 60 * 1000, // 30 minutes
  'exercise/search': 10 * 60 * 1000, // 10 minutes

  // Nutrition data - moderate TTL
  'nutrition/info': 30 * 60 * 1000, // 30 minutes
  'nutrition/search': 15 * 60 * 1000, // 15 minutes

  // Workout plans - longer TTL
  'workout/plan': 60 * 60 * 1000, // 1 hour
  'workout/template': 120 * 60 * 1000, // 2 hours

  // AI-generated content - shorter TTL as it's personalized
  'ai/alert': 5 * 60 * 1000, // 5 minutes
  'ai/decision': 10 * 60 * 1000, // 10 minutes
  'ai/recommendation': 15 * 60 * 1000, // 15 minutes

  // Default fallback
  'default': DEFAULT_TTL
};

/**
 * Generate a cache key from URL and parameters
 * @param url The API endpoint URL
 * @param params Optional parameters to include in the cache key
 * @returns Generated cache key
 */
export function generateCacheKey(url: string, params?: Record<string, any>): string {
  // Create a consistent cache key by combining URL and sorted parameters
  let key = url;

  if (params) {
    // Sort parameters to ensure consistent key generation regardless of parameter order
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');

    if (sortedParams) {
      key += `?${sortedParams}`;
    }
  }

  return key;
}

/**
 * Get TTL based on content type
 * @param contentType Content type identifier
 * @returns TTL in milliseconds
 */
export function getTtlForContentType(contentType: string): number {
  return CONTENT_TYPE_TTL_POLICIES[contentType] || CONTENT_TYPE_TTL_POLICIES['default'];
}

/**
 * Index cache entry by tags
 * @param key Cache key
 * @param tags Tags to index
 */
function indexTags(key: string, tags: string[] = []): void {
  if (redisAvailable) {
    // In Redis, we'll store tags separately
    tags.forEach(tag => {
      redisClient.sAdd(`tags:${tag}`, key);
    });
  } else {
    // Fallback to in-memory
    tags.forEach(tag => {
      if (!tagIndex!.has(tag)) {
        tagIndex!.set(tag, new Set());
      }
      tagIndex!.get(tag)!.add(key);
    });
  }
}

/**
 * Remove cache entry from tag index
 * @param key Cache key
 * @param tags Tags to remove from index
 */
function removeFromTagIndex(key: string, tags: string[] = []): void {
  if (redisAvailable) {
    // Remove from Redis tags
    tags.forEach(tag => {
      redisClient.sRem(`tags:${tag}`, key);
    });
  } else {
    // Fallback to in-memory
    tags.forEach(tag => {
      if (tagIndex!.has(tag)) {
        tagIndex!.get(tag)!.delete(key);
        // Clean up empty tag sets
        if (tagIndex!.get(tag)!.size === 0) {
          tagIndex!.delete(tag);
        }
      }
    });
  }
}

/**
 * Get cached data if available and not expired
 * @param key Cache key
 * @returns Cached data or null if not found or expired
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  let entry: CacheEntry<T> | null = null;
  
  if (redisAvailable) {
    // Try to get from Redis
    try {
      const cachedValue = (await redisClient.get(key)) as string | null;
      if (cachedValue) {
        const cachedString = typeof cachedValue === 'string' ? cachedValue : (cachedValue as any).toString();
        const parsedEntry: CacheEntry<T> = JSON.parse(cachedString);
        entry = parsedEntry;
      }
    } catch (error) {
      logger.error('Error getting from Redis cache', {
        context: 'cache',
        metadata: { key, error: (error as Error).message }
      });
      // Fallback to in-memory
      entry = cacheStore?.get(key) || null;
    }
  } else {
    // Use in-memory cache
    entry = cacheStore?.get(key) || null;
  }

  if (!entry) {
    incrementCacheMiss();
    return null;
  }

  // Check if entry has expired
  if (Date.now() > entry.expiry) {
    // Remove expired entry and update tag index
    await removeCachedData(key);
    incrementCacheMiss();
    return null;
  }

  incrementCacheHit();
  return entry.data;
}

/**
 * Set data in cache with TTL, content type, and tags
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in milliseconds (optional, defaults to 5 minutes)
 * @param contentType Optional content type for expiration policies
 * @param tags Optional tags for event-based invalidation
 */
export async function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_TTL, contentType?: string, tags?: string[]): Promise<void> {
  const expiry = Date.now() + ttl;
  
  if (redisAvailable) {
    // Store in Redis
    try {
      const entry: CacheEntry<T> = {
        data,
        expiry,
        contentType,
        tags,
        timestamp: Date.now(),
        ttl
      };
      
      await redisClient.setEx(key, Math.floor(ttl / 1000), JSON.stringify(entry));
      
      // Store tags in Redis
      if (tags) {
        for (const tag of tags) {
          await redisClient.sAdd(`tags:${tag}`, key);
        }
      }
    } catch (error) {
      logger.error('Error setting Redis cache', {
        context: 'cache',
        metadata: { key, error: (error as Error).message }
      });
      
      // Fallback to in-memory storage
      if (cacheStore) {
        // Remove old entry from tag index if it exists
        const oldEntry = cacheStore.get(key);
        if (oldEntry && oldEntry.tags) {
          removeFromTagIndex(key, oldEntry.tags);
        }
        
        cacheStore.set(key, {
          data,
          expiry,
          contentType,
          tags,
          timestamp: Date.now(),
          ttl
        });
        
        // Index new entry by tags
        if (tags) {
          indexTags(key, tags);
        }
      }
    }
  } else {
    // Use in-memory storage
    if (cacheStore) {
      // Remove old entry from tag index if it exists
      const oldEntry = cacheStore.get(key);
      if (oldEntry && oldEntry.tags) {
        removeFromTagIndex(key, oldEntry.tags);
      }
      
      cacheStore.set(key, {
        data,
        expiry,
        contentType,
        tags,
        timestamp: Date.now(),
        ttl
      });
      
      // Index new entry by tags
      if (tags) {
        indexTags(key, tags);
      }
    }
  }
  
  logger.debug(`✅ Cached data for key: ${key} (expires in ${ttl}ms)${contentType ? ` [${contentType}]` : ''}${tags ? ` {${tags.join(', ')}}` : ''}`);
}

/**
 * Remove data from cache
 * @param key Cache key
 */
export async function removeCachedData(key: string): Promise<void> {
  if (redisAvailable) {
    try {
      // Get the entry first to know its tags
      const cachedValue = (await redisClient.get(key)) as string | null;
      if (cachedValue) {
        const cachedString = typeof cachedValue === 'string' ? cachedValue : (cachedValue as any).toString();
        const entry: CacheEntry = JSON.parse(cachedString);
        if (entry.tags) {
          await removeFromTagIndex(key, entry.tags);
        }
        await redisClient.del(key);
      }
    } catch (error) {
      logger.error('Error removing from Redis cache', {
        context: 'cache',
        metadata: { key, error: (error as Error).message }
      });
      
      // Fallback to in-memory
      if (cacheStore) {
        const entry = cacheStore.get(key);
        if (entry && entry.tags) {
          removeFromTagIndex(key, entry.tags);
        }
        cacheStore.delete(key);
      }
    }
  } else {
    // Use in-memory
    if (cacheStore) {
      const entry = cacheStore.get(key);
      if (entry && entry.tags) {
        removeFromTagIndex(key, entry.tags);
      }
      cacheStore.delete(key);
    }
  }
  logger.debug(`🗑️ Removed cached data for key: ${key}`);
}

/**
 * Invalidate cache entries by tag
 * @param tag Tag to invalidate
 * @returns Number of entries invalidated
 */
export async function invalidateCacheByTag(tag: string): Promise<number> {
  let invalidatedCount = 0;
  
  if (redisAvailable) {
    try {
      // Get all keys with this tag from Redis
      const keys = await redisClient.sMembers(`tags:${tag}`);
      
      for (const key of keys) {
        // Remove the key from cache
        await redisClient.del(key);
        invalidatedCount++;
        logger.debug(`🗑️ Invalidated cache entry for key: ${key} due to tag: ${tag}`);
      }
      
      // Remove the tag set
      await redisClient.del(`tags:${tag}`);
    } catch (error) {
      logger.error('Error invalidating Redis cache by tag', {
        context: 'cache',
        metadata: { tag, error: (error as Error).message }
      });
      
      // Fallback to in-memory
      if (tagIndex) {
        const keysToInvalidate = tagIndex.get(tag);
        if (keysToInvalidate) {
          keysToInvalidate.forEach(key => {
            const entry = cacheStore?.get(key);
            if (entry) {
              cacheStore?.delete(key);
              invalidatedCount++;
              logger.debug(`🗑️ Invalidated cache entry for key: ${key} due to tag: ${tag}`);
            }
          });
          
          // Clear the tag index
          tagIndex.delete(tag);
        }
      }
    }
  } else {
    // Use in-memory
    if (tagIndex) {
      const keysToInvalidate = tagIndex.get(tag);
      if (keysToInvalidate) {
        keysToInvalidate.forEach(key => {
          const entry = cacheStore?.get(key);
          if (entry) {
            cacheStore?.delete(key);
            invalidatedCount++;
            logger.debug(`🗑️ Invalidated cache entry for key: ${key} due to tag: ${tag}`);
          }
        });
        
        // Clear the tag index
        tagIndex.delete(tag);
      }
    }
  }
  
  logger.info(`✅ Invalidated ${invalidatedCount} cache entries for tag: ${tag}`);
  return invalidatedCount;
}

/**
 * Invalidate cache entries by multiple tags
 * @param tags Tags to invalidate
 * @returns Number of entries invalidated
 */
export async function invalidateCacheByTags(tags: string[]): Promise<number> {
  let totalInvalidated = 0;
  for (const tag of tags) {
    totalInvalidated += await invalidateCacheByTag(tag);
  }
  return totalInvalidated;
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  if (redisAvailable) {
    try {
      // Clear all keys in Redis
      await redisClient.flushAll();
    } catch (error) {
      logger.error('Error clearing Redis cache', {
        context: 'cache',
        metadata: { error: (error as Error).message }
      });
      
      // Fallback to in-memory
      if (cacheStore) {
        cacheStore.clear();
        tagIndex?.clear();
      }
    }
  } else {
    // Use in-memory
    if (cacheStore) {
      cacheStore.clear();
      tagIndex?.clear();
    }
  }
  logger.info('🧹 Cache cleared');
}

/**
 * Get cache statistics
 * @returns Cache statistics
 */
export async function getCacheStats(): Promise<{
  size: number;
  keys: string[];
  contentTypeDistribution: Record<string, number>;
  tagDistribution: Record<string, number>;
}> {
  const contentTypeDistribution: Record<string, number> = {};
  const tagDistribution: Record<string, number> = {};
  
  let size = 0;
  let keys: string[] = [];
  
  if (redisAvailable) {
    try {
      // Get all keys in Redis
      const redisKeysRaw = (await redisClient.keys('*')) as string[];
      const redisKeys = redisKeysRaw.map(k => k);
      
      // Filter out tag keys (which start with 'tags:')
      const dataKeys = redisKeys.filter(key => !key.startsWith('tags:'));
      size = dataKeys.length;
      keys = dataKeys;
      
      // Get content type distribution
      for (const key of dataKeys) {
        const value = (await redisClient.get(key)) as string | null;
        if (value) {
          const valueString = typeof value === 'string' ? value : (value as any).toString();
          const entry: CacheEntry = JSON.parse(valueString);
          const contentType = entry.contentType || 'unknown';
          contentTypeDistribution[contentType] = (contentTypeDistribution[contentType] || 0) + 1;
        }
      }
      
      // Get tag distribution
      const tagKeys = redisKeys.filter(key => key.startsWith('tags:'));
      for (const tagKey of tagKeys) {
        const tag = tagKey.substring(5); // Remove 'tags:' prefix
        const tagCount = await redisClient.sCard(tagKey);
        tagDistribution[tag] = Number(tagCount) || 0;
      }
    } catch (error) {
      logger.error('Error getting Redis cache stats', {
        context: 'cache',
        metadata: { error: (error as Error).message }
      });
      
      // Fallback to in-memory
      if (cacheStore) {
        size = cacheStore.size;
        keys = Array.from(cacheStore.keys());
        
        cacheStore.forEach((entry) => {
          const contentType = entry.contentType || 'unknown';
          contentTypeDistribution[contentType] = (contentTypeDistribution[contentType] || 0) + 1;
        });
        
        tagIndex?.forEach((keys, tag) => {
          tagDistribution[tag] = keys.size;
        });
      }
    }
  } else {
    // Use in-memory
    if (cacheStore) {
      size = cacheStore.size;
      keys = Array.from(cacheStore.keys());
      
      cacheStore.forEach((entry) => {
        const contentType = entry.contentType || 'unknown';
        contentTypeDistribution[contentType] = (contentTypeDistribution[contentType] || 0) + 1;
      });
      
      tagIndex?.forEach((keys, tag) => {
        tagDistribution[tag] = keys.size;
      });
    }
  }
  
  return {
    size,
    keys,
    contentTypeDistribution,
    tagDistribution
  };
}

/**
 * Cache wrapper for async functions with content type based TTL and tags
 * @param key Cache key
 * @param fn Async function to execute
 * @param contentType Optional content type for expiration policies
 * @param tags Optional tags for event-based invalidation
 * @param ttl Time to live in milliseconds (optional, if not provided, uses content type policy)
 * @returns Cached data or result of the async function
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  contentType?: string,
  tags?: string[],
  ttl?: number
): Promise<T> {
  // Try to get cached data first
  const cachedData = await getCachedData<T>(key);

  if (cachedData !== null) {
    logger.debug(`🎯 Cache hit for key: ${key}${contentType ? ` [${contentType}]` : ''}${tags ? ` {${tags.join(', ')}}` : ''}`);
    return cachedData;
  }

  logger.debug(`🔴 Cache miss for key: ${key}${contentType ? ` [${contentType}]` : ''}${tags ? ` {${tags.join(', ')}}` : ''}`);

  // Determine TTL - use provided TTL, content type policy, or default
  const effectiveTtl = ttl || (contentType ? getTtlForContentType(contentType) : DEFAULT_TTL);

  // Execute the function and cache the result
  try {
    const result = await fn();
    await setCachedData(key, result, effectiveTtl, contentType, tags);
    return result;
  } catch (error) {
    logger.error(`❌ Error executing function for cache key ${key}:`, { metadata: { error } });
    throw error;
  }
}

/**
 * Cache wrapper with conditional caching based on parameters, content type, and tags
 * @param url The API endpoint URL
 * @param params Optional parameters
 * @param fn Async function to execute
 * @param contentType Optional content type for expiration policies
 * @param tags Optional tags for event-based invalidation
 * @param ttl Time to live in milliseconds (optional, if not provided, uses content type policy)
 * @param shouldCache Function to determine if result should be cached (optional)
 * @returns Cached data or result of the async function
 */
export async function withConditionalCache<T>(
  url: string,
  params: Record<string, any>,
  fn: () => Promise<T>,
  contentType?: string,
  tags?: string[],
  ttl?: number,
  shouldCache?: (result: T) => boolean
): Promise<T> {
  const key = generateCacheKey(url, params);

  // Try to get cached data first
  const cachedData = await getCachedData<T>(key);

  if (cachedData !== null) {
    logger.debug(`🎯 Cache hit for key: ${key}${contentType ? ` [${contentType}]` : ''}${tags ? ` {${tags.join(', ')}}` : ''}`);
    return cachedData;
  }

  logger.debug(`🔴 Cache miss for key: ${key}${contentType ? ` [${contentType}]` : ''}${tags ? ` {${tags.join(', ')}}` : ''}`);

  // Determine TTL - use provided TTL, content type policy, or default
  const effectiveTtl = ttl || (contentType ? getTtlForContentType(contentType) : DEFAULT_TTL);

  // Execute the function
  try {
    const result = await fn();

    // Check if result should be cached
    const shouldCacheResult = shouldCache ? shouldCache(result) : true;

    if (shouldCacheResult) {
      await setCachedData(key, result, effectiveTtl, contentType, tags);
    } else {
      logger.debug(`⏭️ Skipping cache for key: ${key}${contentType ? ` [${contentType}]` : ''}${tags ? ` {${tags.join(', ')}}` : ''} (shouldCache returned false)`);
    }

    return result;
  } catch (error) {
    logger.error(`❌ Error executing function for cache key ${key}:`, { metadata: { error } });
    throw error;
  }
}

export default {
  generateCacheKey,
  getTtlForContentType,
  getCachedData,
  setCachedData,
  removeCachedData,
  invalidateCacheByTag,
  invalidateCacheByTags,
  clearCache,
  getCacheStats,
  withCache,
  withConditionalCache
};

// Export Redis client for health checks
export { redisClient };

// Cache metrics for performance monitoring
let cacheHits = 0;
let cacheMisses = 0;

export function getCacheMetrics() {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0
  };
}

// Update cache hit/miss counters
export function incrementCacheHit(): void {
  cacheHits++;
}

export function incrementCacheMiss(): void {
  cacheMisses++;
}

// Reset cache metrics
export function resetCacheMetrics(): void {
  cacheHits = 0;
  cacheMisses = 0;
}
/**
 * Rate Limiter Utility
 * Provides request rate limiting to prevent abuse and denial of service attacks
 */

import { logger } from './logger';

// Interface for rate limit data
interface RateLimitData {
  count: number;
  resetTime: number;
}

// In-memory store for rate limits (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitData>();

// Cleanup interval to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  // Collect keys to delete first to avoid modifying the map during iteration
  rateLimitStore.forEach((data, key) => {
    if (data.resetTime < now) {
      keysToDelete.push(key);
    }
  });
  
  // Delete the collected keys
  keysToDelete.forEach(key => {
    rateLimitStore.delete(key);
  });
  
  // Log cleanup activity
  if (keysToDelete.length > 0) {
    logger.debug(`Cleaned up ${keysToDelete.length} expired rate limit entries`, {
      context: 'rateLimiter',
      metadata: {
        cleanedEntries: keysToDelete.length
      }
    });
  }
}, 60000); // Clean up every minute

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly keyPrefix: string;

  constructor(maxRequests: number, windowMs: number, keyPrefix: string = '') {
    if (maxRequests <= 0) {
      throw new Error('Max requests must be greater than 0');
    }
    if (windowMs <= 0) {
      throw new Error('Window time must be greater than 0');
    }
    
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Generate a unique key for rate limiting
   * @param identifier Unique identifier (IP address, user ID, etc.)
   * @returns Prefixed key for storage
   */
  private generateKey(identifier: string): string {
    return `${this.keyPrefix}:${identifier}`;
  }

  /**
   * Check if a request is within rate limits
   * @param identifier Unique identifier (IP address, user ID, etc.)
   * @returns Object with rate limit status and headers
   */
  checkRateLimit(identifier: string): {
    isAllowed: boolean;
    current: number;
    remaining: number;
    resetTime: number;
    retryAfter: number;
  } {
    const key = this.generateKey(identifier);
    const now = Date.now();
    
    // Get current rate limit data
    let rateLimitData = rateLimitStore.get(key);
    
    // If no data exists or window has expired, reset
    if (!rateLimitData || rateLimitData.resetTime <= now) {
      rateLimitData = {
        count: 0,
        resetTime: now + this.windowMs
      };
    }
    
    // Increment request count
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);
    
    // Calculate remaining requests
    const remaining = Math.max(0, this.maxRequests - rateLimitData.count);
    
    // Calculate retry after time
    const retryAfter = Math.max(0, Math.ceil((rateLimitData.resetTime - now) / 1000));
    
    const isAllowed = rateLimitData.count <= this.maxRequests;
    
    // Log rate limit checks
    if (!isAllowed) {
      logger.warn('Rate limit exceeded', {
        context: 'rateLimiter',
        metadata: {
          identifier,
          keyPrefix: this.keyPrefix,
          current: rateLimitData.count,
          maxRequests: this.maxRequests,
          remaining,
          retryAfter
        }
      });
    }
    
    return {
      isAllowed,
      current: rateLimitData.count,
      remaining,
      resetTime: rateLimitData.resetTime,
      retryAfter
    };
  }

  /**
   * Reset rate limit for an identifier
   * @param identifier Unique identifier (IP address, user ID, etc.)
   */
  resetRateLimit(identifier: string): void {
    const key = this.generateKey(identifier);
    rateLimitStore.delete(key);
    
    logger.info('Rate limit reset for identifier', {
      context: 'rateLimiter',
      metadata: {
        identifier,
        keyPrefix: this.keyPrefix
      }
    });
  }

  /**
   * Get current rate limit status without incrementing
   * @param identifier Unique identifier (IP address, user ID, etc.)
   * @returns Object with current rate limit status
   */
  getRateLimitStatus(identifier: string): {
    current: number;
    remaining: number;
    resetTime: number;
    retryAfter: number;
  } {
    const key = this.generateKey(identifier);
    const now = Date.now();
    
    const rateLimitData = rateLimitStore.get(key) || {
      count: 0,
      resetTime: now + this.windowMs
    };
    
    const remaining = Math.max(0, this.maxRequests - rateLimitData.count);
    const retryAfter = Math.max(0, Math.ceil((rateLimitData.resetTime - now) / 1000));
    
    return {
      current: rateLimitData.count,
      remaining,
      resetTime: rateLimitData.resetTime,
      retryAfter
    };
  }
}

// Predefined rate limiters for different use cases
export const GLOBAL_RATE_LIMITER = new RateLimiter(1000, 60000, 'global'); // 1000 requests per minute
export const AUTH_RATE_LIMITER = new RateLimiter(10, 60000, 'auth'); // 10 auth requests per minute
export const API_RATE_LIMITER = new RateLimiter(100, 60000, 'api'); // 100 API requests per minute
export const HEAVY_API_RATE_LIMITER = new RateLimiter(20, 60000, 'heavy_api'); // 20 heavy API requests per minute

export default {
  RateLimiter,
  GLOBAL_RATE_LIMITER,
  AUTH_RATE_LIMITER,
  API_RATE_LIMITER,
  HEAVY_API_RATE_LIMITER
};
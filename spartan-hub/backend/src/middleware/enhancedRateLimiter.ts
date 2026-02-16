/**
 * Enhanced Rate Limiter with Security Features
 * Provides rate limiting with security monitoring and adaptive limits
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  banThreshold?: number; // Threshold for temporary bans
  banDuration?: number; // Ban duration in milliseconds
}

interface ClientInfo {
  ip: string;
  userAgent: string;
  apiKey?: string;
}

interface RateLimitRecord {
  count: number;
  firstRequest: number;
  lastRequest: number;
  bannedUntil?: number;
  violationCount: number;
}

class EnhancedRateLimiter {
  private readonly config: RateLimitConfig;
  private readonly records: Map<string, RateLimitRecord> = new Map();
  private readonly banRecords: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      banThreshold: 5,
      banDuration: 30 * 60 * 1000, // 30 minutes
      ...config
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRecords();
    }, 60 * 1000); // Cleanup every minute
  }

  /**
   * Extract client identifier
   */
  private getClientKey(req: Request): string {
    // Use IP address as primary identifier
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Include API key if present for better identification
    const apiKey = req.headers['authorization']?.replace('Bearer ', '') || 
                   req.headers['x-api-key'] as string || '';
    
    return `${ip}:${apiKey}`;
  }

  /**
   * Check if client is currently banned
   */
  private isClientBanned(clientKey: string): boolean {
    const banUntil = this.banRecords.get(clientKey);
    if (!banUntil) return false;
    
    if (Date.now() > banUntil) {
      this.banRecords.delete(clientKey);
      return false;
    }
    
    return true;
  }

  /**
   * Ban a client temporarily
   */
  private banClient(clientKey: string): void {
    const banUntil = Date.now() + this.config.banDuration!;
    this.banRecords.set(clientKey, banUntil);
    
    logger.warn('Client temporarily banned for rate limiting violations', {
      context: 'rate-limiting',
      metadata: {
        clientKey,
        banUntil: new Date(banUntil).toISOString(),
        banDuration: this.config.banDuration
      }
    });
  }

  /**
   * Process rate limiting for a request
   */
  public processRequest(req: Request, res: Response, next: NextFunction): void {
    try {
      const clientKey = this.getClientKey(req);
      const now = Date.now();

      // Check if client is banned
      if (this.isClientBanned(clientKey)) {
        const banUntil = this.banRecords.get(clientKey)!;
        const remainingTime = Math.ceil((banUntil - now) / 1000);
        
        res.status(429).json({
          success: false,
          message: 'Too many requests - temporarily banned',
          retryAfter: remainingTime,
          bannedUntil: new Date(banUntil).toISOString()
        });
        return;
      }

      // Get or create rate limit record
      let record = this.records.get(clientKey);
      if (!record) {
        record = {
          count: 0,
          firstRequest: now,
          lastRequest: now,
          violationCount: 0
        };
        this.records.set(clientKey, record);
      }

      // Reset counter if window has expired
      if (now - record.firstRequest > this.config.windowMs) {
        record.count = 0;
        record.firstRequest = now;
        record.violationCount = Math.max(0, record.violationCount - 1);
      }

      // Increment request count
      record.count++;
      record.lastRequest = now;

      // Calculate remaining requests and reset time
      const remaining = Math.max(0, this.config.maxRequests - record.count);
      const resetTime = new Date(record.firstRequest + this.config.windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

      // Check if limit exceeded
      if (record.count > this.config.maxRequests) {
        record.violationCount++;
        
        logger.warn('Rate limit exceeded', {
          context: 'rate-limiting',
          metadata: {
            clientKey,
            count: record.count,
            maxRequests: this.config.maxRequests,
            violationCount: record.violationCount,
            userAgent: req.headers['user-agent']
          }
        });

        // Check for ban threshold
        if (record.violationCount >= this.config.banThreshold!) {
          this.banClient(clientKey);
          
          res.status(429).json({
            success: false,
            message: 'Too many requests - temporarily banned',
            retryAfter: Math.ceil(this.config.banDuration! / 1000),
            violationCount: record.violationCount
          });
          return;
        }

        // Standard rate limit exceeded response
        res.status(429).json({
          success: false,
          message: 'Too many requests',
          retryAfter: Math.ceil((this.config.windowMs - (now - record.firstRequest)) / 1000),
          violationCount: record.violationCount
        });
        return;
      }

      // Request is allowed
      next();
    } catch (error) {
      logger.error('Rate limiting error', {
        context: 'rate-limiting',
        metadata: { error }
      });
      next(); // Allow request through on error
    }
  }

  /**
   * Get current rate limit status for a client
   */
  public getStatus(req: Request): {
    limit: number;
    remaining: number;
    reset: Date;
    banned: boolean;
    violationCount: number;
  } {
    const clientKey = this.getClientKey(req);
    const record = this.records.get(clientKey);
    const now = Date.now();

    if (!record) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        reset: new Date(now + this.config.windowMs),
        banned: this.isClientBanned(clientKey),
        violationCount: 0
      };
    }

    const remaining = Math.max(0, this.config.maxRequests - record.count);
    const resetTime = record.firstRequest + this.config.windowMs;

    return {
      limit: this.config.maxRequests,
      remaining,
      reset: new Date(resetTime),
      banned: this.isClientBanned(clientKey),
      violationCount: record.violationCount
    };
  }

  /**
   * Cleanup expired records to prevent memory leaks
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now();
    const expirationTime = this.config.windowMs * 2; // Keep records for 2 windows
    
    let cleanedCount = 0;
    
    for (const [key, record] of this.records.entries()) {
      if (now - record.lastRequest > expirationTime) {
        this.records.delete(key);
        cleanedCount++;
      }
    }

    // Also cleanup expired bans
    let banCleanedCount = 0;
    for (const [key, banUntil] of this.banRecords.entries()) {
      if (now > banUntil) {
        this.banRecords.delete(key);
        banCleanedCount++;
      }
    }

    if (cleanedCount > 0 || banCleanedCount > 0) {
      logger.debug('Rate limiter cleanup completed', {
        context: 'rate-limiting',
        metadata: {
          recordsCleaned: cleanedCount,
          bansCleaned: banCleanedCount,
          activeRecords: this.records.size,
          activeBans: this.banRecords.size
        }
      });
    }
  }

  /**
   * Stop the rate limiter and cleanup
   */
  public stop(): void {
    clearInterval(this.cleanupInterval);
    this.records.clear();
    this.banRecords.clear();
  }
}

// Predefined rate limiters
export const apiRateLimiter = new EnhancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  banThreshold: 3, // Ban after 3 violations
  banDuration: 30 * 60 * 1000 // 30 minutes ban
});

export const authRateLimiter = new EnhancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth requests per window
  banThreshold: 2, // Ban after 2 violations
  banDuration: 60 * 60 * 1000 // 1 hour ban
});

export const strictRateLimiter = new EnhancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  banThreshold: 2, // Ban after 2 violations
  banDuration: 15 * 60 * 1000 // 15 minutes ban
});

// Express middleware wrappers
export const apiRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  apiRateLimiter.processRequest(req, res, next);
};

export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  authRateLimiter.processRequest(req, res, next);
};

export const strictRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  strictRateLimiter.processRequest(req, res, next);
};

export default {
  EnhancedRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  strictRateLimiter,
  apiRateLimit,
  authRateLimit,
  strictRateLimit
};
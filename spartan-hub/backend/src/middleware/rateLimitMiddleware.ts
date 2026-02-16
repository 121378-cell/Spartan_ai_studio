/**
 * Rate Limiting Middleware
 * Provides Express middleware for rate limiting requests to prevent abuse
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import config from '../config/configService';

// Check if Redis is enabled
const isRedisEnabled = process.env.NODE_ENV !== 'test' && process.env.REDIS_URL && process.env.REDIS_URL !== '';
let redisClient: RedisClientType | null = null;

if (isRedisEnabled) {
  // Create Redis client for rate limiting
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  if (redisClient) {
    redisClient.on('error', (err: Error) => {
      logger.error('Redis Client Error', {
        context: 'redis',
        metadata: { error: err.message }
      });
    });

    // Connect to Redis
    redisClient.connect().catch((err: Error) => {
      logger.error('Failed to connect to Redis', {
        context: 'redis',
        metadata: { error: err.message }
      });
    });
  }
} else {
  logger.info('Redis disabled, using memory store for rate limiting', {
    context: 'rateLimit',
    metadata: { redisEnabled: false }
  });
}

// Helper to skip rate limiting in test environment
const skipInTest = () => process.env.NODE_ENV === 'test';

// Configure standard rate limiter options
const standardOptions = {
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: skipInTest, // Skip rate limiting in test environment
};

/**
 * Global rate limiter - 1000 requests per 15 minutes
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  store: isRedisEnabled ? new RedisStore({
    sendCommand: async (...args: string[]) => {
      // Validate Redis client connection before sending command
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available for rate limiting', {
          context: 'rateLimit'
        });
        return [];
      }
      return redisClient.sendCommand(args);
    },
  }) : undefined,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED_GLOBAL',
    retryAfter: 'Please try again later.'
  },
  ...standardOptions, // Apply standard options including skip
  handler: (req: Request, res: Response, next: NextFunction) => {
    // Log rate limit exceeded event
    logger.warn('Rate limit exceeded', {
      context: 'rateLimit',
      metadata: {
        ip: req.ip,
        method: req.method,
        url: req.url,
        forwardedFor: req.headers['x-forwarded-for'],
        userAgent: req.get('User-Agent')
      }
    });

    // Send the rate limit response
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED_GLOBAL',
      retryAfter: 'Please try again later.'
    });
  }
});

/**
 * Auth endpoint rate limiter - 5 requests per 15 minutes
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs (increased for development)
  store: isRedisEnabled ? new RedisStore({
    sendCommand: async (...args: string[]) => {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available for rate limiting', {
          context: 'rateLimit'
        });
        return [];
      }
      return redisClient.sendCommand(args);
    },
  }) : undefined,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED_AUTH',
    retryAfter: 'Please try again later.'
  },
  ...standardOptions,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response, next: NextFunction) => {
    // Log rate limit exceeded event
    logger.warn('Auth rate limit exceeded', {
      context: 'rateLimit',
      metadata: {
        ip: req.ip,
        method: req.method,
        url: req.url,
        forwardedFor: req.headers['x-forwarded-for'],
        userAgent: req.get('User-Agent')
      }
    });

    // Set Retry-After header
    const resetTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    res.set('Retry-After', '900'); // 15 minutes in seconds

    // Send the rate limit response
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED_AUTH',
      retryAfter: 'Please try again later.'
    });
  }
});

/**
 * GET request rate limiter (data reading) - 100 requests per 15 minutes
 */
export const getRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs (flexible for GET requests)
  store: isRedisEnabled ? new RedisStore({
    sendCommand: async (...args: string[]) => {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available for rate limiting', {
          context: 'rateLimit'
        });
        return [];
      }
      return redisClient.sendCommand(args);
    },
  }) : undefined,
  message: {
    success: false,
    message: 'Too many API requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED_GET',
    retryAfter: 'Please try again later.'
  },
  ...standardOptions,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response, next: NextFunction) => {
    // Log rate limit exceeded event
    logger.warn('GET API rate limit exceeded', {
      context: 'rateLimit',
      metadata: {
        ip: req.ip,
        method: req.method,
        url: req.url,
        forwardedFor: req.headers['x-forwarded-for'],
        userAgent: req.get('User-Agent')
      }
    });

    // Set Retry-After header
    res.set('Retry-After', '900'); // 15 minutes in seconds

    // Send the rate limit response
    res.status(429).json({
      success: false,
      message: 'Too many API requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED_GET',
      retryAfter: 'Please try again later.'
    });
  }
});

/**
 * POST/PUT/DELETE request rate limiter (data modification) - 20 requests per 15 minutes
 */
export const writeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs (moderate for write operations)
  store: isRedisEnabled ? new RedisStore({
    sendCommand: async (...args: string[]) => {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available for rate limiting', {
          context: 'rateLimit'
        });
        return [];
      }
      return redisClient.sendCommand(args);
    },
  }) : undefined,
  message: {
    success: false,
    message: 'Too many write requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED_WRITE',
    retryAfter: 'Please try again later.'
  },
  ...standardOptions,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response, next: NextFunction) => {
    // Log rate limit exceeded event
    logger.warn('Write API rate limit exceeded', {
      context: 'rateLimit',
      metadata: {
        ip: req.ip,
        method: req.method,
        url: req.url,
        forwardedFor: req.headers['x-forwarded-for'],
        userAgent: req.get('User-Agent')
      }
    });

    // Set Retry-After header
    res.set('Retry-After', '900'); // 15 minutes in seconds

    // Send the rate limit response
    res.status(429).json({
      success: false,
      message: 'Too many write requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED_WRITE',
      retryAfter: 'Please try again later.'
    });
  }
});

/**
 * API endpoint rate limiter (general) - 50 requests per 15 minutes
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (moderate for general API)
  store: isRedisEnabled ? new RedisStore({
    sendCommand: async (...args: string[]) => {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available for rate limiting', {
          context: 'rateLimit'
        });
        return [];
      }
      return redisClient.sendCommand(args);
    },
  }) : undefined,
  message: {
    success: false,
    message: 'Too many API requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED_API',
    retryAfter: 'Please try again later.'
  },
  ...standardOptions,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response, next: NextFunction) => {
    // Log rate limit exceeded event
    logger.warn('API rate limit exceeded', {
      context: 'rateLimit',
      metadata: {
        ip: req.ip,
        method: req.method,
        url: req.url,
        forwardedFor: req.headers['x-forwarded-for'],
        userAgent: req.get('User-Agent')
      }
    });

    // Set Retry-After header
    res.set('Retry-After', '900'); // 15 minutes in seconds

    // Send the rate limit response
    res.status(429).json({
      success: false,
      message: 'Too many API requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED_API',
      retryAfter: 'Please try again later.'
    });
  }
});

/**
 * Heavy API endpoint rate limiter - 20 requests per 15 minutes (for AI endpoints)
 */
export const heavyApiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  store: isRedisEnabled ? new RedisStore({
    sendCommand: async (...args: string[]) => {
      if (!redisClient || !redisClient.isOpen) {
        logger.warn('Redis client not available for rate limiting', {
          context: 'rateLimit'
        });
        return [];
      }
      return redisClient.sendCommand(args);
    },
  }) : undefined,
  message: {
    success: false,
    message: 'Too many heavy API requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED_HEAVY_API',
    retryAfter: 'Please try again later.'
  },
  ...standardOptions,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response, next: NextFunction) => {
    // Log rate limit exceeded event
    logger.warn('Heavy API rate limit exceeded', {
      context: 'rateLimit',
      metadata: {
        ip: req.ip,
        method: req.method,
        url: req.url,
        forwardedFor: req.headers['x-forwarded-for'],
        userAgent: req.get('User-Agent')
      }
    });

    // Set Retry-After header
    res.set('Retry-After', '900'); // 15 minutes in seconds

    // Send the rate limit response
    res.status(429).json({
      success: false,
      message: 'Too many heavy API requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED_HEAVY_API',
      retryAfter: 'Please try again later.'
    });
  }
});

/**
 * Custom rate limiting middleware
 * Allows configuration of custom rate limits
 */
export const customRateLimit = (maxRequests: number, windowMs: number, keyPrefix: string = 'custom') => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    store: isRedisEnabled ? new RedisStore({
      sendCommand: async (...args: string[]) => {
        if (!redisClient || !redisClient.isOpen) {
          logger.warn('Redis client not available for rate limiting', {
            context: 'rateLimit'
          });
          return [];
        }
        return redisClient.sendCommand(args);
      },
    }) : undefined,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED_CUSTOM',
      retryAfter: 'Please try again later.'
    },
    ...standardOptions,
    skipSuccessfulRequests: false,
    handler: (req: Request, res: Response, next: NextFunction) => {
      // Log rate limit exceeded event
      logger.warn('Custom rate limit exceeded', {
        context: 'rateLimit',
        metadata: {
          ip: req.ip,
          method: req.method,
          url: req.url,
          forwardedFor: req.headers['x-forwarded-for'],
          userAgent: req.get('User-Agent')
        }
      });

      // Set Retry-After header
      const resetTime = new Date(Date.now() + windowMs);
      res.set('Retry-After', Math.ceil(windowMs / 1000).toString());

      // Send the rate limit response
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED_CUSTOM',
        retryAfter: 'Please try again later.'
      });
    }
  });
};

export default {
  globalRateLimit,
  authRateLimit,
  getRateLimit,
  writeRateLimit,
  apiRateLimit,
  heavyApiRateLimit,
  customRateLimit
};

// Export Redis client for testing
export { redisClient };
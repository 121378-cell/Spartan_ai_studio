/**
 * Rate Limiter Middleware
 * Simple factory function for creating rate limiters
 * Re-exports from enhancedRateLimiter for compatibility
 */

import { Request, Response, NextFunction } from 'express';
import { apiRateLimit, authRateLimit, strictRateLimit } from './enhancedRateLimiter';

/**
 * Create a rate limiter middleware with custom configuration
 * @param maxRequests - Maximum requests allowed in the window
 * @returns Express middleware function
 */
export const rateLimiter = (maxRequests: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Use strict rate limiter for low limits, api rate limiter for higher limits
    if (maxRequests <= 10) {
      strictRateLimit(req, res, next);
    } else if (maxRequests <= 20) {
      authRateLimit(req, res, next);
    } else {
      apiRateLimit(req, res, next);
    }
  };
};

// Re-export other rate limiting utilities
export { apiRateLimit, authRateLimit, strictRateLimit };

// Export rateLimiter as rateLimitMiddleware for compatibility
export { rateLimiter as rateLimitMiddleware };

// Export rateLimiter as rateLimiting for compatibility
export { rateLimiter as rateLimiting };

export default rateLimiter;

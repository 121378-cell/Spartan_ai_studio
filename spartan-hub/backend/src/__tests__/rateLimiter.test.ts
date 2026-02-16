/**
 * Test suite for rate limiting utilities
 */

import { RateLimiter, GLOBAL_RATE_LIMITER, AUTH_RATE_LIMITER, API_RATE_LIMITER, HEAVY_API_RATE_LIMITER } from '../utils/rateLimiter';

describe('Rate Limiter Utilities', () => {
  describe('RateLimiter Class', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(5, 1000, 'test'); // 5 requests per second
    });

    it('should allow requests within limit', () => {
      const clientId = 'test-client-1';
      
      // First request should be allowed
      const result1 = rateLimiter.checkRateLimit(clientId);
      expect(result1.isAllowed).toBe(true);
      expect(result1.current).toBe(1);
      expect(result1.remaining).toBe(4);
      
      // Second request should be allowed
      const result2 = rateLimiter.checkRateLimit(clientId);
      expect(result2.isAllowed).toBe(true);
      expect(result2.current).toBe(2);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests exceeding limit', () => {
      const clientId = 'test-client-2';
      
      // Make 5 requests (at limit)
      for (let i = 1; i <= 5; i++) {
        const result = rateLimiter.checkRateLimit(clientId);
        expect(result.isAllowed).toBe(true);
        expect(result.current).toBe(i);
      }
      
      // 6th request should be blocked
      const result = rateLimiter.checkRateLimit(clientId);
      expect(result.isAllowed).toBe(false);
      expect(result.current).toBe(6);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', (done) => {
      const clientId = 'test-client-3';
      const fastRateLimiter = new RateLimiter(2, 100, 'fast-test'); // 2 requests per 100ms
      
      // Use all requests
      const result1 = fastRateLimiter.checkRateLimit(clientId);
      expect(result1.isAllowed).toBe(true);
      
      const result2 = fastRateLimiter.checkRateLimit(clientId);
      expect(result2.isAllowed).toBe(true);
      
      // Next request should be blocked
      const result3 = fastRateLimiter.checkRateLimit(clientId);
      expect(result3.isAllowed).toBe(false);
      
      // Wait for window to expire
      setTimeout(() => {
        const result4 = fastRateLimiter.checkRateLimit(clientId);
        expect(result4.isAllowed).toBe(true);
        expect(result4.current).toBe(1);
        done();
      }, 150);
    });

    it('should handle multiple clients separately', () => {
      const client1 = 'client-1';
      const client2 = 'client-2';
      
      // Client 1 makes requests
      const result1 = rateLimiter.checkRateLimit(client1);
      expect(result1.isAllowed).toBe(true);
      
      // Client 2 should have separate counter
      const result2 = rateLimiter.checkRateLimit(client2);
      expect(result2.isAllowed).toBe(true);
      expect(result2.current).toBe(1);
      expect(result2.remaining).toBe(4);
    });

    it('should reset rate limit for specific client', () => {
      const clientId = 'test-client-4';
      
      // Use some requests
      rateLimiter.checkRateLimit(clientId);
      rateLimiter.checkRateLimit(clientId);
      
      // Check current status
      const status1 = rateLimiter.getRateLimitStatus(clientId);
      expect(status1.current).toBe(2);
      
      // Reset rate limit
      rateLimiter.resetRateLimit(clientId);
      
      // Check status after reset
      const status2 = rateLimiter.getRateLimitStatus(clientId);
      expect(status2.current).toBe(0);
    });
  });

  describe('Predefined Rate Limiters', () => {
    it('should have correct global rate limiter configuration', () => {
      const clientId = 'global-test';
      const result = GLOBAL_RATE_LIMITER.checkRateLimit(clientId);
      expect(result.isAllowed).toBe(true);
      expect(result.remaining).toBe(999); // 1000 - 1
    });

    it('should have correct auth rate limiter configuration', () => {
      const clientId = 'auth-test';
      const result = AUTH_RATE_LIMITER.checkRateLimit(clientId);
      expect(result.isAllowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1
    });

    it('should have correct API rate limiter configuration', () => {
      const clientId = 'api-test';
      const result = API_RATE_LIMITER.checkRateLimit(clientId);
      expect(result.isAllowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
    });

    it('should have correct heavy API rate limiter configuration', () => {
      const clientId = 'heavy-api-test';
      const result = HEAVY_API_RATE_LIMITER.checkRateLimit(clientId);
      expect(result.isAllowed).toBe(true);
      expect(result.remaining).toBe(19); // 20 - 1
    });
  });
});

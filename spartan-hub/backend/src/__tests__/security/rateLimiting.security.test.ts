/**
 * Rate Limiting & DDoS Protection - Security Test
 * 
 * Validates rate limiting mechanisms to prevent abuse:
 * Token bucket, per-user limits, IP-based limits
 */

import { RateLimitService } from '../../services/rateLimitService';

describe('Rate Limiting & DDoS Protection Security - Phase 3.4', () => {
  let rateLimitService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitService = RateLimitService.getInstance();
  });

  describe('Token Bucket Algorithm', () => {
    test('allow requests within rate limit', () => {
      const clientId = 'client_123';
      const limit = 10; // 10 req/sec
      const window = 1000; // 1 second

      // First 10 requests should succeed
      for (let i = 0; i < limit; i++) {
        const allowed = rateLimitService.checkRateLimit(clientId, limit, window);
        expect(allowed).toBe(true);
      }
    });

    test('block requests exceeding rate limit', () => {
      const clientId = 'client_123';
      const limit = 5;
      const window = 1000;

      // Use up the limit
      for (let i = 0; i < limit; i++) {
        rateLimitService.checkRateLimit(clientId, limit, window);
      }

      // 6th request should be blocked
      const allowed = rateLimitService.checkRateLimit(clientId, limit, window);
      expect(allowed).toBe(false);
    });

    test('refill tokens after time window', async () => {
      const clientId = 'client_123';
      const limit = 5;
      const window = 1000;

      // Use up limit
      for (let i = 0; i < limit; i++) {
        rateLimitService.checkRateLimit(clientId, limit, window);
      }

      expect(rateLimitService.checkRateLimit(clientId, limit, window)).toBe(false);

      // Wait for window to pass
      jest.useFakeTimers();
      jest.advanceTimersByTime(window + 1);

      // Should be allowed again
      expect(rateLimitService.checkRateLimit(clientId, limit, window)).toBe(true);

      jest.useRealTimers();
    });

    test('use exponential backoff for throttled requests', () => {
      const clientId = 'client_123';
      const limit = 10;
      const window = 1000;

      // Exhaust limit multiple times
      for (let attempt = 0; attempt < 3; attempt++) {
        for (let i = 0; i < limit; i++) {
          rateLimitService.checkRateLimit(clientId, limit, window);
        }

        const backoff = rateLimitService.getBackoffDelay(clientId, attempt);

        // Backoff should increase
        if (attempt > 0) {
          expect(backoff).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Per-User Rate Limits', () => {
    test('apply different limits per user tier', () => {
      const freeUser = 'free_user_123';
      const premiumUser = 'premium_user_456';

      const freeLimit = rateLimitService.getUserRateLimit(freeUser);
      const premiumLimit = rateLimitService.getUserRateLimit(premiumUser);

      expect(freeLimit).toBeLessThan(premiumLimit);
    });

    test('track per-user request count', () => {
      const userId = 'user_123';

      for (let i = 0; i < 100; i++) {
        rateLimitService.recordRequest(userId);
      }

      const count = rateLimitService.getRequestCount(userId);

      expect(count).toBe(100);
    });

    test('apply burst allowance (peak vs sustained)', () => {
      const userId = 'user_123';

      // Burst: 20 requests allowed
      const burst = 20;

      for (let i = 0; i < burst; i++) {
        const allowed = rateLimitService.checkBurstLimit(userId, burst);
        expect(allowed).toBe(true);
      }

      // 21st should be blocked
      const allowed = rateLimitService.checkBurstLimit(userId, burst);
      expect(allowed).toBe(false);
    });
  });

  describe('IP-Based Rate Limiting', () => {
    test('apply rate limit per IP address', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';
      const limit = 10;

      // Each IP should have independent limit
      for (let i = 0; i < limit; i++) {
        rateLimitService.checkRateLimitByIP(ip1, limit);
        rateLimitService.checkRateLimitByIP(ip2, limit);
      }

      // IP1 should be limited
      expect(rateLimitService.checkRateLimitByIP(ip1, limit)).toBe(false);

      // IP2 should still have quota
      expect(rateLimitService.checkRateLimitByIP(ip2, limit)).toBe(true);
    });

    test('detect DDoS patterns from single IP', () => {
      const attackerIP = '10.0.0.1';

      // Simulate rapid requests from single IP
      for (let i = 0; i < 1000; i++) {
        rateLimitService.recordRequest(attackerIP);
      }

      const isDDoS = rateLimitService.isDDoSPatternDetected(attackerIP);

      expect(isDDoS).toBe(true);
    });

    test('block IPs detected as DDoS attackers', () => {
      const maliciousIP = '10.0.0.1';

      // Mark as DDoS attacker
      rateLimitService.blockIP(maliciousIP);

      const isBlocked = rateLimitService.isIPBlocked(maliciousIP);

      expect(isBlocked).toBe(true);
    });
  });

  describe('Endpoint-Specific Limits', () => {
    test('apply different limits per endpoint', () => {
      const userId = 'user_123';

      const loginLimit = rateLimitService.getEndpointLimit(
        userId,
        'POST /auth/login'
      );

      const listLimit = rateLimitService.getEndpointLimit(
        userId,
        'GET /activities'
      );

      // Login should have stricter limit (brute force prevention)
      expect(loginLimit).toBeLessThan(listLimit);
    });

    test('enforce strict login attempt limit', () => {
      const username = 'user@example.com';
      const maxAttempts = 5;

      for (let i = 0; i < maxAttempts; i++) {
        const allowed = rateLimitService.checkLoginAttempt(username);
        expect(allowed).toBe(true);
      }

      // 6th attempt should fail
      const blocked = rateLimitService.checkLoginAttempt(username);
      expect(blocked).toBe(false);
    });

    test('lock account after too many failed attempts', () => {
      const username = 'user@example.com';

      for (let i = 0; i < 10; i++) {
        rateLimitService.recordFailedLogin(username);
      }

      const isLocked = rateLimitService.isAccountLocked(username);

      expect(isLocked).toBe(true);
    });

    test('webhook endpoint has high rate limit', () => {
      const webhookLimit = rateLimitService.getEndpointLimit(
        'terra_webhook',
        'POST /webhooks/terra'
      );

      const apiLimit = rateLimitService.getEndpointLimit(
        'mobile_app',
        'GET /user/profile'
      );

      // Webhooks should allow higher throughput
      expect(webhookLimit).toBeGreaterThan(apiLimit);
    });
  });

  describe('Headers & Response', () => {
    test('include rate limit headers in response', () => {
      const userId = 'user_123';

      const response = rateLimitService.executeWithRateLimit(userId, () => ({
        status: 200,
      }));

      const headers = response.headers;

      expect(headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    test('return 429 (Too Many Requests) when rate limited', () => {
      const userId = 'user_123';
      const limit = 5;

      // Exhaust limit
      for (let i = 0; i < limit; i++) {
        rateLimitService.checkRateLimit(userId, limit, 1000);
      }

      // Next request should return 429
      const response = rateLimitService.executeWithRateLimitResponse(userId);

      expect(response.status).toBe(429);
      expect(response.headers['Retry-After']).toBeDefined();
    });

    test('include Retry-After header with backoff time', () => {
      const userId = 'user_123';
      const limit = 5;

      // Exhaust limit
      for (let i = 0; i < limit; i++) {
        rateLimitService.checkRateLimit(userId, limit, 1000);
      }

      const retryAfter = rateLimitService.getRetryAfterTime(userId);

      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThan(60); // Should be reasonable
    });
  });

  describe('DDoS Protection', () => {
    test('detect volumetric attack pattern', () => {
      // Simulate DDoS from multiple IPs
      const ips = Array(100).fill(null).map((_, i) => `10.0.0.${i}`);

      ips.forEach((ip) => {
        for (let i = 0; i < 100; i++) {
          rateLimitService.recordRequest(ip);
        }
      });

      const isDDoS = rateLimitService.isDDoSDetected();

      expect(isDDoS).toBe(true);
    });

    test('activate DDoS mitigation when detected', () => {
      rateLimitService.setDDoSThreshold(10000); // 10k req/sec

      // Simulate attack
      for (let i = 0; i < 11000; i++) {
        rateLimitService.recordGlobalRequest();
      }

      const isMitigationActive = rateLimitService.isDDoSMitigationActive();

      expect(isMitigationActive).toBe(true);
    });

    test('implement progressive rate limiting during attack', () => {
      rateLimitService.activateDDoSMitigation();

      const stage1Limit = rateLimitService.getProgressiveLimit(0); // First stage
      const stage2Limit = rateLimitService.getProgressiveLimit(1); // Second stage

      // Limits should decrease as attack continues
      expect(stage1Limit).toBeGreaterThan(stage2Limit);
    });

    test('whitelist critical IPs during DDoS', () => {
      const monitoringIP = '203.0.113.1';

      rateLimitService.whitelistIP(monitoringIP);

      rateLimitService.activateDDoSMitigation();

      // Whitelisted IP should not be rate limited
      const allowed = rateLimitService.checkRateLimitByIP(
        monitoringIP,
        100000
      );

      expect(allowed).toBe(true);
    });

    test('challenge suspected bots with CAPTCHA', () => {
      const suspiciousIP = '10.0.0.1';

      // Simulate bot-like behavior (too many requests)
      for (let i = 0; i < 1000; i++) {
        rateLimitService.recordRequest(suspiciousIP);
      }

      const isBotLikely = rateLimitService.isBotLikelyDetected(suspiciousIP);

      expect(isBotLikely).toBe(true);

      // Should require CAPTCHA
      const requiresCaptcha = rateLimitService.requiresChallengeForIP(
        suspiciousIP
      );

      expect(requiresCaptcha).toBe(true);
    });
  });

  describe('Distributed Rate Limiting', () => {
    test('coordinate rate limits across multiple servers', () => {
      // Server 1 - 3 out of 10 requests
      const server1Served = 3;
      rateLimitService.recordRequestOnServer('server-1', 'user_123', server1Served);

      // Server 2 - 4 out of 10 requests
      const server2Served = 4;
      rateLimitService.recordRequestOnServer('server-2', 'user_123', server2Served);

      // Server 3 tries to serve (3 out of 10 requests)
      const server3_allowed = rateLimitService.getDistributedQuota('user_123');

      // Total: 3 + 4 + 3 = 10, should be at limit
      expect(server3_allowed).toBeLessThan(4);
    });

    test('use Redis for distributed rate limit state', () => {
      const userId = 'user_123';

      // Simulate Redis sync
      rateLimitService.setRedisBackend({
        incr: jest.fn().mockReturnValue(5),
        get: jest.fn().mockReturnValue('5'),
        setex: jest.fn(),
      });

      const count = rateLimitService.getDistributedCount(userId);

      expect(count).toBe(5);
    });
  });

  describe('Configuration & Management', () => {
    test('support configurable rate limits', () => {
      const config = {
        defaultLimit: 100,
        loginLimit: 5,
        webhookLimit: 10000,
        window: 60000, // 1 minute
      };

      rateLimitService.setConfig(config);

      expect(rateLimitService.config.defaultLimit).toBe(100);
      expect(rateLimitService.config.loginLimit).toBe(5);
    });

    test('allow runtime adjustment of limits', () => {
      const userId = 'user_123';

      rateLimitService.setUserRateLimit(userId, 50);

      const limit = rateLimitService.getUserRateLimit(userId);

      expect(limit).toBe(50);
    });

    test('support temporary rate limit increase for maintenance', () => {
      const systemUserId = 'system_maintenance';

      rateLimitService.exemptFromRateLimit(systemUserId);

      // Should allow unlimited requests
      for (let i = 0; i < 10000; i++) {
        const allowed = rateLimitService.checkRateLimit(systemUserId, 10, 1000);
        expect(allowed).toBe(true);
      }
    });
  });

  describe('Monitoring & Logging', () => {
    test('log rate limit violations', () => {
      const userId = 'user_123';
      const limit = 5;

      // Exhaust and violate
      for (let i = 0; i < limit + 1; i++) {
        rateLimitService.checkRateLimit(userId, limit, 1000);
      }

      const violations = rateLimitService.getViolations(userId);

      expect(violations.length).toBeGreaterThan(0);
    });

    test('alert on suspicious activity', () => {
      const alertsSpy = jest.fn();
      rateLimitService.onAlert(alertsSpy);

      // Trigger DDoS detection
      for (let i = 0; i < 50000; i++) {
        rateLimitService.recordGlobalRequest();
      }

      expect(alertsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ddos_detected',
        })
      );
    });

    test('provide dashboard metrics', () => {
      // Record some traffic
      for (let i = 0; i < 100; i++) {
        rateLimitService.recordRequest(`user_${i % 10}`);
      }

      const metrics = rateLimitService.getMetrics();

      expect(metrics.totalRequests).toBe(100);
      expect(metrics.blockedRequests).toBeDefined();
      expect(metrics.activeUsers).toBe(10);
    });
  });

  describe('Performance', () => {
    test('check rate limit in <1ms', () => {
      const userId = 'user_123';

      const startTime = Date.now();

      rateLimitService.checkRateLimit(userId, 1000, 60000);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1);
    });

    test('handle 100k concurrent users efficiently', () => {
      const users = Array(100000).fill(null).map((_, i) => `user_${i}`);

      const startTime = Date.now();

      users.forEach((userId) => {
        rateLimitService.checkRateLimit(userId, 100, 60000);
      });

      const duration = Date.now() - startTime;

      // 100k checks should complete quickly
      expect(duration).toBeLessThan(5000);
    });
  });
});

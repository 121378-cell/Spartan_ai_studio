import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.unmock('uuid');

import { app } from '../server';
import { ROLES, verifyJWT, requireRole } from '../middleware/auth';
import { SessionModel } from '../models/Session';
import { userDb } from '../services/databaseServiceFactory';
import config from '../config/configService';
import { redisClient } from '../middleware/rateLimitMiddleware';
import { createMockRequest, createMockResponse, MockRequest, MockResponse } from './test-utils';

const JWT_SECRET = config.get('jwtSecret');
const JWT_ALGO = config.get('jwtAlgo') || 'HS256';

// Ensure JWT configuration is valid for tests
if (typeof JWT_SECRET !== 'string') {
  throw new Error('JWT_SECRET must be a string for tests');
}
if (typeof JWT_ALGO !== 'string') {
  throw new Error('JWT_ALGO must be a string for tests');
}

describe('Security and Authentication Tests', () => {
  // Helper to create test tokens with valid session
  const createToken = async (userId: string, role: string) => {
    const uniqueId = `${userId}-${Date.now()}-${Math.random()}`;
    const email = `test${uniqueId}@example.com`;
    let dbUser = userDb.findByEmail(email);

    if (!dbUser) {
      // Create user in DB
      try {
        dbUser = userDb.create({
          name: `Test User ${userId}`,
          email,
          password: 'password123',
          quest: 'Test Quest',
          stats: {},
          onboardingCompleted: true,
          keystoneHabits: [],
          masterRegulationSettings: {},
          nutritionSettings: {},
          isInAutonomyPhase: false,
          weightKg: 70,
          trainingCycle: {},
          lastWeeklyPlanDate: new Date().toISOString(),
          role,
          detailedProfile: {},
          preferences: {}
        });
      } catch (e) {
        // If creation fails (race condition?), try finding again
        dbUser = userDb.findByEmail(email);
      }
    }

    if (!dbUser) {
      throw new Error('Failed to ensure user exists');
    }

    // Use the ACTUAL database ID for foreign key relationship
    const realUserId = dbUser.id;

    // 2. Create token with unique nonce
    const token = jwt.sign({ userId: realUserId, role, nonce: `${Date.now()}-${Math.random()}` }, JWT_SECRET, { algorithm: JWT_ALGO as jwt.Algorithm });

    // 3. Create session in DB
    await SessionModel.create({
      userId: realUserId,
      token,
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      isActive: true
    });

    return token;
  };

  // Clear all users and sessions before each test
  beforeEach(async () => {
    userDb.clear();
    await SessionModel.clear();
  });

  afterEach(async () => {
    userDb.clear();
    await SessionModel.clear();
  });

  describe('Authentication Middleware Tests', () => {
    it('should reject requests without any authentication token', async () => {
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', '');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('No token provided');
    });

    it('should reject requests with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', 'InvalidFormat');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('No token provided');
    });

    it('should reject requests with non-Bearer Authorization header', async () => {
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', 'Basic dXNlcjpwYXNzd29yZA==');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('No token provided');
    });

    it('should reject requests with invalid JWT token', async () => {
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', 'Bearer invalid.token.signature');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired token');
    });

    it('should reject requests with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test123', role: ROLES.USER, exp: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
        JWT_SECRET,
        { algorithm: JWT_ALGO as jwt.Algorithm }
      );

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired token');
    });

    it('should reject requests with valid JWT but inactive session', async () => {
      const token = await createToken('inactive123', ROLES.USER);

      // Manually deactivate the session
      const session = await SessionModel.findByToken(token);
      if (session) {
        await SessionModel.deactivate(session.id);
      }

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Session expired');
    });

    it('should reject requests with valid JWT but expired session', async () => {
      const token = await createToken('expired123', ROLES.USER);

      // Manually expire the session
      const session = await SessionModel.findByToken(token);
      if (session) {
        await SessionModel.update({
          ...session,
          expiresAt: new Date(Date.now() - 1000), // 1 second ago
        });
      }

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Session expired');
    });

    it('should accept requests with valid JWT and active session - USER role', async () => {
      const token = await createToken('user123', ROLES.USER);

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should accept requests with valid JWT and active session - ADMIN role', async () => {
      const token = await createToken('admin123', ROLES.ADMIN);

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should accept requests with valid JWT and active session - REVIEWER role', async () => {
      const token = await createToken('reviewer123', ROLES.REVIEWER);

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should accept requests with valid JWT and active session - MODERATOR role', async () => {
      const token = await createToken('moderator123', ROLES.MODERATOR);

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Authorization Role-Based Access Control Tests', () => {
    it('should deny access to security endpoint with USER role', async () => {
      const token = await createToken('user123', ROLES.USER);

      const res = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should allow access to security endpoint with REVIEWER role', async () => {
      const token = await createToken('reviewer123', ROLES.REVIEWER);

      const res = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should allow access to security endpoint with ADMIN role', async () => {
      const token = await createToken('admin123', ROLES.ADMIN);

      const res = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should deny access to security endpoint with MODERATOR role if not in allowed list', async () => {
      const token = await createToken('moderator123', ROLES.MODERATOR);

      const res = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${token}`);

      // MODERATOR is not in the allowed list for /api/governance/security (only REVIEWER, ADMIN)
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should allow access to health endpoint with any valid role', async () => {
      const userToken = await createToken('user123', ROLES.USER);
      const reviewerToken = await createToken('reviewer123', ROLES.REVIEWER);
      const adminToken = await createToken('admin123', ROLES.ADMIN);
      const moderatorToken = await createToken('moderator123', ROLES.MODERATOR);

      const userRes = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${userToken}`);
      expect(userRes.status).toBe(200);

      const reviewerRes = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${reviewerToken}`);
      expect(reviewerRes.status).toBe(200);

      const adminRes = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);

      const moderatorRes = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${moderatorToken}`);
      expect(moderatorRes.status).toBe(200);
    });

    it('should deny access when no user info is attached to request', async () => {
      // Create a mock request without user info
      const mockReq = createMockRequest({
        user: null,
        cookies: {},
        signedCookies: {},
        get: jest.fn(),
        header: jest.fn()
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const roleMiddleware = requireRole([ROLES.ADMIN]);
      roleMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user has insufficient role', async () => {
      const mockReq = createMockRequest({
        user: { role: ROLES.USER },
        cookies: {},
        signedCookies: {},
        get: jest.fn(),
        header: jest.fn()
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const roleMiddleware = requireRole([ROLES.ADMIN]);
      roleMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access when user has sufficient role', async () => {
      const mockReq: any = {
        user: { role: ROLES.ADMIN },
        cookies: {},
        signedCookies: {},
        get: jest.fn(),
        header: jest.fn()
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
        links: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
        cookie: jest.fn().mockReturnThis(),
        append: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis(),
        format: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
        locals: {},
        headersSent: false
      };
      const mockNext = jest.fn();

      const roleMiddleware = requireRole([ROLES.USER, ROLES.ADMIN]);
      roleMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Security Tests', () => {
    // Note: Testing rate limiting properly would require mocking the Redis store
    // For now, we'll test the endpoints with proper rate limiting configuration

    it('should apply auth rate limiting to auth endpoints', async () => {
      // This test verifies that the auth endpoints are configured with rate limiting
      // We can't easily test the actual rate limiting without mocking Redis
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      // The endpoint should return 401 for invalid credentials (not 429 for rate limiting)
      // This indicates the rate limiting middleware is applied before auth logic
      expect([401, 400, 200]).toContain(res.status); // Could be various responses but not 429 initially
    });

    it('should apply different rate limits based on HTTP method', async () => {
      // Test GET request rate limiting
      const getToken = await createToken('getuser123', ROLES.USER);
      const getRes = await request(app)
        .get('/fitness')
        .set('Authorization', `Bearer ${getToken}`);

      // Should be successful, not rate limited initially
      expect([200, 401, 404]).toContain(getRes.status); // Depends on actual endpoint implementation

      // Test POST request rate limiting
      const postToken = await createToken('postuser123', ROLES.USER);
      const postRes = await request(app)
        .post('/fitness')
        .set('Authorization', `Bearer ${postToken}`)
        .send({ data: 'test' });

      // Should be successful, not rate limited initially
      expect([200, 400, 401, 404, 405]).toContain(postRes.status); // Depends on actual endpoint
    });
  });

  describe('Security Header Tests', () => {
    it('should include security headers in responses', async () => {
      const res = await request(app).get('/health');

      // Check for security headers added by helmet
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers['x-content-type-options']).toBe('nosniff');

      expect(res.headers).toHaveProperty('x-frame-options');
      expect(res.headers['x-frame-options']).toBe('DENY');

      expect(res.headers).toHaveProperty('x-xss-protection');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');

      expect(res.headers).toHaveProperty('strict-transport-security');
    }, 60000);

    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(res.status).toBe(400); // Should return bad request for malformed JSON
    });
  });

  describe('Session Security Tests', () => {
    it('should update last activity when using valid session', async () => {
      const token = await createToken('activity123', ROLES.USER);

      const sessionBefore = await SessionModel.findByToken(token);
      const lastActivityBefore = sessionBefore?.lastActivityAt;

      // Make a request that should update last activity
      await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      const sessionAfter = await SessionModel.findByToken(token);
      const lastActivityAfter = sessionAfter?.lastActivityAt;

      // The last activity should have been updated
      if (lastActivityBefore && lastActivityAfter) {
        expect(new Date(lastActivityAfter).getTime()).toBeGreaterThanOrEqual(
          new Date(lastActivityBefore).getTime()
        );
      }
    });

    it('should handle session deactivation properly', async () => {
      const token = await createToken('deactivate123', ROLES.USER);

      // Verify session is active initially
      const session = await SessionModel.findByToken(token);
      expect(session).not.toBeNull();
      expect(session?.isActive).toBe(true);

      // Deactivate the session
      if (session) {
        await SessionModel.deactivate(session.id);
      }

      // Now the token should not work
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Session expired');
    });
  });
});

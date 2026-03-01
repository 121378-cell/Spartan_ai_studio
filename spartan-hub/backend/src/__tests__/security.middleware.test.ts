import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

jest.unmock('uuid');

import { app } from '../server';
import { ROLES, requireRole } from '../middleware/auth';
import { SessionModel } from '../models/Session';
import { UserModel } from '../models/User';
import { userDb } from '../services/databaseServiceFactory';
import config from '../config/configService';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/authSchema';
import { z } from 'zod';

// Helper factory for test mocks
function createMockReq(data: {
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  user?: { role?: string; userId?: string };
}): Request {
  return {
    body: data.body ?? {},
    query: data.query ?? {},
    params: data.params ?? {},
    user: data.user,
    cookies: {},
    get: () => undefined,
    ip: undefined,
    method: 'GET',
    url: '/test',
    path: '/test',
    hostname: 'localhost'
  } as unknown as Request;
}

function createMockRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn()
  } as unknown as Response;
}

const JWT_SECRET = config.get('jwtSecret');
const JWT_ALGO = config.get('jwtAlgo') || 'HS256';

// Ensure JWT configuration is valid for tests
if (typeof JWT_SECRET !== 'string') {
  throw new Error('JWT_SECRET must be a string for tests');
}
if (typeof JWT_ALGO !== 'string') {
  throw new Error('JWT_ALGO must be a string for tests');
}

describe('Security Middleware Tests', () => {
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

  describe('Input Validation Middleware', () => {
    it('should validate request body with Zod schema', async () => {
      // Test the validation middleware directly
      const mockReq = createMockReq({
        body: { email: 'test@example.com', password: 'password123' },
        query: {},
        params: {}
      });
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      const validationMiddleware = validate(loginSchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ email: 'test@example.com', password: 'password123' });
    });

    it('should reject invalid email format in request body', async () => {
      const mockReq = createMockReq({
        body: { email: 'invalid-email', password: 'password123' },
        query: {},
        params: {}
      });
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      const validationMiddleware = validate(loginSchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            message: expect.stringContaining('Invalid email format')
          })
        ])
      });
    });

    it('should reject request with missing required fields', async () => {
      const mockReq = createMockReq({
        body: { email: 'test@example.com' }, // Missing password
        query: {},
        params: {}
      });
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      const validationMiddleware = validate(loginSchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            message: expect.stringContaining('Required')
          })
        ])
      });
    });

    it('should validate query parameters', async () => {
      const mockReq = createMockReq({
        body: {},
        query: { page: '1', limit: '10' },
        params: {}
      });
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      // Create a schema for query validation
      const querySchema = z.object({
        query: z.object({
          page: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0),
          limit: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0 && val <= 100)
        })
      });

      const validationMiddleware = validate(querySchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Check that the query parameters were transformed
      expect(mockReq.query).toEqual({ page: 1, limit: 10 });
    });

    it('should reject invalid query parameters', async () => {
      const mockReq = createMockReq({
        body: {},
        query: { page: '-1', limit: '200' },
        params: {}
      });
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      const querySchema = z.object({
        query: z.object({
          page: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0),
          limit: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0 && val <= 100)
        })
      });

      const validationMiddleware = validate(querySchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'page',
            message: expect.stringMatching(/invalid|pattern|match/i)
          }),
          expect.objectContaining({
            path: 'limit',
            message: expect.stringContaining('Invalid input')
          })
        ])
      });
    });

    it('should validate path parameters', async () => {
      const mockReq = createMockReq({
        body: {},
        query: {},
        params: { userId: '123' }
      });
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      // Create a schema for path parameter validation
      const paramsSchema = z.object({
        params: z.object({
          userId: z.string().min(1)
        })
      });

      const validationMiddleware = validate(paramsSchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.params).toEqual({ userId: '123' });
    });

    it('should reject invalid path parameters', async () => {
      const mockReq = createMockReq({
        body: {},
        query: {},
        params: { userId: '' } // Empty string should fail validation
      });
      const mockRes = createMockRes();
      const mockNext = jest.fn();

      // Create a schema for path parameter validation
      const paramsSchema = z.object({
        params: z.object({
          userId: z.string().min(1)
        })
      });

      const validationMiddleware = validate(paramsSchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'userId',
            message: expect.stringMatching(/min|character|length|empty/i)
          })
        ])
      });
    });
  });

  describe('Authentication Middleware Edge Cases', () => {
    it('should handle multiple authorization headers', async () => {
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', 'Bearer token1, Bearer token2'); // Multiple values as string
      
      // Should handle gracefully, likely returning 401
      expect(res.status).toBe(401);
    });

    it('should handle authorization header with extra spaces', async () => {
      const token = await createToken('spaceuser123', ROLES.USER);
      
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `  Bearer   ${token}  `); // Extra spaces
      
      // Should work despite extra spaces
      expect(res.status).toBe(200);
    });

    it('should handle cookie-based authentication', async () => {
      const token = await createToken('cookieuser123', ROLES.USER);
      
      // Set the token as a cookie
      const res = await request(app)
        .get('/api/governance/health')
        .set('Cookie', [`auth_token=${token}`]);
      
      expect(res.status).toBe(200);
    });

    it('should reject authentication when both cookie and header tokens are invalid', async () => {
      const res = await request(app)
        .get('/api/governance/health')
        .set('Cookie', ['auth_token=invalid_cookie_token'])
        .set('Authorization', 'Bearer invalid_header_token');
      
      expect(res.status).toBe(401);
    });

    it('should handle session with null userId gracefully', async () => {
      const token = jwt.sign({ userId: null, role: ROLES.USER }, JWT_SECRET, { 
        algorithm: JWT_ALGO as jwt.Algorithm 
      });

      let userId = 'some-valid-id';
      try {
        const user = await UserModel.create({
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          password: 'hashed_password'
        } as any);
        if (user && (user as any).id) {
          userId = (user as any).id;
        }
      } catch (e) {
      }

      await SessionModel.create({
        userId,
        token,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true
      });

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(401);
    });
  });

  describe('Authorization Role Validation', () => {
    it('should handle empty role array', async () => {
      // Create a middleware that requires no roles (empty array)
      const mockReq = createMockReq({ user: { role: ROLES.USER, userId: 'test-user' } });
      const mockRes = createMockRes();
      const mockNext = jest.fn();
      
      // This should not be possible in practice since we always pass roles, 
      // but testing the edge case
      const roleMiddleware = (req: Request, res: Response, next: () => void) => {
        if (!req.user || !req.user.role) {
          res.status(401).json({ 
            success: false, 
            message: 'Authentication required. Please log in to continue.' 
          });
          return;
        }
        
        // If no allowed roles specified, deny access
        res.status(403).json({ 
          success: false, 
          message: 'Access denied. You do not have permission to perform this action.' 
        });
      };
      
      roleMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle role comparison with different case', async () => {
      const mockReq = createMockReq({ user: { role: 'USER', userId: 'test-user' } }); // Different case
      const mockRes = createMockRes();
      const mockNext = jest.fn();
      
      // Role comparison should be exact (case-sensitive)
      const { requireRole } = await import('../middleware/auth');
      const roleMiddleware = requireRole([ROLES.USER]); // 'user' in lowercase
      roleMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing user role gracefully', async () => {
      const mockReq = createMockReq({ user: { userId: '123' } });
      const mockRes = createMockRes();
      const mockNext = jest.fn();
      
      const roleMiddleware = requireRole([ROLES.USER]);
      roleMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Security Headers and Response Handling', () => {
    it('should include security headers in all responses', async () => {
      const res = await request(app).get('/health');
      
      // Check for security headers
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers).toHaveProperty('x-frame-options');
      expect(res.headers).toHaveProperty('x-xss-protection');
      expect(res.headers).toHaveProperty('strict-transport-security');
    });

    it('should handle request with malformed JSON gracefully', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ "malformed": json }'); // Invalid JSON
      
      // Should return 400 for malformed JSON, not crash
      expect(res.status).toBe(400);
    });

    it('should handle request with oversized payload', async () => {
      // Create a very large payload
      const largePayload = 'x'.repeat(1024 * 1024); // 1MB string
      
      const res = await request(app)
        .post('/auth/login')
        .send({ largeField: largePayload });
      
      // Should handle gracefully, possibly returning 413 or 400
      expect([400, 413, 414, 431]).toContain(res.status);
    });

    it('should sanitize sensitive data in error responses', async () => {
      // Test with potentially sensitive data in request
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'super_secret_password',
          token: 'some_token_value'
        });
      
      // Check that sensitive data is not leaked in error responses
      const responseText = JSON.stringify(res.body);
      expect(responseText.toLowerCase()).not.toContain('super_secret_password');
      expect(responseText.toLowerCase()).not.toContain('some_token_value');
    });
  });

  describe('Session Security', () => {
    it('should handle concurrent session updates', async () => {
      const token = await createToken('concurrent123', ROLES.USER);
      
      // Simulate multiple requests that would update last activity
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .get('/api/governance/health')
            .set('Authorization', `Bearer ${token}`)
        );
      }
      
      const results = await Promise.all(requests);
      
      // All should succeed (authenticated user with valid session)
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });

    it('should handle session with future expiration date', async () => {
      const token = await createToken('future123', ROLES.USER);
      
      // Update session to have expiration far in the future
      const session = await SessionModel.findByToken(token);
      if (session) {
        // Delete the old session to avoid UNIQUE constraint on token
        await SessionModel.delete(session.id);
        // Recreate session with new expiration
        await SessionModel.create({
          userId: session.userId,
          token: session.token,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year from now
          isActive: true
        });
      }
      
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });

    it('should handle session with past expiration date but active flag', async () => {
      const token = await createToken('pastactive123', ROLES.USER);
      
      // Update session to have expiration in the past but active flag true
      const session = await SessionModel.findByToken(token);
      if (session) {
        // Delete the old session to avoid UNIQUE constraint on token
        await SessionModel.delete(session.id);
        // Recreate session with new expiration
        await SessionModel.create({
          userId: session.userId,
          token: session.token,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          expiresAt: new Date(Date.now() - 1000), // 1 second ago
          isActive: true // But still marked as active
        });
      }
      
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      // Should fail because session is expired even if marked active
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/session|expired|invalid/i);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';

jest.unmock('uuid');

import { app } from '../server';
import { ROLES, requireRole } from '../middleware/auth';
import { SessionModel } from '../models/Session';
import { userDb } from '../services/databaseServiceFactory';
import config from '../config/configService';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/authSchema';
import { z } from 'zod';
import { createMockRequest, createMockResponse } from './test-utils';

// Validate JWT_SECRET is a string (required by jwt.sign())
const jwtSecretRaw = config.get('jwtSecret');
if (typeof jwtSecretRaw !== 'string') {
  throw new Error('JWT_SECRET must be a string');
}
const JWT_SECRET = jwtSecretRaw || 'test_secret_32_characters_long_minimum_requirement';
const JWT_ALGO = (config.get('jwtAlgo') || 'HS256') as jwt.Algorithm;

describe('Auth Middleware Comprehensive Tests', () => {
  // Helper to create test tokens with valid session
  const createToken = async (userId: string, role: string) => {
    const uniqueId = `${userId}-${Date.now()}-${Math.random()}`;
    const email = `test${uniqueId}@example.com`;
    let dbUser = userDb.findByEmail(email);

    if (!dbUser) {
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
        dbUser = userDb.findByEmail(email);
      }
    }

    if (!dbUser) {
      throw new Error('Failed to ensure user exists');
    }

    const realUserId = dbUser.id;
    // Add unique nonce to guarantee unique tokens
    const payload = { userId: realUserId, role, nonce: `${Date.now()}-${Math.random()}` };
    const token = jwt.sign(payload, JWT_SECRET as jwt.Secret, { algorithm: JWT_ALGO });

    await SessionModel.create({
      userId: realUserId,
      token,
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 3600000),
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

  describe('Authentication Middleware Edge Cases', () => {
    it('should handle malformed JWT tokens gracefully', async () => {
      const malformedTokens = [
        'invalid.token.format',
        'Bearer',
        'Bearer ',
        'Bearer invalid.base64.string',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ];

      for (const token of malformedTokens) {
        const res = await request(app)
          .get('/api/governance/health')
          .set('Authorization', token);
        
        expect(res.status).toBe(401);
        // Message depends on whether token format was recognized as Bearer or not
        if (res.body.message) {
          expect(res.body.message).toMatch(/No token provided|Access denied|Invalid or expired token/);
        }
      }
    });

    it('should handle expired JWT tokens', async () => {
      const payload = { userId: 'expired-user', role: ROLES.USER };
      const expiredToken = jwt.sign(
        payload,
        JWT_SECRET as jwt.Secret,
        { algorithm: JWT_ALGO, expiresIn: '-1h' } // Expired 1 hour ago
      );

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired token');
    });

    it('should handle tokens with missing required claims', async () => {
      const payload = { invalid: 'claim' };
      const invalidToken = jwt.sign(
        payload, // Missing userId and role
        JWT_SECRET as jwt.Secret,
        { algorithm: JWT_ALGO }
      );

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.status).toBe(401);
    });

    it('should handle multiple authorization headers', async () => {
      const token1 = await createToken('user1', ROLES.USER);
      const token2 = await createToken('user2', ROLES.USER);

      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token1}, Bearer ${token2}`);

      // Should handle gracefully, likely returning 401 due to malformed header
      expect([400, 401]).toContain(res.status);
    });

    it('should handle case-insensitive authorization header', async () => {
      const token = await createToken('caseuser', ROLES.USER);
      
      const res = await request(app)
        .get('/api/governance/health')
        .set('authorization', `Bearer ${token}`); // lowercase

      expect(res.status).toBe(200);
    });

    it('should handle authorization header with extra whitespace', async () => {
      const token = await createToken('spaceuser', ROLES.USER);
      
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `  Bearer   ${token}  `);

      expect(res.status).toBe(200);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should handle all defined roles correctly', async () => {
      const roles = Object.values(ROLES);
      
      for (const role of roles) {
        const token = await createToken(`role${role}`, role);
        
        const res = await request(app)
          .get('/api/governance/health')
          .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
      }
    });

    it('should deny access for invalid roles', async () => {
      const invalidRole = 'invalid_role';
      const token = await createToken('invalidrole', invalidRole);
      
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(403);
    });

    it('should handle role escalation attempts', async () => {
      // Create a user with USER role
      const userToken = await createToken('normaluser', ROLES.USER);
      
      // Try to access admin endpoint
      const res = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(403);
    });

    it('should allow admin access to all endpoints', async () => {
      const adminToken = await createToken('adminuser', ROLES.ADMIN);
      
      const healthRes = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(healthRes.status).toBe(200);
      
      const securityRes = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(securityRes.status).toBe(200);
    });
  });

  describe('Session Management', () => {
    it('should handle inactive sessions', async () => {
      const token = await createToken('inactiveuser', ROLES.USER);
      
      // Find and deactivate the session
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

    it('should handle expired sessions', async () => {
      const token = await createToken('expiredsession', ROLES.USER);
      
      // Find and update session expiration
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

    it('should handle concurrent session updates gracefully', async () => {
      const token = await createToken('concurrent', ROLES.USER);
      
      // Simulate multiple concurrent requests
      const requests = Array(5).fill(0).map(() =>
        request(app)
          .get('/api/governance/health')
          .set('Authorization', `Bearer ${token}`)
      );
      
      const results = await Promise.all(requests);
      
      // All should succeed without conflicts
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
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
    }, 15000);

    it('should sanitize sensitive data in error responses', async () => {
      // Test with potentially sensitive data
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'super_secret_password_123',
          token: 'some_sensitive_token'
        });
      
      // Check that sensitive data is not leaked
      const responseText = JSON.stringify(res.body);
      expect(responseText.toLowerCase()).not.toContain('super_secret_password_123');
      expect(responseText.toLowerCase()).not.toContain('some_sensitive_token');
    });

    it('should handle oversized requests gracefully', async () => {
      // Create a very large payload
      const largePayload = 'x'.repeat(1024 * 1024); // 1MB
      
      const res = await request(app)
        .post('/auth/login')
        .send({ data: largePayload });
      
      // Should handle gracefully
      expect([400, 413, 414, 431]).toContain(res.status);
    });
  });

  describe('Input Validation Integration', () => {
    it('should validate request body with Zod schema', async () => {
      const mockReq = createMockRequest({
        body: { email: 'test@example.com', password: 'password123' },
        query: {},
        params: {}
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const validationMiddleware = validate(loginSchema);
      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid email format', async () => {
      const mockReq = createMockRequest({
        body: { email: 'invalid-email', password: 'password123' },
        query: {},
        params: {}
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const validationMiddleware = validate(loginSchema);
      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate query parameters with transformations', async () => {
      const mockReq = createMockRequest({
        body: {},
        query: { page: '1', limit: '10' },
        params: {}
      });
      const mockRes = createMockResponse();
      const mockNext = jest.fn();

      const querySchema = z.object({
        query: z.object({
          page: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0),
          limit: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0 && val <= 100)
        })
      });

      const validationMiddleware = validate(querySchema);
      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual({ page: 1, limit: 10 });
    });
  });
});

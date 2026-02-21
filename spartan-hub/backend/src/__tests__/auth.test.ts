import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { ROLES } from '../middleware/auth';
import { SessionModel } from '../models/Session';
import { userDb } from '../services/databaseServiceFactory';
import config from '../config/configService';

const JWT_SECRET = config.get('jwtSecret');
const JWT_ALGO = config.get('jwtAlgo') || 'HS256';

// Ensure JWT configuration is valid for tests
if (typeof JWT_SECRET !== 'string') {
  throw new Error('JWT_SECRET must be a string for tests');
}
if (typeof JWT_ALGO !== 'string') {
  throw new Error('JWT_ALGO must be a string for tests');
}

describe('Auth Middleware Tests', () => {
  // Clear all users and sessions before/after each test
  beforeEach(async () => {
    userDb.clear();
    await SessionModel.clear();
  });

  afterEach(async () => {
    userDb.clear();
    await SessionModel.clear();
  });
  // Helper to create test tokens with valid session
  const createToken = async (userId: string, role: string) => {
    const email = `test${userId}@example.com`;
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

    // 2. Create token
    const token = jwt.sign({ userId: realUserId, role }, JWT_SECRET, { algorithm: JWT_ALGO as jwt.Algorithm });

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

  describe('Protected Endpoints', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/governance/health');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('No token provided');
    });

    it('should return 401 when invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired token');
    });

    it('should allow access to health endpoint with user role', async () => {
      const token = await createToken('user123', ROLES.USER);
      const res = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should deny access to security endpoint with user role', async () => {
      const token = await createToken('user123', ROLES.USER);
      const res = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Access denied. You do not have permission to perform this action.');
    });

    it('should allow access to security endpoint with reviewer role', async () => {
      const token = await createToken('reviewer123', ROLES.REVIEWER);
      const res = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should allow access to all endpoints with admin role', async () => {
      const token = await createToken('admin123', ROLES.ADMIN);

      const healthRes = await request(app)
        .get('/api/governance/health')
        .set('Authorization', `Bearer ${token}`);
      expect(healthRes.status).toBe(200);

      const securityRes = await request(app)
        .get('/api/governance/security')
        .set('Authorization', `Bearer ${token}`);
      expect(securityRes.status).toBe(200);
    });
  });
});

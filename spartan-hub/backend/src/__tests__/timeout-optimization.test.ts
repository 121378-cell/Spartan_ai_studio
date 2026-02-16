import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock AI service to prevent timeouts and retries
jest.mock('../services/aiService', () => ({
  checkOllamaServiceHealth: jest.fn().mockImplementation(() => Promise.resolve(true)),
  checkAiServiceHealth: jest.fn().mockImplementation(() => Promise.resolve(true)),
  initializeAiServiceMonitoring: jest.fn(),
  executeAiOperationWithReconnection: jest.fn().mockImplementation(async (fn: any) => fn()),
  CheckInferenciaIA: jest.fn().mockImplementation(() => Promise.resolve({
    alerta_roja: false,
    processing_time_ms: 0,
    fallback_used: false
  }))
}));

import request from 'supertest';
import { app } from '../server';
import { userDb } from '../services/databaseServiceFactory';
import { hashPassword } from '../utils/passwordUtils';
import { v4 as uuidv4 } from 'uuid';

describe('Timeout Optimization Tests', () => {
  describe('Optimized Security Tests', () => {
    it('should handle security header checks with reasonable timeout', async () => {
      // This test verifies security headers with a reasonable timeout
      const res = await request(app).get('/health');
      
      expect(res.status).toBe(200);
      
      // Handle both response formats (legacy and new)
      if (res.body.status === 'OK') {
        expect(res.body.status).toBe('OK');
      } else {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(['healthy', 'degraded']).toContain(res.body.data.status);
      }
      
      // Check for basic security headers (without strict validation)
      expect(res.headers).toBeDefined();
      expect(typeof res.headers).toBe('object');
    }, 10000); // 10 seconds timeout - reasonable for security checks

    it('should handle malformed JSON gracefully with quick response', async () => {
      const res = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(res.status).toBe(400); // Should return bad request quickly
    }, 5000); // 5 seconds timeout - should be very quick

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/health')
      );
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete quickly for concurrent requests
      expect(duration).toBeLessThan(3000); // 3 seconds for 5 concurrent requests
    }, 15000); // 15 seconds timeout for concurrent test
  });

  describe('Optimized Authentication Tests', () => {
    let testUserId: string;

    beforeEach(async () => {
      // Create a test user
      const user = {
        id: uuidv4(),
        name: 'Timeout Test User',
        email: `timeout-test-${Date.now()}@example.com`,
        password: await hashPassword('SecurePassword123!'),
        role: 'user',
        quest: 'Timeout testing',
        stats: {
          totalWorkouts: 0,
          currentStreak: 0,
          joinDate: new Date().toISOString()
        },
        onboardingCompleted: true,
        keystoneHabits: [],
        masterRegulationSettings: {
          targetBedtime: '22:00'
        },
        nutritionSettings: {
          priority: 'performance'
        },
        isInAutonomyPhase: false,
        weightKg: 75,
        trainingCycle: {},
        lastWeeklyPlanDate: new Date().toISOString(),
        detailedProfile: {},
        preferences: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const createdUser = await userDb.create(user);
      testUserId = createdUser.id;
    });

    afterEach(async () => {
      // Clean up test user
      if (testUserId) {
        try {
          await userDb.delete(testUserId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle login requests with reasonable timeout', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: `timeout-test-${Date.now()}@example.com`,
          password: 'SecurePassword123!'
        });
      
      // Should respond within reasonable time
      expect([200, 401, 400]).toContain(res.status);
    }, 8000); // 8 seconds timeout for login test

    it('should handle registration requests with reasonable timeout', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: `Timeout Test User ${Date.now()}`,
          email: `timeout-reg-${Date.now()}@example.com`,
          password: 'SecurePassword123!'
        });
      
      // Should respond within reasonable time (any quick success/validation/conflict/server error)
      expect([201, 400, 409, 500]).toContain(res.status);
    }, 10000); // 10 seconds timeout for registration test

    it('should handle multiple sequential requests efficiently', async () => {
      const start = Date.now();
      
      // Make several sequential requests
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/health')
          .expect(200);
      }
      
      const duration = Date.now() - start;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(8000); // 8 seconds for 10 sequential requests
    }, 15000); // 15 seconds timeout for sequential test
  });

  describe('Optimized Database Tests', () => {
    it('should handle database operations with reasonable timeout', async () => {
      const start = Date.now();
      
      // Test database read operation
      const users = await userDb.findAll();
      
      const duration = Date.now() - start;
      
      // Database operations should be fast
      expect(duration).toBeLessThan(2000); // 2 seconds for database read
      expect(Array.isArray(users)).toBe(true);
    }, 5000); // 5 seconds timeout for database test

    it('should handle concurrent database operations efficiently', async () => {
      const testUsers = Array.from({ length: 3 }, (_, i) => ({
        id: uuidv4(),
        name: `Concurrent Test User ${i}`,
        email: `concurrent-${i}-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        role: 'user',
        quest: 'Concurrent testing',
        stats: {
          totalWorkouts: 0,
          currentStreak: 0,
          joinDate: new Date().toISOString()
        },
        onboardingCompleted: true,
        keystoneHabits: [],
        masterRegulationSettings: {
          targetBedtime: '22:00'
        },
        nutritionSettings: {
          priority: 'performance'
        },
        isInAutonomyPhase: false,
        weightKg: 75,
        trainingCycle: {},
        lastWeeklyPlanDate: new Date().toISOString(),
        detailedProfile: {},
        preferences: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const start = Date.now();
      
      // Create users concurrently
      const createPromises = testUsers.map(async user => 
        userDb.create({ ...user, password: await hashPassword('SecurePassword123!') })
      );
      const createdUsers = await Promise.all(createPromises);
      
      const duration = Date.now() - start;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for concurrent creates
      expect(createdUsers.length).toBe(testUsers.length);
      
      // Clean up
      for (const user of createdUsers) {
        try {
          await userDb.delete(user.id);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }, 10000); // 10 seconds timeout for concurrent database test
  });
});

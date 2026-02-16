jest.unmock('uuid');

import request from 'supertest';
import { app } from '../server';
import { userDb } from '../services/databaseServiceFactory';
import { hashPassword } from '../utils/passwordUtils';
import { v4 as uuidv4 } from 'uuid';

// Load tests to verify application performance under stress
const describeFn = process.env.SKIP_HEAVY_TESTS === 'true' ? describe.skip : describe;

describeFn('Load Tests', () => {
  const CONCURRENT_REQUESTS = 10; // Number of concurrent requests to test
  const REQUEST_COUNT = 50; // Total number of requests to send

  describe('Health Check Load Test', () => {
    test('should handle multiple concurrent health check requests', async () => {
      const requests = Array.from({ length: CONCURRENT_REQUESTS }, () => 
        request(app).get('/health').expect(200)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
      });

      // Log performance metrics
      console.log(`Completed ${CONCURRENT_REQUESTS} concurrent health checks in ${duration}ms`);
      
      // Performance should be reasonable (less than 5 seconds for this test)
      expect(duration).toBeLessThan(5000);
    }, 120000);

    test('should handle multiple sequential health check requests', async () => {
      const start = Date.now();
      
      for (let i = 0; i < REQUEST_COUNT; i++) {
        await request(app)
          .get('/health')
          .expect(200);
      }
      
      const duration = Date.now() - start;
      
      console.log(`Completed ${REQUEST_COUNT} sequential health checks in ${duration}ms`);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 120000);
  });

  describe('Authentication Load Test', () => {
    const testUsers: Array<{ id: string; email: string; password: string }> = [];

    beforeAll(async () => {
      // Create multiple test users for load testing
      for (let i = 0; i < 5; i++) {
        const user = {
          id: uuidv4(),
          name: `Load Test User ${i}`,
          email: `loadtest-${i}-${Date.now()}@example.com`,
          password: await hashPassword('SecurePassword123!'),
          role: 'user',
          quest: 'Load testing',
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await userDb.create(user);
        testUsers.push({ id: user.id, email: user.email, password: 'SecurePassword123!' });
      }
    });

    afterAll(async () => {
      // Clean up test users
      for (const user of testUsers) {
        try {
          await userDb.delete(user.id);
        } catch (error) {
          console.log(`Error cleaning up user ${user.id}:`, error);
        }
      }
    });

    test('should handle multiple concurrent login requests', async () => {
      const loginRequests = testUsers.map(user => 
        request(app)
          .post('/auth/login')
          .send({ email: user.email, password: user.password })
          .expect(200)
      );

      const start = Date.now();
      const responses = await Promise.all(loginRequests);
      const duration = Date.now() - start;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      console.log(`Completed ${testUsers.length} concurrent login requests in ${duration}ms`);
      expect(duration).toBeLessThan(15000); // Allow a bit more headroom
    }, 180000);

    test('should handle multiple sequential registration requests', async () => {
      const start = Date.now();
      const createdUserIds: string[] = [];

      try {
        // Create multiple users sequentially
        for (let i = 0; i < 10; i++) {
          const response = await request(app)
            .post('/auth/register')
            .send({
              name: `Load Test User ${Date.now()}-${i}`,
              email: `load-reg-${Date.now()}-${i}@example.com`,
              password: 'SecurePassword123!'
            })
            .expect(201);

          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          
          if (response.body.user?.userId) {
            createdUserIds.push(response.body.user.userId);
          }
        }

        const duration = Date.now() - start;
        console.log(`Completed 10 sequential registration requests in ${duration}ms`);
        expect(duration).toBeLessThan(20000); // Allow a bit more headroom
      } finally {
        // Clean up created users
        for (const userId of createdUserIds) {
          try {
            await userDb.delete(userId);
          } catch (error) {
            console.log(`Error cleaning up user ${userId}:`, error);
          }
        }
      }
    }, 180000);
  });

  describe('Concurrency Tests', () => {
    test('should handle concurrent API requests without errors', async () => {
      // Create an array of different API requests to test concurrency
      const requests = [
        // Health check
        request(app).get('/health').expect(200),
        // API info
        request(app).get('/api').expect(200),
        // Invalid route (should return 404)
        request(app).get('/invalid/route').expect(404),
        // Another health check
        request(app).get('/health').expect(200),
        // API info again
        request(app).get('/api').expect(200)
      ];

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // Verify responses
      expect(responses[0].status).toBe(200);
      expect(responses[0].body.status).toBe('OK');
      
      expect(responses[1].status).toBe(200);
      expect(responses[1].body.message).toBe('Spartan Fitness Backend API');
      
      expect(responses[2].status).toBe(404);
      
      expect(responses[3].status).toBe(200);
      expect(responses[3].body.status).toBe('OK');
      
      expect(responses[4].status).toBe(200);
      expect(responses[4].body.message).toBe('Spartan Fitness Backend API');

      console.log(`Completed ${requests.length} concurrent different API requests in ${duration}ms`);
      expect(duration).toBeLessThan(5000);
    }, 120000);

    test('should handle rapid successive requests', async () => {
      const start = Date.now();
      
      // Send many requests in quick succession
      for (let i = 0; i < 20; i++) {
        await request(app)
          .get('/health')
          .expect(200);
      }
      
      const duration = Date.now() - start;
      
      console.log(`Completed 20 rapid successive health checks in ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    }, 120000);
  });

  describe('Database Load Tests', () => {
    test('should handle multiple concurrent database operations', async () => {
      const testUsers = Array.from({ length: 5 }, (_, i) => ({
        id: uuidv4(),
        name: `DB Load Test User ${i}`,
        email: `db-load-${i}-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        role: 'user',
        quest: 'Database load testing',
        stats: JSON.stringify({
          totalWorkouts: 0,
          currentStreak: 0,
          joinDate: new Date().toISOString()
        }),
        onboardingCompleted: true,
        keystoneHabits: JSON.stringify([]),
        masterRegulationSettings: {
          targetBedtime: '22:00'
        },
        nutritionSettings: {
          priority: 'performance'
        },
        isInAutonomyPhase: false,
        weightKg: 75,
        trainingCycle: JSON.stringify({}),
        lastWeeklyPlanDate: new Date().toISOString(),
        detailedProfile: JSON.stringify({}),
        preferences: JSON.stringify({}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Create users concurrently
      const start = Date.now();
      const createPromises = testUsers.map(async user => userDb.create({ ...user, password: await hashPassword('SecurePassword123!') }));
      const createdUsers = await Promise.all(createPromises);
      const createDuration = Date.now() - start;

      // Verify all users were created
      expect(createdUsers.length).toBe(testUsers.length);
      createdUsers.forEach((user, index) => {
        expect(user).toBeDefined();
        expect(user.email).toBe(testUsers[index].email);
      });

      console.log(`Created ${testUsers.length} users concurrently in ${createDuration}ms`);

      // Read users concurrently
      const readStart = Date.now();
      const readPromises = testUsers.map(user => userDb.findById(user.id));
      const readResults = await Promise.all(readPromises);
      const readDuration = Date.now() - readStart;

      // Verify all users were read
      expect(readResults.length).toBe(testUsers.length);
      readResults.forEach((user, index) => {
        expect(user).toBeDefined();
        if (user) {
          expect(user.email).toBe(testUsers[index].email);
        }
      });

      console.log(`Read ${testUsers.length} users concurrently in ${readDuration}ms`);

      // Clean up: delete users concurrently
      const deleteStart = Date.now();
      const deletePromises = testUsers.map(user => userDb.delete(user.id));
      await Promise.all(deletePromises);
      const deleteDuration = Date.now() - deleteStart;

      console.log(`Deleted ${testUsers.length} users concurrently in ${deleteDuration}ms`);
    }, 120000);
  });
});

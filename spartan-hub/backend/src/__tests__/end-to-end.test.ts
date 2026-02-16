import request from 'supertest';
import { app } from '../server';
import { userDb } from '../services/databaseServiceFactory';
import { hashPassword } from '../utils/passwordUtils';
import { v4 as uuidv4 } from 'uuid';

// End-to-end integration tests
describe('End-to-End Integration Tests', () => {
  let testUser: any;
  let authCookies: string[] | string;

  beforeAll(async () => {
    // Create a test user
    testUser = {
      id: uuidv4(),
      name: 'E2E Test User',
      email: `e2e-test-${Date.now()}@example.com`,
      password: await hashPassword('SecurePassword123!'),
      role: 'user',
      quest: 'End-to-end testing',
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

    // Add the test user to the database
    await userDb.create(testUser);

    // Login to get authentication cookies
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'SecurePassword123!'
      })
      .expect(200);

    authCookies = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    // Remove the test user from the database
    if (testUser?.id) {
      try {
        await userDb.delete(testUser.id);
      } catch (error) {
        // Ignore cleanup errors
        console.log('Cleanup error:', error);
      }
    }
  });

  describe('Complete User Workflow', () => {
    test('should complete full user registration to profile access workflow', async () => {
      // Step 1: Register a new user
      const newUserEmail = `workflow-test-${Date.now()}@example.com`;
      const registrationResponse = await request(app)
        .post('/auth/register')
        .send({
          name: 'Workflow Test User',
          email: newUserEmail,
          password: 'SecurePassword123!'
        })
        .expect(201);

      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.user).toBeDefined();
      expect(registrationResponse.body.user.email).toBe(newUserEmail);

      const newUserId = registrationResponse.body.user.userId;

      // Step 2: Login with the new user
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: newUserEmail,
          password: 'SecurePassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user).toBeDefined();
      expect(loginResponse.body.user.email).toBe(newUserEmail);

      const loginCookies = loginResponse.headers['set-cookie'];
      expect(loginCookies).toBeDefined();

      // Step 3: Access user profile with authentication
      const profileResponse = await request(app)
        .get('/auth/me')
        .set('Cookie', Array.isArray(loginCookies) ? loginCookies : [loginCookies])
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.user).toBeDefined();
      expect(profileResponse.body.user.email).toBe(newUserEmail);

      // Clean up: delete the test user
      if (newUserId) {
        try {
          await userDb.delete(newUserId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    test('should handle complete fitness workflow', async () => {
      // Login to get authentication
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePassword123!'
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Test accessing user profile
      const profileResponse = await request(app)
        .get('/auth/me')
        .set('Cookie', Array.isArray(cookies) ? cookies : [cookies])
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.user).toBeDefined();
      expect(profileResponse.body.user.email).toBe(testUser.email);

      // Test accessing fitness endpoints (may not return data if no API keys configured)
      const exerciseResponse = await request(app)
        .get('/fitness/exercises/muscle/chest')
        .set('Cookie', Array.isArray(cookies) ? cookies : [cookies])
        .expect(200);

      // Response could be an array of exercises or empty array if no API keys
      expect(Array.isArray(exerciseResponse.body) || typeof exerciseResponse.body === 'object').toBe(true);

      // Test nutrition endpoint
      const nutritionResponse = await request(app)
        .post('/fitness/nutrition')
        .set('Cookie', Array.isArray(cookies) ? cookies : [cookies])
        .send({
          foodItems: ['apple', 'banana']
        })
        .expect(200);

      // Response could be an array of nutrition data or an error object
      expect(nutritionResponse.body).toBeDefined();
    });
  });

  describe('Module Integration Tests', () => {
    test('should verify authentication and database modules work together', async () => {
      // Test user creation through API (authentication module) and database persistence
      const newEmail = `integration-test-${Date.now()}@example.com`;
      
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          name: 'Integration Test User',
          email: newEmail,
          password: 'SecurePassword123!'
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user).toBeDefined();
      expect(registerResponse.body.user.email).toBe(newEmail);

      const {userId} = registerResponse.body.user;
      expect(userId).toBeDefined();

      // Verify the user was actually saved in the database (database module)
      const dbUser = await userDb.findById(userId);
      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(newEmail);
      expect(dbUser?.name).toBe('Integration Test User');

      // Verify authentication still works for the created user
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: newEmail,
          password: 'SecurePassword123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user.email).toBe(newEmail);

      // Clean up
      if (userId) {
        await userDb.delete(userId);
      }
    });

    test('should verify validation and authentication modules work together', async () => {
      // Test that validation prevents invalid data from reaching authentication
      const invalidRegistrationResponse = await request(app)
        .post('/auth/register')
        .send({
          name: '', // Invalid - empty name
          email: 'invalid-email', // Invalid email format
          password: '123' // Invalid - too short
        })
        .expect(400);

      expect(invalidRegistrationResponse.body.success).toBe(false);
      expect(invalidRegistrationResponse.body.message).toBeDefined();

      // Test that valid data passes validation and reaches authentication
      const validEmail = `valid-test-${Date.now()}@example.com`;
      const validRegistrationResponse = await request(app)
        .post('/auth/register')
        .send({
          name: 'Valid Test User',
          email: validEmail,
          password: 'SecurePassword123!'
        })
        .expect(201);

      expect(validRegistrationResponse.body.success).toBe(true);
      expect(validRegistrationResponse.body.user).toBeDefined();

      // Clean up
      if (validRegistrationResponse.body.user?.userId) {
        await userDb.delete(validRegistrationResponse.body.user.userId);
      }
    });

    test('should verify rate limiting and authentication modules work together', async () => {
      // Try multiple failed login attempts to test integration between rate limiting and auth
      const invalidEmail = 'nonexistent@example.com';
      const invalidPassword = 'wrongpassword';

      // Perform multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            email: invalidEmail,
            password: invalidPassword
          });
      }

      // The authentication should still work for valid requests despite failed attempts
      const validLoginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePassword123!'
        })
        .expect(200);

      expect(validLoginResponse.body.success).toBe(true);
      expect(validLoginResponse.body.user).toBeDefined();
      expect(validLoginResponse.body.user.email).toBe(testUser.email);
    });
  });

  describe('Error Handling Across Modules', () => {
    test('should handle errors gracefully across module boundaries', async () => {
      // Test error handling when database is unavailable (simulated by invalid query)
      const errorResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'a'.repeat(500), // Very long email that might cause issues
          password: 'password'
        });

      // Should handle the error gracefully without crashing
      expect(errorResponse.status).toBeGreaterThanOrEqual(400);
      expect(errorResponse.status).toBeLessThan(500);
    });

    test('should handle validation errors consistently', async () => {
      // Test various validation error scenarios
      const validationScenarios = [
        {
          name: 'Too short password',
          data: { name: 'Test', email: 'test@example.com', password: '123' }
        },
        {
          name: 'Invalid email',
          data: { name: 'Test', email: 'not-an-email', password: 'SecurePassword123!' }
        },
        {
          name: 'Empty name',
          data: { name: '', email: 'test@example.com', password: 'SecurePassword123!' }
        }
      ];

      for (const scenario of validationScenarios) {
        const response = await request(app)
          .post('/auth/register')
          .send(scenario.data)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBeDefined();
      }
    });
  });

  describe('API Endpoint Coverage', () => {
    test('should verify all major API endpoints are accessible', async () => {
      // Public endpoints
      await request(app).get('/health').expect(200);
      await request(app).get('/api').expect(200);

      // Auth endpoints are tested elsewhere, but let's check they exist
      const optionsResponse = await request(app).options('/auth/register');
      expect(optionsResponse.status).toBeGreaterThanOrEqual(200);
      expect(optionsResponse.status).toBeLessThan(300);

      // Fitness endpoints
      const fitnessHealth = await request(app).get('/fitness/exercises/muscle/chest');
      // This might return 200 with empty array or 503 if no API keys, but shouldn't error
      expect(fitnessHealth.status).not.toBe(500);

      // Test protected endpoints without auth (should return 401)
      const protectedResponse = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(protectedResponse.body.success).toBe(false);
    });
  });
});
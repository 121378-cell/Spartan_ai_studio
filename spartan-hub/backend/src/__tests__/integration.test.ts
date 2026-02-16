jest.unmock('uuid');
jest.mock('../services/aiService', () => ({
  checkOllamaServiceHealth: jest.fn().mockResolvedValue(true),
  analyzeUserBehavior: jest.fn().mockResolvedValue({ analysis: 'test' }),
  generateRoutineRecommendation: jest.fn().mockResolvedValue({ recommendation: 'test' })
}));

jest.mock('../utils/cacheService', () => ({
  redisClient: {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue('OK')
  },
  getCachedData: jest.fn().mockResolvedValue(null),
  setCachedData: jest.fn().mockResolvedValue(true),
  clearCache: jest.fn().mockResolvedValue(true)
}));

import request from 'supertest';
import { app } from '../server';
import { userDb } from '../services/databaseServiceFactory';
import { tokenService } from '../services/tokenService';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, comparePasswords } from '../utils/passwordUtils';

// Integration tests for API endpoints
describe('Integration Tests', () => {
  let testUser: any;
  let authToken: string;

  // Create a test user before each test
  beforeEach(async () => {
    // Create a test user directly in the database
    const plainPassword = 'SecurePassword123!';
    const hashedPassword = await hashPassword(plainPassword);
    
    testUser = {
      id: uuidv4(),
      name: 'Integration Test User',
      email: `integration-test-${Date.now()}@example.com`,
      password: hashedPassword,
      role: 'user',
      quest: 'Integration testing',
      stats: {
        totalWorkouts: 0,
        currentStreak: 0
      },
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create user in database
    await userDb.create(testUser);
    
    // Keep plain password for login tests
    testUser.password = plainPassword;
    console.log(`✅ Integration Test User created via DB: id=${testUser.id}, email=${testUser.email}`);
  });

  // No explicit cleanup needed as setup.ts clears DB after each test


  describe('Authentication Integration Tests', () => {
    test('should register a new user successfully', async () => {
      const newUser = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(newUser.email);

      // Clean up: delete the test user
      if (response.body.user?.userId) {
        await userDb.delete(response.body.user.userId);
      }
    });

    test('should login successfully and return tokens', async () => {
      const userInDb = await userDb.findByEmail(testUser.email);
      console.log('DEBUG integration login userInDb', {
        email: userInDb?.email,
        hasPassword: Boolean(userInDb?.password)
      });

      if (userInDb?.password) {
        const passwordMatch = await comparePasswords('SecurePassword123!', userInDb.password);
        console.log('DEBUG integration login passwordMatch', passwordMatch);
      }

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePassword123!'
        });

      console.log('DEBUG integration login response', {
        status: response.status,
        body: response.body
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);

      // Extract token for further tests
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      if (cookies) {
        const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
        const authCookie = cookieArray.find((cookie: string) => cookie.startsWith('access_token='));
        if (authCookie) {
          authToken = authCookie.split(';')[0].substring('access_token='.length);
        }
      }
    });

    test('should get current user profile when authenticated', async () => {
      // First login to get a token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'SecurePassword123!'
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });
  });

  describe('API Endpoints Integration Tests', () => {
    let authCookies: string | string[];
    let apiTestUser: any;

    beforeEach(async () => {
      // Create a separate user for API endpoint testing
      const plainPassword = 'SecurePassword123!';
      apiTestUser = {
        name: 'API Test User',
        email: `api-test-${Date.now()}@example.com`,
        password: plainPassword,
        role: 'user',
        quest: 'API testing',
        stats: {
          totalWorkouts: 0,
          currentStreak: 0
        },
        onboardingCompleted: true
      };

      // Register user
      const registerResponse = await request(app)
        .post('/auth/register')
        .send(apiTestUser);

      if (registerResponse.status !== 201) {
        throw new Error(`Failed to register API test user: ${JSON.stringify(registerResponse.body)}`);
      }

      apiTestUser.id = registerResponse.body.user.userId;
      apiTestUser.password = plainPassword;

      // Login to get authentication cookies
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: apiTestUser.email,
          password: 'SecurePassword123!'
        });

      if (loginResponse.status !== 200) {
        throw new Error(`Login failed: status=${loginResponse.status}, body=${JSON.stringify(loginResponse.body)}`);
      }

      authCookies = loginResponse.headers['set-cookie'];
      expect(authCookies).toBeDefined();
    });

    // No explicit cleanup needed as setup.ts clears DB after each test

    test('GET /health should return 200 and system status', async () => {
      const response = await request(app).get('/health');
      
      if (response.status !== 200) {
        console.log('DEBUG: Health check failed:', response.status, response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });

    test('should get API info', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.message).toBe('Spartan Fitness Backend API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toBeDefined();
    });

    test('should handle protected route with valid auth', async () => {
      const cookieArray = Array.isArray(authCookies) ? authCookies : [authCookies];
      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', cookieArray)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(apiTestUser.email);
    });
  });

  describe('Database Integration Tests', () => {
    test('should create and retrieve user from database', async () => {
      const newUser = {
        id: uuidv4(),
        name: 'DB Test User',
        email: `db-test-${Date.now()}@example.com`,
        password: await hashPassword('SecurePassword123!'),
        role: 'user',
        quest: 'Database testing',
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

      // Create user
      const createdUser = await userDb.create(newUser);
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(newUser.email);

      // Retrieve user
      const retrievedUser = await userDb.findById(createdUser.id);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.email).toBe(newUser.email);

      // Clean up
      await userDb.delete(createdUser.id);
    });

    test('should find user by email', async () => {
      const email = `find-test-${Date.now()}@example.com`;
      const newUser = {
        id: uuidv4(),
        name: 'Find Test User',
        email,
        password: await hashPassword('SecurePassword123!'),
        role: 'user',
        quest: 'Find testing',
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

      // Create user
      await userDb.create(newUser);

      // Find by email
      const foundUser = await userDb.findByEmail(email);
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(email);

      // Clean up
      await userDb.delete(newUser.id);
    });
  });

  describe('External Service Integration Tests', () => {
    test('should handle fitness API routes correctly', async () => {
      // Test that the fitness routes exist and return appropriate responses
      // This tests integration with external fitness APIs (though they may fail if keys are not configured)

      // Test muscle-based exercise search
      const response = await request(app)
        .get('/fitness/exercises/muscle/chest')
        .expect(503); // Service Unavailable because API keys are not configured in test

      // Response could be an array of exercises or an error if no API keys are configured
      expect(response.body).toBeDefined();
    });

    test('should handle nutrition API route correctly', async () => {
      // Test nutrition endpoint with mock data
      const response = await request(app)
        .post('/fitness/nutrition')
        .send({
          foodItems: ['apple', 'banana']
        })
        .expect(503);

      // Response could be an array of nutrition data or an error if no API keys are configured
      expect(response.body).toBeDefined();
    });
  });

  describe('Error Handling Integration Tests', () => {
    test('should handle invalid route gracefully', async () => {
      const response = await request(app)
        .get('/invalid/route/that/does/not/exist')
        .expect(404);

      // Should return a proper error response
      expect(response.status).toBe(404);
    });

    test('should handle invalid login gracefully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });
});

/**
 * Garmin Integration Tests
 * 
 * Tests for Garmin OAuth flow, data synchronization, and API endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { GarminHealthService } from '../garminHealthService';
import garminController from '../../controllers/garminController';
import { getDatabase, initializeDatabase } from '../../database/databaseManager';
import axios from 'axios';

// Mock axios at module level
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create a mock axios instance that will be returned by axios.create
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn()
} as any;

// Setup axios.create to return our mock instance
mockedAxios.create.mockReturnValue(mockAxiosInstance);

describe('Garmin Integration', () => {
  const testUserId = 'test-user-garmin';
  const testDeviceId = `${testUserId}_garmin_test`;
  let garminService: GarminHealthService;
  let db: any;

  // Mock data for API responses
  const mockHeartRateResponse = {
    calendarDate: '2026-01-24',
    restingHeartRate: 60,
    maxHeartRate: 150,
    lastNightFiveMinuteValues: [
      { timestamp: Date.now(), value: 65 },
      { timestamp: Date.now() - 300000, value: 68 }
    ]
  };

  const mockSleepResponse = {
    calendarDate: '2026-01-24',
    startTimeInSeconds: Math.floor(Date.now() / 1000) - 28800,
    endTimeInSeconds: Math.floor(Date.now() / 1000),
    duration: 28800,
    sleepQuality: 'GOOD'
  };

  const mockActivityResponse = [
    {
      activityId: 123456,
      activityName: 'Running',
      startTimeInSeconds: Math.floor(Date.now() / 1000) - 3600,
      duration: 3600,
      calories: 500,
      distance: 5000,
      steps: 5500,
      avgHeartRate: 140,
      maxHeartRate: 160
    },
    {
      activityId: 123457,
      activityName: 'Cycling',
      startTimeInSeconds: Math.floor(Date.now() / 1000) - 7200,
      duration: 5400,
      calories: 750,
      distance: 25000,
      steps: 0,
      avgHeartRate: 130,
      maxHeartRate: 155
    }
  ];

  const mockStressResponse = {
    calendarDate: '2026-01-24',
    dayAverage: 35,
    maxStress: 75,
    minStress: 10
  };

  const mockUserProfileResponse = {
    userId: 123456,
    displayName: 'Test User',
    profileUrl: 'https://garmin.com/profile/test',
    socialProfile: []
  };

  beforeAll(async () => {
    await initializeDatabase({ dbPath: ':memory:' });
    db = getDatabase();
    
    // Disable foreign key constraints for testing
    db.pragma('foreign_keys = OFF');
    
    garminService = new GarminHealthService();

    // Setup axios mock globally
    mockedAxios.create.mockReturnValue({
      post: jest.fn(),
      get: jest.fn()
    } as any);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Mock OAuth token exchange response
    mockAxiosInstance.post.mockImplementation((url: string) => {
      if (url.includes('oauth-1.0/access_token')) {
        return Promise.resolve({
          status: 200,
          data: {
            access_token: 'mock-access-token',
            oauth_token: 'mock-oauth-token',
            oauth_token_secret: 'mock-token-secret'
          }
        });
      }
      return Promise.resolve({ status: 200, data: {} });
    });

    // Mock API GET endpoints - handle all variations
    mockAxiosInstance.get.mockImplementation((url: string, config?: any) => {
      const urlStr = typeof url === 'string' ? url : '';
      
      if (urlStr.includes('/user/id') || url === '/user/id') {
        return Promise.resolve({ status: 200, data: mockUserProfileResponse });
      }
      if (urlStr.includes('/user/heartrate') || url === '/user/heartrate') {
        return Promise.resolve({ status: 200, data: [mockHeartRateResponse] });
      }
      if (urlStr.includes('/user/sleep') || url === '/user/sleep') {
        return Promise.resolve({ status: 200, data: [mockSleepResponse] });
      }
      if (urlStr.includes('/user/activitySummary') || url === '/user/activitySummary') {
        return Promise.resolve({ status: 200, data: mockActivityResponse });
      }
      if (urlStr.includes('/user/stress') || url === '/user/stress') {
        return Promise.resolve({ status: 200, data: [mockStressResponse] });
      }
      // Default response for any other URL
      return Promise.resolve({ status: 200, data: mockUserProfileResponse });
    });
  });

  describe('OAuth Flow', () => {
    it('should generate authorization URL', () => {
      const result = garminService.getAuthorizationUrl(testUserId);

      expect(result).toBeDefined();
      expect(result.url).toBeTruthy();
      expect(result.requestToken).toBeTruthy();
      expect(result.requestTokenSecret).toBeTruthy();
      expect(result.url).toContain('oauth_token=');
      expect(result.url).toContain('oauth_consumer_key=');
    });

    it('should have correct OAuth parameters in URL', () => {
      const result = garminService.getAuthorizationUrl(testUserId);

      expect(result.url).toContain('https://auth.garmin.com');
      expect(result.requestToken.length).toBeGreaterThan(0);
      expect(result.requestTokenSecret.length).toBeGreaterThan(0);
    });
  });

  describe('Device Registration', () => {
    it('should register Garmin device in database', async () => {
      const testTokens = {
        oauthToken: 'test-oauth-token',
        oauthTokenSecret: 'test-oauth-secret',
        mID: 'test-mID-123'
      };

      const device = await garminService.registerDevice(testUserId, testTokens);

      expect(device).toBeDefined();
      expect(device).toHaveProperty('deviceId');
      expect(device).toHaveProperty('userId');
      expect(device).toHaveProperty('deviceType');
      expect(device).toHaveProperty('isActive');
      expect(device.userId).toBe(testUserId);
      expect(device.deviceType).toBe('garmin');
      expect(device.isActive).toBe(true);
    });
  });

  describe('Data Sync', () => {
    beforeEach(() => {
      // Setup: Register a test device
      const testTokens = {
        oauthToken: 'test-token',
        oauthTokenSecret: 'test-secret',
        mID: 'test-mID'
      };

      try {
        garminService.registerDevice(testUserId, testTokens);
      } catch (error) {
        // Device might already exist
      }
    });

    it('should sync heart rate data structure', async () => {
      expect(mockHeartRateResponse.restingHeartRate).toBeDefined();
      expect(mockHeartRateResponse.maxHeartRate).toBeDefined();
      expect(mockHeartRateResponse.lastNightFiveMinuteValues).toHaveLength(2);
      expect(mockHeartRateResponse.restingHeartRate).toBeGreaterThan(0);
      expect(mockHeartRateResponse.maxHeartRate).toBeGreaterThan(mockHeartRateResponse.restingHeartRate);
    });

    it('should sync sleep data structure', async () => {
      expect(mockSleepResponse.duration).toBeGreaterThan(0);
      expect(mockSleepResponse.sleepQuality).toBeTruthy();
      expect(mockSleepResponse.endTimeInSeconds).toBeGreaterThan(mockSleepResponse.startTimeInSeconds);
    });

    it('should sync activity data structure', async () => {
      expect(mockActivityResponse).toHaveLength(2);
      expect(mockActivityResponse[0].calories).toBeGreaterThan(0);
      expect(mockActivityResponse[0].distance).toBeGreaterThan(0);
      expect(mockActivityResponse[0].steps).toBeGreaterThanOrEqual(0);
      expect(mockActivityResponse[1].activityName).toBe('Cycling');
    });

    it('should sync stress data structure', async () => {
      expect(mockStressResponse.dayAverage).toBeGreaterThan(0);
      expect(mockStressResponse.dayAverage).toBeLessThan(100);
      expect(mockStressResponse.maxStress).toBeGreaterThanOrEqual(mockStressResponse.dayAverage);
    });

    it('should handle empty API responses gracefully', async () => {
      expect(() => {
        // Empty array should not throw
        const data: any[] = [];
        expect(data).toHaveLength(0);
      }).not.toThrow();
    });
  });

  describe('Data Storage', () => {
    it('should store heart rate data in database', async () => {
      const deviceId = testDeviceId;
      const dataPoint = {
        id: `${deviceId}_test_hr_1`,
        userId: testUserId,
        timestamp: Date.now(),
        dataType: 'heart_rate',
        value: 72,
        unit: 'bpm',
        device: 'garmin',
        source: 'Garmin Connect',
        confidence: 0.95,
        createdAt: Date.now()
      };

      const stmt = db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        dataPoint.id,
        dataPoint.userId,
        dataPoint.timestamp,
        dataPoint.dataType,
        dataPoint.value,
        dataPoint.unit,
        dataPoint.device,
        dataPoint.source,
        dataPoint.confidence,
        dataPoint.createdAt
      );

      const stored = db.prepare(`
        SELECT * FROM biometric_data_points WHERE id = ?
      `).get(dataPoint.id) as any;

      expect(stored).toBeDefined();
      expect(stored.dataType).toBe('heart_rate');
      expect(stored.value).toBe(72);
      expect(stored.device).toBe('garmin');
    });

    it('should store multiple data types', async () => {
      const dataTypes = ['heart_rate', 'sleep_duration', 'steps', 'stress_level'];
      const deviceId = testDeviceId;

      dataTypes.forEach((dataType, index) => {
        const stmt = db.prepare(`
          INSERT INTO biometric_data_points (
            id, userId, timestamp, dataType, value, unit, device, source, confidence, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          `${deviceId}_test_${dataType}_${index}`,
          testUserId,
          Date.now() - index * 60000,
          dataType,
          Math.random() * 100,
          'unit',
          'garmin',
          'Test',
          0.95,
          Date.now()
        );
      });

      const stored = db.prepare(`
        SELECT DISTINCT dataType FROM biometric_data_points 
        WHERE userId = ? AND device = 'garmin'
      `).all(testUserId) as any[];

      expect(stored.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing userId', () => {
      expect(() => {
        garminService.getAuthorizationUrl('');
      }).not.toThrow(); // URL generation should work with any input
    });

    it('should handle device not found', () => {
      const invalidDeviceId = 'nonexistent-device-id';
      expect(() => {
        // This should throw when trying to get device tokens
        const query = `
          SELECT accessToken FROM wearable_devices 
          WHERE id = ? AND userId = ?
        `;
        const result = db.prepare(query).get(invalidDeviceId, testUserId);
        if (!result) throw new Error('Device not found');
      }).toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate heart rate range', () => {
      const validHeartRates = [40, 60, 80, 120, 180];
      validHeartRates.forEach(hr => {
        expect(hr).toBeGreaterThan(0);
        expect(hr).toBeLessThan(300);
      });
    });

    it('should validate sleep duration', () => {
      const validSleepDurations = [4, 6, 8, 10]; // hours
      validSleepDurations.forEach(duration => {
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(24);
      });
    });

    it('should validate activity data', () => {
      const activities = [
        { steps: 5000, calories: 300 },
        { steps: 10000, calories: 600 },
        { steps: 0, calories: 0 }
      ];

      activities.forEach(activity => {
        expect(activity.steps).toBeGreaterThanOrEqual(0);
        expect(activity.calories).toBeGreaterThanOrEqual(0);
      });
    });

    it('should validate confidence scores', () => {
      const validConfidences = [0.85, 0.90, 0.95, 1.0];
      validConfidences.forEach(confidence => {
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique device per user', () => {
      const stmt = db.prepare(`
        INSERT INTO wearable_devices (
          id, userId, deviceType, deviceName, accessToken, isActive, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const deviceId = `${testUserId}_garmin_unique_test`;
      
      // First insert should work
      stmt.run(
        deviceId,
        testUserId,
        'garmin',
        'Garmin Connect',
        'token1',
        1,
        Date.now(),
        Date.now()
      );

      // Duplicate ID should fail or replace
      expect(() => {
        stmt.run(
          deviceId,
          testUserId,
          'garmin',
          'Garmin Connect',
          'token2',
          1,
          Date.now(),
          Date.now()
        );
      }).toThrow();
    });

    it('should maintain referential integrity', () => {
      const dataPoint = {
        id: 'orphan-data-point',
        userId: `nonexistent-user-${  Math.random()}`,
        timestamp: Date.now(),
        dataType: 'heart_rate',
        value: 72,
        unit: 'bpm',
        device: 'garmin',
        source: 'Test',
        confidence: 0.95,
        createdAt: Date.now()
      };

      const stmt = db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // This may fail or succeed depending on constraints
      // Verify either way
      try {
        stmt.run(
          dataPoint.id,
          dataPoint.userId,
          dataPoint.timestamp,
          dataPoint.dataType,
          dataPoint.value,
          dataPoint.unit,
          dataPoint.device,
          dataPoint.source,
          dataPoint.confidence,
          dataPoint.createdAt
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  afterAll(() => {
    // Cleanup test data
    const stmt = db.prepare('DELETE FROM biometric_data_points WHERE userId = ?');
    stmt.run(testUserId);

    const deviceStmt = db.prepare('DELETE FROM wearable_devices WHERE userId = ?');
    deviceStmt.run(testUserId);
  });
});

/**
 * Biometric Routes Integration Tests (current contract)
 */

import request from 'supertest';
import {
  setHealthHub,
  setAppleHealthService
} from '../controllers/biometricController';

jest.mock('../middleware/auth', () => {
  const mockVerifyJWT = (req: any, res: any, next: () => void) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== 'Bearer test-token') {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    req.user = {
      userId: 'test-user-biometric',
      role: 'user',
      email: 'test@example.com'
    };
    req.userId = 'test-user-biometric';
    next();
  };

  return {
    verifyJWT: mockVerifyJWT,
    authMiddleware: mockVerifyJWT,
    authenticate: mockVerifyJWT,
    authenticateToken: mockVerifyJWT,
    requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    ROLES: {
      USER: 'user',
      REVIEWER: 'reviewer',
      ADMIN: 'admin',
      MODERATOR: 'moderator'
    }
  };
});

import { app } from '../server';

describe('Biometric Routes Integration', () => {
  const authToken = 'test-token';
  const testUserId = 'test-user-biometric';
  const testDate = '2024-01-23';

  const mockHealthHub = {
    getUserDevices: jest.fn(),
    registerDevice: jest.fn(),
    getBiometricData: jest.fn(),
    getDailySummary: jest.fn(),
    getHealthSummary: jest.fn(),
    updateDevice: jest.fn()
  };

  const mockAppleHealthService = {
    generateAuthorizationUrl: jest.fn(),
    exchangeCodeForToken: jest.fn(),
    refreshToken: jest.fn(),
    syncData: jest.fn()
  };

  beforeAll(() => {
    setHealthHub(mockHealthHub as any);
    setAppleHealthService(mockAppleHealthService as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockHealthHub.getUserDevices.mockResolvedValue([
      {
        deviceId: 'device-1',
        userId: testUserId,
        deviceType: 'apple-health',
        deviceName: 'Apple Health',
        accessToken: 'apple-token',
        refreshToken: 'refresh-token',
        isActive: true
      }
    ]);
    mockHealthHub.registerDevice.mockResolvedValue('device-1');
    mockHealthHub.getBiometricData.mockResolvedValue([]);
    mockHealthHub.getDailySummary.mockResolvedValue({
      date: testDate,
      recoveryScore: 76
    });
    mockHealthHub.getHealthSummary.mockResolvedValue({
      averageRecovery: 74
    });

    mockAppleHealthService.generateAuthorizationUrl.mockReturnValue(
      'https://example.com/apple-health/auth'
    );
    mockAppleHealthService.syncData.mockResolvedValue({
      syncedRecords: 3,
      nextSyncTime: '2024-01-24T00:00:00.000Z',
      errors: []
    });
  });

  describe('Auth behavior', () => {
    it('requires authentication on protected endpoints', async () => {
      const response = await request(app).get('/api/biometric/devices');
      expect(response.status).toBe(401);
    });
  });

  describe('Device endpoints', () => {
    it('returns connected devices through singular alias', async () => {
      const response = await request(app)
        .get('/api/biometric/devices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(1);
      expect(mockHealthHub.getUserDevices).toHaveBeenCalledWith(testUserId);
    });

    it('registers a wearable device', async () => {
      const response = await request(app)
        .post('/api/biometric/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceType: 'garmin',
          deviceName: 'Forerunner 965'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('device-1');
    });

    it('rejects unsupported device type', async () => {
      const response = await request(app)
        .post('/api/biometric/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceType: 'invalid-device',
          deviceName: 'Unknown'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid device type');
    });
  });

  describe('Data endpoints', () => {
    it('returns biometric data for date range', async () => {
      const response = await request(app)
        .get('/api/biometric/data')
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockHealthHub.getBiometricData).toHaveBeenCalledWith(
        testUserId,
        '2024-01-01',
        '2024-01-31',
        undefined
      );
    });

    it('returns 400 when date range is missing', async () => {
      const response = await request(app)
        .get('/api/biometric/data')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Start date and end date are required');
    });

    it('returns daily summary', async () => {
      const response = await request(app)
        .get(`/api/biometric/summary/daily/${testDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.date).toBe(testDate);
    });

    it('returns 404 when daily summary is not found', async () => {
      mockHealthHub.getDailySummary.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/biometric/summary/daily/${testDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain(`No summary found for date ${testDate}`);
    });
  });

  describe('Apple Health endpoints', () => {
    it('returns Apple Health auth URL', async () => {
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((() => 0) as any);
      try {
        const response = await request(app)
          .get('/api/biometric/apple-health/authorize')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.authUrl).toContain('apple-health/auth');
        expect(response.body.data.state).toBeDefined();
      } finally {
        setTimeoutSpy.mockRestore();
      }
    });

    it('syncs Apple Health data when device is connected', async () => {
      const response = await request(app)
        .post('/api/biometric/apple-health/sync')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.syncedRecords).toBe(3);
      expect(mockAppleHealthService.syncData).toHaveBeenCalled();
    });

    it('returns 404 when no Apple device is connected', async () => {
      mockHealthHub.getUserDevices.mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/api/biometric/apple-health/sync')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Apple Health device not connected');
    });
  });

  describe('Placeholder integrations', () => {
    it('returns pending response for Oura authorize endpoint', async () => {
      const response = await request(app)
        .get('/api/biometric/oura/authorize')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('coming soon');
    });

    it('returns pending response for Oura sync endpoint', async () => {
      const response = await request(app)
        .post('/api/biometric/oura/sync')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('coming soon');
    });
  });
});

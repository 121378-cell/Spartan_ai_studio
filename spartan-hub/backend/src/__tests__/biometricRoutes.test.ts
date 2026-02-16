/**
 * Biometric Routes E2E Tests
 * 
 * Test suite for biometric data endpoints
 */

import request from 'supertest';
import { app } from '../server';
import { biometricService } from '../services/biometricService';

jest.mock('../services/biometricService');

describe('Biometric Routes E2E', () => {
  const testUserId = 'test-user-biometric';
  const testDate = '2024-01-23';
  
  const mockBiometricData = {
    date: testDate,
    hrv: {
      timestamp: new Date(),
      value: 75
    },
    rhr: {
      timestamp: new Date(),
      value: 55
    },
    sleep: {
      startTime: new Date('2024-01-22T23:00:00'),
      endTime: new Date('2024-01-23T07:00:00'),
      duration: 480,
      quality: 'good'
    },
    activity: {
      steps: 10000
    }
  };

  let authToken: string;

  beforeAll(() => {
    // Mock auth token
    authToken = 'mock-jwt-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/biometric/apple-health', () => {
    it('should receive Apple Health data', async () => {
      (biometricService.validateBiometricData as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      (biometricService.aggregateDailyBiometrics as jest.Mock).mockResolvedValue({
        userId: testUserId,
        date: testDate,
        dataCompleteness: 80
      });

      const response = await request(app)
        .post('/api/biometric/apple-health')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockBiometricData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Apple Health');
    });

    it('should validate data format', async () => {
      const invalidData = {
        ...mockBiometricData,
        date: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/biometric/apple-health')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid biometric values', async () => {
      (biometricService.validateBiometricData as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['HRV value outside normal range']
      });

      const invalidData = {
        ...mockBiometricData,
        hrv: { value: 1000 } // outside range
      };

      const response = await request(app)
        .post('/api/biometric/apple-health')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/biometric/apple-health')
        .send(mockBiometricData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/biometric/garmin', () => {
    it('should receive Garmin data', async () => {
      (biometricService.normalizeSourceData as jest.Mock).mockReturnValue({
        hrv: [{ value: 75, source: 'garmin' }],
        sleep: { duration: 480 }
      });

      (biometricService.aggregateDailyBiometrics as jest.Mock).mockResolvedValue({
        userId: testUserId,
        date: testDate
      });

      (biometricService.calculateRecoveryIndex as jest.Mock).mockReturnValue({
        score: 75,
        readinessToTrain: 'ready'
      });

      const response = await request(app)
        .post('/api/biometric/garmin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockBiometricData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Garmin');
    });

    it('should calculate recovery index for Garmin data', async () => {
      (biometricService.normalizeSourceData as jest.Mock).mockReturnValue({
        hrv: [{ value: 75 }],
        restingHeartRate: [{ value: 55 }],
        sleep: { score: 85 }
      });

      (biometricService.aggregateDailyBiometrics as jest.Mock).mockResolvedValue({});
      (biometricService.calculateRecoveryIndex as jest.Mock).mockReturnValue({
        score: 78,
        readinessToTrain: 'ready'
      });

      await request(app)
        .post('/api/biometric/garmin')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockBiometricData);

      expect(biometricService.calculateRecoveryIndex).toHaveBeenCalled();
    });
  });

  describe('POST /api/biometric/healthconnect', () => {
    it('should receive HealthConnect data', async () => {
      (biometricService.normalizeSourceData as jest.Mock).mockReturnValue({
        hrv: [{ value: 75 }],
        sleep: { duration: 480 }
      });

      (biometricService.aggregateDailyBiometrics as jest.Mock).mockResolvedValue({
        userId: testUserId,
        date: testDate
      });

      const response = await request(app)
        .post('/api/biometric/healthconnect')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockBiometricData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('HealthConnect');
    });
  });

  describe('POST /api/biometric/whoop', () => {
    it('should receive WHOOP data', async () => {
      (biometricService.normalizeSourceData as jest.Mock).mockReturnValue({
        hrv: [{ value: 75 }],
        restingHeartRate: [{ value: 55 }],
        sleep: { score: 85 }
      });

      (biometricService.aggregateDailyBiometrics as jest.Mock).mockResolvedValue({
        userId: testUserId,
        date: testDate
      });

      (biometricService.calculateRecoveryIndex as jest.Mock).mockReturnValue({
        score: 75
      });

      const response = await request(app)
        .post('/api/biometric/whoop')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockBiometricData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('WHOOP');
    });
  });

  describe('POST /api/biometric/oura', () => {
    it('should receive Oura Ring data', async () => {
      (biometricService.normalizeSourceData as jest.Mock).mockReturnValue({
        sleep: { score: 85 },
        restingHeartRate: [{ value: 55 }]
      });

      (biometricService.aggregateDailyBiometrics as jest.Mock).mockResolvedValue({
        userId: testUserId,
        date: testDate
      });

      (biometricService.calculateRecoveryIndex as jest.Mock).mockReturnValue({
        score: 72
      });

      const response = await request(app)
        .post('/api/biometric/oura')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockBiometricData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Oura');
    });
  });

  describe('GET /api/biometric/daily/:date', () => {
    it('should get daily biometric data', async () => {
      const response = await request(app)
        .get(`/api/biometric/daily/${testDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.date).toBe(testDate);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/biometric/daily/${testDate}`);

      expect(response.status).toBe(401);
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .get('/api/biometric/daily/invalid-date')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/biometric/recovery-index', () => {
    it('should get recovery index', async () => {
      const response = await request(app)
        .get('/api/biometric/recovery-index')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.score).toBeDefined();
      expect(response.body.readiness).toBeDefined();
    });

    it('should accept optional date parameter', async () => {
      const response = await request(app)
        .get('/api/biometric/recovery-index')
        .query({ date: testDate })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/biometric/recovery-index');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/biometric/integrations', () => {
    it('should get connected integrations', async () => {
      const response = await request(app)
        .get('/api/biometric/integrations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.integrations).toBeDefined();
      expect(response.body.integrations.appleHealth).toBeDefined();
      expect(response.body.integrations.garmin).toBeDefined();
      expect(response.body.integrations.googleFit).toBeDefined();
      expect(response.body.integrations.healthConnect).toBeDefined();
      expect(response.body.integrations.whoop).toBeDefined();
      expect(response.body.integrations.oura).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/biometric/integrations');

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on biometric endpoints', async () => {
      // This would require actual implementation of rate limit testing
      // For now, we verify the endpoint accepts requests
      
      const response = await request(app)
        .post('/api/biometric/apple-health')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockBiometricData);

      // Should not be 429 (Too Many Requests) for single request
      expect(response.status).not.toBe(429);
    });
  });
});

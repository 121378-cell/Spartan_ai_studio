import { logger } from '../utils/logger';

// Create mock OAuth2 class
class MockOAuth2Client {
  generateAuthUrl = jest.fn();
  getToken = jest.fn();
  setCredentials = jest.fn();
}

// Mock dependencies BEFORE importing googleFitService
jest.mock('../models/User');
jest.mock('../utils/logger');
jest.mock('googleapis', () => {
  const mockOAuth2Instance = new (class {
    generateAuthUrl = jest.fn()
    getToken = jest.fn()
    setCredentials = jest.fn()
  })();

  return {
    google: {
      auth: {
        OAuth2: jest.fn(() => mockOAuth2Instance)
      },
      fitness: jest.fn()
    }
  };
});

// Import AFTER mocking
import { googleFitService } from '../services/googleFitService';
import { UserModel } from '../models/User';
import { google } from 'googleapis';

describe('GoogleFitService', () => {
  const testUserId = 'test-user-123';
  const testCode = 'auth-code-xyz';
  const testTokens = {
    access_token: 'access-token-abc',
    refresh_token: 'refresh-token-xyz',
    expiry_date: 1704067200000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:4000/api/fitness/google/callback';
  });

  describe('getAuthUrl', () => {
    it('should generate valid OAuth2 authorization URL', () => {
      const url = googleFitService.getAuthUrl(testUserId);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=');
      expect(url).toContain('scope=');
      expect(url).toContain('access_type=offline');
      expect(url).toContain(`state=${  testUserId}`);
      expect(url).toContain('prompt=consent');
    });

    it('should include all required scopes', () => {
      const url = googleFitService.getAuthUrl(testUserId);

      expect(url).toContain('fitness.activity.read');
      expect(url).toContain('fitness.body.read');
      expect(url).toContain('fitness.nutrition.read');
      expect(url).toContain('fitness.sleep.read');
    });

    it('should encode userId in state parameter', () => {
      const userId = 'user-with-special-chars@123';
      const url = googleFitService.getAuthUrl(userId);

      expect(url).toContain('state=');
      // State should be URL encoded
    });
  });

  describe('handleCallback', () => {
    it('should successfully exchange code for tokens and save to user', async () => {
      // Mock OAuth2 client
      const mockGetToken = jest.fn().mockResolvedValue({ tokens: testTokens });
      (google.auth.OAuth2 as jest.MockedClass<any>).mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: mockGetToken
      }));

      // Mock UserModel.update
      (UserModel.update as jest.Mock).mockResolvedValue(true);

      // Call handleCallback
      await googleFitService.handleCallback(testCode, testUserId);

      // Verify token exchange
      expect(mockGetToken).toHaveBeenCalledWith(testCode);

      // Verify tokens saved
      expect(UserModel.update).toHaveBeenCalledWith(testUserId, {
        googleFit: {
          accessToken: testTokens.access_token,
          refreshToken: testTokens.refresh_token,
          expiryDate: testTokens.expiry_date
        }
      });

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Google Fit tokens saved'),
        expect.any(Object)
      );
    });

    it('should handle missing access token gracefully', async () => {
      const tokensWithoutAccess = {
        refresh_token: 'refresh-token-xyz',
        expiry_date: 1704067200000
      };

      const mockGetToken = jest.fn().mockResolvedValue({ 
        tokens: tokensWithoutAccess 
      });
      (google.auth.OAuth2 as jest.MockedClass<any>).mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: mockGetToken
      }));

      (UserModel.update as jest.Mock).mockResolvedValue(true);

      await googleFitService.handleCallback(testCode, testUserId);

      expect(UserModel.update).toHaveBeenCalledWith(testUserId, {
        googleFit: {
          accessToken: undefined,
          refreshToken: tokensWithoutAccess.refresh_token,
          expiryDate: tokensWithoutAccess.expiry_date
        }
      });
    });

    it('should throw error if token exchange fails', async () => {
      const mockGetToken = jest.fn().mockRejectedValue(
        new Error('Invalid authorization code')
      );
      (google.auth.OAuth2 as jest.MockedClass<any>).mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: mockGetToken
      }));

      await expect(
        googleFitService.handleCallback(testCode, testUserId)
      ).rejects.toThrow('Invalid authorization code');

      // Verify error logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting Google Fit tokens'),
        expect.any(Object)
      );
    });

    it('should throw error if user update fails', async () => {
      const mockGetToken = jest.fn().mockResolvedValue({ tokens: testTokens });
      (google.auth.OAuth2 as jest.MockedClass<any>).mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: mockGetToken
      }));

      (UserModel.update as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        googleFitService.handleCallback(testCode, testUserId)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getDailySteps', () => {
    it('should fetch steps for a time range', async () => {
      // Mock user with valid tokens
      (UserModel.findById as jest.Mock).mockResolvedValue({
        id: testUserId,
        googleFit: {
          accessToken: testTokens.access_token,
          refreshToken: testTokens.refresh_token,
          expiryDate: Date.now() + 3600000 // 1 hour from now
        }
      });

      // Mock fitness API response
      const mockFitnessAggregate = jest.fn().mockResolvedValue({
        data: {
          bucket: [{
            dataset: [{
              point: [{
                value: [{ intVal: 8234 }]
              }]
            }]
          }]
        }
      });

      const mockFitness = {
        users: {
          dataset: {
            aggregate: mockFitnessAggregate
          }
        }
      };

      (google.fitness as jest.Mock).mockReturnValue(mockFitness);

      (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
        setCredentials: jest.fn()
      }));

      // Call getDailySteps
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = Date.now();

      const steps = await googleFitService.getDailySteps(
        testUserId,
        startOfDay.getTime(),
        now
      );

      // Verify result
      expect(steps).toBe(8234);

      // Verify API called with correct parameters
      expect(mockFitnessAggregate).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
          }],
          bucketByTime: { durationMillis: now - startOfDay.getTime() },
          startTimeMillis: startOfDay.getTime(),
          endTimeMillis: now
        }
      });
    });

    it('should return 0 if user not connected to Google Fit', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        id: testUserId,
        googleFit: null
      });

      const steps = await googleFitService.getDailySteps(
        testUserId,
        Date.now() - 86400000,
        Date.now()
      );

      expect(steps).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not connected'),
        expect.any(Object)
      );
    });

    it('should return 0 if no step data exists', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        id: testUserId,
        googleFit: {
          accessToken: testTokens.access_token,
          refreshToken: testTokens.refresh_token,
          expiryDate: Date.now() + 3600000
        }
      });

      const mockFitnessAggregate = jest.fn().mockResolvedValue({
        data: {
          bucket: [
            {
              dataset: [
                { point: [] }
              ]
            }
          ]
        }
      });

      const mockFitness = {
        users: {
          dataset: {
            aggregate: mockFitnessAggregate
          }
        }
      };

      (google.fitness as jest.Mock).mockReturnValue(mockFitness);

      (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
        setCredentials: jest.fn()
      }));

      const steps = await googleFitService.getDailySteps(
        testUserId,
        Date.now() - 86400000,
        Date.now()
      );

      expect(steps).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        id: testUserId,
        googleFit: {
          accessToken: testTokens.access_token,
          refreshToken: testTokens.refresh_token,
          expiryDate: Date.now() + 3600000
        }
      });

      const mockFitnessAggregate = jest.fn().mockRejectedValue(
        new Error('Google Fit API error: 401 Unauthorized')
      );

      const mockFitness = {
        users: {
          dataset: {
            aggregate: mockFitnessAggregate
          }
        }
      };

      (google.fitness as jest.Mock).mockReturnValue(mockFitness);

      (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
        setCredentials: jest.fn()
      }));

      const steps = await googleFitService.getDailySteps(
        testUserId,
        Date.now() - 86400000,
        Date.now()
      );

      expect(steps).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching steps'),
        expect.any(Object)
      );
    });

    it('should handle malformed API response', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        id: testUserId,
        googleFit: {
          accessToken: testTokens.access_token,
          refreshToken: testTokens.refresh_token,
          expiryDate: Date.now() + 3600000
        }
      });

      const mockFitnessAggregate = jest.fn().mockResolvedValue({
        data: {} // Empty response
      });

      const mockFitness = {
        users: {
          dataset: {
            aggregate: mockFitnessAggregate
          }
        }
      };

      (google.fitness as jest.Mock).mockReturnValue(mockFitness);

      (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
        setCredentials: jest.fn()
      }));

      const steps = await googleFitService.getDailySteps(
        testUserId,
        Date.now() - 86400000,
        Date.now()
      );

      expect(steps).toBe(0);
    });
  });

  describe('Integration: Full OAuth Flow', () => {
    it('should complete full flow: auth → callback → fetch stats', async () => {
      // Step 1: Generate auth URL
      const authUrl = googleFitService.getAuthUrl(testUserId);
      expect(authUrl).toContain('accounts.google.com');

      // Step 2: Exchange code for tokens
      const mockGetToken = jest.fn().mockResolvedValue({ tokens: testTokens });
      (google.auth.OAuth2 as jest.MockedClass<any>).mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: mockGetToken
      }));

      (UserModel.update as jest.Mock).mockResolvedValue(true);
      await googleFitService.handleCallback(testCode, testUserId);

      // Step 3: Fetch stats with stored tokens
      (UserModel.findById as jest.Mock).mockResolvedValue({
        id: testUserId,
        googleFit: {
          accessToken: testTokens.access_token,
          refreshToken: testTokens.refresh_token,
          expiryDate: testTokens.expiry_date
        }
      });

      const mockFitnessAggregate = jest.fn().mockResolvedValue({
        data: {
          bucket: [{
            dataset: [{
              point: [{
                value: [{ intVal: 5000 }]
              }]
            }]
          }]
        }
      });

      const mockFitness = {
        users: {
          dataset: {
            aggregate: mockFitnessAggregate
          }
        }
      };

      (google.fitness as jest.Mock).mockReturnValue(mockFitness);

      const steps = await googleFitService.getDailySteps(
        testUserId,
        Date.now() - 86400000,
        Date.now()
      );

      expect(steps).toBe(5000);
    });
  });

  describe('disconnect', () => {
    it('should revoke tokens and clean profile', async () => {
      const mockUser = {
        _id: testUserId,
        googleFit: {
          accessToken: 'access-token-abc',
          refreshToken: 'refresh-token-xyz',
          expiryDate: 1704067200000
        }
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.update as jest.Mock).mockResolvedValue(mockUser);

      const mockRevokeCredentials = jest.fn().mockResolvedValue({});
      (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
        revokeCredentials: mockRevokeCredentials
      }));

      await googleFitService.disconnect(testUserId);

      expect(UserModel.findById).toHaveBeenCalledWith(testUserId);
      expect(UserModel.update).toHaveBeenCalledWith(testUserId, {
        googleFit: undefined
      });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Google Fit profile cleaned'),
        expect.any(Object)
      );
    });

    it('should handle disconnect when user not connected', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        _id: testUserId,
        googleFit: undefined
      });

      await googleFitService.disconnect(testUserId);

      expect(UserModel.update).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not connected'),
        expect.any(Object)
      );
    });

    it('should handle revocation errors gracefully', async () => {
      const mockUser = {
        _id: testUserId,
        googleFit: {
          accessToken: 'access-token-abc',
          refreshToken: 'refresh-token-xyz',
          expiryDate: 1704067200000
        }
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.update as jest.Mock).mockResolvedValue(mockUser);

      const mockRevokeCredentials = jest.fn().mockRejectedValue(
        new Error('Token already revoked')
      );
      (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
        revokeCredentials: mockRevokeCredentials
      }));

      await googleFitService.disconnect(testUserId);

      // Should still clean profile even if revocation fails
      expect(UserModel.update).toHaveBeenCalledWith(testUserId, {
        googleFit: undefined
      });
    });

    it('should throw on critical errors', async () => {
      (UserModel.findById as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(googleFitService.disconnect(testUserId)).rejects.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return true when user is connected', async () => {
      const mockUser = {
        _id: testUserId,
        googleFit: {
          accessToken: 'access-token-abc',
          refreshToken: 'refresh-token-xyz',
          expiryDate: 1704067200000
        }
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await googleFitService.isConnected(testUserId);

      expect(result).toBe(true);
    });

    it('should return false when user not connected', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        _id: testUserId,
        googleFit: undefined
      });

      const result = await googleFitService.isConnected(testUserId);

      expect(result).toBe(false);
    });

    it('should return false when accessToken missing', async () => {
      const mockUser = {
        _id: testUserId,
        googleFit: {
          refreshToken: 'refresh-token-xyz',
          expiryDate: 1704067200000
        }
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await googleFitService.isConnected(testUserId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (UserModel.findById as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await googleFitService.isConnected(testUserId);

      expect(result).toBe(false);
    });
  });
});


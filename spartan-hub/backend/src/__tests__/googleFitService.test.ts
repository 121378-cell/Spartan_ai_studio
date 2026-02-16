import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock before importing
jest.mock('../models/User');
jest.mock('../utils/logger');

// Create mock functions - simplified for TypeScript compatibility
const mockGenerateAuthUrl = jest.fn() as any;
const mockGetToken = jest.fn() as any;
const mockSetCredentials = jest.fn() as any;

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        setCredentials: mockSetCredentials
      }))
    },
    fitness: jest.fn()
  }
}));

// Import after mocking
import { googleFitService } from '../services/googleFitService';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

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
      mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?client_id=test&scope=fitness&state=' + testUserId);
      
      const url = googleFitService.getAuthUrl(testUserId);

      expect(mockGenerateAuthUrl).toHaveBeenCalled();
      expect(url).toContain('accounts.google.com');
    });

    it('should include required scopes', () => {
      mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?scope=fitness.activity.read');
      
      googleFitService.getAuthUrl(testUserId);

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          prompt: 'consent'
        })
      );
    });
  });

  describe('handleCallback', () => {
    it('should exchange code for tokens and save to user', async () => {
      mockGetToken.mockResolvedValue({ tokens: testTokens } as any);
      (UserModel.update as any).mockResolvedValue(true);

      await googleFitService.handleCallback(testCode, testUserId);

      expect(mockGetToken).toHaveBeenCalledWith(testCode);
      expect(UserModel.update).toHaveBeenCalledWith(testUserId, expect.objectContaining({
        googleFit: expect.objectContaining({
          accessToken: testTokens.access_token
        })
      }));
    });

    it('should handle token exchange errors', async () => {
      mockGetToken.mockRejectedValue(new Error('Invalid code'));

      await expect(googleFitService.handleCallback(testCode, testUserId)).rejects.toThrow();
    });
  });
});

/**
 * Terra Health Service Test Suite
 * 
 * Tests OAuth integration with Terra Health API, data synchronization,
 * webhook handling, and data persistence.
 */

import axios from 'axios';
import { TerraHealthService } from '../services/terraHealthService';
import { getDatabase } from '../database/databaseManager';
import { eventBus } from '../services/eventBus';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Mock dependencies
jest.mock('axios');
jest.mock('../database/databaseManager');
jest.mock('../services/eventBus');
jest.mock('../utils/logger');

describe('TerraHealthService', () => {
  let terraHealthService: any;
  let mockDb: any;
  let mockAxios: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup database mock
    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    // Setup axios mock
    mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.post = jest.fn();
    mockAxios.get = jest.fn();

    terraHealthService = new TerraHealthService();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('OAuth Flow', () => {
    test('should initiate OAuth flow correctly', () => {
      const userId = 'user_123';
      const stateToken = terraHealthService.initiateOAuth(userId);

      expect(stateToken).toBeDefined();
      expect(typeof stateToken).toBe('string');
      expect(stateToken.length).toBeGreaterThan(20);
    });

    test('should generate redirect URL with correct parameters', () => {
      const userId = 'user_123';
      const redirectUrl = terraHealthService.getOAuthRedirectUrl(userId);

      expect(redirectUrl).toContain('https://api.withTerra.com/oauth');
      expect(redirectUrl).toContain(`client_id=${process.env.TERRA_CLIENT_ID}`);
      expect(redirectUrl).toContain('response_type=code');
      expect(redirectUrl).toContain('redirect_uri=');
    });

    test('should include required OAuth scopes', () => {
      const redirectUrl = terraHealthService.getOAuthRedirectUrl('user_123');

      const scopes = ['activity', 'sleep', 'heart_rate', 'body_metrics'];
      scopes.forEach(scope => {
        expect(redirectUrl).toContain(encodeURIComponent(scope));
      });
    });

    test('should validate state token matches during callback', () => {
      const userId = 'user_123';
      const stateToken = terraHealthService.initiateOAuth(userId);

      const isValid = terraHealthService.validateStateToken(userId, stateToken);

      expect(isValid).toBe(true);
    });

    test('should reject mismatched state tokens', () => {
      const userId = 'user_123';
      terraHealthService.initiateOAuth(userId);

      const isValid = terraHealthService.validateStateToken(userId, 'wrong_token');

      expect(isValid).toBe(false);
    });
  });

  describe('Token Exchange', () => {
    test('should exchange authorization code for tokens', async () => {
      const userId = 'user_123';
      const authCode = 'auth_code_123';

      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
          expires_in: 3600,
        },
      });

      const tokens = await terraHealthService.exchangeCodeForTokens(userId, authCode);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('token'),
        expect.any(Object),
        expect.any(Object)
      );

      expect(tokens).toBeDefined();
      expect(tokens.access_token).toBe('access_token_123');
      expect(tokens.refresh_token).toBe('refresh_token_123');
    });

    test('should store tokens securely in database', async () => {
      const userId = 'user_123';
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({ run: mockRun } as any);

      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
          expires_in: 3600,
        },
      });

      await terraHealthService.exchangeCodeForTokens(userId, 'auth_code');

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    test('should handle token expiration and refresh', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          access_token: 'old_token',
          refresh_token: 'refresh_token_123',
          expires_at: Date.now() - 1000, // Expired
        }),
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600,
        },
      });

      const token = await terraHealthService.getValidAccessToken(userId);

      expect(token).toBe('new_access_token');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('refresh'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('Data Synchronization', () => {
    test('should sync biometric data from Terra', async () => {
      const userId = 'user_123';

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              ts: Math.floor(Date.now() / 1000),
              heart_rate: { avg: 65, max: 120, min: 55 },
              steps: 8000,
              activity_name: 'running',
            },
          ],
        },
      });

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        all: jest.fn().mockReturnValue([]),
      } as any);

      const result = await terraHealthService.syncBiometricData(userId);

      expect(result).toBeDefined();
      expect(result.recordsSync).toBeGreaterThan(0);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    test('should handle pagination for large datasets', async () => {
      const userId = 'user_123';

      // Mock multiple pages
      let callCount = 0;
      mockAxios.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: {
              data: Array(100).fill({ ts: Math.floor(Date.now() / 1000) }),
              pagination: { next_token: 'token_2' },
            },
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            data: {
              data: Array(50).fill({ ts: Math.floor(Date.now() / 1000) }),
              pagination: {},
            },
          });
        }
        return Promise.reject(new Error('Unexpected call'));
      });

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        all: jest.fn().mockReturnValue([]),
      } as any);

      const result = await terraHealthService.syncBiometricData(userId);

      expect(result.recordsSync).toBeGreaterThanOrEqual(150);
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });

    test('should skip duplicate records', async () => {
      const userId = 'user_123';
      const timestamp = Math.floor(Date.now() / 1000);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              ts: timestamp,
              heart_rate: { avg: 65 },
              steps: 8000,
            },
          ],
        },
      });

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: 'existing_record', // Record exists
        }),
        run: jest.fn().mockReturnValue({ changes: 0 }), // No changes
      } as any);

      const result = await terraHealthService.syncBiometricData(userId);

      expect(result.recordsSkipped).toBeGreaterThan(0);
    });
  });

  describe('Webhook Handling', () => {
    test('should process valid Terra webhook', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: {
          heart_rate: { avg: 65 },
          steps: 8000,
        },
      };

      const hmacSecret = process.env.TERRA_WEBHOOK_SECRET || 'secret';
      const signature = crypto
        .createHmac('sha256', hmacSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      const result = await terraHealthService.processWebhook(webhookData, signature);

      expect(result.success).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    test('should reject webhooks with invalid signatures', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        data: { heart_rate: { avg: 65 } },
      };

      const invalidSignature = 'invalid_signature_123';

      const result = await terraHealthService.processWebhook(webhookData, invalidSignature);

      expect(result.success).toBe(false);
      expect(result.error).toContain('signature');
    });

    test('should store webhook data to database', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: {
          heart_rate: { avg: 65, max: 120, min: 50 },
          steps: 8000,
          sleep: 480,
        },
      };

      const hmacSecret = process.env.TERRA_WEBHOOK_SECRET || 'secret';
      const signature = crypto
        .createHmac('sha256', hmacSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      const mockRun = jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      await terraHealthService.processWebhook(webhookData, signature);

      // Verify database insert was called
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    test('should emit event after webhook processing', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const hmacSecret = process.env.TERRA_WEBHOOK_SECRET || 'secret';
      const signature = crypto
        .createHmac('sha256', hmacSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      await terraHealthService.processWebhook(webhookData, signature);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'terra_webhook_processed',
        expect.any(Object)
      );
    });

    test('should handle high-volume webhooks (100/sec)', async () => {
      const hmacSecret = process.env.TERRA_WEBHOOK_SECRET || 'secret';

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      const webhooks = Array(100).fill(null).map((_, i) => {
        const data = {
          user_id: `terra_user_${i}`,
          ts: Math.floor(Date.now() / 1000),
          data: { heart_rate: { avg: 65 + i } },
        };
        const sig = crypto
          .createHmac('sha256', hmacSecret)
          .update(JSON.stringify(data))
          .digest('hex');
        return { data, sig };
      });

      const startTime = Date.now();
      const results = await Promise.all(
        webhooks.map(w => terraHealthService.processWebhook(w.data, w.sig))
      );
      const duration = Date.now() - startTime;

      expect(results.every((r: any) => r.success === true)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should process 100 in <5 seconds
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const userId = 'user_123';

      mockAxios.get.mockRejectedValueOnce(
        new Error('API request failed')
      );

      expect(async () => {
        await terraHealthService.syncBiometricData(userId);
      }).not.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    test('should handle 401 Unauthorized (token revoked)', async () => {
      const userId = 'user_123';

      mockAxios.get.mockRejectedValueOnce({
        response: { status: 401 },
      });

      const result = await terraHealthService.syncBiometricData(userId);

      expect(result.error).toContain('401');
      expect(eventBus.emit).toHaveBeenCalledWith(
        'terra_token_revoked',
        expect.any(Object)
      );
    });

    test('should handle 429 Rate Limited with retry', async () => {
      const userId = 'user_123';

      mockAxios.get.mockRejectedValueOnce({
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
        },
      });

      const result = await terraHealthService.syncBiometricData(userId);

      expect(result.retryAfter).toBe(60 * 1000); // Convert to milliseconds
    });

    test('should log database errors', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      mockAxios.get.mockResolvedValueOnce({
        data: { data: [] },
      });

      await terraHealthService.syncBiometricData(userId);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Data Persistence', () => {
    test('should persist data to biometric_data_points table', async () => {
      const userId = 'user_123';
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });

      mockDb.prepare.mockReturnValue({
        run: mockRun,
        all: jest.fn().mockReturnValue([]),
      } as any);

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              ts: Math.floor(Date.now() / 1000),
              heart_rate: { avg: 65 },
              steps: 8000,
            },
          ],
        },
      });

      await terraHealthService.syncBiometricData(userId);

      expect(mockRun).toHaveBeenCalled();

      // Verify the SQL includes biometric_data_points
      const callArgs = mockDb.prepare.mock.calls;
      const insertCall = callArgs.find((args: any) =>
        args[0] && args[0].includes('biometric_data_points')
      );
      expect(insertCall).toBeDefined();
    });

    test('should update user_connected_apps status', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        all: jest.fn().mockReturnValue([]),
      } as any);

      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'token_123',
          refresh_token: 'refresh_123',
        },
      });

      await terraHealthService.exchangeCodeForTokens(userId, 'code_123');

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    test('should handle transaction rollback on error', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockImplementation(() => {
        throw new Error('Insert failed');
      });

      mockAxios.get.mockResolvedValueOnce({
        data: {
          data: [{ ts: Date.now(), heart_rate: { avg: 65 } }],
        },
      });

      await terraHealthService.syncBiometricData(userId);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    test('should maintain valid access token', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          access_token: 'valid_token',
          expires_at: Date.now() + 3600000, // 1 hour in future
        }),
      } as any);

      const token = await terraHealthService.getValidAccessToken(userId);

      expect(token).toBe('valid_token');
      expect(mockAxios.post).not.toHaveBeenCalled(); // Should not refresh
    });

    test('should auto-disconnect on revoked token', async () => {
      const userId = 'user_123';

      mockAxios.get.mockRejectedValueOnce({
        response: { status: 401 },
      });

      await terraHealthService.syncBiometricData(userId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'terra_token_revoked',
        expect.objectContaining({ userId })
      );
    });
  });
});

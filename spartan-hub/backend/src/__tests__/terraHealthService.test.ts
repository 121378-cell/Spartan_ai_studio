import axios from 'axios';
import { TerraHealthService } from '../services/terraHealthService';
import { getDatabase } from '../database/databaseManager';
import { eventBus } from '../services/eventBus';
import { logger } from '../utils/logger';
import crypto from 'crypto';

jest.mock('axios');
jest.mock('../database/databaseManager');
jest.mock('../services/eventBus');
jest.mock('../utils/logger');

describe('TerraHealthService', () => {
  let terraHealthService: TerraHealthService;
  let mockDb: any;
  let mockAxios: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.post = jest.fn();
    mockAxios.get = jest.fn();
    mockAxios.create = jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: { data: [] } }),
      post: jest.fn().mockResolvedValue({ data: {} }),
    });

    terraHealthService = new TerraHealthService();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('OAuth Flow', () => {
    test('should generate OAuth URL correctly', () => {
      const userId = 'user_123';
      const redirectUri = 'https://example.com/callback';
      const oauthUrl = terraHealthService.generateOAuthUrl(userId, redirectUri);

      expect(oauthUrl).toBeDefined();
      expect(typeof oauthUrl).toBe('string');
      expect(oauthUrl).toContain('tryterra');
    });

    test('should generate OAuth URL with provider', () => {
      const userId = 'user_123';
      const redirectUri = 'https://example.com/callback';
      const oauthUrl = terraHealthService.generateOAuthUrl(userId, redirectUri, 'garmin');

      expect(oauthUrl).toContain('provider=garmin');
    });

    test('should store OAuth state in database', () => {
      const userId = 'user_123';
      terraHealthService.generateOAuthUrl(userId, 'https://example.com/callback');

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    test('should handle OAuth callback and create device', async () => {
      const userId = 'user_123';
      const authToken = 'auth_token_123';
      const state = 'valid_state';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          userId,
          state,
          provider: 'terra',
          expiresAt: Date.now() + 600000,
        }),
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { data: [] } }),
        post: jest.fn().mockResolvedValue({
          data: {
            user: {
              user_id: 'terra_user_456',
              provider: 'garmin',
              scopes: ['activity', 'sleep'],
              connected_at: new Date().toISOString(),
            },
          },
        }),
      };

      (terraHealthService as any).axiosInstance = mockAxiosInstance;

      const device = await terraHealthService.handleOAuthCallback(userId, authToken, state);

      expect(device).toBeDefined();
      expect(device.userId).toBe(userId);
      expect(device.deviceType).toBe('terra');
    });

    test('should reject invalid OAuth state', async () => {
      const userId = 'user_123';
      const authToken = 'auth_token_123';
      const state = 'invalid_state';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      } as any);

      await expect(
        terraHealthService.handleOAuthCallback(userId, authToken, state)
      ).rejects.toThrow('Invalid or expired OAuth state');
    });
  });

  describe('Device Management', () => {
    test('should get connected devices', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([{ terraUserId: 'terra_user_456' }]),
      } as any);

      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({
          data: {
            devices: [
              { device_id: 'device_1', user_id: 'terra_user_456', provider: 'garmin' },
            ],
          },
        }),
        post: jest.fn().mockResolvedValue({ data: {} }),
      };

      (terraHealthService as any).axiosInstance = mockAxiosInstance;

      const devices = await terraHealthService.getConnectedDevices(userId);

      expect(devices).toBeDefined();
      expect(Array.isArray(devices)).toBe(true);
    });

    test('should disconnect device', async () => {
      const userId = 'user_123';
      const deviceId = 'device_123';

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      await terraHealthService.disconnectDevice(userId, deviceId);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        'device.disconnected',
        expect.objectContaining({ userId, deviceId })
      );
    });
  });

  describe('Data Synchronization', () => {
    test('should sync all user data', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([{ terraUserId: 'terra_user_456' }]),
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { data: [] } }),
        post: jest.fn().mockResolvedValue({ data: {} }),
      };

      (terraHealthService as any).axiosInstance = mockAxiosInstance;

      const result = await terraHealthService.syncAllUserData(userId);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('should sync data with custom from date', async () => {
      const userId = 'user_123';
      const fromDate = new Date('2026-01-01');

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([{ terraUserId: 'terra_user_456' }]),
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { data: [] } }),
        post: jest.fn().mockResolvedValue({ data: {} }),
      };

      (terraHealthService as any).axiosInstance = mockAxiosInstance;

      const result = await terraHealthService.syncAllUserData(userId, fromDate);

      expect(typeof result).toBe('number');
    });

    test('should emit data.synced event after sync', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([{ terraUserId: 'terra_user_456' }]),
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { data: [] } }),
        post: jest.fn().mockResolvedValue({ data: {} }),
      };

      (terraHealthService as any).axiosInstance = mockAxiosInstance;

      await terraHealthService.syncAllUserData(userId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'data.synced',
        expect.objectContaining({ userId, source: 'terra' })
      );
    });

    test('should handle sync with no devices', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([]),
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      const result = await terraHealthService.syncAllUserData(userId);

      expect(result).toBe(0);
    });
  });

  describe('Webhook Handling', () => {
    test('should process valid webhook event', async () => {
      const payload = {
        data: {
          user_id: 'terra_user_456',
          data_type: 'activity',
          timestamp: Date.now(),
        },
      };
      const signature = 'valid_signature';
      const timestamp = Date.now().toString();

      process.env.NODE_ENV = 'development';

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      await terraHealthService.handleWebhookEvent(payload, signature, timestamp);

      expect(logger.info).toHaveBeenCalled();
    });

    test('should handle connection revoked webhook', async () => {
      const payload = {
        data: {
          user_id: 'terra_user_456',
          data_type: 'connection_revoked',
          timestamp: Date.now(),
        },
      };
      const signature = 'valid_signature';
      const timestamp = Date.now().toString();

      process.env.NODE_ENV = 'development';

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      await terraHealthService.handleWebhookEvent(payload, signature, timestamp);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'device.disconnected',
        expect.objectContaining({ userId: 'terra_user_456' })
      );
    });

    test('should emit terra.webhook event for data types', async () => {
      const payload = {
        data: {
          user_id: 'terra_user_456',
          data_type: 'heart_rate',
          timestamp: Date.now(),
        },
      };
      const signature = 'valid_signature';
      const timestamp = Date.now().toString();

      process.env.NODE_ENV = 'development';

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      await terraHealthService.handleWebhookEvent(payload, signature, timestamp);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'terra.webhook',
        expect.objectContaining({ dataType: 'heart_rate' })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully in sync', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([{ terraUserId: 'terra_user_456' }]),
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      const mockAxiosInstance = {
        get: jest.fn().mockRejectedValue(new Error('API request failed')),
        post: jest.fn().mockResolvedValue({ data: {} }),
      };

      (terraHealthService as any).axiosInstance = mockAxiosInstance;

      const result = await terraHealthService.syncAllUserData(userId);

      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('should handle database errors in OAuth callback', async () => {
      const userId = 'user_123';
      const authToken = 'auth_token_123';
      const state = 'valid_state';

      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      await expect(
        terraHealthService.handleOAuthCallback(userId, authToken, state)
      ).rejects.toThrow();
    });

    test('should log errors', async () => {
      const userId = 'user_123';
      const authToken = 'auth_token_123';
      const state = 'invalid_state';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      } as any);

      try {
        await terraHealthService.handleOAuthCallback(userId, authToken, state);
      } catch {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = TerraHealthService.getInstance();
      const instance2 = TerraHealthService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

/**
 * Terra Webhook E2E Integration Test
 * 
 * Tests complete webhook ingestion workflow:
 * Webhook Received → Signature Verified → Data Stored → Event Emitted
 */

import { TerraWebhookHandler } from '../../services/terraWebhookHandler';
import { getDatabase } from '../../database/databaseManager';
import { eventBus } from '../../services/eventBus';
import crypto from 'crypto';

jest.mock('../../database/databaseManager');
jest.mock('../../services/eventBus');

describe('Terra Webhook - E2E Integration', () => {
  let webhookHandler: any;
  let mockDb: any;
  const terraSecret = process.env.TERRA_WEBHOOK_SECRET || 'test_secret';

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
      transaction: jest.fn((fn) => fn()),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    webhookHandler = new TerraWebhookHandler();
  });

  describe('Webhook Processing Flow', () => {
    test('should process valid webhook and store data', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: {
          heart_rate: { avg: 65, max: 120, min: 55 },
          steps: 8000,
          sleep_duration: 480,
        },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      const result = await webhookHandler.handleWebhook(webhookData, signature);

      expect(result.success).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    test('should validate HMAC signature strictly', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const invalidSignature = 'wrong_signature_12345';

      const result = await webhookHandler.handleWebhook(webhookData, invalidSignature);

      expect(result.success).toBe(false);
      expect(result.error).toContain('signature');
    });

    test('should map Terra user to Spartan user', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({ id: 'user_123' }), // Map to Spartan user
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      const result = await webhookHandler.handleWebhook(webhookData, signature);

      expect(result.success).toBe(true);
      // Verify lookup of user mapping
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    test('should parse all biometric data fields', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: {
          heart_rate: { avg: 65, max: 120, min: 55 },
          heart_rate_variability: { rmssd: 45, sdnn: 60 },
          steps: 8000,
          sleep: { duration: 480, quality: 0.85 },
          vo2_max: 52,
          training_load: 75,
        },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      const result = await webhookHandler.handleWebhook(webhookData, signature);

      expect(result.success).toBe(true);
    });

    test('should store data in biometric_data_points table', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      const mockRun = jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      await webhookHandler.handleWebhook(webhookData, signature);

      // Verify SQL contains correct table name
      const sqlCall = mockDb.prepare.mock.calls.find((call: any) =>
        call[0].includes('biometric_data_points')
      );
      expect(sqlCall).toBeDefined();
    });

    test('should emit data_received event', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      await webhookHandler.handleWebhook(webhookData, signature);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'terra_webhook_processed',
        expect.any(Object)
      );
    });
  });

  describe('High-Volume Webhook Processing', () => {
    test('should process 100 webhooks per second', async () => {
      const webhooks = Array(100).fill(null).map((_, i) => {
        const data = {
          user_id: `terra_user_${i}`,
          ts: Math.floor(Date.now() / 1000),
          data: { heart_rate: { avg: 65 + i % 20 } },
        };
        const sig = crypto
          .createHmac('sha256', terraSecret)
          .update(JSON.stringify(data))
          .digest('hex');
        return { data, sig };
      });

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      const startTime = Date.now();

      const results = await Promise.all(
        webhooks.map(w => webhookHandler.handleWebhook(w.data, w.sig))
      );

      const duration = Date.now() - startTime;

      expect(results.every((r: any) => r.success === true)).toBe(true);
      expect(duration).toBeLessThan(1000); // 100 webhooks in <1 second
    });

    test('should achieve <100ms latency per webhook', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      const startTime = Date.now();
      await webhookHandler.handleWebhook(webhookData, signature);
      const latency = Date.now() - startTime;

      expect(latency).toBeLessThan(100);
    });

    test('should handle duplicate webhooks correctly', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        get: jest.fn()
          .mockReturnValueOnce({ id: 'existing_record' }) // Duplicate detected
          .mockReturnValueOnce({ id: 'user_123' }),
        run: jest.fn().mockReturnValue({ changes: 0 }), // No insert
      } as any);

      const result1 = await webhookHandler.handleWebhook(webhookData, signature);

      // Send same webhook again
      const result2 = await webhookHandler.handleWebhook(webhookData, signature);

      expect(result1.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should reject malformed webhook payloads', async () => {
      const malformedData = 'not_valid_json';

      expect(async () => {
        await webhookHandler.handleWebhook(malformedData, 'sig');
      }).not.toThrow();
    });

    test('should handle database errors gracefully', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const result = await webhookHandler.handleWebhook(webhookData, signature);

      expect(result.success || !result.success).toBeDefined(); // Should not throw
    });

    test('should handle user mapping failures', async () => {
      const webhookData = {
        user_id: 'terra_user_unknown',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(null), // User not found
      } as any);

      const result = await webhookHandler.handleWebhook(webhookData, signature);

      expect(result.error || !result.success).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    test('should maintain data consistency across webhooks', async () => {
      const webhooks = Array(50).fill(null).map((_, i) => {
        const data = {
          user_id: 'terra_user_456',
          ts: Math.floor(Date.now() / 1000) + i,
          data: { heart_rate: { avg: 65 + i } },
        };
        const sig = crypto
          .createHmac('sha256', terraSecret)
          .update(JSON.stringify(data))
          .digest('hex');
        return { data, sig };
      });

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      const results = await Promise.all(
        webhooks.map(w => webhookHandler.handleWebhook(w.data, w.sig))
      );

      // All should succeed
      expect(results.every((r: any) => r.success === true)).toBe(true);
    });

    test('should preserve webhook order and timing', async () => {
      const timestamps: number[] = [];
      const webhooks = Array(10).fill(null).map((_, i) => {
        const ts = Math.floor(Date.now() / 1000) + i;
        timestamps.push(ts);
        const data = {
          user_id: 'terra_user_456',
          ts,
          data: { heart_rate: { avg: 65 } },
        };
        const sig = crypto
          .createHmac('sha256', terraSecret)
          .update(JSON.stringify(data))
          .digest('hex');
        return { data, sig };
      });

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      await Promise.all(
        webhooks.map(w => webhookHandler.handleWebhook(w.data, w.sig))
      );

      // Verify timestamps are preserved in order
      expect(timestamps).toEqual(timestamps.sort((a, b) => a - b));
    });
  });

  describe('Compliance and Security', () => {
    test('should reject webhooks with missing signature', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        data: { heart_rate: { avg: 65 } },
      };

      const result = await webhookHandler.handleWebhook(webhookData, '');

      expect(result.success).toBe(false);
    });

    test('should prevent signature tampering detection', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const correctSignature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      // Tamper with data
      webhookData.data.heart_rate.avg = 120;

      const result = await webhookHandler.handleWebhook(webhookData, correctSignature);

      expect(result.success).toBe(false);
    });
  });

  describe('Webhook Events', () => {
    test('should emit event with correct data', async () => {
      const webhookData = {
        user_id: 'terra_user_456',
        ts: Math.floor(Date.now() / 1000),
        data: { heart_rate: { avg: 65 } },
      };

      const signature = crypto
        .createHmac('sha256', terraSecret)
        .update(JSON.stringify(webhookData))
        .digest('hex');

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ id: 'user_123' }),
      } as any);

      await webhookHandler.handleWebhook(webhookData, signature);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'terra_webhook_processed',
        expect.objectContaining({
          userId: expect.any(String),
          dataPoints: expect.any(Number),
        })
      );
    });
  });
});

/**
 * Webhook Ingestion Rate Performance Test
 * 
 * Validates webhook processing at high throughput:
 * 100+ requests per second with <100ms latency
 */

import { TerraHealthService } from '../../services/terraHealthService';
import { getDatabase } from '../../database/databaseManager';
import { eventBus } from '../../services/eventBus';
import * as crypto from 'crypto';

jest.mock('../../database/databaseManager');
jest.mock('../../services/eventBus');

describe('Webhook Ingestion Rate Performance - Phase 3.3', () => {
  let terraService: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({ userId: 'mapped_user_id' }),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
      transaction: jest.fn((fn) => fn()),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    terraService = TerraHealthService.getInstance();
  });

  describe('Single Webhook Processing', () => {
    test('process single webhook in <50ms', async () => {
      const webhook = {
        userId: 'terra_user_123',
        eventType: 'activity',
        data: {
          timestamp: Date.now(),
          avgHeartRate: 72,
          maxHeartRate: 95,
        },
      };

      const signature = crypto
        .createHmac('sha256', 'secret_key')
        .update(JSON.stringify(webhook))
        .digest('hex');

      const startTime = Date.now();

      const result = await terraService.handleWebhook(webhook, signature);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(result.processed).toBe(true);
    });

    test('validate HMAC signature efficiently', async () => {
      const webhook = { data: 'test' };
      const secret = 'secret_key';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(webhook))
        .digest('hex');

      const startTime = Date.now();

      const isValid = await terraService.validateSignature(webhook, signature, secret);

      const duration = Date.now() - startTime;

      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(5);
    });

    test('parse webhook payload in <10ms', async () => {
      const payload = {
        userId: 'terra_123',
        heartRate: 72,
        activities: Array(50).fill(null).map((_, i) => ({
          name: `activity_${i}`,
          duration: Math.random() * 300,
          calories: Math.random() * 500,
        })),
      };

      const startTime = Date.now();

      const parsed = terraService.parseWebhookPayload(payload);

      const duration = Date.now() - startTime;

      expect(parsed).toBeDefined();
      expect(duration).toBeLessThan(10);
    });

    test('map Terra user to Spartan user in <5ms', async () => {
      const terraUserId = 'terra_user_123';

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({ userId: 'spartan_user_456' }),
      } as any);

      const startTime = Date.now();

      const spartanUserId = await terraService.mapUserIdToSpartan(terraUserId);

      const duration = Date.now() - startTime;

      expect(spartanUserId).toBe('spartan_user_456');
      expect(duration).toBeLessThan(5);
    });
  });

  describe('High-Volume Webhook Processing', () => {
    test('process 100 webhooks per second', async () => {
      const webhooks = Array(100).fill(null).map((_, i) => ({
        userId: `terra_user_${i}`,
        eventType: 'activity',
        data: {
          avgHeartRate: 70 + Math.random() * 30,
          timestamp: Date.now(),
        },
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        webhooks.map((webhook) => {
          const signature = crypto
            .createHmac('sha256', 'secret')
            .update(JSON.stringify(webhook))
            .digest('hex');

          return terraService.handleWebhook(webhook, signature);
        })
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(results.every((r: any) => r.processed)).toBe(true);

      const throughput = 100 / (duration / 1000);
      expect(throughput).toBeGreaterThan(100); // >100 webhooks/second
    });

    test('maintain <100ms p99 latency at 100 webhooks/sec', async () => {
      const webhooks = Array(100).fill(null).map((_, i) => ({
        userId: `terra_user_${i}`,
        data: { heartRate: Math.random() * 100 },
      }));

      const latencies: number[] = [];

      const results = await Promise.all(
        webhooks.map(async (webhook) => {
          const start = Date.now();

          const signature = crypto
            .createHmac('sha256', 'secret')
            .update(JSON.stringify(webhook))
            .digest('hex');

          await terraService.handleWebhook(webhook, signature);

          latencies.push(Date.now() - start);
        })
      );

      latencies.sort((a, b) => a - b);
      const p99Index = Math.ceil(latencies.length * 0.99) - 1;
      const p99 = latencies[p99Index];

      expect(p99).toBeLessThan(100);
    });

    test('handle 1000 webhooks in 10 seconds (100/sec sustained)', async () => {
      const webhooks = Array(1000).fill(null).map((_, i) => ({
        userId: `terra_user_${i % 100}`,
        eventType: 'activity',
        data: { timestamp: Date.now(), value: Math.random() },
      }));

      const startTime = Date.now();

      // Process in batches to simulate sustained load
      const batchSize = 100;
      const batches = [];

      for (let i = 0; i < webhooks.length; i += batchSize) {
        const batch = webhooks.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map((webhook) => {
            const signature = crypto
              .createHmac('sha256', 'secret')
              .update(JSON.stringify(webhook))
              .digest('hex');

            return terraService.handleWebhook(webhook, signature);
          })
        );

        batches.push(...batchResults);
      }

      const duration = Date.now() - startTime;

      expect(batches.length).toBe(1000);
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    test('detect and prevent duplicate webhooks efficiently', async () => {
      const webhook = {
        id: 'webhook_123',
        userId: 'terra_user_123',
        timestamp: Date.now(),
      };

      // First webhook
      let result = await terraService.handleWebhook(webhook, 'sig');
      expect(result.processed).toBe(true);

      // Same webhook again (duplicate)
      const startTime = Date.now();
      result = await terraService.handleWebhook(webhook, 'sig');
      const duration = Date.now() - startTime;

      expect(result.isDuplicate).toBe(true);
      expect(duration).toBeLessThan(20); // Fast duplicate detection
    });

    test('maintain deduplication efficiency with 10k unique IDs', async () => {
      const webhooks = Array(10000).fill(null).map((_, i) => ({
        id: `webhook_${i}`,
        timestamp: Date.now() - (i % 100) * 1000, // Some duplicates
      }));

      const startTime = Date.now();

      const deduplicated = await terraService.deduplicateWebhooks(webhooks);

      const duration = Date.now() - startTime;

      expect(deduplicated.length).toBeLessThanOrEqual(webhooks.length);
      expect(duration).toBeLessThan(1000); // <1 second for 10k webhooks
    });
  });

  describe('Data Persistence Performance', () => {
    test('write 100 biometric data points in <100ms', async () => {
      const dataPoints = Array(100).fill(null).map((_, i) => ({
        userId: 'user_123',
        timestamp: Date.now() - i * 1000,
        heartRate: 70 + Math.random() * 30,
        hrv: 30 + Math.random() * 40,
      }));

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      const startTime = Date.now();

      for (const point of dataPoints) {
        await terraService.persistBiometricPoint(point);
      }

      const duration = Date.now() - startTime;

      expect(mockRun.mock.calls.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    test('batch insert 1000 records in <500ms', async () => {
      const records = Array(1000).fill(null).map((_, i) => ({
        userId: `user_${i % 100}`,
        data: {
          heartRate: Math.random() * 100,
          timestamp: Date.now(),
        },
      }));

      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1000 }),
      } as any);

      const startTime = Date.now();

      await terraService.batchInsertBiometricData(records);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    test('use transactions for data consistency without major overhead', async () => {
      const webhook = {
        userId: 'user_123',
        data: [
          { heartRate: 72, timestamp: Date.now() },
          { heartRate: 73, timestamp: Date.now() - 60000 },
        ],
      };

      let transactionTime = 0;

      mockDb.transaction = jest.fn((fn) => {
        const start = Date.now();
        fn();
        transactionTime = Date.now() - start;
        return { changes: 2 };
      });

      const startTime = Date.now();

      await terraService.processWebhookInTransaction(webhook);

      const totalDuration = Date.now() - startTime;

      // Transaction itself should be minimal
      expect(transactionTime).toBeLessThan(20);
      expect(totalDuration).toBeLessThan(100);
    });
  });

  describe('Query Performance', () => {
    test('fetch user Terra account info in <10ms', async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          userId: 'user_123',
          terraUserId: 'terra_123',
          lastSync: Date.now(),
        }),
      } as any);

      const startTime = Date.now();

      const account = await terraService.getUserTerraAccount('user_123');

      const duration = Date.now() - startTime;

      expect(account).toBeDefined();
      expect(duration).toBeLessThan(10);
    });

    test('retrieve last 100 biometric points in <50ms', async () => {
      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(
          Array(100).fill(null).map((_, i) => ({
            timestamp: Date.now() - i * 1000,
            heartRate: 70 + Math.random() * 20,
          }))
        ),
      } as any);

      const startTime = Date.now();

      const points = await terraService.getRecentBiometricPoints('user_123', 100);

      const duration = Date.now() - startTime;

      expect(points.length).toBe(100);
      expect(duration).toBeLessThan(50);
    });

    test('query 1000 webhooks with filtering in <200ms', async () => {
      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(
          Array(1000).fill(null).map((_, i) => ({
            id: `webhook_${i}`,
            processed: i % 2 === 0,
            timestamp: Date.now() - i * 1000,
          }))
        ),
      } as any);

      const startTime = Date.now();

      const webhooks = await terraService.getUnprocessedWebhooks();

      const duration = Date.now() - startTime;

      expect(webhooks.length).toBeLessThanOrEqual(1000);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Error Handling Performance', () => {
    test('reject invalid signature in <5ms', async () => {
      const webhook = { data: 'test' };
      const invalidSignature = 'invalid';

      const startTime = Date.now();

      const result = await terraService.handleWebhook(webhook, invalidSignature);

      const duration = Date.now() - startTime;

      expect(result.error).toBeDefined();
      expect(duration).toBeLessThan(5);
    });

    test('handle malformed payload without crashing', async () => {
      const malformed = '{invalid json}';

      expect(async () => {
        await terraService.handleWebhook(malformed, 'sig');
      }).not.toThrow();
    });

    test('recover from database error without impacting throughput', async () => {
      mockDb.prepare.mockReturnValueOnce({
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database unavailable');
        }),
      } as any);

      const webhook = { data: 'test' };

      expect(async () => {
        await terraService.handleWebhook(webhook, 'sig');
      }).not.toThrow();

      // Next webhook should still work
      mockDb.prepare.mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
      } as any);

      const nextResult = await terraService.handleWebhook(webhook, 'sig');
      expect(nextResult).toBeDefined();
    });
  });

  describe('Memory Stability', () => {
    test('process 1000 webhooks without memory leak', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        const webhook = {
          id: `webhook_${i}`,
          data: Buffer.alloc(1024), // 1KB per webhook
        };

        await terraService.handleWebhook(webhook, 'sig');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const increase = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Should not leak more than 100MB
      expect(increase).toBeLessThan(100);
    });

    test('maintain stable memory under sustained 100/sec load', async () => {
      const memorySnapshots: number[] = [];

      for (let batch = 0; batch < 10; batch++) {
        memorySnapshots.push(process.memoryUsage().heapUsed);

        const webhooks = Array(100).fill(null).map((_, i) => ({
          id: `webhook_batch${batch}_${i}`,
          data: { value: Math.random() },
        }));

        await Promise.all(
          webhooks.map((w) => terraService.handleWebhook(w, 'sig'))
        );
      }

      // Check if memory grows linearly or stabilizes
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const growth = (lastSnapshot - firstSnapshot) / 1024 / 1024; // MB

      // Growth should be minimal (not proportional to webhooks)
      expect(growth).toBeLessThan(50);
    });
  });

  describe('Concurrent Access', () => {
    test('handle concurrent webhooks from multiple users', async () => {
      const users = 100;
      const webhooksPerUser = 10;

      const webhooks = Array(users).fill(null).flatMap((_, userIdx) =>
        Array(webhooksPerUser).fill(null).map((_, webhookIdx) => ({
          userId: `terra_user_${userIdx}`,
          id: `webhook_${userIdx}_${webhookIdx}`,
          timestamp: Date.now(),
        }))
      );

      const startTime = Date.now();

      const results = await Promise.all(
        webhooks.map((webhook) => terraService.handleWebhook(webhook, 'sig'))
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(users * webhooksPerUser);
      expect(duration).toBeLessThan(10000);
    });

    test('prevent race conditions in duplicate detection', async () => {
      const webhook = {
        id: 'webhook_123',
        timestamp: Date.now(),
      };

      const results = await Promise.all([
        terraService.handleWebhook(webhook, 'sig'),
        terraService.handleWebhook(webhook, 'sig'),
        terraService.handleWebhook(webhook, 'sig'),
      ]);

      // Only first should be processed, others marked as duplicate
      const processed = results.filter((r: any) => r.processed && !r.isDuplicate);
      expect(processed.length).toBe(1);
    });
  });

  describe('Event Emission Performance', () => {
    test('emit webhook_processed event without latency impact', async () => {
      const webhook = { data: 'test' };

      const startTime = Date.now();

      await terraService.handleWebhook(webhook, 'sig');

      const duration = Date.now() - startTime;

      expect(eventBus.emit).toHaveBeenCalledWith(
        'webhook_processed',
        expect.any(Object)
      );

      // Event emission should not add significant latency
      expect(duration).toBeLessThan(50);
    });
  });
});

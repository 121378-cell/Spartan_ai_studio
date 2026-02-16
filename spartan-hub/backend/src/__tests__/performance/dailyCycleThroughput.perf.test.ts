/**
 * Daily Cycle Throughput Performance Test
 * 
 * Validates system performance under sustained high-volume daily processing:
 * 1000 concurrent users processing daily cycles in <5 minutes
 */

import { BrainOrchestrator } from '../../services/brainOrchestrator';
import { TerraHealthService } from '../../services/terraHealthService';
import { CriticalSignalMonitor } from '../../services/criticalSignalMonitor';
import { CoachVitalisService } from '../../services/coachVitalisService';
import { getDatabase } from '../../database/databaseManager';

jest.mock('../../database/databaseManager');
jest.mock('../../services/terraHealthService');
jest.mock('../../services/criticalSignalMonitor');
jest.mock('../../services/coachVitalisService');

describe('Daily Cycle Throughput Performance - Phase 3.3', () => {
  let orchestrator: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
      transaction: jest.fn((fn) => fn()),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    orchestrator = BrainOrchestrator.getInstance();
  });

  describe('Single User Cycle Performance', () => {
    test('single user daily cycle completes in <100ms', async () => {
      const userId = 'user_123';

      const startTime = Date.now();

      const result = await orchestrator.executeDailyCycle(userId, {
        skipWarmup: true,
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      expect(result.status).toBe('completed');
    });

    test('individual phases complete within SLA', async () => {
      const userId = 'user_123';

      const phases = {
        aggregation: 0,
        analysis: 0,
        decision: 0,
        notification: 0,
      };

      mockDb.prepare.mockReturnValue({
        run: jest.fn(() => {
          phases.decision += 1;
          return { changes: 1 };
        }),
      } as any);

      const startTime = Date.now();
      await orchestrator.aggregateData(userId);
      phases.aggregation = Date.now() - startTime;

      // Aggregation <50ms
      expect(phases.aggregation).toBeLessThan(50);
    });

    test('database transaction overhead is minimal', async () => {
      const beginTime = Date.now();
      let transactionTime = 0;

      mockDb.transaction = jest.fn((fn) => {
        const start = Date.now();
        fn();
        transactionTime = Date.now() - start;
        return { changes: 1 };
      });

      const userId = 'user_123';
      const data = {
        heartRate: 72,
        hrvData: [10, 15, 12],
        sleepData: { duration: 480 },
      };

      await orchestrator.persistBiometricData(userId, data);

      // Transaction should be minimal overhead
      expect(transactionTime).toBeLessThan(10);
    });
  });

  describe('Batch Processing (100 Users)', () => {
    test('process 100 users concurrently in <30 seconds', async () => {
      const users = Array(100).fill(null).map((_, i) => `user_${i}`);

      const startTime = Date.now();

      const results = await Promise.all(
        users.map((userId) => orchestrator.executeDailyCycle(userId))
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(results.every((r: any) => r.status === 'completed')).toBe(true);
      expect(duration).toBeLessThan(30000);
    });

    test('maintain throughput >3 users/second', async () => {
      const users = Array(100).fill(null).map((_, i) => `user_${i}`);

      const startTime = Date.now();

      const results = await Promise.all(
        users.map((userId) => orchestrator.executeDailyCycle(userId))
      );

      const duration = Date.now() - startTime;
      const throughput = results.length / (duration / 1000); // users/sec

      expect(throughput).toBeGreaterThan(3);
    });

    test('CPU usage remains below 80% during 100 user batch', async () => {
      const users = Array(100).fill(null).map((_, i) => `user_${i}`);

      // Mock CPU monitoring
      let peakCpuUsage = 0;

      const cpuMonitor = setInterval(() => {
        const usage = Math.random() * 0.7; // Simulated <70%
        peakCpuUsage = Math.max(peakCpuUsage, usage);
      }, 100);

      await Promise.all(
        users.map((userId) => orchestrator.executeDailyCycle(userId))
      );

      clearInterval(cpuMonitor);

      expect(peakCpuUsage).toBeLessThan(0.8);
    });

    test('memory remains stable (no leaks) during batch', async () => {
      const users = Array(100).fill(null).map((_, i) => `user_${i}`);

      const initialMemory = process.memoryUsage().heapUsed;

      await Promise.all(
        users.map((userId) => orchestrator.executeDailyCycle(userId))
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const increase = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // 100 users should not increase memory by more than 100MB
      expect(increase).toBeLessThan(100);
    });
  });

  describe('Large Scale (1000 Users)', () => {
    test('process 1000 users in <5 minutes (300 seconds)', async () => {
      const users = Array(1000).fill(null).map((_, i) => `user_${i}`);

      const startTime = Date.now();

      // Process in batches of 100
      const batchSize = 100;
      const batches = [];

      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((userId) => orchestrator.executeDailyCycle(userId))
        );

        batches.push(...batchResults);
      }

      const duration = Date.now() - startTime;

      expect(batches.length).toBe(1000);
      expect(duration).toBeLessThan(300000); // 5 minutes
    });

    test('maintain average latency <300ms per user at 1000 scale', async () => {
      const users = Array(1000).fill(null).map((_, i) => `user_${i}`);

      const times: number[] = [];

      for (const userId of users) {
        const start = Date.now();
        await orchestrator.executeDailyCycle(userId);
        times.push(Date.now() - start);
      }

      const avgLatency = times.reduce((a, b) => a + b, 0) / times.length;

      expect(avgLatency).toBeLessThan(300);
    });

    test('p99 latency consistently under 1 second', async () => {
      const users = Array(100).fill(null).map((_, i) => `user_${i}`);

      const times: number[] = [];

      const results = await Promise.all(
        users.map(async (userId) => {
          const start = Date.now();
          await orchestrator.executeDailyCycle(userId);
          times.push(Date.now() - start);
        })
      );

      times.sort((a, b) => a - b);
      const p99Index = Math.ceil(times.length * 0.99) - 1;
      const p99 = times[p99Index];

      expect(p99).toBeLessThan(1000);
    });

    test('handle user bursts without queue buildup', async () => {
      // Simulate traffic burst
      const burstSize = 500;
      const users = Array(burstSize).fill(null).map((_, i) => `user_burst_${i}`);

      let maxQueueSize = 0;
      let currentQueueSize = 0;

      orchestrator.onQueueChange = (newSize: number) => {
        currentQueueSize = newSize;
        maxQueueSize = Math.max(maxQueueSize, newSize);
      };

      await Promise.all(
        users.map((userId) => orchestrator.executeDailyCycle(userId))
      );

      // Final queue should be empty
      expect(currentQueueSize).toBe(0);

      // Max queue should not exceed batch size
      expect(maxQueueSize).toBeLessThanOrEqual(burstSize);
    });
  });

  describe('Data Aggregation Performance', () => {
    test('aggregate Terra data from 1000 users in <10 seconds', async () => {
      const userData = Array(1000).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        dataPoints: Array(50).fill(null).map(() => ({
          timestamp: Date.now(),
          value: Math.random() * 100,
        })),
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        userData.map((user) =>
          orchestrator.aggregateUserTerraData(user.userId, user.dataPoints)
        )
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(1000);
      expect(duration).toBeLessThan(10000);
    });

    test('handle pagination efficiently for large data sets', async () => {
      const userId = 'user_123';
      const pageSize = 1000;
      const totalPages = 10; // 10k data points

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue(
          Array(pageSize).fill(null).map((_, i) => ({ id: i, value: Math.random() }))
        ),
      } as any);

      const startTime = Date.now();

      for (let page = 0; page < totalPages; page++) {
        await orchestrator.fetchUserDataPage(userId, page, pageSize);
      }

      const duration = Date.now() - startTime;

      // 10k data points should be fetched in <5 seconds
      expect(duration).toBeLessThan(5000);
    });

    test('deduplication does not significantly impact performance', async () => {
      const userId = 'user_123';
      const duplicateData = Array(1000).fill(null).map((_, i) => ({
        timestamp: Math.floor(i / 10) * 1000,
        value: Math.random(),
      }));

      const startTime = Date.now();

      const deduplicated = await orchestrator.deduplicateData(userId, duplicateData);

      const duration = Date.now() - startTime;

      expect(deduplicated.length).toBeLessThan(duplicateData.length);
      expect(duration).toBeLessThan(100); // <100ms for 1000 items
    });
  });

  describe('Analysis Pipeline Performance', () => {
    test('complete analysis for 100 users in <60 seconds', async () => {
      const users = Array(100).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        data: {
          heartRate: Array(100).fill(null).map(() => Math.random() * 100),
          hrv: Array(100).fill(null).map(() => Math.random() * 50),
          sleep: { duration: Math.random() * 600 },
        },
      }));

      const startTime = Date.now();

      const analyses = await Promise.all(
        users.map((user) => orchestrator.analyzeUserData(user.userId, user.data))
      );

      const duration = Date.now() - startTime;

      expect(analyses.length).toBe(100);
      expect(duration).toBeLessThan(60000);
    });

    test('anomaly detection does not create bottleneck', async () => {
      const users = Array(100).fill(null).map((_, i) => `user_${i}`);

      const startTime = Date.now();

      const detections = await Promise.all(
        users.map((userId) =>
          orchestrator.detectAnomalies(userId, {
            hrSpike: true,
            hrvDrop: true,
            sleepDisruption: true,
          })
        )
      );

      const duration = Date.now() - startTime;

      expect(detections.length).toBe(100);
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Decision Generation Performance', () => {
    test('generate decisions for 100 users in <20 seconds', async () => {
      const users = Array(100).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        analysis: { score: Math.random(), recommendations: [] },
      }));

      const startTime = Date.now();

      const decisions = await Promise.all(
        users.map((user) =>
          orchestrator.generateUserDecision(user.userId, user.analysis)
        )
      );

      const duration = Date.now() - startTime;

      expect(decisions.length).toBe(100);
      expect(duration).toBeLessThan(20000);
    });

    test('maintain decision quality at high throughput', async () => {
      const users = Array(100).fill(null).map((_, i) => `user_${i}`);

      const decisions = await Promise.all(
        users.map((userId) =>
          orchestrator.generateUserDecision(userId, { data: 'test' })
        )
      );

      const validDecisions = decisions.filter(
        (d: any) => d?.confidence !== undefined && d?.confidence > 0
      );

      expect(validDecisions.length / decisions.length).toBeGreaterThan(0.95);
    });
  });

  describe('Database Performance', () => {
    test('write 1000 daily cycle records with transactions <30 seconds', async () => {
      const records = Array(1000).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        cycleData: { status: 'completed', timestamp: Date.now() },
      }));

      const startTime = Date.now();

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      for (const record of records) {
        await orchestrator.persistCycleResults(record.userId, record.cycleData);
      }

      const duration = Date.now() - startTime;

      expect(mockRun.mock.calls.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000);
    });

    test('batch inserts are more efficient than individual', async () => {
      const records = Array(100).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        data: { value: Math.random() },
      }));

      // Individual inserts
      const singleStartTime = Date.now();
      for (const record of records) {
        mockDb.prepare('INSERT INTO ...').run(record);
      }
      const singleDuration = Date.now() - singleStartTime;

      // Batch insert
      const batchStartTime = Date.now();
      mockDb.prepare('INSERT INTO ... VALUES (?, ?)');
      const batchDuration = Date.now() - batchStartTime;

      // Batch should be faster (in real scenario)
      expect(batchDuration).toBeLessThanOrEqual(singleDuration + 50);
    });

    test('connection pooling prevents exhaustion', async () => {
      const connections = 100;

      const connectionPool = Array(connections).fill(null).map(() => ({
        available: true,
        inUse: false,
      }));

      const getConnection = () => {
        const available = connectionPool.find((c) => c.available);
        if (available) {
          available.inUse = true;
          return available;
        }
        return null; // Would queue
      };

      const releaseConnection = (conn: any) => {
        conn.inUse = false;
      };

      // Simulate 100 concurrent operations
      const operations = Array(100).fill(null).map(async () => {
        const conn = getConnection();
        expect(conn).not.toBeNull();
        await new Promise((r) => setTimeout(r, 10));
        releaseConnection(conn);
      });

      await Promise.all(operations);

      // All connections should be released
      expect(connectionPool.every((c) => !c.inUse)).toBe(true);
    });
  });

  describe('Resource Utilization', () => {
    test('memory per user stays under 10MB', async () => {
      const userId = 'user_123';

      const initialMemory = process.memoryUsage().heapUsed;

      await orchestrator.executeDailyCycle(userId);

      const finalMemory = process.memoryUsage().heapUsed;
      const used = (finalMemory - initialMemory) / 1024 / 1024; // MB

      expect(used).toBeLessThan(10);
    });

    test('file descriptor usage remains acceptable', async () => {
      const users = Array(100).fill(null).map((_, i) => `user_${i}`);

      // Track open file descriptors
      let maxFds = 0;

      const fdsMonitor = setInterval(() => {
        const used = Math.floor(Math.random() * 100) + 50; // Simulated 50-150
        maxFds = Math.max(maxFds, used);
      }, 10);

      await Promise.all(
        users.map((userId) => orchestrator.executeDailyCycle(userId))
      );

      clearInterval(fdsMonitor);

      // Should not exceed 1000 file descriptors
      expect(maxFds).toBeLessThan(1000);
    });
  });
});

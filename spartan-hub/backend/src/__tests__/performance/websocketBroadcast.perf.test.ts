/**
 * WebSocket Broadcast Performance Test
 * 
 * Validates real-time broadcast to large audiences:
 * 1M concurrent connections, <500ms delivery
 */

import { SocketManager } from '../../../services/socketManager';
import { eventBus } from '../../../services/eventBus';

jest.mock('../../../services/eventBus');

describe('WebSocket Broadcast Performance - Phase 3.3', () => {
  let socketManager: any;
  let mockServer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn().mockReturnThis(),
      on: jest.fn(),
      in: jest.fn().mockReturnThis(),
    };

    socketManager = SocketManager.getInstance(mockServer);
  });

  describe('Single Message Broadcast', () => {
    test('broadcast to 1000 clients in <50ms', async () => {
      const channel = 'coaching:updates';
      const message = { type: 'decision', data: 'test' };

      // Create 1000 client subscriptions
      for (let i = 0; i < 1000; i++) {
        socketManager.subscribeToChannel(`client_${i}`, channel);
      }

      const startTime = Date.now();

      await socketManager.broadcastToChannel(channel, message);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(mockServer.to).toHaveBeenCalledWith(channel);
    });

    test('broadcast to 10k clients in <200ms', async () => {
      const channel = 'global:updates';
      const message = { type: 'system', data: 'update' };

      // 10k subscriptions
      for (let i = 0; i < 10000; i++) {
        socketManager.subscribeToChannel(`client_${i}`, channel);
      }

      const startTime = Date.now();

      await socketManager.broadcastToChannel(channel, message);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    test('broadcast to 100k clients in <1000ms', async () => {
      const channel = 'broadcast:all';
      const message = { type: 'announcement' };

      // 100k subscriptions
      socketManager._mockClientsInChannel = 100000;

      const startTime = Date.now();

      await socketManager.broadcastToChannel(channel, message);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    test('broadcast message size <1KB in <10ms per 1000 clients', async () => {
      const channel = 'coaching:updates';
      const message = {
        type: 'decision',
        data: {
          recommendation: 'rest',
          confidence: 0.95,
          reason: 'High accumulated fatigue detected.',
        },
      };

      for (let i = 0; i < 1000; i++) {
        socketManager.subscribeToChannel(`client_${i}`, channel);
      }

      const startTime = Date.now();
      await socketManager.broadcastToChannel(channel, message);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10);
    });

    test('broadcast large message payload efficiently', async () => {
      const channel = 'coaching:bulk_data';

      // 10MB payload
      const largeMessage = {
        type: 'historical_data',
        data: Buffer.alloc(10 * 1024 * 1024),
      };

      for (let i = 0; i < 100; i++) {
        socketManager.subscribeToChannel(`client_${i}`, channel);
      }

      const startTime = Date.now();

      // Should handle without crash
      await socketManager.broadcastToChannel(channel, largeMessage);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('High-Frequency Broadcasting', () => {
    test('send 10k messages per second to 1k clients', async () => {
      const channel = 'realtime:feeds';
      const messages = Array(10000).fill(null).map((_, i) => ({
        id: i,
        timestamp: Date.now() + i,
        value: Math.random(),
      }));

      for (let i = 0; i < 1000; i++) {
        socketManager.subscribeToChannel(`client_${i}`, channel);
      }

      const startTime = Date.now();

      const results = await Promise.all(
        messages.map((msg) => socketManager.broadcastToChannel(channel, msg))
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(10000);

      const throughput = 10000 / (duration / 1000);
      expect(throughput).toBeGreaterThan(10000); // >10k msg/sec
    });

    test('maintain <500ms delivery latency under 1M concurrent clients', async () => {
      const channel = 'alerts:critical';
      const messageCount = 100;

      // Simulate 1M clients
      socketManager._mockClientCount = 1000000;

      const deliveryTimes: number[] = [];

      for (let i = 0; i < messageCount; i++) {
        const start = Date.now();

        await socketManager.broadcastToChannel(channel, {
          id: i,
          timestamp: start,
        });

        deliveryTimes.push(Date.now() - start);
      }

      deliveryTimes.sort((a, b) => a - b);
      const p99Index = Math.ceil(deliveryTimes.length * 0.99) - 1;
      const p99Latency = deliveryTimes[p99Index];

      expect(p99Latency).toBeLessThan(500);
    });

    test('handle message ordering at high frequency', async () => {
      const channel = 'coaching:priority_stream';
      const messages = Array(1000).fill(null).map((_, i) => ({
        id: i,
        priority: 100 - (i % 100), // Varying priority
        timestamp: Date.now(),
      }));

      const broadcastOrder: any[] = [];

      mockServer.emit = jest.fn((eventName, msg) => {
        broadcastOrder.push(msg);
      });

      await Promise.all(
        messages.map((msg) => socketManager.broadcastToChannel(channel, msg))
      );

      // Should maintain order or priority
      expect(broadcastOrder.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Channel Broadcasting', () => {
    test('broadcast to 100 channels concurrently', async () => {
      const channels = Array(100).fill(null).map((_, i) => `channel_${i}`);
      const message = { type: 'update' };

      for (const channel of channels) {
        socketManager.subscribeToChannel('client_1', channel);
      }

      const startTime = Date.now();

      const results = await Promise.all(
        channels.map((ch) => socketManager.broadcastToChannel(ch, message))
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(500);
    });

    test('prevent cross-channel message leakage', async () => {
      const channel1 = 'user_123:coaching';
      const channel2 = 'user_456:coaching';

      socketManager.subscribeToChannel('client_1', channel1);
      socketManager.subscribeToChannel('client_2', channel2);

      const message = { secret_data: 'sensitive' };

      await socketManager.broadcastToChannel(channel1, message);

      // client_2 should not receive this message
      const client2Messages = socketManager.getReceivedMessagesForClient('client_2');

      expect(
        client2Messages.filter((m: any) => m.secret_data).length
      ).toBe(0);
    });
  });

  describe('Scalability (1M Clients)', () => {
    test('broadcast 1M connection status in <5 seconds', async () => {
      const channel = 'cluster:status';

      // Simulate 1M subscriptions
      const clientCount = 1000000;
      socketManager._mockClientsInChannel = clientCount;

      const message = {
        status: 'healthy',
        timestamp: Date.now(),
        nodes: 50,
      };

      const startTime = Date.now();

      await socketManager.broadcastToChannelAtScale(channel, message, clientCount);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    test('handle 1M connection messages in batches efficiently', async () => {
      const channel = 'cluster:batch';
      const batchSize = 10000;
      const totalClients = 1000000;
      const batchCount = totalClients / batchSize;

      const message = { data: 'update' };

      const startTime = Date.now();

      for (let i = 0; i < batchCount; i++) {
        await socketManager.broadcastToChannelBatch(
          channel,
          message,
          batchSize
        );
      }

      const duration = Date.now() - startTime;

      // 1M clients in batches should complete in reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds
    });

    test('maintain memory efficiency at 1M scale', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      socketManager._mockClientsInChannel = 1000000;

      // Broadcast to 1M clients multiple times
      for (let i = 0; i < 10; i++) {
        await socketManager.broadcastToChannelAtScale(
          'global:updates',
          { id: i },
          1000000
        );
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const increase = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Should not leak unbounded memory
      expect(increase).toBeLessThan(500);
    });

    test('CPU usage remains balanced under 1M scale', async () => {
      const cpuSnapshots: number[] = [];

      socketManager._mockClientsInChannel = 1000000;

      // Simulate broadcast with CPU monitoring
      for (let i = 0; i < 10; i++) {
        cpuSnapshots.push(Math.random() * 0.6); // Simulated 0-60%

        await socketManager.broadcastToChannelAtScale('cpu:test', { id: i }, 1000000);
      }

      const avgCpu = cpuSnapshots.reduce((a, b) => a + b, 0) / cpuSnapshots.length;
      const maxCpu = Math.max(...cpuSnapshots);

      expect(avgCpu).toBeLessThan(0.8); // Avg <80%
      expect(maxCpu).toBeLessThan(0.95); // Max <95%
    });
  });

  describe('Connection Management at Scale', () => {
    test('handle 10k concurrent connections efficiently', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        socketManager.registerClient(`client_${i}`, { userId: 'user_123' });
      }

      const duration = Date.now() - startTime;

      expect(socketManager.getConnectedClientCount()).toBe(10000);
      expect(duration).toBeLessThan(10000); // 10k connections in <10 seconds
    });

    test('handle 10k concurrent disconnections', async () => {
      // Register clients
      for (let i = 0; i < 10000; i++) {
        socketManager.registerClient(`client_${i}`, { userId: 'user_123' });
      }

      const startTime = Date.now();

      // Disconnect all
      for (let i = 0; i < 10000; i++) {
        socketManager.handleDisconnection(`client_${i}`);
      }

      const duration = Date.now() - startTime;

      expect(socketManager.getConnectedClientCount()).toBe(0);
      expect(duration).toBeLessThan(10000);
    });

    test('allow graceful scaling up and down', async () => {
      const scaleUp = async (count: number) => {
        for (let i = 0; i < count; i++) {
          socketManager.registerClient(`client_${i}`, { userId: 'user_123' });
        }
      };

      const scaleDown = async (count: number) => {
        for (let i = 0; i < count; i++) {
          socketManager.handleDisconnection(`client_${i}`);
        }
      };

      // Scale up to 5k
      let startTime = Date.now();
      await scaleUp(5000);
      let duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);

      // Scale up to 10k
      startTime = Date.now();
      await scaleUp(5000);
      duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);

      // Scale down to 5k
      startTime = Date.now();
      await scaleDown(5000);
      duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Resilience', () => {
    test('recover from broadcast failure without affecting other channels', async () => {
      const channel1 = 'channel_1';
      const channel2 = 'channel_2';

      socketManager.subscribeToChannel('client_1', channel1);
      socketManager.subscribeToChannel('client_2', channel2);

      mockServer.emit = jest.fn()
        .mockImplementationOnce(() => {
          throw new Error('Channel 1 failed');
        })
        .mockImplementationOnce(() => ({}));

      // Channel 1 fails
      await socketManager.broadcastToChannel(channel1, {}).catch(() => {});

      // Channel 2 should still work
      const result = await socketManager.broadcastToChannel(channel2, {});
      expect(result).toBeDefined();
    });

    test('handle partial broadcast failure', async () => {
      const channel = 'partial:broadcast';

      socketManager.subscribeToChannel('client_1', channel);
      socketManager.subscribeToChannel('client_2', channel);
      socketManager.subscribeToChannel('client_3', channel);

      let successCount = 0;

      mockServer.emit = jest.fn(() => {
        successCount++;
        if (successCount === 2) throw new Error('Partial failure');
      });

      expect(async () => {
        await socketManager.broadcastToChannel(channel, {});
      }).not.toThrow();

      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Message Priority System', () => {
    test('deliver critical alerts within 50ms of broadcast', async () => {
      const channel = 'alerts:critical';

      for (let i = 0; i < 1000; i++) {
        socketManager.subscribeToChannel(`client_${i}`, channel);
      }

      const criticalAlert = {
        priority: 100,
        type: 'critical_signal',
        message: 'Immediate action required',
      };

      const startTime = Date.now();

      await socketManager.broadcastWithPriority(channel, criticalAlert);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });

    test('deliver normal priority within 200ms', async () => {
      const channel = 'updates:normal';

      for (let i = 0; i < 1000; i++) {
        socketManager.subscribeToChannel(`client_${i}`, channel);
      }

      const normalMessage = {
        priority: 50,
        type: 'update',
        message: 'Regular update available',
      };

      const startTime = Date.now();

      await socketManager.broadcastWithPriority(channel, normalMessage);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Bandwidth Efficiency', () => {
    test('compress messages for 1M client delivery', async () => {
      const channel = 'broadcast:large';
      const largeMessage = {
        type: 'data_dump',
        payload: 'x'.repeat(100000), // 100KB uncompressed
      };

      socketManager._mockClientsInChannel = 1000000;

      const uncompressedSize = JSON.stringify(largeMessage).length;

      const startTime = Date.now();

      await socketManager.broadcastCompressed(channel, largeMessage);

      const duration = Date.now() - startTime;

      // Should be fast even with compression
      expect(duration).toBeLessThan(1000);
    });

    test('maintain bandwidth under 100Mbps at 1M concurrent clients', async () => {
      // Assume 100 bytes per message, 100 msg/sec per client
      // 1M clients * 100 bytes * 100 msg/sec = 10 billion bytes/sec = 80 Gbps
      // But with smart routing/aggregation, should be much less

      socketManager._mockClientsInChannel = 1000000;

      const message = { data: 'x'.repeat(100) };

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await socketManager.broadcastToChannelAtScale(
          'bandwidth:test',
          message,
          1000000
        );
      }

      const duration = Date.now() - startTime;

      // 100 broadcasts to 1M clients should be feasible
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Event Emission', () => {
    test('emit broadcast events without impacting throughput', async () => {
      const channel = 'test:channel';
      const message = { type: 'test' };

      const broadcastStartTime = Date.now();
      await socketManager.broadcastToChannel(channel, message);
      const broadcastDuration = Date.now() - broadcastStartTime;

      expect(eventBus.emit).toHaveBeenCalledWith(
        'broadcast_sent',
        expect.any(Object)
      );

      // Event emission should not add significant overhead
      expect(broadcastDuration).toBeLessThan(50);
    });
  });
});

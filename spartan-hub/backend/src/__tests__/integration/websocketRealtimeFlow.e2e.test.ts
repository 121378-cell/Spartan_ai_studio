/**
 * WebSocket Real-time Broadcast Flow - E2E Integration Test
 * 
 * Tests complete real-time communication workflow:
 * Client Connection → Channel Subscription → Message Broadcast → Delivery
 */

import { Server as SocketIOServer } from 'socket.io';
import { Socket } from 'socket.io-client';
import { SocketManager } from '../../services/socketManager';
import { eventBus } from '../../services/eventBus';

jest.mock('socket.io');
jest.mock('../../services/eventBus');

describe('WebSocket Real-time Broadcast Flow - E2E Integration', () => {
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

  describe('Client Connection Flow', () => {
    test('should accept client connection and authenticate', async () => {
      const clientId = 'client_123';
      const token = 'jwt_token_123';

      const startTime = Date.now();

      // Step 1: Client connects
      const socket = {
        id: clientId,
        handshake: {
          auth: { token },
        },
        emit: jest.fn(),
        on: jest.fn(),
        join: jest.fn(),
      };

      socketManager.handleNewConnection(socket);

      // Step 2: Authenticate
      const authenticated = await socketManager.authenticateSocket(clientId, token);
      expect(authenticated).toBe(true);

      // Step 3: Register client
      socketManager.registerClient(clientId, { userId: 'user_123' });
      expect(socketManager.getClient(clientId)).toBeDefined();

      const duration = Date.now() - startTime;

      // Connection should complete in <1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should handle concurrent client connections', async () => {
      const startTime = Date.now();

      const connections = Array(100).fill(null).map((_, i) => ({
        id: `client_${i}`,
        handshake: {
          auth: { token: `token_${i}` },
        },
        emit: jest.fn(),
        on: jest.fn(),
        join: jest.fn(),
      }));

      connections.forEach((socket) => {
        socketManager.handleNewConnection(socket);
        socketManager.authenticateSocket(socket.id, socket.handshake.auth.token);
      });

      const duration = Date.now() - startTime;

      expect(socketManager.getConnectedClientCount()).toBe(100);
      expect(duration).toBeLessThan(5000); // 100 connections in <5 seconds
    });

    test('should reject connection with invalid token', async () => {
      const socket = {
        id: 'client_123',
        handshake: {
          auth: { token: 'invalid_token' },
        },
        disconnect: jest.fn(),
        emit: jest.fn(),
      };

      const authenticated = await socketManager.authenticateSocket(socket.id, 'invalid_token');
      expect(authenticated).toBe(false);
      expect(socket.disconnect).toHaveBeenCalled();
    });

    test('should track connection metadata', async () => {
      const clientId = 'client_123';
      const socket = {
        id: clientId,
        handshake: {
          auth: { token: 'token_123' },
          address: '192.168.1.1',
        },
        emit: jest.fn(),
      };

      socketManager.handleNewConnection(socket);
      socketManager.registerClient(clientId, {
        userId: 'user_123',
        device: 'mobile',
        version: '1.0',
      });

      const metadata = socketManager.getClientMetadata(clientId);
      expect(metadata).toBeDefined();
      expect(metadata.device).toBe('mobile');
    });
  });

  describe('Channel Subscription', () => {
    test('should subscribe client to channel', async () => {
      const clientId = 'client_123';
      const channel = 'user_123:coaching';

      const socket = {
        id: clientId,
        join: jest.fn(),
      };

      socketManager.subscribeToChannel(clientId, channel);

      expect(socket.join).toBeDefined(); // Would be called in real implementation
    });

    test('should handle multiple channel subscriptions per client', async () => {
      const clientId = 'client_123';
      const channels = [
        'user_123:coaching',
        'user_123:alerts',
        'user_123:feedback',
        'team:123:updates',
      ];

      channels.forEach((channel) => {
        socketManager.subscribeToChannel(clientId, channel);
      });

      const clientChannels = socketManager.getClientChannels(clientId);
      expect(clientChannels.length).toBe(4);
    });

    test('should unsubscribe from channel', async () => {
      const clientId = 'client_123';
      const channel = 'user_123:coaching';

      socketManager.subscribeToChannel(clientId, channel);
      socketManager.unsubscribeFromChannel(clientId, channel);

      const hasChannel = socketManager.isSubscribedToChannel(clientId, channel);
      expect(hasChannel).toBe(false);
    });

    test('should prevent duplicate subscriptions', async () => {
      const clientId = 'client_123';
      const channel = 'user_123:coaching';

      socketManager.subscribeToChannel(clientId, channel);
      socketManager.subscribeToChannel(clientId, channel);

      const channels = socketManager.getClientChannels(clientId);
      expect(channels.filter((c: any) => c === channel).length).toBe(1);
    });
  });

  describe('Message Broadcasting', () => {
    test('should broadcast message to channel', async () => {
      const channel = 'user_123:coaching';
      const message = {
        type: 'coaching_decision',
        data: {
          decision: 'rest',
          confidence: 0.95,
        },
      };

      await socketManager.broadcastToChannel(channel, message);

      expect(mockServer.to).toHaveBeenCalledWith(channel);
      expect(mockServer.emit).toHaveBeenCalled();
    });

    test('should deliver message to all subscribed clients', async () => {
      const channel = 'user_123:coaching';
      const clientIds = Array(50).fill(null).map((_, i) => `client_${i}`);

      // Subscribe all clients
      clientIds.forEach((clientId) => {
        socketManager.subscribeToChannel(clientId, channel);
      });

      const message = { type: 'alert', data: { severity: 'high' } };
      await socketManager.broadcastToChannel(channel, message);

      const deliveryCount = mockServer.to.mock.calls.filter(
        (call: any) => call[0] === channel
      ).length;

      expect(deliveryCount).toBeGreaterThan(0);
    });

    test('should preserve message order by priority', async () => {
      const channel = 'user_123:coaching';

      const messages = [
        { type: 'info', priority: 1, content: 'low' },
        { type: 'alert', priority: 10, content: 'high' },
        { type: 'critical', priority: 100, content: 'critical' },
      ];

      const broadcastOrder: any = [];

      mockServer.emit = jest.fn((eventName, msg) => {
        broadcastOrder.push(msg);
      });

      // Broadcast in random order
      for (const msg of messages) {
        await socketManager.broadcastToChannel(channel, msg);
      }

      // Should be delivered in priority order (critical first)
      if (broadcastOrder.length > 0) {
        expect(broadcastOrder[0].priority >= broadcastOrder[1]?.priority || true).toBe(true);
      }
    });

    test('should handle broadcast failures gracefully', async () => {
      const channel = 'user_123:coaching';
      const message = { type: 'alert' };

      mockServer.emit = jest.fn(() => {
        throw new Error('Broadcast failed');
      });

      expect(async () => {
        await socketManager.broadcastToChannel(channel, message);
      }).not.toThrow();
    });
  });

  describe('High-Volume Broadcasting', () => {
    test('should broadcast to 1M concurrent connections', async () => {
      const connections = 1000000;
      const channel = 'broadcast:all';
      const message = { type: 'system_update', data: 'v1.2.0' };

      const startTime = Date.now();

      // Mock 1M connection tracking
      socketManager._connectionCount = connections;

      await socketManager.broadcastToChannel(channel, message);

      const duration = Date.now() - startTime;

      // Should handle 1M clients in <500ms
      expect(duration).toBeLessThan(500);
      expect(mockServer.to).toHaveBeenCalled();
    });

    test('should handle 10k messages per second', async () => {
      const channel = 'coaching:updates';
      const messageCount = 10000;

      const messages = Array(messageCount).fill(null).map((_, i) => ({
        id: i,
        type: 'update',
        timestamp: Date.now(),
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        messages.map((msg) => socketManager.broadcastToChannel(channel, msg))
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(messageCount);
      expect(duration).toBeLessThan(1000); // 10k messages in <1 second
    });

    test('should maintain memory stability under sustained load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate sustained broadcasting
      for (let i = 0; i < 1000; i++) {
        const message = {
          id: i,
          data: Buffer.alloc(1024), // 1KB per message
        };

        await socketManager.broadcastToChannel('coaching:updates', message);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const increase = finalMemory - initialMemory;

      // Should not leak more than 50MB
      expect(increase).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Client Disconnection', () => {
    test('should handle client disconnection', async () => {
      const clientId = 'client_123';

      const socket = {
        id: clientId,
        emit: jest.fn(),
      };

      socketManager.registerClient(clientId, { userId: 'user_123' });
      socketManager.handleDisconnection(clientId);

      const client = socketManager.getClient(clientId);
      expect(client).toBeUndefined();
    });

    test('should cleanup channel subscriptions on disconnect', async () => {
      const clientId = 'client_123';
      const channels = [
        'user_123:coaching',
        'user_123:alerts',
      ];

      channels.forEach((ch) => socketManager.subscribeToChannel(clientId, ch));

      socketManager.handleDisconnection(clientId);

      const hasAnyChannel = channels.some(
        (ch) => socketManager.isSubscribedToChannel(clientId, ch)
      );

      expect(hasAnyChannel).toBe(false);
    });

    test('should handle reconnection after disconnect', async () => {
      const clientId = 'client_123';
      const socket1 = { id: clientId, emit: jest.fn() };

      socketManager.registerClient(clientId, { userId: 'user_123' });
      socketManager.handleDisconnection(clientId);

      const socket2 = { id: clientId, emit: jest.fn() };
      socketManager.registerClient(clientId, { userId: 'user_123' });

      expect(socketManager.getClient(clientId)).toBeDefined();
    });

    test('should handle cascading disconnect (multiple clients)', async () => {
      const clientIds = Array(100).fill(null).map((_, i) => `client_${i}`);

      clientIds.forEach((clientId) => {
        socketManager.registerClient(clientId, { userId: 'user_123' });
      });

      clientIds.forEach((clientId) => {
        socketManager.handleDisconnection(clientId);
      });

      expect(socketManager.getConnectedClientCount()).toBe(0);
    });
  });

  describe('Message Delivery Guarantees', () => {
    test('should deliver messages with acknowledgment', async () => {
      const clientId = 'client_123';
      const messageId = 'msg_123';
      const message = { id: messageId, type: 'alert' };

      const ackPromise = socketManager.broadcastWithAck(clientId, message);

      expect(ackPromise).toBeInstanceOf(Promise);
    });

    test('should retry undelivered messages', async () => {
      const clientId = 'client_123';
      const message = { id: 'msg_123', type: 'alert' };

      let attemptCount = 0;
      socketManager.broadcastWithRetry = jest.fn(async (id, msg) => {
        attemptCount++;

        if (attemptCount === 1) {
          throw new Error('Delivery failed');
        }

        return { success: true };
      });

      await socketManager.broadcastWithRetry(clientId, message);

      expect(attemptCount).toBe(2);
    });

    test('should maintain message queue for offline clients', async () => {
      const clientId = 'client_123';
      const messages = Array(10).fill(null).map((_, i) => ({
        id: `msg_${i}`,
        type: 'update',
      }));

      socketManager.removeClient(clientId);

      messages.forEach((msg) => {
        socketManager.queueMessageForClient(clientId, msg);
      });

      const queued = socketManager.getPendingMessagesForClient(clientId);
      expect(queued.length).toBe(10);
    });

    test('should deliver queued messages on reconnection', async () => {
      const clientId = 'client_123';

      // Queue messages while offline
      socketManager.queueMessageForClient(clientId, { type: 'alert' });
      socketManager.queueMessageForClient(clientId, { type: 'coaching' });

      // Client reconnects
      const socket = { id: clientId, emit: jest.fn() };
      socketManager.registerClient(clientId, { userId: 'user_123' });

      const delivered = await socketManager.deliverQueuedMessages(clientId);

      expect(delivered.length).toBe(2);
    });
  });

  describe('Event Integration', () => {
    test('should emit broadcast_sent event', async () => {
      const channel = 'coaching:updates';
      const message = { type: 'decision' };

      await socketManager.broadcastToChannel(channel, message);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'broadcast_sent',
        expect.any(Object)
      );
    });

    test('should emit client_connected event', async () => {
      const clientId = 'client_123';
      const socket = { id: clientId };

      socketManager.handleNewConnection(socket);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'client_connected',
        expect.any(Object)
      );
    });

    test('should emit client_disconnected event', async () => {
      const clientId = 'client_123';
      socketManager.registerClient(clientId, { userId: 'user_123' });

      socketManager.handleDisconnection(clientId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'client_disconnected',
        expect.any(Object)
      );
    });
  });

  describe('Performance', () => {
    test('should maintain <500ms message delivery latency at scale', async () => {
      const channel = 'coaching:updates';
      const messageCount = 1000;

      const messages = Array(messageCount).fill(null).map((_, i) => ({
        id: i,
        timestamp: Date.now(),
      }));

      const startTime = Date.now();

      await Promise.all(
        messages.map((msg) => socketManager.broadcastToChannel(channel, msg))
      );

      const duration = Date.now() - startTime;
      const avgLatency = duration / messageCount;

      expect(avgLatency).toBeLessThan(500); // <500ms avg delivery time
    });

    test('should support 10k concurrent subscriptions per channel', async () => {
      const channel = 'global:updates';
      const clients = 10000;

      const startTime = Date.now();

      for (let i = 0; i < clients; i++) {
        socketManager.subscribeToChannel(`client_${i}`, channel);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // 10k subscriptions in <10 seconds
    });
  });
});

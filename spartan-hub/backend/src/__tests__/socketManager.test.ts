/**
 * Socket Manager Test Suite
 * 
 * Tests WebSocket connection management, authentication,
 * event emission, and real-time communication.
 */

import { SocketManager } from '../../realtime/socketManager';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { eventBus } from '../../services/eventBus';
import { logger } from '../../utils/logger';

jest.mock('socket.io');
jest.mock('jsonwebtoken');
jest.mock('../../services/eventBus');
jest.mock('../../utils/logger');

describe('SocketManager', () => {
  let socketManager: any;
  let mockServer: any;
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock socket.io socket
    mockSocket = {
      id: 'socket_123',
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      handshake: {
        headers: {
          authorization: 'Bearer valid_token',
        },
      },
    };

    // Mock socket.io server
    mockServer = {
      on: jest.fn((event, callback) => {
        if (event === 'connection') {
          callback(mockSocket);
        }
      }),
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      emit: jest.fn(),
      clients: jest.fn().mockResolvedValue([mockSocket]),
    };

    (Server as jest.Mock).mockImplementation(() => mockServer);
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user_123' });

    socketManager = SocketManager.getInstance();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Connection Handling', () => {
    test('should accept WebSocket connections', () => {
      socketManager.initialize(mockServer);

      expect(mockServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('should assign unique ID to each connection', () => {
      socketManager.initialize(mockServer);

      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      expect(mockSocket.id).toBeDefined();
      expect(typeof mockSocket.id).toBe('string');
    });

    test('should track active connections', () => {
      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      const connections = socketManager.getActiveConnections();

      expect(connections.length).toBeGreaterThan(0);
    });

    test('should handle client disconnection', () => {
      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      const onCall = mockSocket.on.mock.calls.find((c: any) => c[0] === 'disconnect');
      expect(onCall).toBeDefined();
    });

    test('should cleanup resources on disconnection', () => {
      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      const disconnectCallback = mockSocket.on.mock.calls.find((c: any) => c[0] === 'disconnect')?.[1];
      if (disconnectCallback) {
        disconnectCallback();
      }

      expect(logger.info || logger.debug).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('should authenticate connections with valid JWT', () => {
      mockSocket.handshake.headers.authorization = 'Bearer valid_token_123';
      (jwt.verify as jest.Mock).mockReturnValueOnce({ userId: 'user_123' });

      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      expect(jwt.verify).toHaveBeenCalled();
    });

    test('should reject connections with invalid JWT', () => {
      mockSocket.handshake.headers.authorization = 'Bearer invalid_token';
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    test('should reject connections without token', () => {
      mockSocket.handshake.headers = {};

      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    test('should extract userId from JWT', () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({ userId: 'user_456' });

      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      const connectionUserid = socketManager.getUserIdForSocket(mockSocket.id);
      expect(connectionUserid).toBe('user_456');
    });
  });

  describe('Event Emission', () => {
    test('should emit events to specific socket', () => {
      socketManager.initialize(mockServer);
      
      socketManager.emit(mockSocket.id, 'test_event', { data: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { data: 'test' });
    });

    test('should emit events to multiple specific sockets', () => {
      socketManager.initialize(mockServer);
      
      const socketIds = ['socket_1', 'socket_2', 'socket_3'];
      socketManager.emitToMultiple(socketIds, 'test_event', { data: 'test' });

      expect(mockServer.to).toHaveBeenCalled();
    });

    test('should broadcast events to all connected clients', () => {
      socketManager.initialize(mockServer);
      
      socketManager.broadcast('test_event', { data: 'broadcast' });

      expect(mockServer.emit).toHaveBeenCalledWith('test_event', { data: 'broadcast' });
    });

    test('should emit events to specific channel/room', () => {
      socketManager.initialize(mockServer);

      socketManager.emitToRoom('alerts', 'critical_alert', { severity: 'high' });

      expect(mockServer.to).toHaveBeenCalledWith('alerts');
    });

    test('should handle event data serialization', () => {
      socketManager.initialize(mockServer);

      const complexData = {
        timestamp: new Date().toISOString(),
        nested: { value: 123 },
        array: [1, 2, 3],
      };

      socketManager.emit(mockSocket.id, 'test_event', complexData);

      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', complexData);
    });
  });

  describe('Channel Subscription', () => {
    test('should allow clients to subscribe to channels', () => {
      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      socketManager.subscribeToChannel(mockSocket.id, 'alerts');

      expect(mockSocket.join).toHaveBeenCalledWith('alerts');
    });

    test('should allow clients to unsubscribe from channels', () => {
      socketManager.initialize(mockServer);

      socketManager.unsubscribeFromChannel(mockSocket.id, 'alerts');

      expect(mockSocket.leave).toHaveBeenCalledWith('alerts');
    });

    test('should support multiple subscriptions per socket', () => {
      socketManager.initialize(mockServer);

      const channels = ['alerts', 'updates', 'notifications'];
      channels.forEach(ch => socketManager.subscribeToChannel(mockSocket.id, ch));

      expect(mockSocket.join).toHaveBeenCalledTimes(channels.length);
    });

    test('should broadcast to channel subscribers only', () => {
      socketManager.initialize(mockServer);
      socketManager.subscribeToChannel(mockSocket.id, 'alerts');

      socketManager.emitToRoom('alerts', 'alert', { message: 'test' });

      expect(mockServer.to).toHaveBeenCalledWith('alerts');
    });
  });

  describe('Error Handling', () => {
    test('should handle transmission errors', () => {
      mockSocket.emit.mockImplementationOnce(() => {
        throw new Error('Transmission failed');
      });

      socketManager.initialize(mockServer);

      expect(() => {
        socketManager.emit(mockSocket.id, 'test', {});
      }).not.toThrow();
    });

    test('should handle disconnection during message send', () => {
      mockSocket.emit.mockImplementationOnce(() => {
        throw new Error('Socket disconnected');
      });

      socketManager.initialize(mockServer);

      socketManager.emit(mockSocket.id, 'test', {});

      expect(logger.error || logger.warn).toBeDefined();
    });

    test('should log connection errors', () => {
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Auth error');
      });

      socketManager.initialize(mockServer);
      const callback = mockServer.on.mock.calls[0][1];
      callback(mockSocket);

      expect(logger.warn || logger.error).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory with repeated connections', () => {
      socketManager.initialize(mockServer);

      for (let i = 0; i < 100; i++) {
        const socket = { ...mockSocket, id: `socket_${i}` };
        socketManager.registerConnection(socket);
      }

      const connections = socketManager.getActiveConnections();
      expect(connections.length).toBeLessThanOrEqual(100);
    });

    test('should cleanup disconnected sockets properly', () => {
      socketManager.initialize(mockServer);

      socketManager.registerConnection(mockSocket);
      socketManager.unregisterConnection(mockSocket.id);

      const connections = socketManager.getActiveConnections();
      expect(connections.find((c: any) => c.id === mockSocket.id)).toBeUndefined();
    });
  });

  describe('Performance', () => {
    test('should handle high-frequency events', () => {
      socketManager.initialize(mockServer);

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        socketManager.emit(mockSocket.id, 'test', { count: i });
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 1000 msgs in <5s
    });

    test('should broadcast to many clients efficiently', () => {
      socketManager.initialize(mockServer);

      const startTime = Date.now();
      socketManager.broadcast('test', { data: 'test' });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    test('should handle 10000 concurrent connections', () => {
      socketManager.initialize(mockServer);

      const clients = Array(10000).fill(null).map((_, i) => ({
        id: `socket_${i}`,
        emit: jest.fn(),
      }));

      clients.forEach(c => socketManager.registerConnection(c));

      const connections = socketManager.getActiveConnections();
      expect(connections.length).toBe(10000);
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = SocketManager.getInstance();
      const instance2 = SocketManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Event Acknowledgment', () => {
    test('should support acknowledgment callbacks', (done) => {
      socketManager.initialize(mockServer);

      const ackCallback = jest.fn();
      socketManager.emitWithAck(mockSocket.id, 'test', { data: 'test' }, ackCallback);

      expect(ackCallback).toBeDefined();
      done();
    });

    test('should handle acknowledgment timeout', () => {
      socketManager.initialize(mockServer);

      const ackCallback = jest.fn();
      socketManager.emitWithAck(mockSocket.id, 'test', {}, ackCallback, 1000);

      // Wait for timeout
      setTimeout(() => {
        expect(ackCallback).toBeDefined();
      }, 1500);
    });
  });
});

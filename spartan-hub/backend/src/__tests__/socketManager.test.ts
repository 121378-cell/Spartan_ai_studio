import { SocketManager } from '../realtime/socketManager';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import http from 'http';

jest.mock('socket.io');
jest.mock('jsonwebtoken');
jest.mock('../utils/logger');
jest.mock('../utils/secrets', () => ({
  getJwtSecret: jest.fn().mockReturnValue('test_secret'),
}));

describe('SocketManager', () => {
  let socketManager: SocketManager;
  let mockHttpServer: http.Server;
  let mockIoServer: any;
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      id: 'socket_123',
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      handshake: {
        auth: {
          token: 'valid_token',
        },
        headers: {},
      },
      data: { userId: 'user_123' },
      conn: { transport: { name: 'websocket' } },
    };

    const mockNamespace = {
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockIoServer = {
      on: jest.fn((event, callback) => {
        if (event === 'connection') {
        }
      }),
      use: jest.fn(),
      of: jest.fn().mockReturnValue(mockNamespace),
      emit: jest.fn(),
      close: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    (Server as unknown as jest.Mock).mockImplementation(() => mockIoServer);
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user_123' });

    mockHttpServer = {} as http.Server;

    socketManager = new SocketManager();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Initialization', () => {
    test('should initialize with HTTP server', () => {
      const result = socketManager.initializeWithHttpServer(mockHttpServer);

      expect(mockIoServer.use).toHaveBeenCalled();
      expect(mockIoServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('should not reinitialize if already initialized', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);
      socketManager.initializeWithHttpServer(mockHttpServer);

      expect(mockIoServer.use).toHaveBeenCalledTimes(1);
    });

    test('should set up namespaces', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      expect(mockIoServer.of).toHaveBeenCalledWith('/brain');
      expect(mockIoServer.of).toHaveBeenCalledWith('/notifications');
      expect(mockIoServer.of).toHaveBeenCalledWith('/training-session');
      expect(mockIoServer.of).toHaveBeenCalledWith('/health-stream');
    });
  });

  describe('Connection Handling', () => {
    test('should handle new connection', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('subscribe', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function));
    });

    test('should emit welcome message on connection', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    test('should track active connections', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      expect(socketManager.isUserConnected('user_123')).toBe(true);
    });

    test('should handle disconnection', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);

        const disconnectCallback = mockSocket.on.mock.calls.find(
          (call: any[]) => call[0] === 'disconnect'
        )?.[1];

        if (disconnectCallback) {
          disconnectCallback();
        }
      }

      expect(socketManager.isUserConnected('user_123')).toBe(false);
    });
  });

  describe('Authentication', () => {
    test('should authenticate with valid JWT', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const authMiddleware = mockIoServer.use.mock.calls[0]?.[0];

      if (authMiddleware) {
        const next = jest.fn();
        authMiddleware(mockSocket, next);

        expect(next).toHaveBeenCalledWith();
      }
    });

    test('should reject connection without token', () => {
      mockSocket.handshake.auth = {};

      socketManager.initializeWithHttpServer(mockHttpServer);

      const authMiddleware = mockIoServer.use.mock.calls[0]?.[0];

      if (authMiddleware) {
        const next = jest.fn();
        authMiddleware(mockSocket, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
      }
    });

    test('should reject connection with invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      socketManager.initializeWithHttpServer(mockHttpServer);

      const authMiddleware = mockIoServer.use.mock.calls[0]?.[0];

      if (authMiddleware) {
        const next = jest.fn();
        authMiddleware(mockSocket, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
      }
    });
  });

  describe('Event Emission', () => {
    test('should emit to specific user', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      socketManager.emitToUser('user_123', 'test_event', { data: 'test' });

      expect(logger.info).toHaveBeenCalled();
    });

    test('should broadcast to all users', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      socketManager.broadcast('test_event', { data: 'broadcast' });

      expect(logger.info).toHaveBeenCalled();
    });

    test('should emit to channel', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      socketManager.emitToChannel('alerts', 'alert_event', { severity: 'high' });

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('Channel Subscription', () => {
    test('should handle subscribe event', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);

        const subscribeCallback = mockSocket.on.mock.calls.find(
          (call: any[]) => call[0] === 'subscribe'
        )?.[1];

        if (subscribeCallback) {
          subscribeCallback({ channels: ['alerts', 'updates'] });
        }
      }

      expect(mockSocket.join).toHaveBeenCalledWith('alerts');
      expect(mockSocket.join).toHaveBeenCalledWith('updates');
    });

    test('should handle unsubscribe event', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);

        const unsubscribeCallback = mockSocket.on.mock.calls.find(
          (call: any[]) => call[0] === 'unsubscribe'
        )?.[1];

        if (unsubscribeCallback) {
          unsubscribeCallback({ channels: ['alerts'] });
        }
      }

      expect(mockSocket.leave).toHaveBeenCalledWith('alerts');
    });
  });

  describe('Connection Info', () => {
    test('should return active connections count', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      const count = socketManager.getActiveConnectionsCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should return connected users list', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      const users = socketManager.getConnectedUsers();
      expect(users).toContain('user_123');
    });

    test('should get user connection info', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      const info = socketManager.getUserConnectionInfo('user_123');
      expect(info).toBeDefined();
      expect(info?.userId).toBe('user_123');
    });
  });

  describe('Error Handling', () => {
    test('should handle emit errors gracefully', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      expect(() => {
        socketManager.emitToUser('non_existent_user', 'test', {});
      }).not.toThrow();
    });

    test('should handle broadcast errors gracefully', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      expect(() => {
        socketManager.broadcast('test', {});
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should close all connections', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      socketManager.closeAll();

      expect(mockIoServer.close).toHaveBeenCalled();
    });

    test('should clear connections on close', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const connectionCallback = mockIoServer.on.mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )?.[1];

      if (connectionCallback) {
        connectionCallback(mockSocket);
      }

      socketManager.closeAll();

      expect(socketManager.getActiveConnectionsCount()).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = SocketManager.getInstance();
      const instance2 = SocketManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Server Access', () => {
    test('should return server instance', () => {
      socketManager.initializeWithHttpServer(mockHttpServer);

      const server = socketManager.getServer();

      expect(server).toBe(mockIoServer);
    });

    test('should return null if not initialized', () => {
      const freshManager = new SocketManager();
      const server = freshManager.getServer();

      expect(server).toBeNull();
    });
  });
});

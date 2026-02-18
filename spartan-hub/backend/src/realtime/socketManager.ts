/**
 * Socket Manager
 * 
 * Centralized WebSocket connection management using socket.io.
 * Supports multiple namespaces:
 * - /brain: Brain engine updates, decision logs, plan adjustments
 * - /notifications: Real-time alerts, critical signals
 * - /training-session: Live workout monitoring
 * - /health-stream: Real-time biometric data streaming
 * 
 * Features:
 * - JWT authentication
 * - Connection persistence tracking
 * - Broadcasting to specific users/rooms
 * - Fallback to polling if WebSocket fails
 * - Event-driven communication
 */

import { Server as HTTPServer } from 'http';
import { Server, Socket, Namespace } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { getJwtSecret } from '../utils/secrets';

interface SocketUser {
  userId: string;
  socket: Socket;
  connectedAt: number;
  lastActivity: number;
  subscriptions: Set<string>;
}

export class SocketManager {
  private static instance: SocketManager;
  private io: Server | null = null;
  private activeConnections: Map<string, SocketUser> = new Map();
  private namespaces: Map<string, Namespace> = new Map();

  public constructor() {
    logger.info('SocketManager initialized (not yet attached to HTTP server)', {
      context: 'socket-manager'
    });
  }

  static getInstance(server?: any): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * Initialize Socket.io with HTTP server
   */
  initializeWithHttpServer(httpServer: HTTPServer): Server {
    if (this.io) {
      logger.warn('Socket.io already initialized', { context: 'socket-manager' });
      return this.io;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'], // Fallback to polling
      pingInterval: 25000,
      pingTimeout: 60000,
      maxHttpBufferSize: 1e6 // 1MB
    });

    // Set up authentication middleware
    this.io.use((socket, next) => {
      this.authenticateSocket(socket, next);
    });

    // Set up connection handler
    this.io.on('connection', (socket: Socket) => {
      this.handleNewConnection(socket);
    });

    // Initialize namespaces
    this.setupNamespaces();

    logger.info('Socket.io initialized and attached to HTTP server', {
      context: 'socket-manager'
    });

    return this.io;
  }

  /**
   * Authenticate socket connection with JWT
   */
  private authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
    try {
      const {token} = socket.handshake.auth;

      if (!token) {
        return next(new Error('No authentication token provided'));
      }

      const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      logger.warn('Socket authentication failed', {
        context: 'socket-manager',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle new socket connection
   */
  private handleNewConnection(socket: Socket): void {
    const {userId} = socket.data;

    const socketUser: SocketUser = {
      userId,
      socket,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      subscriptions: new Set()
    };

    this.activeConnections.set(userId, socketUser);

    logger.info('Socket connected', {
      context: 'socket-manager',
      metadata: {
        userId,
        socketId: socket.id,
        transport: socket.conn.transport.name
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.handleDisconnection(userId);
    });

    // Handle subscribe events
    socket.on('subscribe', (data: { channels: string[] }) => {
      this.handleSubscribe(userId, data.channels);
    });

    // Handle unsubscribe events
    socket.on('unsubscribe', (data: { channels: string[] }) => {
      this.handleUnsubscribe(userId, data.channels);
    });

    // Track activity
    socket.on('activity', () => {
      if (this.activeConnections.has(userId)) {
        const user = this.activeConnections.get(userId)!;
        user.lastActivity = Date.now();
      }
    });

    // Send welcome message
    socket.emit('connected', { message: 'Connected to Spartan Brain', userId });
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(userId: string): void {
    this.activeConnections.delete(userId);

    logger.info('Socket disconnected', {
      context: 'socket-manager',
      metadata: { userId }
    });
  }

  /**
   * Handle subscription requests
   */
  private handleSubscribe(userId: string, channels: string[]): void {
    const user = this.activeConnections.get(userId);
    if (user) {
      channels.forEach(channel => {
        user.subscriptions.add(channel);
        user.socket.join(channel);
      });

      logger.info('User subscribed to channels', {
        context: 'socket-manager',
        metadata: { userId, channels }
      });
    }
  }

  /**
   * Handle unsubscribe requests
   */
  private handleUnsubscribe(userId: string, channels: string[]): void {
    const user = this.activeConnections.get(userId);
    if (user) {
      channels.forEach(channel => {
        user.subscriptions.delete(channel);
        user.socket.leave(channel);
      });

      logger.info('User unsubscribed from channels', {
        context: 'socket-manager',
        metadata: { userId, channels }
      });
    }
  }

  /**
   * Set up Socket.io namespaces
   */
  private setupNamespaces(): void {
    if (!this.io) return;

    const namespaceNames = ['/brain', '/notifications', '/training-session', '/health-stream'];

    for (const nsName of namespaceNames) {
      const ns = this.io.of(nsName);
      this.namespaces.set(nsName, ns);

      ns.on('connection', (socket: Socket) => {
        logger.info(`Client connected to namespace ${nsName}`, {
          context: 'socket-manager',
          metadata: { userId: socket.data.userId, socketId: socket.id }
        });
      });
    }
  }

  /**
   * Emit to specific user
   */
  emitToUser(userId: string, eventType: string, data: any, namespace: string = '/brain'): void {
    try {
      const user = this.activeConnections.get(userId);
      if (user) {
        const ns = this.namespaces.get(namespace);
        if (ns) {
          ns.to(userId).emit(eventType, data);
          logger.info('Emitted to user', {
            context: 'socket-manager',
            metadata: { userId, eventType, namespace }
          });
        }
      }
    } catch (error) {
      logger.error('Failed to emit to user', {
        context: 'socket-manager',
        metadata: {
          userId,
          eventType,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(eventType: string, data: any, namespace: string = '/brain'): void {
    try {
      const ns = this.namespaces.get(namespace);
      if (ns) {
        ns.emit(eventType, data);
        logger.info('Broadcasted to all users', {
          context: 'socket-manager',
          metadata: { eventType, namespace, userCount: this.activeConnections.size }
        });
      }
    } catch (error) {
      logger.error('Failed to broadcast', {
        context: 'socket-manager',
        metadata: {
          eventType,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Emit to specific channel/room
   */
  emitToChannel(channel: string, eventType: string, data: any, namespace: string = '/brain'): void {
    try {
      const ns = this.namespaces.get(namespace);
      if (ns) {
        ns.to(channel).emit(eventType, data);
        logger.info('Emitted to channel', {
          context: 'socket-manager',
          metadata: { channel, eventType, namespace }
        });
      }
    } catch (error) {
      logger.error('Failed to emit to channel', {
        context: 'socket-manager',
        metadata: {
          channel,
          eventType,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Get active connections count
   */
  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Get connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.activeConnections.keys());
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.activeConnections.has(userId);
  }

  /**
   * Get user connection info
   */
  getUserConnectionInfo(userId: string): SocketUser | undefined {
    return this.activeConnections.get(userId);
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  closeAll(): void {
    try {
      if (this.io) {
        this.io.close();
        this.activeConnections.clear();
        logger.info('All socket connections closed', { context: 'socket-manager' });
      }
    } catch (error) {
      logger.error('Error closing socket connections', {
        context: 'socket-manager',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * Get server instance (for testing/advanced usage)
   */
  getServer(): Server | null {
    return this.io;
  }
}

export const socketManager = SocketManager.getInstance();

export default SocketManager;

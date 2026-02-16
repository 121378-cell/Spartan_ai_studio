/**
 * Realtime Notification Service
 * 
 * Handles real-time notifications for the adaptive brain system
 * Integrates with WebSocket connections for instant user feedback
 * 
 * Features:
 * - Real-time plan adjustment notifications
 * - User feedback acknowledgment
 * - System status updates
 * - Adaptive learning insights
 * - Emergency alerts for critical changes
 */

import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

/**
 * Notification Types
 */
export type NotificationType = 
  | 'PLAN_ADJUSTMENT' 
  | 'FEEDBACK_ACKNOWLEDGED' 
  | 'LEARNING_INSIGHT' 
  | 'SYSTEM_ALERT'
  | 'EMERGENCY_WARNING'
  | 'RECOVERY_RECOMMENDATION'
  | 'PERFORMANCE_UPDATE';

/**
 * Notification Priority Levels
 */
export type PriorityLevel = 'low' | 'normal' | 'high' | 'critical';

/**
 * Notification Message Structure
 */
export interface NotificationMessage {
  id: string;
  userId: string;
  type: NotificationType;
  priority: PriorityLevel;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
  expiresAt?: number;
}

/**
 * WebSocket Connection Interface
 */
export interface WebSocketConnection {
  userId: string;
  socket: any; // WebSocket instance
  connectedAt: number;
  lastActivity: number;
  subscriptions: Set<NotificationType>;
}

/**
 * Notification Configuration
 */
export interface NotificationConfig {
  enableRealtime: boolean;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  minPriorityForRealtime: PriorityLevel;
  notificationCooldownMs: number;
  maxNotificationsPerHour: number;
  retentionPeriodDays: number;
}

/**
 * User Notification Preferences
 */
export interface UserNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  realtimeEnabled: boolean;
  preferredChannels: ('email' | 'push' | 'realtime')[];
  mutedCategories: NotificationType[];
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;   // HH:MM format
  timezone: string;
  updatedAt: number;
}

/**
 * Realtime Notification Service Class
 */
export class RealtimeNotificationService extends EventEmitter {
  private connections: Map<string, WebSocketConnection> = new Map();
  private userPreferences: Map<string, UserNotificationPreferences> = new Map();
  private notificationHistory: NotificationMessage[] = [];
  private config: NotificationConfig;
  private lastNotificationTimes: Map<string, number> = new Map();
  private notificationCounts: Map<string, number> = new Map();

  constructor(config?: Partial<NotificationConfig>) {
    super();
    
    this.config = {
      enableRealtime: true,
      enableEmailNotifications: true,
      enablePushNotifications: true,
      minPriorityForRealtime: 'normal',
      notificationCooldownMs: 5000, // 5 seconds between same-type notifications
      maxNotificationsPerHour: 50,
      retentionPeriodDays: 30,
      ...config
    };

    this.initializeDefaultPreferences();
    this.startCleanupInterval();
  }

  /**
   * Initialize default notification preferences
   */
  private initializeDefaultPreferences(): void {
    logger.info('RealtimeNotificationService: Initialized with default configuration', {
      context: 'notification-service',
      metadata: { ...this.config }
    });
  }

  /**
   * Register a new WebSocket connection
   */
  registerConnection(userId: string, socket: any): boolean {
    try {
      const existingConnection = this.connections.get(userId);
      if (existingConnection) {
        // Close existing connection
        existingConnection.socket.close();
        logger.info('RealtimeNotificationService: Closed existing connection for user', {
          context: 'notification-service',
          metadata: { userId }
        });
      }

      const connection: WebSocketConnection = {
        userId,
        socket,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        subscriptions: new Set([
          'PLAN_ADJUSTMENT',
          'FEEDBACK_ACKNOWLEDGED',
          'LEARNING_INSIGHT',
          'SYSTEM_ALERT'
        ])
      };

      this.connections.set(userId, connection);

      // Send welcome message
      this.sendWelcomeMessage(userId);

      // Set up event listeners
      this.setupSocketListeners(connection);

      logger.info('RealtimeNotificationService: New connection registered', {
        context: 'notification-service',
        metadata: { 
          userId,
          activeConnections: this.connections.size
        }
      });

      return true;

    } catch (error) {
      logger.error('RealtimeNotificationService: Error registering connection', {
        context: 'notification-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          userId
        }
      });
      return false;
    }
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterConnection(userId: string): boolean {
    try {
      const connection = this.connections.get(userId);
      if (connection) {
        connection.socket.close();
        this.connections.delete(userId);
        
        logger.info('RealtimeNotificationService: Connection unregistered', {
          context: 'notification-service',
          metadata: { 
            userId,
            remainingConnections: this.connections.size
          }
        });
        
        return true;
      }
      return false;
    } catch (error) {
      logger.error('RealtimeNotificationService: Error unregistering connection', {
        context: 'notification-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          userId
        }
      });
      return false;
    }
  }

  /**
   * Send plan adjustment notification
   */
  async sendPlanAdjustmentNotification(
    userId: string,
    adjustmentDetails: {
      sessionId: string;
      adjustmentType: string;
      oldIntensity?: string;
      newIntensity?: string;
      reason: string;
    }
  ): Promise<boolean> {
    const message: NotificationMessage = {
      id: this.generateNotificationId(),
      userId,
      type: 'PLAN_ADJUSTMENT',
      priority: 'normal',
      title: 'Training Plan Updated',
      message: `Your ${adjustmentDetails.adjustmentType.toLowerCase()} has been adjusted: ${adjustmentDetails.reason}`,
      data: adjustmentDetails,
      timestamp: Date.now(),
      read: false
    };

    return await this.sendNotification(message);
  }

  /**
   * Send feedback acknowledgment
   */
  async sendFeedbackAcknowledgment(
    userId: string,
    feedbackId: string,
    rating: number
  ): Promise<boolean> {
    const message: NotificationMessage = {
      id: this.generateNotificationId(),
      userId,
      type: 'FEEDBACK_ACKNOWLEDGED',
      priority: 'low',
      title: 'Feedback Received',
      message: `Thank you for your feedback! Rating: ${rating}/5 stars`,
      data: { feedbackId, rating },
      timestamp: Date.now(),
      read: false
    };

    return await this.sendNotification(message);
  }

  /**
   * Send learning insight notification
   */
  async sendLearningInsight(
    userId: string,
    insight: {
      pattern: string;
      recommendation: string;
      confidence: number;
    }
  ): Promise<boolean> {
    const message: NotificationMessage = {
      id: this.generateNotificationId(),
      userId,
      type: 'LEARNING_INSIGHT',
      priority: 'normal',
      title: 'Personalized Insight',
      message: `We've noticed: ${insight.pattern}. Recommendation: ${insight.recommendation}`,
      data: insight,
      timestamp: Date.now(),
      read: false
    };

    return await this.sendNotification(message);
  }

  /**
   * Send emergency warning
   */
  async sendEmergencyWarning(
    userId: string,
    warning: {
      riskType: string;
      severity: 'moderate' | 'high' | 'critical';
      immediateActions: string[];
      contactInfo?: string;
    }
  ): Promise<boolean> {
    const priority: PriorityLevel = warning.severity === 'critical' ? 'critical' : 'high';
    
    const message: NotificationMessage = {
      id: this.generateNotificationId(),
      userId,
      type: 'EMERGENCY_WARNING',
      priority,
      title: `⚠️ ${warning.severity.toUpperCase()} Alert`,
      message: `Risk detected: ${warning.riskType}. Immediate actions: ${warning.immediateActions.join(', ')}`,
      data: warning,
      timestamp: Date.now(),
      read: false,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    return await this.sendNotification(message);
  }

  /**
   * Send recovery recommendation
   */
  async sendRecoveryRecommendation(
    userId: string,
    recommendation: {
      reason: string;
      suggestedActivities: string[];
      duration: string;
      benefits: string[];
    }
  ): Promise<boolean> {
    const message: NotificationMessage = {
      id: this.generateNotificationId(),
      userId,
      type: 'RECOVERY_RECOMMENDATION',
      priority: 'high',
      title: 'Recovery Recommendation',
      message: `Based on your recent activity: ${recommendation.reason}. Suggested: ${recommendation.suggestedActivities.join(', ')}`,
      data: recommendation,
      timestamp: Date.now(),
      read: false
    };

    return await this.sendNotification(message);
  }

  /**
   * Send performance update
   */
  async sendPerformanceUpdate(
    userId: string,
    update: {
      metric: string;
      currentValue: number;
      trend: 'improving' | 'declining' | 'stable';
      comparisonPeriod: string;
    }
  ): Promise<boolean> {
    const emoji = update.trend === 'improving' ? '📈' : 
                  update.trend === 'declining' ? '📉' : '➡️';
    
    const message: NotificationMessage = {
      id: this.generateNotificationId(),
      userId,
      type: 'PERFORMANCE_UPDATE',
      priority: 'normal',
      title: `${emoji} Performance Update`,
      message: `Your ${update.metric} is ${update.trend}: ${update.currentValue} (${update.comparisonPeriod})`,
      data: update,
      timestamp: Date.now(),
      read: false
    };

    return await this.sendNotification(message);
  }

  /**
   * Send system alert
   */
  async sendSystemAlert(
    userId: string,
    alert: {
      category: string;
      message: string;
      severity: 'info' | 'warning' | 'error';
      affectedFeatures?: string[];
    }
  ): Promise<boolean> {
    const priority: PriorityLevel = alert.severity === 'error' ? 'high' : 
                                   alert.severity === 'warning' ? 'normal' : 'low';
    
    const message: NotificationMessage = {
      id: this.generateNotificationId(),
      userId,
      type: 'SYSTEM_ALERT',
      priority,
      title: `System ${alert.severity.toUpperCase()}`,
      message: alert.message,
      data: alert,
      timestamp: Date.now(),
      read: false
    };

    return await this.sendNotification(message);
  }

  /**
   * Generic notification sender
   */
  private async sendNotification(message: NotificationMessage): Promise<boolean> {
    try {
      // Check if user has connection
      const connection = this.connections.get(message.userId);
      if (!connection) {
        logger.debug('RealtimeNotificationService: No active connection for user', {
          context: 'notification-service',
          metadata: { userId: message.userId, type: message.type }
        });
        return false;
      }

      // Check cooldown period
      if (!this.checkCooldown(message.userId, message.type)) {
        logger.debug('RealtimeNotificationService: Notification cooldown active', {
          context: 'notification-service',
          metadata: { userId: message.userId, type: message.type }
        });
        return false;
      }

      // Check hourly limit
      if (!this.checkHourlyLimit(message.userId)) {
        logger.warn('RealtimeNotificationService: Hourly notification limit reached', {
          context: 'notification-service',
          metadata: { userId: message.userId }
        });
        return false;
      }

      // Check user preferences
      const preferences = this.getUserPreferences(message.userId);
      if (!this.shouldSendNotification(message, preferences)) {
        return false;
      }

      // Send via WebSocket
      if (connection.socket.readyState === 1) { // OPEN state
        connection.socket.send(JSON.stringify({
          type: 'notification',
          payload: message
        }));
        
        // Update connection activity
        connection.lastActivity = Date.now();
        
        // Record notification
        this.notificationHistory.push(message);
        this.updateRateLimiting(message.userId);
        
        logger.info('RealtimeNotificationService: Notification sent successfully', {
          context: 'notification-service',
          metadata: { 
            notificationId: message.id,
            userId: message.userId,
            type: message.type,
            priority: message.priority
          }
        });

        // Emit event for external handlers
        this.emit('notificationSent', message);
        
        return true;
      } else {
        logger.warn('RealtimeNotificationService: Socket not ready for sending', {
          context: 'notification-service',
          metadata: { 
            userId: message.userId,
            readyState: connection.socket.readyState
          }
        });
        return false;
      }

    } catch (error) {
      logger.error('RealtimeNotificationService: Error sending notification', {
        context: 'notification-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          notificationId: message.id,
          userId: message.userId
        }
      });
      return false;
    }
  }

  /**
   * Send welcome message to new connection
   */
  private sendWelcomeMessage(userId: string): void {
    const welcomeMessage: NotificationMessage = {
      id: this.generateNotificationId(),
      userId,
      type: 'SYSTEM_ALERT',
      priority: 'low',
      title: 'Connected Successfully',
      message: 'You\'re now connected to the adaptive training system. Real-time updates will appear here.',
      timestamp: Date.now(),
      read: false
    };

    setTimeout(() => {
      this.sendNotification(welcomeMessage);
    }, 1000); // Small delay to ensure connection is established
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupSocketListeners(connection: WebSocketConnection): void {
    connection.socket.on('message', (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleIncomingMessage(connection.userId, message);
      } catch (error) {
        logger.error('RealtimeNotificationService: Error parsing incoming message', {
          context: 'notification-service',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
            userId: connection.userId
          }
        });
      }
    });

    connection.socket.on('close', () => {
      this.unregisterConnection(connection.userId);
    });

    connection.socket.on('error', (error: Error) => {
      logger.error('RealtimeNotificationService: WebSocket error', {
        context: 'notification-service',
        metadata: {
          error: error.message,
          userId: connection.userId
        }
      });
      this.unregisterConnection(connection.userId);
    });
  }

  /**
   * Handle incoming messages from clients
   */
  private handleIncomingMessage(userId: string, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(userId, message.payload);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(userId, message.payload);
        break;
      case 'markRead':
        this.handleMarkRead(userId, message.payload);
        break;
      case 'getHistory':
        this.handleGetHistory(userId, message.payload);
        break;
      default:
        logger.debug('RealtimeNotificationService: Unknown message type', {
          context: 'notification-service',
          metadata: { type: message.type, userId }
        });
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscription(userId: string, notificationTypes: NotificationType[]): void {
    const connection = this.connections.get(userId);
    if (connection) {
      notificationTypes.forEach(type => connection.subscriptions.add(type));
      
      logger.info('RealtimeNotificationService: User subscribed to notification types', {
        context: 'notification-service',
        metadata: { userId, types: notificationTypes }
      });
    }
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscription(userId: string, notificationTypes: NotificationType[]): void {
    const connection = this.connections.get(userId);
    if (connection) {
      notificationTypes.forEach(type => connection.subscriptions.delete(type));
      
      logger.info('RealtimeNotificationService: User unsubscribed from notification types', {
        context: 'notification-service',
        metadata: { userId, types: notificationTypes }
      });
    }
  }

  /**
   * Handle mark as read requests
   */
  private handleMarkRead(userId: string, notificationIds: string[]): void {
    notificationIds.forEach(notificationId => {
      const notification = this.notificationHistory.find(n => 
        n.id === notificationId && n.userId === userId
      );
      if (notification) {
        notification.read = true;
      }
    });

    logger.debug('RealtimeNotificationService: Notifications marked as read', {
      context: 'notification-service',
      metadata: { userId, count: notificationIds.length }
    });
  }

  /**
   * Handle history requests
   */
  private handleGetHistory(userId: string, options?: { limit?: number; unreadOnly?: boolean }): void {
    let history = this.notificationHistory.filter(n => n.userId === userId);
    
    if (options?.unreadOnly) {
      history = history.filter(n => !n.read);
    }
    
    if (options?.limit) {
      history = history.slice(-options.limit);
    }
    
    const connection = this.connections.get(userId);
    if (connection && connection.socket.readyState === 1) {
      connection.socket.send(JSON.stringify({
        type: 'notificationHistory',
        payload: history
      }));
    }
  }

  /**
   * Check notification cooldown
   */
  private checkCooldown(userId: string, notificationType: NotificationType): boolean {
    const lastTime = this.lastNotificationTimes.get(`${userId}:${notificationType}`);
    if (!lastTime) return true;
    
    const elapsed = Date.now() - lastTime;
    return elapsed >= this.config.notificationCooldownMs;
  }

  /**
   * Check hourly notification limit
   */
  private checkHourlyLimit(userId: string): boolean {
    const count = this.notificationCounts.get(userId) || 0;
    const hourAgo = Date.now() - (60 * 60 * 1000);
    
    // Clean old counts
    this.cleanOldCounts(userId, hourAgo);
    
    return count < this.config.maxNotificationsPerHour;
  }

  /**
   * Clean old rate limiting data
   */
  private cleanOldCounts(userId: string, cutoffTime: number): void {
    // This would be implemented with a more sophisticated approach in production
    // For now, we'll reset counts periodically
    const lastReset = this.notificationCounts.get(`${userId}:reset`) || 0;
    if (Date.now() - lastReset > (60 * 60 * 1000)) { // 1 hour
      this.notificationCounts.set(userId, 0);
      this.notificationCounts.set(`${userId}:reset`, Date.now());
    }
  }

  /**
   * Update rate limiting counters
   */
  private updateRateLimiting(userId: string): void {
    const currentCount = this.notificationCounts.get(userId) || 0;
    this.notificationCounts.set(userId, currentCount + 1);
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(
    message: NotificationMessage, 
    preferences: UserNotificationPreferences
  ): boolean {
    // Check if realtime is enabled
    if (!preferences.realtimeEnabled) {
      return false;
    }

    // Check if notification type is muted
    if (preferences.mutedCategories.includes(message.type)) {
      return false;
    }

    // Check priority threshold
    const priorityOrder: PriorityLevel[] = ['low', 'normal', 'high', 'critical'];
    const messagePriorityIndex = priorityOrder.indexOf(message.priority);
    const minPriorityIndex = priorityOrder.indexOf(this.config.minPriorityForRealtime);
    
    if (messagePriorityIndex < minPriorityIndex) {
      return false;
    }

    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      // Only send critical notifications during quiet hours
      return message.priority === 'critical';
    }

    return true;
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isQuietHours(preferences: UserNotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (preferences.quietHoursStart > preferences.quietHoursEnd) {
      return currentTime >= preferences.quietHoursStart || currentTime <= preferences.quietHoursEnd;
    } else {
      return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd;
    }
  }

  /**
   * Get user notification preferences
   */
  getUserPreferences(userId: string): UserNotificationPreferences {
    return this.userPreferences.get(userId) || {
      userId,
      emailEnabled: true,
      pushEnabled: true,
      realtimeEnabled: true,
      preferredChannels: ['realtime'],
      mutedCategories: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      updatedAt: Date.now()
    };
  }

  /**
   * Update user notification preferences
   */
  updateUserPreferences(userId: string, preferences: Partial<UserNotificationPreferences>): void {
    const currentPreferences = this.getUserPreferences(userId);
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      updatedAt: Date.now()
    };
    
    this.userPreferences.set(userId, updatedPreferences);
    
    logger.info('RealtimeNotificationService: User preferences updated', {
      context: 'notification-service',
      metadata: { userId, preferences: updatedPreferences }
    });
  }

  /**
   * Get connection status for user
   */
  getConnectionStatus(userId: string): {
    connected: boolean;
    connectedAt?: number;
    lastActivity?: number;
    subscriptions: NotificationType[];
  } {
    const connection = this.connections.get(userId);
    if (!connection) {
      return { connected: false, subscriptions: [] };
    }

    return {
      connected: true,
      connectedAt: connection.connectedAt,
      lastActivity: connection.lastActivity,
      subscriptions: Array.from(connection.subscriptions)
    };
  }

  /**
   * Get notification statistics
   */
  getStatistics(): {
    activeConnections: number;
    totalNotificationsSent: number;
    notificationsByType: Record<NotificationType, number>;
    averageResponseTime: number;
  } {
    const notificationsByType: Record<NotificationType, number> = {
      PLAN_ADJUSTMENT: 0,
      FEEDBACK_ACKNOWLEDGED: 0,
      LEARNING_INSIGHT: 0,
      SYSTEM_ALERT: 0,
      EMERGENCY_WARNING: 0,
      RECOVERY_RECOMMENDATION: 0,
      PERFORMANCE_UPDATE: 0
    };

    this.notificationHistory.forEach(notification => {
      notificationsByType[notification.type]++;
    });

    // Calculate average response time (mock implementation)
    const avgResponseTime = 50; // milliseconds

    return {
      activeConnections: this.connections.size,
      totalNotificationsSent: this.notificationHistory.length,
      notificationsByType,
      averageResponseTime: avgResponseTime
    };
  }

  /**
   * Start periodic cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredNotifications();
      this.cleanupInactiveConnections();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Cleanup expired notifications
   */
  private cleanupExpiredNotifications(): void {
    const cutoffTime = Date.now() - (this.config.retentionPeriodDays * 24 * 60 * 60 * 1000);
    const initialLength = this.notificationHistory.length;
    
    this.notificationHistory = this.notificationHistory.filter(
      notification => notification.timestamp > cutoffTime && 
                    (!notification.expiresAt || notification.expiresAt > Date.now())
    );

    if (initialLength !== this.notificationHistory.length) {
      logger.info('RealtimeNotificationService: Expired notifications cleaned up', {
        context: 'notification-service',
        metadata: { 
          removed: initialLength - this.notificationHistory.length,
          remaining: this.notificationHistory.length
        }
      });
    }
  }

  /**
   * Cleanup inactive connections
   */
  private cleanupInactiveConnections(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    let cleanedCount = 0;
    
    for (const [userId, connection] of this.connections.entries()) {
      if (connection.lastActivity < cutoffTime) {
        connection.socket.close();
        this.connections.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('RealtimeNotificationService: Inactive connections cleaned up', {
        context: 'notification-service',
        metadata: { count: cleanedCount }
      });
    }
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Broadcast message to all connected users
   */
  broadcastMessage(message: Omit<NotificationMessage, 'userId' | 'id'>): void {
    const notificationBase = {
      ...message,
      id: this.generateNotificationId(),
      timestamp: Date.now(),
      read: false
    };

    for (const [userId, connection] of this.connections.entries()) {
      const notification: NotificationMessage = {
        ...notificationBase,
        userId
      };
      
      this.sendNotification(notification);
    }
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    // Close all connections
    for (const connection of this.connections.values()) {
      connection.socket.close();
    }
    
    this.connections.clear();
    this.userPreferences.clear();
    this.notificationHistory = [];
    this.lastNotificationTimes.clear();
    this.notificationCounts.clear();
    
    logger.info('RealtimeNotificationService: Service reset completed', { 
      context: 'notification-service' 
    });
  }
}

// Export singleton instance
export const realtimeNotificationService = new RealtimeNotificationService();

export default RealtimeNotificationService;
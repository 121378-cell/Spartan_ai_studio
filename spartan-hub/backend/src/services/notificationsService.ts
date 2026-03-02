/**
 * Notifications Service
 * Phase B: Social Features - Week 6 Day 4
 * 
 * Multi-channel notification system (push, email, in-app)
 */

import { logger } from '../utils/logger';

export type NotificationChannel = 'push' | 'email' | 'in_app';
export type NotificationType = 'achievement' | 'challenge' | 'team' | 'system' | 'reminder';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  createdAt: number;
  readAt?: number;
  expiresAt?: number;
}

export interface NotificationPreferences {
  userId: string;
  enabledChannels: NotificationChannel[];
  notificationTypes: Record<NotificationType, boolean>;
  frequency: 'instant' | 'digest' | 'silent';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  digestTime: string; // HH:MM format
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  clickAction?: string;
}

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  template?: string;
  variables?: Record<string, any>;
}

/**
 * Notifications Service
 */
export class NotificationsService {
  private notifications: Map<string, Notification[]> = new Map(); // userId -> notifications
  private preferences: Map<string, NotificationPreferences> = new Map();
  private pushTokens: Map<string, string[]> = new Map(); // userId -> tokens
  private emailAddresses: Map<string, string> = new Map(); // userId -> email

  constructor() {
    logger.info('NotificationsService initialized', {
      context: 'notifications'
    });
  }

  /**
   * Get or create user preferences
   */
  getPreferences(userId: string): NotificationPreferences {
    if (!this.preferences.has(userId)) {
      this.preferences.set(userId, this.createDefaultPreferences(userId));
    }
    return this.preferences.get(userId)!;
  }

  /**
   * Update user preferences
   */
  updatePreferences(userId: string, updates: Partial<NotificationPreferences>): NotificationPreferences {
    const prefs = this.getPreferences(userId);
    const updated = { ...prefs, ...updates };
    this.preferences.set(userId, updated);

    logger.info('Notification preferences updated', {
      context: 'notifications',
      metadata: {
        userId,
        enabledChannels: updated.enabledChannels,
        frequency: updated.frequency
      }
    });

    return updated;
  }

  /**
   * Send notification
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: NotificationPriority = 'normal'
  ): Promise<Notification> {
    const prefs = this.getPreferences(userId);
    
    // Check if notification type is enabled
    if (!prefs.notificationTypes[type]) {
      logger.debug('Notification type disabled', {
        context: 'notifications',
        metadata: { userId, type }
      });
      return this.createNotification(userId, type, title, message, data, priority, false);
    }

    // Check quiet hours
    if (prefs.quietHours.enabled && this.isQuietHours(prefs.quietHours)) {
      logger.debug('Quiet hours active', {
        context: 'notifications',
        metadata: { userId }
      });
      
      if (priority !== 'urgent') {
        // Schedule for later
        return this.scheduleNotification(userId, type, title, message, data, priority);
      }
    }

    // Create notification
    const notification = this.createNotification(userId, type, title, message, data, priority, true);

    // Send through enabled channels
    const sendPromises: Promise<void>[] = [];

    if (prefs.enabledChannels.includes('push') && prefs.frequency !== 'silent') {
      sendPromises.push(this.sendPushNotification(userId, notification));
    }

    if (prefs.enabledChannels.includes('email') && prefs.frequency !== 'silent') {
      sendPromises.push(this.sendEmailNotification(userId, notification));
    }

    if (prefs.enabledChannels.includes('in_app')) {
      sendPromises.push(this.addInAppNotification(userId, notification));
    }

    await Promise.all(sendPromises);

    logger.info('Notification sent', {
      context: 'notifications',
      metadata: {
        userId,
        notificationId: notification.id,
        type,
        channels: notification.channels
      }
    });

    return notification;
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(
    userId: string,
    achievementName: string,
    achievementIcon: string
  ): Promise<Notification> {
    return this.sendNotification(
      userId,
      'achievement',
      '🏆 Achievement Unlocked!',
      `You unlocked "${achievementName}" ${achievementIcon}`,
      { achievementName, achievementIcon },
      'high'
    );
  }

  /**
   * Send challenge notification
   */
  async sendChallengeNotification(
    userId: string,
    challengeName: string,
    action: 'started' | 'completed' | 'rank_changed',
    rank?: number
  ): Promise<Notification> {
    const titles = {
      started: 'Challenge Started',
      completed: 'Challenge Completed',
      rank_changed: 'Rank Updated'
    };

    const messages = {
      started: `You joined "${challengeName}"`,
      completed: `You completed "${challengeName}"`,
      rank_changed: rank ? `You're now #${rank} in "${challengeName}"` : `Rank updated in "${challengeName}"`
    };

    return this.sendNotification(
      userId,
      'challenge',
      titles[action],
      messages[action],
      { challengeName, action, rank },
      'normal'
    );
  }

  /**
   * Send team notification
   */
  async sendTeamNotification(
    userId: string,
    teamName: string,
    action: 'joined' | 'left' | 'challenge_invitation'
  ): Promise<Notification> {
    const messages = {
      joined: `You joined team "${teamName}"`,
      left: `You left team "${teamName}"`,
      challenge_invitation: `You've been invited to a team challenge in "${teamName}"`
    };

    return this.sendNotification(
      userId,
      'team',
      'Team Update',
      messages[action],
      { teamName, action },
      'normal'
    );
  }

  /**
   * Send reminder notification
   */
  async sendReminderNotification(
    userId: string,
    reminderType: 'workout' | 'streak' | 'challenge',
    message: string
  ): Promise<Notification> {
    return this.sendNotification(
      userId,
      'reminder',
      '⏰ Reminder',
      message,
      { reminderType },
      'low'
    );
  }

  /**
   * Get user's notifications
   */
  getNotifications(userId: string, limit: number = 20, unreadOnly: boolean = false): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    const sorted = userNotifications.sort((a, b) => b.createdAt - a.createdAt);
    
    if (unreadOnly) {
      return sorted.filter(n => !n.readAt).slice(0, limit);
    }
    
    return sorted.slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (!notification) {
      return false;
    }

    notification.readAt = Date.now();

    logger.debug('Notification marked as read', {
      context: 'notifications',
      metadata: { userId, notificationId }
    });

    return true;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    const unreadCount = userNotifications.filter(n => !n.readAt).length;
    
    userNotifications.forEach(n => {
      if (!n.readAt) {
        n.readAt = Date.now();
      }
    });

    logger.debug('All notifications marked as read', {
      context: 'notifications',
      metadata: { userId, unreadCount }
    });

    return unreadCount;
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.readAt).length;
  }

  /**
   * Register push token
   */
  registerPushToken(userId: string, token: string): void {
    if (!this.pushTokens.has(userId)) {
      this.pushTokens.set(userId, []);
    }
    
    const tokens = this.pushTokens.get(userId)!;
    if (!tokens.includes(token)) {
      tokens.push(token);
    }

    logger.debug('Push token registered', {
      context: 'notifications',
      metadata: { userId, tokenCount: tokens.length }
    });
  }

  /**
   * Set user email
   */
  setUserEmail(userId: string, email: string): void {
    this.emailAddresses.set(userId, email);
    
    logger.debug('Email address set', {
      context: 'notifications',
      metadata: { userId }
    });
  }

  /**
   * Delete notification
   */
  deleteNotification(userId: string, notificationId: string): boolean {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex(n => n.id === notificationId);
    
    if (index === -1) {
      return false;
    }

    userNotifications.splice(index, 1);

    return true;
  }

  /**
   * Clear all notifications
   */
  clearNotifications(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    const count = userNotifications.length;
    
    this.notifications.set(userId, []);

    logger.debug('All notifications cleared', {
      context: 'notifications',
      metadata: { userId, count }
    });

    return count;
  }

  // Private methods

  private createDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      enabledChannels: ['push', 'in_app'],
      notificationTypes: {
        achievement: true,
        challenge: true,
        team: true,
        system: true,
        reminder: false
      },
      frequency: 'instant',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      digestTime: '09:00'
    };
  }

  private createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> | undefined,
    priority: NotificationPriority,
    send: boolean
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      priority,
      title,
      message,
      data,
      channels: send ? ['in_app'] : [],
      createdAt: Date.now()
    };

    // Store notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId)!.push(notification);

    return notification;
  }

  private scheduleNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> | undefined,
    priority: NotificationPriority
  ): Notification {
    // For now, just create without sending
    // In production, would add to a scheduled queue
    return this.createNotification(userId, type, title, message, data, priority, false);
  }

  private async sendPushNotification(userId: string, notification: Notification): Promise<void> {
    const tokens = this.pushTokens.get(userId) || [];
    
    if (tokens.length === 0) {
      logger.debug('No push tokens for user', {
        context: 'notifications',
        metadata: { userId }
      });
      return;
    }

    const payload: PushNotificationPayload = {
      title: notification.title,
      body: notification.message,
      icon: '/icons/notification-icon.png',
      data: {
        notificationId: notification.id,
        type: notification.type,
        ...notification.data
      },
      clickAction: `/notifications/${notification.id}`
    };

    // In production, would send to push service (FCM, APNS, etc.)
    logger.info('Push notification sent', {
      context: 'notifications',
      metadata: {
        userId,
        notificationId: notification.id,
        tokenCount: tokens.length
      }
    });
  }

  private async sendEmailNotification(userId: string, notification: Notification): Promise<void> {
    const email = this.emailAddresses.get(userId);
    
    if (!email) {
      logger.debug('No email for user', {
        context: 'notifications',
        metadata: { userId }
      });
      return;
    }

    const payload: EmailNotificationPayload = {
      to: email,
      subject: notification.title,
      html: this.generateEmailHtml(notification),
      text: notification.message,
      template: 'notification',
      variables: {
        title: notification.title,
        message: notification.message,
        type: notification.type
      }
    };

    // In production, would send via email service (SendGrid, SES, etc.)
    logger.info('Email notification sent', {
      context: 'notifications',
      metadata: {
        userId,
        notificationId: notification.id,
        email
      }
    });
  }

  private async addInAppNotification(userId: string, notification: Notification): Promise<void> {
    // Already stored in notifications map
    logger.debug('In-app notification added', {
      context: 'notifications',
      metadata: {
        userId,
        notificationId: notification.id
      }
    });
  }

  private generateEmailHtml(notification: Notification): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notification.title}</h1>
            </div>
            <div class="content">
              <p>${notification.message}</p>
              <a href="https://spartanhub.io/notifications/${notification.id}" class="button">View Notification</a>
            </div>
            <div class="footer">
              <p>Spartan Hub - Fitness Coaching Platform</p>
              <p>You're receiving this because you enabled email notifications.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private isQuietHours(quietHours: { enabled: boolean; start: string; end: string }): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }
}

export default NotificationsService;

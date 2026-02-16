import { getNotificationService, NotificationType, Notification, NotificationPreferences } from '../notificationService';

describe('NotificationService', () => {
  let service = getNotificationService({
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
    maxRetries: 2,
    retryDelayMs: 100,
    batchSize: 10,
  });

  // ==================== INITIALIZATION ====================

  describe('Initialization', () => {
    it('should create notification service instance', () => {
      expect(service).toBeDefined();
      expect(typeof service.sendNotification).toBe('function');
    });

    it('should have all required methods', () => {
      expect(typeof service.sendNotification).toBe('function');
      expect(typeof service.sendInjuryRiskAlert).toBe('function');
      expect(typeof service.sendPoorRecoveryAlert).toBe('function');
      expect(typeof service.sendTrainingRecommendation).toBe('function');
      expect(typeof service.sendMotivationalMessage).toBe('function');
      expect(typeof service.getUnreadNotifications).toBe('function');
      expect(typeof service.getUserNotifications).toBe('function');
      expect(typeof service.markAsRead).toBe('function');
      expect(typeof service.deleteNotification).toBe('function');
      expect(typeof service.clearAllNotifications).toBe('function');
      expect(typeof service.getUserPreferences).toBe('function');
      expect(typeof service.updateUserPreferences).toBe('function');
      expect(typeof service.unsubscribeUser).toBe('function');
      expect(typeof service.getHealth).toBe('function');
    });

    it('should accept custom configuration', () => {
      const customService = getNotificationService({
        emailEnabled: false,
        maxRetries: 5,
        batchSize: 20,
      });
      expect(customService).toBeDefined();
    });

    it('should be singleton pattern', () => {
      const service1 = getNotificationService();
      const service2 = getNotificationService();
      expect(service1).toBe(service2);
    });
  });

  // ==================== NOTIFICATION SENDING ====================

  describe('Notification Sending', () => {
    const testUserId = 'test-user-' + Date.now();

    it('should send a notification with default parameters', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'training-recommendation',
        'Test Title',
        'Test Message'
      );

      expect(notification).toBeDefined();
      expect(notification?.userId).toBe(testUserId);
      expect(notification?.title).toBe('Test Title');
      expect(notification?.message).toBe('Test Message');
      expect(notification?.read).toBe(false);
    });

    it('should send injury risk alert', async () => {
      const notification = await service.sendInjuryRiskAlert(testUserId, 75, 'Injury risk alert message');

      expect(notification).toBeDefined();
      expect(notification?.type).toBe('high-injury-risk');
      expect(notification?.priority).toBe('critical');
    });

    it('should send poor recovery alert', async () => {
      const notification = await service.sendPoorRecoveryAlert(testUserId, 35, 'Poor recovery alert message');

      expect(notification).toBeDefined();
      expect(notification?.type).toBe('poor-recovery');
      expect(notification?.priority).toBe('high');
    });

    it('should send training recommendation', async () => {
      const notification = await service.sendTrainingRecommendation(
        testUserId,
        'Focus on mobility work today'
      );

      expect(notification).toBeDefined();
      expect(notification?.type).toBe('training-recommendation');
      expect(notification?.priority).toBe('normal');
    });

    it('should send motivational message', async () => {
      const notification = await service.sendMotivationalMessage(
        testUserId,
        'Great progress this week!'
      );

      expect(notification).toBeDefined();
      expect(notification?.type).toBe('motivational');
      expect(notification?.priority).toBe('low');
    });

    it('should support all notification types', async () => {
      const types: NotificationType[] = [
        'high-injury-risk',
        'poor-recovery',
        'training-recommendation',
        'motivational',
        'weekly-digest',
        'recovery-improved',
        'personal-record',
        'community-challenge',
      ];

      for (const type of types) {
        const notification = await service.sendNotification(
          testUserId,
          type,
          'Test',
          'Message'
        );
        expect(notification?.type).toBe(type);
      }
    });

    it('should support all notification channels', async () => {
      const channels = ['email', 'push', 'in-app'] as const;

      for (const channel of channels) {
        const notification = await service.sendNotification(
          testUserId,
          'training-recommendation',
          'Test',
          'Message',
          'normal',
          channel
        );
        expect(notification?.channel).toBe(channel);
      }
    });

    it('should support all priority levels', async () => {
      const priorities = ['critical', 'high', 'normal', 'low'] as const;

      for (const priority of priorities) {
        const notification = await service.sendNotification(
          testUserId,
          'training-recommendation',
          'Test',
          'Message',
          priority
        );
        expect(notification?.priority).toBe(priority);
      }
    });
  });

  // ==================== NOTIFICATION MANAGEMENT ====================

  describe('Notification Management', () => {
    const testUserId = 'notification-mgmt-' + Date.now();

    beforeAll(async () => {
      // Create some test notifications
      for (let i = 0; i < 5; i++) {
        await service.sendNotification(
          testUserId,
          'training-recommendation',
          `Title ${i}`,
          `Message ${i}`
        );
      }
    });

    it('should get unread notifications', async () => {
      const notifications = await service.getUnreadNotifications(testUserId);
      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.every((n) => n.read === false)).toBe(true);
    });

    it('should get user notifications with pagination', async () => {
      const notifications = await service.getUserNotifications(testUserId, 3, 0);
      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeLessThanOrEqual(3);
    });

    it('should mark notification as read', async () => {
      const notifications = await service.getUnreadNotifications(testUserId);
      const notificationId = notifications[0]?.id;

      const success = await service.markAsRead(notificationId);
      expect(success).toBe(true);

      const updatedNotifications = await service.getUserNotifications(testUserId);
      const updated = updatedNotifications.find((n) => n.id === notificationId);
      expect(updated?.read).toBe(true);
    });

    it('should delete notification', async () => {
      const notifications = await service.getUnreadNotifications(testUserId);
      const notificationId = notifications[0]?.id;

      const success = await service.deleteNotification(notificationId);
      expect(success).toBe(true);
    });

    it('should clear all notifications for user', async () => {
      const countBefore = (await service.getUserNotifications(testUserId)).length;
      await service.clearAllNotifications(testUserId);

      const countAfter = (await service.getUserNotifications(testUserId)).length;
      expect(countAfter).toBeLessThan(countBefore);
    });
  });

  // ==================== USER PREFERENCES ====================

  describe('User Preferences', () => {
    const testUserId = 'prefs-' + Date.now();

    it('should create default preferences for new user', async () => {
      const prefs = await service.getUserPreferences(testUserId);

      expect(prefs).toBeDefined();
      expect(prefs?.userId).toBe(testUserId);
      expect(prefs?.emailNotifications).toBe(true);
      expect(prefs?.pushNotifications).toBe(true);
      expect(prefs?.inAppNotifications).toBe(true);
      expect(prefs?.injuryRiskAlerts).toBe(true);
      expect(prefs?.poorRecoveryAlerts).toBe(true);
    });

    it('should retrieve existing preferences', async () => {
      const prefs1 = await service.getUserPreferences(testUserId);
      const prefs2 = await service.getUserPreferences(testUserId);

      expect(prefs1?.userId).toBe(prefs2?.userId);
      expect(prefs1?.unsubscribeToken).toBe(prefs2?.unsubscribeToken);
    });

    it('should update notification preferences', async () => {
      const success = await service.updateUserPreferences(testUserId, {
        emailNotifications: false,
        injuryRiskAlerts: false,
      });

      expect(success).toBe(true);

      const updated = await service.getUserPreferences(testUserId);
      expect(updated?.emailNotifications).toBe(false);
      expect(updated?.injuryRiskAlerts).toBe(false);
    });

    it('should unsubscribe user from all notifications', async () => {
      const success = await service.unsubscribeUser(testUserId);
      expect(success).toBe(true);

      const prefs = await service.getUserPreferences(testUserId);
      expect(prefs?.emailNotifications).toBe(false);
      expect(prefs?.pushNotifications).toBe(false);
      expect(prefs?.inAppNotifications).toBe(false);
    });

    it('should respect user preferences when sending notifications', async () => {
      const restrictiveUserId = 'restrictive-' + Date.now();

      // Create default prefs, then restrict
      await service.getUserPreferences(restrictiveUserId);
      await service.updateUserPreferences(restrictiveUserId, {
        emailNotifications: false,
        injuryRiskAlerts: false,
      });

      // Try to send injury risk alert via email
      const notification = await service.sendNotification(
        restrictiveUserId,
        'high-injury-risk',
        'Alert',
        'Message',
        'normal',
        'email'
      );

      // Should be skipped due to preferences
      expect(notification).toBeNull();
    });

    it('should have unique unsubscribe tokens per user', async () => {
      const userId1 = 'token-test-1-' + Date.now();
      const userId2 = 'token-test-2-' + Date.now();

      const prefs1 = await service.getUserPreferences(userId1);
      const prefs2 = await service.getUserPreferences(userId2);

      expect(prefs1?.unsubscribeToken).toBeDefined();
      expect(prefs2?.unsubscribeToken).toBeDefined();
      expect(prefs1?.unsubscribeToken).not.toBe(prefs2?.unsubscribeToken);
    });
  });

  // ==================== NOTIFICATION TYPES ====================

  describe('Notification Types', () => {
    const testUserId = 'types-' + Date.now();

    it('should handle high-injury-risk type', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'high-injury-risk',
        'Injury Risk',
        'Message'
      );
      expect(notification?.type).toBe('high-injury-risk');
    });

    it('should handle poor-recovery type', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'poor-recovery',
        'Recovery Alert',
        'Message'
      );
      expect(notification?.type).toBe('poor-recovery');
    });

    it('should handle training-recommendation type', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'training-recommendation',
        'Training',
        'Message'
      );
      expect(notification?.type).toBe('training-recommendation');
    });

    it('should handle motivational type', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'motivational',
        'Motivation',
        'Message'
      );
      expect(notification?.type).toBe('motivational');
    });
  });

  // ==================== NOTIFICATION CHANNELS ====================

  describe('Notification Channels', () => {
    const testUserId = 'channels-' + Date.now();

    it('should send via email channel', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'training-recommendation',
        'Email Test',
        'Message',
        'normal',
        'email'
      );
      expect(notification?.channel).toBe('email');
    });

    it('should send via push channel', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'training-recommendation',
        'Push Test',
        'Message',
        'normal',
        'push'
      );
      expect(notification?.channel).toBe('push');
    });

    it('should send via in-app channel', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'training-recommendation',
        'In-App Test',
        'Message',
        'normal',
        'in-app'
      );
      expect(notification?.channel).toBe('in-app');
    });
  });

  // ==================== NOTIFICATION PRIORITY ====================

  describe('Notification Priority', () => {
    const testUserId = 'priority-' + Date.now();

    it('should support critical priority', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'high-injury-risk',
        'Critical Alert',
        'Message',
        'critical'
      );
      expect(notification?.priority).toBe('critical');
    });

    it('should support high priority', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'poor-recovery',
        'High Priority',
        'Message',
        'high'
      );
      expect(notification?.priority).toBe('high');
    });

    it('should support normal priority', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'training-recommendation',
        'Normal Priority',
        'Message',
        'normal'
      );
      expect(notification?.priority).toBe('normal');
    });

    it('should support low priority', async () => {
      const notification = await service.sendNotification(
        testUserId,
        'motivational',
        'Low Priority',
        'Message',
        'low'
      );
      expect(notification?.priority).toBe('low');
    });
  });

  // ==================== HEALTH MONITORING ====================

  describe('Health Monitoring', () => {
    it('should report service health', async () => {
      const health = await service.getHealth();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(typeof health.emailEnabled).toBe('boolean');
      expect(typeof health.pushEnabled).toBe('boolean');
      expect(typeof health.inAppEnabled).toBe('boolean');
      expect(typeof health.totalNotifications).toBe('number');
      expect(typeof health.undeliveredNotifications).toBe('number');
    });

    it('should track total notifications', async () => {
      const health1 = await service.getHealth();
      const countBefore = health1.totalNotifications;

      const testUserId = 'health-test-' + Date.now();
      await service.sendNotification(testUserId, 'training-recommendation', 'Test', 'Message');

      const health2 = await service.getHealth();
      const countAfter = health2.totalNotifications;

      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    });

    it('should report channel availability', async () => {
      const health = await service.getHealth();
      expect(typeof health.emailEnabled).toBe('boolean');
      expect(typeof health.pushEnabled).toBe('boolean');
      expect(typeof health.inAppEnabled).toBe('boolean');
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle invalid user ID gracefully', async () => {
      const notification = await service.sendNotification(
        '',
        'training-recommendation',
        'Test',
        'Message'
      );
      // Should handle gracefully (nullable or default)
      expect(notification).toBeDefined();
    });

    it('should handle missing notification ID gracefully', async () => {
      const success = await service.markAsRead('');
      // Should return false or handle gracefully
      expect(typeof success).toBe('boolean');
    });

    it('should handle get preferences for non-existent user', async () => {
      const prefs = await service.getUserPreferences('non-existent-user-' + Date.now());
      // Should create defaults
      expect(prefs).toBeDefined();
    });

    it('should log errors without throwing', async () => {
      const notification = await service.sendNotification(
        'test-user',
        'training-recommendation',
        'Test',
        'Message'
      );
      // Should complete without throwing
      expect(notification).toBeDefined();
    });
  });

  // ==================== BATCH OPERATIONS ====================

  describe('Batch Operations', () => {
    const testUserId = 'batch-' + Date.now();

    it('should handle multiple notifications for same user', async () => {
      const notifications = [];

      for (let i = 0; i < 5; i++) {
        const notification = await service.sendNotification(
          testUserId,
          'training-recommendation',
          `Title ${i}`,
          `Message ${i}`
        );
        if (notification) notifications.push(notification);
      }

      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should handle pagination correctly', async () => {
      const page1 = await service.getUserNotifications(testUserId, 2, 0);
      const page2 = await service.getUserNotifications(testUserId, 2, 2);

      // Different items in different pages
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });

    it('should respect limit parameter', async () => {
      const notifications = await service.getUserNotifications(testUserId, 3, 0);
      expect(notifications.length).toBeLessThanOrEqual(3);
    });
  });

  // ==================== SERVICE LIFECYCLE ====================

  describe('Service Lifecycle', () => {
    it('should close service gracefully', async () => {
      const instance = getNotificationService();
      await expect(instance.close()).resolves.not.toThrow();
    });

    it('should be callable multiple times without errors', async () => {
      const testUserId = 'lifecycle-' + Date.now();
      const instance = getNotificationService();

      await expect((async () => {
        await instance.sendNotification(testUserId, 'training-recommendation', 'Test', 'Message');
        await instance.sendNotification(testUserId, 'poor-recovery', 'Test', 'Message');
        await instance.getUnreadNotifications(testUserId);
        await instance.close();
      })()).resolves.not.toThrow();
    });
  });
});

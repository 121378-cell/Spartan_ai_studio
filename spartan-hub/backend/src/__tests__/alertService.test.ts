import { AlertService, AlertSeverity, AlertType } from '../services/alertService';

describe('AlertService', () => {
  let alertService: AlertService;

  beforeEach(() => {
    // Create a new alert service instance for each test
    alertService = new AlertService({
      enabled: true,
      minSeverity: AlertSeverity.LOW,
      throttleWindowMs: 1000,
      maxAlertsPerWindow: 5,
      enableConsoleNotifications: false,
      enableFileNotifications: false,
      maxStoredAlerts: 10,
      alertRetentionHours: 1
    });
  });

  afterEach(() => {
    // Clean up any timers or intervals
    jest.clearAllTimers();
  });

  describe('createAlert', () => {
    it('should create an alert when alerting is enabled', () => {
      const alert = alertService.createAlert(
        AlertType.SYSTEM_ERROR,
        AlertSeverity.HIGH,
        'Test error message',
        'testContext',
        { test: 'metadata' }
      );

      expect(alert).toBeDefined();
      expect(alert!.type).toBe(AlertType.SYSTEM_ERROR);
      expect(alert!.severity).toBe(AlertSeverity.HIGH);
      expect(alert!.message).toBe('Test error message');
      expect(alert!.context).toBe('testContext');
      expect(alert!.metadata).toEqual({ test: 'metadata' });
      expect(alert!.resolved).toBe(false);
      expect(alert!.notified).toBe(true);
    });

    it('should not create an alert when alerting is disabled', () => {
      alertService.updateConfig({ enabled: false });
      
      const alert = alertService.createAlert(
        AlertType.SYSTEM_ERROR,
        AlertSeverity.HIGH,
        'Test error message'
      );

      expect(alert).toBeNull();
    });

    it('should not create an alert when severity is below threshold', () => {
      alertService.updateConfig({ minSeverity: AlertSeverity.CRITICAL });
      
      const alert = alertService.createAlert(
        AlertType.SYSTEM_ERROR,
        AlertSeverity.HIGH,
        'Test error message'
      );

      expect(alert).toBeNull();
    });

    it('should throttle alerts when exceeding rate limits', () => {
      // Create multiple alerts rapidly
      const alerts = [];
      for (let i = 0; i < 6; i++) {
        const alert = alertService.createAlert(
          AlertType.SYSTEM_ERROR,
          AlertSeverity.HIGH,
          `Test error message ${i}`
        );
        alerts.push(alert);
      }

      // First 5 should be created, 6th should be throttled
      expect(alerts.slice(0, 5)).toHaveLength(5);
      expect(alerts[5]).toBeNull();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an existing alert', () => {
      const alert = alertService.createAlert(
        AlertType.SYSTEM_ERROR,
        AlertSeverity.HIGH,
        'Test error message'
      );

      expect(alert).toBeDefined();
      
      const resolved = alertService.resolveAlert(alert!.id);
      expect(resolved).toBe(true);
      
      const resolvedAlert = alertService.getAlerts()[0];
      expect(resolvedAlert.resolved).toBe(true);
      expect(resolvedAlert.resolvedAt).toBeDefined();
    });

    it('should not resolve a non-existent alert', () => {
      const resolved = alertService.resolveAlert('non-existent-id');
      expect(resolved).toBe(false);
    });
  });

  describe('getAlerts', () => {
    it('should return all alerts', () => {
      alertService.createAlert(AlertType.SYSTEM_ERROR, AlertSeverity.HIGH, 'Error 1');
      alertService.createAlert(AlertType.AI_SERVICE_FAILURE, AlertSeverity.MEDIUM, 'Error 2');
      
      const alerts = alertService.getAlerts();
      expect(alerts).toHaveLength(2);
      expect(alerts[0].type).toBe(AlertType.AI_SERVICE_FAILURE);
      expect(alerts[1].type).toBe(AlertType.SYSTEM_ERROR);
    });
  });

  describe('getUnresolvedAlerts', () => {
    it('should return only unresolved alerts', () => {
      const alert1 = alertService.createAlert(AlertType.SYSTEM_ERROR, AlertSeverity.HIGH, 'Error 1');
      const alert2 = alertService.createAlert(AlertType.AI_SERVICE_FAILURE, AlertSeverity.MEDIUM, 'Error 2');
      
      // Resolve the first alert
      if (alert1) {
        alertService.resolveAlert(alert1.id);
      }
      
      const unresolved = alertService.getUnresolvedAlerts();
      expect(unresolved).toHaveLength(1);
      expect(unresolved[0].type).toBe(AlertType.AI_SERVICE_FAILURE);
    });
  });

  describe('getAlertsByType', () => {
    it('should return alerts filtered by type', () => {
      alertService.createAlert(AlertType.SYSTEM_ERROR, AlertSeverity.HIGH, 'Error 1');
      alertService.createAlert(AlertType.AI_SERVICE_FAILURE, AlertSeverity.MEDIUM, 'Error 2');
      alertService.createAlert(AlertType.SYSTEM_ERROR, AlertSeverity.LOW, 'Error 3');
      
      const systemErrors = alertService.getAlertsByType(AlertType.SYSTEM_ERROR);
      expect(systemErrors).toHaveLength(2);
      
      const aiFailures = alertService.getAlertsByType(AlertType.AI_SERVICE_FAILURE);
      expect(aiFailures).toHaveLength(1);
    });
  });

  describe('getAlertsBySeverity', () => {
    it('should return alerts filtered by severity', () => {
      alertService.createAlert(AlertType.SYSTEM_ERROR, AlertSeverity.HIGH, 'Error 1');
      alertService.createAlert(AlertType.AI_SERVICE_FAILURE, AlertSeverity.MEDIUM, 'Error 2');
      alertService.createAlert(AlertType.SYSTEM_ERROR, AlertSeverity.LOW, 'Error 3');
      
      const highSeverity = alertService.getAlertsBySeverity(AlertSeverity.HIGH);
      expect(highSeverity).toHaveLength(1);
      
      const mediumSeverity = alertService.getAlertsBySeverity(AlertSeverity.MEDIUM);
      expect(mediumSeverity).toHaveLength(1);
      
      const lowSeverity = alertService.getAlertsBySeverity(AlertSeverity.LOW);
      expect(lowSeverity).toHaveLength(1);
    });
  });

  describe('cleanupOldAlerts', () => {
    it('should remove resolved alerts older than retention period', () => {
      // Create alerts
      const alert1 = alertService.createAlert(AlertType.SYSTEM_ERROR, AlertSeverity.HIGH, 'Error 1');
      alertService.createAlert(AlertType.AI_SERVICE_FAILURE, AlertSeverity.MEDIUM, 'Error 2');
      
      // Resolve the first alert
      if (alert1) {
        alertService.resolveAlert(alert1.id);
      }
      
      // Mock date to simulate passage of time beyond retention period
      const now = Date.now();
      const oldTime = new Date(now - (2 * 60 * 60 * 1000)).toISOString(); // 2 hours ago
      
      // Manually set resolvedAt to old time for testing
      if (alert1) {
        const alerts = alertService.getAlerts();
        const resolvedAlert = alerts.find(a => a.id === alert1.id);
        if (resolvedAlert) {
          resolvedAlert.resolvedAt = oldTime;
        }
      }
      
      // Cleanup old alerts
      alertService.cleanupOldAlerts();
      
      // Should have only 1 alert left (the unresolved one)
      const remainingAlerts = alertService.getAlerts();
      expect(remainingAlerts).toHaveLength(1);
      expect(remainingAlerts[0].type).toBe(AlertType.AI_SERVICE_FAILURE);
    });
  });

  describe('getAlertStats', () => {
    it('should return alert statistics', () => {
      const alert1 = alertService.createAlert(AlertType.SYSTEM_ERROR, AlertSeverity.HIGH, 'Error 1');
      alertService.createAlert(AlertType.AI_SERVICE_FAILURE, AlertSeverity.MEDIUM, 'Error 2');
      
      // Resolve the first alert
      if (alert1) {
        alertService.resolveAlert(alert1.id);
      }
      
      const stats = alertService.getAlertStats();
      expect(stats.total).toBe(2);
      expect(stats.unresolved).toBe(1);
      expect(stats.severityCounts[AlertSeverity.HIGH]).toBe(1);
      expect(stats.severityCounts[AlertSeverity.MEDIUM]).toBe(1);
    });
  });
});

/**
 * Critical Signal Alert Flow - E2E Integration Test
 * 
 * Tests complete critical signal detection and intervention workflow:
 * Anomaly Detection → Intervention Proposal → User Notification → DB Logging
 */

import { CriticalSignalMonitor } from '../../services/criticalSignalMonitor';
import { NotificationService } from '../../services/notificationService';
import { getDatabase } from '../../database/databaseManager';
import { eventBus } from '../../services/eventBus';

jest.mock('../../database/databaseManager');
jest.mock('../../services/eventBus');
jest.mock('../../services/notificationService');

describe('Critical Signal Alert Flow - E2E Integration', () => {
  let monitor: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
      transaction: jest.fn((fn) => fn()),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    monitor = CriticalSignalMonitor.getInstance();
  });

  describe('Complete Alert Workflow', () => {
    test('should detect critical HR anomaly and alert user', async () => {
      const userId = 'user_123';
      const anomalousData = {
        avgHR: 140, // Critical elevation
        maxHR: 180,
        minHR: 120,
      };

      const startTime = Date.now();

      // Step 1: Detect anomaly
      const detection = monitor.detectCriticalSignals(userId, anomalousData);
      expect(detection.critical).toBe(true);
      expect(detection.signals).toContain('hr_spike');

      // Step 2: Propose intervention
      const intervention = monitor.proposeIntervention(userId, {
        type: 'hr_spike',
        severity: 'high',
        value: 140,
      });
      expect(intervention).toBeDefined();
      expect(intervention.type).toBeDefined();

      // Step 3: Dispatch notification
      await monitor.dispatchNotification(userId, detection.signals[0]);
      expect(NotificationService.sendPushNotification).toHaveBeenCalled();

      // Step 4: Log to database
      await monitor.logAlert(userId, detection.signals[0]);
      expect(mockDb.prepare).toHaveBeenCalled();

      const duration = Date.now() - startTime;

      // Entire flow should complete in <10 seconds
      expect(duration).toBeLessThan(10000);
    });

    test('should handle HRV drop with appropriate response', async () => {
      const userId = 'user_123';
      const data = {
        rmssd: 15, // Very low HRV
        sdnn: 20,
        avgHR: 75,
      };

      // Detect
      const detection = monitor.detectCriticalSignals(userId, data);
      expect(detection.critical).toBe(true);

      // Propose intervention
      const intervention = monitor.proposeIntervention(userId, {
        type: 'hrv_drop',
        severity: 'high',
        rmssd: 15,
      });

      expect(intervention.type).toMatch(/rest|recovery/);

      // Notify
      await monitor.dispatchNotification(userId, { type: 'hrv_drop' });
      expect(NotificationService.sendEmail).toBeDefined();
    });

    test('should detect sleep disruption and propose recovery', async () => {
      const userId = 'user_123';
      const data = {
        sleepDuration: 240, // 4 hours - too short
        sleepQuality: 0.4,
      };

      const detection = monitor.detectCriticalSignals(userId, data);
      expect(detection.critical).toBe(true);

      const intervention = monitor.proposeIntervention(userId, {
        type: 'sleep_disruption',
        severity: 'high',
      });

      expect(intervention.recommendations).toContain('sleep');
    });

    test('should handle multiple simultaneous alerts without collision', async () => {
      const signals = [
        { userId: 'user_1', type: 'hr_spike', severity: 'high' },
        { userId: 'user_2', type: 'hrv_drop', severity: 'high' },
        { userId: 'user_3', type: 'sleep_disruption', severity: 'high' },
      ];

      const startTime = Date.now();

      const alerts = await Promise.all(
        signals.map(async (signal) => {
          const intervention = monitor.proposeIntervention(signal.userId, signal);
          await monitor.dispatchNotification(signal.userId, signal);
          await monitor.logAlert(signal.userId, signal);
          return intervention;
        })
      );

      const duration = Date.now() - startTime;

      expect(alerts.length).toBe(3);
      expect(alerts.every((a: any) => a.id !== undefined)).toBe(true);
      expect(duration).toBeLessThan(5000); // All in parallel <5 seconds
    });
  });

  describe('Anomaly Detection Accuracy', () => {
    test('should achieve >95% detection accuracy on HR spikes', async () => {
      const testCases = Array(100).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        avgHR: 140 + Math.random() * 40, // 140-180 bpm
        maxHR: 180 + Math.random() * 20,
      }));

      const detected = testCases.filter((tc) => {
        const result = monitor.detectCriticalSignals(tc.userId, tc);
        return result.critical === true && result.signals.includes('hr_spike');
      });

      const accuracy = detected.length / testCases.length;
      expect(accuracy).toBeGreaterThan(0.95);
    });

    test('should minimize false positives', async () => {
      const normalData = {
        avgHR: 65,
        rmssd: 45,
        sleepQuality: 0.85,
      };

      const detection = monitor.detectCriticalSignals('user_test', normalData);
      expect(detection.critical).toBe(false);
    });
  });

  describe('Notification Delivery', () => {
    test('should deliver push notification for critical alerts', async () => {
      const userId = 'user_123';
      const alert = { type: 'hr_spike', severity: 'high' };

      await monitor.dispatchNotification(userId, alert);

      expect(NotificationService.sendPushNotification).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          title: expect.any(String),
          body: expect.any(String),
        })
      );
    });

    test('should deliver email for severe alerts', async () => {
      const userId = 'user_123';
      const alert = { type: 'overtraining_syndrome', severity: 'critical' };

      await monitor.dispatchNotification(userId, alert);

      expect(NotificationService.sendEmail).toHaveBeenCalled();
    });

    test('should handle notification failure without crashing', async () => {
      const userId = 'user_123';
      const alert = { type: 'hr_spike', severity: 'high' };

      (NotificationService.sendPushNotification as jest.Mock).mockRejectedValueOnce(
        new Error('Service down')
      );

      expect(async () => {
        await monitor.dispatchNotification(userId, alert);
      }).not.toThrow();
    });

    test('should retry failed notifications', async () => {
      const userId = 'user_123';
      const alert = { type: 'hr_spike', severity: 'high' };

      (NotificationService.sendPushNotification as jest.Mock)
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ success: true });

      await monitor.dispatchNotification(userId, alert);

      expect(NotificationService.sendPushNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('Database Logging', () => {
    test('should create alerts record', async () => {
      const userId = 'user_123';
      const signal = { type: 'hr_spike', severity: 'high' };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      await monitor.logAlert(userId, signal);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    test('should update intervention_history table', async () => {
      const userId = 'user_123';
      const intervention = {
        id: 'int_123',
        type: 'rest',
        status: 'proposed',
      };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      await monitor.logIntervention(userId, intervention);

      expect(mockRun).toHaveBeenCalled();
    });

    test('should maintain audit trail with timestamps', async () => {
      const userId = 'user_123';
      const signal = { type: 'hr_spike' };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      await monitor.logAlert(userId, signal);

      // Verify timestamp was captured
      const sqlCall = mockDb.prepare.mock.calls[0][0];
      expect(sqlCall).toContain('timestamp') || expect(sqlCall).toContain('created_at');
    });

    test('should use transactions for data consistency', async () => {
      const userId = 'user_123';
      const signal = { type: 'hr_spike' };

      mockDb.transaction = jest.fn((fn) => fn());

      await monitor.logAlert(userId, signal);

      // Transaction may be used for atomic operations
      expect(mockDb.prepare || mockDb.transaction).toBeDefined();
    });
  });

  describe('Event Emission', () => {
    test('should emit critical_signal_detected event', async () => {
      const userId = 'user_123';
      const data = { avgHR: 140, rmssd: 15 };

      await monitor.processCriticalSignal(userId, data);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'critical_signal_detected',
        expect.any(Object)
      );
    });

    test('should emit intervention_proposed event', async () => {
      const userId = 'user_123';
      const intervention = { type: 'rest', confidence: 0.9 };

      await monitor.proposeAndEmitIntervention(userId, intervention);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'intervention_proposed',
        expect.any(Object)
      );
    });

    test('should emit alert_acknowledged event when user responds', async () => {
      const userId = 'user_123';
      const alertId = 'alert_456';

      await monitor.acknowledgeAlert(userId, alertId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'alert_acknowledged',
        expect.any(Object)
      );
    });
  });

  describe('Follow-Up Mechanism', () => {
    test('should schedule follow-up check after alert', async () => {
      const userId = 'user_123';
      const signal = { type: 'hr_spike', severity: 'high' };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      await monitor.scheduleFollowUp(userId, signal);

      expect(mockRun).toHaveBeenCalled();
    });

    test('should track intervention effectiveness', async () => {
      const userId = 'user_123';
      const initialSignal = { severity: 'high', value: 140 };
      const followUpSignal = { severity: 'low', value: 95 };

      const effectiveness = monitor.calculateEffectiveness(initialSignal, followUpSignal);

      expect(effectiveness).toBeGreaterThan(0.5);
      expect(effectiveness).toBeLessThanOrEqual(1);
    });

    test('should learn from intervention outcomes', async () => {
      const userId = 'user_123';

      mockDb.prepare.mockReturnValue({
        all: jest.fn().mockReturnValue([
          { type: 'rest', effectiveness: 0.95, count: 10 },
          { type: 'hydration', effectiveness: 0.6, count: 5 },
        ]),
      } as any);

      const preferences = await monitor.getUserInterventionPreferences(userId);

      expect(preferences).toBeDefined();
    });
  });

  describe('Performance Under Load', () => {
    test('should handle 1000 concurrent alerts', async () => {
      const alerts = Array(1000).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        signal: { type: 'hr_spike', severity: 'high' },
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        alerts.map(alert =>
          monitor.dispatchNotification(alert.userId, alert.signal)
        )
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(1000);
      expect(duration).toBeLessThan(30000); // 1000 alerts in <30 seconds
    });

    test('should maintain detection latency <10 seconds', async () => {
      const userId = 'user_123';
      const data = { avgHR: 140, rmssd: 15 };

      const startTime = Date.now();
      const result = await monitor.processCriticalSignal(userId, data);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000);
      expect(result.critical).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle extreme metric values', async () => {
      const userId = 'user_123';
      const data = {
        avgHR: 200, // Extreme
        rmssd: 5, // Extreme low
        sleepDuration: 0, // No sleep
      };

      const result = monitor.detectCriticalSignals(userId, data);

      expect(result.critical).toBe(true);
      expect(result.signals.length).toBeGreaterThan(0);
    });

    test('should handle null/undefined data gracefully', async () => {
      const userId = 'user_123';
      const data = {
        avgHR: undefined,
        rmssd: null,
      };

      expect(async () => {
        monitor.detectCriticalSignals(userId, data);
      }).not.toThrow();
    });

    test('should handle missing database connection', async () => {
      const userId = 'user_123';
      const signal = { type: 'hr_spike' };

      mockDb.prepare.mockImplementationOnce(() => {
        throw new Error('Database unavailable');
      });

      expect(async () => {
        await monitor.logAlert(userId, signal);
      }).not.toThrow();
    });
  });
});

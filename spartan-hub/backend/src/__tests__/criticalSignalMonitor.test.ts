/**
 * Critical Signal Monitor Test Suite
 * 
 * Tests real-time detection of critical biometric signals,
 * intervention proposals, and user notifications.
 */

import { CriticalSignalMonitor } from '../../services/criticalSignalMonitor';
import { getDatabase } from '../../database/databaseManager';
import { eventBus } from '../../services/eventBus';
import { notificationService } from '../../services/notificationService';
import { anomalyDetector } from '../../services/anomalyDetector';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../database/databaseManager');
jest.mock('../../services/eventBus');
jest.mock('../../services/notificationService');
jest.mock('../../services/anomalyDetector');
jest.mock('../../utils/logger');

describe('CriticalSignalMonitor', () => {
  let monitor: any;
  let mockDb: any;
  let mockAnomalyDetector: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup database mock
    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue({}),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    // Setup anomaly detector mock
    mockAnomalyDetector = {
      detectAnomalies: jest.fn().mockReturnValue({
        isAnomalous: false,
        score: 0.2,
        signals: [],
      }),
    };

    (anomalyDetector as any).detectAnomalies = mockAnomalyDetector.detectAnomalies;

    monitor = CriticalSignalMonitor.getInstance();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Signal Detection - Normal Ranges', () => {
    test('should not flag normal heart rate', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 65,
        maxHR: 100,
        minHR: 55,
        rmssd: 45,
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: false,
        score: 0.15,
        signals: [],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(false);
      expect(result.warnings.length).toBe(0);
    });

    test('should not flag normal HRV', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 65,
        rmssd: 40,
        sdnn: 60,
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: false,
        score: 0.1,
        signals: [],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(false);
    });

    test('should not flag normal sleep quality', () => {
      const userId = 'user_123';
      const biometricData = {
        sleepDuration: 450, // 7.5 hours
        sleepQuality: 0.85,
        deepSleep: 120,
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: false,
        score: 0.05,
        signals: [],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(false);
    });
  });

  describe('Signal Detection - Critical Cases', () => {
    test('should detect HR spike (>120 bpm)', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 130, // Elevated
        maxHR: 160, // Very high spike
        minHR: 100,
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: true,
        score: 0.85,
        signals: ['hr_spike'],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(true);
      expect(result.signals).toContain('hr_spike');
    });

    test('should detect HRV drop (>30% decrease)', () => {
      const userId = 'user_123';
      const previousRmssd = 45;
      const biometricData = {
        rmssd: 20, // 55% decrease from previous
        sdnn: 22,
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: true,
        score: 0.9,
        signals: ['hrv_drop'],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(true);
      expect(result.signals).toContain('hrv_drop');
    });

    test('should detect sleep disruption (<5 hours)', () => {
      const userId = 'user_123';
      const biometricData = {
        sleepDuration: 240, // 4 hours - too low
        sleepQuality: 0.5,
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: true,
        score: 0.8,
        signals: ['sleep_disruption'],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(true);
      expect(result.signals).toContain('sleep_disruption');
    });

    test('should detect multiple simultaneous signals', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 140,
        rmssd: 18,
        sleepDuration: 200,
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: true,
        score: 0.95,
        signals: ['hr_spike', 'hrv_drop', 'sleep_disruption'],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(true);
      expect(result.signals.length).toBeGreaterThan(1);
    });

    test('should classify overtraining syndrome', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 85, // Elevated resting
        rmssd: 15, // Low HRV
        sleepDuration: 360, // Poor sleep
        trainingLoad: 95, // High load
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: true,
        score: 0.92,
        signals: ['overtraining_syndrome'],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(true);
      expect(result.detectedCondition).toContain('overtraining');
    });

    test('should classify recovery alert', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 75, // Slightly elevated
        rmssd: 30, // Moderate
        sleepDuration: 300, // Below optimal
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: true,
        score: 0.65,
        signals: ['recovery_alert'],
      });

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.severity).toMatch(/moderate|high/);
    });
  });

  describe('Intervention Proposal', () => {
    test('should propose intervention for HR spike', () => {
      const userId = 'user_123';
      const signal = {
        type: 'hr_spike',
        severity: 'high',
        avgHR: 140,
      };

      const intervention = monitor.proposeIntervention(userId, signal);

      expect(intervention).toBeDefined();
      expect(intervention.type).toMatch(/rest|recovery|deload/);
      expect(intervention.reason).toContain('HR');
      expect(intervention.confidence).toBeGreaterThan(0.7);
    });

    test('should propose intervention for HRV drop', () => {
      const userId = 'user_123';
      const signal = {
        type: 'hrv_drop',
        severity: 'high',
        rmssd: 18,
      };

      const intervention = monitor.proposeIntervention(userId, signal);

      expect(intervention).toBeDefined();
      expect(intervention.type).toMatch(/rest|recovery/);
      expect(intervention.confidence).toBeGreaterThan(0.7);
    });

    test('should propose intervention for sleep disruption', () => {
      const userId = 'user_123';
      const signal = {
        type: 'sleep_disruption',
        severity: 'high',
        sleepDuration: 240,
      };

      const intervention = monitor.proposeIntervention(userId, signal);

      expect(intervention).toBeDefined();
      expect(intervention.recommendations).toContain('sleep');
      expect(intervention.type).toMatch(/rest|recovery/);
    });

    test('should auto-approve low-risk interventions', () => {
      const userId = 'user_123';
      const signal = {
        type: 'hr_spike',
        severity: 'low',
        confidence: 0.6,
      };

      const intervention = monitor.proposeIntervention(userId, signal);

      expect(intervention.autoApprove).toBe(true);
    });

    test('should require user approval for high-risk interventions', () => {
      const userId = 'user_123';
      const signal = {
        type: 'overtraining_syndrome',
        severity: 'high',
        confidence: 0.95,
      };

      const intervention = monitor.proposeIntervention(userId, signal);

      expect(intervention.autoApprove).toBe(false);
      expect(intervention.requiresUserApproval).toBe(true);
    });
  });

  describe('Notification Dispatch', () => {
    test('should send push notification for critical signal', async () => {
      const userId = 'user_123';
      const signal = {
        type: 'hr_spike',
        severity: 'high',
      };

      await monitor.dispatchNotification(userId, signal);

      expect(notificationService.sendPushNotification).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          title: expect.stringContaining('Alert'),
          body: expect.any(String),
        })
      );
    });

    test('should send email for severe signals', async () => {
      const userId = 'user_123';
      const signal = {
        type: 'overtraining_syndrome',
        severity: 'critical',
      };

      await monitor.dispatchNotification(userId, signal);

      expect(notificationService.sendEmail).toHaveBeenCalledWith(
        userId,
        expect.any(Object)
      );
    });

    test('should send SMS for life-threatening signals', async () => {
      const userId = 'user_123';
      const signal = {
        type: 'arrhythmia',
        severity: 'critical',
        requiresEmergencyContact: true,
      };

      await monitor.dispatchNotification(userId, signal);

      expect(notificationService.sendSMS).toHaveBeenCalled();
    });

    test('should handle notification delivery failure', async () => {
      const userId = 'user_123';
      const signal = {
        type: 'hr_spike',
        severity: 'high',
      };

      (notificationService.sendPushNotification as jest.Mock).mockRejectedValueOnce(
        new Error('Push service unavailable')
      );

      await monitor.dispatchNotification(userId, signal);

      expect(logger.error).toHaveBeenCalled();
    });

    test('should respect notification preferences', async () => {
      const userId = 'user_123';
      const signal = { type: 'hr_spike', severity: 'high' };

      // Mock user preferences: no push notifications
      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          notificationPreferences: {
            push: false,
            email: true,
            sms: false,
          },
        }),
      } as any);

      await monitor.dispatchNotification(userId, signal);

      expect(notificationService.sendEmail).toHaveBeenCalled();
      expect(notificationService.sendPushNotification).not.toHaveBeenCalled();
    });
  });

  describe('Database Logging', () => {
    test('should create alerts record for critical signal', async () => {
      const userId = 'user_123';
      const signal = {
        type: 'hr_spike',
        severity: 'high',
        value: 140,
      };

      const mockRun = jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 });
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
        id: 'intervention_123',
        type: 'rest',
        status: 'auto_applied',
      };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      await monitor.logIntervention(userId, intervention);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    test('should maintain audit trail', async () => {
      const userId = 'user_123';
      const signal = { type: 'hr_spike', severity: 'high' };

      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      mockDb.prepare.mockReturnValue({
        run: mockRun,
      } as any);

      await monitor.logAlert(userId, signal);

      // Verify timestamp is captured
      const callArgs = mockDb.prepare.mock.calls[0][0];
      expect(callArgs).toContain('created_at') || expect(callArgs).toContain('timestamp');
    });
  });

  describe('Event Emission', () => {
    test('should emit critical_signal_detected event', async () => {
      const userId = 'user_123';
      const signal = {
        type: 'hr_spike',
        severity: 'high',
      };

      await monitor.processCriticalSignal(userId, signal);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'critical_signal_detected',
        expect.objectContaining({ userId, signal })
      );
    });

    test('should emit intervention_proposed event', async () => {
      const userId = 'user_123';
      const intervention = {
        type: 'rest',
        confidence: 0.85,
      };

      await monitor.proposeAndEmitIntervention(userId, intervention);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'intervention_proposed',
        expect.any(Object)
      );
    });

    test('should emit alert_acknowledged event when user acknowledges', async () => {
      const userId = 'user_123';
      const alertId = 'alert_123';

      await monitor.acknowledgeAlert(userId, alertId);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'alert_acknowledged',
        expect.any(Object)
      );
    });
  });

  describe('Follow-up Scheduling', () => {
    test('should schedule follow-up check after alert', async () => {
      const userId = 'user_123';
      const signal = { type: 'hr_spike', severity: 'high' };

      await monitor.scheduleFollowUp(userId, signal);

      expect(mockDb.prepare).toHaveBeenCalled();

      // Verify scheduled time is in future
      const callArgs = mockDb.prepare.mock.calls[0];
      expect(callArgs[0]).toContain('scheduled_time') || expect(callArgs[0]).toContain('follow_up');
    });

    test('should track intervention effectiveness', async () => {
      const userId = 'user_123';
      const interventionId = 'intervention_123';

      // Initial signal
      const initialSignal = { severity: 'high', value: 140 };

      // Follow-up measurement (improved)
      const followUpSignal = { severity: 'low', value: 105 };

      const effectiveness = monitor.calculateEffectiveness(initialSignal, followUpSignal);

      expect(effectiveness).toBeGreaterThan(0.5); // Should show improvement
      expect(effectiveness).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle 1000 concurrent signals', async () => {
      const signals = Array(1000).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        biometricData: {
          avgHR: 65 + Math.random() * 50,
          rmssd: 40,
        },
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        signals.map(s => monitor.detectCriticalSignals(s.userId, s.biometricData))
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(1000);
      expect(duration).toBeLessThan(10000); // Should complete in <10 seconds
    });

    test('should maintain detection latency <10 seconds', async () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 140,
        rmssd: 18,
      };

      mockAnomalyDetector.detectAnomalies.mockReturnValueOnce({
        isAnomalous: true,
        score: 0.9,
        signals: ['hr_spike'],
      });

      const startTime = Date.now();
      const result = await monitor.detectCriticalSignals(userId, biometricData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // Must be <10 seconds
      expect(result.critical).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = CriticalSignalMonitor.getInstance();
      const instance2 = CriticalSignalMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

import { CriticalSignalMonitor } from '../services/criticalSignalMonitor';
import { getDatabase } from '../database/databaseManager';
import { eventBus } from '../services/eventBus';
import { socketManager } from '../realtime/socketManager';
import { logger } from '../utils/logger';

jest.mock('../database/databaseManager');
jest.mock('../services/eventBus');
jest.mock('../realtime/socketManager');
jest.mock('../utils/logger');

describe('CriticalSignalMonitor', () => {
  let monitor: CriticalSignalMonitor;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: jest.fn().mockReturnValue(undefined),
        all: jest.fn().mockReturnValue([]),
      }),
      exec: jest.fn(),
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    (CriticalSignalMonitor as any).instance = null;
    monitor = CriticalSignalMonitor.getInstance();
  });

  afterEach(() => {
    monitor.stopAll();
    jest.clearAllTimers();
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

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(false);
    });

    test('should not flag normal sleep quality', () => {
      const userId = 'user_123';
      const biometricData = {
        sleepDuration: 450,
        stress: 30,
      };

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(false);
    });

    test('should return empty result for no data', () => {
      const userId = 'user_123';

      const result = monitor.detectCriticalSignals(userId, {} as any);

      expect(result.critical).toBe(false);
      expect(result.signals.length).toBe(0);
    });
  });

  describe('Signal Detection - Critical Cases', () => {
    test('should detect HR spike (>120 bpm)', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 130,
        maxHR: 160,
        minHR: 100,
      };

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(true);
      expect(result.signals).toContain('hr_spike');
    });

    test('should detect HRV drop', () => {
      const userId = 'user_123';
      const biometricData = {
        rmssd: 15,
        sdnn: 22,
      };

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.signals).toContain('hrv_low');
    });

    test('should detect sleep disruption (<4 hours)', () => {
      const userId = 'user_123';
      const biometricData = {
        sleepDuration: 239,
        sleepQuality: 0.5,
      };

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(true);
      expect(result.signals).toContain('sleep_deprivation');
    });

    test('should detect high stress', () => {
      const userId = 'user_123';
      const biometricData = {
        stress: 85,
      };

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.signals).toContain('high_stress');
    });

    test('should detect multiple simultaneous signals', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 140,
        rmssd: 15,
        sleepDuration: 200,
        stress: 90,
      };

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.critical).toBe(true);
      expect(result.signals.length).toBeGreaterThan(1);
    });

    test('should include recommendations', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 140,
        sleepDuration: 180,
      };

      const result = monitor.detectCriticalSignals(userId, biometricData);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Threshold Management', () => {
    test('should return current thresholds', () => {
      const thresholds = monitor.getThresholds();

      expect(thresholds).toBeDefined();
      expect(thresholds.hrvDropPercent).toBeDefined();
      expect(thresholds.restingHRIncreasePercent).toBeDefined();
      expect(thresholds.minSleepHours).toBeDefined();
    });

    test('should update thresholds', () => {
      monitor.setThresholds({ hrvDropPercent: 25 });

      const thresholds = monitor.getThresholds();
      expect(thresholds.hrvDropPercent).toBe(25);
    });

    test('should preserve other thresholds when updating', () => {
      const original = monitor.getThresholds();
      monitor.setThresholds({ minSleepHours: 5 });

      const updated = monitor.getThresholds();
      expect(updated.minSleepHours).toBe(5);
      expect(updated.hrvDropPercent).toBe(original.hrvDropPercent);
    });
  });

  describe('Effectiveness Calculation', () => {
    test('should calculate improvement correctly', () => {
      const initial = { severity: 'high', value: 140 };
      const followUp = { severity: 'low', value: 100 };

      const effectiveness = monitor.calculateEffectiveness(initial, followUp);

      expect(effectiveness).toBeGreaterThan(0.3);
      expect(effectiveness).toBeLessThanOrEqual(1);
    });

    test('should return 0 for no improvement', () => {
      const initial = { severity: 'high', value: 140 };
      const followUp = { severity: 'critical', value: 150 };

      const effectiveness = monitor.calculateEffectiveness(initial, followUp);

      expect(effectiveness).toBe(0);
    });

    test('should handle same severity', () => {
      const initial = { severity: 'high', value: 140 };
      const followUp = { severity: 'high', value: 120 };

      const effectiveness = monitor.calculateEffectiveness(initial, followUp);

      expect(effectiveness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Monitoring Control', () => {
    test('should start monitoring', () => {
      const userId = 'user_123';

      monitor.startMonitoring(userId, 10);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Started monitoring'),
        expect.any(Object)
      );
    });

    test('should stop monitoring', () => {
      const userId = 'user_123';

      monitor.startMonitoring(userId, 10);
      monitor.stopMonitoring(userId);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Stopped monitoring'),
        expect.any(Object)
      );
    });

    test('should not start duplicate monitoring', () => {
      const userId = 'user_123';

      monitor.startMonitoring(userId, 10);
      monitor.startMonitoring(userId, 10);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('already active'),
        expect.any(Object)
      );
    });

    test('should stop all monitoring', () => {
      monitor.startMonitoring('user_1', 10);
      monitor.startMonitoring('user_2', 10);

      monitor.stopAll();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('All monitoring stopped'),
        expect.any(Object)
      );
    });
  });

  describe('Performance', () => {
    test('should handle 1000 concurrent signal checks', async () => {
      const signals = Array(1000).fill(null).map((_, i) => ({
        userId: `user_${i}`,
        biometricData: {
          avgHR: 65 + Math.random() * 50,
          rmssd: 40,
        },
      }));

      const startTime = Date.now();

      const results = signals.map(s =>
        monitor.detectCriticalSignals(s.userId, s.biometricData)
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(1000);
      expect(duration).toBeLessThan(1000);
    });

    test('should maintain detection latency <100ms', () => {
      const userId = 'user_123';
      const biometricData = {
        avgHR: 140,
        rmssd: 18,
      };

      const startTime = Date.now();
      const result = monitor.detectCriticalSignals(userId, biometricData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
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

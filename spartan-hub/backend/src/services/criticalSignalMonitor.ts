/**
 * Critical Signal Monitor
 * 
 * Real-time monitoring of critical biometric signals.
 * Doesn't wait for daily cycle - dispatches immediate alerts for:
 * - HRV crashes (>20% drop in 24h)
 * - Resting HR spikes (>15% increase)
 * - Sleep deprivation (<4 hours)
 * - Extreme stress scores
 * - Other critical health markers
 * 
 * Triggers immediate actions:
 * - Critical alert notifications
 * - Automatic plan adjustments (cancel session, force recovery)
 * - Escalation to user & coach if needed
 */

import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { eventBus } from './eventBus';
import { socketManager } from '../realtime/socketManager';

interface CriticalSignal {
  userId: string;
  signalType: string;
  severity: 'high' | 'critical';
  currentValue: number;
  threshold: number;
  recommendation: string;
  timestamp: number;
}

interface SignalThresholds {
  hrvDropPercent: number;
  restingHRIncreasePercent: number;
  minSleepHours: number;
  maxStressScore: number;
  maxRHRBpm: number;
}

export class CriticalSignalMonitor {
  private static instance: CriticalSignalMonitor;
  private db: any;
  private monitoringEnabled: boolean;
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  
  // Default thresholds (configurable)
  private thresholds: SignalThresholds = {
    hrvDropPercent: 20, // 20% drop in HRV = warning
    restingHRIncreasePercent: 15, // 15% increase in RHR = warning
    minSleepHours: 4, // <4 hours = critical
    maxStressScore: 80, // Stress >80 = warning
    maxRHRBpm: 75 // RHR >75 for sedentary person = warning (personalized)
  };

  private constructor() {
    this.db = getDatabase();
    this.monitoringEnabled = process.env.CRITICAL_SIGNAL_MONITORING_ENABLED !== 'false';
    logger.info('CriticalSignalMonitor initialized', {
      context: 'critical-signal-monitor',
      metadata: { enabled: this.monitoringEnabled, thresholds: this.thresholds }
    });
  }

  static getInstance(): CriticalSignalMonitor {
    if (!CriticalSignalMonitor.instance) {
      CriticalSignalMonitor.instance = new CriticalSignalMonitor();
    }
    return CriticalSignalMonitor.instance;
  }

  /**
   * Start monitoring a user
   */
  startMonitoring(userId: string, intervalSeconds: number = 120): void {
    if (!this.monitoringEnabled) return;

    if (this.activeMonitors.has(userId)) {
      logger.warn('Monitor already active for user', {
        context: 'critical-signal-monitor',
        metadata: { userId }
      });
      return;
    }

    const intervalMs = intervalSeconds * 1000;
    const monitorInterval = setInterval(async () => {
      try {
        await this.checkCriticalSignals(userId);
      } catch (error) {
        logger.error('Error checking critical signals', {
          context: 'critical-signal-monitor',
          metadata: {
            userId,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }, intervalMs);

    this.activeMonitors.set(userId, monitorInterval);

    logger.info('Started monitoring user', {
      context: 'critical-signal-monitor',
      metadata: { userId, intervalSeconds }
    });
  }

  /**
   * Stop monitoring a user
   */
  stopMonitoring(userId: string): void {
    const monitor = this.activeMonitors.get(userId);
    if (monitor) {
      clearInterval(monitor);
      this.activeMonitors.delete(userId);

      logger.info('Stopped monitoring user', {
        context: 'critical-signal-monitor',
        metadata: { userId }
      });
    }
  }

  /**
   * Check all critical signals for a user
   */
  private async checkCriticalSignals(userId: string): Promise<void> {
    try {
      const criticalSignals: CriticalSignal[] = [];

      // Check HRV trend
      const hrvSignal = await this.checkHRVTrend(userId);
      if (hrvSignal) criticalSignals.push(hrvSignal);

      // Check Resting HR
      const rhResult = await this.checkRestingHRIncrease(userId);
      if (rhResult) criticalSignals.push(rhResult);

      // Check Sleep
      const sleepSignal = await this.checkSleepDeprivation(userId);
      if (sleepSignal) criticalSignals.push(sleepSignal);

      // Check Stress
      const stressSignal = await this.checkExtremeStress(userId);
      if (stressSignal) criticalSignals.push(stressSignal);

      // Process detected signals
      for (const signal of criticalSignals) {
        await this.handleCriticalSignal(signal);
      }
    } catch (error) {
      logger.error('Failed to check critical signals', {
        context: 'critical-signal-monitor',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Check HRV trend (crash detection)
   */
  private async checkHRVTrend(userId: string): Promise<CriticalSignal | null> {
    try {
      // Get HRV from last 2 days
      const hrvData = this.db.prepare(`
        SELECT value, timestamp FROM biometric_data_points
        WHERE userId = ? AND dataType = 'heart_rate_variability'
        AND timestamp > ?
        ORDER BY timestamp DESC
        LIMIT 48 -- ~2 days of hourly data
      `).all(userId, Date.now() - 2 * 24 * 60 * 60 * 1000) as Array<{ value: number; timestamp: number }>;

      if (hrvData.length < 2) return null;

      const today = hrvData.filter(h => h.timestamp > Date.now() - 24 * 60 * 60 * 1000);
      const yesterday = hrvData.filter(h => 
        h.timestamp <= Date.now() - 24 * 60 * 60 * 1000 && 
        h.timestamp > Date.now() - 2 * 24 * 60 * 60 * 1000
      );

      if (today.length === 0 || yesterday.length === 0) return null;

      const todayAvg = today.reduce((a, b) => a + b.value, 0) / today.length;
      const yesterdayAvg = yesterday.reduce((a, b) => a + b.value, 0) / yesterday.length;

      const dropPercent = ((yesterdayAvg - todayAvg) / yesterdayAvg) * 100;

      if (dropPercent >= this.thresholds.hrvDropPercent) {
        return {
          userId,
          signalType: 'hrv_crash',
          severity: dropPercent >= 30 ? 'critical' : 'high',
          currentValue: todayAvg,
          threshold: yesterdayAvg * (1 - this.thresholds.hrvDropPercent / 100),
          recommendation: 'HRV has dropped significantly. Increase recovery, reduce training intensity.',
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      logger.error('Error checking HRV trend', {
        context: 'critical-signal-monitor',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    }
  }

  /**
   * Check Resting HR increase
   */
  private async checkRestingHRIncrease(userId: string): Promise<CriticalSignal | null> {
    try {
      const rhData = this.db.prepare(`
        SELECT value, timestamp FROM biometric_data_points
        WHERE userId = ? AND dataType = 'resting_heart_rate'
        AND timestamp > ?
        ORDER BY timestamp DESC
        LIMIT 14 -- ~2 weeks of daily data
      `).all(userId, Date.now() - 14 * 24 * 60 * 60 * 1000) as Array<{ value: number; timestamp: number }>;

      if (rhData.length < 2) return null;

      const today = rhData.filter(r => r.timestamp > Date.now() - 24 * 60 * 60 * 1000);
      const last7days = rhData.filter(r => 
        r.timestamp <= Date.now() - 24 * 60 * 60 * 1000 && 
        r.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
      );

      if (today.length === 0 || last7days.length === 0) return null;

      const todayAvg = today.reduce((a, b) => a + b.value, 0) / today.length;
      const last7Avg = last7days.reduce((a, b) => a + b.value, 0) / last7days.length;

      const increasePercent = ((todayAvg - last7Avg) / last7Avg) * 100;

      if (increasePercent >= this.thresholds.restingHRIncreasePercent) {
        return {
          userId,
          signalType: 'resting_hr_spike',
          severity: increasePercent >= 25 ? 'critical' : 'high',
          currentValue: todayAvg,
          threshold: last7Avg * (1 + this.thresholds.restingHRIncreasePercent / 100),
          recommendation: 'Resting HR elevated. May indicate infection or overtraining. Get more rest.',
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      logger.error('Error checking resting HR', {
        context: 'critical-signal-monitor',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    }
  }

  /**
   * Check sleep deprivation
   */
  private async checkSleepDeprivation(userId: string): Promise<CriticalSignal | null> {
    try {
      const sleepData = this.db.prepare(`
        SELECT value FROM biometric_data_points
        WHERE userId = ? AND dataType = 'sleep_duration'
        AND timestamp > ?
        ORDER BY timestamp DESC
        LIMIT 1
      `).get(userId, Date.now() - 24 * 60 * 60 * 1000) as { value: number } | undefined;

      if (!sleepData || sleepData.value >= this.thresholds.minSleepHours) {
        return null;
      }

      return {
        userId,
        signalType: 'sleep_deprivation',
        severity: sleepData.value < 3 ? 'critical' : 'high',
        currentValue: sleepData.value,
        threshold: this.thresholds.minSleepHours,
        recommendation: `Last night only ${sleepData.value}h of sleep. Prioritize rest today - cancel or reschedule intense training.`,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error checking sleep', {
        context: 'critical-signal-monitor',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    }
  }

  /**
   * Check extreme stress levels
   */
  private async checkExtremeStress(userId: string): Promise<CriticalSignal | null> {
    try {
      const stressData = this.db.prepare(`
        SELECT value FROM biometric_data_points
        WHERE userId = ? AND dataType = 'stress'
        AND timestamp > ?
        ORDER BY timestamp DESC
        LIMIT 1
      `).get(userId, Date.now() - 24 * 60 * 60 * 1000) as { value: number } | undefined;

      if (!stressData || stressData.value < this.thresholds.maxStressScore) {
        return null;
      }

      return {
        userId,
        signalType: 'extreme_stress',
        severity: stressData.value >= 90 ? 'critical' : 'high',
        currentValue: stressData.value,
        threshold: this.thresholds.maxStressScore,
        recommendation: 'Stress levels critically high. Focus on recovery, meditation, light activity only.',
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error checking stress', {
        context: 'critical-signal-monitor',
        metadata: {
          userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    }
  }

  /**
   * Handle a detected critical signal
   */
  private async handleCriticalSignal(signal: CriticalSignal): Promise<void> {
    try {
      logger.warn(`Critical signal detected: ${signal.signalType}`, {
        context: 'critical-signal-monitor',
        metadata: {
          userId: signal.userId,
          severity: signal.severity,
          currentValue: signal.currentValue,
          threshold: signal.threshold
        }
      });

      // Store alert in database
      const stmt = this.db.prepare(`
        INSERT INTO critical_signal_alerts (userId, signalType, severity, currentValue, threshold, recommendation, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        signal.userId,
        signal.signalType,
        signal.severity,
        signal.currentValue,
        signal.threshold,
        signal.recommendation,
        signal.timestamp
      );

      // Emit real-time notification
      socketManager.emitToUser(signal.userId, 'critical-alert', {
        type: signal.signalType,
        severity: signal.severity,
        message: signal.recommendation,
        currentValue: signal.currentValue,
        threshold: signal.threshold
      }, '/notifications');

      // Emit to event bus for other services
      eventBus.emit('signal.critical', signal, signal.severity === 'critical' ? 'critical' : 'high');

      // For critical signals, propose immediate plan intervention
      if (signal.severity === 'critical') {
        await this.proposeCriticalIntervention(signal);
      }
    } catch (error) {
      logger.error('Error handling critical signal', {
        context: 'critical-signal-monitor',
        metadata: {
          userId: signal.userId,
          signalType: signal.signalType,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Propose critical intervention (e.g., cancel today's session)
   */
  private async proposeCriticalIntervention(signal: CriticalSignal): Promise<void> {
    try {
      logger.info('Proposing critical intervention', {
        context: 'critical-signal-monitor',
        metadata: { userId: signal.userId, signalType: signal.signalType }
      });

      // Actions depend on signal type
      let intervention = '';

      switch (signal.signalType) {
      case 'sleep_deprivation':
        intervention = 'SKIP_TODAY_SESSION';
        break;
      case 'hrv_crash':
        intervention = 'REDUCE_INTENSITY_TODAY';
        break;
      case 'resting_hr_spike':
        intervention = 'LOW_INTENSITY_ONLY';
        break;
      case 'extreme_stress':
        intervention = 'RECOVERY_MODE_TODAY';
        break;
      }

      if (intervention) {
        socketManager.emitToUser(signal.userId, 'critical-intervention', {
          type: intervention,
          reason: signal.recommendation,
          requiresApproval: signal.severity === 'critical'
        }, '/brain');

        eventBus.emit('intervention.proposed', {
          userId: signal.userId,
          type: intervention,
          signalType: signal.signalType
        }, 'high');
      }
    } catch (error) {
      logger.error('Error proposing critical intervention', {
        context: 'critical-signal-monitor',
        metadata: {
          userId: signal.userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Update signal thresholds
   */
  setThresholds(thresholds: Partial<SignalThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info('Critical signal thresholds updated', {
      context: 'critical-signal-monitor',
      metadata: this.thresholds as unknown as Record<string, unknown>
    });
  }

  /**
   * Get current thresholds
   */
  getThresholds(): SignalThresholds {
    return { ...this.thresholds };
  }

  /**
   * Stop all monitoring (graceful shutdown)
   */
  stopAll(): void {
    for (const [userId] of this.activeMonitors) {
      this.stopMonitoring(userId);
    }
    logger.info('All monitoring stopped', { context: 'critical-signal-monitor' });
  }
}

export const getCriticalSignalMonitor = (): CriticalSignalMonitor => {
  return CriticalSignalMonitor.getInstance();
};

export const criticalSignalMonitor = CriticalSignalMonitor.getInstance();

export default CriticalSignalMonitor;

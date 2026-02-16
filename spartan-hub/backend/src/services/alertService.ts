import { logger, LogLevel } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { WriteStream } from 'fs';

// Alert severity levels
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Alert types
export enum AlertType {
  SYSTEM_ERROR = 'system_error',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  SECURITY_INCIDENT = 'security_incident',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  AI_SERVICE_FAILURE = 'ai_service_failure',
  DATABASE_CONNECTION_ERROR = 'database_connection_error'
}

// Alert interface
export interface Alert {
  id: string;
  timestamp: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  notified: boolean;
}

// Alert configuration
export interface AlertConfig {
  // Enable/disable alerting system
  enabled: boolean;
  
  // Minimum severity level to trigger alerts
  minSeverity: AlertSeverity;
  
  // Throttling settings (prevent alert spam)
  throttleWindowMs: number; // Time window for throttling
  maxAlertsPerWindow: number; // Max alerts per window
  
  // Notification settings
  enableConsoleNotifications: boolean;
  enableFileNotifications: boolean;
  notificationFilePath?: string;
  
  // Alert retention
  maxStoredAlerts: number;
  alertRetentionHours: number;
}

// Default configuration
const DEFAULT_CONFIG: AlertConfig = {
  enabled: true,
  minSeverity: AlertSeverity.HIGH,
  throttleWindowMs: 60000, // 1 minute
  maxAlertsPerWindow: 10,
  enableConsoleNotifications: true,
  enableFileNotifications: true,
  notificationFilePath: './logs/alerts.log',
  maxStoredAlerts: 100,
  alertRetentionHours: 24
};

export class AlertService {
  private config: AlertConfig;
  private alerts: Alert[] = [];
  private lastAlertTimestamps: Map<AlertType, number[]> = new Map();
  private alertNotificationFile?: WriteStream | null; // Would be fs.WriteStream in actual implementation

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeNotificationFile();
    
    // Log initialization
    logger.info('Alert service initialized', {
      context: 'alertService',
      metadata: {
        config: this.config
      }
    });
  }

  /**
   * Update alert service configuration
   */
  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Alert service configuration updated', {
      context: 'alertService',
      metadata: {
        config: this.config
      }
    });
  }

  /**
   * Initialize notification file if enabled
   */
  private initializeNotificationFile(): void {
    if (!this.config.enableFileNotifications || !this.config.notificationFilePath) {
      return;
    }

    // In a real implementation, we would create a write stream
    // For now, we'll just log that we would do this
    logger.debug('Alert notification file would be initialized', {
      context: 'alertService',
      metadata: {
        filePath: this.config.notificationFilePath
      }
    });
  }

  /**
   * Check if an alert should be throttled based on type and frequency
   */
  private shouldThrottleAlert(type: AlertType): boolean {
    const now = Date.now();
    const timestamps = this.lastAlertTimestamps.get(type) || [];
    
    // Filter timestamps to only include those within the throttle window
    const recentTimestamps = timestamps.filter(
      timestamp => now - timestamp < this.config.throttleWindowMs
    );
    
    // Update the timestamps for this alert type
    this.lastAlertTimestamps.set(type, [...recentTimestamps, now]);
    
    // Check if we've exceeded the maximum alerts per window
    return recentTimestamps.length >= this.config.maxAlertsPerWindow;
  }

  /**
   * Check if alert meets severity threshold
   */
  private meetsSeverityThreshold(severity: AlertSeverity): boolean {
    const severityLevels = [
      AlertSeverity.LOW,
      AlertSeverity.MEDIUM,
      AlertSeverity.HIGH,
      AlertSeverity.CRITICAL
    ];
    
    const currentLevelIndex = severityLevels.indexOf(severity);
    const minLevelIndex = severityLevels.indexOf(this.config.minSeverity);
    
    return currentLevelIndex >= minLevelIndex;
  }

  /**
   * Create and store an alert
   */
  createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): Alert | null {
    // Check if alerting is enabled
    if (!this.config.enabled) {
      return null;
    }
    
    // Check severity threshold
    if (!this.meetsSeverityThreshold(severity)) {
      logger.debug('Alert below severity threshold, ignoring', {
        context: 'alertService',
        metadata: {
          type,
          severity,
          message,
          minSeverity: this.config.minSeverity
        }
      });
      return null;
    }
    
    // Check throttling
    if (this.shouldThrottleAlert(type)) {
      logger.warn('Alert throttled due to frequency limits', {
        context: 'alertService',
        metadata: {
          type,
          message
        }
      });
      return null;
    }
    
    // Create alert
    const alert: Alert = {
      id: `alert_${Date.now()}_${uuidv4().replace(/-/g, '').substring(0, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      context,
      metadata,
      resolved: false,
      notified: false
    };
    
    // Store alert
    this.alerts.unshift(alert);
    
    // Maintain alert retention limits
    if (this.alerts.length > this.config.maxStoredAlerts) {
      this.alerts.pop();
    }
    
    // Process alert (notify, log, etc.)
    this.processAlert(alert);
    
    return alert;
  }

  /**
   * Process an alert (notify, log, etc.)
   */
  private processAlert(alert: Alert): void {
    // Log the alert
    logger.error(`ALERT: ${alert.type} - ${alert.message}`, {
      context: alert.context || 'alertService',
      metadata: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        ...alert.metadata
      }
    });
    
    // Send notifications
    this.sendNotifications(alert);
    
    // Mark as notified
    alert.notified = true;
  }

  /**
   * Send notifications for an alert
   */
  private sendNotifications(alert: Alert): void {
    // Console notification
    if (this.config.enableConsoleNotifications) {
      const logLevel = this.getLogLevelForSeverity(alert.severity);
      const notificationMessage = `[ALERT] ${alert.type} (${alert.severity}): ${alert.message}`;
      
      switch (logLevel) {
      case LogLevel.ERROR:
        logger.error(notificationMessage, { context: 'alertService' });
        break;
      case LogLevel.WARN:
        logger.warn(notificationMessage, { context: 'alertService' });
        break;
      case LogLevel.INFO:
        logger.info(notificationMessage, { context: 'alertService' });
        break;
      }
    }
    
    // File notification
    if (this.config.enableFileNotifications && this.config.notificationFilePath) {
      const notificationEntry = {
        timestamp: alert.timestamp,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        context: alert.context,
        metadata: alert.metadata
      };
      
      // In a real implementation, we would write to the file
      // For now, we'll just log that we would do this
      logger.debug('Alert notification would be written to file', {
        context: 'alertService',
        metadata: {
          entry: notificationEntry,
          filePath: this.config.notificationFilePath
        }
      });
    }
  }

  /**
   * Get log level for alert severity
   */
  private getLogLevelForSeverity(severity: AlertSeverity): LogLevel {
    switch (severity) {
    case AlertSeverity.CRITICAL:
      return LogLevel.ERROR;
    case AlertSeverity.HIGH:
      return LogLevel.ERROR;
    case AlertSeverity.MEDIUM:
      return LogLevel.WARN;
    case AlertSeverity.LOW:
      return LogLevel.INFO;
    default:
      return LogLevel.INFO;
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      
      logger.info('Alert resolved', {
        context: 'alertService',
        metadata: {
          alertId: alert.id,
          type: alert.type
        }
      });
      
      return true;
    }
    return false;
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: AlertType): Alert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Clear resolved alerts older than retention period
   */
  cleanupOldAlerts(): void {
    const now = Date.now();
    const retentionMs = this.config.alertRetentionHours * 60 * 60 * 1000;
    
    const filteredAlerts = this.alerts.filter(alert => {
      // Keep unresolved alerts
      if (!alert.resolved) {
        return true;
      }
      
      // Check if resolved alert is within retention period
      const alertTime = new Date(alert.resolvedAt || alert.timestamp).getTime();
      return now - alertTime < retentionMs;
    });
    
    const removedCount = this.alerts.length - filteredAlerts.length;
    if (removedCount > 0) {
      this.alerts = filteredAlerts;
      logger.debug(`Cleaned up ${removedCount} old alerts`, {
        context: 'alertService'
      });
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): Record<string, any> {
    const unresolvedCount = this.alerts.filter(a => !a.resolved).length;
    const severityCounts: Record<AlertSeverity, number> = {
      [AlertSeverity.LOW]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.CRITICAL]: 0
    };
    
    this.alerts.forEach(alert => {
      severityCounts[alert.severity]++;
    });
    
    return {
      total: this.alerts.length,
      unresolved: unresolvedCount,
      severityCounts,
      config: this.config
    };
  }
}

// Create default alert service instance
export const alertService = new AlertService();

export default alertService;
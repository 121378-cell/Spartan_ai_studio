import { AlertSeverity, AlertType } from '../services/alertService';

// Alert configuration interface
export interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  messageTemplate: string;
  conditions?: Record<string, unknown>; // Specific conditions for triggering the alert
}

// Predefined alert rules
export const ALERT_RULES: Record<AlertType, AlertRule> = {
  [AlertType.SYSTEM_ERROR]: {
    type: AlertType.SYSTEM_ERROR,
    severity: AlertSeverity.HIGH,
    enabled: true,
    messageTemplate: 'System error occurred: {message}'
  },
  
  [AlertType.PERFORMANCE_DEGRADATION]: {
    type: AlertType.PERFORMANCE_DEGRADATION,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    messageTemplate: 'Performance degradation detected: {metric} took {duration}ms'
  },
  
  [AlertType.SECURITY_INCIDENT]: {
    type: AlertType.SECURITY_INCIDENT,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    messageTemplate: 'Security incident detected: {incidentType} from {sourceIp}'
  },
  
  [AlertType.SERVICE_UNAVAILABLE]: {
    type: AlertType.SERVICE_UNAVAILABLE,
    severity: AlertSeverity.HIGH,
    enabled: true,
    messageTemplate: 'Service unavailable: {serviceName} is not responding'
  },
  
  [AlertType.RATE_LIMIT_EXCEEDED]: {
    type: AlertType.RATE_LIMIT_EXCEEDED,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    messageTemplate: 'Rate limit exceeded for {endpoint} by {clientId}'
  },
  
  [AlertType.AI_SERVICE_FAILURE]: {
    type: AlertType.AI_SERVICE_FAILURE,
    severity: AlertSeverity.HIGH,
    enabled: true,
    messageTemplate: 'AI service failure: {errorMessage}'
  },
  
  [AlertType.DATABASE_CONNECTION_ERROR]: {
    type: AlertType.DATABASE_CONNECTION_ERROR,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    messageTemplate: 'Database connection error: {errorMessage}'
  }
};

// Environment-specific alert configuration
export const getAlertConfig = () => {
  return {
    enabled: process.env.ALERTING_ENABLED !== 'false',
    minSeverity: (process.env.ALERT_MIN_SEVERITY as AlertSeverity) || AlertSeverity.MEDIUM,
    throttleWindowMs: process.env.ALERT_THROTTLE_WINDOW_MS 
      ? parseInt(process.env.ALERT_THROTTLE_WINDOW_MS, 10) 
      : 60000, // 1 minute
    maxAlertsPerWindow: process.env.ALERT_MAX_PER_WINDOW 
      ? parseInt(process.env.ALERT_MAX_PER_WINDOW, 10) 
      : 10,
    enableConsoleNotifications: process.env.ALERT_CONSOLE_NOTIFICATIONS !== 'false',
    enableFileNotifications: process.env.ALERT_FILE_NOTIFICATIONS !== 'false',
    notificationFilePath: process.env.ALERT_NOTIFICATION_FILE_PATH || './logs/alerts.log',
    maxStoredAlerts: process.env.ALERT_MAX_STORED 
      ? parseInt(process.env.ALERT_MAX_STORED, 10) 
      : 100,
    alertRetentionHours: process.env.ALERT_RETENTION_HOURS 
      ? parseInt(process.env.ALERT_RETENTION_HOURS, 10) 
      : 24
  };
};

export default {
  ALERT_RULES,
  getAlertConfig
};
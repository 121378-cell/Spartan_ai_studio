/**
 * Alert Manager Service
 * Phase B: Scale Preparation - Week 8 Day 5
 * 
 * Alert configuration, notification, and escalation
 */

import { logger } from '../utils/logger';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type NotificationChannel = 'email' | 'slack' | 'pagerduty' | 'webhook';

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  createdAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  acknowledgedBy?: string;
  resolvedBy?: string;
}

export interface AlertPolicy {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  severity: AlertSeverity;
  notificationChannels: NotificationChannel[];
  escalationPolicy: EscalationPolicy;
  enabled: boolean;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  repeatInterval: number; // seconds
}

export interface EscalationLevel {
  delay: number; // seconds
  notificationChannels: NotificationChannel[];
  targets: string[];
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  avgResolutionTime: number;
}

/**
 * Alert Manager Service
 */
export class AlertManagerService {
  private alerts: Map<string, Alert> = new Map();
  private policies: Map<string, AlertPolicy> = new Map();
  private stats: AlertStats = {
    totalAlerts: 0,
    activeAlerts: 0,
    acknowledgedAlerts: 0,
    resolvedAlerts: 0,
    criticalAlerts: 0,
    avgResolutionTime: 0
  };

  constructor() {
    logger.info('AlertManagerService initialized', {
      context: 'alerts'
    });
  }

  /**
   * Add alert policy
   */
  addPolicy(policy: AlertPolicy): boolean {
    if (this.policies.has(policy.id)) {
      logger.warn('Policy already exists', {
        context: 'alerts',
        metadata: { policyId: policy.id }
      });
      return false;
    }

    this.policies.set(policy.id, policy);

    logger.info('Alert policy added', {
      context: 'alerts',
      metadata: {
        policyId: policy.id,
        name: policy.name,
        metric: policy.metric,
        threshold: policy.threshold
      }
    });

    return true;
  }

  /**
   * Evaluate metric against policies
   */
  evaluateMetric(metricName: string, value: number): Alert | null {
    let triggeredAlert: Alert | null = null;

    for (const policy of this.policies.values()) {
      if (!policy.enabled || policy.metric !== metricName) {
        continue;
      }

      const shouldAlert = this.checkThreshold(value, policy.operator, policy.threshold);

      if (shouldAlert) {
        triggeredAlert = this.createAlert(policy, value);
        break;
      }
    }

    return triggeredAlert;
  }

  /**
   * Check threshold
   */
  private checkThreshold(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  /**
   * Create alert
   */
  private createAlert(policy: AlertPolicy, value: number): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: policy.name,
      severity: policy.severity,
      status: 'active',
      metric: policy.metric,
      threshold: policy.threshold,
      currentValue: value,
      message: `${policy.name}: ${policy.metric} is ${value} (threshold: ${policy.threshold})`,
      createdAt: Date.now()
    };

    this.alerts.set(alert.id, alert);
    this.stats.totalAlerts++;
    this.stats.activeAlerts++;

    if (policy.severity === 'critical') {
      this.stats.criticalAlerts++;
    }

    // Send notifications
    this.sendNotifications(alert, policy);

    logger.warn('Alert triggered', {
      context: 'alerts',
      metadata: {
        alertId: alert.id,
        name: alert.name,
        severity: alert.severity
      }
    });

    return alert;
  }

  /**
   * Send notifications
   */
  private sendNotifications(alert: Alert, policy: AlertPolicy): void {
    for (const channel of policy.notificationChannels) {
      this.sendNotification(alert, channel, policy.escalationPolicy.levels[0]?.targets || []);
    }
  }

  /**
   * Send notification to specific channel
   */
  private sendNotification(alert: Alert, channel: NotificationChannel, targets: string[]): void {
    logger.info('Notification sent', {
      context: 'alerts',
      metadata: {
        alertId: alert.id,
        channel,
        targets: targets.length
      }
    });

    // In production, this would actually send the notification
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;
    this.stats.acknowledgedAlerts++;
    this.stats.activeAlerts--;

    logger.info('Alert acknowledged', {
      context: 'alerts',
      metadata: {
        alertId,
        acknowledgedBy
      }
    });

    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy;
    this.stats.resolvedAlerts++;
    this.stats.activeAlerts--;

    // Update average resolution time
    const resolutionTime = alert.resolvedAt - alert.createdAt;
    this.stats.avgResolutionTime = (this.stats.avgResolutionTime * (this.stats.resolvedAlerts - 1) + resolutionTime) / this.stats.resolvedAlerts;

    logger.info('Alert resolved', {
      context: 'alerts',
      metadata: {
        alertId,
        resolutionTime
      }
    });

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.status === 'active');
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | null {
    return this.alerts.get(alertId) || null;
  }

  /**
   * Get alert statistics
   */
  getStats(): AlertStats {
    return { ...this.stats };
  }

  /**
   * Enable/disable policy
   */
  setPolicyEnabled(policyId: string, enabled: boolean): void {
    const policy = this.policies.get(policyId);
    
    if (policy) {
      policy.enabled = enabled;
      
      logger.info('Alert policy updated', {
        context: 'alerts',
        metadata: {
          policyId,
          enabled
        }
      });
    }
  }

  /**
   * Get all policies
   */
  getAllPolicies(): AlertPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const activeAlerts = this.stats.activeAlerts;
    const isHealthy = activeAlerts < 10; // More than 10 active alerts = unhealthy

    logger.debug('Alert manager health check', {
      context: 'alerts',
      metadata: {
        healthy: isHealthy,
        activeAlerts
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const alertManagerService = new AlertManagerService();

export default alertManagerService;

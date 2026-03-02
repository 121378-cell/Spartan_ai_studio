/**
 * Auto Scaling Service
 * Phase B: Scale Preparation - Week 8 Day 5
 * 
 * Automatic scaling based on metrics and policies
 */

import { logger } from '../utils/logger';

export type ScalingMetric = 'cpu' | 'memory' | 'requests' | 'connections' | 'custom';
export type ScalingAction = 'scale_up' | 'scale_down' | 'none';
export type ScalingStatus = 'idle' | 'scaling_up' | 'scaling_down' | 'cooldown';

export interface ScalingPolicy {
  id: string;
  name: string;
  metric: ScalingMetric;
  threshold: number;
  unit: string;
  cooldownPeriod: number; // seconds
  minInstances: number;
  maxInstances: number;
  scaleUpIncrement: number;
  scaleDownIncrement: number;
  enabled: boolean;
}

export interface ScalingEvent {
  id: string;
  policyId: string;
  action: ScalingAction;
  currentInstances: number;
  targetInstances: number;
  reason: string;
  metricValue: number;
  timestamp: number;
  completed: boolean;
}

export interface AutoScalingStats {
  currentInstances: number;
  targetInstances: number;
  lastScalingEvent: number;
  totalScaleUps: number;
  totalScaleDowns: number;
  status: ScalingStatus;
  cooldownRemaining: number;
}

/**
 * Auto Scaling Service
 */
export class AutoScalingService {
  private policies: Map<string, ScalingPolicy> = new Map();
  private events: Map<string, ScalingEvent> = new Map();
  private currentInstances: number = 1;
  private targetInstances: number = 1;
  private status: ScalingStatus = 'idle';
  private lastScalingTime: number = 0;
  private stats = {
    totalScaleUps: 0,
    totalScaleDowns: 0
  };

  constructor() {
    logger.info('AutoScalingService initialized', {
      context: 'auto-scaling'
    });
  }

  /**
   * Add scaling policy
   */
  addPolicy(policy: ScalingPolicy): boolean {
    if (this.policies.has(policy.id)) {
      logger.warn('Policy already exists', {
        context: 'auto-scaling',
        metadata: { policyId: policy.id }
      });
      return false;
    }

    this.policies.set(policy.id, policy);

    logger.info('Scaling policy added', {
      context: 'auto-scaling',
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
   * Remove scaling policy
   */
  removePolicy(policyId: string): boolean {
    const removed = this.policies.delete(policyId);
    
    if (removed) {
      logger.info('Scaling policy removed', {
        context: 'auto-scaling',
        metadata: { policyId: policyId }
      });
    }

    return removed;
  }

  /**
   * Evaluate metrics and trigger scaling if needed
   */
  evaluateMetrics(metricType: ScalingMetric, value: number): ScalingAction {
    if (this.status === 'cooldown') {
      return 'none';
    }

    let action: ScalingAction = 'none';
    let triggeredPolicy: ScalingPolicy | null = null;

    for (const policy of this.policies.values()) {
      if (!policy.enabled || policy.metric !== metricType) {
        continue;
      }

      // Check if threshold exceeded
      if (value > policy.threshold * 1.2) { // 20% buffer
        if (this.currentInstances < policy.maxInstances) {
          action = 'scale_up';
          triggeredPolicy = policy;
          break;
        }
      } else if (value < policy.threshold * 0.5) { // 50% buffer for scale down
        if (this.currentInstances > policy.minInstances) {
          action = 'scale_down';
          triggeredPolicy = policy;
          break;
        }
      }
    }

    if (action !== 'none' && triggeredPolicy) {
      this.executeScaling(action, triggeredPolicy, value);
    }

    return action;
  }

  /**
   * Execute scaling action
   */
  private executeScaling(action: ScalingAction, policy: ScalingPolicy, metricValue: number): void {
    const event: ScalingEvent = {
      id: `scale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      policyId: policy.id,
      action,
      currentInstances: this.currentInstances,
      targetInstances: action === 'scale_up' 
        ? Math.min(this.currentInstances + policy.scaleUpIncrement, policy.maxInstances)
        : Math.max(this.currentInstances - policy.scaleDownIncrement, policy.minInstances),
      reason: `${policy.metric} ${action === 'scale_up' ? 'exceeded' : 'below'} threshold`,
      metricValue,
      timestamp: Date.now(),
      completed: false
    };

    this.events.set(event.id, event);
    this.targetInstances = event.targetInstances;
    this.status = action === 'scale_up' ? 'scaling_up' : 'scaling_down';
    this.lastScalingTime = Date.now();

    if (action === 'scale_up') {
      this.stats.totalScaleUps++;
    } else {
      this.stats.totalScaleDowns++;
    }

    logger.info('Scaling action triggered', {
      context: 'auto-scaling',
      metadata: {
        eventId: event.id,
        action,
        from: this.currentInstances,
        to: event.targetInstances,
        reason: event.reason
      }
    });

    // Simulate scaling completion
    setTimeout(() => {
      this.completeScaling(event);
    }, 5000); // 5 second scaling simulation
  }

  /**
   * Complete scaling event
   */
  private completeScaling(event: ScalingEvent): void {
    event.completed = true;
    this.currentInstances = event.targetInstances;
    this.status = 'cooldown';

    // Find policy for cooldown period
    const policy = this.policies.get(event.policyId);
    const cooldownPeriod = policy ? policy.cooldownPeriod * 1000 : 300000; // 5 min default

    logger.info('Scaling completed', {
      context: 'auto-scaling',
      metadata: {
        eventId: event.id,
        instances: this.currentInstances
      }
    });

    // End cooldown after period
    setTimeout(() => {
      this.status = 'idle';
    }, cooldownPeriod);
  }

  /**
   * Get auto-scaling statistics
   */
  getStats(): AutoScalingStats {
    const cooldownRemaining = this.status === 'cooldown' 
      ? Math.max(0, 300000 - (Date.now() - this.lastScalingTime))
      : 0;

    return {
      currentInstances: this.currentInstances,
      targetInstances: this.targetInstances,
      lastScalingEvent: this.lastScalingTime,
      totalScaleUps: this.stats.totalScaleUps,
      totalScaleDowns: this.stats.totalScaleDowns,
      status: this.status,
      cooldownRemaining
    };
  }

  /**
   * Get scaling events
   */
  getScalingEvents(limit: number = 10): ScalingEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Enable/disable policy
   */
  setPolicyEnabled(policyId: string, enabled: boolean): void {
    const policy = this.policies.get(policyId);
    
    if (policy) {
      policy.enabled = enabled;
      
      logger.info('Scaling policy updated', {
        context: 'auto-scaling',
        metadata: {
          policyId,
          enabled
        }
      });
    }
  }

  /**
   * Update current instance count (manual override)
   */
  setCurrentInstances(count: number): void {
    const minPolicy = Math.min(...Array.from(this.policies.values()).map(p => p.minInstances));
    const maxPolicy = Math.max(...Array.from(this.policies.values()).map(p => p.maxInstances));

    this.currentInstances = Math.max(minPolicy, Math.min(count, maxPolicy));
    this.targetInstances = this.currentInstances;

    logger.info('Instance count manually updated', {
      context: 'auto-scaling',
      metadata: {
        instances: this.currentInstances
      }
    });
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const isHealthy = this.policies.size > 0 && this.currentInstances > 0;

    logger.debug('Auto-scaling health check', {
      context: 'auto-scaling',
      metadata: {
        healthy: isHealthy,
        instances: this.currentInstances,
        policies: this.policies.size
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const autoScalingService = new AutoScalingService();

export default autoScalingService;

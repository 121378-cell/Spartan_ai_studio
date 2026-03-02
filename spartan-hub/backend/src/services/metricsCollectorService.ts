/**
 * Metrics Collector Service
 * Phase B: Scale Preparation - Week 8 Day 5
 * 
 * Real-time metrics collection and aggregation
 */

import { logger } from '../utils/logger';

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export type MetricCategory = 'system' | 'application' | 'business';

export interface Metric {
  name: string;
  type: MetricType;
  category: MetricCategory;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export interface MetricAggregation {
  name: string;
  avg: number;
  min: number;
  max: number;
  count: number;
  sum: number;
  percentile50?: number;
  percentile95?: number;
  percentile99?: number;
}

/**
 * Metrics Collector Service
 */
export class MetricsCollectorService {
  private metrics: Map<string, Metric[]> = new Map();
  private aggregations: Map<string, MetricAggregation> = new Map();
  private collectionInterval: number = 10000; // 10 seconds
  private retentionPeriod: number = 3600000; // 1 hour

  constructor() {
    logger.info('MetricsCollectorService initialized', {
      context: 'metrics',
      metadata: {
        collectionInterval: this.collectionInterval,
        retentionPeriod: this.retentionPeriod
      }
    });

    this.startAutoCleanup();
  }

  /**
   * Record metric
   */
  recordMetric(name: string, value: number, type: MetricType = 'gauge', category: MetricCategory = 'application', labels: Record<string, string> = {}): void {
    const metric: Metric = {
      name,
      type,
      category,
      value,
      labels,
      timestamp: Date.now()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // Update aggregation
    this.updateAggregation(name, value);

    logger.debug('Metric recorded', {
      context: 'metrics',
      metadata: {
        name,
        value,
        type
      }
    });
  }

  /**
   * Update metric aggregation
   */
  private updateAggregation(name: string, value: number): void {
    const aggregation = this.aggregations.get(name);

    if (!aggregation) {
      this.aggregations.set(name, {
        name,
        avg: value,
        min: value,
        max: value,
        count: 1,
        sum: value
      });
    } else {
      aggregation.count++;
      aggregation.sum += value;
      aggregation.avg = aggregation.sum / aggregation.count;
      aggregation.min = Math.min(aggregation.min, value);
      aggregation.max = Math.max(aggregation.max, value);
    }
  }

  /**
   * Get metric by name
   */
  getMetric(name: string, timeRange: number = 300000): Metric[] { // 5 min default
    const metrics = this.metrics.get(name) || [];
    const cutoff = Date.now() - timeRange;
    
    return metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get metric aggregation
   */
  getAggregation(name: string): MetricAggregation | null {
    return this.aggregations.get(name) || null;
  }

  /**
   * Get all metrics by category
   */
  getMetricsByCategory(category: MetricCategory): Map<string, Metric[]> {
    const result = new Map<string, Metric[]>();

    for (const [name, metrics] of this.metrics.entries()) {
      const categoryMetrics = metrics.filter(m => m.category === category);
      if (categoryMetrics.length > 0) {
        result.set(name, categoryMetrics);
      }
    }

    return result;
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): Map<string, Metric[]> {
    return this.getMetricsByCategory('system');
  }

  /**
   * Get application metrics
   */
  getApplicationMetrics(): Map<string, Metric[]> {
    return this.getMetricsByCategory('application');
  }

  /**
   * Get business metrics
   */
  getBusinessMetrics(): Map<string, Metric[]> {
    return this.getMetricsByCategory('business');
  }

  /**
   * Record system metrics (CPU, Memory, etc.)
   */
  recordSystemMetrics(cpu: number, memory: number, disk: number): void {
    this.recordMetric('system.cpu.usage', cpu, 'gauge', 'system', { unit: 'percent' });
    this.recordMetric('system.memory.usage', memory, 'gauge', 'system', { unit: 'percent' });
    this.recordMetric('system.disk.usage', disk, 'gauge', 'system', { unit: 'percent' });
  }

  /**
   * Record application metrics (requests, latency, etc.)
   */
  recordApplicationMetrics(requests: number, latency: number, errors: number): void {
    this.recordMetric('app.requests.count', requests, 'counter', 'application', { unit: 'requests' });
    this.recordMetric('app.latency.avg', latency, 'histogram', 'application', { unit: 'ms' });
    this.recordMetric('app.errors.count', errors, 'counter', 'application', { unit: 'errors' });
  }

  /**
   * Record business metrics (users, revenue, etc.)
   */
  recordBusinessMetrics(activeUsers: number, revenue: number, conversions: number): void {
    this.recordMetric('business.users.active', activeUsers, 'gauge', 'business', { unit: 'users' });
    this.recordMetric('business.revenue.total', revenue, 'counter', 'business', { unit: 'usd' });
    this.recordMetric('business.conversions.count', conversions, 'counter', 'business', { unit: 'conversions' });
  }

  /**
   * Start auto-cleanup of old metrics
   */
  private startAutoCleanup(): void {
    setInterval(() => {
      this.cleanupOldMetrics();
    }, this.retentionPeriod);

    logger.info('Auto-cleanup enabled', {
      context: 'metrics',
      metadata: {
        retentionPeriod: this.retentionPeriod
      }
    });
  }

  /**
   * Cleanup old metrics
   */
  private cleanupOldMetrics(): number {
    const cutoff = Date.now() - this.retentionPeriod;
    let cleaned = 0;

    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp >= cutoff);
      const removed = metrics.length - filtered.length;
      
      if (removed > 0) {
        this.metrics.set(name, filtered);
        cleaned += removed;
      }
    }

    if (cleaned > 0) {
      logger.debug('Old metrics cleaned up', {
        context: 'metrics',
        metadata: { count: cleaned }
      });
    }

    return cleaned;
  }

  /**
   * Export metrics (for Prometheus, etc.)
   */
  exportMetrics(): string {
    let output = '';

    for (const [name, metrics] of this.metrics.entries()) {
      const latest = metrics[metrics.length - 1];
      if (latest) {
        const labels = Object.entries(latest.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        
        output += `${name}{${labels}} ${latest.value}\n`;
      }
    }

    return output;
  }

  /**
   * Get all aggregations
   */
  getAllAggregations(): Map<string, MetricAggregation> {
    return new Map(this.aggregations);
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.aggregations.clear();

    logger.info('Metrics reset', {
      context: 'metrics'
    });
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const metricsCount = this.metrics.size;
    const isHealthy = metricsCount > 0;

    logger.debug('Metrics collector health check', {
      context: 'metrics',
      metadata: {
        healthy: isHealthy,
        metricsCount
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const metricsCollectorService = new MetricsCollectorService();

export default metricsCollectorService;

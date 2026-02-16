/**
 * Performance Metrics Collector
 * Collects and exposes performance metrics for the Spartan Hub application
 */

import * as client from 'prom-client';
import { logger } from './logger';

// Create local metrics registry
export const metricsRegistry = new client.Registry();

// Predefined metrics for the application
export class PerformanceMetrics {
  // HTTP metrics
  static httpRequestDuration: client.Histogram<string>;
  static httpRequestTotal: client.Counter<string>;
  static httpResponseSize: client.Histogram<string>;
  static httpResponsesTotal: client.Counter<string>;

  // Database metrics
  static databaseQueriesTotal: client.Counter<string>;
  static databaseQueryDuration: client.Histogram<string>;

  // AI service metrics
  static aiRequestsTotal: client.Counter<string>;
  static aiRequestDuration: client.Histogram<string>;
  static aiErrorsTotal: client.Counter<string>;

  // Cache metrics
  static cacheHitsTotal: client.Counter<string>;
  static cacheMissesTotal: client.Counter<string>;

  // System metrics
  static processCpuSeconds: client.Gauge<string>;
  static processResidentMemory: client.Gauge<string>;
  static processHeapSize: client.Gauge<string>;

  // SLA metrics
  static slaUptimeGauge: client.Gauge<string>;
  static slaResponseTimeGauge: client.Gauge<string>;
  static slaErrorRateGauge: client.Gauge<string>;
  static slaThroughputGauge: client.Gauge<string>;

  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      return; // Already initialized
    }
    
    try {
      // HTTP request metrics
      this.httpRequestDuration = new client.Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'path', 'status_code'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [metricsRegistry]
      });

      this.httpRequestTotal = new client.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'path'],
        registers: [metricsRegistry]
      });

      this.httpResponseSize = new client.Histogram({
        name: 'http_response_size_bytes',
        help: 'HTTP response sizes in bytes',
        labelNames: ['method', 'path'],
        buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
        registers: [metricsRegistry]
      });

      this.httpResponsesTotal = new client.Counter({
        name: 'http_responses_total',
        help: 'Total number of HTTP responses by status code',
        labelNames: ['method', 'path', 'status_code'],
        registers: [metricsRegistry]
      });

      // Database metrics
      this.databaseQueriesTotal = new client.Counter({
        name: 'database_queries_total',
        help: 'Total number of database queries',
        labelNames: ['type', 'table'],
        registers: [metricsRegistry]
      });

      this.databaseQueryDuration = new client.Histogram({
        name: 'database_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['type', 'table'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        registers: [metricsRegistry]
      });

      // AI service metrics
      this.aiRequestsTotal = new client.Counter({
        name: 'ai_requests_total',
        help: 'Total number of AI service requests',
        labelNames: ['endpoint', 'model'],
        registers: [metricsRegistry]
      });

      this.aiRequestDuration = new client.Histogram({
        name: 'ai_request_duration_seconds',
        help: 'AI service request duration in seconds',
        labelNames: ['endpoint', 'model'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 15, 20, 30, 60],
        registers: [metricsRegistry]
      });

      this.aiErrorsTotal = new client.Counter({
        name: 'ai_errors_total',
        help: 'Total number of AI service errors',
        labelNames: ['endpoint', 'error_type'],
        registers: [metricsRegistry]
      });

      // Cache metrics
      this.cacheHitsTotal = new client.Counter({
        name: 'cache_hits_total',
        help: 'Total number of cache hits',
        labelNames: ['cache_type', 'key'],
        registers: [metricsRegistry]
      });

      this.cacheMissesTotal = new client.Counter({
        name: 'cache_misses_total',
        help: 'Total number of cache misses',
        labelNames: ['cache_type', 'key'],
        registers: [metricsRegistry]
      });

      // System metrics
      this.processCpuSeconds = new client.Gauge({
        name: 'process_cpu_seconds_total',
        help: 'Total user and system CPU time spent in seconds',
        registers: [metricsRegistry]
      });

      this.processResidentMemory = new client.Gauge({
        name: 'process_resident_memory_bytes',
        help: 'Resident memory size in bytes',
        registers: [metricsRegistry]
      });

      this.processHeapSize = new client.Gauge({
        name: 'process_heap_bytes',
        help: 'Process heap size in bytes',
        registers: [metricsRegistry]
      });

      // SLA metrics
      this.slaUptimeGauge = new client.Gauge({
        name: 'sla_uptime_percentage',
        help: 'Current uptime percentage for SLA compliance',
        registers: [metricsRegistry]
      });

      this.slaResponseTimeGauge = new client.Gauge({
        name: 'sla_response_time_seconds',
        help: 'Current response time for SLA compliance (P95)',
        registers: [metricsRegistry]
      });

      this.slaErrorRateGauge = new client.Gauge({
        name: 'sla_error_rate_percentage',
        help: 'Current error rate percentage for SLA compliance',
        registers: [metricsRegistry]
      });

      this.slaThroughputGauge = new client.Gauge({
        name: 'sla_throughput_requests_per_second',
        help: 'Current throughput for SLA compliance',
        registers: [metricsRegistry]
      });

      // Register default metrics with unique prefix to avoid conflicts
      client.collectDefaultMetrics({
        register: metricsRegistry,
        prefix: 'spartan_hub_'
      });

      this.initialized = true;
    } catch (error) {
      logger.warn('Metrics initialization failed, continuing without metrics', {
        context: 'metrics',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  // HTTP metrics
  static recordHttpRequest(method: string, path: string, statusCode: number): void {
    this.httpRequestTotal.inc({ method, path });
    this.httpResponsesTotal.inc({ method, path, status_code: statusCode });
  }

  static recordHttpRequestDuration(method: string, path: string, duration: number, statusCode: number = 200): void {
    this.httpRequestDuration.observe({ method, path, status_code: statusCode }, duration);
  }

  static recordHttpResponseSize(method: string, path: string, size: number): void {
    this.httpResponseSize.observe({ method, path }, size);
  }

  // Database metrics
  static recordDatabaseQuery(queryType: string, table: string = 'unknown'): void {
    this.databaseQueriesTotal.inc({ type: queryType, table });
  }

  static recordDatabaseQueryDuration(queryType: string, duration: number, table: string = 'unknown'): void {
    this.databaseQueryDuration.observe({ type: queryType, table }, duration);
  }

  // AI service metrics
  static recordAiRequest(endpoint: string, model: string = 'default'): void {
    this.aiRequestsTotal.inc({ endpoint, model });
  }

  static recordAiRequestDuration(endpoint: string, duration: number, model: string = 'default'): void {
    this.aiRequestDuration.observe({ endpoint, model }, duration);
  }

  static recordAiError(endpoint: string, errorType: string): void {
    this.aiErrorsTotal.inc({ endpoint, error_type: errorType });
  }

  // Cache metrics
  static recordCacheHit(cacheType: string, key: string): void {
    this.cacheHitsTotal.inc({ cache_type: cacheType, key });
  }

  static recordCacheMiss(cacheType: string, key: string): void {
    this.cacheMissesTotal.inc({ cache_type: cacheType, key });
  }

  // System metrics
  static updateSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    
    this.processCpuSeconds.set(process.cpuUsage().system / 1000000);
    this.processResidentMemory.set(memoryUsage.rss);
    this.processHeapSize.set(memoryUsage.heapUsed);
  }

  // SLA metrics
  static updateSlaUptime(uptimePercentage: number): void {
    this.slaUptimeGauge.set(uptimePercentage);
  }

  static updateSlaResponseTime(responseTimeSeconds: number): void {
    this.slaResponseTimeGauge.set(responseTimeSeconds);
  }

  static updateSlaErrorRate(errorRatePercentage: number): void {
    this.slaErrorRateGauge.set(errorRatePercentage);
  }

  static updateSlaThroughput(rps: number): void {
    this.slaThroughputGauge.set(rps);
  }

  // Get metrics in Prometheus format
  static getMetrics(): Promise<string> {
    return client.register.metrics();
  }
}



// Lazy initialization - only initialize when first accessed
let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    PerformanceMetrics.initialize();
    initialized = true;

    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => {
        PerformanceMetrics.updateSystemMetrics();
      }, 30000);
    }
  }
}

// Export a getter that ensures initialization
export const getPerformanceMetrics = () => {
  ensureInitialized();
  return PerformanceMetrics;
};

export default {
  metricsRegistry,
  PerformanceMetrics
};

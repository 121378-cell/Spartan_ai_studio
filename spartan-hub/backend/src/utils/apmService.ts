/**
 * Application Performance Monitoring (APM) Integration
 * Integrates Prometheus metrics collection with Express application
 */

import express from 'express';
import client from 'prom-client';
import { logger } from '../utils/logger';
import { alertService, AlertType, AlertSeverity } from '../services/alertService';

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'spartan-hub-backend'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // buckets for response time from 0.1ms to 10s
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});

const databaseQueriesTotal = new client.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active HTTP connections'
});

const cacheHitRatio = new client.Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio percentage'
});

const aiApiCalls = new client.Counter({
  name: 'ai_api_calls_total',
  help: 'Total number of AI API calls',
  labelNames: ['service', 'model', 'status']
});

const aiApiDuration = new client.Histogram({
  name: 'ai_api_duration_seconds',
  help: 'Duration of AI API calls in seconds',
  labelNames: ['service', 'model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(databaseQueryDuration);
register.registerMetric(databaseQueriesTotal);
register.registerMetric(activeConnections);
register.registerMetric(cacheHitRatio);
register.registerMetric(aiApiCalls);
register.registerMetric(aiApiDuration);

class APMService {
  private static instance: APMService;
  private connectionCount: number = 0;

  private constructor() {}

  static getInstance(): APMService {
    if (!APMService.instance) {
      APMService.instance = new APMService();
    }
    return APMService.instance;
  }

  /**
   * Initialize APM middleware for Express app
   */
  initialize(app: express.Application): void {
    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        logger.error('Failed to collect metrics', {
          context: 'apm',
          error: error as Error
        });
        res.status(500).end();
      }
    });

    // HTTP request monitoring middleware
    app.use(this.httpMonitoringMiddleware.bind(this));

    logger.info('APM service initialized', { context: 'apm' });
  }

  /**
   * Middleware to monitor HTTP requests
   */
  private httpMonitoringMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const startTime = Date.now();
    const route = this.getRoutePattern(req);

    // Track active connections
    this.connectionCount++;
    activeConnections.set(this.connectionCount);

    // Capture response finish to record metrics
    const originalSend = res.send;
    res.send = (body: any) => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      
      // Record metrics
      httpRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
      httpRequestTotal.labels(req.method, route, res.statusCode.toString()).inc();
      
      // Decrease active connections
      this.connectionCount = Math.max(0, this.connectionCount - 1);
      activeConnections.set(this.connectionCount);
      
      return originalSend.call(res, body);
    };

    next();
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(operation: string, table: string, durationMs: number): void {
    const duration = durationMs / 1000; // Convert to seconds
    databaseQueryDuration.labels(operation, table).observe(duration);
    databaseQueriesTotal.labels(operation, table).inc();
  }

  /**
   * Record cache metrics
   */
  recordCacheHit(hit: boolean): void {
    // This would be called from the caching layer
    // Implementation would track hits/misses and calculate ratio
  }

  /**
   * Record AI API call metrics and check for performance/error thresholds
   */
  recordAiApiCall(service: string, model: string, status: string, durationMs: number): void {
    const duration = durationMs / 1000; // Convert to seconds
    aiApiCalls.labels(service, model, status).inc();
    aiApiDuration.labels(service, model).observe(duration);

    // Monitor for errors
    if (status === 'error') {
      alertService.createAlert(
        AlertType.AI_SERVICE_FAILURE,
        AlertSeverity.HIGH,
        `AI Service Failure detected in ${service} (${model})`,
        'apm',
        { service, model, durationMs }
      );
    }

    // Monitor for performance degradation
    if (durationMs > 5000) { // 5 second threshold for AI operations
      alertService.createAlert(
        AlertType.PERFORMANCE_DEGRADATION,
        AlertSeverity.MEDIUM,
        `High AI latency detected in ${service}: ${durationMs}ms`,
        'apm',
        { service, model, durationMs }
      );
    }
  }

  /**
   * Get normalized route pattern for consistent labeling
   */
  private getRoutePattern(req: express.Request): string {
    // Extract route pattern instead of full URL for consistent labeling
    if (req.route?.path) {
      return req.baseUrl + req.route.path;
    }
    
    // Fallback to URL path for cases where route is not available
    return req.path;
  }

  /**
   * Get current metrics registry
   */
  getRegistry(): client.Registry {
    return register;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    register.clear();
    client.collectDefaultMetrics({ register });
    // Re-register custom metrics
    register.registerMetric(httpRequestDuration);
    register.registerMetric(httpRequestTotal);
    register.registerMetric(databaseQueryDuration);
    register.registerMetric(databaseQueriesTotal);
    register.registerMetric(activeConnections);
    register.registerMetric(cacheHitRatio);
    register.registerMetric(aiApiCalls);
    register.registerMetric(aiApiDuration);
  }
}

// Export singleton instance
export const apmService = APMService.getInstance();

// Export metrics for direct access
export {
  httpRequestDuration,
  httpRequestTotal,
  databaseQueryDuration,
  databaseQueriesTotal,
  activeConnections,
  cacheHitRatio,
  aiApiCalls,
  aiApiDuration
};
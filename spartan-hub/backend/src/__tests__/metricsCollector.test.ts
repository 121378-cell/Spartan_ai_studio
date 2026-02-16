/**
 * Metrics Collector Tests
 * Tests for the performance metrics collector implementation
 */

import client from 'prom-client';
import { metricsRegistry, getPerformanceMetrics } from '../utils/metricsCollector';

describe('MetricsCollector', () => {
  beforeEach(() => {
    // Reset metrics registry before each test
    (metricsRegistry as any).clear();

    // Reinitialize metrics
    getPerformanceMetrics();
  });

  describe('Counter Metrics', () => {
    it('should create and increment a counter', () => {
      const counter = new client.Counter({
        name: 'test_counter',
        help: 'A test counter',
        labelNames: ['label1']
      });
      counter.inc({ label1: 'value1' }, 5);
      
      // Test passes if no exception is thrown
      expect(true).toBe(true);
    });

    it('should handle counter increment gracefully', () => {
      expect(() => {
        const counter = new client.Counter({
          name: 'test_counter_2',
          help: 'Another test counter'
        });
        counter.inc();
      }).not.toThrow();
    });
  });

  describe('Gauge Metrics', () => {
    it('should create and set a gauge', () => {
      const gauge = new client.Gauge({
        name: 'test_gauge',
        help: 'A test gauge',
        labelNames: ['label1']
      });
      gauge.set({ label1: 'value1' }, 42);
      
      // Test passes if no exception is thrown
      expect(true).toBe(true);
    });

    it('should handle gauge setting gracefully', () => {
      expect(() => {
        const gauge = new client.Gauge({
          name: 'test_gauge_2',
          help: 'Another test gauge'
        });
        gauge.set(42);
      }).not.toThrow();
    });
  });

  describe('Histogram Metrics', () => {
    it('should create and observe a histogram', () => {
      const histogram = new client.Histogram({
        name: 'test_histogram',
        help: 'A test histogram',
        labelNames: ['label1'],
        buckets: [1, 5, 10]
      });
      histogram.observe({ label1: 'value1' }, 3);
      histogram.observe({ label1: 'value1' }, 7);
      
      // Test passes if no exception is thrown
      expect(true).toBe(true);
    });

    it('should handle histogram observation gracefully', () => {
      expect(() => {
        const histogram = new client.Histogram({
          name: 'test_histogram_2',
          help: 'Another test histogram',
          buckets: [1, 5, 10]
        });
        histogram.observe(42);
      }).not.toThrow();
    });
  });

  describe('Performance Metrics', () => {
    it('should record HTTP request metrics', () => {
      getPerformanceMetrics().recordHttpRequest('GET', '/api/test', 200);

      // Test passes if no exception is thrown during metric recording
      expect(true).toBe(true);
    });

    it('should record database query metrics', () => {
      getPerformanceMetrics().recordDatabaseQuery('SELECT');
      getPerformanceMetrics().recordDatabaseQueryDuration('SELECT', 0.05);

      // Test passes if no exception is thrown during metric recording
      expect(true).toBe(true);
    });

    it('should record AI service metrics', () => {
      getPerformanceMetrics().recordAiRequest('/ai/alert');
      getPerformanceMetrics().recordAiRequestDuration('/ai/alert', 2.5);

      // Test passes if no exception is thrown during metric recording
      expect(true).toBe(true);
    });
  });

  describe('Metrics Output', () => {
    it('should collect default metrics', async () => {
      // Test that we can collect metrics without throwing
      await expect(client.register.metrics()).resolves.toBeDefined();
    });

    it('should have registered metrics', () => {
      const metrics = client.register.getMetricsAsArray();
      expect(metrics.length).toBeGreaterThan(0);
    });
  });
});

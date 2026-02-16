/**
 * Sanitization Monitor Tests
 * Tests for the sanitization monitoring and metrics collection system
 */

import { sanitizationMonitor, type SanitizationMetrics, type SanitizationEvent } from '../utils/sanitizationMonitor';

describe('Sanitization Monitor', () => {
  beforeEach(() => {
    sanitizationMonitor.resetMetrics();
  });

  describe('Basic Metrics Tracking', () => {
    test('should track total operations', () => {
      sanitizationMonitor.recordOperation('name', 10, 5, 'success');
      sanitizationMonitor.recordOperation('description', 20, 8, 'success');
      
      const metrics = sanitizationMonitor.getMetrics();
      expect(metrics.totalOperations).toBe(2);
    });

    test('should track field type distribution', () => {
      sanitizationMonitor.recordOperation('name', 10, 5, 'success');
      sanitizationMonitor.recordOperation('name', 15, 6, 'success');
      sanitizationMonitor.recordOperation('description', 20, 8, 'success');
      
      const fieldTypes = sanitizationMonitor.getFieldTypeDistribution();
      expect(fieldTypes.name).toBe(2);
      expect(fieldTypes.description).toBe(1);
    });

    test('should calculate average processing time', () => {
      sanitizationMonitor.recordOperation('name', 10, 10, 'success');
      sanitizationMonitor.recordOperation('name', 15, 20, 'success');
      
      const metrics = sanitizationMonitor.getMetrics();
      expect(metrics.averageProcessingTime).toBe(15); // (10 + 20) / 2
    });
  });

  describe('Error and Security Tracking', () => {
    test('should track errors', () => {
      sanitizationMonitor.recordOperation('name', 10, 5, 'error');
      sanitizationMonitor.recordOperation('name', 15, 6, 'success');
      
      const metrics = sanitizationMonitor.getMetrics();
      expect(metrics.errors).toBe(1);
    });

    test('should track bypass attempts', () => {
      sanitizationMonitor.recordOperation('name', 10, 5, 'bypass_attempt', ['XSS attempt detected']);
      sanitizationMonitor.recordOperation('name', 15, 6, 'success');
      
      const metrics = sanitizationMonitor.getMetrics();
      expect(metrics.bypassAttempts).toBe(1);
    });

    test('should detect security threats', () => {
      const threats = ['XSS attempt detected', 'SQL injection pattern'];
      sanitizationMonitor.recordOperation('name', 100, 15, 'bypass_attempt', threats);
      
      const recentEvents = sanitizationMonitor.getRecentEvents(1);
      expect(recentEvents[0].detectedThreats).toEqual(threats);
    });
  });

  describe('Event History', () => {
    test('should maintain event history', () => {
      // Record multiple events
      for (let i = 0; i < 5; i++) {
        sanitizationMonitor.recordOperation('name', 10 + i, 5 + i, 'success');
      }
      
      const recentEvents = sanitizationMonitor.getRecentEvents(3);
      expect(recentEvents).toHaveLength(3);
      expect(recentEvents[0].fieldType).toBe('name');
    });

    test('should respect maximum event buffer size', () => {
      // Record more events than typical buffer size
      for (let i = 0; i < 150; i++) {
        sanitizationMonitor.recordOperation('name', 10, 5, 'success');
      }
      
      const recentEvents = sanitizationMonitor.getRecentEvents(200);
      expect(recentEvents.length).toBeGreaterThan(50); // Should maintain reasonable history
    });
  });

  describe('Security Issue Detection', () => {
    test('should detect high error rates', () => {
      // Record 101 operations with 20 errors (~20% error rate)
      for (let i = 0; i < 81; i++) {
        sanitizationMonitor.recordOperation('name', 10, 5, 'success');
      }
      for (let i = 0; i < 20; i++) {
        sanitizationMonitor.recordOperation('name', 10, 5, 'error');
      }
      
      const issues = sanitizationMonitor.detectSecurityIssues();
      expect(issues.some(issue => issue.includes('High error rate'))).toBeTruthy();
    });

    test('should detect multiple bypass attempts', () => {
      // Record multiple bypass attempts
      for (let i = 0; i < 15; i++) {
        sanitizationMonitor.recordOperation('name', 10, 5, 'bypass_attempt', ['XSS detected']);
      }
      
      const issues = sanitizationMonitor.detectSecurityIssues();
      expect(issues.some(issue => issue.includes('bypass attempts detected'))).toBeTruthy();
    });

    test('should detect slow processing times', () => {
      sanitizationMonitor.recordOperation('name', 10, 150, 'success');
      sanitizationMonitor.recordOperation('name', 10, 120, 'success');
      
      const issues = sanitizationMonitor.detectSecurityIssues();
      expect(issues.some(issue => issue.includes('Slow average processing time'))).toBeTruthy();
    });
  });

  describe('Security Report Generation', () => {
    test('should generate comprehensive security report', () => {
      // Setup test data
      sanitizationMonitor.recordOperation('name', 10, 5, 'success');
      sanitizationMonitor.recordOperation('description', 20, 8, 'bypass_attempt', ['XSS detected']);
      sanitizationMonitor.recordOperation('content', 30, 12, 'error');
      
      const report = sanitizationMonitor.generateSecurityReport();
      
      expect(report.metrics).toBeDefined();
      expect(report.securityIssues).toBeDefined();
      expect(report.recentEvents).toBeDefined();
      expect(report.fieldTypeAnalysis).toBeDefined();
      
      // Check that field type analysis includes all field types
      expect(Object.keys(report.fieldTypeAnalysis)).toContain('name');
      expect(Object.keys(report.fieldTypeAnalysis)).toContain('description');
      expect(Object.keys(report.fieldTypeAnalysis)).toContain('content');
    });

    test('should include field type analysis in report', () => {
      // Record multiple operations of same type
      for (let i = 0; i < 10; i++) {
        sanitizationMonitor.recordOperation('name', 15, 5 + i, 'success');
      }
      
      const report = sanitizationMonitor.generateSecurityReport();
      const nameAnalysis = report.fieldTypeAnalysis.name;
      
      expect(nameAnalysis.count).toBe(10);
      expect(nameAnalysis.avgProcessingTime).toBeCloseTo(9.5, 1); // Average of 5-14
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle high volume operations efficiently', () => {
      const startTime = Date.now();
      
      // Record 1000 operations
      for (let i = 0; i < 1000; i++) {
        sanitizationMonitor.recordOperation('name', 10, 2, 'success');
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 500ms for 1000 operations)
      expect(totalTime).toBeLessThan(500);
      
      const metrics = sanitizationMonitor.getMetrics();
      expect(metrics.totalOperations).toBe(1000);
    });

    test('should maintain memory efficiency', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Record many operations
      for (let i = 0; i < 5000; i++) {
        sanitizationMonitor.recordOperation('name', 10, 1, 'success');
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for 5000 operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Reset Functionality', () => {
    test('should reset all metrics', () => {
      // Setup some data
      sanitizationMonitor.recordOperation('name', 10, 5, 'success');
      sanitizationMonitor.recordOperation('name', 10, 5, 'error');
      
      // Reset
      sanitizationMonitor.resetMetrics();
      
      // Verify reset
      const metrics = sanitizationMonitor.getMetrics();
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.fieldTypes).toEqual({});
      
      const events = sanitizationMonitor.getRecentEvents();
      expect(events).toHaveLength(0);
    });
  });
});
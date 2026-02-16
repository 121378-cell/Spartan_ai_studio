/**
 * Sanitization Metrics Collector
 * Tracks and monitors input sanitization performance and security events
 */

import { logger } from '../utils/logger';

interface SanitizationMetrics {
  totalOperations: number;
  fieldTypes: Record<string, number>;
  averageProcessingTime: number;
  errors: number;
  bypassAttempts: number;
  memoryUsage: number;
}

interface SanitizationEvent {
  timestamp: Date;
  fieldType: string;
  inputSize: number;
  processingTime: number;
  result: 'success' | 'error' | 'bypass_attempt';
  detectedThreats?: string[];
}

class SanitizationMonitor {
  private metrics: SanitizationMetrics = {
    totalOperations: 0,
    fieldTypes: {},
    averageProcessingTime: 0,
    errors: 0,
    bypassAttempts: 0,
    memoryUsage: 0
  };

  private events: SanitizationEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events

  /**
   * Record a sanitization operation
   */
  recordOperation(
    fieldType: string,
    inputSize: number,
    processingTime: number,
    result: 'success' | 'error' | 'bypass_attempt',
    detectedThreats?: string[]
  ): void {
    // Update counters
    this.metrics.totalOperations++;
    this.metrics.fieldTypes[fieldType] = (this.metrics.fieldTypes[fieldType] || 0) + 1;

    if (result === 'error') {
      this.metrics.errors++;
    } else if (result === 'bypass_attempt') {
      this.metrics.bypassAttempts++;
    }

    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalOperations - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalOperations;

    // Update memory usage
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;

    // Record event
    const event: SanitizationEvent = {
      timestamp: new Date(),
      fieldType,
      inputSize,
      processingTime,
      result,
      detectedThreats
    };

    this.events.push(event);
    
    // Maintain event buffer size
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Log security events
    if (result === 'bypass_attempt' || (detectedThreats && detectedThreats.length > 0)) {
      logger.warn('Security event detected during sanitization', {
        context: 'sanitization-security',
        metadata: {
          fieldType,
          inputSize,
          processingTime,
          detectedThreats,
          timestamp: event.timestamp.toISOString()
        }
      });
    }

    // Periodic metrics logging
    if (this.metrics.totalOperations % 100 === 0) {
      this.logPeriodicMetrics();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): SanitizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 50): SanitizationEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get field type distribution
   */
  getFieldTypeDistribution(): Record<string, number> {
    return { ...this.metrics.fieldTypes };
  }

  /**
   * Reset metrics (for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      fieldTypes: {},
      averageProcessingTime: 0,
      errors: 0,
      bypassAttempts: 0,
      memoryUsage: 0
    };
    this.events = [];
  }

  /**
   * Log periodic metrics summary
   */
  private logPeriodicMetrics(): void {
    const successRate = ((this.metrics.totalOperations - this.metrics.errors - this.metrics.bypassAttempts) / this.metrics.totalOperations * 100).toFixed(2);
    
    logger.info('Sanitization metrics summary', {
      context: 'sanitization-monitoring',
      metadata: {
        totalOperations: this.metrics.totalOperations,
        successRate: `${successRate}%`,
        averageProcessingTime: `${this.metrics.averageProcessingTime.toFixed(2)}ms`,
        errors: this.metrics.errors,
        bypassAttempts: this.metrics.bypassAttempts,
        memoryUsage: `${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        fieldTypes: this.metrics.fieldTypes
      }
    });
  }

  /**
   * Detect potential security issues
   */
  detectSecurityIssues(): string[] {
    const issues: string[] = [];

    // High error rate
    if (this.metrics.totalOperations > 100) {
      const errorRate = (this.metrics.errors / this.metrics.totalOperations) * 100;
      if (errorRate > 5) {
        issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
      }
    }

    // High bypass attempt rate
    if (this.metrics.bypassAttempts > 10) {
      issues.push(`Multiple bypass attempts detected: ${this.metrics.bypassAttempts}`);
    }

    // Slow processing times
    if (this.metrics.averageProcessingTime > 100) {
      issues.push(`Slow average processing time: ${this.metrics.averageProcessingTime.toFixed(2)}ms`);
    }

    // Memory pressure
    if (this.metrics.memoryUsage > 500 * 1024 * 1024) { // 500MB
      issues.push(`High memory usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    return issues;
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): {
    metrics: SanitizationMetrics;
    securityIssues: string[];
    recentEvents: SanitizationEvent[];
    fieldTypeAnalysis: Record<string, {
      count: number;
      avgProcessingTime: number;
      errorRate: number;
    }>;
    } {
    const issues = this.detectSecurityIssues();
    const recentEvents = this.getRecentEvents(100);
    
    // Analyze field types
    const fieldTypeAnalysis: Record<string, any> = {};
    const fieldEvents = this.events.reduce((acc, event) => {
      if (!acc[event.fieldType]) {
        acc[event.fieldType] = { events: [], totalTime: 0, errors: 0 };
      }
      acc[event.fieldType].events.push(event);
      acc[event.fieldType].totalTime += event.processingTime;
      if (event.result === 'error') {
        acc[event.fieldType].errors++;
      }
      return acc;
    }, {} as Record<string, { events: SanitizationEvent[]; totalTime: number; errors: number }>);

    Object.keys(fieldEvents).forEach(fieldType => {
      const data = fieldEvents[fieldType];
      fieldTypeAnalysis[fieldType] = {
        count: data.events.length,
        avgProcessingTime: data.totalTime / data.events.length,
        errorRate: (data.errors / data.events.length) * 100
      };
    });

    return {
      metrics: this.getMetrics(),
      securityIssues: issues,
      recentEvents,
      fieldTypeAnalysis
    };
  }
}

// Singleton instance
export const sanitizationMonitor = new SanitizationMonitor();

// Export types
export type { SanitizationMetrics, SanitizationEvent };
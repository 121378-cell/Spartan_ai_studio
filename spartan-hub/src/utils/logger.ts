/**
 * Frontend Structured Logger Utility
 * Provides consistent, structured logging for the Spartan Hub frontend application
 * Matches the backend logger implementation patterns for consistency
 */

import { v4 as uuidv4 } from 'uuid';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  stack?: string;
  duration?: number;
}

// Logger configuration
interface LoggerConfig {
  level: LogLevel;
  service: string;
  enableConsole: boolean;
  enableNetwork: boolean; // Whether to send logs to backend for persistence
  networkEndpoint?: string; // Endpoint to send logs to backend
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  service: 'spartan-hub-frontend',
  enableConsole: true,
  enableNetwork: false, // Disabled by default to avoid overwhelming backend
  networkEndpoint: '/api/logs'
};

export class FrontendStructuredLogger {
  private config: LoggerConfig;
  private correlationId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.correlationId = uuidv4(); // Initialize with a default correlation ID
  }

  /**
   * Check if a log level should be logged based on the configured level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);

    return logLevelIndex <= currentLevelIndex;
  }

  /**
   * Sanitize sensitive data from metadata
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    if (!metadata) return metadata;

    const sanitized: Record<string, any> = {};
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization', 'auth', 'api_key', 'apiKey', 'pwd', 'pass', 'credential', 'credentials', 'email', 'phone', 'ssn', 'creditCard'
    ];

    for (const [key, value] of Object.entries(metadata)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Send log entry to network endpoint if enabled
   */
  private async sendToNetwork(entry: LogEntry): Promise<void> {
    if (!this.config.enableNetwork || !this.config.networkEndpoint) return;

    try {
      // Use fetch to send log to backend
      await fetch(this.config.networkEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // If network logging fails, at least log to console as fallback
      if (this.config.enableConsole) {
        console.error('Failed to send log to network:', error);
      }
    }
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, message: string, options: Partial<LogEntry> = {}): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.config.service,
      correlationId: options.correlationId || this.correlationId,
      ...options
    };

    // Sanitize metadata before logging
    if (entry.metadata) {
      entry.metadata = this.sanitizeMetadata(entry.metadata);
    }

    // Write to console
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // Send to network if enabled
    if (this.config.enableNetwork) {
      // Send to network asynchronously to avoid blocking the main thread
      this.sendToNetwork(entry).catch(error => {
        console.error('Error sending log to network:', error);
      });
    }
  }

  /**
   * Write log entry to console
   */
  private writeToConsole(entry: LogEntry): void {
    const logMessage = `[${entry.level.toUpperCase()}] ${entry.message}`;
    const fullLogMessage = entry.metadata ? `${logMessage} ${JSON.stringify(entry.metadata)}` : logMessage;

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(fullLogMessage, { ...entry, metadata: entry.metadata || undefined });
        break;
      case LogLevel.WARN:
        console.warn(fullLogMessage, { ...entry, metadata: entry.metadata || undefined });
        break;
      case LogLevel.INFO:
        console.info(fullLogMessage, { ...entry, metadata: entry.metadata || undefined });
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.debug(fullLogMessage, { ...entry, metadata: entry.metadata || undefined });
        break;
    }
  }

  /**
   * Set the correlation ID for the current context
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get the current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Create a child logger with a specific correlation ID
   */
  child(options: Partial<LogEntry> = {}): FrontendStructuredLogger {
    const childLogger = new FrontendStructuredLogger(this.config);
    if (options.correlationId) {
      childLogger.setCorrelationId(options.correlationId);
    } else if (this.correlationId) {
      childLogger.setCorrelationId(this.correlationId);
    }
    return childLogger;
  }

  /**
   * Log an error message
   */
  error(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.ERROR, message, options);
  }

  /**
   * Log a warning message
   */
  warn(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.WARN, message, options);
  }

  /**
   * Log an info message
   */
  info(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, message, options);
  }

  /**
   * Log a debug message
   */
  debug(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  /**
   * Log a trace message
   */
  trace(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.TRACE, message, options);
  }

  /**
   * Log an error with stack trace
   */
  errorWithStack(message: string, error: Error, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.ERROR, message, {
      ...options,
      stack: error.stack
    });
  }

  /**
   * Log a metric with timing information
   */
  metric(name: string, duration: number, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, `Metric: ${name}`, {
      ...options,
      duration,
      context: 'metric'
    });
  }

  /**
   * Log API performance metrics
   */
  logApiPerformance(endpoint: string, method: string, duration: number, status: number, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, `API Performance: ${method} ${endpoint}`, {
      ...options,
      context: 'api-performance',
      metadata: {
        ...options.metadata,
        endpoint,
        method,
        duration,
        status
      }
    });
  }

  /**
   * Log error rate metrics
   */
  logErrorRate(errorCount: number, totalCount: number, options: Partial<LogEntry> = {}): void {
    const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
    this.log(LogLevel.INFO, `Error Rate: ${errorRate.toFixed(2)}% (${errorCount}/${totalCount})`, {
      ...options,
      context: 'error-rate',
      metadata: {
        ...options.metadata,
        errorCount,
        totalCount,
        errorRate
      }
    });
  }

  /**
   * Log cache performance metrics
   */
  logCacheMetrics(hits: number, misses: number, hitRate: number, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, `Cache Metrics: Hit Rate ${hitRate.toFixed(2)}% (${hits}/${misses})`, {
      ...options,
      context: 'cache-performance',
      metadata: {
        ...options.metadata,
        hits,
        misses,
        hitRate
      }
    });
  }

  /**
   * Log application startup information
   */
  startup(options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, 'Frontend application started', {
      ...options,
      context: 'startup'
    });
  }

  /**
   * Log application shutdown information
   */
  shutdown(options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, 'Frontend application shutting down', {
      ...options,
      context: 'shutdown'
    });
  }
}

// Create default logger instance
export const logger = new FrontendStructuredLogger({
  level: (process.env.VITE_LOG_LEVEL as LogLevel) || LogLevel.INFO,
  service: 'spartan-hub-frontend',
  enableConsole: process.env.VITE_LOG_ENABLE_CONSOLE !== 'false',
  enableNetwork: process.env.VITE_LOG_ENABLE_NETWORK === 'true',
  networkEndpoint: process.env.VITE_LOG_NETWORK_ENDPOINT || '/api/logs'
});

export default logger;

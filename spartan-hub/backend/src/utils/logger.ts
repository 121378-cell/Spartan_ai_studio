/**
 * Structured Logger Utility
 * Provides consistent, structured logging for the Spartan Hub application
 */

import * as fs from 'fs';
import * as path from 'path';
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
  metadata?: Record<string, unknown>;
  stack?: string;
  duration?: number;
  error?: string | Error | Record<string, unknown>;
}

// Logger configuration
interface LoggerConfig {
  level: LogLevel;
  service: string;
  outputPath?: string;
  enableConsole: boolean;
  enableFile: boolean;
  maxFileSize?: number; // in MB
  maxFiles?: number; // maximum number of log files to keep
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  service: 'spartan-hub',
  enableConsole: true,
  enableFile: true,
  maxFileSize: 10, // 10MB
  maxFiles: 5 // Keep 5 log files
};

export class StructuredLogger {
  private config: LoggerConfig;
  private logFilePath?: string;
  private logFile?: fs.WriteStream;
  private startTime: number;
  private correlationId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    this.correlationId = uuidv4(); // Initialize with a default correlation ID
    
    // Set up file logging if enabled
    if (this.config.enableFile && this.config.outputPath) {
      this.setupFileLogging();
    }
  }

  /**
   * Set up file logging with rotation
   */
  private setupFileLogging(): void {
    if (!this.config.outputPath) return;
    
    // Create logs directory if it doesn't exist
    const logDir = path.dirname(this.config.outputPath);
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      // Use direct stderr write as a last resort since file logging setup failed
      process.stderr.write(`Failed to create log directory: ${error}\n`);
      return;
    }
    
    this.logFilePath = this.config.outputPath;
    this.logFile = fs.createWriteStream(this.logFilePath, { flags: 'a' });
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
   * Format log entry as JSON
   */
  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  /**
   * Write log entry to console
   */
  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;
    
    const timestamp = new Date(entry.timestamp).toISOString();
    const logMessage = `${timestamp} [${entry.level.toUpperCase()}] [${entry.service}] ${entry.message}`;
    
    const fullLogMessage = entry.metadata ? `${logMessage} ${JSON.stringify(entry.metadata)}` : logMessage;
    
    switch (entry.level) {
    case LogLevel.ERROR:
      console.error(fullLogMessage);
      break;
    case LogLevel.WARN:
      console.warn(fullLogMessage);
      break;
    case LogLevel.INFO:
      console.info(fullLogMessage);
      break;
    case LogLevel.DEBUG:
    case LogLevel.TRACE:
      console.debug(fullLogMessage);
      break;
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFile || !this.logFile) return;
    
    try {
      const formattedEntry = this.formatLogEntry(entry);
      this.logFile.write(`${formattedEntry  }\n`);
    } catch (error) {
      // Fallback to console if file writing fails
      // Use direct stderr write as a last resort since file logging failed
      process.stderr.write(`Failed to write to log file: ${error}\n`);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private rotateLogFile(): void {
    if (!this.logFilePath || !this.logFile || !this.config.maxFileSize) return;
    
    try {
      // Check if file exists before trying to stat it
      if (!fs.existsSync(this.logFilePath)) {
        return;
      }
      
      const stats = fs.statSync(this.logFilePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      if (fileSizeInMB > this.config.maxFileSize) {
        this.logFile.close();
        
        // Rotate existing files
        this.rotateExistingFiles();
        
        // Rename current log file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFileName = `${this.logFilePath}.${timestamp}`;
        fs.renameSync(this.logFilePath, rotatedFileName);
        
        // Create new log file
        this.logFile = fs.createWriteStream(this.logFilePath, { flags: 'a' });
      }
    } catch (error) {
      // Use direct stderr write as a last resort since log rotation failed
      process.stderr.write(`Failed to rotate log file: ${error}\n`);
    }
  }

  /**
   * Rotate existing log files to maintain maxFiles limit
   */
  private rotateExistingFiles(): void {
    if (!this.logFilePath || !this.config.maxFiles) return;
    
    try {
      const logDir = path.dirname(this.logFilePath);
      const logFilename = path.basename(this.logFilePath);
      
      // Check if directory exists
      if (!fs.existsSync(logDir)) {
        return;
      }
      
      const logFiles = fs.readdirSync(logDir)
        .filter(file => file.startsWith(logFilename) && file !== logFilename)
        .sort()
        .reverse();
      
      // Remove excess files
      if (logFiles.length >= this.config.maxFiles) {
        for (let i = this.config.maxFiles - 1; i < logFiles.length; i++) {
          const filePath = path.join(logDir, logFiles[i]);
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      // Use direct stderr write as a last resort since log rotation failed
      process.stderr.write(`Failed to rotate existing log files: ${error}\n`);
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
   * Sanitize sensitive data from metadata
   */
  private sanitizeMetadata(metadata: Record<string, unknown> | unknown): Record<string, unknown> | unknown {
    if (!metadata || typeof metadata !== 'object') return metadata;
    
    const sanitized: Record<string, unknown> = {};
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization', 'auth', 'api_key', 'apiKey', 'pwd', 'pass', 'credential', 'credentials',
      'email', 'phone', 'ssn', 'socialSecurity', 'creditCard', 'cardNumber', 'cvv', 'cvv2', 'cvc',
      'account', 'accountNumber', 'pin', 'securityCode', 'session', 'sessionId', 'refreshToken', 'bearerToken'
    ];
    
    for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively sanitize nested objects (but not arrays)
        sanitized[key] = this.sanitizeMetadata(value);
      } else if (Array.isArray(value)) {
        // Handle arrays by sanitizing object elements
        sanitized[key] = value.map(item => 
          typeof item === 'object' && item !== null && !Array.isArray(item) 
            ? this.sanitizeMetadata(item)
            : item
        );
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Create a child logger with a specific correlation ID
   */
  child(options: Partial<LogEntry> = {}): StructuredLogger {
    const childLogger = new StructuredLogger(this.config);
    if (options.correlationId) {
      childLogger.setCorrelationId(options.correlationId);
    } else if (this.correlationId) {
      childLogger.setCorrelationId(this.correlationId);
    }
    return childLogger;
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
      const sanitizedMetadata = this.sanitizeMetadata(entry.metadata);
      entry.metadata = sanitizedMetadata && typeof sanitizedMetadata === 'object' 
        ? sanitizedMetadata as Record<string, unknown> 
        : {};
    }
    
    // Write to console
    this.writeToConsole(entry);
    
    // Write to file
    this.writeToFile(entry);
    
    // Check if log file needs rotation
    if (this.config.enableFile && this.config.maxFileSize) {
      this.rotateLogFile();
    }
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
    const uptime = Date.now() - this.startTime;
    this.log(LogLevel.INFO, 'Application started', {
      ...options,
      context: 'startup',
      duration: uptime
    });
  }

  /**
   * Log application shutdown information
   */
  shutdown(options: Partial<LogEntry> = {}): void {
    const uptime = Date.now() - this.startTime;
    this.log(LogLevel.INFO, 'Application shutting down', {
      ...options,
      context: 'shutdown',
      duration: uptime
    });
  }

  /**
   * Close the logger and clean up resources
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.logFile) {
        this.logFile.end(resolve);
      } else {
        resolve();
      }
    });
  }
}

// Create default logger instance
export const logger = new StructuredLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  service: 'spartan-hub-backend',
  outputPath: process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs', 'application.log'),
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE === 'true', // Default to false in Docker environments
  maxFileSize: process.env.LOG_MAX_FILE_SIZE ? parseInt(process.env.LOG_MAX_FILE_SIZE, 10) : 10,
  maxFiles: process.env.LOG_MAX_FILES ? parseInt(process.env.LOG_MAX_FILES, 10) : 5
});

export default logger;
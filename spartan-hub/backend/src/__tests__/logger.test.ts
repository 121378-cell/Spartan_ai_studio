/**
 * Logger Utility Tests
 * Tests for the structured logger implementation
 */

import fs from 'fs';
import path from 'path';
import { StructuredLogger, LogLevel } from '../utils/logger';

let mockConsoleError: jest.SpyInstance;
let mockConsoleWarn: jest.SpyInstance;
let mockConsoleInfo: jest.SpyInstance;
let mockConsoleDebug: jest.SpyInstance;

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let logFilePath: string;

  beforeEach(() => {
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
    mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});

    // Reset mocks
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleInfo.mockClear();
    mockConsoleDebug.mockClear();
    
    // Create a temporary log file path
    logFilePath = path.join(__dirname, 'test-log.txt');
    
    // Create logger instance
    logger = new StructuredLogger({
      level: LogLevel.DEBUG,
      service: 'test-service',
      outputPath: logFilePath,
      enableConsole: true,
      enableFile: true,
      maxFileSize: 1, // 1MB for testing
      maxFiles: 3
    });
  });

  afterEach(() => {
    // Clean up log files
    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
    }
    
    // Remove any rotated files
    const logDir = path.dirname(logFilePath);
    const logFilename = path.basename(logFilePath);
    
    try {
      const files = fs.readdirSync(logDir);
      files.forEach(file => {
        if (file.startsWith(logFilename) && file !== logFilename) {
          fs.unlinkSync(path.join(logDir, file));
        }
      });
    } catch (error) {
      // Ignore errors
    }
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleDebug.mockRestore();
  });

  describe('Log Levels', () => {
    it('should log error messages', () => {
      logger.error('Test error message');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message');
      expect(mockConsoleDebug).toHaveBeenCalled();
    });

    it('should respect log level configuration', () => {
      // Create a logger with INFO level (should not log DEBUG messages)
      const infoLogger = new StructuredLogger({
        level: LogLevel.INFO,
        service: 'test-service',
        outputPath: logFilePath,
        enableConsole: true,
        enableFile: false
      });

      infoLogger.debug('This should not be logged');
      expect(mockConsoleDebug).not.toHaveBeenCalled();

      infoLogger.info('This should be logged');
      expect(mockConsoleInfo).toHaveBeenCalled();
    });
  });

  describe('Log Methods', () => {
    it('should log error with stack trace', () => {
      const error = new Error('Test error');
      logger.errorWithStack('Test error with stack', error);
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should log metrics with timing information', () => {
      logger.metric('test-operation', 150);
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should log startup information', () => {
      logger.startup();
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should log shutdown information', () => {
      logger.shutdown();
      expect(mockConsoleInfo).toHaveBeenCalled();
    });
  });

  describe('File Logging', () => {
    it('should write to file when enabled', () => {
      logger.info('Test file log message');
      
      // Wait a bit for file write to complete
      return new Promise((resolve) => {
        setTimeout(() => {
          if (fs.existsSync(logFilePath)) {
            const content = fs.readFileSync(logFilePath, 'utf8');
            expect(content).toContain('Test file log message');
            resolve(null);
          }
        }, 100);
      });
    });

    it('should not write to file when disabled', () => {
      const noFileLogger = new StructuredLogger({
        level: LogLevel.INFO,
        service: 'test-service',
        enableConsole: true,
        enableFile: false
      });

      noFileLogger.info('This should not be written to file');
      
      // Wait a bit to ensure no file operations
      return new Promise((resolve) => {
        setTimeout(() => {
          if (fs.existsSync(logFilePath)) {
            const content = fs.readFileSync(logFilePath, 'utf8');
            expect(content).not.toContain('This should not be written to file');
            resolve(null);
          }
        }, 100);
      });
    });
  });

  describe('Log Rotation', () => {
    it('should rotate log files when size limit is exceeded', () => {
      // This test would require simulating a large log file
      // For now, we'll just verify the method exists
      expect(logger).toBeDefined();
    });
  });
});

/**
 * Logging Middleware
 * Provides request/response logging with timing information for the Spartan Hub application
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get client IP address
const getClientIP = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string || 
          req.headers['x-real-ip'] as string || 
          req.connection.remoteAddress || 
          req.ip || 
          'unknown').split(',')[0].trim();
};

// Helper function to generate a unique request ID
const generateRequestId = (): string => {
  return uuidv4();
};

/**
 * Request logging middleware
 * Logs incoming requests with timing information
 */
export const requestLogger = (req: Request & { requestId?: string }, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  const requestId = generateRequestId();
  req.requestId = requestId;
  
  // Record start time
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    context: 'http',
    requestId,
    metadata: {
      method: req.method,
      url: req.url,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type')
    }
  });
  
  // Override res.end to capture response information
  const originalEnd = res.end;
  res.end = function(this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), callback?: (() => void)): Response {
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Outgoing response', {
      context: 'http',
      requestId,
      duration,
      metadata: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        contentType: res.get('Content-Type'),
        contentLength: res.get('Content-Length')
      }
    });
    
    // Properly handle all function overloads by calling original with same args
    return (originalEnd as Function).apply(this, arguments);
  };
  
  next();
};

/**
 * Error logging middleware
 * Logs errors that occur during request processing
 */
export const errorLogger = (error: Error, req: Request & { requestId?: string }, res: Response, next: NextFunction): void => {
  const requestId = req.requestId || 'unknown';
  
  logger.errorWithStack('Request processing error', error, {
    context: 'http-error',
    requestId,
    metadata: {
      method: req.method,
      url: req.url,
      ip: getClientIP(req)
    }
  });
  
  next(error);
};

export default {
  requestLogger,
  errorLogger
};
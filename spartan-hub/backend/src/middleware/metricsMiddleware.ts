/**
 * Metrics Middleware
 * Collects performance metrics for HTTP requests in the Spartan Hub application
 */

import { Request, Response, NextFunction } from 'express';
import { getPerformanceMetrics } from '../utils/metricsCollector';
import { logger } from '../utils/logger';

// Helper function to get response size
const getResponseSize = (res: Response): number => {
  const contentLength = res.get('Content-Length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  
  // If Content-Length is not set, we can't accurately measure
  // In a real implementation, you might want to capture the response body
  return 0;
};

// Helper function to normalize path for metrics
const normalizePath = (path: string): string => {
  // Remove UUIDs, IDs, and other variable parts from path
  return path
    .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(\/|$)/gi, '/:id$1') // UUIDs
    .replace(/\/\d+(\/|$)/g, '/:id$1') // Numeric IDs
    .replace(/\/[^\/]+@[^\s\/]+/g, '/:email') // Email-like patterns
    .replace(/\/[^\/]+\.[^\/]+$/g, '/:filename') // File names
    .toLowerCase();
};

/**
 * Metrics collection middleware
 * Collects HTTP request/response metrics
 */
export const metricsCollector = (req: Request, res: Response, next: NextFunction): void => {
  // Record start time
  const startTime = Date.now();
  
  // Normalize path for metrics
  const normalizedPath = normalizePath(req.path);
  
  // Record incoming request
  getPerformanceMetrics().recordHttpRequest(req.method, normalizedPath, 0);
  
  // Override res.end to capture response information
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), callback?: (() => void)) {
    // Calculate request duration in seconds
    const duration = (Date.now() - startTime) / 1000;
    
    // Get response size
    const responseSize = getResponseSize(res);
    
    // Record metrics
    getPerformanceMetrics().recordHttpRequestDuration(req.method, normalizedPath, duration);
    getPerformanceMetrics().recordHttpResponseSize(req.method, normalizedPath, responseSize);
    getPerformanceMetrics().recordHttpRequest(req.method, normalizedPath, res.statusCode);
    
    // Log performance metric
    logger.metric(`http_${req.method.toLowerCase()}_request`, duration, {
      context: 'performance',
      metadata: {
        path: normalizedPath,
        statusCode: res.statusCode,
        responseSize
      }
    });
    
    // Call original end method
    return (originalEnd as Function).apply(this, arguments);
  };
  
  next();
};

/**
 * Metrics endpoint middleware
 * Exposes metrics in Prometheus format
 */
export const metricsEndpoint = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Import here to avoid circular dependencies
    const { getPerformanceMetrics } = require('../utils/metricsCollector');

    res.set('Content-Type', 'text/plain; version=0.0.4');
    getPerformanceMetrics().getMetrics().then((metrics: string) => {
      res.send(metrics);
    }).catch((err: Error) => {
      logger.error('Failed to collect metrics', {
        context: 'metrics',
        metadata: {
          error: err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
        }
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to collect metrics'
      });
    });
  } catch (error: unknown) {
    logger.error('Failed to collect metrics', {
      context: 'metrics',
      metadata: {
        error: error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)
      }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to collect metrics'
    });
  }
};

export default {
  metricsCollector,
  metricsEndpoint
};
/**
 * Error Handling Middleware for Route Handlers
 * Provides standardized error handling for Express route handlers
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

/**
 * Wraps async route handlers with standardized error handling
 * @param handler The route handler to wrap
 * @returns Wrapped handler with error handling
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => Promise<unknown> {
  return async (req: Request, res: Response, _next: NextFunction): Promise<unknown> => {
    try {
      return await fn(req, res, _next);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code || 'VALIDATION_ERROR'
        });
      }

      if (error instanceof Error) {
        logger.error('Route handler error', {
          context: 'route',
          metadata: { error, path: req.path, method: req.method }
        });

        return res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }

      // Handle unknown error types
      logger.error('Unexpected error in route handler', {
        context: 'route',
        metadata: { error, path: req.path, method: req.method }
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Synchronous version of asyncHandler for non-async handlers
 * @param handler The route handler to wrap
 * @returns Wrapped handler with error handling
 */
export function syncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown
): (req: Request, res: Response, next: NextFunction) => unknown {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      fn(req, res, next);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: error.code || 'VALIDATION_ERROR'
        });
        return;
      }

      if (error instanceof Error) {
        logger.error('Route handler error', {
          context: 'route',
          metadata: { error, path: req.path, method: req.method }
        });

        res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
        return;
      }

      // Handle unknown error types
      logger.error('Unexpected error in route handler', {
        context: 'route',
        metadata: { error, path: req.path, method: req.method }
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
      return;
    }
  };
}

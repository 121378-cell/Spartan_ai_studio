/**
 * Tracing Middleware
 * Provides middleware functions for integrating OpenTelemetry tracing with Express applications
 */

import { Request, Response, NextFunction } from 'express';
import { tracingService } from '../utils/tracingService';
import { logger } from '../utils/logger';

/**
 * Middleware to create a root span for each incoming request
 */
export const tracingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const spanName = `${req.method} ${req.path}`;
  const attributes = {
    'http.method': req.method,
    'http.url': req.url,
    'http.user_agent': req.get('User-Agent') || '',
    'http.client_ip': req.ip || '',
    'service.name': 'spartan-hub-backend'
  };

  // Start a new span for the incoming request
  const span = tracingService.startSpan(spanName, attributes);

  if (span) {
    // Store the span in the request for later use
    (req as any).span = span;

    // Capture the original res.end to close the span when the response ends
    const originalEnd = res.end;
    res.end = function (chunk: any, encoding?: any, callback?: any) {
      // Add response attributes to the span
      span.setAttribute('http.status_code', res.statusCode);

      // End the span
      span.end();

      // Call the original end method
      return originalEnd.call(this, chunk, encoding, callback);
    };
  }

  next();
};

/**
 * Utility function to add attributes to the current request span
 */
export const addSpanAttribute = (req: Request, key: string, value: string | number | boolean): void => {
  const {span} = (req as any);
  if (span) {
    span.setAttribute(key, value);
  } else {
    // If no request span exists, add to the current active span
    tracingService.addAttributes({ [key]: value });
  }
};

/**
 * Utility function to add an event to the current request span
 */
export const addSpanEvent = (req: Request, eventName: string, attributes?: Record<string, string | number | boolean>): void => {
  const {span} = (req as any);
  if (span) {
    span.addEvent(eventName, attributes);
  } else {
    // If no request span exists, add to the current active span
    tracingService.addEvent(eventName, attributes);
  }
};

/**
 * Higher-order function to wrap async route handlers with tracing
 */
export function tracedRouteHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  operationName?: string
): T {
  return ((async (req: Request, res: Response, ...rest: any[]) => {
    const spanName = operationName || `handler.${handler.name}`;

    return await tracingService.executeWithSpan(
      spanName,
      async (span) => {
        // Add request context to the span
        if (span) {
          span.setAttribute('http.method', req.method);
          span.setAttribute('http.route', req.route?.path || req.path);
        }

        try {
          const result = await handler(req, res, ...rest);

          // Add success attributes
          if (span) {
            span.setAttribute('result.success', true);
          }

          return result;
        } catch (error) {
          // Add error attributes
          if (span) {
            span.setAttribute('result.success', false);
            span.setAttribute('error.message', error instanceof Error ? error.message : 'Unknown error');
            span.setAttribute('error.stack', error instanceof Error ? error.stack || '' : '');
          }

          throw error;
        }
      },
      {
        'handler.name': handler.name,
        'handler.type': 'route-handler'
      }
    );
  }) as any) as T;
}

export default {
  tracingMiddleware,
  addSpanAttribute,
  addSpanEvent,
  tracedRouteHandler
};
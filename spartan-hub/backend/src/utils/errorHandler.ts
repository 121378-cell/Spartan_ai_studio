/**
 * Centralized error handler for the Spartan Hub application
 * Provides consistent error responses for all API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { alertService, AlertType, AlertSeverity } from '../services/alertService';

// Interface for API error responses
export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: string;
  timestamp?: string;
  path?: string;
}

// Interface for application errors
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

// Custom error classes
export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = 'CONFLICT_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ServiceUnavailableError extends Error implements AppError {
  statusCode = 503;
  code = 'SERVICE_UNAVAILABLE_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Creates a standardized error response
 * @param error The error object
 * @param req Express request object
 * @returns Standardized error response
 */
export function createErrorResponse(error: AppError, req: Request): ApiErrorResponse {
  // Default error message for production
  let message = 'An unexpected error occurred. Please try again later.';

  // More detailed messages for development
  if (process.env.NODE_ENV === 'development') {
    message = error.message || message;
  } else {
    // User-friendly messages for production
    switch (error.constructor) {
    case ValidationError:
      message = 'The information provided is invalid. Please check your input and try again.';
      break;
    case AuthenticationError:
      message = 'You need to be logged in to perform this action.';
      break;
    case AuthorizationError:
      message = 'You do not have permission to perform this action.';
      break;
    case NotFoundError:
      message = 'The requested resource was not found.';
      break;
    case ConflictError:
      message = 'The request could not be completed due to a conflict.';
      break;
    case ServiceUnavailableError:
      message = 'The service is temporarily unavailable. Please try again later.';
      break;
    default:
      message = 'An unexpected error occurred. Please try again later.';
    }
  }

  const response: ApiErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Add error code if available
  if (error.code) {
    response.code = error.code;
  }

  // Add detailed information in development mode
  if (process.env.NODE_ENV === 'development' && error.message) {
    response.details = error.message;
  }

  return response;
}

/**
 * Global error handling middleware
 * @param error The error object
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function globalErrorHandler(
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with structured logger
  logger.errorWithStack('Global error handler caught error', error, {
    context: 'globalErrorHandler',
    metadata: {
      url: req.url,
      method: req.method,
      statusCode: error.statusCode,
      code: error.code
    }
  });

  // Create alert for critical errors
  createAlertForError(error, req);

  // Set default status code if not provided
  const statusCode = error.statusCode || 500;

  // Create standardized error response
  const errorResponse = createErrorResponse(error, req);

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Create alert for critical errors
 * @param error The error object
 * @param req Express request object
 */
function createAlertForError(error: AppError, req: Request): void {
  try {
    // Determine alert type and severity based on error
    let alertType: AlertType;
    let alertSeverity: AlertSeverity;

    switch (error.constructor) {
    case ValidationError:
      // Validation errors are typically not critical
      return;

    case AuthenticationError:
      alertType = AlertType.SECURITY_INCIDENT;
      alertSeverity = AlertSeverity.MEDIUM;
      break;

    case AuthorizationError:
      alertType = AlertType.SECURITY_INCIDENT;
      alertSeverity = AlertSeverity.MEDIUM;
      break;

    case NotFoundError:
      // Not found errors are typically not critical
      return;

    case ConflictError:
      // Conflict errors are typically not critical
      return;

    case ServiceUnavailableError:
      alertType = AlertType.SERVICE_UNAVAILABLE;
      alertSeverity = AlertSeverity.HIGH;
      break;

    default:
      // For unexpected errors, create a system error alert
      alertType = AlertType.SYSTEM_ERROR;
      alertSeverity = AlertSeverity.HIGH;
      break;
    }

    // Create alert message
    const message = error.message || 'Unknown error';
    const alertMessage = `Error ${error.code || 'UNKNOWN'}: ${message} at ${req.method} ${req.url}`;

    // Create alert
    alertService.createAlert(
      alertType,
      alertSeverity,
      alertMessage,
      'globalErrorHandler',
      {
        url: req.url,
        method: req.method,
        statusCode: error.statusCode,
        errorCode: error.code,
        stack: error.stack
      }
    );
  } catch (alertError) {
    // Log alert creation errors but don't let them break the error handler
    logger.error('Failed to create alert for error', {
      context: 'globalErrorHandler',
      metadata: {
        error: alertError
      }
    });
  }
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection(): void {
  process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
    logger.error('Unhandled promise rejection detected', {
      context: 'unhandledRejection',
      metadata: {
        reason: String(reason)
      }
    });

    const reasonAny = reason as any;
    if (reasonAny && reasonAny.stack) {
      logger.debug('Promise rejection stack trace', {
        context: 'unhandledRejection',
        metadata: { stack: reasonAny.stack }
      });
    }

    // Gracefully shutdown server
    // Note: In a real application, you might want to close database connections, etc.
    process.exit(1);
  });
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.errorWithStack('Uncaught Exception detected', error, {
      context: 'uncaughtException'
    });

    // Gracefully shutdown server
    process.exit(1);
  });
}

export default {
  globalErrorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  createErrorResponse,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError
};

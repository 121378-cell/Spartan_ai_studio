import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationService } from '../services/validationService';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        params?: Record<string, unknown>;
      };

      // Sanitize and validate the data before replacing
      if (validatedData.body) {
        req.body = sanitizeInput(validatedData.body) as Record<string, unknown>;
      }
      if (validatedData.query) {
        req.query = sanitizeInput(validatedData.query) as Record<string, unknown> & { [key: string]: string | string[] };
      }
      if (validatedData.params) {
        req.params = sanitizeInput(validatedData.params) as Record<string, string> & Record<string, unknown>;
      }

      return next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(issue => {
          const path = issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : '';
          let {message} = issue;

          if (message === 'Invalid input: expected string, received undefined') {
            message = 'Required';
          }

          return {
            path,
            message
          };
        });

        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
        // Stop middleware chain on validation error
        return;
      }
      return next(error);
    }
  };
};

// Helper function to sanitize input recursively
function sanitizeInput(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Sanitize string input
    return ValidationService.sanitizeInput(input);
  }

  if (Array.isArray(input)) {
    // Sanitize array elements
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object') {
    // Sanitize object properties
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * Input Sanitization Middleware
 * Applies comprehensive input sanitization at the request handling level
 * to prevent XSS and other security vulnerabilities
 */

import { Request, Response, NextFunction } from 'express';
import { sanitizePlainText, sanitizeLimitedHtml, sanitizeRichText } from '../utils/sanitization';
import { logger } from '../utils/logger';
import { sanitizationMonitor } from '../utils/sanitizationMonitor';

/**
 * Sanitize a single field based on its type
 * @param value - The field value to sanitize
 * @param fieldType - The type of field to determine sanitization approach
 * @returns Sanitized value
 */
const sanitizeField = (value: unknown, fieldType: 'plain' | 'limitedHtml' | 'richText' | 'email' | 'url' | 'name' | 'description' | 'notes' | 'title' | 'content' | 'comment'): unknown => {
  const startTime = Date.now();
  
  if (typeof value !== 'string') {
    sanitizationMonitor.recordOperation(fieldType, 0, Date.now() - startTime, 'success');
    return value;
  }

  // Detect potential security threats
  const detectedThreats: string[] = [];
  const lowerValue = value.toLowerCase();
  
  if (lowerValue.includes('<script') || lowerValue.includes('javascript:') || lowerValue.includes('onerror=')) {
    detectedThreats.push('XSS attempt detected');
  }
  
  let sanitizedValue: string;
  
  try {
    switch (fieldType) {
    case 'plain':
    case 'name':
    case 'title':
    case 'comment':
    case 'email':
    case 'url':
      sanitizedValue = sanitizePlainText(value);
      break;
    case 'limitedHtml':
    case 'description':
    case 'notes':
    case 'content':
      sanitizedValue = sanitizeLimitedHtml(value);
      break;
    case 'richText':
      sanitizedValue = sanitizeRichText(value);
      break;
    default:
      sanitizedValue = sanitizePlainText(value);
    }
    
    const processingTime = Date.now() - startTime;
    const result = detectedThreats.length > 0 ? 'bypass_attempt' : 'success';
    
    sanitizationMonitor.recordOperation(
      fieldType, 
      value.length, 
      processingTime, 
      result, 
      detectedThreats.length > 0 ? detectedThreats : undefined
    );
    
    return sanitizedValue;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    sanitizationMonitor.recordOperation(fieldType, value.length, processingTime, 'error');
    logger.error('Sanitization failed', { 
      context: 'sanitization', 
      metadata: { error, fieldType, inputValue: value.substring(0, 100) } 
    });
    return value; // Return original value on error to avoid data loss
  }
};

/**
 * Sanitize an entire object recursively
 * @param obj - The object to sanitize
 * @param fieldTypes - Map of field names to their types
 * @returns Sanitized object
 */
const sanitizeObject = (obj: unknown, fieldTypes: Record<string, string> = {}): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, fieldTypes));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Determine field type based on common field names
    let fieldType: 'plain' | 'limitedHtml' | 'richText' | 'email' | 'url' | 'name' | 'description' | 'notes' | 'title' | 'content' | 'comment' = 'plain';
    
    if (fieldTypes[key]) {
      fieldType = fieldTypes[key] as any;
    } else {
      // Determine field type based on common field names
      if (['name', 'title', 'comment', 'username', 'firstName', 'lastName'].includes(key)) {
        fieldType = 'name';
      } else if (['description', 'bio', 'about'].includes(key)) {
        fieldType = 'description';
      } else if (['notes', 'note', 'remarks'].includes(key)) {
        fieldType = 'notes';
      } else if (['content', 'body', 'text'].includes(key)) {
        fieldType = 'content';
      } else if (['email', 'emailAddress'].includes(key)) {
        fieldType = 'email';
      } else if (['url', 'link', 'website', 'avatar'].includes(key)) {
        fieldType = 'url';
      } else if (['html', 'richText', 'formattedText'].includes(key)) {
        fieldType = 'richText';
      } else {
        // Default to plain text sanitization for security
        fieldType = 'plain';
      }
    }

    sanitized[key] = sanitizeField(value, fieldType);
  }

  return sanitized;
};

/**
 * Middleware to sanitize request body, query parameters, and other input fields
 */
export const sanitizeRequestInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body) as typeof req.body;
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query) as typeof req.query;
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params) as typeof req.params;
    }

    next();
  } catch (error) {
    logger.error('Error during input sanitization', { context: 'sanitization', metadata: { error } });
    res.status(500).json({
      success: false,
      message: 'Internal server error during input sanitization'
    });
    return;
  }
};

/**
 * Middleware to sanitize specific fields in the request body
 * @param fieldMappings - Object mapping field names to their sanitization types
 */
export const sanitizeSpecificFields = (fieldMappings: Record<string, 'plain' | 'limitedHtml' | 'richText' | 'email' | 'url' | 'name' | 'description' | 'notes' | 'title' | 'content' | 'comment'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.body && typeof req.body === 'object') {
        for (const [fieldName, fieldType] of Object.entries(fieldMappings)) {
          if (req.body[fieldName] !== undefined) {
            req.body[fieldName] = sanitizeField(req.body[fieldName], fieldType);
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Error during specific field sanitization', { context: 'sanitization', metadata: { error } });
      res.status(500).json({
        success: false,
        message: 'Internal server error during input sanitization'
      });
      return;
    }
  };
};

/**
 * Middleware to sanitize common user input fields
 */
export const sanitizeUserInputFields = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Define common user input fields and their sanitization types
    const userInputFields: Record<string, 'plain' | 'limitedHtml' | 'richText' | 'email' | 'url' | 'name' | 'description' | 'notes' | 'title' | 'content' | 'comment'> = {
      name: 'name',
      title: 'title',
      comment: 'comment',
      description: 'description',
      notes: 'notes',
      content: 'content',
      bio: 'description',
      about: 'description',
      firstName: 'name',
      lastName: 'name',
      username: 'name',
      email: 'email',
      website: 'url',
      url: 'url',
      link: 'url',
      avatar: 'url',
      quest: 'content',
      goal: 'content',
      achievement: 'content',
      feedback: 'comment',
      message: 'comment',
      reply: 'comment',
      response: 'comment'
    };

    if (req.body && typeof req.body === 'object') {
      for (const [fieldName, fieldType] of Object.entries(userInputFields)) {
        if (req.body[fieldName] !== undefined) {
          req.body[fieldName] = sanitizeField(req.body[fieldName], fieldType);
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Error during user input field sanitization', { context: 'sanitization', metadata: { error } });
    res.status(500).json({
      success: false,
      message: 'Internal server error during input sanitization'
    });
    return;
  }
};

export default {
  sanitizeRequestInput,
  sanitizeSpecificFields,
  sanitizeUserInputFields
};
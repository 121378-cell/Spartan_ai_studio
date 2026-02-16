/**
 * Validation middleware for Express routes
 * Provides reusable validation functions for common data types
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationService, ValidationError } from '../services/validationService';
import { sanitizePlainText, sanitizeLimitedHtml, sanitizeRichText } from '../utils/sanitization';

// Helper function to send validation error response
const sendValidationError = (res: Response, error: ValidationError) => {
  return res.status(400).json({
    success: false,
    message: error.message,
    field: error.field,
    code: 'VALIDATION_ERROR'
  });
};

/**
 * Middleware to validate user profile data
 */
export const validateUserProfile = (req: Request, res: Response, next: NextFunction): void => {
  try {
    ValidationService.validateUserProfile(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
    return;
  }
};

/**
 * Middleware to validate evaluation form data
 */
export const validateEvaluationForm = (req: Request, res: Response, next: NextFunction): void => {
  try {
    ValidationService.validateEvaluationFormData(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
    return;
  }
};

/**
 * Middleware to validate routine data
 */
export const validateRoutine = (req: Request, res: Response, next: NextFunction): void => {
  try {
    ValidationService.validateRoutine(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
    return;
  }
};

/**
 * Middleware to validate workout session data
 */
export const validateWorkoutSession = (req: Request, res: Response, next: NextFunction): void => {
  try {
    ValidationService.validateWorkoutSession(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
    return;
  }
};

/**
 * Middleware to validate trial data
 */
export const validateTrial = (req: Request, res: Response, next: NextFunction): void => {
  try {
    ValidationService.validateTrial(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
    return;
  }
};

/**
 * Middleware to validate keystone habit data
 */
export const validateKeystoneHabit = (req: Request, res: Response, next: NextFunction): void => {
  try {
    ValidationService.validateKeystoneHabit(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
    return;
  }
};

/**
 * Middleware to validate journal entry data
 */
export const validateJournalEntry = (req: Request, res: Response, next: NextFunction): void => {
  try {
    ValidationService.validateJournalEntry(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
    return;
  }
};

/**
 * Middleware to validate milestone data
 */
export const validateMilestone = (req: Request, res: Response, next: NextFunction): void => {
  try {
    ValidationService.validateMilestone(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      sendValidationError(res, error);
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during validation'
    });
    return;
  }
};

/**
 * Middleware to validate and sanitize string input
 */
export const validateAndSanitizeString = (fieldName: string, minLength: number = 1, maxLength: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.body[fieldName]) {
        req.body[fieldName] = ValidationService.validateAndSanitizeString(
          req.body[fieldName],
          fieldName,
          minLength,
          maxLength
        );
      }
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        sendValidationError(res, error);
        return;
      }
      res.status(500).json({
        success: false,
        message: 'Internal server error during validation'
      });
      return;
    }
  };
};

export const sanitizeInputFields = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize common text fields that may contain user input
  if (req.body.name && typeof req.body.name === 'string') {
    req.body.name = sanitizePlainText(req.body.name);
  }
  
  if (req.body.description && typeof req.body.description === 'string') {
    req.body.description = sanitizeLimitedHtml(req.body.description);
  }
  
  if (req.body.notes && typeof req.body.notes === 'string') {
    req.body.notes = sanitizeLimitedHtml(req.body.notes);
  }
  
  if (req.body.title && typeof req.body.title === 'string') {
    req.body.title = sanitizePlainText(req.body.title);
  }
  
  if (req.body.content && typeof req.body.content === 'string') {
    req.body.content = sanitizeLimitedHtml(req.body.content);
  }
  
  if (req.body.comment && typeof req.body.comment === 'string') {
    req.body.comment = sanitizePlainText(req.body.comment);
  }
  
  // Add sanitization for other common text fields as needed
  if (req.body.quest && typeof req.body.quest === 'string') {
    req.body.quest = sanitizeLimitedHtml(req.body.quest);
  }
  
  if (req.body.email && typeof req.body.email === 'string') {
    // Email doesn't need HTML sanitization, just basic validation
    req.body.email = req.body.email.trim();
  }
  
  next();
};

export default {
  validateUserProfile,
  validateEvaluationForm,
  validateRoutine,
  validateWorkoutSession,
  validateTrial,
  validateKeystoneHabit,
  validateJournalEntry,
  validateMilestone,
  validateAndSanitizeString,
  sanitizeInputFields
};
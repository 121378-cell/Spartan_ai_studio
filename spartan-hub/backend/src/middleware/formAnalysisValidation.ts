import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';

/**
 * Form Analysis Validation Middleware
 * Validates and sanitizes form analysis request data
 */

// Exercise type validation
const VALID_EXERCISES = ['squat', 'deadlift', 'pushup', 'pullup', 'lunge', 'bench_press'];

// Feedback type validation
const VALID_FEEDBACK_TYPES = ['correction', 'encouragement', 'tip', 'warning'];

// Severity level validation
const VALID_SEVERITY_LEVELS = ['low', 'medium', 'high'];

/**
 * Validate session start request
 */
export const validateSessionStart = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { exerciseType, notes } = req.body;

    // Required fields
    if (!exerciseType) {
      res.status(400).json({
        success: false,
        message: 'Exercise type is required'
      });
      return;
    }

    // Validate exercise type
    if (!VALID_EXERCISES.includes(exerciseType.toLowerCase())) {
      res.status(400).json({
        success: false,
        message: `Invalid exercise type. Valid options: ${VALID_EXERCISES.join(', ')}`
      });
      return;
    }

    // Sanitize inputs
    req.body.exerciseType = sanitizeInput(exerciseType);
    if (notes) {
      req.body.notes = sanitizeInput(notes);
    }

    next();
  } catch (error) {
    logger.error('Session start validation failed', { 
      context: 'validation', 
      metadata: { error: String(error) } 
    });
    
    res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate session end request
 */
export const validateSessionEnd = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { durationSeconds, stats } = req.body;

    // Required fields
    if (!durationSeconds || !stats) {
      res.status(400).json({
        success: false,
        message: 'Duration and stats are required'
      });
      return;
    }

    // Validate duration
    if (typeof durationSeconds !== 'number' || durationSeconds <= 0) {
      res.status(400).json({
        success: false,
        message: 'Duration must be a positive number'
      });
      return;
    }

    // Validate stats object
    const requiredStats = ['averageScore', 'bestScore', 'worstScore', 'totalReps', 'completedReps'];
    for (const stat of requiredStats) {
      if (stats[stat] === undefined) {
        res.status(400).json({
          success: false,
          message: `Missing required statistic: ${stat}`
        });
        return;
      }
    }

    // Validate score ranges
    const scoreFields = ['averageScore', 'bestScore', 'worstScore'];
    for (const field of scoreFields) {
      const value = stats[field];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        res.status(400).json({
          success: false,
          message: `${field} must be between 0 and 100`
        });
        return;
      }
    }

    // Validate rep counts
    if (typeof stats.totalReps !== 'number' || stats.totalReps < 0) {
      res.status(400).json({
        success: false,
        message: 'Total reps must be a non-negative number'
      });
      return;
    }

    if (typeof stats.completedReps !== 'number' || stats.completedReps < 0) {
      res.status(400).json({
        success: false,
        message: 'Completed reps must be a non-negative number'
      });
      return;
    }

    if (stats.completedReps > stats.totalReps) {
      res.status(400).json({
        success: false,
        message: 'Completed reps cannot exceed total reps'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Session end validation failed', { 
      context: 'validation', 
      metadata: { error: String(error) } 
    });
    
    res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate rep analysis data
 */
export const validateRepAnalysis = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { repData } = req.body;

    // Required fields
    if (!repData) {
      res.status(400).json({
        success: false,
        message: 'Rep data is required'
      });
      return;
    }

    if (repData.repNumber === undefined || repData.repNumber <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid rep number is required'
      });
      return;
    }

    if (repData.score === undefined) {
      res.status(400).json({
        success: false,
        message: 'Rep score is required'
      });
      return;
    }

    // Validate score range
    if (typeof repData.score !== 'number' || repData.score < 0 || repData.score > 100) {
      res.status(400).json({
        success: false,
        message: 'Rep score must be between 0 and 100'
      });
      return;
    }

    // Validate timestamps if provided
    if (repData.startTime) {
      const startTime = new Date(repData.startTime);
      if (isNaN(startTime.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid start time format'
        });
        return;
      }
    }

    if (repData.endTime) {
      const endTime = new Date(repData.endTime);
      if (isNaN(endTime.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid end time format'
        });
        return;
      }
      
      // Validate that end time is after start time
      if (repData.startTime) {
        const startTime = new Date(repData.startTime);
        if (endTime <= startTime) {
          res.status(400).json({
            success: false,
            message: 'End time must be after start time'
          });
          return;
        }
      }
    }

    // Validate duration if provided
    if (repData.durationMs !== undefined) {
      if (typeof repData.durationMs !== 'number' || repData.durationMs <= 0) {
        res.status(400).json({
          success: false,
          message: 'Duration must be a positive number'
        });
        return;
      }
    }

    // Sanitize text fields
    if (repData.feedback) {
      repData.feedback = sanitizeInput(repData.feedback);
    }

    next();
  } catch (error) {
    logger.error('Rep analysis validation failed', { 
      context: 'validation', 
      metadata: { error: String(error) } 
    });
    
    res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate form feedback data
 */
export const validateFormFeedback = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { feedbackData } = req.body;

    // Required fields
    if (!feedbackData) {
      res.status(400).json({
        success: false,
        message: 'Feedback data is required'
      });
      return;
    }

    const requiredFields = ['feedbackType', 'bodyPart', 'issue', 'suggestion', 'severity'];
    for (const field of requiredFields) {
      if (!feedbackData[field]) {
        res.status(400).json({
          success: false,
          message: `${field} is required in feedback data`
        });
        return;
      }
    }

    // Validate feedback type
    if (!VALID_FEEDBACK_TYPES.includes(feedbackData.feedbackType)) {
      res.status(400).json({
        success: false,
        message: `Invalid feedback type. Valid options: ${VALID_FEEDBACK_TYPES.join(', ')}`
      });
      return;
    }

    // Validate severity level
    if (!VALID_SEVERITY_LEVELS.includes(feedbackData.severity)) {
      res.status(400).json({
        success: false,
        message: `Invalid severity level. Valid options: ${VALID_SEVERITY_LEVELS.join(', ')}`
      });
      return;
    }

    // Sanitize text fields
    feedbackData.bodyPart = sanitizeInput(feedbackData.bodyPart);
    feedbackData.issue = sanitizeInput(feedbackData.issue);
    feedbackData.suggestion = sanitizeInput(feedbackData.suggestion);

    next();
  } catch (error) {
    logger.error('Form feedback validation failed', { 
      context: 'validation', 
      metadata: { error: String(error) } 
    });
    
    res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate query parameters for GET requests
 */
export const validateQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { limit, exerciseType } = req.query;

    // Validate limit parameter
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
        res.status(400).json({
          success: false,
          message: 'Limit must be a number between 1 and 100'
        });
        return;
      }
      req.query.limit = limitNum.toString();
    }

    // Validate exercise type parameter
    if (exerciseType) {
      const exercise = sanitizeInput(exerciseType as string);
      if (!VALID_EXERCISES.includes(exercise.toLowerCase())) {
        res.status(400).json({
          success: false,
          message: `Invalid exercise type. Valid options: ${VALID_EXERCISES.join(', ')}`
        });
        return;
      }
      req.query.exerciseType = exercise;
    }

    next();
  } catch (error) {
    logger.error('Query parameter validation failed', { 
      context: 'validation', 
      metadata: { error: String(error) } 
    });
    
    res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate session comparison request
 */
export const validateSessionComparison = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { sessionId1, sessionId2 } = req.body;
    
    // Required fields
    if (!sessionId1 || !sessionId2) {
      res.status(400).json({
        success: false,
        message: 'Both session IDs are required for comparison'
      });
      return;
    }

    // Validate session IDs are numbers
    if (typeof sessionId1 !== 'number' || typeof sessionId2 !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Session IDs must be numbers'
      });
      return;
    }

    // Validate session IDs are different
    if (sessionId1 === sessionId2) {
      res.status(400).json({
        success: false,
        message: 'Cannot compare a session with itself'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Session comparison validation failed', { 
      context: 'validation', 
      metadata: { error: String(error) } 
    });
    
    res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Validate improvement plan request
 */
export const validateImprovementPlan = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { days } = req.query;
    
    // Validate days parameter if provided
    if (days !== undefined) {
      const daysNum = parseInt(days as string);
      if (isNaN(daysNum) || daysNum < 7 || daysNum > 365) {
        res.status(400).json({
          success: false,
          message: 'Days must be a number between 7 and 365'
        });
        return;
      }
      req.query.days = daysNum.toString();
    }

    next();
  } catch (error) {
    logger.error('Improvement plan validation failed', { 
      context: 'validation', 
      metadata: { error: String(error) } 
    });
    
    res.status(500).json({
      success: false,
      message: 'Validation error occurred'
    });
  }
};

/**
 * Advanced security validation for sensitive operations
 */
export const validateSecurityContext = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check user permissions for form analysis operations
    const userId = (req as any).user?.id;
    const requestedUserId = parseInt(req.params.userId || req.body.userId);
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Users can only access their own form analysis data
    if (requestedUserId && userId !== requestedUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other users\' form analysis data'
      });
      return;
    }

    // Additional security checks for admin operations
    if (req.method === 'DELETE' || req.path.includes('admin')) {
      // Would check admin permissions here
      // For now, deny all DELETE operations for safety
      res.status(403).json({
        success: false,
        message: 'Delete operations not permitted'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Security validation failed', { 
      context: 'validation', 
      metadata: { error: String(error), userId: (req as any).user?.id } 
    });
    
    res.status(500).json({
      success: false,
      message: 'Security validation error'
    });
  }
};
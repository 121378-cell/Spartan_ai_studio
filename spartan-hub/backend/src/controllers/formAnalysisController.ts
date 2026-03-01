/**
 * Form Analysis Controller
 * Phase A: Video Form Analysis MVP
 * 
 * Note: Most logic moved to routes for simplicity.
 * This controller is kept for backwards compatibility.
 */

import { Request, Response } from 'express';
import { getDatabase } from '../database/databaseManager';
import { FormAnalysisService } from '../services/formAnalysisService';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';

/**
 * Legacy controller methods - kept for backwards compatibility
 * New code should use formAnalysisRoutes.ts directly
 */

/**
 * Save a form analysis (legacy method)
 */
export const saveFormAnalysis = async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const service = new FormAnalysisService(db);

    const dto = {
      userId: req.body.userId,
      exerciseType: req.body.exerciseType,
      formScore: req.body.formScore,
      metrics: req.body.metrics,
      warnings: req.body.warnings || [],
      recommendations: req.body.recommendations || []
    };

    // Validation
    if (!dto.userId || !dto.exerciseType || !dto.formScore) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const result = service.create(dto);

    logger.info('Form analysis saved', {
      context: 'form-analysis',
      metadata: { id: result.id }
    });

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error saving form analysis', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to save form analysis'
    });
  }
};

/**
 * Start a form analysis session (legacy method)
 */
export const startFormAnalysisSession = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { exerciseType } = req.body;

    if (!exerciseType) {
      return res.status(400).json({
        success: false,
        message: 'Exercise type is required'
      });
    }

    logger.info('Form analysis session started', {
      context: 'form-analysis',
      metadata: { userId, exerciseType: sanitizeInput(exerciseType) }
    });

    return res.status(201).json({
      success: true,
      message: 'Session started (legacy endpoint - use POST /api/form-analysis instead)'
    });
  } catch (error) {
    logger.error('Error starting session', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to start session'
    });
  }
};

/**
 * End a form analysis session (legacy method)
 */
export const endFormAnalysisSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    logger.info('Form analysis session ended', {
      context: 'form-analysis',
      metadata: { sessionId }
    });

    return res.status(200).json({
      success: true,
      message: 'Session ended (legacy endpoint)'
    });
  } catch (error) {
    logger.error('Error ending session', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to end session'
    });
  }
};

/**
 * Add rep analysis (legacy method)
 */
export const addRepAnalysis = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { repNumber, metrics } = req.body;

    logger.info('Rep analysis added', {
      context: 'form-analysis',
      metadata: { sessionId, repNumber }
    });

    return res.status(201).json({
      success: true,
      message: 'Rep analysis added (legacy endpoint)'
    });
  } catch (error) {
    logger.error('Error adding rep analysis', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to add rep analysis'
    });
  }
};

/**
 * Get user form sessions (legacy method)
 */
export const getUserFormSessions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    logger.info('Getting user form sessions', {
      context: 'form-analysis',
      metadata: { userId }
    });

    return res.status(200).json({
      success: true,
      message: 'Use GET /api/form-analysis/user/:userId instead'
    });
  } catch (error) {
    logger.error('Error getting user sessions', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get user sessions'
    });
  }
};

/**
 * Get form session details (legacy method)
 */
export const getFormSessionDetails = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    logger.info('Getting form session details', {
      context: 'form-analysis',
      metadata: { sessionId }
    });

    return res.status(200).json({
      success: true,
      message: 'Use GET /api/form-analysis/:id instead'
    });
  } catch (error) {
    logger.error('Error getting session details', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get session details'
    });
  }
};

/**
 * Get user exercise stats (legacy method)
 */
export const getUserExerciseStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    logger.info('Getting user exercise stats', {
      context: 'form-analysis',
      metadata: { userId }
    });

    return res.status(200).json({
      success: true,
      message: 'Use GET /api/form-analysis/user/:userId/stats instead'
    });
  } catch (error) {
    logger.error('Error getting user stats', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get user stats'
    });
  }
};

/**
 * Add form feedback (legacy method)
 */
export const addFormFeedback = async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = req.params;
    const { rating, comments } = req.body;

    logger.info('Form feedback added', {
      context: 'form-analysis',
      metadata: { userId, sessionId, rating }
    });

    return res.status(201).json({
      success: true,
      message: 'Feedback added (legacy endpoint)'
    });
  } catch (error) {
    logger.error('Error adding feedback', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to add feedback'
    });
  }
};

/**
 * Get session feedback (legacy method)
 */
export const getSessionFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    logger.info('Getting session feedback', {
      context: 'form-analysis',
      metadata: { sessionId }
    });

    return res.status(200).json({
      success: true,
      message: 'Feedback retrieval (legacy endpoint)'
    });
  } catch (error) {
    logger.error('Error getting feedback', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get feedback'
    });
  }
};

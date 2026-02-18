import { Request, Response } from 'express';
import { initializeDatabase as getDb } from '../config/database';
import { FormAnalysisDatabaseService } from '../services/formAnalysisDatabaseService';
import { FormAnalysisService } from '../services/formAnalysisService';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';

/**
 * Form Analysis Controller
 * Handles API requests for form analysis functionality
 */

/**
 * Start a new form analysis session
 */
export const startFormAnalysisSession = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { exerciseType, notes } = req.body;

    // Input validation
    if (!exerciseType) {
      return res.status(400).json({
        success: false,
        message: 'Exercise type is required'
      });
    }

    const sanitizedExerciseType = sanitizeInput(exerciseType);
    const sanitizedNotes = notes ? sanitizeInput(notes) : undefined;

    const db = getDb();
    const dbService = new FormAnalysisDatabaseService(db);

    const sessionId = await dbService.createSession(
      userId,
      sanitizedExerciseType,
      sanitizedNotes
    );

    logger.info('Form analysis session started', {
      metadata: {
        sessionId,
        userId,
        exerciseType: sanitizedExerciseType
      }
    });

    return res.status(201).json({
      success: true,
      data: { sessionId },
      message: 'Form analysis session started successfully'
    });
  } catch (error) {
    logger.error('Failed to start form analysis session', {
      context: 'form-analysis',
      metadata: { error: String(error), userId: req.params.userId }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to start form analysis session'
    });
  }
};

/**
 * End a form analysis session
 */
export const endFormAnalysisSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { durationSeconds, stats } = req.body;

    // Input validation
    if (!durationSeconds || !stats) {
      return res.status(400).json({
        success: false,
        message: 'Duration and stats are required'
      });
    }

    const db = getDb();
    const dbService = new FormAnalysisDatabaseService(db);

    await dbService.endSession(Number(sessionId), durationSeconds, {
      averageScore: stats.averageScore || 0,
      bestScore: stats.bestScore || 0,
      worstScore: stats.worstScore || 0,
      totalReps: stats.totalReps || 0,
      completedReps: stats.completedReps || 0
    });

    logger.info('Form analysis session ended', {
      metadata: {
        sessionId: Number(sessionId),
        durationSeconds
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Form analysis session ended successfully'
    });
  } catch (error) {
    logger.error('Failed to end form analysis session', {
      context: 'form-analysis',
      metadata: { error: String(error), sessionId: req.params.sessionId }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to end form analysis session'
    });
  }
};

/**
 * Add rep analysis data
 */
export const addRepAnalysis = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { repData } = req.body;

    // Input validation
    if (!repData || !repData.repNumber || repData.score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Rep data with repNumber and score is required'
      });
    }

    const db = getDb();
    const dbService = new FormAnalysisDatabaseService(db);

    const repId = await dbService.addRepAnalysis(Number(sessionId), {
      repNumber: repData.repNumber,
      startTime: repData.startTime ? new Date(repData.startTime) : undefined,
      endTime: repData.endTime ? new Date(repData.endTime) : undefined,
      durationMs: repData.durationMs,
      score: repData.score,
      feedback: repData.feedback,
      keypoints: repData.keypoints || {},
      angles: repData.angles || {},
      metrics: repData.metrics || {}
    });

    logger.info('Rep analysis added', {
      metadata: {
        repId,
        sessionId: Number(sessionId),
        repNumber: repData.repNumber
      }
    });

    return res.status(201).json({
      success: true,
      data: { repId },
      message: 'Rep analysis added successfully'
    });
  } catch (error) {
    logger.error('Failed to add rep analysis', {
      context: 'form-analysis',
      metadata: { error: String(error), sessionId: req.params.sessionId }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to add rep analysis'
    });
  }
};

/**
 * Get user's form analysis sessions
 */
export const getUserFormSessions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const db = getDb();
    const dbService = new FormAnalysisDatabaseService(db);

    const sessions = await dbService.getUserSessions(userId, Number(limit));

    logger.info('User form sessions retrieved', {
      metadata: {
        userId,
        sessionCount: sessions.length
      }
    });

    return res.status(200).json({
      success: true,
      data: sessions,
      message: 'Form sessions retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get user form sessions', {
      context: 'form-analysis',
      metadata: { error: String(error), userId: req.params.userId }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve form sessions'
    });
  }
};

/**
 * Get detailed session information
 */
export const getFormSessionDetails = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const db = getDb();
    const dbService = new FormAnalysisDatabaseService(db);

    const sessionDetails = await dbService.getSessionDetails(Number(sessionId));

    logger.info('Form session details retrieved', { metadata: { sessionId: Number(sessionId) } });

    return res.status(200).json({
      success: true,
      data: sessionDetails,
      message: 'Session details retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get session details', {
      context: 'form-analysis',
      metadata: { error: String(error), sessionId: req.params.sessionId }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve session details'
    });
  }
};

/**
 * Get user's exercise statistics
 */
export const getUserExerciseStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { exerciseType } = req.query;

    const db = getDb();
    const dbService = new FormAnalysisDatabaseService(db);

    const stats = await dbService.getUserExerciseStats(
      userId,
      exerciseType as string | undefined
    );

    logger.info('User exercise stats retrieved', {
      metadata: {
        userId,
        exerciseType: exerciseType as string | undefined
      }
    });

    return res.status(200).json({
      success: true,
      data: stats,
      message: 'Exercise statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get user exercise stats', {
      context: 'form-analysis',
      metadata: { error: String(error), userId: req.params.userId }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve exercise statistics'
    });
  }
};

/**
 * Add form feedback
 */
export const addFormFeedback = async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = req.params;
    const { feedbackData } = req.body;

    // Input validation
    if (!feedbackData) {
      return res.status(400).json({
        success: false,
        message: 'Feedback data is required'
      });
    }

    const requiredFields = ['feedbackType', 'bodyPart', 'issue', 'suggestion', 'severity'];
    for (const field of requiredFields) {
      if (!feedbackData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required in feedback data`
        });
      }
    }

    const db = getDb();
    const dbService = new FormAnalysisDatabaseService(db);

    const feedbackId = await dbService.addFeedback({
      userId,
      sessionId: Number(sessionId),
      repId: feedbackData.repId ? Number(feedbackData.repId) : undefined,
      feedbackType: feedbackData.feedbackType,
      bodyPart: feedbackData.bodyPart,
      issue: feedbackData.issue,
      suggestion: feedbackData.suggestion,
      severity: feedbackData.severity
    });

    logger.info('Form feedback added', {
      metadata: {
        feedbackId,
        userId,
        sessionId: Number(sessionId)
      }
    });

    return res.status(201).json({
      success: true,
      data: { feedbackId },
      message: 'Form feedback added successfully'
    });
  } catch (error) {
    logger.error('Failed to add form feedback', {
      context: 'form-analysis',
      metadata: { error: String(error), userId: req.params.userId, sessionId: req.params.sessionId }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to add form feedback'
    });
  }
};

/**
 * Get form feedback for a session
 */
export const getSessionFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const db = getDb();
    // Direct query for feedback since it's not in the service yet
    const stmt = db.prepare(`
      SELECT *
      FROM form_feedback
      WHERE session_id = ?
      ORDER BY timestamp DESC
    `);

    const feedback = stmt.all(Number(sessionId));

    logger.info('Session feedback retrieved', { metadata: { sessionId: Number(sessionId) } });

    return res.status(200).json({
      success: true,
      data: feedback,
      message: 'Session feedback retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get session feedback', {
      context: 'form-analysis',
      metadata: { error: String(error), sessionId: req.params.sessionId }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve session feedback'
    });
  }
};

/**
 * Monolithic save for form analysis (as used by Frontend POC)
 */
export const saveFormAnalysis = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // Usually from JWT but can be in body
    const actualUserId = userId || (req as any).user?.userId;

    if (!actualUserId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const db = getDb();
    const service = new FormAnalysisService(db);

    const sessionId = await service.saveAnalysis(actualUserId, req.body);

    return res.status(201).json({
      success: true,
      data: { sessionId },
      message: 'Form analysis saved and ML models updated'
    });
  } catch (error) {
    logger.error('Failed to save monolithic form analysis', {
      context: 'form-analysis-controller',
      metadata: { error: String(error) }
    });

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error during save'
    });
  }
};

/**
 * Coach Vitalis Controller - REST API Handlers
 *
 * Handles all HTTP requests for the Coach Vitalis bio-feedback system.
 * Maps REST endpoints to service methods with proper error handling,
 * validation, and structured responses.
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { getCoachVitalisService } from '../services/coachVitalisService';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errorHandler';
import { sanitizeInput } from '../utils/sanitization';

// ============================================================================
// CONTROLLER HANDLERS
// ============================================================================

/**
 * GET /api/vitalis/bio-state/:userId
 * Evaluate current bio-physiological state
 */
export const getBioState = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    // Validation
    const sanitizedUserId = sanitizeInput(userId);
    if (!sanitizedUserId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const sanitizedDate = date ? sanitizeInput(String(date)) : undefined;
    if (sanitizedDate && !/^\d{4}-\d{2}-\d{2}$/.test(sanitizedDate)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    // Get service and evaluate
    const service = getCoachVitalisService();
    const evaluation = await service.evaluateBioState(sanitizedUserId, sanitizedDate);

    logger.info('Bio-state evaluated', {
      context: 'vitalisController',
      userId: sanitizedUserId,
      metadata: { nervousSystemLoad: evaluation.nervousSystemLoad },
    });

    res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting bio state', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to evaluate bio state',
    });
  }
};

/**
 * GET /api/vitalis/recommended-action/:userId
 * Get recommended action based on current state
 */
export const getRecommendedAction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Validation
    const sanitizedUserId = sanitizeInput(userId);
    if (!sanitizedUserId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    // Get service and fetch action
    const service = getCoachVitalisService();
    const action = await service.getRecommendedAction(sanitizedUserId);

    logger.info('Recommended action retrieved', {
      context: 'vitalisController',
      userId: sanitizedUserId,
      metadata: {
        actionType: action.actionType,
        confidence: action.confidence
      },
    });

    res.status(200).json({
      success: true,
      data: action,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting recommended action', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get recommended action',
    });
  }
};

/**
 * GET /api/vitalis/alerts/:userId
 * Get proactive alerts for user
 */
export const getAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status, severity } = req.query;

    // Validation
    const sanitizedUserId = sanitizeInput(userId);
    if (!sanitizedUserId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    // Get service and generate alerts
    const service = getCoachVitalisService();
    const alerts = await service.generateProactiveAlerts(sanitizedUserId);

    // Filter by severity if requested
    let filteredAlerts = alerts;
    if (severity) {
      const sanitizedSeverity = sanitizeInput(String(severity));
      filteredAlerts = alerts.filter((a) => a.severity === sanitizedSeverity);
    }

    logger.info('Alerts retrieved', {
      context: 'vitalisController',
      userId: sanitizedUserId,
      metadata: { count: filteredAlerts.length },
    });

    res.status(200).json({
      success: true,
      data: {
        count: filteredAlerts.length,
        alerts: filteredAlerts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting alerts', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate alerts',
    });
  }
};

/**
 * POST /api/vitalis/acknowledge-alert/:userId/:alertId
 * Acknowledge alert and record user feedback
 */
export const acknowledgeAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, alertId } = req.params;
    const { followedAction, feedback } = req.body;

    // Validation
    const sanitizedUserId = sanitizeInput(userId);
    const sanitizedAlertId = sanitizeInput(alertId);

    if (!sanitizedUserId || !sanitizedAlertId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID or alert ID',
      });
      return;
    }

    if (typeof followedAction !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'followedAction must be a boolean',
      });
      return;
    }

    const sanitizedFeedback = feedback ? sanitizeInput(String(feedback)) : undefined;

    logger.info('Alert acknowledged', {
      context: 'vitalisController',
      userId: sanitizedUserId,
      metadata: {
        alertId: sanitizedAlertId,
        followedAction
      },
    });

    res.status(200).json({
      success: true,
      data: {
        alertId: sanitizedAlertId,
        acknowledged: true,
        followedAction,
        feedback: sanitizedFeedback,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error acknowledging alert', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
    });
  }
};

/**
 * GET /api/vitalis/training-adjustment/:userId
 * Get training plan adjustments for specific date
 */
export const getTrainingAdjustment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    // Validation
    const sanitizedUserId = sanitizeInput(userId);
    if (!sanitizedUserId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    const sanitizedDate = date ? sanitizeInput(String(date)) : new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitizedDate)) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    // Get service and fetch adjustments
    const service = getCoachVitalisService();
    const adjustments = await service.adjustTrainingPlan(sanitizedUserId);

    // Filter by date if requested
    const dateAdjustments = adjustments.filter((a) => a.plannedDate === sanitizedDate);

    logger.info('Training adjustment retrieved', {
      context: 'vitalisController',
      userId: sanitizedUserId,
      metadata: {
        date: sanitizedDate,
        adjustmentCount: dateAdjustments.length
      },
    });

    res.status(200).json({
      success: true,
      data: {
        date: sanitizedDate,
        adjustments: dateAdjustments,
        hasAdjustment: dateAdjustments.length > 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting training adjustment', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get training adjustment',
    });
  }
};

/**
 * POST /api/vitalis/training-adjustment/:userId/accept
 * Accept training plan adjustment
 */
export const acceptTrainingAdjustment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { adjustmentId } = req.body;

    // Validation
    const sanitizedUserId = sanitizeInput(userId);
    const sanitizedAdjustmentId = sanitizeInput(String(adjustmentId));

    if (!sanitizedUserId || !sanitizedAdjustmentId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID or adjustment ID',
      });
      return;
    }

    logger.info('Training adjustment accepted', {
      context: 'vitalisController',
      userId: sanitizedUserId,
      metadata: { adjustmentId: sanitizedAdjustmentId },
    });

    res.status(200).json({
      success: true,
      data: {
        adjustmentId: sanitizedAdjustmentId,
        accepted: true,
        message: 'Training adjustment accepted. Check your calendar for updated session.',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error accepting training adjustment', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to accept training adjustment',
    });
  }
};

/**
 * GET /api/vitalis/nervous-system-report/:userId
 * Get nervous system monitoring report
 */
export const getNervousSystemReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { days } = req.query;

    // Validation
    const sanitizedUserId = sanitizeInput(userId);
    if (!sanitizedUserId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    let reportDays = 30;
    if (days) {
      const parsedDays = parseInt(String(days), 10);
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        res.status(400).json({
          success: false,
          message: 'Days must be between 1 and 365',
        });
        return;
      }
      reportDays = parsedDays;
    }

    // Get service and fetch report
    const service = getCoachVitalisService();
    const report = await service.monitorNervousSystem(sanitizedUserId, reportDays);

    logger.info('Nervous system report retrieved', {
      context: 'vitalisController',
      userId: sanitizedUserId,
      metadata: {
        days: reportDays,
        averageLoad: report.averageLoad,
        trend: report.trend
      },
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting nervous system report', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get nervous system report',
    });
  }
};

/**
 * GET /api/vitalis/decision-history/:userId
 * Get decision history for user
 */
export const getDecisionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { limit, days } = req.query;

    // Validation
    const sanitizedUserId = sanitizeInput(userId);
    if (!sanitizedUserId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    let limitValue = 30;
    if (limit) {
      const parsedLimit = parseInt(String(limit), 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        res.status(400).json({
          success: false,
          message: 'Limit must be between 1 and 1000',
        });
        return;
      }
      limitValue = parsedLimit;
    }

    let daysValue = 30;
    if (days) {
      const parsedDays = parseInt(String(days), 10);
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        res.status(400).json({
          success: false,
          message: 'Days must be between 1 and 365',
        });
        return;
      }
      daysValue = parsedDays;
    }

    // Get service and fetch history
    const service = getCoachVitalisService();
    const history = await service.getDecisionHistory(sanitizedUserId, limitValue, daysValue);

    logger.info('Decision history retrieved', {
      context: 'vitalisController',
      userId: sanitizedUserId,
      metadata: {
        count: history.length,
        days: daysValue
      },
    });

    res.status(200).json({
      success: true,
      data: {
        count: history.length,
        period: { days: daysValue },
        history,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting decision history', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get decision history',
    });
  }
};

/**
 * GET /api/vitalis/ai-advice/:userId
 * Get real-time AI coaching advice
 */
export const getAiAdvice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const sanitizedUserId = sanitizeInput(userId);
    
    if (!sanitizedUserId) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    const service = getCoachVitalisService();
    const advice = await service.generateCoachingAdvice(sanitizedUserId);

    res.status(200).json({
      success: true,
      data: advice
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate AI advice' });
  }
};

/**
 * GET /api/vitalis/health
 * Health check endpoint
 */
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const service = getCoachVitalisService();

    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        service: 'CoachVitalisService',
        timestamp: new Date().toISOString(),
        endpoints: 8,
        features: [
          'Bio-state evaluation',
          'Rule-based decision making',
          'Proactive alerts',
          'Training adjustments',
          'Nervous system monitoring',
          'Decision history',
        ],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error checking health', {
      context: 'vitalisController',
      metadata: { error: message },
    });

    res.status(503).json({
      success: false,
      message: 'Service unavailable',
    });
  }
};

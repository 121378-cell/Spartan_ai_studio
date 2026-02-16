/**
 * Large Action Model Controller
 * 
 * Handles API requests for autonomous AI actions (LAMs)
 */

import { Request, Response } from 'express';
import { largeActionModelService, UserContext, ActionTrigger } from '../services/largeActionModelService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

/**
 * Generate action sequence from trigger
 * POST /api/lam/generate
 */
export const generateActionSequence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, trigger, context } = req.body;

    if (!userId || !trigger || !context) {
      throw new ValidationError('userId, trigger, and context are required');
    }

    logger.info('Generating LAM action sequence', {
      context: 'lam-controller',
      metadata: { userId, triggerType: trigger.type }
    });

    const sequence = await largeActionModelService.generateActionSequence(
      userId,
      trigger as ActionTrigger,
      context as UserContext
    );

    res.status(201).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error('Failed to generate action sequence', {
      context: 'lam-controller',
      metadata: { error }
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate action sequence'
    });
  }
};

/**
 * Get pending action sequences for user
 * GET /api/lam/pending/:userId
 */
export const getPendingSequences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const sequences = largeActionModelService.getPendingSequences(userId);

    res.status(200).json({
      success: true,
      data: sequences
    });
  } catch (error) {
    logger.error('Failed to fetch pending sequences', {
      context: 'lam-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch sequences'
    });
  }
};

/**
 * Approve or reject action sequence
 * POST /api/lam/approve/:sequenceId
 */
export const approveSequence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sequenceId } = req.params;
    const { approved } = req.body;

    if (approved === undefined) {
      throw new ValidationError('approved (boolean) is required');
    }

    logger.info('Processing sequence approval', {
      context: 'lam-controller',
      metadata: { sequenceId, approved }
    });

    const sequence = await largeActionModelService.approveSequence(sequenceId, approved);

    res.status(200).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error('Failed to approve sequence', {
      context: 'lam-controller',
      metadata: { error }
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process approval'
    });
  }
};

/**
 * Get sequence status
 * GET /api/lam/sequence/:sequenceId
 */
export const getSequenceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sequenceId } = req.params;

    const sequence = largeActionModelService.getSequence(sequenceId);

    if (!sequence) {
      res.status(404).json({
        success: false,
        message: 'Sequence not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error('Failed to fetch sequence', {
      context: 'lam-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch sequence'
    });
  }
};

/**
 * Execute approved sequence manually
 * POST /api/lam/execute/:sequenceId
 */
export const executeSequence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sequenceId } = req.params;

    logger.info('Manually executing sequence', {
      context: 'lam-controller',
      metadata: { sequenceId }
    });

    const sequence = await largeActionModelService.executeSequence(sequenceId);

    res.status(200).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error('Failed to execute sequence', {
      context: 'lam-controller',
      metadata: { error }
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to execute sequence'
    });
  }
};

/**
 * Trigger action from biometric alert
 * POST /api/lam/trigger/biometric
 */
export const triggerBiometricAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, metric, value, severity, context } = req.body;

    if (!userId || !metric || value === undefined) {
      throw new ValidationError('userId, metric, and value are required');
    }

    const trigger: ActionTrigger = {
      type: 'biometric_alert',
      source: 'biometric_monitoring',
      data: { metric, value, severity: severity || 'medium' },
      timestamp: new Date()
    };

    const sequence = await largeActionModelService.generateActionSequence(
      userId,
      trigger,
      context as UserContext
    );

    res.status(201).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error('Failed to trigger biometric action', {
      context: 'lam-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to trigger action'
    });
  }
};

/**
 * Trigger predictive action
 * POST /api/lam/trigger/predictive
 */
export const triggerPredictiveAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, prediction, confidence, context } = req.body;

    if (!userId || !prediction || confidence === undefined) {
      throw new ValidationError('userId, prediction, and confidence are required');
    }

    const trigger: ActionTrigger = {
      type: 'predictive',
      source: 'ml_forecasting',
      data: { prediction, confidence },
      timestamp: new Date()
    };

    const sequence = await largeActionModelService.generateActionSequence(
      userId,
      trigger,
      context as UserContext
    );

    res.status(201).json({
      success: true,
      data: sequence
    });
  } catch (error) {
    logger.error('Failed to trigger predictive action', {
      context: 'lam-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to trigger action'
    });
  }
};

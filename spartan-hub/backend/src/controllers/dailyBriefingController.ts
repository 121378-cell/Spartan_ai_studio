/**
 * Daily Briefing Controller
 * 
 * Handles API requests for personalized morning video briefings
 */

import { Request, Response } from 'express';
import { DailyBriefingService } from '../services/dailyBriefingService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

const briefingService = new DailyBriefingService();

/**
 * Generate daily briefing for a user
 * POST /api/briefings/generate
 */
export const generateBriefing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    logger.info('Generating daily briefing', {
      context: 'daily-briefing-controller',
      metadata: { userId }
    });

    const briefing = await briefingService.generateBriefing(userId);

    res.status(200).json({
      success: true,
      data: briefing
    });
  } catch (error) {
    logger.error('Failed to generate briefing', {
      context: 'daily-briefing-controller',
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
      message: 'Failed to generate briefing'
    });
  }
};

/**
 * Get user's daily briefing
 * GET /api/briefings/:userId
 */
export const getBriefing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    logger.info('Fetching daily briefing', {
      context: 'daily-briefing-controller',
      metadata: { userId }
    });

    const briefing = await briefingService.getTodayBriefing(userId);

    if (!briefing) {
      res.status(404).json({
        success: false,
        message: 'No briefing found for today'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: briefing
    });
  } catch (error) {
    logger.error('Failed to fetch briefing', {
      context: 'daily-briefing-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch briefing'
    });
  }
};

/**
 * Mark briefing as watched
 * POST /api/briefings/:briefingId/watch
 */
export const markBriefingWatched = async (req: Request, res: Response): Promise<void> => {
  try {
    const { briefingId } = req.params;
    const { userId } = req.body;

    logger.info('Marking briefing as watched', {
      context: 'daily-briefing-controller',
      metadata: { briefingId, userId }
    });

    await briefingService.markAsWatched(briefingId, userId);

    res.status(200).json({
      success: true,
      message: 'Briefing marked as watched'
    });
  } catch (error) {
    logger.error('Failed to mark briefing as watched', {
      context: 'daily-briefing-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update briefing status'
    });
  }
};

/**
 * Get briefing history for a user
 * GET /api/briefings/:userId/history
 */
export const getBriefingHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;

    logger.info('Fetching briefing history', {
      context: 'daily-briefing-controller',
      metadata: { userId, limit }
    });

    const history = await briefingService.getBriefingHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to fetch briefing history', {
      context: 'daily-briefing-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch briefing history'
    });
  }
};

/**
 * Regenerate today's briefing
 * POST /api/briefings/:userId/regenerate
 */
export const regenerateBriefing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    logger.info('Regenerating daily briefing', {
      context: 'daily-briefing-controller',
      metadata: { userId }
    });

    const briefing = await briefingService.regenerateBriefing(userId);

    res.status(200).json({
      success: true,
      data: briefing
    });
  } catch (error) {
    logger.error('Failed to regenerate briefing', {
      context: 'daily-briefing-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to regenerate briefing'
    });
  }
};

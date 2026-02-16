/**
 * Nutrition Photo Controller
 * 
 * Handles API requests for food photo analysis and nutrition tracking
 */

import { Request, Response } from 'express';
import { NutritionPhotoService } from '../services/nutritionPhotoService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

const nutritionService = new NutritionPhotoService();

/**
 * Analyze a food photo
 * POST /api/nutrition/analyze
 */
export const analyzePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (!file) {
      throw new ValidationError('Photo is required');
    }

    logger.info('Analyzing nutrition photo', {
      context: 'nutrition-photo-controller',
      metadata: {
        userId,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    });

    const result = await nutritionService.analyzePhoto(file.buffer, userId);

    // Save to database
    await nutritionService.saveAnalysis(result);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to analyze photo', {
      context: 'nutrition-photo-controller',
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
      message: 'Failed to analyze photo'
    });
  }
};

/**
 * Get nutrition log for a user
 * GET /api/nutrition/log/:userId
 */
export const getNutritionLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    logger.info('Fetching nutrition log', {
      context: 'nutrition-photo-controller',
      metadata: { userId, date }
    });

    const logs = await nutritionService.getDailyLog(userId, date);

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Failed to fetch nutrition log', {
      context: 'nutrition-photo-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch nutrition log'
    });
  }
};

/**
 * Get nutrition insights for a user
 * GET /api/nutrition/insights/:userId
 */
export const getNutritionInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    logger.info('Fetching nutrition insights', {
      context: 'nutrition-photo-controller',
      metadata: { userId, days }
    });

    const insights = await nutritionService.getInsights(userId, days);

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Failed to fetch nutrition insights', {
      context: 'nutrition-photo-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch nutrition insights'
    });
  }
};

/**
 * Delete a nutrition log entry
 * DELETE /api/nutrition/log/:entryId
 */
export const deleteLogEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entryId } = req.params;
    const { userId } = req.body;

    logger.info('Deleting nutrition log entry', {
      context: 'nutrition-photo-controller',
      metadata: { entryId, userId }
    });

    await nutritionService.deleteEntry(entryId, userId);

    res.status(200).json({
      success: true,
      message: 'Entry deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete log entry', {
      context: 'nutrition-photo-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete entry'
    });
  }
};

/**
 * Get nutrition trends
 * GET /api/nutrition/trends/:userId
 */
export const getNutritionTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    logger.info('Fetching nutrition trends', {
      context: 'nutrition-photo-controller',
      metadata: { userId, days }
    });

    const trends = await nutritionService.getTrends(userId, days);

    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Failed to fetch nutrition trends', {
      context: 'nutrition-photo-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch nutrition trends'
    });
  }
};

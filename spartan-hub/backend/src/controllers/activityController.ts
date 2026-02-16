import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Record a user activity
 * @param req - Express request object containing userId and activity data
 * @param res - Express response object
 * @returns Promise<void>
 * @description Records a new activity for the authenticated user
 */
export const recordActivity = async (req: Request, res: Response) => {
  try {
    const { userId, type, description, metadata } = req.body;

    // Validate required fields
    if (!userId || !type || !description) {
      return res.status(400).json({
        success: false,
        message: 'userId, type, and description are required'
      });
    }

    // Create activity
    const activity = await UserModel.addActivity({
      userId,
      type,
      description,
      metadata
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Activity recorded successfully',
      data: activity
    });
  } catch (error) {
    logger.error('Error recording activity', { context: 'activity', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get user activity history
 * @param req - Express request object with userId parameter
 * @param res - Express response object
 * @returns Promise<void>
 * @description Retrieves the authenticated user's activity history
 */
export const getUserActivityHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Get activity history
    const activities = await UserModel.getActivityHistory(userId, parseInt(limit as string) || 50);

    // Return activities
    return res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    logger.error('Error fetching activity history', { context: 'activity', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
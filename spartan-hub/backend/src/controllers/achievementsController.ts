import { Request, Response } from 'express';
import { AchievementService } from '../services/achievementService';
import { getDb } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Get all achievements for a user
 */
export const getUserAchievements = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = getDb();
    const achievementService = new AchievementService(db);
    
    const achievements = await achievementService.getUserAchievements(userId);
    
    return res.status(200).json({
      success: true,
      data: achievements,
      message: 'User achievements retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get user achievements', { 
      context: 'achievements', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user achievements'
    });
  }
};

/**
 * Get user's achievement progress
 */
export const getUserAchievementProgress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = getDb();
    const achievementService = new AchievementService(db);
    
    const progress = await achievementService.getUserAchievements(userId);
    
    return res.status(200).json({
      success: true,
      data: progress,
      message: 'Achievement progress retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get achievement progress', { 
      context: 'achievements', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve achievement progress'
    });
  }
};

/**
 * Get available achievements
 */
export const getAvailableAchievements = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const achievementService = new AchievementService(db);
    
    const achievements = await achievementService.getAllAchievements();
    
    return res.status(200).json({
      success: true,
      data: achievements,
      message: 'Available achievements retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get available achievements', { 
      context: 'achievements', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve available achievements'
    });
  }
};

/**
 * Check if user unlocked new achievements
 */
export const checkUnlockedAchievements = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { activityType, activityData } = req.body;
    
    const db = getDb();
    const achievementService = new AchievementService(db);
    
    const unlocked = await achievementService.checkAndUpdateAchievementProgress(
      userId,
      activityType,
      activityData
    );
    
    return res.status(200).json({
      success: true,
      data: unlocked,
      message: `${unlocked.length} new achievements unlocked`
    });
  } catch (error) {
    logger.error('Failed to check unlocked achievements', { 
      context: 'achievements', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to check unlocked achievements'
    });
  }
};

/**
 * Get user's achievement statistics
 */
export const getUserAchievementStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = getDb();
    const achievementService = new AchievementService(db);
    
    const stats = await achievementService.getUserAchievements(userId);
    
    return res.status(200).json({
      success: true,
      data: stats,
      message: 'Achievement statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get achievement stats', { 
      context: 'achievements', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve achievement statistics'
    });
  }
};
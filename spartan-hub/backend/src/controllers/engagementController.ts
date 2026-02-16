import { Request, Response } from 'express';
import { EngagementEngineService } from '../services/engagementEngineService';
import { getDb } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Create a new challenge
 */
export const createChallenge = async (req: Request, res: Response) => {
  try {
    const { title, description, type, difficulty, rewardPoints, startDate, endDate } = req.body;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    const challengeId = await engagementService.createChallenge({
      title,
      description,
      type,
      difficulty,
      rewardPoints,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });
    
    return res.status(201).json({
      success: true,
      data: { challengeId },
      message: 'Challenge created successfully'
    });
  } catch (error) {
    logger.error('Failed to create challenge', { 
      context: 'engagement', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create challenge'
    });
  }
};

/**
 * Join a challenge
 */
export const joinChallenge = async (req: Request, res: Response) => {
  try {
    const { userId, challengeId } = req.params;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    await engagementService.joinChallenge(Number(userId), Number(challengeId));
    
    return res.status(200).json({
      success: true,
      message: 'Successfully joined challenge'
    });
  } catch (error) {
    logger.error('Failed to join challenge', { 
      context: 'engagement', 
      metadata: { error: String(error), userId: req.params.userId, challengeId: req.params.challengeId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to join challenge'
    });
  }
};

/**
 * Update challenge progress
 */
export const updateChallengeProgress = async (req: Request, res: Response) => {
  try {
    const { userId, challengeId } = req.params;
    const { progress } = req.body;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    await engagementService.updateChallengeProgress(Number(userId), Number(challengeId), progress);
    
    return res.status(200).json({
      success: true,
      message: 'Challenge progress updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update challenge progress', { 
      context: 'engagement', 
      metadata: { error: String(error), userId: req.params.userId, challengeId: req.params.challengeId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to update challenge progress'
    });
  }
};

/**
 * Update user streak
 */
export const updateUserStreak = async (req: Request, res: Response) => {
  try {
    const { userId, streakType } = req.params;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    const newStreak = await engagementService.updateUserStreak(Number(userId), streakType as any);
    
    return res.status(200).json({
      success: true,
      data: { newStreak },
      message: 'User streak updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update user streak', { 
      context: 'engagement', 
      metadata: { error: String(error), userId: req.params.userId, streakType: req.params.streakType } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to update user streak'
    });
  }
};

/**
 * Record social interaction
 */
export const recordSocialInteraction = async (req: Request, res: Response) => {
  try {
    const { userId, targetUserId, interactionType, message } = req.body;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    await engagementService.recordSocialInteraction(
      Number(userId),
      Number(targetUserId),
      interactionType,
      message
    );
    
    return res.status(200).json({
      success: true,
      message: 'Social interaction recorded successfully'
    });
  } catch (error) {
    logger.error('Failed to record social interaction', { 
      context: 'engagement', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to record social interaction'
    });
  }
};

/**
 * Get user's active challenges
 */
export const getUserActiveChallenges = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    const challenges = await engagementService.getUserActiveChallenges(Number(userId));
    
    return res.status(200).json({
      success: true,
      data: challenges,
      message: 'Active challenges retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get user active challenges', { 
      context: 'engagement', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active challenges'
    });
  }
};

/**
 * Get user's streak information
 */
export const getUserStreaks = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    const streaks = await engagementService.getUserStreaks(Number(userId));
    
    return res.status(200).json({
      success: true,
      data: streaks,
      message: 'User streaks retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get user streaks', { 
      context: 'engagement', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user streaks'
    });
  }
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    const leaderboard = await engagementService.getLeaderboard(Number(limit));
    
    return res.status(200).json({
      success: true,
      data: leaderboard,
      message: 'Leaderboard retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get leaderboard', { 
      context: 'engagement', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaderboard'
    });
  }
};

/**
 * Get available challenges
 */
export const getAvailableChallenges = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const db = getDb();
    const engagementService = new EngagementEngineService(db);
    
    const challenges = await engagementService.getAvailableChallenges(Number(userId));
    
    return res.status(200).json({
      success: true,
      data: challenges,
      message: 'Available challenges retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get available challenges', { 
      context: 'engagement', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve available challenges'
    });
  }
};
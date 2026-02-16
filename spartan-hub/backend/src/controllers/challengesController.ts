/**
 * Team Challenges Controller
 * 
 * Handles API requests for group competitions
 */

import { Request, Response } from 'express';
import { teamChallengesService } from '../services/teamChallengesService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

/**
 * Create challenge
 * POST /api/challenges
 */
export const createChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      creatorId,
      type,
      title,
      description,
      goal,
      timeframe,
      options
    } = req.body;

    if (!creatorId || !type || !title || !goal) {
      throw new ValidationError('Required fields missing');
    }

    const challenge = await teamChallengesService.createChallenge(
      creatorId,
      type,
      title,
      description,
      goal,
      timeframe,
      options
    );

    res.status(201).json({
      success: true,
      data: challenge
    });
  } catch (error) {
    logger.error('Failed to create challenge', {
      context: 'challenges-controller',
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
      message: 'Failed to create challenge'
    });
  }
};

/**
 * Join challenge
 * POST /api/challenges/:challengeId/join
 */
export const joinChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    const { userId, teamId } = req.body;

    if (!userId) {
      throw new ValidationError('userId is required');
    }

    const participant = await teamChallengesService.joinChallenge(
      challengeId,
      userId,
      teamId
    );

    res.status(200).json({
      success: true,
      data: participant
    });
  } catch (error) {
    logger.error('Failed to join challenge', {
      context: 'challenges-controller',
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
      message: 'Failed to join challenge'
    });
  }
};

/**
 * Create team
 * POST /api/challenges/:challengeId/teams
 */
export const createTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    const { captainId, name, avatar } = req.body;

    if (!captainId || !name) {
      throw new ValidationError('captainId and name are required');
    }

    const team = await teamChallengesService.createTeam(
      challengeId,
      captainId,
      name,
      avatar
    );

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    logger.error('Failed to create team', {
      context: 'challenges-controller',
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
      message: 'Failed to create team'
    });
  }
};

/**
 * Update progress
 * POST /api/challenges/:challengeId/progress
 */
export const updateProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    const { userId, value } = req.body;

    if (!userId || value === undefined) {
      throw new ValidationError('userId and value are required');
    }

    const participant = await teamChallengesService.updateProgress(
      challengeId,
      userId,
      value
    );

    res.status(200).json({
      success: true,
      data: participant
    });
  } catch (error) {
    logger.error('Failed to update progress', {
      context: 'challenges-controller',
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
      message: 'Failed to update progress'
    });
  }
};

/**
 * Get leaderboard
 * GET /api/challenges/:challengeId/leaderboard
 */
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    const { type } = req.query;

    const leaderboard = await teamChallengesService.getLeaderboard(
      challengeId,
      type as 'individual' | 'team' || 'individual'
    );

    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Failed to fetch leaderboard', {
      context: 'challenges-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
};

/**
 * Get available challenges
 * GET /api/challenges
 */
export const getAvailableChallenges = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, visibility, limit, offset } = req.query;

    const result = await teamChallengesService.getAvailableChallenges(
      {
        type: type as any,
        visibility: visibility as any
      },
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to fetch challenges', {
      context: 'challenges-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges'
    });
  }
};

/**
 * Get user's active challenges
 * GET /api/challenges/user/:userId
 */
export const getUserChallenges = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const challenges = await teamChallengesService.getUserActiveChallenges(userId);

    res.status(200).json({
      success: true,
      data: challenges
    });
  } catch (error) {
    logger.error('Failed to fetch user challenges', {
      context: 'challenges-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges'
    });
  }
};

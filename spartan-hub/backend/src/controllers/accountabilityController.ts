/**
 * Accountability Matching Controller
 * 
 * Handles API requests for workout partner matching and challenges
 */

import { Request, Response } from 'express';
import { AccountabilityMatchingService } from '../services/accountabilityMatchingService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

const matchingService = new AccountabilityMatchingService();

/**
 * Find compatible workout partners for a user
 * GET /api/accountability/matches/:userId
 */
export const findMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    const preferInPerson = req.query.inPerson === 'true';

    logger.info('Finding accountability matches', {
      context: 'accountability-controller',
      metadata: { userId, limit, preferInPerson }
    });

    const matches = await matchingService.findMatches(userId, limit, preferInPerson);

    res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Failed to find matches', {
      context: 'accountability-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to find matches'
    });
  }
};

/**
 * Create an accountability match
 * POST /api/accountability/matches
 */
export const createMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user1Id, user2Id, matchScore } = req.body;

    if (!user1Id || !user2Id || !matchScore) {
      throw new ValidationError('user1Id, user2Id, and matchScore are required');
    }

    logger.info('Creating accountability match', {
      context: 'accountability-controller',
      metadata: { user1Id, user2Id, matchScore }
    });

    const match = await matchingService.createMatch(user1Id, user2Id, matchScore);

    res.status(201).json({
      success: true,
      data: match
    });
  } catch (error) {
    logger.error('Failed to create match', {
      context: 'accountability-controller',
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
      message: 'Failed to create match'
    });
  }
};

/**
 * Accept a match request
 * POST /api/accountability/matches/:matchId/accept
 */
export const acceptMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    logger.info('Accepting accountability match', {
      context: 'accountability-controller',
      metadata: { matchId, userId }
    });

    const match = await matchingService.acceptMatch(matchId, userId);

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    logger.error('Failed to accept match', {
      context: 'accountability-controller',
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
      message: 'Failed to accept match'
    });
  }
};

/**
 * Decline a match request
 * POST /api/accountability/matches/:matchId/decline
 */
export const declineMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    const { userId } = req.body;

    logger.info('Declining accountability match', {
      context: 'accountability-controller',
      metadata: { matchId, userId }
    });

    await matchingService.declineMatch(matchId, userId);

    res.status(200).json({
      success: true,
      message: 'Match declined'
    });
  } catch (error) {
    logger.error('Failed to decline match', {
      context: 'accountability-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to decline match'
    });
  }
};

/**
 * Get user's matches
 * GET /api/accountability/matches/user/:userId
 */
export const getUserMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    logger.info('Fetching user matches', {
      context: 'accountability-controller',
      metadata: { userId }
    });

    const matches = await matchingService.getUserMatches(userId);

    res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    logger.error('Failed to fetch user matches', {
      context: 'accountability-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches'
    });
  }
};

/**
 * Create a challenge
 * POST /api/accountability/challenges
 */
export const createChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      matchId,
      type,
      title,
      description,
      targetValue,
      unit,
      durationDays,
      participantIds
    } = req.body;

    if (!matchId || !type || !title || !participantIds) {
      throw new ValidationError('matchId, type, title, and participantIds are required');
    }

    logger.info('Creating challenge', {
      context: 'accountability-controller',
      metadata: {
        matchId,
        type,
        title,
        participantCount: participantIds.length
      }
    });

    const challenge = await matchingService.createChallenge(
      matchId,
      type,
      title,
      description,
      targetValue,
      unit,
      durationDays,
      participantIds
    );

    res.status(201).json({
      success: true,
      data: challenge
    });
  } catch (error) {
    logger.error('Failed to create challenge', {
      context: 'accountability-controller',
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
 * Get user's challenges
 * GET /api/accountability/challenges/:userId
 */
export const getUserChallenges = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const status = req.query.status as string;

    logger.info('Fetching user challenges', {
      context: 'accountability-controller',
      metadata: { userId, status }
    });

    const challenges = await matchingService.getUserChallenges(userId);

    // Filter by status if provided
    const filteredChallenges = status
      ? challenges.filter((c) => c.status === status)
      : challenges;

    res.status(200).json({
      success: true,
      data: filteredChallenges
    });
  } catch (error) {
    logger.error('Failed to fetch user challenges', {
      context: 'accountability-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges'
    });
  }
};

/**
 * Record check-in
 * POST /api/accountability/checkin
 */
export const recordCheckIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId, userId } = req.body;

    if (!matchId || !userId) {
      throw new ValidationError('matchId and userId are required');
    }

    logger.info('Recording check-in', {
      context: 'accountability-controller',
      metadata: { matchId, userId }
    });

    await matchingService.recordCheckIn(matchId, userId);

    res.status(200).json({
      success: true,
      message: 'Check-in recorded'
    });
  } catch (error) {
    logger.error('Failed to record check-in', {
      context: 'accountability-controller',
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
      message: 'Failed to record check-in'
    });
  }
};

/**
 * Update challenge progress
 * POST /api/accountability/challenges/:challengeId/progress
 */
export const updateChallengeProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    const { userId, value } = req.body;

    if (!userId || value === undefined) {
      throw new ValidationError('userId and value are required');
    }

    logger.info('Updating challenge progress', {
      context: 'accountability-controller',
      metadata: { challengeId, userId, value }
    });

    await matchingService.updateChallengeProgress(challengeId, userId, value);

    res.status(200).json({
      success: true,
      message: 'Progress updated'
    });
  } catch (error) {
    logger.error('Failed to update challenge progress', {
      context: 'accountability-controller',
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

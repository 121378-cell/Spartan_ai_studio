/**
 * Accountability Matching Routes
 * 
 * API routes for workout partner matching and challenges
 */

import { Router } from 'express';
import {
  findMatches,
  createMatch,
  acceptMatch,
  declineMatch,
  getUserMatches,
  createChallenge,
  getUserChallenges,
  recordCheckIn,
  updateChallengeProgress
} from '../controllers/accountabilityController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/accountability/matches/:userId
 * @desc    Find compatible workout partners
 * @access  Private
 */
router.get('/matches/:userId', findMatches);

/**
 * @route   POST /api/accountability/matches
 * @desc    Create an accountability match
 * @access  Private
 */
router.post('/matches', createMatch);

/**
 * @route   POST /api/accountability/matches/:matchId/accept
 * @desc    Accept a match request
 * @access  Private
 */
router.post('/matches/:matchId/accept', acceptMatch);

/**
 * @route   POST /api/accountability/matches/:matchId/decline
 * @desc    Decline a match request
 * @access  Private
 */
router.post('/matches/:matchId/decline', declineMatch);

/**
 * @route   GET /api/accountability/matches/user/:userId
 * @desc    Get user's matches
 * @access  Private
 */
router.get('/matches/user/:userId', getUserMatches);

/**
 * @route   POST /api/accountability/challenges
 * @desc    Create a challenge
 * @access  Private
 */
router.post('/challenges', createChallenge);

/**
 * @route   GET /api/accountability/challenges/:userId
 * @desc    Get user's challenges
 * @access  Private
 */
router.get('/challenges/:userId', getUserChallenges);

/**
 * @route   POST /api/accountability/checkin
 * @desc    Record check-in
 * @access  Private
 */
router.post('/checkin', recordCheckIn);

/**
 * @route   POST /api/accountability/challenges/:challengeId/progress
 * @desc    Update challenge progress
 * @access  Private
 */
router.post('/challenges/:challengeId/progress', updateChallengeProgress);

export default router;

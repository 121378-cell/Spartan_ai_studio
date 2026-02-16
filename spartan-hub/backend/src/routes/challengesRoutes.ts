/**
 * Challenges Routes
 *
 * API routes for team challenges (Fase 6)
 */

import { Router } from 'express';
import {
  createChallenge,
  joinChallenge,
  createTeam,
  updateProgress,
  getLeaderboard,
  getAvailableChallenges,
  getUserChallenges
} from '../controllers/challengesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/challenges
 * @desc    Create new challenge
 * @access  Private
 */
router.post('/', createChallenge);

/**
 * @route   POST /api/challenges/:challengeId/join
 * @desc    Join challenge
 * @access  Private
 */
router.post('/:challengeId/join', joinChallenge);

/**
 * @route   POST /api/challenges/:challengeId/teams
 * @desc    Create team within challenge
 * @access  Private
 */
router.post('/:challengeId/teams', createTeam);

/**
 * @route   POST /api/challenges/:challengeId/progress
 * @desc    Update participant progress
 * @access  Private
 */
router.post('/:challengeId/progress', updateProgress);

/**
 * @route   GET /api/challenges/:challengeId/leaderboard
 * @desc    Get leaderboard
 * @access  Private
 */
router.get('/:challengeId/leaderboard', getLeaderboard);

/**
 * @route   GET /api/challenges
 * @desc    Get available challenges
 * @access  Private
 */
router.get('/', getAvailableChallenges);

/**
 * @route   GET /api/challenges/user/:userId
 * @desc    Get user's active challenges
 * @access  Private
 */
router.get('/user/:userId', getUserChallenges);

export default router;

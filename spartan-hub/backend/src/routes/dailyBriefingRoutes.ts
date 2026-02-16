/**
 * Daily Briefing Routes
 * 
 * API routes for personalized morning video briefings
 */

import { Router } from 'express';
import {
  generateBriefing,
  getBriefing,
  markBriefingWatched,
  getBriefingHistory,
  regenerateBriefing
} from '../controllers/dailyBriefingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/briefings/generate
 * @desc    Generate daily briefing for user
 * @access  Private
 */
router.post('/generate', generateBriefing);

/**
 * @route   GET /api/briefings/:userId
 * @desc    Get user's daily briefing
 * @access  Private
 */
router.get('/:userId', getBriefing);

/**
 * @route   POST /api/briefings/:briefingId/watch
 * @desc    Mark briefing as watched
 * @access  Private
 */
router.post('/:briefingId/watch', markBriefingWatched);

/**
 * @route   GET /api/briefings/:userId/history
 * @desc    Get briefing history
 * @access  Private
 */
router.get('/:userId/history', getBriefingHistory);

/**
 * @route   POST /api/briefings/:userId/regenerate
 * @desc    Regenerate today's briefing
 * @access  Private
 */
router.post('/:userId/regenerate', regenerateBriefing);

export default router;

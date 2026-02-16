/**
 * Voice Coaching Routes
 * 
 * API routes for real-time voice coaching during workouts
 */

import { Router } from 'express';
import {
  startVoiceCoaching,
  sendContextualCoaching,
  handleVoiceCommand,
  pauseVoiceCoaching,
  resumeVoiceCoaching,
  endVoiceCoaching,
  getSessionStatus,
  sendCoachingMessage
} from '../controllers/voiceCoachingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/voice-coaching/start
 * @desc    Start voice coaching session
 * @access  Private
 */
router.post('/start', startVoiceCoaching);

/**
 * @route   POST /api/voice-coaching/:sessionId/context
 * @desc    Send contextual coaching based on workout state
 * @access  Private
 */
router.post('/:sessionId/context', sendContextualCoaching);

/**
 * @route   POST /api/voice-coaching/:sessionId/command
 * @desc    Handle voice command from user
 * @access  Private
 */
router.post('/:sessionId/command', handleVoiceCommand);

/**
 * @route   POST /api/voice-coaching/:sessionId/pause
 * @desc    Pause voice coaching
 * @access  Private
 */
router.post('/:sessionId/pause', pauseVoiceCoaching);

/**
 * @route   POST /api/voice-coaching/:sessionId/resume
 * @desc    Resume voice coaching
 * @access  Private
 */
router.post('/:sessionId/resume', resumeVoiceCoaching);

/**
 * @route   POST /api/voice-coaching/:sessionId/end
 * @desc    End voice coaching session
 * @access  Private
 */
router.post('/:sessionId/end', endVoiceCoaching);

/**
 * @route   GET /api/voice-coaching/:sessionId
 * @desc    Get session status
 * @access  Private
 */
router.get('/:sessionId', getSessionStatus);

/**
 * @route   POST /api/voice-coaching/:sessionId/message
 * @desc    Send manual coaching message
 * @access  Private
 */
router.post('/:sessionId/message', sendCoachingMessage);

export default router;

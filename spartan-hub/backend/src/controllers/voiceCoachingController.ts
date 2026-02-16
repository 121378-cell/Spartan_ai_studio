/**
 * Voice Coaching Controller
 * 
 * Handles API requests for real-time voice coaching during workouts
 */

import { Request, Response } from 'express';
import { voiceCoachingService, VoiceSettings } from '../services/voiceCoachingService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

/**
 * Start voice coaching session
 * POST /api/voice-coaching/start
 */
export const startVoiceCoaching = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, workoutId, voiceSettings } = req.body;

    if (!userId || !workoutId) {
      throw new ValidationError('User ID and workout ID are required');
    }

    logger.info('Starting voice coaching session', {
      context: 'voice-coaching-controller',
      metadata: { userId, workoutId }
    });

    const session = await voiceCoachingService.startSession(
      userId,
      workoutId,
      voiceSettings as Partial<VoiceSettings>
    );

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Failed to start voice coaching', {
      context: 'voice-coaching-controller',
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
      message: 'Failed to start voice coaching'
    });
  }
};

/**
 * Send contextual coaching message
 * POST /api/voice-coaching/:sessionId/context
 */
export const sendContextualCoaching = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { exerciseName, targetSets, targetReps, currentSet, currentRep, formScore, pace } = req.body;

    const message = await voiceCoachingService.generateContextualCoaching(sessionId, {
      exerciseName,
      targetSets,
      targetReps,
      currentSet,
      currentRep,
      formScore,
      pace
    });

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Failed to generate contextual coaching', {
      context: 'voice-coaching-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate coaching'
    });
  }
};

/**
 * Handle voice command
 * POST /api/voice-coaching/:sessionId/command
 */
export const handleVoiceCommand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { command } = req.body;

    if (!command) {
      throw new ValidationError('Command is required');
    }

    logger.info('Processing voice command', {
      context: 'voice-coaching-controller',
      metadata: { sessionId, command }
    });

    const result = await voiceCoachingService.handleVoiceCommand(sessionId, command);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to process voice command', {
      context: 'voice-coaching-controller',
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
      message: 'Failed to process command'
    });
  }
};

/**
 * Pause voice coaching session
 * POST /api/voice-coaching/:sessionId/pause
 */
export const pauseVoiceCoaching = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    await voiceCoachingService.pauseSession(sessionId);

    res.status(200).json({
      success: true,
      message: 'Voice coaching paused'
    });
  } catch (error) {
    logger.error('Failed to pause voice coaching', {
      context: 'voice-coaching-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to pause'
    });
  }
};

/**
 * Resume voice coaching session
 * POST /api/voice-coaching/:sessionId/resume
 */
export const resumeVoiceCoaching = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    await voiceCoachingService.resumeSession(sessionId);

    res.status(200).json({
      success: true,
      message: 'Voice coaching resumed'
    });
  } catch (error) {
    logger.error('Failed to resume voice coaching', {
      context: 'voice-coaching-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to resume'
    });
  }
};

/**
 * End voice coaching session
 * POST /api/voice-coaching/:sessionId/end
 */
export const endVoiceCoaching = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    logger.info('Ending voice coaching session', {
      context: 'voice-coaching-controller',
      metadata: { sessionId }
    });

    const session = await voiceCoachingService.endSession(sessionId);

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Failed to end voice coaching', {
      context: 'voice-coaching-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to end session'
    });
  }
};

/**
 * Get session status
 * GET /api/voice-coaching/:sessionId
 */
export const getSessionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = voiceCoachingService.getSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Failed to get session status', {
      context: 'voice-coaching-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get session'
    });
  }
};

/**
 * Send manual coaching message
 * POST /api/voice-coaching/:sessionId/message
 */
export const sendCoachingMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { type, text, priority, metadata } = req.body;

    const message = await voiceCoachingService.sendCoachingMessage(sessionId, {
      type,
      text,
      priority,
      metadata
    });

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Failed to send coaching message', {
      context: 'voice-coaching-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

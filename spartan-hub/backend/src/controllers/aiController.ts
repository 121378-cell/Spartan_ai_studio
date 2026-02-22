import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { checkAiServiceHealth } from '../services/aiService';
import { DecisionContext, DecisionOutput } from '../services/decisionPromptTemplate';
import { userDb } from '../services/databaseServiceFactory';
import { ServiceUnavailableError, NotFoundError, ValidationError } from '../utils/errorHandler';
import { aiMessageQueue } from '../utils/messageQueue';
import { logger } from '../utils/logger';
import { AiProviderFactory } from '../services/ai/AiProviderFactory';

/**
 * Reload AI provider configuration
 * POST /ai/config/reload
 */
export const reloadAiConfig = async (req: Request, res: Response) => {
  try {
    AiProviderFactory.resetProvider();
    logger.info('AI provider configuration reloaded manually', { context: 'aiController' });

    return res.status(200).json({
      success: true,
      message: 'AI provider configuration reloaded successfully.'
    });
  } catch (error: unknown) {
    logger.error('Error reloading AI configuration', {
      context: 'aiController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return res.status(500).json({
      success: false,
      message: 'Unable to reload AI configuration at this time.'
    });
  }
};


/**
 * Get AI alert prediction for a user
 * POST /ai/alert/:userId
 */
export const getAiAlert = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      throw new ValidationError('User ID is required to generate an AI alert.');
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('We could not find a user with that ID. Please check the user information and try again.');
    }

    // Use message queue for AI request
    const aiResponse = await aiMessageQueue.enqueue('alert_prediction', user);

    // Return the response
    return res.status(200).json({
      success: true,
      message: 'AI alert generated successfully.',
      data: aiResponse
    });
  } catch (error: unknown) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'ServiceUnavailableError') {
        return res.status(503).json({
          success: false,
          message: 'The AI service is temporarily unavailable. Please try again in a few moments.',
          code: 'AI_SERVICE_UNAVAILABLE'
        });
      }

      // Handle queue overflow
      if (error.message.includes('queue is full')) {
        return res.status(503).json({
          success: false,
          message: 'The AI service is currently overloaded. Please try again in a few moments.',
          code: 'AI_QUEUE_FULL'
        });
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
};

/**
 * Generate structured decision and update database
 * POST /ai/decision/:userId
 */
export const generateStructuredDecision = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { PartituraSemanal, Causa, PuntajeSinergico }: DecisionContext = req.body;

    // Validate userId
    if (!userId) {
      throw new ValidationError('User ID is required to generate a structured decision.');
    }

    // Validate request body
    if (!PartituraSemanal || !Causa || PuntajeSinergico === undefined) {
      throw new ValidationError('PartituraSemanal, Causa, and PuntajeSinergico are required to generate a decision.');
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('We could not find a user with that ID. Please check the user information and try again.');
    }

    // Prepare decision context
    const context: DecisionContext = {
      PartituraSemanal,
      Causa,
      PuntajeSinergico
    };

    // Use message queue for AI request
    const decisionOutput = await aiMessageQueue.enqueue('decision_generation', context) as DecisionOutput | null;

    if (!decisionOutput) {
      throw new ServiceUnavailableError('Unable to generate a structured decision at this time. Please try again later.');
    }

    // Update user's weekly score data in the database if NewPartituraSemanal is provided
    if (decisionOutput.NewPartituraSemanal) {
      const updatedUser = await userDb.update(userId, {
        // Here we would update the relevant fields in the user profile
        // This is a placeholder - you would need to determine which fields to update
        // based on your application's data structure
        lastWeeklyPlanDate: new Date().toISOString()
      });

      if (!updatedUser) {
        logger.warn('Failed to update user with new weekly score data', {
          context: 'aiController',
          metadata: { userId }
        });
      }
    }

    // Return the decision output
    // The frontend can use IsAlertaRoja to trigger tactical intervention logic (FUI10)
    return res.status(200).json({
      success: true,
      message: 'Structured decision generated successfully.',
      data: decisionOutput
    });
  } catch (error: unknown) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'ServiceUnavailableError') {
        return res.status(503).json({
          success: false,
          message: 'The decision generation service is temporarily unavailable. Please try again in a few moments.',
          code: 'DECISION_SERVICE_UNAVAILABLE'
        });
      }

      // Handle queue overflow
      if (error.message.includes('queue is full')) {
        return res.status(503).json({
          success: false,
          message: 'The AI service is currently overloaded. Please try again in a few moments.',
          code: 'AI_QUEUE_FULL'
        });
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
};

/**
 * Health check for the AI service
 * GET /ai/health
 */
export const checkAiHealth = async (req: Request, res: Response) => {
  try {
    // Check if the AI service is available
    const isHealthy = await checkAiServiceHealth();

    return res.status(200).json({
      success: true,
      message: 'AI service health check completed.',
      data: {
        aiServiceHealthy: isHealthy
      }
    });
  } catch (error: unknown) {
    logger.error('Error checking AI health', {
      context: 'aiController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return res.status(500).json({
      success: false,
      message: 'Unable to perform AI service health check at this time. Please try again later.'
    });
  }
};

/**
 * Get AI alert prediction with user data in request body
 * POST /ai/alert
 */
export const getAiAlertFromBody = async (req: Request, res: Response) => {
  try {
    const userData = req.body;

    // Validate required fields
    if (!userData) {
      throw new ValidationError('User data is required to generate an AI alert.');
    }

    // Use message queue for AI request
    const aiResponse = await aiMessageQueue.enqueue('alert_prediction', userData);

    // Return the response
    return res.status(200).json({
      success: true,
      message: 'AI alert generated successfully.',
      data: aiResponse
    });
  } catch (error: unknown) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'ServiceUnavailableError') {
        return res.status(503).json({
          success: false,
          message: 'The AI service is temporarily unavailable. Please try again in a few moments.',
          code: 'AI_SERVICE_UNAVAILABLE'
        });
      }

      // Handle queue overflow
      if (error.message.includes('queue is full')) {
        return res.status(503).json({
          success: false,
          message: 'The AI service is currently overloaded. Please try again in a few moments.',
          code: 'AI_QUEUE_FULL'
        });
      }
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  }
};

/**
 * Get queue statistics
 * GET /ai/queue/stats
 */
export const getQueueStats = (req: Request, res: Response) => {
  try {
    const stats = aiMessageQueue.getStats();

    return res.status(200).json({
      success: true,
      message: 'AI queue statistics retrieved successfully.',
      data: stats
    });
  } catch (error: unknown) {
    logger.error('Error getting queue stats', {
      context: 'aiController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve AI queue statistics at this time. Please try again later.'
    });
  }
};
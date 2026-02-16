/**
 * Expert Marketplace Controller
 * 
 * Handles API requests for trainer-user marketplace
 */

import { Request, Response } from 'express';
import { expertMarketplaceService } from '../services/expertMarketplaceService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

/**
 * Register as expert
 * POST /api/marketplace/experts/register
 */
export const registerExpert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, profile, subscriptionPrice } = req.body;

    if (!userId || !profile || !subscriptionPrice) {
      throw new ValidationError('userId, profile, and subscriptionPrice are required');
    }

    logger.info('Registering expert', {
      context: 'marketplace-controller',
      metadata: { userId, displayName: profile.displayName }
    });

    const expert = await expertMarketplaceService.registerExpert(
      userId,
      profile,
      subscriptionPrice
    );

    res.status(201).json({
      success: true,
      data: expert
    });
  } catch (error) {
    logger.error('Failed to register expert', {
      context: 'marketplace-controller',
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
      message: 'Failed to register expert'
    });
  }
};

/**
 * Get experts list
 * GET /api/marketplace/experts
 */
export const getExperts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { specialty, minRating, verifiedOnly, limit, offset } = req.query;

    const result = await expertMarketplaceService.getExperts(
      {
        specialty: specialty as string,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        verifiedOnly: verifiedOnly === 'true'
      },
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to fetch experts', {
      context: 'marketplace-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch experts'
    });
  }
};

/**
 * Create content
 * POST /api/marketplace/content
 */
export const createContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      expertId,
      type,
      title,
      description,
      content,
      metadata,
      pricing
    } = req.body;

    if (!expertId || !type || !title || !content) {
      throw new ValidationError('Required fields missing');
    }

    const contentItem = await expertMarketplaceService.createContent(
      expertId,
      type,
      title,
      description,
      content,
      metadata,
      pricing
    );

    res.status(201).json({
      success: true,
      data: contentItem
    });
  } catch (error) {
    logger.error('Failed to create content', {
      context: 'marketplace-controller',
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
      message: 'Failed to create content'
    });
  }
};

/**
 * Subscribe to expert
 * POST /api/marketplace/subscribe
 */
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, expertId, plan, autoRenew } = req.body;

    if (!userId || !expertId) {
      throw new ValidationError('userId and expertId are required');
    }

    const subscription = await expertMarketplaceService.subscribe(
      userId,
      expertId,
      plan,
      autoRenew
    );

    res.status(201).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Failed to subscribe', {
      context: 'marketplace-controller',
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
      message: 'Failed to subscribe'
    });
  }
};

/**
 * Get available content
 * GET /api/marketplace/content
 */
export const getAvailableContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { type, difficulty, expertId, tags, limit, offset } = req.query;

    const result = await expertMarketplaceService.getAvailableContent(
      userId,
      {
        type: type as any,
        difficulty: difficulty as string,
        expertId: expertId as string,
        tags: tags ? (tags as string).split(',') : undefined
      },
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to fetch content', {
      context: 'marketplace-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch content'
    });
  }
};

/**
 * Add review
 * POST /api/marketplace/reviews
 */
export const addReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, expertId, rating, comment, contentId } = req.body;

    if (!userId || !expertId || !rating) {
      throw new ValidationError('Required fields missing');
    }

    const review = await expertMarketplaceService.addReview(
      userId,
      expertId,
      rating,
      comment,
      contentId
    );

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Failed to add review', {
      context: 'marketplace-controller',
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
      message: 'Failed to add review'
    });
  }
};

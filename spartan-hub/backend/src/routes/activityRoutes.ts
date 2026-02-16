import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { UserModel } from '../models/User';
import { verifyJWT } from '../middleware/auth';
import { apiRateLimit, writeRateLimit, getRateLimit } from '../middleware/rateLimitMiddleware';
import { validate } from '../middleware/validate';
import { createActivitySchema, getMyActivityHistorySchema, getActivityByIdSchema } from '../schemas/activitySchema';
import { sanitizeInputFields } from '../middleware/validationMiddleware';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting to all routes
router.use(apiRateLimit);

// Apply JWT verification middleware to all routes
router.use(verifyJWT);

/**
 * Add a new user activity
 * @param req - Express request object
 * @param res - Express response object
 */
router.post('/', validate(createActivitySchema), sanitizeInputFields, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {user} = req;
    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const activityData = req.body;
    
    // Create activity
    const activity = await UserModel.addActivity({
      userId: user.userId,
      type: activityData.type,
      description: activityData.description,
      metadata: activityData.metadata
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Activity recorded successfully',
      data: activity
    });
  } catch (error) {
    logger.error('Error recording activity', { context: 'activity', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Get user activity history
 * @param req - Express request object
 * @param res - Express response object
 * @returns Promise<void>
 */
router.get('/history', validate(getMyActivityHistorySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {user} = req;
    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Get limit from query params
    const { limit } = req.query as { limit?: string };
    
    // Get activity history
    const activities = await UserModel.getActivityHistory(user.userId, limit && typeof limit === 'string' ? parseInt(limit, 10) : undefined);

    // Return activities
    return res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    logger.error('Error fetching activity history', { context: 'activity', metadata: { error: error instanceof Error ? error.message : String(error) } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Get specific activity by ID
 * @param req - Express request object
 * @param res - Express response object
 * @returns Promise<void>
 */
router.get('/:activityId', validate(getActivityByIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {user} = req;
    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { activityId } = req.params;
    
    // Get activity
    const activity = await UserModel.getActivityById(activityId);
    
    // Check if activity exists and belongs to user
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    if (activity.userId !== user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Return activity
    return res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    logger.error('Error fetching activity', { context: 'activity', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
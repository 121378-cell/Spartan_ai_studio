/**
 * Test Routes - Basic test endpoints for testing purposes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { userDb } from '../services/databaseServiceFactory';
import { logger } from '../utils/logger';
import { verifyJWT, requireRole, ROLES } from '../middleware/auth';

const router = Router();

// Block access in production and restrict to admins elsewhere
router.use((req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      message: 'Test routes are disabled in production'
    });
    return;
  }
  next();
});

router.use(verifyJWT, requireRole([ROLES.ADMIN]));

/**
 * POST /test/create-user
 * Create a test user
 */
router.post('/create-user', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    const user = userDb.create({
      name: name || 'Test User',
      email: email || `test${Date.now()}@example.com`,
      password: password || 'password123',
      quest: 'Test Quest',
      stats: {},
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {},
      nutritionSettings: {},
      isInAutonomyPhase: false,
      weightKg: 70,
      trainingCycle: {},
      lastWeeklyPlanDate: new Date().toISOString(),
      role: 'user',
      detailedProfile: {},
      preferences: {}
    });

    res.status(201).json({
      success: true,
      message: 'Test user created',
      data: { id: user.id, email: user.email }
    });
  } catch (error) {
    logger.error('Error creating test user', {
      context: 'testRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    res.status(500).json({
      success: false,
      message: 'Error creating test user'
    });
  }
});

/**
 * GET /test/user/:userId
 * Get a test user by ID
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = userDb.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error getting test user', {
      context: 'testRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return res.status(500).json({
      success: false,
      message: 'Error getting test user'
    });
  }
});

/**
 * POST /test/clear
 * Clear all test data
 */
router.post('/clear', async (req: Request, res: Response) => {
  try {
    userDb.clear();
    res.status(200).json({
      success: true,
      message: 'Test data cleared'
    });
  } catch (error) {
    logger.error('Error clearing test data', {
      context: 'testRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    res.status(500).json({
      success: false,
      message: 'Error clearing test data'
    });
  }
});

export default router;

import { Request, Response } from 'express';
import { UserModel } from '@/models/User';
import { RoutineModel } from '@/models/Routine';
import { v4 as uuidv4 } from 'uuid';
import { userDb, routineDb } from '@/services/databaseServiceFactory';
import { logger } from '@/utils/logger';

// Interface for workout history (simplified for testing)
interface WorkoutHistory {
  id: string;
  userId: string;
  routineId: string;
  date: string;
  durationMinutes: number;
  totalWeightLifted: number;
  focus: string;
  createdAt: string;
}

// In-memory storage for workout history (in a real app, this would be in the database)
const workoutHistory: WorkoutHistory[] = [];

/**
 * Create a test user
 * POST /test/create-user
 */
export const createTestUser = async (req: Request, res: Response) => {
  try {
    const userData = req.body;

    // Validate required fields
    if (!userData.name || !userData.email) {
      return res.status(400).json({
        success: false,
        message: 'name and email are required'
      });
    }

    // Create user in database
    const user = await UserModel.create(userData);

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Test user created successfully',
      id: user.id,
      data: user
    });
  } catch (error) {
    logger.error('Error creating test user', { context: 'test', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create a test routine
 * POST /test/create-routine
 */
export const createTestRoutine = async (req: Request, res: Response) => {
  try {
    const routineData = req.body;

    // Validate required fields
    if (!routineData.userId || !routineData.name) {
      return res.status(400).json({
        success: false,
        message: 'userId and name are required'
      });
    }

    // Check if user exists
    const user = await UserModel.findById(routineData.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create routine in database
    const routine = await RoutineModel.create(routineData);

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Test routine created successfully',
      id: routine.id,
      data: routine
    });
  } catch (error) {
    logger.error('Error creating test routine', { context: 'test', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Record a workout session
 * POST /test/record-workout
 */
export const recordWorkout = async (req: Request, res: Response) => {
  try {
    const workoutData = req.body;

    // Validate required fields
    if (!workoutData.userId || !workoutData.routineId || !workoutData.date) {
      return res.status(400).json({
        success: false,
        message: 'userId, routineId, and date are required'
      });
    }

    // Check if user exists
    const user = await UserModel.findById(workoutData.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if routine exists
    const routine = await RoutineModel.findById(workoutData.routineId);
    if (!routine) {
      return res.status(404).json({
        success: false,
        message: 'Routine not found'
      });
    }

    // Create workout record (in-memory for testing)
    const workout: WorkoutHistory = {
      id: uuidv4().replace(/-/g, '').substring(0, 9),
      userId: workoutData.userId,
      routineId: workoutData.routineId,
      date: workoutData.date,
      durationMinutes: workoutData.durationMinutes || 0,
      totalWeightLifted: workoutData.totalWeightLifted || 0,
      focus: workoutData.focus || '',
      createdAt: new Date().toISOString()
    };

    workoutHistory.push(workout);

    // Update user stats
    const updatedUser = await userDb.update(workoutData.userId, {
      stats: {
        ...user.stats,
        totalWorkouts: user.stats.totalWorkouts + 1
      }
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Workout recorded successfully',
      id: workout.id,
      data: workout
    });
  } catch (error) {
    logger.error('Error recording workout', { context: 'test', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get user by ID
 * GET /test/user/:userId
 */
export const getTestUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user data
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error getting test user', { context: 'test', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get routine by ID
 * GET /test/routine/:routineId
 */
export const getTestRoutine = async (req: Request, res: Response) => {
  try {
    const { routineId } = req.params;

    // Check if routine exists
    const routine = await RoutineModel.findById(routineId);
    if (!routine) {
      return res.status(404).json({
        success: false,
        message: 'Routine not found'
      });
    }

    // Return routine data
    return res.status(200).json({
      success: true,
      data: routine
    });
  } catch (error) {
    logger.error('Error getting test routine', { context: 'test', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get workout history for user
 * GET /test/workouts/:userId
 */
export const getWorkoutHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get workout history for user
    const userWorkouts = workoutHistory.filter(workout => workout.userId === userId);

    // Return workout history
    return res.status(200).json({
      success: true,
      data: userWorkouts
    });
  } catch (error) {
    logger.error('Error getting workout history', { context: 'test', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get chronic load for user
 * GET /test/chronic-load/:userId
 */
export const getChronicLoad = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get workout history for user
    const userWorkouts = workoutHistory.filter(workout => workout.userId === userId);

    // Calculate simple chronic load (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentWorkouts = userWorkouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= sevenDaysAgo && workoutDate <= now;
    });

    // Simple load calculation: count of workouts
    const chronicLoad = recentWorkouts.length;

    // Return chronic load
    return res.status(200).json({
      success: true,
      data: {
        userId,
        chronicLoad,
        workoutCount: userWorkouts.length,
        recentWorkouts: recentWorkouts.length
      }
    });
  } catch (error) {
    logger.error('Error calculating chronic load', { context: 'test', metadata: { error } });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
import { Request, Response } from 'express';
import { RoutineModel } from '../models/Routine';
import { UserModel } from '../models/User';
import { planAssignmentDb, commitmentDb } from '../services/databaseServiceFactory';
import { ValidationError, NotFoundError } from '../utils/errorHandler';

// Interface for assigning a plan to a user
interface AssignPlanRequest {
  userId: string;
  routineId: string;
  startDate: string; // ISO date string
}

// Interface for commitment tracking
interface CommitmentRequest {
  userId: string;
  routineId: string;
  commitmentLevel: number; // 1-10 scale
  notes?: string;
}

/**
 * Assign a plan/routine to a user
 * POST /plan/asignar
 */
export const assignPlan = async (req: Request, res: Response) => {
  const { userId, routineId, startDate }: AssignPlanRequest = req.body;

  // Validate required fields
  if (!userId || !routineId || !startDate) {
    throw new ValidationError('User ID, routine ID, and start date are required to assign a plan.');
  }

  // Check if user exists
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundError('We could not find a user with that ID. Please check the user information and try again.');
  }

  // Check if routine exists
  const routine = await RoutineModel.findById(routineId);
  if (!routine) {
    throw new NotFoundError('We could not find a routine with that ID. Please check the routine information and try again.');
  }

  // Create plan assignment in database
  const assignment = planAssignmentDb.create({
    userId,
    routineId,
    startDate
  });

  // Return success response
  return res.status(201).json({
    success: true,
    message: 'Plan assigned successfully.',
    data: assignment
  });
};

/**
 * Track user commitment to a plan
 * POST /plan/compromiso
 */
export const trackCommitment = async (req: Request, res: Response) => {
  const { userId, routineId, commitmentLevel, notes }: CommitmentRequest = req.body;

  // Validate required fields
  if (!userId || !routineId || commitmentLevel === undefined) {
    throw new ValidationError('User ID, routine ID, and commitment level are required to track commitment.');
  }

  // Validate commitment level range
  if (commitmentLevel < 1 || commitmentLevel > 10) {
    throw new ValidationError('Commitment level must be between 1 and 10.');
  }

  // Check if user exists
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundError('We could not find a user with that ID. Please check the user information and try again.');
  }

  // Check if routine exists
  const routine = await RoutineModel.findById(routineId);
  if (!routine) {
    throw new NotFoundError('We could not find a routine with that ID. Please check the routine information and try again.');
  }

  // Create or update commitment in database
  const commitment = commitmentDb.upsert({
    userId,
    routineId,
    commitmentLevel,
    notes
  });

  // Return success response
  return res.status(200).json({
    success: true,
    message: 'Commitment tracked successfully.',
    data: commitment
  });
};

/**
 * Get plan assignments for a user
 * GET /plan/asignar/:userId
 */
export const getUserPlans = async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Check if user exists
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundError('We could not find a user with that ID. Please check the user information and try again.');
  }

  // Get user's plan assignments from database
  const userAssignments = planAssignmentDb.findByUserId(userId);

  // Return success response
  return res.status(200).json({
    success: true,
    message: 'User plans retrieved successfully.',
    data: userAssignments
  });
};

/**
 * Get commitment for a specific user and routine
 * GET /plan/compromiso/:userId/:routineId
 */
export const getCommitment = async (req: Request, res: Response) => {
  const { userId, routineId } = req.params;

  // Check if user exists
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundError('We could not find a user with that ID. Please check the user information and try again.');
  }

  // Check if routine exists
  const routine = await RoutineModel.findById(routineId);
  if (!routine) {
    throw new NotFoundError('We could not find a routine with that ID. Please check the routine information and try again.');
  }

  // Get commitment from database
  const commitment = commitmentDb.findByUserAndRoutine(userId, routineId);

  // Return success response
  return res.status(200).json({
    success: true,
    message: 'Commitment retrieved successfully.',
    data: commitment || null
  });
};

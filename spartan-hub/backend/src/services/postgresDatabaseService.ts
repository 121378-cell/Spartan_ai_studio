import { executeQuery, initializePostgresReplicas } from '../config/postgresReplicaConfig';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { User, UserActivity } from '../models/User';
import { Routine } from '../models/Routine';

// Initialize database on service load
initializePostgresReplicas();

// Helper function to serialize complex objects to JSON strings
const serialize = (obj: unknown): string | null => {
  if (obj === null || obj === undefined) return null;
  try {
    return JSON.stringify(obj);
  } catch (e) {
    logger.error('Error serializing JSON', {
      context: 'database',
      metadata: {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      }
    });
    return null;
  }
};

// Helper function to deserialize JSON strings to objects
const deserialize = <T = unknown>(str: string | null): T | null => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    logger.error('Error deserializing JSON', {
      context: 'database',
      metadata: {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      }
    });
    return null;
  }
};

// User database operations
export const userDb = {
  // Find user by ID (read operation)
  findById: async (id: string): Promise<User | null> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM users WHERE id = $1',
        [id],
        'read'
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        quest: row.quest,
        stats: deserialize(row.stats) || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: row.onboarding_completed === 1,
        keystoneHabits: deserialize(row.keystone_habits) || [],
        masterRegulationSettings: deserialize(row.master_regulation_settings) || { targetBedtime: '22:00' },
        nutritionSettings: deserialize(row.nutrition_settings) || { priority: 'performance' },
        isInAutonomyPhase: row.is_in_autonomy_phase === 1,
        weightKg: row.weight_kg,
        trainingCycle: deserialize(row.training_cycle) || undefined,
        lastWeeklyPlanDate: row.last_weekly_plan_date,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        password: row.password,
        role: row.role || 'user',
        detailedProfile: deserialize(row.detailed_profile) || undefined,
        preferences: deserialize(row.preferences) || undefined
      };
    } catch (error) {
      logger.error('Error finding user by ID', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: id
        }
      });
      return null;
    }
  },

  // Find user by email (read operation)
  findByEmail: async (email: string): Promise<User | null> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM users WHERE email = $1',
        [email],
        'read'
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        quest: row.quest,
        stats: deserialize(row.stats) || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: row.onboarding_completed === 1,
        keystoneHabits: deserialize(row.keystone_habits) || [],
        masterRegulationSettings: deserialize(row.master_regulation_settings) || { targetBedtime: '22:00' },
        nutritionSettings: deserialize(row.nutrition_settings) || { priority: 'performance' },
        isInAutonomyPhase: row.is_in_autonomy_phase === 1,
        weightKg: row.weight_kg,
        trainingCycle: deserialize(row.training_cycle) || undefined,
        lastWeeklyPlanDate: row.last_weekly_plan_date,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Add password field
        password: row.password,
        role: row.role || 'user',
        detailedProfile: deserialize(row.detailed_profile) || undefined,
        preferences: deserialize(row.preferences) || undefined
      };    } catch (error) {
      logger.error('Error finding user by email', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          email
        }
      });
      return null;
    }
  },

  // Find all users (read operation)
  findAll: async (): Promise<User[]> => {
    try {
      const result = await executeQuery('SELECT * FROM users', [], 'read');
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        quest: row.quest,
        stats: deserialize(row.stats) || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: row.onboarding_completed === 1,
        keystoneHabits: deserialize(row.keystone_habits) || [],
        masterRegulationSettings: deserialize(row.master_regulation_settings) || { targetBedtime: '22:00' },
        nutritionSettings: deserialize(row.nutrition_settings) || { priority: 'performance' },
        isInAutonomyPhase: row.is_in_autonomy_phase === 1,
        weightKg: row.weight_kg,
        trainingCycle: deserialize(row.training_cycle) || undefined,
        lastWeeklyPlanDate: row.last_weekly_plan_date,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Add password field
        password: row.password,
        role: row.role || 'user',
        detailedProfile: deserialize(row.detailed_profile) || undefined,
        preferences: deserialize(row.preferences) || undefined
      }));    } catch (error) {
      logger.error('Error finding all users', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  },

  // Create a new user (write operation)
  create: async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const result = await executeQuery(
        `INSERT INTO users (
          id, name, email, password, quest, stats, onboarding_completed, keystone_habits,
          master_regulation_settings, nutrition_settings, is_in_autonomy_phase, weight_kg,
          training_cycle, last_weekly_plan_date, created_at, updated_at, role, detailed_profile, preferences
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          id,
          userData.name,
          userData.email,
          userData.password,
          userData.quest,
          serialize(userData.stats),
          userData.onboardingCompleted ? 1 : 0,
          serialize(userData.keystoneHabits),
          serialize(userData.masterRegulationSettings),
          serialize(userData.nutritionSettings),
          userData.isInAutonomyPhase ? 1 : 0,
          userData.weightKg,
          serialize(userData.trainingCycle),
          userData.lastWeeklyPlanDate,
          now,
          now,
          userData.role || 'user',
          serialize(userData.detailedProfile),
          serialize(userData.preferences)
        ],
        'write'
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          quest: row.quest,
          stats: deserialize(row.stats) || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
          onboardingCompleted: row.onboarding_completed === 1,
          keystoneHabits: deserialize(row.keystone_habits) || [],
          masterRegulationSettings: deserialize(row.master_regulation_settings) || { targetBedtime: '22:00' },
          nutritionSettings: deserialize(row.nutrition_settings) || { priority: 'performance' },
          isInAutonomyPhase: row.is_in_autonomy_phase === 1,
          weightKg: row.weight_kg,
          trainingCycle: deserialize(row.training_cycle) || undefined,
          lastWeeklyPlanDate: row.last_weekly_plan_date,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          role: row.role || 'user',
          detailedProfile: deserialize(row.detailed_profile) || undefined,
          preferences: deserialize(row.preferences) || undefined
        };
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      logger.error('Error creating user', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userData: {
            name: userData.name,
            email: userData.email
          }
        }
      });
      throw error;
    }
  },

  // Update a user (write operation)
  update: async (id: string, userData: Partial<User>): Promise<User | null> => {
    try {
      // First, get the existing user to merge data
      const existingUser = await userDb.findById(id);
      if (!existingUser) return null;
      
      const now = new Date().toISOString();
      
      const result = await executeQuery(
        `UPDATE users SET
          name = $1, email = $2, quest = $3, stats = $4, onboarding_completed = $5,
          keystone_habits = $6, master_regulation_settings = $7, nutrition_settings = $8,
          is_in_autonomy_phase = $9, weight_kg = $10, training_cycle = $11, last_weekly_plan_date = $12,
          updated_at = $13, role = $14, detailed_profile = $15, preferences = $16
        WHERE id = $17
        RETURNING *`,
        [
          userData.name || existingUser.name,
          userData.email || existingUser.email,
          userData.quest || existingUser.quest,
          serialize(userData.stats || existingUser.stats),
          userData.onboardingCompleted !== undefined ? (userData.onboardingCompleted ? 1 : 0) : (existingUser.onboardingCompleted ? 1 : 0),
          serialize(userData.keystoneHabits || existingUser.keystoneHabits),
          serialize(userData.masterRegulationSettings || existingUser.masterRegulationSettings),
          serialize(userData.nutritionSettings || existingUser.nutritionSettings),
          userData.isInAutonomyPhase !== undefined ? (userData.isInAutonomyPhase ? 1 : 0) : (existingUser.isInAutonomyPhase ? 1 : 0),
          userData.weightKg || existingUser.weightKg,
          serialize(userData.trainingCycle || existingUser.trainingCycle),
          userData.lastWeeklyPlanDate || existingUser.lastWeeklyPlanDate,
          now,
          userData.role || existingUser.role || 'user',
          serialize(userData.detailedProfile || existingUser.detailedProfile),
          serialize(userData.preferences || existingUser.preferences),
          id
        ],
        'write'
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          quest: row.quest,
          stats: deserialize(row.stats) || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
          onboardingCompleted: row.onboarding_completed === 1,
          keystoneHabits: deserialize(row.keystone_habits) || [],
          masterRegulationSettings: deserialize(row.master_regulation_settings) || { targetBedtime: '22:00' },
          nutritionSettings: deserialize(row.nutrition_settings) || { priority: 'performance' },
          isInAutonomyPhase: row.is_in_autonomy_phase === 1,
          weightKg: row.weight_kg,
          trainingCycle: deserialize(row.training_cycle) || undefined,
          lastWeeklyPlanDate: row.last_weekly_plan_date,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          role: row.role || 'user',
          detailedProfile: deserialize(row.detailed_profile) || undefined,
          preferences: deserialize(row.preferences) || undefined
        };
      } else {
        return null;
      }
    } catch (error) {
      logger.error('Error updating user', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: id,
          userData
        }
      });
      return null;
    }
  },

  // Activity database operations
  createActivity: async (activityData: UserActivity): Promise<UserActivity> => {
    try {
      const result = await executeQuery(
        `INSERT INTO user_activities (
          id, user_id, type, description, metadata, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          activityData.id,
          activityData.userId,
          activityData.type,
          activityData.description,
          serialize(activityData.metadata),
          activityData.timestamp.toISOString()
        ],
        'write'
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          type: row.type,
          description: row.description,
          metadata: deserialize(row.metadata) || undefined,
          timestamp: new Date(row.timestamp)
        };
      } else {
        throw new Error('Failed to create activity');
      }
    } catch (error) {
      logger.error('Error creating activity', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          activityData
        }
      });
      throw error;
    }
  },

  findActivityById: async (id: string): Promise<UserActivity | null> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM user_activities WHERE id = $1',
        [id],
        'read'
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        description: row.description,
        metadata: deserialize(row.metadata) || undefined,
        timestamp: new Date(row.timestamp)
      };
    } catch (error) {
      logger.error('Error finding activity by ID', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          activityId: id
        }
      });
      return null;
    }
  },

  getActivityHistoryByUserId: async (userId: string, limit: number = 50): Promise<UserActivity[]> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM user_activities WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [userId, limit],
        'read'
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        description: row.description,
        metadata: deserialize(row.metadata) || undefined,
        timestamp: new Date(row.timestamp)
      }));
    } catch (error) {
      logger.error('Error finding activity history by user ID', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId
        }
      });
      return [];
    }
  }
};

// Routine database operations
export const routineDb = {
  // Find routine by ID (read operation)
  findById: async (id: string): Promise<Routine | null> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM routines WHERE id = $1',
        [id],
        'read'
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        focus: row.focus,
        duration: row.duration,
        objective: row.objective,
        blocks: deserialize(row.blocks) || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      logger.error('Error finding routine by ID', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          routineId: id
        }
      });
      return null;
    }
  },

  // Find routines by user ID (read operation)
  findByUserId: async (userId: string): Promise<Routine[]> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM routines WHERE user_id = $1',
        [userId],
        'read'
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        focus: row.focus,
        duration: row.duration,
        objective: row.objective,
        blocks: deserialize(row.blocks) || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error('Error finding routines by user ID', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId
        }
      });
      return [];
    }
  },

  // Create a new routine (write operation)
  create: async (routineData: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Routine> => {
    try {
      const id = uuidv4().replace(/-/g, '').substring(0, 9);
      const now = new Date().toISOString();
      
      const result = await executeQuery(
        `INSERT INTO routines (
          id, user_id, name, focus, duration, objective, blocks, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          id,
          routineData.userId,
          routineData.name,
          routineData.focus,
          routineData.duration,
          routineData.objective,
          serialize(routineData.blocks),
          now,
          now
        ],
        'write'
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          focus: row.focus,
          duration: row.duration,
          objective: row.objective,
          blocks: deserialize(row.blocks) || [],
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };
      } else {
        throw new Error('Failed to create routine');
      }
    } catch (error) {
      logger.error('Error creating routine', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          routineData
        }
      });
      throw error;
    }
  },

  // Update a routine (write operation)
  update: async (id: string, routineData: Partial<Routine>): Promise<Routine | null> => {
    try {
      // First, get the existing routine to merge data
      const existingRoutine = await routineDb.findById(id);
      if (!existingRoutine) return null;
      
      const now = new Date().toISOString();
      
      const result = await executeQuery(
        `UPDATE routines SET
          name = $1, focus = $2, duration = $3, objective = $4, blocks = $5, updated_at = $6
        WHERE id = $7
        RETURNING *`,
        [
          routineData.name || existingRoutine.name,
          routineData.focus || existingRoutine.focus,
          routineData.duration || existingRoutine.duration,
          routineData.objective || existingRoutine.objective,
          serialize(routineData.blocks || existingRoutine.blocks),
          now,
          id
        ],
        'write'
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          focus: row.focus,
          duration: row.duration,
          objective: row.objective,
          blocks: deserialize(row.blocks) || [],
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };
      } else {
        return null;
      }
    } catch (error) {
      logger.error('Error updating routine', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          routineId: id,
          routineData
        }
      });
      return null;
    }
  },

  // Delete a routine (write operation)
  delete: async (id: string): Promise<boolean> => {
    try {
      const result = await executeQuery(
        'DELETE FROM routines WHERE id = $1',
        [id],
        'write'
      );
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error('Error deleting routine', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          routineId: id
        }
      });
      return false;
    }
  },

  // Find all routines (read operation)
  findAll: async (): Promise<Routine[]> => {
    try {
      const result = await executeQuery('SELECT * FROM routines', [], 'read');
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        focus: row.focus,
        duration: row.duration,
        objective: row.objective,
        blocks: deserialize(row.blocks) || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error('Error finding all routines', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }
};

// Exercise database operations
export const exerciseDb = {
  // Find exercise by ID (read operation)
  findById: async (id: string): Promise<any | null> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM exercises WHERE id = $1',
        [id],
        'read'
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        sets: row.sets,
        reps: row.reps,
        rir: row.rir,
        restSeconds: row.rest_seconds,
        coachTip: row.coach_tip,
        tempo: row.tempo,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      logger.error('Error finding exercise by ID', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          exerciseId: id
        }
      });
      return null;
    }
  },

  // Find exercises by user ID (read operation)
  findByUserId: async (userId: string): Promise<any[]> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM exercises WHERE user_id = $1',
        [userId],
        'read'
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        sets: row.sets,
        reps: row.reps,
        rir: row.rir,
        restSeconds: row.rest_seconds,
        coachTip: row.coach_tip,
        tempo: row.tempo,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error('Error finding exercises by user ID', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId
        }
      });
      return [];
    }
  },

  // Create a new exercise (write operation)
  create: async (exerciseData: Record<string, unknown>): Promise<unknown> => {
    try {
      const id = uuidv4().replace(/-/g, '').substring(0, 9);
      const now = new Date().toISOString();
      
      const result = await executeQuery(
        `INSERT INTO exercises (
          id, user_id, name, sets, reps, rir, rest_seconds, coach_tip, tempo, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          id,
          exerciseData.userId,
          exerciseData.name,
          exerciseData.sets,
          exerciseData.reps,
          exerciseData.rir,
          exerciseData.restSeconds,
          exerciseData.coachTip,
          exerciseData.tempo,
          now,
          now
        ],
        'write'
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          sets: row.sets,
          reps: row.reps,
          rir: row.rir,
          restSeconds: row.rest_seconds,
          coachTip: row.coach_tip,
          tempo: row.tempo,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };
      } else {
        throw new Error('Failed to create exercise');
      }
    } catch (error) {
      logger.error('Error creating exercise', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          exerciseData
        }
      });
      throw error;
    }
  },

  // Update an exercise (write operation)
  update: async (id: string, exerciseData: Partial<any>): Promise<any | null> => {
    try {
      // First, get the existing exercise to merge data
      const existingExercise = await exerciseDb.findById(id);
      if (!existingExercise) return null;
      
      const now = new Date().toISOString();
      
      const result = await executeQuery(
        `UPDATE exercises SET
          name = $1, sets = $2, reps = $3, rir = $4, rest_seconds = $5, coach_tip = $6, tempo = $7, updated_at = $8
        WHERE id = $9
        RETURNING *`,
        [
          exerciseData.name || existingExercise.name,
          exerciseData.sets || existingExercise.sets,
          exerciseData.reps || existingExercise.reps,
          exerciseData.rir || existingExercise.rir,
          exerciseData.restSeconds || existingExercise.restSeconds,
          exerciseData.coachTip || existingExercise.coachTip,
          exerciseData.tempo || existingExercise.tempo,
          now,
          id
        ],
        'write'
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          sets: row.sets,
          reps: row.reps,
          rir: row.rir,
          restSeconds: row.rest_seconds,
          coachTip: row.coach_tip,
          tempo: row.tempo,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };
      } else {
        return null;
      }
    } catch (error) {
      logger.error('Error updating exercise', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          exerciseId: id,
          exerciseData
        }
      });
      return null;
    }
  },

  // Delete an exercise (write operation)
  delete: async (id: string): Promise<boolean> => {
    try {
      const result = await executeQuery(
        'DELETE FROM exercises WHERE id = $1',
        [id],
        'write'
      );
      
      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error('Error deleting exercise', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          exerciseId: id
        }
      });
      return false;
    }
  },

  // Find all exercises (read operation)
  findAll: async (): Promise<any[]> => {
    try {
      const result = await executeQuery('SELECT * FROM exercises', [], 'read');
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        sets: row.sets,
        reps: row.reps,
        rir: row.rir,
        restSeconds: row.rest_seconds,
        coachTip: row.coach_tip,
        tempo: row.tempo,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error('Error finding all exercises', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }
};

// Plan assignment database operations
export const planAssignmentDb = {
  // Create a new plan assignment (write operation)
  create: async (assignmentData: { userId: string; routineId: string; startDate: string }): Promise<any> => {
    try {
      const id = uuidv4().replace(/-/g, '').substring(0, 9);
      const now = new Date().toISOString();
      
      const result = await executeQuery(
        `INSERT INTO plan_assignments (
          id, user_id, routine_id, start_date, assigned_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          id,
          assignmentData.userId,
          assignmentData.routineId,
          assignmentData.startDate,
          now
        ],
        'write'
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          routineId: row.routine_id,
          startDate: row.start_date,
          assignedAt: row.assigned_at
        };
      } else {
        throw new Error('Failed to create plan assignment');
      }
    } catch (error) {
      logger.error('Error creating plan assignment', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          assignmentData
        }
      });
      throw error;
    }
  },

  // Find assignments by user ID (read operation)
  findByUserId: async (userId: string): Promise<any[]> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM plan_assignments WHERE user_id = $1',
        [userId],
        'read'
      );
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        routineId: row.routine_id,
        startDate: row.start_date,
        assignedAt: row.assigned_at
      }));
    } catch (error) {
      logger.error('Error finding plan assignments by user ID', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId
        }
      });
      return [];
    }
  }
};

// Commitment database operations
export const commitmentDb = {
  // Create or update a commitment (write operation)
  upsert: async (commitmentData: { userId: string; routineId: string; commitmentLevel: number; notes?: string }): Promise<any> => {
    try {
      // Check if commitment already exists
      const existingResult = await executeQuery(
        'SELECT id FROM commitments WHERE user_id = $1 AND routine_id = $2',
        [commitmentData.userId, commitmentData.routineId],
        'read'
      );
      
      const now = new Date().toISOString();
      
      let result;
      if (existingResult.rows.length > 0) {
        // Update existing commitment
        result = await executeQuery(
          `UPDATE commitments SET
            commitment_level = $1, notes = $2, created_at = $3
          WHERE id = $4
          RETURNING *`,
          [
            commitmentData.commitmentLevel,
            commitmentData.notes,
            now,
            existingResult.rows[0].id
          ],
          'write'
        );
      } else {
        // Create new commitment
        const id = uuidv4().replace(/-/g, '').substring(0, 9);
        
        result = await executeQuery(
          `INSERT INTO commitments (
            id, user_id, routine_id, commitment_level, notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            id,
            commitmentData.userId,
            commitmentData.routineId,
            commitmentData.commitmentLevel,
            commitmentData.notes,
            now
          ],
          'write'
        );
      }
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          routineId: row.routine_id,
          commitmentLevel: row.commitment_level,
          notes: row.notes,
          createdAt: row.created_at
        };
      } else {
        throw new Error('Failed to upsert commitment');
      }
    } catch (error) {
      logger.error('Error upserting commitment', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          commitmentData
        }
      });
      throw error;
    }
  },

  // Find commitment by user ID and routine ID (read operation)
  findByUserAndRoutine: async (userId: string, routineId: string): Promise<any | null> => {
    try {
      const result = await executeQuery(
        'SELECT * FROM commitments WHERE user_id = $1 AND routine_id = $2',
        [userId, routineId],
        'read'
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        routineId: row.routine_id,
        commitmentLevel: row.commitment_level,
        notes: row.notes,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error('Error finding commitment by user and routine', {
        context: 'database',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId,
          routineId
        }
      });
      return null;
    }
  }
};

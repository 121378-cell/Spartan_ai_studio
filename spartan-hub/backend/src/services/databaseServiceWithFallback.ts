import db, { initializeDatabaseWithFallback, initializeSchema } from '../config/databaseWithFallback';
import { getDatabaseService } from './databaseService';
import { User } from '../models/User';
import { Routine } from '../models/Routine';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Initialize database on service load
initializeDatabaseWithFallback();
initializeSchema();

// Helper function to serialize complex objects to JSON strings
const serialize = (obj: any): string | null => {
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
const deserialize = <T>(str: string | null, defaultValue: T): T => {
  if (!str) return defaultValue;
  try {
    const parsed = JSON.parse(str);
    return parsed as T;
  } catch (e) {
    logger.error('Error deserializing JSON', { metadata: { error: String(e) } });
    return defaultValue;
  }
};

// User database operations
export const userDbWithFallback = {
  // Find user by ID
  findById: (id: string): User | null => {
    try {
      const dbService = getDatabaseService(db);
      const query = 'SELECT * FROM users WHERE id = ?';
      const row = dbService.getQueryWithMonitoring(query, [id]) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        quest: row.quest,
        stats: deserialize(row.stats, { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() }),
        onboardingCompleted: row.onboardingCompleted === 1,
        keystoneHabits: deserialize(row.keystoneHabits, []) || [],
        masterRegulationSettings: deserialize(row.masterRegulationSettings, { targetBedtime: '22:00' }),
        nutritionSettings: deserialize(row.nutritionSettings, { priority: 'performance' }),
        isInAutonomyPhase: row.isInAutonomyPhase === 1,
        weightKg: row.weightKg,
        trainingCycle: deserialize(row.trainingCycle, undefined),
        lastWeeklyPlanDate: row.lastWeeklyPlanDate,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        role: row.role || 'user',
        detailedProfile: deserialize(row.detailedProfile, undefined),
        preferences: deserialize(row.preferences, undefined)
      };
    } catch (error) {
      logger.error('Error finding user by ID', { metadata: { userId: id, error: String(error) } });
      return null;
    }
  },

  // Find user by email
  findByEmail: (email: string): User | null => {
    try {
      const dbService = getDatabaseService(db);
      const query = 'SELECT * FROM users WHERE email = ?';
      const row = dbService.getQueryWithMonitoring(query, [email]) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        quest: row.quest,
        stats: deserialize(row.stats, { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() }),
        onboardingCompleted: row.onboardingCompleted === 1,
        keystoneHabits: deserialize(row.keystoneHabits, []) || [],
        masterRegulationSettings: deserialize(row.masterRegulationSettings, { targetBedtime: '22:00' }),
        nutritionSettings: deserialize(row.nutritionSettings, { priority: 'performance' }),
        isInAutonomyPhase: row.isInAutonomyPhase === 1,
        weightKg: row.weightKg,
        trainingCycle: deserialize(row.trainingCycle, undefined),
        lastWeeklyPlanDate: row.lastWeeklyPlanDate,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        role: row.role || 'user',
        detailedProfile: deserialize(row.detailedProfile, undefined),
        preferences: deserialize(row.preferences, undefined)
      };
    } catch (error) {
      logger.error('Error finding user by email', { metadata: { email, error: String(error) } });
      return null;
    }
  },

  // Create a new user
  create: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    try {
      const id = uuidv4().replace(/-/g, '').substring(0, 9);
      const now = new Date().toISOString();
      
      const dbService = getDatabaseService(db);
      const query = `
        INSERT INTO users (
          id, name, email, quest, stats, onboardingCompleted, keystoneHabits,
          masterRegulationSettings, nutritionSettings, isInAutonomyPhase, weightKg,
          trainingCycle, lastWeeklyPlanDate, createdAt, updatedAt, role, detailedProfile, preferences
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      dbService.runQueryWithMonitoring(query,
        [
          id,
          userData.name,
          userData.email,
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
        ]
      );
      
      return {
        ...userData,
        id,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        role: userData.role || 'user',
        detailedProfile: userData.detailedProfile,
        preferences: userData.preferences
      };
    } catch (error) {
      logger.error('Error creating user', { metadata: { email: userData.email, error: String(error) } });
      throw error;
    }
  },

  // Update a user
  update: (id: string, userData: Partial<User>): User | null => {
    try {
      const existingUser = userDbWithFallback.findById(id);
      if (!existingUser) return null;
      
      const now = new Date().toISOString();
      
      const dbService = getDatabaseService(db);
      const query = `
        UPDATE users SET
          name = ?, email = ?, quest = ?, stats = ?, onboardingCompleted = ?,
          keystoneHabits = ?, masterRegulationSettings = ?, nutritionSettings = ?,
          isInAutonomyPhase = ?, weightKg = ?, trainingCycle = ?, lastWeeklyPlanDate = ?,
          updatedAt = ?, role = ?, detailedProfile = ?, preferences = ?
        WHERE id = ?
      `;
      
      dbService.runQueryWithMonitoring(query,
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
        ]
      );
      
      return userDbWithFallback.findById(id);
    } catch (error) {
      logger.error('Error updating user', { metadata: { userId: id, error: String(error) } });
      return null;
    }
  },

  // Find all users
  findAll: (): User[] => {
    try {
      const dbService = getDatabaseService(db);
      const query = 'SELECT * FROM users';
      const rows = dbService.executeQueryWithMonitoring(query) as any[];
      
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        quest: row.quest,
        stats: deserialize(row.stats, { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() }),
        onboardingCompleted: row.onboardingCompleted === 1,
        keystoneHabits: deserialize(row.keystoneHabits, []) || [],
        masterRegulationSettings: deserialize(row.masterRegulationSettings, { targetBedtime: '22:00' }),
        nutritionSettings: deserialize(row.nutritionSettings, { priority: 'performance' }),
        isInAutonomyPhase: row.isInAutonomyPhase === 1,
        weightKg: row.weightKg,
        trainingCycle: deserialize(row.trainingCycle, undefined),
        lastWeeklyPlanDate: row.lastWeeklyPlanDate,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        role: row.role || 'user',
        detailedProfile: deserialize(row.detailedProfile, undefined),
        preferences: deserialize(row.preferences, undefined)
      }));
    } catch (error) {
      logger.error('Error finding all users', { metadata: { error: String(error) } });
      return [];
    }
  }
};

// Routine database operations
export const routineDbWithFallback = {
  // Find routine by ID
  findById: (id: string): Routine | null => {
    try {
      const dbService = getDatabaseService(db);
      const query = 'SELECT * FROM routines WHERE id = ?';
      const row = dbService.getQueryWithMonitoring(query, [id]) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        focus: row.focus,
        duration: row.duration,
        objective: row.objective,
        blocks: deserialize(row.blocks, []) || [],
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      };
    } catch (error) {
      logger.error('Error finding routine by ID', { metadata: { routineId: id, error: String(error) } });
      return null;
    }
  },

  // Find routines by user ID
  findByUserId: (userId: string): Routine[] => {
    try {
      const dbService = getDatabaseService(db);
      const query = 'SELECT * FROM routines WHERE userId = ?';
      const rows = dbService.executeQueryWithMonitoring(query, [userId]) as any[];
      
      return rows.map(row => ({
        id: row.id,
        userId: row.userId,
        name: row.name,
        focus: row.focus,
        duration: row.duration,
        objective: row.objective,
        blocks: deserialize(row.blocks, []) || [],
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
    } catch (error) {
      logger.error('Error finding routines by user ID', { metadata: { userId, error: String(error) } });
      return [];
    }
  },

  // Create a new routine
  create: (routineData: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>): Routine => {
    try {
      const id = uuidv4().replace(/-/g, '').substring(0, 9);
      const now = new Date().toISOString();
      
      const dbService = getDatabaseService(db);
      const query = `
        INSERT INTO routines (
          id, userId, name, focus, duration, objective, blocks, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      dbService.runQueryWithMonitoring(query,
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
        ]
      );
      
      return {
        ...routineData,
        id,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };
    } catch (error) {
      logger.error('Error creating routine', { metadata: { error: String(error) } });
      throw error;
    }
  },

  // Update a routine
  update: (id: string, routineData: Partial<Routine>): Routine | null => {
    try {
      const existingRoutine = routineDbWithFallback.findById(id);
      if (!existingRoutine) return null;
      
      const now = new Date().toISOString();
      
      const dbService = getDatabaseService(db);
      const query = `
        UPDATE routines SET
          name = ?, focus = ?, duration = ?, objective = ?, blocks = ?, updatedAt = ?
        WHERE id = ?
      `;
      
      dbService.runQueryWithMonitoring(query,
        [
          routineData.name || existingRoutine.name,
          routineData.focus || existingRoutine.focus,
          routineData.duration || existingRoutine.duration,
          routineData.objective || existingRoutine.objective,
          serialize(routineData.blocks || existingRoutine.blocks),
          now,
          id
        ]
      );
      
      return routineDbWithFallback.findById(id);
    } catch (error) {
      logger.error('Error updating routine', { metadata: { routineId: id, error: String(error) } });
      return null;
    }
  },

  // Delete a routine
  delete: (id: string): boolean => {
    try {
      const dbService = getDatabaseService(db);
      const query = 'DELETE FROM routines WHERE id = ?';
      const result = dbService.runQueryWithMonitoring(query, [id]);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting routine', { metadata: { routineId: id, error: String(error) } });
      return false;
    }
  },

  // Find all routines
  findAll: (): Routine[] => {
    try {
      const dbService = getDatabaseService(db);
      const query = 'SELECT * FROM routines';
      const rows = dbService.executeQueryWithMonitoring(query) as any[];
      
      return rows.map(row => ({
        id: row.id,
        userId: row.userId,
        name: row.name,
        focus: row.focus,
        duration: row.duration,
        objective: row.objective,
        blocks: deserialize(row.blocks, []) || [],
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
    } catch (error) {
      logger.error('Error finding all routines', { metadata: { error: String(error) } });
      return [];
    }
  }
};

export { db };
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { getDatabaseService } from './databaseService';
import { initializeDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { User } from '../types/database';

// Exercise interface for type safety
export interface Exercise {
  id: string;
  userId: string;
  name: string;
  sets: number | null;
  reps: number | null;
  rir: number | null;
  restSeconds: number | null;
  coachTip: string | null;
  tempo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Session interface for type safety
export interface Session {
  id: string;
  userId: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
}

// Routine interface for type safety
export interface Routine {
  id: string;
  userId: string;
  name: string;
  focus: string | null;
  duration: number | null;
  objective: string | null;
  blocks: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Plan Assignment interface for type safety
export interface PlanAssignment {
  id: string;
  userId: string;
  routineId: string;
  startDate: string;
  assignedAt: string;
}

// Commitment interface for type safety
export interface Commitment {
  id: string;
  userId: string;
  routineId: string;
  commitmentLevel: number;
  notes: string | null;
  createdAt: string;
}

// Database row interfaces for type safety
interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  quest: string | null;
  stats: string;
  onboardingCompleted: number;
  keystoneHabits: string;
  masterRegulationSettings: string;
  nutritionSettings: string;
  isInAutonomyPhase: number;
  weightKg: number | null;
  trainingCycle: string;
  lastWeeklyPlanDate: string | null;
  detailedProfile: string;
  preferences: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionRow {
  id: string;
  userId: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  isActive: number;
}

interface RoutineRow {
  id: string;
  userId: string;
  name: string;
  focus: string | null;
  duration: number | null;
  objective: string | null;
  blocks: string;
  createdAt: string;
  updatedAt: string;
}

interface ExerciseRow {
  id: string;
  userId: string;
  name: string;
  sets: number | null;
  reps: number | null;
  rir: number | null;
  restSeconds: number | null;
  coachTip: string | null;
  tempo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PlanAssignmentRow {
  id: string;
  userId: string;
  routineId: string;
  startDate: string;
  assignedAt: string;
}

interface CommitmentRow {
  id: string;
  userId: string;
  routineId: string;
  commitmentLevel: number;
  notes: string | null;
  createdAt: string;
}

// function to get fresh database instance
const getDb = () => {
  const dbInstance = initializeDatabase();
  return dbInstance && typeof (dbInstance as any).prepare === 'function' ? dbInstance as any : null;
};

// User database operations
export const userDb = {
  create: (userData: Record<string, unknown>): User => {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = getDb()?.prepare(`
      INSERT INTO users (
        id, name, email, password, role, quest, stats, onboardingCompleted,
        keystoneHabits, masterRegulationSettings, nutritionSettings, isInAutonomyPhase,
        weightKg, trainingCycle, lastWeeklyPlanDate, detailedProfile, preferences,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt?.run(
      id, userData.name, userData.email, userData.password, userData.role || 'user',
      userData.quest || null, JSON.stringify(userData.stats || {}),
      userData.onboardingCompleted ? 1 : 0, JSON.stringify(userData.keystoneHabits || []),
      JSON.stringify(userData.masterRegulationSettings || {}), JSON.stringify(userData.nutritionSettings || {}),
      userData.isInAutonomyPhase ? 1 : 0, userData.weightKg || null,
      JSON.stringify(userData.trainingCycle || {}), userData.lastWeeklyPlanDate || null,
      JSON.stringify(userData.detailedProfile || {}), JSON.stringify(userData.preferences || {}),
      now, now
    );

    logger.info('User created', { metadata: { userId: id, email: userData.email } });
    return { ...userData, id, createdAt: now, updatedAt: now } as unknown as User;
  },

  findById: (id: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt?.get(id) as UserRow | undefined;
    logger.debug('findById query results', { metadata: { userId: id, found: Boolean(row) } });
    if (!row) return null;

    return {
      ...row,
      stats: row.stats ? JSON.parse(row.stats) : {},
      keystoneHabits: row.keystoneHabits ? JSON.parse(row.keystoneHabits) : [],
      masterRegulationSettings: row.masterRegulationSettings ? JSON.parse(row.masterRegulationSettings) : {},
      nutritionSettings: row.nutritionSettings ? JSON.parse(row.nutritionSettings) : {},
      trainingCycle: row.trainingCycle ? JSON.parse(row.trainingCycle) : {},
      detailedProfile: row.detailedProfile ? JSON.parse(row.detailedProfile) : {},
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      onboardingCompleted: Boolean(row.onboardingCompleted),
      isInAutonomyPhase: Boolean(row.isInAutonomyPhase)
    };
  },

  findByEmail: (email: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt?.get(email) as UserRow | undefined;
    if (!row) return null;

    return {
      ...row,
      stats: row.stats ? JSON.parse(row.stats) : {},
      keystoneHabits: row.keystoneHabits ? JSON.parse(row.keystoneHabits) : [],
      masterRegulationSettings: row.masterRegulationSettings ? JSON.parse(row.masterRegulationSettings) : {},
      nutritionSettings: row.nutritionSettings ? JSON.parse(row.nutritionSettings) : {},
      trainingCycle: row.trainingCycle ? JSON.parse(row.trainingCycle) : {},
      detailedProfile: row.detailedProfile ? JSON.parse(row.detailedProfile) : {},
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      onboardingCompleted: Boolean(row.onboardingCompleted),
      isInAutonomyPhase: Boolean(row.isInAutonomyPhase)
    };
  },

  update: (id: string, updates: Record<string, unknown>) => {
    const existing = userDb.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const stmt = getDb()?.prepare(`
      UPDATE users SET 
        name = ?, email = ?, password = ?, role = ?, quest = ?, stats = ?, 
        onboardingCompleted = ?, keystoneHabits = ?, masterRegulationSettings = ?,
        nutritionSettings = ?, isInAutonomyPhase = ?, weightKg = ?, trainingCycle = ?,
        lastWeeklyPlanDate = ?, detailedProfile = ?, preferences = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt?.run(
      updated.name, updated.email, updated.password, updated.role, updated.quest,
      JSON.stringify(updated.stats), updated.onboardingCompleted ? 1 : 0,
      JSON.stringify(updated.keystoneHabits), JSON.stringify(updated.masterRegulationSettings),
      JSON.stringify(updated.nutritionSettings), updated.isInAutonomyPhase ? 1 : 0,
      updated.weightKg, JSON.stringify(updated.trainingCycle), updated.lastWeeklyPlanDate,
      JSON.stringify(updated.detailedProfile), JSON.stringify(updated.preferences),
      updated.updatedAt, id
    );

    return updated;
  },

  findAll: () => {
    const stmt = getDb()?.prepare('SELECT * FROM users');
    const rows = stmt?.all() as UserRow[] || [];
    return rows.map(row => ({
      ...row,
      stats: row.stats ? JSON.parse(row.stats) : {},
      keystoneHabits: row.keystoneHabits ? JSON.parse(row.keystoneHabits) : [],
      masterRegulationSettings: row.masterRegulationSettings ? JSON.parse(row.masterRegulationSettings) : {},
      nutritionSettings: row.nutritionSettings ? JSON.parse(row.nutritionSettings) : {},
      trainingCycle: row.trainingCycle ? JSON.parse(row.trainingCycle) : {},
      detailedProfile: row.detailedProfile ? JSON.parse(row.detailedProfile) : {},
      preferences: row.preferences ? JSON.parse(row.preferences) : {},
      onboardingCompleted: Boolean(row.onboardingCompleted),
      isInAutonomyPhase: Boolean(row.isInAutonomyPhase)
    }));
  },

  delete: (id: string) => {
    const stmt = getDb()?.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt?.run(id);
    return result?.changes ? result.changes > 0 : false;
  },

  clear: () => {
    const stmt = getDb()?.prepare('DELETE FROM users');
    const result = stmt?.run();
    return result?.changes ? result.changes > 0 : false;
  },

  // Session database operations
  createSession: (sessionData: Session) => {
    const stmt = getDb()?.prepare(`
      INSERT INTO sessions (id, userId, token, userAgent, ipAddress, createdAt, expiresAt, lastActivityAt, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt?.run(
      sessionData.id, sessionData.userId, sessionData.token, sessionData.userAgent,
      sessionData.ipAddress, sessionData.createdAt.toISOString(), sessionData.expiresAt.toISOString(),
      sessionData.lastActivityAt.toISOString(), sessionData.isActive ? 1 : 0
    );

    return sessionData;
  },

  findSessionById: (id: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt?.get(id) as SessionRow | undefined;
    if (!row) return null;

    return {
      ...row,
      createdAt: new Date(row.createdAt),
      expiresAt: new Date(row.expiresAt),
      lastActivityAt: new Date(row.lastActivityAt),
      isActive: Boolean(row.isActive)
    };
  },

  findSessionByToken: (token: string) => {
    const db = getDb();
    console.log('[DEBUG] findSessionByToken checking DB Name:', (db as any)?.name);
    const allSessions = db?.prepare('SELECT * FROM sessions').all();
    console.log('[DEBUG] findSessionByToken ALL SESSIONS:', allSessions);
    const stmt = db?.prepare('SELECT * FROM sessions WHERE token = ?');
    const row = stmt?.get(token) as SessionRow | undefined;
    console.log(`[DEBUG] findSessionByToken result for token ${token.substring(0, 10)}...:`, Boolean(row));
    if (!row) return null;

    return {
      ...row,
      createdAt: new Date(row.createdAt),
      expiresAt: new Date(row.expiresAt),
      lastActivityAt: new Date(row.lastActivityAt),
      isActive: Boolean(row.isActive)
    };
  },

  findSessionsByUserId: (userId: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM sessions WHERE userId = ?');
    const rows = stmt?.all(userId) as any[] || [];
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      expiresAt: new Date(row.expiresAt),
      lastActivityAt: new Date(row.lastActivityAt),
      isActive: Boolean(row.isActive)
    }));
  },

  updateSessionLastActivity: (sessionId: string) => {
    const stmt = getDb()?.prepare('UPDATE sessions SET lastActivityAt = ? WHERE id = ?');
    stmt?.run(new Date().toISOString(), sessionId);
  },

  updateSession: (sessionData: Partial<Session> & { id: string }) => {
    const stmt = getDb()?.prepare(`
      UPDATE sessions SET
        userId = ?, token = ?, userAgent = ?, ipAddress = ?,
        expiresAt = ?, lastActivityAt = ?, isActive = ?
      WHERE id = ?
    `);

    stmt?.run(
      sessionData.userId, sessionData.token, sessionData.userAgent, sessionData.ipAddress,
      sessionData.expiresAt?.toISOString(), sessionData.lastActivityAt?.toISOString(),
      sessionData.isActive ? 1 : 0, sessionData.id
    );
  },

  deactivateSession: (sessionId: string) => {
    const stmt = getDb()?.prepare('UPDATE sessions SET isActive = 0 WHERE id = ?');
    stmt?.run(sessionId);
  },

  deactivateAllUserSessions: (userId: string) => {
    const stmt = getDb()?.prepare('UPDATE sessions SET isActive = 0 WHERE userId = ?');
    stmt?.run(userId);
  },

  cleanupExpiredSessions: () => {
    const now = new Date().toISOString();
    const stmt = getDb()?.prepare('DELETE FROM sessions WHERE expiresAt < ? OR isActive = 0');
    stmt?.run(now);
  },

  deleteSession: (sessionId: string) => {
    const stmt = getDb()?.prepare('DELETE FROM sessions WHERE id = ?');
    stmt?.run(sessionId);
  },

  clearSessions: () => {
    const stmt = getDb()?.prepare('DELETE FROM sessions');
    const result = stmt?.run();
    return result?.changes ? result.changes > 0 : false;
  },

  // Activity history methods
  createActivity: (activityData: Record<string, unknown>) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = getDb()?.prepare(`
      INSERT INTO activities (id, userId, type, description, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt?.run(
      id, activityData.userId, activityData.type, activityData.description,
      JSON.stringify(activityData.metadata || {}), now
    );

    return { id, ...activityData, timestamp: now };
  },

  getActivityHistoryByUserId: (userId: string, limit: number = 50) => {
    const stmt = getDb()?.prepare('SELECT * FROM activities WHERE userId = ? ORDER BY timestamp DESC LIMIT ?');
    return stmt?.all(userId, limit) || [];
  },

  findActivityById: (activityId: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM activities WHERE id = ?');
    return stmt?.get(activityId) || null;
  }
};

// Routine database operations
export const routineDb = {
  create: (routineData: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = getDb()?.prepare(`
      INSERT INTO routines (id, userId, name, focus, duration, objective, blocks, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt?.run(
      id, routineData.userId, routineData.name, routineData.focus, routineData.duration,
      routineData.objective, JSON.stringify(routineData.blocks || {}), now, now
    );

    return { id, ...routineData, createdAt: new Date(now), updatedAt: new Date(now) };
  },

  findById: (id: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM routines WHERE id = ?');
    const row = stmt?.get(id) as RoutineRow | undefined;
    if (!row) return null;

    return {
      ...row,
      blocks: row.blocks ? JSON.parse(row.blocks) : {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  },

  findByUserId: (userId: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM routines WHERE userId = ?');
    const rows = stmt?.all(userId) as any[] || [];
    return rows.map(row => ({
      ...row,
      blocks: row.blocks ? JSON.parse(row.blocks) : {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  },

  findAll: () => {
    const stmt = getDb()?.prepare('SELECT * FROM routines');
    const rows = stmt?.all() as any[] || [];
    return rows.map(row => ({
      ...row,
      blocks: row.blocks ? JSON.parse(row.blocks) : {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  },

  update: (id: string, updates: Record<string, unknown>) => {
    const existing = routineDb.findById(id);
    if (!existing) return null;

    const updatedAt = new Date();
    const stmt = getDb()?.prepare(`
      UPDATE routines SET 
        name = ?, focus = ?, duration = ?, objective = ?, blocks = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt?.run(
      updates.name || existing.name, updates.focus || existing.focus,
      updates.duration || existing.duration, updates.objective || existing.objective,
      JSON.stringify(updates.blocks || existing.blocks), updatedAt.toISOString(), id
    );

    return { ...existing, ...updates, updatedAt };
  },

  delete: (id: string) => {
    const stmt = getDb()?.prepare('DELETE FROM routines WHERE id = ?');
    const result = stmt?.run(id);
    return result?.changes ? result.changes > 0 : false;
  },

  clear: () => {
    const stmt = getDb()?.prepare('DELETE FROM routines');
    const result = stmt?.run();
    return result?.changes ? result.changes > 0 : false;
  }
};

// Exercise database operations
export const exerciseDb = {
  create: (exerciseData: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = getDb()?.prepare(`
      INSERT INTO exercises (id, userId, name, sets, reps, rir, restSeconds, coachTip, tempo, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt?.run(
      id, exerciseData.userId, exerciseData.name, exerciseData.sets, exerciseData.reps,
      exerciseData.rir, exerciseData.restSeconds, exerciseData.coachTip, exerciseData.tempo, now, now
    );

    return { id, ...exerciseData, createdAt: new Date(now), updatedAt: new Date(now) };
  },

  findById: (id: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM exercises WHERE id = ?');
    const row = stmt?.get(id) as any;
    if (!row) return null;
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  },

  findByUserId: (userId: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM exercises WHERE userId = ?');
    const rows = stmt?.all(userId) as any[] || [];
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  },

  findAll: () => {
    const stmt = getDb()?.prepare('SELECT * FROM exercises');
    const rows = stmt?.all() as any[] || [];
    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));
  },

  update: (id: string, updates: Record<string, unknown>): Exercise | null => {
    const existing = exerciseDb.findById(id) as Exercise | null;
    if (!existing) return null;

    const updatedAt = new Date();
    const stmt = getDb()?.prepare(`
      UPDATE exercises SET 
        name = ?, sets = ?, reps = ?, rir = ?, restSeconds = ?, coachTip = ?, tempo = ?, updatedAt = ?
      WHERE id = ?
    `);

    stmt?.run(
      updates.name || existing.name, updates.sets || existing.sets, updates.reps || existing.reps,
      updates.rir || existing.rir, updates.restSeconds || existing.restSeconds,
      updates.coachTip || existing.coachTip, updates.tempo || existing.tempo, updatedAt.toISOString(), id
    );

    return { ...existing, ...updates, updatedAt };
  },

  delete: (id: string) => {
    const stmt = getDb()?.prepare('DELETE FROM exercises WHERE id = ?');
    const result = stmt?.run(id);
    return result?.changes ? result.changes > 0 : false;
  },

  clear: () => {
    const stmt = getDb()?.prepare('DELETE FROM exercises');
    const result = stmt?.run();
    return result?.changes ? result.changes > 0 : false;
  }
};

// Plan assignment database operations
export const planAssignmentDb = {
  create: (assignmentData: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = getDb()?.prepare(`
      INSERT INTO plan_assignments (id, userId, routineId, startDate, assignedAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt?.run(id, assignmentData.userId, assignmentData.routineId, assignmentData.startDate, now);

    return { id, ...assignmentData, assignedAt: now };
  },

  findById: (id: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM plan_assignments WHERE id = ?');
    return stmt?.get(id) || null;
  },

  findByUserId: (userId: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM plan_assignments WHERE userId = ?');
    return stmt?.all(userId) || [];
  },

  delete: (id: string) => {
    const stmt = getDb()?.prepare('DELETE FROM plan_assignments WHERE id = ?');
    const result = stmt?.run(id);
    return result?.changes ? result.changes > 0 : false;
  },

  clear: () => {
    const stmt = getDb()?.prepare('DELETE FROM plan_assignments');
    const result = stmt?.run();
    return result?.changes ? result.changes > 0 : false;
  }
};

// Commitment database operations
export const commitmentDb = {
  create: (commitmentData: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = getDb()?.prepare(`
      INSERT INTO commitments (id, userId, routineId, commitmentLevel, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt?.run(id, commitmentData.userId, commitmentData.routineId, commitmentData.commitmentLevel, commitmentData.notes, now);

    return { id, ...commitmentData, createdAt: now };
  },

  findById: (id: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM commitments WHERE id = ?');
    return stmt?.get(id) || null;
  },

  findByUserId: (userId: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM commitments WHERE userId = ?');
    return stmt?.all(userId) || [];
  },

  findByUserAndRoutine: (userId: string, routineId: string) => {
    const stmt = getDb()?.prepare('SELECT * FROM commitments WHERE userId = ? AND routineId = ?');
    return stmt?.get(userId, routineId) || null;
  },

  upsert: (commitmentData: any) => {
    const existing = commitmentDb.findByUserAndRoutine(commitmentData.userId, commitmentData.routineId);

    if (existing) {
      const stmt = getDb()?.prepare(`
        UPDATE commitments 
        SET commitmentLevel = ?, notes = ?
        WHERE userId = ? AND routineId = ?
      `);
      stmt?.run(commitmentData.commitmentLevel, commitmentData.notes, commitmentData.userId, commitmentData.routineId);
      return { ...(existing as Record<string, unknown>), ...commitmentData };
    } else {
      return commitmentDb.create(commitmentData);
    }
  },

  delete: (id: string) => {
    const stmt = getDb()?.prepare('DELETE FROM commitments WHERE id = ?');
    const result = stmt?.run(id);
    return result?.changes ? result.changes > 0 : false;
  },

  clear: () => {
    const stmt = getDb()?.prepare('DELETE FROM commitments');
    const result = stmt?.run();
    return result?.changes ? result.changes > 0 : false;
  }
};
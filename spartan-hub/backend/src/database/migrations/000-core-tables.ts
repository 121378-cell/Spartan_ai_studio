/**
 * Database Migration 000: Core Tables
 * 
 * Creates the essential core tables for the application:
 * - users: User profiles and settings
 * - sessions: Authentication sessions
 * - routines: Workout routines
 * - exercises: Individual exercises
 * - plan_assignments: Routine assignments to users
 * - commitments: User commitments to routines
 */

import { logger } from '../../utils/logger';

export interface MigrationResult {
    success: boolean;
    tablesCreated: string[];
    errors: string[];
}

/**
 * Execute migration to create core tables
 */
export const migrate_000_core_tables = (db: any): MigrationResult => {
    const result: MigrationResult = {
        success: true,
        tablesCreated: [],
        errors: []
    };

    try {
        logger.info('Starting migration 000: Create core tables', { context: 'database.migration' });

        // Create users table
        db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        role TEXT DEFAULT 'user',
        quest TEXT,
        stats TEXT, -- JSON string
        onboardingCompleted INTEGER DEFAULT 0,
        keystoneHabits TEXT, -- JSON string
        masterRegulationSettings TEXT, -- JSON string
        nutritionSettings TEXT, -- JSON string
        isInAutonomyPhase INTEGER DEFAULT 0,
        weightKg REAL,
        trainingCycle TEXT, -- JSON string
        lastWeeklyPlanDate TEXT,
        detailedProfile TEXT, -- JSON string
        preferences TEXT, -- JSON string
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
        result.tablesCreated.push('users');

        // Create sessions table
        db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        userAgent TEXT,
        ipAddress TEXT,
        createdAt TEXT,
        expiresAt TEXT,
        lastActivityAt TEXT,
        isActive INTEGER DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        result.tablesCreated.push('sessions');

        // Create routines table
        db.exec(`
      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        focus TEXT,
        duration INTEGER,
        objective TEXT,
        blocks TEXT, -- JSON string
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        result.tablesCreated.push('routines');

        // Create exercises table
        db.exec(`
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        sets INTEGER,
        reps TEXT,
        rir INTEGER,
        restSeconds INTEGER,
        coachTip TEXT,
        tempo TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        result.tablesCreated.push('exercises');

        // Create plan_assignments table
        db.exec(`
      CREATE TABLE IF NOT EXISTS plan_assignments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        routineId TEXT NOT NULL,
        startDate TEXT,
        assignedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (routineId) REFERENCES routines (id) ON DELETE CASCADE
      )
    `);
        result.tablesCreated.push('plan_assignments');

        // Create commitments table
        db.exec(`
      CREATE TABLE IF NOT EXISTS commitments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        routineId TEXT NOT NULL,
        commitmentLevel INTEGER,
        notes TEXT,
        createdAt TEXT,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (routineId) REFERENCES routines (id) ON DELETE CASCADE
      )
    `);
        result.tablesCreated.push('commitments');

        // Create activities table (needed by sqliteDatabaseService)
        db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        metadata TEXT, -- JSON string
        timestamp TEXT,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        result.tablesCreated.push('activities');

        logger.info('Migration 000 completed successfully', {
            context: 'database.migration',
            metadata: { tablesCreated: result.tablesCreated }
        });

        return result;
    } catch (error) {
        result.success = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(errorMessage);
        logger.error('Migration 000 failed', {
            context: 'database.migration',
            metadata: { error: errorMessage }
        });
        return result;
    }
};

export default migrate_000_core_tables;

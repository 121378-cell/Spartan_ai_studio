#!/usr/bin/env ts-node

/**
 * PostgreSQL Schema Initialization Script
 *
 * This script creates the database schema for PostgreSQL.
 */

import { executeQuery } from '../config/postgresConfig';
import { logger } from '../utils/logger';

// Function to initialize the database schema
const initializePostgresSchema = async () => {
  try {
    logger.info('Initializing PostgreSQL schema', { context: 'postgres-init' });
    
    // Create users table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        quest TEXT,
        stats TEXT, -- JSON string
        onboarding_completed INTEGER DEFAULT 0,
        keystone_habits TEXT, -- JSON string
        master_regulation_settings TEXT, -- JSON string
        nutrition_settings TEXT, -- JSON string
        is_in_autonomy_phase INTEGER DEFAULT 0,
        weight_kg REAL,
        training_cycle TEXT, -- JSON string
        last_weekly_plan_date TEXT,
        detailed_profile TEXT, -- JSON string for detailed user profile
        preferences TEXT, -- JSON string for user preferences
        created_at TEXT,
        updated_at TEXT
      )
    `);
    
    // Create sessions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    
    // Create routines table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        focus TEXT,
        duration INTEGER,
        objective TEXT,
        blocks TEXT, -- JSON string
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    
    // Create exercises table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sets INTEGER,
        reps TEXT,
        rir INTEGER,
        rest_seconds INTEGER,
        coach_tip TEXT,
        tempo TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    
    // Create plan_assignments table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS plan_assignments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        routine_id TEXT NOT NULL,
        start_date TEXT,
        assigned_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE
      )
    `);
    
    // Create commitments table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS commitments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        routine_id TEXT NOT NULL,
        commitment_level INTEGER,
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE
      )
    `);
    
    // Create user_activities table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT, -- JSON string
        timestamp TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    
    // Add indexes for better performance
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_routines_user_id ON routines(user_id)');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id)');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_plan_assignments_user_id ON plan_assignments(user_id)');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_commitments_user_id ON commitments(user_id)');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp)');

    logger.info('PostgreSQL schema initialized successfully', { context: 'postgres-init' });
  } catch (error) {
    logger.error('Error initializing PostgreSQL schema', { context: 'postgres-init', metadata: { error } });
    throw error;
  }
};

// If run directly, execute schema initialization
if (require.main === module) {
  initializePostgresSchema()
    .then(() => {
      logger.info('PostgreSQL schema initialization completed', { context: 'postgres-init' });
      process.exit(0);
    })
    .catch((error) => {
      logger.error('PostgreSQL schema initialization failed', { context: 'postgres-init', metadata: { error } });
      process.exit(1);
    });
}

export default initializePostgresSchema;
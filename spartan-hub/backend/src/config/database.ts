import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Variable to hold the database instance
type DBType = any;

// Define a specific type for database instance
export type DatabaseInstance = any;

// Variable to hold the database instance
let db: DBType = null;
let databaseInitialized = false;

// Check if we should use PostgreSQL
const usePostgres = process.env.DATABASE_TYPE === 'postgres';
logger.info('Database configuration', {
  context: 'database',
  metadata: { usePostgres, databaseType: process.env.DATABASE_TYPE }
});

// Database file path (used for SQLite only)
let dbPath = '';
if (!usePostgres) {
  logger.info('💾 Using SQLite database');

  // Ensure the database directory exists
  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Database file path
  dbPath = process.env.DB_PATH || path.join(dbDir, 'spartan.db');
  logger.info('Database path resolution', {
    context: 'database',
    metadata: { envPath: process.env.DB_PATH, resolvedPath: dbPath }
  });

  // Ensure the database directory is writable
  try {
    fs.accessSync(dbDir, fs.constants.W_OK);
    logger.info(`✅ Database directory is writable: ${dbDir}`);
  } catch (err) {
    logger.warn(`⚠️ Database directory is not writable: ${dbDir}`);
    // Try to make it writable
    try {
      fs.chmodSync(dbDir, 0o777);
      logger.info(`✅ Made database directory writable: ${dbDir}`);
    } catch (chmodErr) {
      logger.warn(`⚠️ Failed to make database directory writable: ${chmodErr}`);
    }
  }
} else {
  logger.info('🐘 Using PostgreSQL database');
}

// Function to initialize the database with fallback strategy
export const initializeDatabase = (): DatabaseInstance => {
  // Check if we need to reinitialize due to environment changes
  const currentDbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'spartan.db');
  if (dbPath !== currentDbPath && db) {
    // Database path changed (likely in tests), close old connection and reset
    if (db && typeof (db as any).close === 'function') {
      try {
        (db as any).close();
      } catch (err) {
        logger.debug('Error closing old database connection', { metadata: { error: String(err) } });
      }
    }
    db = null;
    databaseInitialized = false;
    dbPath = currentDbPath;
  }

  if (databaseInitialized) {
    return db;
  }

  logger.info('🚀 Initializing database...');

  if (usePostgres) {
    // For PostgreSQL, we'll use the postgresDatabaseService
    // Return a placeholder since the actual connection is handled elsewhere
    return { type: 'postgres' }; // Return placeholder, don't assign to db
  } else {
    // Use better-sqlite3 directly
    try {
      // Get the current database path from environment or use default
      const currentPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'spartan.db');
      db = new Database(currentPath);

      // Enable WAL mode for better concurrency
      db.pragma('journal_mode = WAL');

      // Enable foreign key constraints
      db.pragma('foreign_keys = ON');

      logger.info('✅ better-sqlite3 loaded successfully');
    } catch (error) {
      logger.error('❌ Failed to load better-sqlite3', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      return null;
    }
  }

  databaseInitialized = true;
  logger.info('✅ Database initialization completed');
  return db;
};

// Function to initialize the database schema
export const initializeSchema = () => {
  if (!db) {
    logger.error('❌ Database not initialized');
    return;
  }

  // Only initialize schema for SQLite databases
  if (usePostgres || !db || typeof (db as any).exec !== 'function') {
    logger.info('🐘 PostgreSQL schema initialization handled separately');
    return;
  }

  try {
    // Create users table
    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
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
        detailedProfile TEXT, -- JSON string for detailed user profile
        preferences TEXT, -- JSON string for user preferences
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
    logger.info('✅ Users table created or verified', { context: 'database' });

    // Create sessions table
    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        userAgent TEXT,
        ipAddress TEXT,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        lastActivityAt TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create routines table
    (db as any).exec(`
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

    // Create exercises table
    (db as any).exec(`
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

    // Create plan_assignments table
    (db as any).exec(`
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

    // Create commitments table
    (db as any).exec(`
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

    // Create user_activities table
    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT, -- JSON string
        timestamp TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    logger.info('✅ Database schema initialized successfully');
  } catch (error) {
    logger.error('❌ Error initializing database schema', {
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
  }
};

// Function to close database connection
export const closeDatabase = (): void => {
  if (db && typeof (db as any).close === 'function') {
    try {
      (db as any).close();
      db = null;
      databaseInitialized = false;
      logger.info('Database connection closed successfully');
    } catch (error) {
      logger.error('Error closing database connection', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }
};

// Initialize database on module load
initializeDatabase();
initializeSchema();

// Export the database instance and service
export default db;
export { db };

// Also export the database service
// Database service import removed to prevent circular dependency
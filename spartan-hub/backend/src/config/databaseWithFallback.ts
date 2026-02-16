import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

// Variable to hold the database instance
// Define a type that can be either better-sqlite3, sqlite3, or mock database
interface MockDatabase {
  pragma: (pragma: string) => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
    run: (...params: unknown[]) => { changes: number };
  };
}

type DBType = any; // Using any for now since we're dealing with multiple database types - better-sqlite3 and sqlite3 have incompatible types

// Variable to hold the database instance
let db: DBType = null;
let databaseInitialized = false;

// Ensure the database directory exists
const dbDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dbDir, 'spartan.db');

// Function to attempt to load better-sqlite3
const loadBetterSqlite3 = () => {
  try {
    logger.info('Attempting to load better-sqlite3', {
      context: 'database-fallback',
      metadata: { stage: 'loading-better-sqlite3' }
    });
    const Database = require('better-sqlite3');
    
    // Create database instance with synchronous operations
    const database = new Database(dbPath, {
      // Synchronous operations for local standalone mode
      fileMustExist: false, // Create database file if it doesn't exist
    });
    
    // Enable WAL mode for better concurrency
    database.pragma('journal_mode = WAL');
    
    // Enable foreign key constraints
    database.pragma('foreign_keys = ON');
    
    logger.info('better-sqlite3 loaded successfully', {
      context: 'database-fallback',
      metadata: { stage: 'better-sqlite3-loaded' }
    });
    return database;
  } catch (error) {
    logger.warn('Failed to load better-sqlite3', {
      context: 'database-fallback',
      metadata: {
        stage: 'loading-better-sqlite3',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return null;
  }
};

// Function to attempt to load sqlite3 as fallback
const loadSqlite3 = () => {
  try {
    logger.info('Attempting to load sqlite3 as fallback', {
      context: 'database-fallback',
      metadata: { stage: 'loading-sqlite3' }
    });
    const sqlite3 = require('sqlite3');
    const { Database } = require('sqlite3');
    
    // Create database instance
    const database = new Database(dbPath);
    
    logger.info('sqlite3 loaded successfully as fallback', {
      context: 'database-fallback',
      metadata: { stage: 'sqlite3-loaded' }
    });
    return database;
  } catch (error) {
    logger.warn('Failed to load sqlite3', {
      context: 'database-fallback',
      metadata: {
        stage: 'loading-sqlite3',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return null;
  }
};

// Function to create a mock database for complete fallback
const createMockDatabase = () => {
  logger.warn('Creating mock database as last resort fallback', {
    context: 'database-fallback',
    metadata: { stage: 'creating-mock-database' }
  });
  
  // Simple in-memory storage
  const memoryStore: Record<string, any[]> = {};
  
  return {
    pragma: (pragma: string) => {
      logger.debug('Mock pragma called', {
        context: 'database-fallback',
        metadata: { pragma }
      });
    },
    exec: (sql: string) => {
      logger.debug('Mock exec called', {
        context: 'database-fallback',
        metadata: { sql }
      });
      // In a real implementation, we would parse SQL and manage tables
      // For now, we just log the SQL statement
    },
    prepare: (sql: string) => {
      logger.debug('Mock prepare called', {
        context: 'database-fallback',
        metadata: { sql }
      });
      
      return {
        get: (...params: any[]) => {
          logger.debug('Mock get called', {
            context: 'database-fallback',
            metadata: { params }
          });
          return null;
        },
        all: (...params: any[]) => {
          logger.debug('Mock all called', {
            context: 'database-fallback',
            metadata: { params }
          });
          return [];
        },
        run: (...params: any[]) => {
          logger.debug('Mock run called', {
            context: 'database-fallback',
            metadata: { params }
          });
          return { changes: 0 };
        }
      };
    }
  };
};

// Function to initialize the database with fallback strategy
export const initializeDatabaseWithFallback = () => {
  if (databaseInitialized) {
    return db;
  }
  
  logger.info('Initializing database with fallback strategy', {
    context: 'database-fallback',
    metadata: { stage: 'initialization-start' }
  });
  
  // Try to load better-sqlite3 first (preferred option)
  db = loadBetterSqlite3();
  
  // If better-sqlite3 fails, try sqlite3
  if (!db) {
    db = loadSqlite3();
  }
  
  // If both fail, use mock database
  if (!db) {
    db = createMockDatabase();
  }
  
  databaseInitialized = true;
  logger.info('Database initialization completed with fallback strategy', {
    context: 'database-fallback',
    metadata: { stage: 'initialization-complete' }
  });
  return db;
};

// Function to initialize the database schema
export const initializeSchema = () => {
  if (!db) {
    logger.error('Database not initialized', {
      context: 'database-fallback',
      metadata: { stage: 'schema-initialization' }
    });
    return;
  }
  
  try {
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
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
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
    
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
    
    logger.info('Database schema initialized successfully', {
      context: 'database-fallback',
      metadata: { stage: 'schema-initialized' }
    });
  } catch (error) {
    logger.error('Error initializing database schema', {
      context: 'database-fallback',
      metadata: {
        stage: 'schema-initialization',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
};

// Initialize database on module load
initializeDatabaseWithFallback();
initializeSchema();

// Export the database instance
export default db;
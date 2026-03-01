import { beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { testDbManager } from './testDatabaseManager';
import { initializeDatabase } from '../config/database';
import { logger } from '../utils/logger';
import DatabaseManager from '../database/databaseManager';

// Global test setup
beforeAll(async () => {
  // Disable Foreign Key constraints for database service tests to avoid constraint violations
  process.env.DISABLE_FOREIGN_KEYS = 'true';

  // Set up test database
  await testDbManager.setupTestDatabase();
  testDbManager.setTestEnvironment();

  // Re-initialize database to ensure it uses the test database path
  initializeDatabase();

  // Disable foreign keys in SQLite for test isolation
  const db = DatabaseManager.getInstance().getDatabase();
  db.exec('PRAGMA foreign_keys = OFF');
});

// Global test cleanup
afterAll(async () => {
  // Clean up test database
  await testDbManager.cleanupTestDatabase();
  testDbManager.restoreOriginalEnvironment();
  await logger.close();
});

// Reset environment variables before each test
beforeEach(() => {
  process.env.JWT_SECRET = 'test_secret_32_characters_long_minimum_requirement';
  process.env.JWT_ALGO = 'HS256';
  process.env.SESSION_SECRET = 'test_session_secret_32_characters_long';
  process.env.DATABASE_TYPE = 'sqlite'; // Use SQLite for tests
  process.env.NODE_ENV = 'test';

  // Disable external services during tests
  process.env.REDIS_URL = '';
  process.env.POSTGRES_HOST = '';
  process.env.POSTGRES_PORT = '';
  process.env.POSTGRES_DB = '';
  process.env.POSTGRES_USER = '';
  process.env.POSTGRES_PASSWORD = '';

  // Disable foreign keys for test isolation
  try {
    const db = DatabaseManager.getInstance().getDatabase();
    db.exec('PRAGMA foreign_keys = OFF');
  } catch (error) {
    // Ignore if database not initialized yet
  }
});

// Clean up after each test
afterEach(() => {
  // Clear all test data in correct order to avoid FK violations
  try {
    const db = DatabaseManager.getInstance().getDatabase();
    if (db) {
      // Disable foreign keys temporarily
      db.exec('PRAGMA foreign_keys = OFF');

      // Delete in reverse dependency order
      const tablesToDelete = [
        'sessions',
        'refresh_tokens',
        'notifications',
        'notification_preferences',
        'user_learning_weights',
        'plan_adaptations',
        'user_adaptation_feedback',
        'ml_forecasts',
        'injury_probabilities',
        'vital_coach_decisions',
        'vital_coach_alerts',
        'rag_citations',
        'daily_biometric_summaries',
        'training_plans',
        'users'
      ];

      for (const table of tablesToDelete) {
        try {
          db.exec(`DELETE FROM ${table}`);
        } catch (e) {
          // Table might not exist, continue
        }
      }

      // Re-enable foreign keys
      db.exec('PRAGMA foreign_keys = ON');
    }
  } catch (error) {
    // Ignore errors if database service is not available
  }
});

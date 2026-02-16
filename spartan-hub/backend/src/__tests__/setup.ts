import { beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { testDbManager } from './testDatabaseManager';
import { initializeDatabase } from '../config/database';
import { logger } from '../utils/logger';

// Global test setup
beforeAll(async () => {
  // Disable Foreign Key constraints for database service tests to avoid constraint violations
  process.env.DISABLE_FOREIGN_KEYS = 'true';
  
  // Set up test database
  await testDbManager.setupTestDatabase();
  testDbManager.setTestEnvironment();
  
  // Re-initialize database to ensure it uses the test database path
  initializeDatabase();
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
});

// Clean up after each test
afterEach(() => {
  // Clear any test data
  try {
    const { userDb } = require('../services/databaseServiceFactory');
    if (userDb && typeof userDb.clear === 'function') {
      userDb.clear();
    }
  } catch (error) {
    // Ignore errors if database service is not available
  }
});

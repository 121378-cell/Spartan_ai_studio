import { beforeAll, afterAll } from '@jest/globals';
import { e2eManager } from './e2eTestManager';
import { logger } from '../utils/logger';

// Global E2E setup
beforeAll(async () => {
  // Set environment to use the E2E database path
  process.env.DB_PATH = e2eManager.getDbPath();
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_TYPE = 'sqlite';
  
  // Ensure DB is ready (it should be setup by the pre-test script, but safe to check)
  await e2eManager.setupDatabase();
  
  logger.info('🧪 E2E Environment Initialized');
});

// Global E2E teardown
afterAll(async () => {
  // Close connection but persist the file
  e2eManager.close();
  logger.info('🛑 E2E Environment Teardown (DB persisted)');
});

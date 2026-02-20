import dotenv from 'dotenv';
import path from 'path';

// Load .env.test from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Safe defaults to avoid order-dependent failures when a suite mutates process.env
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test_jwt_secret_minimum_32_characters_long_for_tests_only';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || 'test_session_secret_minimum_32_chars_for_tests_only';
process.env.JWT_ALGO = process.env.JWT_ALGO || 'HS256';
process.env.DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';

// ============================================================================
// MOCK CONFIGURATION
// Ensure mocks are loaded before any actual dependencies
// ============================================================================

// Mark that we're in test mode for conditional mock loading
process.env.USE_TEST_MOCKS = 'true';

// Disable external API calls during tests
process.env.DISABLE_EXTERNAL_APIS = 'true';
process.env.MOCK_ML_SERVICES = 'true';

// Database configuration for tests - use isolated test databases
process.env.DB_PATH = process.env.DB_PATH || ':memory:';
process.env.SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || ':memory:';

// ============================================================================
// JEST MOCK MODULE REGISTRATION
// These modules will be automatically mocked in tests
// ============================================================================

// Register module mocks that should be loaded early
const mockModules = [
  '../services/mlForecastingService',
  '../database/databaseManager',
  '../utils/logger'
];

// Store for later use by Jest
(process as any).__REGISTERED_MOCKS__ = mockModules;

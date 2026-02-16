/**
 * Database Service Factory
 * Dynamically imports the appropriate database service based on configuration
 */
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { DatabaseService } from '../types/database';

// Load environment variables
dotenv.config();

// Check if we should use PostgreSQL
const usePostgres = process.env.DATABASE_TYPE === 'postgres';

let databaseService: DatabaseService;

// Dynamically import the appropriate database service based on configuration
if (usePostgres) {
  logger.info('🐘 Using PostgreSQL database service');
  const postgresModule = require('./postgresDatabaseService');
  databaseService = postgresModule;
} else {
  logger.info('💾 Using SQLite database service');
  const sqliteModule = require('./sqliteDatabaseService');
  databaseService = sqliteModule as DatabaseService;
}

// Export the appropriate database operations
export const {userDb} = databaseService;
export const {routineDb} = databaseService;
export const {exerciseDb} = databaseService;
export const {planAssignmentDb} = databaseService;
export const {commitmentDb} = databaseService;

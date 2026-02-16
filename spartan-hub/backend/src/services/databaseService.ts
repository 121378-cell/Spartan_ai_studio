/**
 * Database Service with Performance Monitoring
 * Provides database operations with integrated performance monitoring
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { getPerformanceMetrics } from '../utils/metricsCollector';
import { logger } from '../utils/logger';

// Type definition for database operations
export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';

// Type for database query parameters
type QueryParams = unknown[];

// Database service class with monitoring
export class DatabaseService {
  private db: DatabaseType | null;

  constructor(database: DatabaseType | null) {
    this.db = database;
  }

  /**
   * Execute a query with performance monitoring
   */
  executeQuery(query: string, params?: QueryParams, table: string = 'unknown'): any {
    const queryType = this.getQueryType(query);
    
    // Record query start time
    const startTime = Date.now();
    
    try {
      // Record query execution
      getPerformanceMetrics().recordDatabaseQuery(queryType, table);
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      // Execute the query
      const result = params ? this.db.prepare(query).all(...params) : this.db.prepare(query).all();
      
      // Calculate duration in seconds
      const duration = (Date.now() - startTime) / 1000;
      
      // Record query performance
      getPerformanceMetrics().recordDatabaseQueryDuration(queryType, duration, table);
      
      logger.info('Database query executed successfully', {
        context: 'database',
        metadata: {
          queryType,
          table,
          duration,
          rowsAffected: Array.isArray(result) ? result.length : 0
        }
      });
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      logger.error('Database query failed', {
        context: 'database',
        metadata: {
          queryType,
          table,
          duration,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      // Record query failure
      getPerformanceMetrics().recordDatabaseQueryDuration(queryType, duration, table);
      
      throw error;
    }
  }

  /**
   * Execute a run operation (INSERT, UPDATE, DELETE) with performance monitoring
   */
  runQuery(query: string, params?: QueryParams, table: string = 'unknown'): any {
    const queryType = this.getQueryType(query);
    
    // Record query start time
    const startTime = Date.now();
    
    try {
      // Record query execution
      getPerformanceMetrics().recordDatabaseQuery(queryType, table);
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      // Execute the query
      const result = params ? this.db.prepare(query).run(...params) : this.db.prepare(query).run();
      
      // Calculate duration in seconds
      const duration = (Date.now() - startTime) / 1000;
      
      // Record query performance
      getPerformanceMetrics().recordDatabaseQueryDuration(queryType, duration, table);
      
      logger.info('Database run executed successfully', {
        context: 'database',
        metadata: {
          queryType,
          table,
          duration,
          changes: result.changes
        }
      });
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      logger.error('Database run failed', {
        context: 'database',
        metadata: {
          queryType,
          table,
          duration,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      // Record query failure
      getPerformanceMetrics().recordDatabaseQueryDuration(queryType, duration, table);
      
      throw error;
    }
  }

  /**
   * Get the type of query (SELECT, INSERT, UPDATE, DELETE)
   */
  private getQueryType(query: string): QueryType {
    const trimmedQuery = query.trim().toUpperCase();
    
    if (trimmedQuery.startsWith('SELECT')) {
      return 'SELECT';
    } else if (trimmedQuery.startsWith('INSERT')) {
      return 'INSERT';
    } else if (trimmedQuery.startsWith('UPDATE')) {
      return 'UPDATE';
    } else if (trimmedQuery.startsWith('DELETE')) {
      return 'DELETE';
    } else {
      return 'OTHER';
    }
  }

  /**
   * Get table name from query
   */
  private getTableFromQuery(query: string): string {
    const upperQuery = query.toUpperCase();
    
    // Look for table in FROM clause for SELECT
    const fromMatch = upperQuery.match(/FROM\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (fromMatch) {
      return fromMatch[1].toLowerCase();
    }
    
    // Look for table in INSERT INTO
    const insertMatch = upperQuery.match(/INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (insertMatch) {
      return insertMatch[1].toLowerCase();
    }
    
    // Look for table in UPDATE
    const updateMatch = upperQuery.match(/UPDATE\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (updateMatch) {
      return updateMatch[1].toLowerCase();
    }
    
    // Look for table in DELETE FROM
    const deleteMatch = upperQuery.match(/DELETE\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (deleteMatch) {
      return deleteMatch[1].toLowerCase();
    }
    
    return 'unknown';
  }

  /**
   * Execute a query with automatic table detection and performance monitoring
   */
  executeQueryWithMonitoring(query: string, params?: QueryParams): any {
    const table = this.getTableFromQuery(query);
    return this.executeQuery(query, params, table);
  }

  /**
   * Execute a run operation with automatic table detection and performance monitoring
   */
  runQueryWithMonitoring(query: string, params?: QueryParams): any {
    const table = this.getTableFromQuery(query);
    return this.runQuery(query, params, table);
  }

  /**
   * Execute a get operation (single row) with performance monitoring
   */
  getQuery(query: string, params?: QueryParams, table: string = 'unknown'): any {
    const queryType = this.getQueryType(query);
    
    // Record query start time
    const startTime = Date.now();
    
    try {
      // Record query execution
      getPerformanceMetrics().recordDatabaseQuery(queryType, table);
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      // Execute the query
      const result = params ? this.db.prepare(query).get(...params) : this.db.prepare(query).get();
      
      // Calculate duration in seconds
      const duration = (Date.now() - startTime) / 1000;
      
      // Record query performance
      getPerformanceMetrics().recordDatabaseQueryDuration(queryType, duration, table);
      
      logger.info('Database get executed successfully', {
        context: 'database',
        metadata: {
          queryType,
          table,
          duration,
          result: result ? 'found' : 'not found'
        }
      });
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      logger.error('Database get failed', {
        context: 'database',
        metadata: {
          queryType,
          table,
          duration,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      // Record query failure
      getPerformanceMetrics().recordDatabaseQueryDuration(queryType, duration, table);
      
      throw error;
    }
  }

  /**
   * Execute a get operation with automatic table detection and performance monitoring
   */
  getQueryWithMonitoring(query: string, params?: QueryParams): any {
    const table = this.getTableFromQuery(query);
    return this.getQuery(query, params, table);
  }
}

// Create a global instance if database is available
let dbService: DatabaseService | null = null;

export const getDatabaseService = (db: DatabaseType | null): DatabaseService => {
  if (!dbService) {
    dbService = new DatabaseService(db);
  }
  return dbService;
};

export default getDatabaseService;
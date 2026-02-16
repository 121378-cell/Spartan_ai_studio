import { Pool, QueryResult, QueryResultRow, PoolClient, types } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { getDatabasePassword } from '../utils/secrets';

// Load environment variables
dotenv.config();

// Type for database query parameters
type QueryParams = unknown[];

// PostgreSQL connection configuration
const postgresConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'spartan_fitness',
  user: process.env.POSTGRES_USER || 'spartan_user',
  password: getDatabasePassword(),
  max: parseInt(process.env.POSTGRES_MAX_CLIENTS || '20'), // Maximum number of clients in the pool
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'), // Close idle clients after 30 seconds
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'), // Return an error after 2 seconds if connection could not be established
  // Additional pool configuration for better performance
  maxUses: parseInt(process.env.POSTGRES_MAX_USES || '7500'), // Close (and replace) a connection after it has been used 7500 times
  allowExitOnIdle: process.env.POSTGRES_ALLOW_EXIT_ON_IDLE === 'true' // Allow process to exit even if there are active idle clients
};

// Create a PostgreSQL connection pool
const pool = new Pool(postgresConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('❌ Unexpected error on idle client', {
    context: 'postgres-pool',
    metadata: {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    }
  });
  process.exit(-1);
});

// Log pool events for monitoring
pool.on('connect', (client: PoolClient) => {
  logger.info('🔌 New database connection established', {
    context: 'postgres-pool',
    metadata: { poolEvent: 'connect' }
  });
});

pool.on('acquire', (client: PoolClient) => {
  logger.info('得以取得 Acquired database connection from pool', {
    context: 'postgres-pool',
    metadata: { poolEvent: 'acquire' }
  });
});

pool.on('remove', (client: PoolClient) => {
  logger.info('❌ Removed database connection from pool', {
    context: 'postgres-pool',
    metadata: { poolEvent: 'remove' }
  });
});

// Function to initialize the database connection
export const initializePostgresDatabase = async (): Promise<void> => {
  try {
    // Test the connection
    const client = await pool.connect();
    logger.info('✅ Connected to PostgreSQL database', {
      context: 'postgres-connection',
      metadata: { stage: 'connection-test' }
    });

    // Log pool statistics
    const poolStats = pool.totalCount;
    const {idleCount} = pool;
    const {waitingCount} = pool;

    logger.info('📊 Pool Stats', {
      context: 'postgres-connection',
      metadata: {
        stage: 'pool-stats',
        poolStats,
        idleCount,
        waitingCount
      }
    });

    // Release the client back to the pool
    client.release();
  } catch (error) {
    logger.error('❌ Error connecting to PostgreSQL database', {
      context: 'postgres-connection',
      metadata: {
        stage: 'connection-test',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  }
};

// Function to execute a query
export const executeQuery = async <T extends QueryResultRow = QueryResultRow>(query: string, values?: QueryParams): Promise<QueryResult<T>> => {
  const startTime = Date.now();
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);

    // Log query execution time for performance monitoring
    const executionTime = Date.now() - startTime;
    logger.info('⏱️ Query executed', {
      context: 'postgres-query',
      metadata: {
        executionTime,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        stage: 'query-execution'
      }
    });

    return result;
  } finally {
    client.release();
  }
};

// Function to execute a transaction
export const executeTransaction = async <T extends QueryResultRow = QueryResultRow>(queries: Array<{ query: string; values?: QueryParams }>): Promise<T[]> => {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    const results: T[] = [];
    for (const { query, values } of queries) {
      const result = await client.query(query, values);
      results.push(result.rows[0]);
    }

    await client.query('COMMIT');

    // Log transaction execution time
    const executionTime = Date.now() - startTime;
    logger.info('⏱️ Transaction executed', {
      context: 'postgres-transaction',
      metadata: {
        executionTime,
        queryCount: queries.length,
        stage: 'transaction-execution'
      }
    });

    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Transaction failed and rolled back', {
      context: 'postgres-transaction',
      metadata: {
        stage: 'transaction-execution',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    throw error;
  } finally {
    client.release();
  }
};

// Function to get pool statistics
export const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    max: pool.options.max,
    idleTimeoutMillis: pool.options.idleTimeoutMillis,
    connectionTimeoutMillis: pool.options.connectionTimeoutMillis
  };
};

// Export the pool for direct access if needed
export { pool };
export default pool;
import { Pool, QueryResult, QueryResultRow, PoolClient } from 'pg';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Type for database query parameters
type QueryParams = unknown[];

// Check if read replicas are enabled
const enableReadReplicas = process.env.ENABLE_READ_REPLICAS === 'true';

// Primary database connection configuration
const primaryPostgresConfig = {
  host: process.env.POSTGRES_PRIMARY_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PRIMARY_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'spartan_fitness',
  user: process.env.POSTGRES_USER || 'spartan_user',
  password: process.env.POSTGRES_PASSWORD || 'spartan_password',
  max: parseInt(process.env.POSTGRES_MAX_CLIENTS || '20'),
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'),
  maxUses: parseInt(process.env.POSTGRES_MAX_USES || '7500'),
  allowExitOnIdle: process.env.POSTGRES_ALLOW_EXIT_ON_IDLE === 'true'
};

// Read replica connection configurations
const replicaConfigs = [];
if (enableReadReplicas) {
  // Replica 1
  if (process.env.POSTGRES_REPLICA_1_HOST) {
    replicaConfigs.push({
      host: process.env.POSTGRES_REPLICA_1_HOST,
      port: parseInt(process.env.POSTGRES_REPLICA_1_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'spartan_fitness',
      user: process.env.POSTGRES_USER || 'spartan_user',
      password: process.env.POSTGRES_PASSWORD,
      max: parseInt(process.env.POSTGRES_MAX_CLIENTS || '20'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'),
      maxUses: parseInt(process.env.POSTGRES_MAX_USES || '7500'),
      allowExitOnIdle: process.env.POSTGRES_ALLOW_EXIT_ON_IDLE === 'true'
    });
  }

  // Replica 2
  if (process.env.POSTGRES_REPLICA_2_HOST) {
    replicaConfigs.push({
      host: process.env.POSTGRES_REPLICA_2_HOST,
      port: parseInt(process.env.POSTGRES_REPLICA_2_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'spartan_fitness',
      user: process.env.POSTGRES_USER || 'spartan_user',
      password: process.env.POSTGRES_PASSWORD,
      max: parseInt(process.env.POSTGRES_MAX_CLIENTS || '20'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'),
      maxUses: parseInt(process.env.POSTGRES_MAX_USES || '7500'),
      allowExitOnIdle: process.env.POSTGRES_ALLOW_EXIT_ON_IDLE === 'true'
    });
  }
}

// Create connection pools
const primaryPool = new Pool(primaryPostgresConfig);

// Create replica pools
const replicaPools: Pool[] = [];
replicaConfigs.forEach((config, index) => {
  const pool = new Pool(config);
  replicaPools.push(pool);

  // Handle replica pool errors
  pool.on('error', (err) => {
    logger.error(`Unexpected error on replica ${index + 1} idle client`, { context: 'database', metadata: { error: err } });
  });
});

// Handle primary pool errors
primaryPool.on('error', (err) => {
  logger.error('Unexpected error on primary database idle client', { context: 'database', metadata: { error: err } });
  process.exit(-1);
});

// Log pool events for monitoring
primaryPool.on('connect', (client: PoolClient) => {
  logger.info('New primary database connection established', { context: 'database-pool' });
});

primaryPool.on('acquire', (client: PoolClient) => {
  logger.debug('Acquired primary database connection from pool', { context: 'database-pool' });
});

primaryPool.on('remove', (client: PoolClient) => {
  logger.info('Removed primary database connection from pool', { context: 'database-pool' });
});

// Log replica pool events
replicaPools.forEach((pool, index) => {
  pool.on('connect', (client: PoolClient) => {
    logger.info(`New replica ${index + 1} database connection established`, { context: 'database-pool', metadata: { replicaId: index + 1 } });
  });

  pool.on('acquire', (client: PoolClient) => {
    logger.debug(`Acquired replica ${index + 1} database connection from pool`, { context: 'database-pool', metadata: { replicaId: index + 1 } });
  });

  pool.on('remove', (client: PoolClient) => {
    logger.info(`Removed replica ${index + 1} database connection from pool`, { context: 'database-pool', metadata: { replicaId: index + 1 } });
  });
});

// Round-robin counter for replica selection
let replicaCounter = 0;

// Function to get appropriate pool based on operation type
const getPoolForOperation = (operationType: 'read' | 'write'): Pool => {
  // Always use primary pool for write operations
  if (operationType === 'write') {
    return primaryPool;
  }

  // For read operations, use replicas if enabled, otherwise use primary
  if (enableReadReplicas && replicaPools.length > 0) {
    // Round-robin selection of replicas
    const selectedIndex = replicaCounter % replicaPools.length;
    replicaCounter = (replicaCounter + 1) % replicaPools.length;
    return replicaPools[selectedIndex];
  }

  // Fallback to primary pool
  return primaryPool;
};

// Function to initialize all database connections
export const initializePostgresReplicas = async (): Promise<void> => {
  try {
    // Test primary connection
    const primaryClient = await primaryPool.connect();
    logger.info('Connected to PostgreSQL primary database', { context: 'database-init' });

    // Log primary pool statistics
    logger.info('Primary Pool Stats', { context: 'database-init', metadata: { total: primaryPool.totalCount, idle: primaryPool.idleCount, waiting: primaryPool.waitingCount } });
    primaryClient.release();

    // Test replica connections
    for (let i = 0; i < replicaPools.length; i++) {
      try {
        const replicaClient = await replicaPools[i].connect();
        logger.info(`Connected to PostgreSQL replica ${i + 1}`, { context: 'database-init', metadata: { replicaId: i + 1 } });
        logger.info(`Replica ${i + 1} Pool Stats`, { context: 'database-init', metadata: { replicaId: i + 1, total: replicaPools[i].totalCount, idle: replicaPools[i].idleCount, waiting: replicaPools[i].waitingCount } });
        replicaClient.release();
      } catch (error) {
        logger.error(`Error connecting to PostgreSQL replica ${i + 1}`, { context: 'database-init', metadata: { error } });
      }
    }

    logger.info('Read replicas configuration', { context: 'database-init', metadata: { enabled: enableReadReplicas, count: replicaPools.length } });
  } catch (error) {
    logger.error('Error connecting to PostgreSQL databases', { context: 'database-init', metadata: { error } });
    throw error;
  }
};

// Function to execute a query with automatic routing to appropriate pool
export const executeQuery = async <T extends QueryResultRow = QueryResultRow>(
  query: string,
  values?: QueryParams | undefined,
  operationType: 'read' | 'write' = 'read'
): Promise<QueryResult<T>> => {
  const startTime = Date.now();
  const pool = getPoolForOperation(operationType);
  const client = await pool.connect();

  try {
    const result = await client.query(query, values);

    // Log query execution time for performance monitoring
    const executionTime = Date.now() - startTime;
    const poolType = operationType === 'write' ? 'primary' :
      (enableReadReplicas && pool !== primaryPool) ? 'replica' : 'primary (fallback)';
    logger.debug(`${poolType} query executed`, { context: 'database-query', metadata: { executionTime, queryPreview: query.substring(0, 100), truncated: query.length > 100 } });

    return result;
  } finally {
    client.release();
  }
};

// Function to execute a transaction (always uses primary pool)
export const executeTransaction = async <T extends QueryResultRow = QueryResultRow>(
  queries: Array<{ query: string; values?: QueryParams | undefined }>,
): Promise<T[]> => {
  const client = await primaryPool.connect();
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
    logger.info('Transaction executed', { context: 'database-transaction', metadata: { executionTime, queryCount: queries.length } });

    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed and rolled back', { context: 'database-transaction', metadata: { error } });
    throw error;
  } finally {
    client.release();
  }
};

// Function to get pool statistics
export const getPoolStats = () => {
  const stats = {
    primary: {
      totalCount: primaryPool.totalCount,
      idleCount: primaryPool.idleCount,
      waitingCount: primaryPool.waitingCount,
      max: primaryPool.options.max,
      idleTimeoutMillis: primaryPool.options.idleTimeoutMillis,
      connectionTimeoutMillis: primaryPool.options.connectionTimeoutMillis
    },
    replicas: replicaPools.map((pool, index) => ({
      replicaId: index + 1,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      max: pool.options.max,
      idleTimeoutMillis: pool.options.idleTimeoutMillis,
      connectionTimeoutMillis: pool.options.connectionTimeoutMillis
    }))
  };

  return stats;
};

// Export pools for direct access if needed
export { primaryPool, replicaPools };
export default { primaryPool, replicaPools };
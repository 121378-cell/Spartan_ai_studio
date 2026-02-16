/**
 * PostgreSQL Connection Test
 * Simple test to verify PostgreSQL connectivity after migration
 * This test will be skipped if not running in a PostgreSQL environment
 */

import { executeQuery } from '../config/postgresConfig';

describe('PostgreSQL Connection', () => {
  // Skip these tests if not configured for PostgreSQL
  const isPostgresConfigured = process.env.DATABASE_TYPE === 'postgres' ||
                               process.env.POSTGRES_HOST !== undefined;

  if (!isPostgresConfigured) {
    it.skip('should connect to PostgreSQL and execute a simple query', async () => {
      // This test is skipped when not in PostgreSQL environment
    });

    it.skip('should be able to create and query a test table', async () => {
      // This test is skipped when not in PostgreSQL environment
    });
  } else {
    it('should connect to PostgreSQL and execute a simple query', async () => {
      // Execute a simple query to test connection
      const result = await executeQuery('SELECT 1 as test');
      
      // Verify the result
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({ test: 1 });
    });

    it('should be able to create and query a test table', async () => {
      // Create a test table
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS test_table (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert test data
      await executeQuery(
        'INSERT INTO test_table (name) VALUES ($1)',
        ['Test Entry']
      );

      // Query the data
      const result = await executeQuery('SELECT * FROM test_table WHERE name = $1', ['Test Entry']);
      
      // Verify the result
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Test Entry');

      // Clean up - drop the test table
      await executeQuery('DROP TABLE IF EXISTS test_table');
    });
  }
});

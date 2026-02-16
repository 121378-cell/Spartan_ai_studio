/**
 * Database Connection Module
 * 
 * Provides a simple interface for database connections to maintain backward compatibility
 * with existing controllers that import from '../../database/connection'
 */

import { getDatabase as getDbInternal } from './databaseManager';

/**
 * Get database instance
 */
export const getDb = getDbInternal;

export default getDbInternal;
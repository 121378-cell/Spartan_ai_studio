/**
 * Cache controller for handling cache administration requests
 * Provides endpoints for managing external API cache
 */

import { Request, Response } from 'express';
import {
  clearCache,
  getCacheStats,
  removeCachedData,
  getCachedData
} from '../utils/cacheService';
import { logger } from '../utils/logger';

/**
 * Get cache statistics
 * @param req Express request object
 * @param res Express response object
 */
export async function getCacheStatsEndpoint(req: Request, res: Response) {
  try {
    const stats = await getCacheStats();
    
    res.status(200).json({
      success: true,
      message: 'Cache statistics retrieved successfully',
      data: stats
    });
  } catch (error: unknown) {
    logger.error('Error getting cache stats', { context: 'cache', metadata: { error } });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      message: 'Error retrieving cache statistics',
      error: errorMessage
    });
  }
}

/**
 * Clear all cached data
 * @param req Express request object
 * @param res Express response object
 */
export async function clearCacheEndpoint(req: Request, res: Response) {
  try {
    await clearCache();
    
    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error: unknown) {
    logger.error('Error clearing cache', { context: 'cache', metadata: { error } });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      message: 'Error clearing cache',
      error: errorMessage
    });
  }
}

/**
 * Remove specific cached data
 * @param req Express request object
 * @param res Express response object
 */
export async function removeCacheEntryEndpoint(req: Request, res: Response) {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Cache key is required'
      });
    }
    
    await removeCachedData(key);
    
    return res.status(200).json({
      success: true,
      message: `Cache entry for key '${key}' removed successfully`
    });
  } catch (error: unknown) {
    logger.error('Error removing cache entry', { context: 'cache', metadata: { error } });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      message: 'Error removing cache entry',
      error: errorMessage
    });
  }
}

/**
 * Get specific cached data
 * @param req Express request object
 * @param res Express response object
 */
export async function getCacheEntryEndpoint(req: Request, res: Response) {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Cache key is required'
      });
    }
    
    const data = await getCachedData(key);
    
    if (data === null) {
      return res.status(404).json({
        success: false,
        message: `No cached data found for key '${key}'`
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Cached data for key '${key}' retrieved successfully`,
      data
    });
  } catch (error: unknown) {
    logger.error('Error getting cache entry', { context: 'cache', metadata: { error } });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      message: 'Error retrieving cache entry',
      error: errorMessage
    });
  }
}

export default {
  getCacheStatsEndpoint,
  clearCacheEndpoint,
  removeCacheEntryEndpoint,
  getCacheEntryEndpoint
};
import { useState, useEffect } from 'react';
import { PersistenceService } from '../services/persistenceService';
import type { Routine } from '../types';
import { logger } from '../utils/logger';

/**
 * Hook for managing offline persistence of critical data
 * Provides access to last loaded routines and other critical data
 * when the backend is unavailable
 */
export const useOfflinePersistence = () => {
  const [lastLoadedRoutine, setLastLoadedRoutine] = useState<Routine | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; total: number; percentage: number } | null>(null);

  /**
   * Load last loaded routine from persistence
   */
  const loadLastRoutine = () => {
    try {
      const routine = PersistenceService.getLastLoadedRoutine() as Routine | null;
      setLastLoadedRoutine(routine);
      return routine;
    } catch (error) {
      logger.error('Error loading last routine', {
        context: 'useOfflinePersistence',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  };

  /**
   * Save a routine as the last loaded routine
   * @param routine - The routine to save
   */
  const saveLastRoutine = (routine: Routine) => {
    try {
      const success = PersistenceService.saveLastLoadedRoutine(routine);
      if (success) {
        setLastLoadedRoutine(routine);
      }
      return success;
    } catch (error) {
      logger.error('Error saving last routine', {
        context: 'useOfflinePersistence',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  };

  /**
   * Load critical data by key
   * @param key - The key for the critical data
   */
  const loadCriticalData = (key: string) => {
    try {
      return PersistenceService.getCriticalData(key);
    } catch (error) {
      logger.error('Error loading critical data', {
        context: 'useOfflinePersistence',
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  };

  /**
   * Save critical data by key
   * @param key - The key for the critical data
   * @param data - The data to save
   */
  const saveCriticalData = (key: string, data: any) => {
    try {
      return PersistenceService.saveCriticalData(key, data);
    } catch (error) {
      logger.error('Error saving critical data', {
        context: 'useOfflinePersistence',
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  };

  /**
   * Check if we're in offline mode by testing backend connectivity
   */
  const checkOfflineMode = async () => {
    try {
      // Try to fetch from backend health endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch('/health', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const isOffline = !response.ok;
      setIsOfflineMode(isOffline);
      return isOffline;
    } catch (error) {
      // If we can't reach the backend, we're offline
      setIsOfflineMode(true);
      return true;
    }
  };

  /**
   * Get data from offline cache
   * @param key - Cache key
   */
  const getFromCache = (key: string) => {
    try {
      return PersistenceService.getFromCache(key);
    } catch (error) {
      logger.error('Error getting data from cache', {
        context: 'useOfflinePersistence',
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  };

  /**
   * Save data to offline cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   */
  const saveToCache = (key: string, data: any, ttl: number = 60 * 60 * 1000) => {
    try {
      return PersistenceService.saveToCache(key, data, ttl);
    } catch (error) {
      logger.error('Error saving data to cache', {
        context: 'useOfflinePersistence',
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  };

  /**
   * Update storage information
   */
  const updateStorageInfo = () => {
    try {
      const info = PersistenceService.getStorageInfo();
      setStorageInfo(info);
      return info;
    } catch (error) {
      logger.error('Error getting storage info', {
        context: 'useOfflinePersistence',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  };

  // Load initial data
  useEffect(() => {
    loadLastRoutine();
    updateStorageInfo();

    // Clear expired cache entries periodically
    const interval = setInterval(() => {
      try {
        PersistenceService.clearExpiredCache();
        updateStorageInfo();
      } catch (error) {
        logger.error('Error clearing expired cache', {
          context: 'useOfflinePersistence',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          }
        });
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  return {
    // Last loaded routine
    lastLoadedRoutine,
    loadLastRoutine,
    saveLastRoutine,

    // Critical data
    loadCriticalData,
    saveCriticalData,

    // Offline mode detection
    isOfflineMode,
    checkOfflineMode,

    // Cache management
    getFromCache,
    saveToCache,

    // Storage information
    storageInfo,
    updateStorageInfo
  };
};


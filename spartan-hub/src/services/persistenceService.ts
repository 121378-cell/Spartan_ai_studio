/**
 * Persistence Service for local data storage
 * Provides enhanced offline functionality and critical data persistence
 */

import { logger } from '../utils/logger';

// Storage keys for different data types
const STORAGE_KEYS = {
  USER_PROFILE: 'userProfile',
  ROUTINES: 'routines',
  WORKOUT_HISTORY: 'workoutHistory',
  RECONDITIONING_PLANS: 'reconditioningPlans',
  DAILY_LOGS: 'dailyLogs',
  HABIT_LOGS: 'habitLogs',
  WEEKLY_CHECK_INS: 'weeklyCheckIns',
  SCHEDULED_WORKOUTS: 'scheduledWorkouts',
  LAST_LOADED_ROUTINE: 'lastLoadedRoutine',
  CRITICAL_DATA: 'criticalData',
  OFFLINE_CACHE: 'offlineCache'
} as const;

type StorageKey = keyof typeof STORAGE_KEYS;

/**
 * Enhanced localStorage wrapper with error handling and fallbacks
 */
class LocalStorageManager {
  private static instance: LocalStorageManager;
  private isLocalStorageAvailable: boolean;

  private constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
  }

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  /**
   * Check if localStorage is available and working
   */
  private checkLocalStorageAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      logger.warn('localStorage is not available', {
        context: 'persistence-service',
        metadata: {
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined
        }
      });
      return false;
    }
  }

  /**
   * Get data from localStorage
   * @param key - Storage key
   * @param defaultValue - Default value if key doesn't exist
   */
  getItem<T>(key: StorageKey, defaultValue: T): T {
    if (!this.isLocalStorageAvailable) {
      return defaultValue;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS[key]);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      logger.error('Error reading from localStorage', {
        context: 'persistence-service',
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return defaultValue;
    }
  }

  /**
   * Set data in localStorage
   * @param key - Storage key
   * @param value - Value to store
   */
  setItem<T>(key: StorageKey, value: T): boolean {
    if (!this.isLocalStorageAvailable) {
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Error writing to localStorage', {
        context: 'persistence-service',
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  }

  /**
   * Remove item from localStorage
   * @param key - Storage key
   */
  removeItem(key: StorageKey): boolean {
    if (!this.isLocalStorageAvailable) {
      return false;
    }

    try {
      localStorage.removeItem(STORAGE_KEYS[key]);
      return true;
    } catch (error) {
      logger.error('Error removing from localStorage', {
        context: 'persistence-service',
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  }

  /**
   * Clear all stored data
   */
  clear(): boolean {
    if (!this.isLocalStorageAvailable) {
      return false;
    }

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logger.error('Error clearing localStorage', {
        context: 'persistence-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; total: number; percentage: number } | null {
    if (!this.isLocalStorageAvailable) {
      return null;
    }

    try {
      let total = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return {
        used: total,
        total: 5 * 1024 * 1024, // 5MB typical limit
        percentage: Math.round((total / (5 * 1024 * 1024)) * 100)
      };
    } catch (error) {
      logger.error('Error getting storage info', {
        context: 'persistence-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  }
}

// Get the singleton instance
const storageManager = LocalStorageManager.getInstance();

/**
 * Critical Data Persistence Service
 * Ensures critical data is persisted for offline functionality
 */
export class PersistenceService {
  /**
   * Save the last loaded routine for offline access
   * @param routine - The routine to save
   */
  static saveLastLoadedRoutine<T = unknown>(routine: T): boolean {
    const data = {
      routine,
      timestamp: Date.now(),
      version: '1.0'
    };
    return storageManager.setItem('LAST_LOADED_ROUTINE', data);
  }

  /**
   * Get the last loaded routine
   * @returns The last loaded routine or null if not available
   */
  static getLastLoadedRoutine<T = unknown>(): T | null {
    const data = storageManager.getItem('LAST_LOADED_ROUTINE', null as { routine: T; timestamp: number; version: string } | null);
    if (!data) return null;

    // Check if data is recent (less than 7 days old)
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp > oneWeek) {
      // Data is too old, remove it
      storageManager.removeItem('LAST_LOADED_ROUTINE');
      return null;
    }

    return data.routine;
  }

  /**
   * Save critical data for offline functionality
   * @param key - Key for the critical data
   * @param data - Data to save
   */
  static saveCriticalData<T = unknown>(key: string, data: T): boolean {
    const criticalData = storageManager.getItem('CRITICAL_DATA', {} as Record<string, { data: T; timestamp: number; version: string }>);
    criticalData[key] = {
      data,
      timestamp: Date.now(),
      version: '1.0'
    };
    return storageManager.setItem('CRITICAL_DATA', criticalData);
  }

  /**
   * Get critical data
   * @param key - Key for the critical data
   * @returns The critical data or null if not available
   */
  static getCriticalData<T = unknown>(key: string): T | null {
    const criticalData = storageManager.getItem('CRITICAL_DATA', {} as Record<string, { data: T; timestamp: number; version: string }>);
    if (!criticalData[key]) return null;

    // Check if data is recent (less than 7 days old)
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - criticalData[key].timestamp > oneWeek) {
      // Data is too old, remove it
      delete criticalData[key];
      storageManager.setItem('CRITICAL_DATA', criticalData);
      return null;
    }

    return criticalData[key].data;
  }

  /**
   * Save data to offline cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   */
  static saveToCache<T = unknown>(key: string, data: T, ttl: number = 60 * 60 * 1000): boolean {
    const cache = storageManager.getItem('OFFLINE_CACHE', {} as Record<string, { data: T; timestamp: number; expires: number }>);
    cache[key] = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    };
    return storageManager.setItem('OFFLINE_CACHE', cache);
  }

  /**
   * Get data from offline cache
   * @param key - Cache key
   * @returns Cached data or null if not available/expired
   */
  static getFromCache<T = unknown>(key: string): T | null {
    const cache = storageManager.getItem('OFFLINE_CACHE', {} as Record<string, { data: T; timestamp: number; expires: number }>);
    if (!cache[key]) return null;

    // Check if cache is expired
    if (Date.now() > cache[key].expires) {
      // Remove expired cache
      delete cache[key];
      storageManager.setItem('OFFLINE_CACHE', cache);
      return null;
    }

    return cache[key].data;
  }

  /**
   * Clear expired cache entries
   */
  static clearExpiredCache(): boolean {
    const cache = storageManager.getItem('OFFLINE_CACHE', {} as Record<string, { data: unknown; timestamp: number; expires: number }>);
    const now = Date.now();
    let modified = false;

    for (const key in cache) {
      if (cache[key].expires < now) {
        delete cache[key];
        modified = true;
      }
    }

    if (modified) {
      return storageManager.setItem('OFFLINE_CACHE', cache);
    }
    return true;
  }

  /**
   * Get storage information
   */
  static getStorageInfo() {
    return storageManager.getStorageInfo();
  }

  /**
   * Clear all persistence data
   */
  static clearAll(): boolean {
    return storageManager.clear();
  }
}

// Export storage keys for direct access if needed
export { STORAGE_KEYS };

// Export the storage manager instance for advanced usage
export default storageManager;


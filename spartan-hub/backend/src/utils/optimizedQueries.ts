/**
 * Optimized Database Queries for Spartan Hub
 * High-performance query implementations with proper indexing
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from './logger';

interface OptimizedQueryOptions {
  limit?: number;
  offset?: number;
  cacheResults?: boolean;
  cacheTTL?: number; // in seconds
}

interface CachedResult {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class OptimizedQueries {
  private db: DatabaseType;
  private queryCache: Map<string, CachedResult> = new Map();
  private static instance: OptimizedQueries;

  private constructor(db: DatabaseType) {
    this.db = db;
    this.startCacheCleanup();
  }

  static getInstance(db: DatabaseType): OptimizedQueries {
    if (!OptimizedQueries.instance) {
      OptimizedQueries.instance = new OptimizedQueries(db);
    }
    return OptimizedQueries.instance;
  }

  /**
   * Get user's recent workouts with optimized pagination
   */
  async getUserWorkouts(userId: number, options: OptimizedQueryOptions = {}) {
    const { limit = 20, offset = 0, cacheResults = true } = options;
    const cacheKey = `user_workouts_${userId}_${limit}_${offset}`;

    // Check cache first
    if (cacheResults) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        logger.info('Cache hit for user workouts', { 
          context: 'database', 
          metadata: { userId, cacheKey } 
        });
        return cached;
      }
    }

    try {
      // Optimized query using compound index
      const query = `
        SELECT w.*, 
               COUNT(e.id) as exercise_count,
               COUNT(DISTINCT s.id) as set_count
        FROM workouts w
        LEFT JOIN exercises e ON w.id = e.workout_id
        LEFT JOIN sets s ON e.id = s.exercise_id
        WHERE w.user_id = ?
        GROUP BY w.id
        ORDER BY w.scheduled_date DESC, w.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const start = performance.now();
      const result = this.db.prepare(query).all(userId, limit, offset);
      const executionTime = performance.now() - start;

      logger.info('User workouts query executed', {
        context: 'database',
        metadata: { 
          userId, 
          executionTime: `${executionTime.toFixed(2)}ms`,
          rowCount: result.length
        }
      });

      // Cache the result
      if (cacheResults) {
        this.setCachedResult(cacheKey, result, options.cacheTTL || 300);
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch user workouts', {
        context: 'database',
        error: error as Error,
        metadata: { userId }
      });
      throw error;
    }
  }

  /**
   * Get workout details with all related data efficiently
   */
  async getWorkoutDetails(workoutId: number) {
    const cacheKey = `workout_details_${workoutId}`;

    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Single query with joins instead of multiple queries
      const query = `
        SELECT 
          w.*,
          json_group_array(
            json_object(
              'id', e.id,
              'exercise_name', e.exercise_name,
              'sets', (
                SELECT json_group_array(
                  json_object(
                    'id', s.id,
                    'set_number', s.set_number,
                    'weight', s.weight,
                    'reps', s.reps,
                    'rest_time', s.rest_time,
                    'notes', s.notes
                  )
                )
                FROM sets s
                WHERE s.exercise_id = e.id
                ORDER BY s.set_number
              )
            )
          ) as exercises
        FROM workouts w
        LEFT JOIN exercises e ON w.id = e.workout_id
        WHERE w.id = ?
        GROUP BY w.id
      `;

      const start = performance.now();
      const result = this.db.prepare(query).get(workoutId);
      const executionTime = performance.now() - start;

      logger.info('Workout details query executed', {
        context: 'database',
        metadata: { 
          workoutId, 
          executionTime: `${executionTime.toFixed(2)}ms`
        }
      });

      // Parse JSON arrays
      if (result && typeof (result as any).exercises === 'string') {
        try {
          (result as any).exercises = JSON.parse((result as any).exercises);
          // Remove null exercise entry if no exercises exist
          if ((result as any).exercises.length === 1 && (result as any).exercises[0].id === null) {
            (result as any).exercises = [];
          }
        } catch (parseError) {
          logger.warn('Failed to parse exercise JSON', {
            context: 'database',
            error: parseError as Error
          });
          (result as any).exercises = [];
        }
      }

      this.setCachedResult(cacheKey, result, 180);
      return result;
    } catch (error) {
      logger.error('Failed to fetch workout details', {
        context: 'database',
        error: error as Error,
        metadata: { workoutId }
      });
      throw error;
    }
  }

  /**
   * Get user statistics with optimized aggregation
   */
  async getUserStatistics(userId: number, daysBack: number = 30) {
    const cacheKey = `user_stats_${userId}_${daysBack}`;

    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Optimized aggregation query
      const query = `
        SELECT 
          COUNT(DISTINCT w.id) as total_workouts,
          COUNT(DISTINCT DATE(wl.completed_at)) as active_days,
          AVG(wl.duration_minutes) as avg_duration,
          SUM(CASE WHEN wl.completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed_workouts,
          MAX(wl.completed_at) as last_workout_date,
          COUNT(s.id) as total_sets,
          SUM(s.weight * s.reps) as total_volume
        FROM workouts w
        LEFT JOIN workout_logs wl ON w.id = wl.workout_id AND DATE(wl.completed_at) >= ?
        LEFT JOIN exercises e ON w.id = e.workout_id
        LEFT JOIN sets s ON e.id = s.exercise_id
        WHERE w.user_id = ?
      `;

      const start = performance.now();
      const result = this.db.prepare(query).get(startDateStr, userId);
      const executionTime = performance.now() - start;

      logger.info('User statistics query executed', {
        context: 'database',
        metadata: { 
          userId, 
          daysBack,
          executionTime: `${executionTime.toFixed(2)}ms`
        }
      });

      this.setCachedResult(cacheKey, result, 600);
      return result;
    } catch (error) {
      logger.error('Failed to fetch user statistics', {
        context: 'database',
        error: error as Error,
        metadata: { userId, daysBack }
      });
      throw error;
    }
  }

  /**
   * Search workouts with full-text search optimization
   */
  async searchWorkouts(userId: number, searchTerm: string, options: OptimizedQueryOptions = {}) {
    const { limit = 20, offset = 0 } = options;
    const cacheKey = `search_${userId}_${searchTerm}_${limit}_${offset}`;

    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use LIKE with proper indexing for search
      const query = `
        SELECT w.*,
               COUNT(e.id) as exercise_count
        FROM workouts w
        LEFT JOIN exercises e ON w.id = e.workout_id
        WHERE w.user_id = ?
          AND (
            w.title LIKE ? 
            OR w.description LIKE ? 
            OR e.exercise_name LIKE ?
          )
        GROUP BY w.id
        ORDER BY w.scheduled_date DESC
        LIMIT ? OFFSET ?
      `;

      const searchPattern = `%${searchTerm}%`;
      const start = performance.now();
      const result = this.db.prepare(query).all(
        userId, 
        searchPattern, 
        searchPattern, 
        searchPattern,
        limit, 
        offset
      );
      const executionTime = performance.now() - start;

      logger.info('Workout search query executed', {
        context: 'database',
        metadata: { 
          userId, 
          searchTerm,
          executionTime: `${executionTime.toFixed(2)}ms`,
          resultCount: result.length
        }
      });

      this.setCachedResult(cacheKey, result, 120);
      return result;
    } catch (error) {
      logger.error('Failed to search workouts', {
        context: 'database',
        error: error as Error,
        metadata: { userId, searchTerm }
      });
      throw error;
    }
  }

  /**
   * Get dashboard data efficiently with minimal queries
   */
  async getDashboardData(userId: number) {
    const cacheKey = `dashboard_${userId}`;

    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Single query for all dashboard data using UNION for efficiency
      const query = `
        WITH user_data AS (
          SELECT 
            -- Recent workouts (last 7 days)
            (SELECT json_group_array(
              json_object('id', id, 'title', title, 'scheduled_date', scheduled_date)
            ) FROM workouts 
             WHERE user_id = ? AND scheduled_date >= date('now', '-7 days')
             ORDER BY scheduled_date DESC LIMIT 5) as recent_workouts,
            
            -- Upcoming workouts (next 7 days)
            (SELECT json_group_array(
              json_object('id', id, 'title', title, 'scheduled_date', scheduled_date)
            ) FROM workouts 
             WHERE user_id = ? AND scheduled_date BETWEEN date('now') AND date('now', '+7 days')
             AND status = 'scheduled'
             ORDER BY scheduled_date ASC LIMIT 5) as upcoming_workouts,
            
            -- Quick stats
            (SELECT COUNT(*) FROM workouts WHERE user_id = ?) as total_workouts,
            (SELECT COUNT(*) FROM workout_logs WHERE user_id = ? AND completed_at >= date('now', '-30 days')) as workouts_this_month,
            (SELECT MAX(completed_at) FROM workout_logs WHERE user_id = ?) as last_workout
        )
        SELECT * FROM user_data
      `;

      const start = performance.now();
      const result = this.db.prepare(query).get(userId, userId, userId, userId, userId);
      const executionTime = performance.now() - start;

      logger.info('Dashboard data query executed', {
        context: 'database',
        metadata: { 
          userId, 
          executionTime: `${executionTime.toFixed(2)}ms`
        }
      });

      // Parse JSON arrays
      const resultAsAny = result as any;
      ['recent_workouts', 'upcoming_workouts'].forEach(field => {
        if (resultAsAny[field] && typeof resultAsAny[field] === 'string') {
          try {
            resultAsAny[field] = JSON.parse(resultAsAny[field]);
          } catch (error) {
            resultAsAny[field] = [];
          }
        }
      });

      this.setCachedResult(cacheKey, result, 300);
      return result;
    } catch (error) {
      logger.error('Failed to fetch dashboard data', {
        context: 'database',
        error: error as Error,
        metadata: { userId }
      });
      throw error;
    }
  }

  // Cache management methods
  private getCachedResult(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    if (cached) {
      this.queryCache.delete(key); // Remove expired cache
    }
    
    return null;
  }

  private setCachedResult(key: string, data: any, ttlSeconds: number): void {
    const now = Date.now();
    this.queryCache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttlSeconds * 1000)
    });
  }

  private startCacheCleanup(): void {
    // Clean expired cache entries every 10 minutes
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, cached] of this.queryCache.entries()) {
        if (now >= cached.expiresAt) {
          this.queryCache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info('Cleaned expired cache entries', {
          context: 'database',
          metadata: { cleanedCount }
        });
      }
    }, 600000); // 10 minutes
  }

  // Public cache management
  clearUserCache(userId: number): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.queryCache.keys()) {
      if (key.includes(`_${userId}_`) || key.startsWith(`${userId}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.queryCache.delete(key));
    
    logger.info('Cleared user cache', {
      context: 'database',
      metadata: { userId, clearedKeys: keysToDelete.length }
    });
  }

  getCacheStats(): { totalEntries: number; expiredEntries: number } {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const cached of this.queryCache.values()) {
      if (now >= cached.expiresAt) {
        expiredCount++;
      }
    }
    
    return {
      totalEntries: this.queryCache.size,
      expiredEntries: expiredCount
    };
  }
}

export default OptimizedQueries;
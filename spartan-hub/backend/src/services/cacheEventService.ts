/**
 * Cache Event Service for handling cache invalidation events
 * Provides a centralized way to manage cache invalidation based on application events
 */

import { invalidateCacheByTags } from '../utils/cacheService';
import { logger } from '../utils/logger';

// Event types that can trigger cache invalidation
export enum CacheEventType {
  // User events
  USER_PROFILE_UPDATED = 'user.profile.updated',
  USER_PREFERENCES_CHANGED = 'user.preferences.changed',
  USER_WORKOUT_COMPLETED = 'user.workout.completed',

  // Exercise events
  EXERCISE_ADDED = 'exercise.added',
  EXERCISE_UPDATED = 'exercise.updated',
  EXERCISE_DELETED = 'exercise.deleted',

  // Nutrition events
  NUTRITION_LOG_ADDED = 'nutrition.log.added',
  NUTRITION_LOG_UPDATED = 'nutrition.log.updated',

  // Workout plan events
  WORKOUT_PLAN_CREATED = 'workout.plan.created',
  WORKOUT_PLAN_UPDATED = 'workout.plan.updated',
  WORKOUT_PLAN_DELETED = 'workout.plan.deleted',

  // AI service events
  AI_MODEL_UPDATED = 'ai.model.updated',
  AI_SERVICE_RESTARTED = 'ai.service.restarted',

  // System events
  SYSTEM_MAINTENANCE = 'system.maintenance',
  DATA_IMPORT_COMPLETED = 'data.import.completed'
}

// Mapping of events to cache tags that should be invalidated
const EVENT_TAG_MAPPING: Record<CacheEventType, string[]> = {
  // User events
  [CacheEventType.USER_PROFILE_UPDATED]: ['user/profile', 'user/preferences'],
  [CacheEventType.USER_PREFERENCES_CHANGED]: ['user/preferences', 'workout/plan', 'ai/recommendation'],
  [CacheEventType.USER_WORKOUT_COMPLETED]: ['user/progress', 'ai/alert', 'ai/recommendation'],

  // Exercise events
  [CacheEventType.EXERCISE_ADDED]: ['exercise/list', 'exercise/search', 'ai/recommendation'],
  [CacheEventType.EXERCISE_UPDATED]: ['exercise/list', 'exercise/detail', 'exercise/search'],
  [CacheEventType.EXERCISE_DELETED]: ['exercise/list', 'exercise/detail', 'exercise/search'],

  // Nutrition events
  [CacheEventType.NUTRITION_LOG_ADDED]: ['nutrition/info', 'user/progress', 'ai/alert'],
  [CacheEventType.NUTRITION_LOG_UPDATED]: ['nutrition/info', 'user/progress'],

  // Workout plan events
  [CacheEventType.WORKOUT_PLAN_CREATED]: ['workout/plan', 'ai/recommendation'],
  [CacheEventType.WORKOUT_PLAN_UPDATED]: ['workout/plan', 'workout/template'],
  [CacheEventType.WORKOUT_PLAN_DELETED]: ['workout/plan'],

  // AI service events
  [CacheEventType.AI_MODEL_UPDATED]: ['ai/alert', 'ai/decision', 'ai/recommendation'],
  [CacheEventType.AI_SERVICE_RESTARTED]: ['ai/alert', 'ai/decision', 'ai/recommendation'],

  // System events
  [CacheEventType.SYSTEM_MAINTENANCE]: ['exercise/list', 'exercise/detail', 'nutrition/info', 'workout/plan'],
  [CacheEventType.DATA_IMPORT_COMPLETED]: ['exercise/list', 'nutrition/info', 'workout/plan']
};

/**
 * Trigger cache invalidation based on an event
 * @param eventType The type of event that occurred
 * @param customTags Optional custom tags to invalidate in addition to mapped tags
 * @returns Number of cache entries invalidated
 */
export async function triggerCacheInvalidation(eventType: CacheEventType, customTags?: string[]): Promise<number> {
  logger.debug(`🔔 Cache invalidation triggered by event: ${eventType}`, { context: 'cacheEvent' });

  // Get tags mapped to this event type
  const mappedTags = EVENT_TAG_MAPPING[eventType] || [];

  // Combine mapped tags with custom tags
  const allTags = [...mappedTags, ...(customTags || [])];

  if (allTags.length === 0) {
    logger.debug(`ℹ️ No tags to invalidate for event: ${eventType}`, { context: 'cacheEvent' });
    return 0;
  }

  // Invalidate cache entries for all tags
  const invalidatedCount = await invalidateCacheByTags(allTags);

  logger.debug(`✅ Cache invalidation completed for event: ${eventType}. Invalidated ${invalidatedCount} entries.`, { context: 'cacheEvent' });
  return invalidatedCount;
}

/**
 * Register a custom event-tag mapping
 * @param eventType The event type to register
 * @param tags The tags to invalidate when this event occurs
 */
export function registerEventTagMapping(eventType: CacheEventType, tags: string[]): void {
  if (!EVENT_TAG_MAPPING[eventType]) {
    EVENT_TAG_MAPPING[eventType] = [];
  }
  EVENT_TAG_MAPPING[eventType].push(...tags);
  logger.info(`✅ Registered event-tag mapping: ${eventType} -> [${tags.join(', ')}]`, { context: 'cacheEvent' });
}

/**
 * Get tags that would be invalidated by an event
 * @param eventType The event type
 * @returns Array of tags that would be invalidated
 */
export function getTagsForEvent(eventType: CacheEventType): string[] {
  return EVENT_TAG_MAPPING[eventType] || [];
}

export default {
  CacheEventType,
  triggerCacheInvalidation,
  registerEventTagMapping,
  getTagsForEvent
};

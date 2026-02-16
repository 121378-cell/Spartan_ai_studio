import { executeFetchWithRetry } from '../utils/retryHandler';
import { withConditionalCache } from '../utils/cacheService';
import { CacheEventType, triggerCacheInvalidation } from './cacheEventService';
import { EXERCISE_API_CONCURRENCY_LIMITER } from '../utils/concurrencyLimiter';
import { ExerciseDetail, NutritionInfo, WorkoutPlan } from '../types';
import { logger } from '../utils/logger';

// Retry options for fitness/nutrition API calls
const FITNESS_NUTRITION_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  factor: 2,
  jitter: true,
  timeout: 10000,
  perRequestTimeout: 5000, // Individual request timeout of 5 seconds
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE', 'EHOSTUNREACH']
};

/**
 * Search exercises by muscle group using parallel API calls with concurrency limiting
 * @param muscle Target muscle group
 * @returns Array of exercises
 */
export async function searchExercisesByMuscle(muscle: string): Promise<ExerciseDetail[]> {
  try {
    const data = await withConditionalCache<ExerciseDetail[]>(
      '/fitness/exercises/muscle',
      { muscle },
      () => executeFetchWithRetry<ExerciseDetail[]>(
        `/fitness/exercises/muscle/${muscle}`,
        {
          credentials: 'include'
        },
        FITNESS_NUTRITION_RETRY_OPTIONS
      ),
      'exercise/list', // Content type for expiration policy
      ['exercise/list', `exercise/muscle/${muscle}`] // Tags for event-based invalidation
    );

    return data;
  } catch (error) {
    logger.error('Error fetching exercises:', { metadata: { error } });
    return [];
  }
}

/**
 * Search exercises by name using parallel API calls with concurrency limiting
 * @param name Exercise name or partial name
 * @returns Array of exercises
 */
export async function searchExercisesByName(name: string): Promise<ExerciseDetail[]> {
  try {
    const data = await withConditionalCache<ExerciseDetail[]>(
      '/fitness/exercises/search',
      { name },
      () => executeFetchWithRetry<ExerciseDetail[]>(
        `/fitness/exercises/search?name=${encodeURIComponent(name)}`,
        {
          credentials: 'include'
        },
        FITNESS_NUTRITION_RETRY_OPTIONS
      ),
      'exercise/search', // Content type for expiration policy
      ['exercise/search', `exercise/name/${name}`] // Tags for event-based invalidation
    );

    return data;
  } catch (error) {
    logger.error('Error fetching exercises by name:', { metadata: { error } });
    return [];
  }
}

/**
 * Get nutrition information for food items using parallel API calls with concurrency limiting
 * @param foodItems Array of food item descriptions
 * @returns Nutrition information
 */
export async function getNutritionInfo(foodItems: string[]): Promise<NutritionInfo[]> {
  try {
    const data = await withConditionalCache<NutritionInfo[]>(
      '/fitness/nutrition',
      { foodItems },
      () => executeFetchWithRetry<NutritionInfo[]>(
        '/fitness/nutrition',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ foodItems }),
        },
        FITNESS_NUTRITION_RETRY_OPTIONS
      ),
      'nutrition/info', // Content type for expiration policy
      ['nutrition/info'] // Tags for event-based invalidation
    );

    return data;
  } catch (error) {
    logger.error('Error fetching nutrition info:', { metadata: { error } });
    return [];
  }
}

/**
 * Get comprehensive exercise recommendations by querying multiple muscle groups in parallel with concurrency limiting
 * @param userProfile User profile data
 * @returns Recommended exercises
 */
export async function getExerciseRecommendations(userProfile: { trainingCycle?: { phase?: string }; [key: string]: unknown }): Promise<ExerciseDetail[]> {
  try {
    // Analyze user profile to recommend exercises
    const muscleGroups: string[] = [];

    // Simple logic based on user profile
    if (userProfile.trainingCycle?.phase === 'strength') {
      muscleGroups.push('chest', 'back', 'legs');
    } else if (userProfile.trainingCycle?.phase === 'hypertrophy') {
      muscleGroups.push('biceps', 'triceps', 'shoulders');
    } else {
      muscleGroups.push('abdominals', 'chest', 'back');
    }

    // Execute all API calls with concurrency limiting for better performance and resource management
    const exercisePromises = muscleGroups.map(muscle =>
      () => searchExercisesByMuscle(muscle)
    );
    const exerciseResults = await EXERCISE_API_CONCURRENCY_LIMITER.runAll(exercisePromises);

    // Flatten results and take top 3 exercises per muscle group
    const recommendations: ExerciseDetail[] = [];
    exerciseResults.forEach(exercises => {
      const topExercises = exercises.slice(0, 3);
      recommendations.push(...topExercises);
    });

    return recommendations;
  } catch (error) {
    logger.error('Error getting exercise recommendations:', { metadata: { error } });
    return [];
  }
}

/**
 * Get combined fitness data by querying multiple endpoints in parallel with concurrency limiting
 * @param preferences User preferences for workout
 * @param foodItems Food items to get nutrition info for
 * @returns Combined fitness data
 */
export async function getCombinedFitnessData(preferences: Record<string, unknown>, foodItems: string[]): Promise<{
  exercises: ExerciseDetail[];
  nutrition: NutritionInfo[];
  workoutPlan: WorkoutPlan | null;
}> {
  try {
    // Execute all API calls with concurrency limiting for better performance and resource management
    const [exercises, nutrition, workoutPlan] = await Promise.all([
      getExerciseRecommendations(preferences),
      getNutritionInfo(foodItems),
      generateWorkoutPlan(preferences)
    ]);

    return {
      exercises,
      nutrition,
      workoutPlan
    };
  } catch (error) {
    logger.error('Error getting combined fitness data:', { metadata: { error } });
    return {
      exercises: [],
      nutrition: [],
      workoutPlan: null
    };
  }
}

/**
 * Generate workout plan based on user preferences
 * @param preferences User workout preferences
 * @returns Workout plan
 */
export async function generateWorkoutPlan(preferences: { duration?: unknown; focus?: unknown; [key: string]: unknown }): Promise<WorkoutPlan | null> {
  try {
    // This would integrate with an AI workout planner API
    // For now, we'll return a mock plan
    logger.debug('Generating workout plan with preferences:', { metadata: { preferences } });

    // In a real implementation, this would call an API like:
    // - AI Workout Planner API from RapidAPI
    // - Hyperhuman API for personalized workouts
    // - Custom AI service

    await Promise.resolve();

    return {
      id: `plan-${  Date.now()}`,
      name: 'Custom Workout Plan',
      duration: (preferences.duration as string) || '30 minutes',
      focus: (preferences.focus as string) || 'full body',
      exercises: []
    };
  } catch (error) {
    logger.error('Error generating workout plan:', { metadata: { error } });
    return null;
  }
}

/**
 * Simulate adding a new exercise (for demonstration of cache invalidation)
 * @param exercise Exercise to add
 */
export async function addExercise(exercise: Record<string, unknown>): Promise<void> {
  try {
    // In a real implementation, this would make an API call to add the exercise
    logger.debug('Adding new exercise:', { metadata: { exercise } });

    // Trigger cache invalidation for exercise-related data
    await triggerCacheInvalidation(CacheEventType.EXERCISE_ADDED);

    logger.debug('Exercise added and cache invalidated');
  } catch (error) {
    logger.error('Error adding exercise:', { metadata: { error } });
    throw error;
  }
}

/**
 * Simulate updating an exercise (for demonstration of cache invalidation)
 * @param exerciseId ID of exercise to update
 * @param updates Updates to apply
 */
export async function updateExercise(exerciseId: string, updates: Record<string, unknown>): Promise<void> {
  try {
    // In a real implementation, this would make an API call to update the exercise
    logger.debug(`Updating exercise ${exerciseId}:`, { metadata: { updates } });

    // Trigger cache invalidation for exercise-related data
    await triggerCacheInvalidation(CacheEventType.EXERCISE_UPDATED);

    logger.debug('Exercise updated and cache invalidated');
  } catch (error) {
    logger.error('Error updating exercise:', { metadata: { error } });
    throw error;
  }
}

/**
 * Simulate deleting an exercise (for demonstration of cache invalidation)
 * @param exerciseId ID of exercise to delete
 */
export async function deleteExercise(exerciseId: string): Promise<void> {
  try {
    // In a real implementation, this would make an API call to delete the exercise
    logger.debug(`Deleting exercise ${exerciseId}`);

    // Trigger cache invalidation for exercise-related data
    await triggerCacheInvalidation(CacheEventType.EXERCISE_DELETED);

    logger.debug('Exercise deleted and cache invalidated');
  } catch (error) {
    logger.error('Error deleting exercise:', { metadata: { error } });
    throw error;
  }
}

export default {
  searchExercisesByMuscle,
  searchExercisesByName,
  getNutritionInfo,
  getExerciseRecommendations,
  getCombinedFitnessData,
  generateWorkoutPlan,
  addExercise,
  updateExercise,
  deleteExercise
};

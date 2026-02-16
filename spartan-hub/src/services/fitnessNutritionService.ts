import { HttpService } from './httpService';
import { ExerciseDetail, NutritionInfo, WorkoutPlan } from '../types';
import { logger } from '../utils/logger';

/**
 * Search exercises by muscle group
 * @param muscle Target muscle group
 * @returns Array of exercises
 */
export async function searchExercisesByMuscle(muscle: string): Promise<ExerciseDetail[]> {
  try {
    const response = await HttpService.get<ExerciseDetail[]>(`/fitness/exercises/muscle/${muscle}`);
    return response.data;
  } catch (error) {
    logger.error('Error fetching exercises', {
      context: 'fitness-nutrition-service',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return [];
  }
}

/**
 * Get nutrition info for food items
 * @param items Array of food items
 * @returns Array of nutrition info
 */
export async function getNutritionInfo(items: string[]): Promise<NutritionInfo[]> {
  try {
    const response = await HttpService.post<NutritionInfo[]>('/fitness/nutrition/analyze', { items });
    return response.data;
  } catch (error) {
    logger.error('Error getting nutrition info', {
      context: 'fitness-nutrition-service',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return [];
  }
}

import type { Routine } from '../types.ts';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary.ts';
import { produce } from 'immer';

// Create a map for faster lookups
const exerciseMap = new Map(EXERCISE_LIBRARY.map(ex => [ex.name.toLowerCase(), ex]));

export const adaptRoutineForInjuries = (routine: Omit<Routine, 'id'>, injuryHistory: string): Omit<Routine, 'id'> => {
    if (!injuryHistory) {
        return routine;
    }

    const injuryKeywords = injuryHistory.toLowerCase().match(/\b(rodilla|hombro|espalda|muñeca|codo)\b/g) || [];
    if (injuryKeywords.length === 0) {
        return routine;
    }

    const uniqueKeywords = [...new Set(injuryKeywords)];

    return produce(routine, draft => {
        draft.blocks.forEach(block => {
            block.exercises.forEach((exercise, index) => {
                const exerciseDetail = exerciseMap.get(exercise.name.toLowerCase());
                if (!exerciseDetail) return;

                for (const keyword of uniqueKeywords) {
                    const modificationKey = `${keyword}_pain`;
                    if (exerciseDetail.injuryModifications && exerciseDetail.injuryModifications[modificationKey]) {
                        const { modification } = exerciseDetail.injuryModifications[modificationKey];
                        const newExerciseDetail = exerciseMap.get(modification.toLowerCase());
                        
                        if (newExerciseDetail) {
                            // Replace the exercise in the routine
                            block.exercises[index] = {
                                ...exercise, // Keep sets, reps, etc.
                                name: newExerciseDetail.name,
                                coachTip: `Modificado debido a historial de dolor de ${keyword}. ${newExerciseDetail.biomechanicsFocus}`
                            };
                            // Break from the keywords loop since we've already modified this exercise
                            return; 
                        }
                    }
                }
            });
        });
    });
};

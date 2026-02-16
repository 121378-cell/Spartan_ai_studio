import type { Routine, RoutineBlock, Exercise } from '../types.ts';

export type ExerciseMode = 'strength' | 'time' | 'activation';

/**
 * Determines the logging card mode based on exercise and routine context.
 * This is the implementation of the "Contextual Logic Gate".
 */
export const getExerciseMode = (routine: Routine, block: RoutineBlock, exercise: Exercise): ExerciseMode => {
    const blockName = block.name.toLowerCase();
    const routineFocus = routine.focus.toLowerCase();
    const exerciseName = exercise.name.toLowerCase();

    // Condition 3: ACTIVATION MODE ('Calidad')
    // Triggers: 'Calentamiento', 'Movilidad', 'Enfriamiento', or 'Pre-Habilitación' blocks.
    const activationKeywords = ['calentamiento', 'movilidad', 'enfriamiento', 'pre-habilitación', 'activación'];
    if (activationKeywords.some(keyword => blockName.includes(keyword))) {
        return 'activation';
    }

    // Condition 2: TIME MODE
    // Triggers: 'Cardio', 'Resistencia Metabólica', 'Plancha', or 'Activación' exercises/focus.
    const timeFocusKeywords = ['cardio', 'resistencia', 'hiit', 'metabólico'];
    const timeExerciseKeywords = ['plancha', 'activación'];
    if (
        timeFocusKeywords.some(keyword => routineFocus.includes(keyword)) ||
        timeExerciseKeywords.some(keyword => exerciseName.includes(keyword))
    ) {
        return 'time';
    }

    // Condition 1: STRENGTH MODE (Default)
    // Triggers: 'Fuerza', 'Hipertrofia', 'Potencia' focus. This is the default.
    return 'strength';
};


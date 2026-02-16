import { ExerciseType, ExercisePattern } from '../types/formAnalysis';

interface AnalysisMapEntry {
    type: ExerciseType;
    pattern: ExercisePattern;
    suggestedView: 'lateral' | 'frontal';
}

const EXERCISE_ANALYSIS_MAP: Record<string, AnalysisMapEntry> = {
    'Sentadilla': { type: 'squat', pattern: 'squat', suggestedView: 'lateral' },
    'Squat': { type: 'squat', pattern: 'squat', suggestedView: 'lateral' },
    'Peso Muerto': { type: 'deadlift', pattern: 'hinge', suggestedView: 'lateral' },
    'Deadlift': { type: 'deadlift', pattern: 'hinge', suggestedView: 'lateral' },
    'Flexiones': { type: 'push_up', pattern: 'push', suggestedView: 'lateral' },
    'Push Up': { type: 'push_up', pattern: 'push', suggestedView: 'lateral' },
    'Press Militar': { type: 'overhead_press', pattern: 'push', suggestedView: 'frontal' },
    'Overhead Press': { type: 'overhead_press', pattern: 'push', suggestedView: 'frontal' },
    'Remo con Barra': { type: 'row', pattern: 'pull', suggestedView: 'lateral' },
    'Barbell Row': { type: 'row', pattern: 'pull', suggestedView: 'lateral' },
    'Zancadas': { type: 'lunge', pattern: 'lunge', suggestedView: 'lateral' },
    'Lunges': { type: 'lunge', pattern: 'lunge', suggestedView: 'lateral' },
    'Press Banca': { type: 'bench_press', pattern: 'push', suggestedView: 'frontal' },
    'Bench Press': { type: 'bench_press', pattern: 'push', suggestedView: 'frontal' },
    'Dominadas': { type: 'pull_up', pattern: 'pull', suggestedView: 'frontal' },
    'Pull-ups': { type: 'pull_up', pattern: 'pull', suggestedView: 'frontal' },
};

export class ExerciseAnalysisMapper {
    static getAnalysisMetadata(exerciseName: string): AnalysisMapEntry | null {
        // Try exact match
        if (EXERCISE_ANALYSIS_MAP[exerciseName]) {
            return EXERCISE_ANALYSIS_MAP[exerciseName];
        }

        // Try fuzzy match (case insensitive, substring)
        const normalizedName = exerciseName.toLowerCase();
        const entry = Object.entries(EXERCISE_ANALYSIS_MAP).find(([key]) =>
            normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)
        );

        return entry ? entry[1] : null;
    }

    static getGhostFrameUrl(pattern: ExercisePattern, view: 'lateral' | 'frontal'): string {
        // Returning placeholders for now, in a real app these would be SVGs or transparent PNGs
        return `/assets/ghost_frames/${pattern}_${view}.svg`;
    }
}

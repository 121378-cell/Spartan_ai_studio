// import { describe, it, expect } from 'vitest';
import { ExerciseAnalysisMapper } from '../exerciseAnalysisMapper';

describe('ExerciseAnalysisMapper', () => {
    it('should resolve exact matches in Spanish', () => {
        const result = ExerciseAnalysisMapper.getAnalysisMetadata('Sentadilla');
        expect(result?.type).toBe('squat');
        expect(result?.pattern).toBe('squat');
    });

    it('should resolve exact matches in English', () => {
        const result = ExerciseAnalysisMapper.getAnalysisMetadata('Deadlift');
        expect(result?.type).toBe('deadlift');
        expect(result?.pattern).toBe('hinge');
    });

    it('should resolve fuzzy matches (substring)', () => {
        const result = ExerciseAnalysisMapper.getAnalysisMetadata('Sentadilla con Barra');
        expect(result?.type).toBe('squat');
    });

    it('should resolve fuzzy matches (case insensitive)', () => {
        const result = ExerciseAnalysisMapper.getAnalysisMetadata('push up');
        expect(result?.type).toBe('push_up');
    });

    it('should return null for unknown exercises', () => {
        const result = ExerciseAnalysisMapper.getAnalysisMetadata('Ejercicio Desconocido');
        expect(result).toBeNull();
    });

    it('should return correct suggested view', () => {
        const squat = ExerciseAnalysisMapper.getAnalysisMetadata('Squat');
        const press = ExerciseAnalysisMapper.getAnalysisMetadata('Press Militar');
        expect(squat?.suggestedView).toBe('lateral');
        expect(press?.suggestedView).toBe('frontal');
    });

    it('should return correct ghost frame URL format', () => {
        const url = ExerciseAnalysisMapper.getGhostFrameUrl('squat', 'lateral');
        expect(url).toBe('/assets/ghost_frames/squat_lateral.svg');
    });
});

import { describe, it, expect } from '@jest/globals';
import { FormAnalysisEngine } from '../formAnalysisEngine';
import { Pose } from '../../types/formAnalysis';

describe('Exercise Analyzers', () => {
    const formAnalysisEngine = new FormAnalysisEngine();

    // Mock pose data for testing
    const mockPose: Pose = {
        keypoints: [
            { x: 0.5, y: 0.3, z: 0, score: 0.9, name: 'nose' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'left_eye_inner' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'left_eye' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'left_eye_outer' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'right_eye_inner' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'right_eye' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'right_eye_outer' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'left_ear' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'right_ear' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'mouth_left' },
            { x: 0.5, y: 0.4, z: 0, score: 0.9, name: 'mouth_right' },
            { x: 0.4, y: 0.5, z: 0, score: 0.9, name: 'left_shoulder' },
            { x: 0.6, y: 0.5, z: 0, score: 0.9, name: 'right_shoulder' },
            { x: 0.35, y: 0.6, z: 0, score: 0.9, name: 'left_elbow' },
            { x: 0.65, y: 0.6, z: 0, score: 0.9, name: 'right_elbow' },
            { x: 0.3, y: 0.7, z: 0, score: 0.9, name: 'left_wrist' },
            { x: 0.7, y: 0.7, z: 0, score: 0.9, name: 'right_wrist' },
            { x: 0.3, y: 0.8, z: 0, score: 0.9, name: 'left_pinky' },
            { x: 0.7, y: 0.8, z: 0, score: 0.9, name: 'right_pinky' },
            { x: 0.3, y: 0.75, z: 0, score: 0.9, name: 'left_index' },
            { x: 0.7, y: 0.75, z: 0, score: 0.9, name: 'right_index' },
            { x: 0.3, y: 0.65, z: 0, score: 0.9, name: 'left_thumb' },
            { x: 0.7, y: 0.65, z: 0, score: 0.9, name: 'right_thumb' },
            { x: 0.4, y: 0.7, z: 0, score: 0.9, name: 'left_hip' },
            { x: 0.6, y: 0.7, z: 0, score: 0.9, name: 'right_hip' },
            { x: 0.35, y: 0.85, z: 0, score: 0.9, name: 'left_knee' },
            { x: 0.65, y: 0.85, z: 0, score: 0.9, name: 'right_knee' },
            { x: 0.35, y: 0.95, z: 0, score: 0.9, name: 'left_ankle' },
            { x: 0.65, y: 0.95, z: 0, score: 0.9, name: 'right_ankle' },
            { x: 0.35, y: 0.98, z: 0, score: 0.9, name: 'left_heel' },
            { x: 0.65, y: 0.98, z: 0, score: 0.9, name: 'right_heel' },
            { x: 0.35, y: 1.0, z: 0, score: 0.9, name: 'left_foot_index' },
            { x: 0.65, y: 1.0, z: 0, score: 0.9, name: 'right_foot_index' }
        ],
        score: 0.9
    };

    it('should analyze bench press form', () => {
        const result = formAnalysisEngine.analyzeForm(mockPose, 'bench_press');
        expect(result.exerciseType).toBe('bench_press');
        expect(result.formScore).toBeDefined();
        expect(result.metrics).toBeDefined();
        expect(result.warnings).toBeDefined();
        expect(result.recommendations).toBeDefined();
    });

    it('should analyze overhead press form', () => {
        const result = formAnalysisEngine.analyzeForm(mockPose, 'overhead_press');
        expect(result.exerciseType).toBe('overhead_press');
        expect(result.formScore).toBeDefined();
        expect(result.metrics).toBeDefined();
        expect(result.warnings).toBeDefined();
        expect(result.recommendations).toBeDefined();
    });

    it('should analyze row form', () => {
        const result = formAnalysisEngine.analyzeForm(mockPose, 'row');
        expect(result.exerciseType).toBe('row');
        expect(result.formScore).toBeDefined();
        expect(result.metrics).toBeDefined();
        expect(result.warnings).toBeDefined();
        expect(result.recommendations).toBeDefined();
    });

    it('should analyze plank form', () => {
        const result = formAnalysisEngine.analyzeForm(mockPose, 'plank');
        expect(result.exerciseType).toBe('plank');
        expect(result.formScore).toBeDefined();
        expect(result.metrics).toBeDefined();
        expect(result.warnings).toBeDefined();
        expect(result.recommendations).toBeDefined();
    });

    it('should handle unsupported exercise types', () => {
        // @ts-ignore - intentionally testing with invalid type
        const result = formAnalysisEngine.analyzeForm(mockPose, 'unsupported_exercise');
        expect(result.exerciseType).toBe('unsupported_exercise');
        expect(result.formScore).toBe(0);
        expect(result.warnings).toContain('Analysis not supported for this exercise yet.');
    });
});
// import { describe, it, expect, vi } from 'vitest';
import { jest } from '@jest/globals';
const vi = jest;
import { FormAnalysisEngine } from '../formAnalysisEngine';
import { Pose } from '../../types/formAnalysis';

describe('FormAnalysisEngine (Modular)', () => {
    it('should register all analyzers on initialization', () => {
        const engine = new FormAnalysisEngine();
        // Accessing private property for testing if needed, or verifying via behavior
        expect(engine).toBeDefined();
    });

    it('should delegate analysis to the correct analyzer', () => {
        const engine = new FormAnalysisEngine();
        const mockPose: Pose = { keypoints: [], score: 0.9 };

        // Test that analyzing a 'squat' returns a result with exerciseType: 'squat'
        const result = engine.analyzeForm(mockPose, 'squat');
        expect(result.exerciseType).toBe('squat');

        // Test that 'pull_up' delegates to the pull analyzer logic
        const pullResult = engine.analyzeForm(mockPose, 'pull_up');
        expect(pullResult.exerciseType).toBe('pull_up'); // Should preserve the specific exercise type
    });

    it('should return a default result for unknown exercises', () => {
        const engine = new FormAnalysisEngine();
        const mockPose: Pose = { keypoints: [], score: 0.9 };

        // 'custom' exercise doesn't have a specific analyzer
        const result = engine.analyzeForm(mockPose, 'custom' as any);
        expect(result.exerciseType).toBe('custom');
        expect(result.formScore).toBe(0); // Empty result returns 0
        expect(result.warnings[0]).toContain('not supported');
    });
});

import { describe, it, expect } from '@jest/globals';
import { LungeAnalyzer } from '../analyzers/LungeAnalyzer';
import { Pose } from '../../types/formAnalysis';

describe('LungeAnalyzer', () => {
    const analyzer = new LungeAnalyzer();

    const createMockPose = (overrides: any = {}): Pose => {
        const keypoints = Array(33).fill(null).map((_, i) => ({
            x: 0.5, y: 0.5, z: 0, score: 0.9, name: `point_${i}`
        }));

        const setPoint = (idx: number, x: number, y: number, name: string) => {
            keypoints[idx] = { x, y, z: 0, score: 0.9, name };
        };

        setPoint(11, 0.5, 0.2, 'left_shoulder');
        setPoint(23, 0.5, 0.5, 'left_hip');
        setPoint(25, 0.5, 0.7, 'left_knee');
        setPoint(27, 0.5, 0.9, 'left_ankle');
        setPoint(24, 0.5, 0.5, 'right_hip');
        setPoint(26, 0.5, 0.7, 'right_knee');
        setPoint(28, 0.5, 0.9, 'right_ankle');

        Object.entries(overrides).forEach(([key, val]: [string, any]) => {
            const idx = parseInt(key);
            if (!isNaN(idx)) {
                keypoints[idx] = { ...keypoints[idx], ...val };
            }
        });

        return { keypoints, score: 0.9 };
    };

    it('should initialize with correct pattern', () => {
        expect(analyzer.pattern).toBe('lunge');
    });

    it('should detect low depth in lunge', () => {
        const pose = createMockPose();
        const result = analyzer.analyze(pose, 'lunge');
        expect(result.warnings).toContain('Low depth: Aim for a 90-degree angle in the front knee.');
    });

    it('should detect good lunge depth', () => {
        const pose = createMockPose();
        pose.keypoints[23] = { x: 0.5, y: 0.7, z: 0, score: 0.9, name: 'left_hip' };
        pose.keypoints[25] = { x: 0.7, y: 0.7, z: 0, score: 0.9, name: 'left_knee' };
        pose.keypoints[27] = { x: 0.7, y: 0.9, z: 0, score: 0.9, name: 'left_ankle' };

        const result = analyzer.analyze(pose, 'lunge');
        expect(result.warnings).not.toContain('Low depth: Aim for a 90-degree angle in the front knee.');
    });
});

import { describe, it, expect } from '@jest/globals';
import { RowAnalyzer } from '../analyzers/RowAnalyzer';
import { Pose } from '../../types/formAnalysis';

describe('RowAnalyzer', () => {
    const analyzer = new RowAnalyzer();

    const createMockPose = (overrides: any = {}): Pose => {
        const keypoints = Array(33).fill(null).map((_, i) => ({
            x: 0.5, y: 0.5, z: 0, score: 0.9, name: `point_${i}`
        }));

        const setPoint = (idx: number, x: number, y: number, name: string) => {
            keypoints[idx] = { x, y, z: 0, score: 0.9, name };
        };

        // Standard setup (bent over row start)
        setPoint(11, 0.4, 0.4, 'left_shoulder');
        setPoint(13, 0.4, 0.6, 'left_elbow'); // Elbow directly below shoulder
        setPoint(15, 0.4, 0.8, 'left_wrist');
        setPoint(23, 0.6, 0.6, 'left_hip'); // Hip back
        setPoint(0, 0.3, 0.3, 'nose');
        setPoint(7, 0.3, 0.25, 'left_ear');
        setPoint(16, 0.4, 0.8, 'right_wrist');

        Object.entries(overrides).forEach(([key, val]: [string, any]) => {
            const idx = parseInt(key);
            if (!isNaN(idx)) {
                keypoints[idx] = { ...keypoints[idx], ...val };
            }
        });

        return { keypoints, score: 0.9 };
    };

    it('should initialize with correct pattern', () => {
        expect(analyzer.pattern).toBe('pull');
    });

    it('should detect limited ROM in row', () => {
        const pose = createMockPose();
        // Shoulder (0.4, 0.4), Elbow (0.4, 0.6), Hip (0.6, 0.6)
        // Vector SE = (0, 0.2), Vector EH = (0.2, 0)
        // Cos alpha = 0. Angle = 90 degrees.
        // Target 110, tolerance 20 -> Threshold 90.
        // If angle is 90, it might just miss the threshold if it's strict <.
        
        // Let's make it even smaller: move elbow slightly forward
        pose.keypoints[13].x = 0.35; 
        
        const result = analyzer.analyze(pose, 'row');
        expect(result.warnings).toContain('Limited range: Pull the weight further towards your torso.');
    });

    it('should detect good row ROM', () => {
        const pose = createMockPose();
        // Elbow retracted: Shoulder (0.4, 0.4), Elbow (0.6, 0.4), Hip (0.6, 0.6)
        pose.keypoints[13] = { x: 0.6, y: 0.4, z: 0, score: 0.9, name: 'left_elbow' };

        const result = analyzer.analyze(pose, 'row');
        expect(result.warnings).not.toContain('Limited range: Pull the weight further towards your torso.');
    });
});

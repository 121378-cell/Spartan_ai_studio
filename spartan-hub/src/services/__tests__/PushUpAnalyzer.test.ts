import { describe, it, expect } from '@jest/globals';
import { PushUpAnalyzer } from '../analyzers/PushUpAnalyzer';
import { Pose } from '../../types/formAnalysis';

describe('PushUpAnalyzer', () => {
    const analyzer = new PushUpAnalyzer();

    const createMockPose = (overrides: any = {}): Pose => {
        const keypoints = Array(33).fill(null).map((_, i) => ({
            x: 0.5, y: 0.5, z: 0, score: 0.9, name: `point_${i}`
        }));

        const setPoint = (idx: number, x: number, y: number) => {
            keypoints[idx] = { x, y, z: 0, score: 0.9, name: `point_${idx}` };
        };

        // Standard setup (plank position/top of push-up)
        setPoint(11, 0.3, 0.5); // Left Shoulder
        setPoint(13, 0.3, 0.65); // Left Elbow
        setPoint(15, 0.3, 0.8); // Left Wrist
        setPoint(23, 0.6, 0.5); // Left Hip
        setPoint(27, 0.9, 0.5); // Left Ankle

        // Apply overrides
        Object.entries(overrides).forEach(([key, val]: [string, any]) => {
            const idx = parseInt(key);
            if (!isNaN(idx)) {
                keypoints[idx] = { ...keypoints[idx], ...val };
            }
        });

        return { keypoints, score: 0.9 };
    };

    it('should initialize with correct pattern', () => {
        expect(analyzer.pattern).toBe('push');
    });

    it('should detect low depth in push-up', () => {
        const pose = createMockPose();
        // Shoulder far from wrist (top position)
        pose.keypoints[11].y = 0.4;
        pose.keypoints[15].y = 0.8;

        const result = analyzer.analyze(pose, 'push_up');
        expect(result.warnings).toContain('Low depth: Lower your chest closer to the floor.');
    });

    it('should detect hip sagging (lack of back straightness)', () => {
        const pose = createMockPose();
        // Hip lower than shoulder and ankle line
        pose.keypoints[11].y = 0.5;
        pose.keypoints[23].y = 0.7; // Hip sagging
        pose.keypoints[27].y = 0.5;

        const result = analyzer.analyze(pose, 'push_up');
        expect(result.warnings).toContain('Hips sagging or hiking: Keep your core tight.');
    });
});

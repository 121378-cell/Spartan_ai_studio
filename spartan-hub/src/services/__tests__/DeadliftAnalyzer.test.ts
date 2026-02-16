import { describe, it, expect } from '@jest/globals';
import { DeadliftAnalyzer } from '../analyzers/DeadliftAnalyzer';
import { Pose } from '../../types/formAnalysis';

describe('DeadliftAnalyzer', () => {
    const analyzer = new DeadliftAnalyzer();

    const createMockPose = (overrides: any = {}): Pose => {
        const keypoints = Array(33).fill(null).map((_, i) => ({
            x: 0.5, y: 0.5, z: 0, score: 0.9, name: `point_${i}`
        }));

        const setPoint = (idx: number, x: number, y: number) => {
            keypoints[idx] = { x, y, z: 0, score: 0.9, name: `point_${idx}` };
        };

        // Standard setup (standing/start of deadlift)
        setPoint(11, 0.45, 0.3); // Left Shoulder
        setPoint(23, 0.45, 0.6); // Left Hip
        setPoint(25, 0.45, 0.8); // Left Knee
        setPoint(27, 0.45, 0.95); // Left Ankle
        setPoint(15, 0.45, 0.7); // Left Wrist (holding bar)

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
        expect(analyzer.pattern).toBe('hinge');
    });

    it('should detect rounded back in deadlift', () => {
        const pose = createMockPose();
        // Shoulder far forward relative to hip for a rounded back effect
        pose.keypoints[11].x = 0.55; 
        pose.keypoints[11].y = 0.4;

        const result = analyzer.analyze(pose, 'deadlift');
        expect((result.metrics as any).backStraightness).toBeLessThan(0.9);
        expect(result.warnings).toContain('Back rounding detected: engage lats and keep chest up.');
    });

    it('should detect lockout completion', () => {
        const pose = createMockPose();
        // Standing straight
        pose.keypoints[11] = { x: 0.45, y: 0.2, z: 0, score: 0.9 }; // Shoulder high
        pose.keypoints[23] = { x: 0.45, y: 0.5, z: 0, score: 0.9 }; // Hip
        pose.keypoints[25] = { x: 0.45, y: 0.75, z: 0, score: 0.9 }; // Knee
        pose.keypoints[27] = { x: 0.45, y: 0.95, z: 0, score: 0.9 }; // Ankle

        const result = analyzer.analyze(pose, 'deadlift');
        expect((result.metrics as any).lockoutComplete).toBe(true);
        expect(result.formScore).toBeGreaterThan(90);
    });
});

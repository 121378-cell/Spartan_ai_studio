import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern } from '../../types/formAnalysis';

export interface PullMetrics {
    [key: string]: any;
    elbowRetraction: number;
    backStraightness: number;
    shoulderStability: number;
    pullDepth: number;
}

export class PullAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'pull';

    constructor() {
        super('row'); // Default config for row
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (metrics.backStraightness < this.config.thresholds.backStraightness) {
            warnings.push(this.config.warnings.rounding);
        }
        if (metrics.pullDepth < 0.6) {
            warnings.push(this.config.warnings.limitedROM);
        }

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Engage your back muscles, not just arms', 'Squeeze shoulders at the peak']
                : ['Excellent row form', 'Great shoulder retraction']
        };
    }

    private calculateMetrics(pose: Pose): PullMetrics {
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftElbow = this.getKeypoint(pose, 'left_elbow');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');
        const leftHip = this.getKeypoint(pose, 'left_hip');

        // 1. Elbow Retraction (Angle between shoulder, elbow, and hip)
        const elbowRetraction = this.calculateAngle(leftShoulder, leftElbow, leftHip);

        // 2. Back Straightness (Shoulder-Hip alignment with vertical)
        const backStraightness = Math.max(0, 1.0 - Math.abs(this.calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 1.0 } as any) - 180) / 45);

        // 3. Shoulder Stability (Shoulder movement consistency - placeholder logic)
        const shoulderStability = 0.9;

        // 4. Pull Depth (Wrist vs Shoulder vertical distance)
        const pullDepth = Math.min(1.0, Math.max(0, (leftShoulder.y - leftWrist.y + 0.2) / 0.4));

        return {
            elbowRetraction,
            backStraightness,
            shoulderStability,
            pullDepth
        };
    }

    protected calculateGlobalScore(metrics: PullMetrics): number {
        let score = 100;
        if (metrics.backStraightness < 0.8) score -= 30;
        if (metrics.pullDepth < 0.7) score -= 20;
        if (metrics.elbowRetraction < 90) score -= 10;
        return Math.max(0, Math.round(score));
    }
}

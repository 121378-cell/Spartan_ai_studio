import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern, DeadliftMetrics } from '../../types/formAnalysis';

export class DeadliftAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'hinge';

    constructor() {
        super('deadlift');
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (metrics.backStraightness < this.config.thresholds.backStraightness) {
            warnings.push(this.config.warnings.rounding);
        }

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            angles: {
                hip: metrics.hipHinge,
                back: 180 - metrics.backStraightness * 45 // Approximation for visual display
            },
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Reduce weight slightly', 'Practice hip hinge with a dowel']
                : ['Solid technique', 'Keep the bar close']
        };
    }

    private calculateMetrics(pose: Pose): DeadliftMetrics {
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftKnee = this.getKeypoint(pose, 'left_knee');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');

        const hipHinge = this.calculateAngle(leftShoulder, leftHip, leftKnee);

        const backStraightness = Math.max(0, 1.0 - Math.abs(this.calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 1.0 } as any) - 180) / 45);

        const barPath = Math.abs(leftWrist.x - leftAnkle.x);

        const kneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const lockoutComplete = kneeAngle > 170 && hipHinge > 160;

        return {
            hipHinge: 180 - hipHinge,
            backStraightness,
            barPath,
            lockoutComplete
        };
    }

    protected calculateGlobalScore(metrics: DeadliftMetrics): number {
        let score = 100;
        if (metrics.backStraightness < 0.9) score -= (1 - metrics.backStraightness) * 40;
        if (metrics.barPath > 0.1) score -= 10;
        if (!metrics.lockoutComplete) score -= 5;
        return Math.max(0, Math.round(score));
    }
}

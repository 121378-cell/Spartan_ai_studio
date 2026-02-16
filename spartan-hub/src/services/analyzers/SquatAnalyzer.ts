import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern, SquatMetrics } from '../../types/formAnalysis';

export class SquatAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'squat';

    constructor() {
        super('squat');
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (!metrics.isParallel) {
            warnings.push(this.config.warnings.lowDepth);
        }
        if (metrics.kneeTracking < this.config.thresholds.valgusThreshold) {
            warnings.push(this.config.warnings.valgus);
        }

        // Calculate specific angles for AR visualization
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftKnee = this.getKeypoint(pose, 'left_knee');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');
        const kneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            angles: {
                knee: kneeAngle,
                back: metrics.backAngle
            },
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Focus on eccentric control', 'Widen stance slightly']
                : ['Maintain tempo', 'Great consistency']
        };
    }

    private calculateMetrics(pose: Pose): SquatMetrics {
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftKnee = this.getKeypoint(pose, 'left_knee');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');
        const rightHip = this.getKeypoint(pose, 'right_hip');
        const rightKnee = this.getKeypoint(pose, 'right_knee');
        const rightAnkle = this.getKeypoint(pose, 'right_ankle');
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftHeel = this.getKeypoint(pose, 'left_heel');

        const leftVerticalDiff = leftHip.y - leftKnee.y;
        const rightVerticalDiff = rightHip.y - rightKnee.y;
        const avgVerticalDiff = (leftVerticalDiff + rightVerticalDiff) / 2;

        const depth = Math.min(1.0, Math.max(0, (avgVerticalDiff + 0.05) / 0.1));
        const isParallel = avgVerticalDiff > this.config.thresholds.depthParallel;

        const leftKneeAlignment = Math.abs(leftKnee.x - (leftHip.x + leftAnkle.x) / 2);
        const rightKneeAlignment = Math.abs(rightKnee.x - (rightHip.x + rightAnkle.x) / 2);
        const kneeTracking = Math.max(0, 1.0 - (leftKneeAlignment + rightKneeAlignment) * 5);

        const backAngle = this.calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y - 1.0 } as any);

        return {
            depth,
            kneeTracking,
            backAngle,
            heelContact: leftHeel.y > leftAnkle.y - 0.02,
            isParallel
        };
    }

    protected calculateGlobalScore(metrics: SquatMetrics): number {
        let score = 100;
        if (!metrics.isParallel) score -= 15;
        if (metrics.kneeTracking < 0.8) score -= (1 - metrics.kneeTracking) * 20;
        if (!metrics.heelContact) score -= 10;
        return Math.max(0, Math.round(score));
    }
}

import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern } from '../../types/formAnalysis';

export interface PushUpMetrics {
    [key: string]: any;
    depth: number;
    backStraightness: number;
    elbowAngle: number;
    armExtension: number;
}

export class PushUpAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'push';

    constructor() {
        super('push_up');
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (metrics.depth < this.config.thresholds.depthLimit) {
            warnings.push(this.config.warnings.lowDepth);
        }
        if (metrics.backStraightness < this.config.thresholds.backStraightness) {
            warnings.push(this.config.warnings.rounding);
        }
        if (metrics.elbowAngle > this.config.targetAngles.elbowAngle.target + this.config.targetAngles.elbowAngle.tolerance) {
            warnings.push(this.config.warnings.flaring);
        }

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            angles: {
                elbow: metrics.elbowAngle,
                body: this.calculateAngle(this.getKeypoint(pose, 'left_shoulder'), this.getKeypoint(pose, 'left_hip'), this.getKeypoint(pose, 'left_ankle'))
            },
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Engage your glutes and core', 'Control the descent']
                : ['Excellent push-up form', 'Powerful extension']
        };
    }

    private calculateMetrics(pose: Pose): PushUpMetrics {
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftElbow = this.getKeypoint(pose, 'left_elbow');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');

        // 1. Elbow Angle (Flaring check)
        const elbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);

        // 2. Back Straightness (Shoulder-Hip-Ankle alignment)
        const backStraightness = Math.max(0, 1.0 - Math.abs(this.calculateAngle(leftShoulder, leftHip, leftAnkle) - 180) / 30);

        // 3. Depth (Shoulder vs Wrist vertical distance when at bottom)
        const verticalDiff = Math.abs(leftShoulder.y - leftWrist.y);
        const depth = Math.min(1.0, Math.max(0, 1.0 - (verticalDiff - 0.1) / 0.2));

        // 4. Arm Extension
        const armExtension = Math.min(1.0, this.calculateAngle(leftShoulder, leftElbow, leftWrist) / 160);

        return {
            depth,
            backStraightness,
            elbowAngle,
            armExtension
        };
    }

    protected calculateGlobalScore(metrics: PushUpMetrics): number {
        let score = 100;
        if (metrics.depth < 0.8) score -= 20;
        if (metrics.backStraightness < 0.85) score -= 25;
        if (metrics.elbowAngle > 80) score -= 15;
        return Math.max(0, Math.round(score));
    }
}

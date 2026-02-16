import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern } from '../../types/formAnalysis';

export interface LungeMetrics {
    [key: string]: any;
    frontKneeAngle: number;
    backKneeAngle: number;
    torsoAngle: number;
    stability: number;
}

export class LungeAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'lunge';

    constructor() {
        super('lunge');
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (metrics.frontKneeAngle > this.config.targetAngles.frontKnee.target + this.config.targetAngles.frontKnee.tolerance) {
            warnings.push(this.config.warnings.lowDepth);
        }
        if (metrics.torsoAngle < this.config.targetAngles.torso.target - this.config.targetAngles.torso.tolerance) {
            warnings.push(this.config.warnings.forwardLean);
        }

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            angles: {
                knee: metrics.frontKneeAngle,
                torso: metrics.torsoAngle
            },
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Take a larger step forward', 'Focus on vertical descent']
                : ['Solid lunge form', 'Good balance']
        };
    }

    private calculateMetrics(pose: Pose): LungeMetrics {
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftKnee = this.getKeypoint(pose, 'left_knee');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');

        const rightHip = this.getKeypoint(pose, 'right_hip');
        const rightKnee = this.getKeypoint(pose, 'right_knee');
        const rightAnkle = this.getKeypoint(pose, 'right_ankle');

        // 1. Front Knee Angle (Assuming left is front for sidebar view)
        const frontKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);

        // 2. Back Knee Angle
        const backKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);

        // 3. Torso Angle (Verticality)
        const torsoAngle = this.calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 1.0 } as any);

        // 4. Stability (Knee wobble - simplified)
        const stability = 0.85;

        return {
            frontKneeAngle,
            backKneeAngle,
            torsoAngle,
            stability
        };
    }

    protected calculateGlobalScore(metrics: LungeMetrics): number {
        let score = 100;
        if (metrics.frontKneeAngle > 100) score -= 20;
        if (metrics.torsoAngle < 75) score -= 15;
        if (metrics.backKneeAngle > 110) score -= 10;
        return Math.max(0, Math.round(score));
    }
}

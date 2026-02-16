import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern } from '../../types/formAnalysis';

export interface RowMetrics {
    [key: string]: any;
    elbowRetraction: number;
    backStraightness: number;
    shoulderBladeMovement: number;
    torsoAngle: number;
    gripWidth: number;
}

export class RowAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'pull';

    constructor() {
        super('row');
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (metrics.elbowRetraction < this.config.targetAngles.elbowRetraction.target - this.config.targetAngles.elbowRetraction.tolerance) {
            warnings.push(this.config.warnings.limitedROM);
        }
        if (metrics.backStraightness < this.config.thresholds.backStraightness) {
            warnings.push(this.config.warnings.rounding);
        }

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            angles: {
                elbow: metrics.elbowRetraction,
                back: 180 - metrics.backStraightness * 45
            },
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Focus on pulling with your back', 'Squeeze your shoulder blades', 'Maintain neutral spine']
                : ['Excellent row form', 'Great scapular retraction achieved']
        };
    }

    private calculateMetrics(pose: Pose): RowMetrics {
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftElbow = this.getKeypoint(pose, 'left_elbow');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const nose = this.getKeypoint(pose, 'nose');
        const leftEar = this.getKeypoint(pose, 'left_ear');

        // 1. Elbow Retraction (Pull motion)
        const elbowRetraction = this.calculateAngle(leftShoulder, leftElbow, leftHip);

        // 2. Back Straightness (Spine alignment)
        const backStraightness = Math.max(0, 1.0 - Math.abs(this.calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 1 } as any) - 180) / 45);

        // 3. Shoulder Blade Movement (Scapular retraction)
        const shoulderBladeMovement = Math.min(1.0, Math.max(0, (leftElbow.x - leftShoulder.x + 0.3) / 0.6));

        // 4. Torso Angle (Hinge position)
        const torsoAngle = Math.abs(this.calculateAngle(nose, leftEar, leftShoulder) - 90) / 90;

        // 5. Grip Width (Distance between wrists - simplified)
        const rightWrist = this.getKeypoint(pose, 'right_wrist');
        const gripWidth = Math.min(1.0, Math.max(0, Math.abs(rightWrist.x - leftWrist.x) / 0.4));

        return {
            elbowRetraction,
            backStraightness,
            shoulderBladeMovement,
            torsoAngle,
            gripWidth
        };
    }

    protected calculateGlobalScore(metrics: RowMetrics): number {
        let score = 100;
        if (metrics.elbowRetraction < 80) score -= 20;
        if (metrics.backStraightness < 0.8) score -= 25;
        if (metrics.shoulderBladeMovement < 0.7) score -= 20;
        if (metrics.torsoAngle < 0.3) score -= 15;
        if (metrics.gripWidth < 0.6) score -= 10;
        return Math.max(0, Math.round(score));
    }
}
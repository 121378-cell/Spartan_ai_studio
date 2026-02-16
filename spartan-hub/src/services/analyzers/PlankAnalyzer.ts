import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern } from '../../types/formAnalysis';

export interface PlankMetrics {
    [key: string]: any;
    bodyAlignment: number;
    coreEngagement: number;
    hipPosition: number;
    shoulderStability: number;
    durationQuality: number;
}

export class PlankAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'core';

    constructor() {
        super('plank');
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (metrics.bodyAlignment < 0.8) {
            warnings.push('Body misalignment: Keep your body in a straight line from head to heels.');
        }
        if (metrics.hipPosition < 0.8) {
            warnings.push('Improper hip position: Keep hips neither too high nor too low.');
        }
        if (metrics.shoulderStability < 0.7) {
            warnings.push('Shoulder instability: Keep shoulders engaged and stable.');
        }

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Engage your core', 'Squeeze your glutes', 'Keep your neck neutral']
                : ['Excellent plank form', 'Perfect body alignment maintained']
        };
    }

    private calculateMetrics(pose: Pose): PlankMetrics {
        const nose = this.getKeypoint(pose, 'nose');
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftKnee = this.getKeypoint(pose, 'left_knee');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');

        // 1. Body Alignment (Head-Shoulder-Hip-Knee-Ankle alignment)
        const headShoulderHipAngle = this.calculateAngle(nose, leftShoulder, leftHip);
        const shoulderHipKneeAngle = this.calculateAngle(leftShoulder, leftHip, leftKnee);
        const hipKneeAnkleAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        
        const bodyAlignment = Math.max(0, 1.0 - Math.abs(headShoulderHipAngle - 180) / 180) *
                             Math.max(0, 1.0 - Math.abs(shoulderHipKneeAngle - 180) / 180) *
                             Math.max(0, 1.0 - Math.abs(hipKneeAnkleAngle - 180) / 180);

        // 2. Hip Position (Correct height relative to shoulders and ankles)
        const hipHeight = Math.abs(leftHip.y - leftShoulder.y);
        const hipPosition = Math.max(0, 1.0 - Math.abs(hipHeight - 0.3) / 0.2); // Assuming ideal hip height around 0.3 units from shoulders

        // 3. Shoulder Stability (Shoulder position relative to wrists)
        const shoulderWristDistance = Math.sqrt(
            Math.pow(leftShoulder.x - leftWrist.x, 2) +
            Math.pow(leftShoulder.y - leftWrist.y, 2)
        );
        const shoulderStability = Math.max(0, 1.0 - shoulderWristDistance / 0.3);

        // 4. Core Engagement (Proxy based on body alignment)
        const coreEngagement = bodyAlignment;

        // 5. Duration Quality (Placeholder - would typically come from timing)
        const durationQuality = 0.9;

        return {
            bodyAlignment,
            coreEngagement,
            hipPosition,
            shoulderStability,
            durationQuality
        };
    }

    protected calculateGlobalScore(metrics: PlankMetrics): number {
        let score = 100;
        if (metrics.bodyAlignment < 0.8) score -= 30;
        if (metrics.hipPosition < 0.8) score -= 25;
        if (metrics.shoulderStability < 0.7) score -= 20;
        return Math.max(0, Math.round(score));
    }
}
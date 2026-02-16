import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern } from '../../types/formAnalysis';

export interface OverheadPressMetrics {
    [key: string]: any;
    overheadPosition: number;
    backStraightness: number;
    coreEngagement: number;
    barPath: number;
    kneeDrive: number;
}

export class OverheadPressAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'push';

    constructor() {
        super('overhead_press');
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (metrics.overheadPosition < 0.8) {
            warnings.push('Incomplete lockout: Fully extend arms overhead.');
        }
        if (metrics.backStraightness < 0.8) {
            warnings.push('Excessive arch: Maintain neutral spine, avoid excessive lumbar extension.');
        }
        if (metrics.coreEngagement < 0.7) {
            warnings.push('Weak core engagement: Brace your core throughout the movement.');
        }
        if (metrics.barPath > 0.15) {
            warnings.push('Bar path deviation: Keep the bar moving in a straight vertical line.');
        }
        if (metrics.kneeDrive > 0.3) {
            warnings.push('Forward knee drive: Keep knees stable, avoid driving forward.');
        }

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Engage your core', 'Press the bar in a straight line overhead', 'Maintain neutral spine']
                : ['Excellent overhead press form', 'Proper overhead lockout achieved']
        };
    }

    private calculateMetrics(pose: Pose): OverheadPressMetrics {
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftElbow = this.getKeypoint(pose, 'left_elbow');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');
        const rightAnkle = this.getKeypoint(pose, 'right_ankle');

        // 1. Overhead Position (Arm extension angle)
        const overheadPosition = Math.min(1.0, this.calculateAngle(leftShoulder, leftElbow, leftWrist) / 180);

        // 2. Back Straightness (Spine alignment)
        const backStraightness = Math.max(0, 1.0 - Math.abs(this.calculateAngle(leftShoulder, leftHip, leftAnkle) - 180) / 30);

        // 3. Core Engagement (Hip-shoulder alignment)
        const coreEngagement = Math.max(0, 1.0 - Math.abs(this.calculateAngle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 1 } as any) - 180) / 20);

        // 4. Bar Path (Wrist position relative to shoulder - deviation from vertical)
        const barPath = Math.min(1.0, Math.abs(leftWrist.x - leftShoulder.x) / 0.2);

        // 5. Knee Drive (Ankle position stability - simplified)
        const kneeDrive = Math.min(1.0, Math.abs(leftAnkle.x - rightAnkle.x) / 0.8); // Measure stability between feet

        return {
            overheadPosition,
            backStraightness,
            coreEngagement,
            barPath,
            kneeDrive
        };
    }

    protected calculateGlobalScore(metrics: OverheadPressMetrics): number {
        let score = 100;
        if (metrics.overheadPosition < 0.8) score -= 15;
        if (metrics.backStraightness < 0.8) score -= 25;
        if (metrics.coreEngagement < 0.7) score -= 20;
        if (metrics.barPath > 0.15) score -= 15;
        if (metrics.kneeDrive > 0.3) score -= 10;
        return Math.max(0, Math.round(score));
    }
}
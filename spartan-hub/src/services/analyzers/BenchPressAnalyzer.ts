import { BaseAnalyzer } from './BaseAnalyzer';
import { Pose, FormAnalysisResult, ExerciseType, ExercisePattern } from '../../types/formAnalysis';

export interface BenchPressMetrics {
    [key: string]: any;
    depth: number;
    backStraightness: number;
    elbowAngle: number;
    barPath: number;
    footPlacement: number;
}

export class BenchPressAnalyzer extends BaseAnalyzer {
    pattern: ExercisePattern = 'push';

    constructor() {
        super('bench_press');
    }

    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const metrics = this.calculateMetrics(pose);
        const warnings: string[] = [];

        if (metrics.depth < 0.7) {
            warnings.push('Low depth: Lower the bar to touch your chest.');
        }
        if (metrics.backStraightness < 0.85) {
            warnings.push('Arched back: Maintain a slight arch, avoid excessive hyperextension.');
        }
        if (metrics.elbowAngle > 50 && metrics.elbowAngle < 130) {
            warnings.push('Elbow flare: Keep elbows at approximately 45-degree angle.');
        }
        if (metrics.barPath > 0.1) {
            warnings.push('Bar path deviation: Keep the bar moving in a straight vertical line.');
        }
        if (metrics.footPlacement < 0.7) {
            warnings.push('Foot placement: Keep feet firmly planted on the ground.');
        }

        return {
            exerciseType: type,
            pattern: this.pattern,
            formScore: this.calculateGlobalScore(metrics),
            metrics,
            warnings,
            recommendations: warnings.length > 0
                ? ['Keep your core tight', 'Maintain proper shoulder blade retraction', 'Control the eccentric phase']
                : ['Excellent bench press form', 'Proper bar path and depth achieved']
        };
    }

    private calculateMetrics(pose: Pose): BenchPressMetrics {
        const leftShoulder = this.getKeypoint(pose, 'left_shoulder');
        const leftElbow = this.getKeypoint(pose, 'left_elbow');
        const leftWrist = this.getKeypoint(pose, 'left_wrist');
        const leftHip = this.getKeypoint(pose, 'left_hip');
        const leftAnkle = this.getKeypoint(pose, 'left_ankle');
        const rightShoulder = this.getKeypoint(pose, 'right_shoulder');
        const rightHip = this.getKeypoint(pose, 'right_hip');

        // 1. Elbow Angle (Flare check)
        const elbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);

        // 2. Back Straightness (Shoulder-Hip alignment)
        const backStraightness = Math.max(0, 1.0 - Math.abs(this.calculateAngle(leftShoulder, leftHip, leftAnkle) - 180) / 30);

        // 3. Depth (Distance from shoulder to wrist vertically when at bottom)
        const verticalDiff = Math.abs(leftShoulder.y - leftWrist.y);
        const depth = Math.min(1.0, Math.max(0, 1.0 - (verticalDiff - 0.05) / 0.15));

        // 4. Bar Path (Deviation from vertical line - simplified)
        const barPath = Math.min(1.0, Math.abs(leftWrist.x - leftShoulder.x) / 0.3);

        // 5. Foot Placement (Distance between hip and ankle - simplified)
        const hipAnkleDistance = Math.sqrt(
            Math.pow(rightHip.x - leftAnkle.x, 2) + 
            Math.pow(rightHip.y - leftAnkle.y, 2)
        );
        const footPlacement = Math.min(1.0, Math.max(0, 1.0 - Math.abs(hipAnkleDistance - 0.5) / 0.3));

        return {
            depth,
            backStraightness,
            elbowAngle,
            barPath,
            footPlacement
        };
    }

    protected calculateGlobalScore(metrics: BenchPressMetrics): number {
        let score = 100;
        if (metrics.depth < 0.7) score -= 15;
        if (metrics.backStraightness < 0.85) score -= 20;
        if (metrics.elbowAngle > 50 && metrics.elbowAngle < 130) score -= 25;
        if (metrics.barPath > 0.1) score -= 10;
        if (metrics.footPlacement < 0.7) score -= 10;
        return Math.max(0, Math.round(score));
    }
}
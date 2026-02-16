import { Pose, Keypoint, FormAnalysisResult, ExerciseType, ExercisePattern } from '../../types/formAnalysis';
import { EXERCISE_ANALYSIS_CONFIG, AnalyserConfig } from '../../config/exerciseAnalysisConfig';

export abstract class BaseAnalyzer {
    abstract pattern: ExercisePattern;
    protected config: AnalyserConfig;

    constructor(type: ExerciseType) {
        this.config = EXERCISE_ANALYSIS_CONFIG[type] || {
            targetAngles: {},
            thresholds: {},
            warnings: {}
        };
    }

    protected calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint): number {
        const ab = { x: a.x - b.x, y: a.y - b.y };
        const bc = { x: c.x - b.x, y: c.y - b.y };

        const dotProduct = ab.x * bc.x + ab.y * bc.y;
        const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
        const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

        if (magAB === 0 || magBC === 0) return 0;

        const cosAlpha = dotProduct / (magAB * magBC);
        // Clamp for stability
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
        return (angle * 180) / Math.PI;
    }

    protected getKeypoint(pose: Pose, name: string): Keypoint {
        const kp = pose.keypoints.find(k => k.name === name);
        if (!kp) {
            // Fallback to index-based if name search fails (legacy or different tracker)
            return this.getFallbackKeypoint(pose, name);
        }
        return kp;
    }

    private getFallbackKeypoint(pose: Pose, name: string): Keypoint {
        const mapping: Record<string, number> = {
            'nose': 0, 'left_shoulder': 11, 'right_shoulder': 12,
            'left_hip': 23, 'right_hip': 24, 'left_knee': 25,
            'right_knee': 26, 'left_ankle': 27, 'right_ankle': 28,
            'left_heel': 29, 'right_heel': 30, 'left_wrist': 15, 'right_wrist': 16
        };
        const idx = mapping[name];
        return pose.keypoints[idx] || { x: 0, y: 0, z: 0, score: 0, name };
    }

    abstract analyze(pose: Pose, type: ExerciseType): FormAnalysisResult;

    protected calculateGlobalScore(metrics: any): number {
        // Base scoring logic, can be overridden
        return 85;
    }
}

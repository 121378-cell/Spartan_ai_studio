import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Pose, FormAnalysisResult, ExerciseType, Keypoint, ExerciseAnalyzer } from '../types/formAnalysis';
import { logger } from '../utils/logger';
import { SquatAnalyzer } from './analyzers/SquatAnalyzer';
import { DeadliftAnalyzer } from './analyzers/DeadliftAnalyzer';
import { PushUpAnalyzer } from './analyzers/PushUpAnalyzer';
import { PullAnalyzer } from './analyzers/PullAnalyzer';
import { LungeAnalyzer } from './analyzers/LungeAnalyzer';
import { BenchPressAnalyzer } from './analyzers/BenchPressAnalyzer';
import { OverheadPressAnalyzer } from './analyzers/OverheadPressAnalyzer';
import { RowAnalyzer } from './analyzers/RowAnalyzer';
import { PlankAnalyzer } from './analyzers/PlankAnalyzer';

export class FormAnalysisEngine {
    private poseLandmarker: PoseLandmarker | null = null;
    private isInitializing = false;
    private analyzers: Map<ExerciseType, ExerciseAnalyzer> = new Map();

    constructor() {
        this.registerAnalyzers();
    }

    private registerAnalyzers() {
        const squat = new SquatAnalyzer();
        const deadlift = new DeadliftAnalyzer();
        const pushUp = new PushUpAnalyzer();
        const pull = new PullAnalyzer();
        const lunge = new LungeAnalyzer();
        const benchPress = new BenchPressAnalyzer();
        const overheadPress = new OverheadPressAnalyzer();
        const row = new RowAnalyzer();
        const plank = new PlankAnalyzer();

        this.analyzers.set('squat', squat);
        this.analyzers.set('deadlift', deadlift);
        this.analyzers.set('push_up', pushUp);
        this.analyzers.set('row', row);
        this.analyzers.set('lunge', lunge);
        this.analyzers.set('bench_press', benchPress);
        this.analyzers.set('overhead_press', overheadPress);
        this.analyzers.set('plank', plank);

        // Map patterns
        this.analyzers.set('pull_up', pull);
    }

    async initialize() {
        if (this.poseLandmarker || this.isInitializing) return;
        this.isInitializing = true;

        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            
            try {
                // Try GPU first
                this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1
                });
                logger.info('FormAnalysisEngine: MediaPipe PoseLandmarker initialized (GPU)');
            } catch (gpuError) {
                logger.warn('FormAnalysisEngine: GPU initialization failed, falling back to CPU', { metadata: { error: gpuError } });
                // Fallback to CPU
                this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                        delegate: "CPU"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1
                });
                logger.info('FormAnalysisEngine: MediaPipe PoseLandmarker initialized (CPU)');
            }
        } catch (error) {
            logger.error('FormAnalysisEngine initialization failed', {
                context: 'form-analysis',
                metadata: { error: error instanceof Error ? error.message : String(error) }
            });
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    detectPose(videoElement: HTMLVideoElement, timestamp: number): Pose | null {
        if (!this.poseLandmarker) return null;

        const result = this.poseLandmarker.detectForVideo(videoElement, timestamp);
        if (!result.landmarks || result.landmarks.length === 0) return null;

        // Convert MediaPipe landmarks to our internal Pose format
        const landmarks = result.landmarks[0];
        return {
            keypoints: landmarks.map((lm: any, idx: number) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                score: lm.visibility || 0,
                name: this.getLandmarkName(idx)
            })),
            score: 1.0 // MediaPipe doesn't give a global pose score in this API easily
        };
    }

    analyzeForm(pose: Pose, type: ExerciseType): FormAnalysisResult {
        const analyzer = this.analyzers.get(type);
        if (!analyzer) {
            logger.warn(`No analyzer registered for exercise type: ${type}`);
            return this.generateEmptyResult(type);
        }
        return analyzer.analyze(pose, type);
    }

    private generateEmptyResult(type: ExerciseType): FormAnalysisResult {
        return {
            exerciseType: type,
            formScore: 0,
            metrics: {},
            warnings: ['Analysis not supported for this exercise yet.'],
            recommendations: []
        };
    }

    private getLandmarkName(index: number): string {
        const names = [
            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner',
            'right_eye', 'right_eye_outer', 'left_ear', 'right_ear', 'mouth_left',
            'mouth_right', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index',
            'right_index', 'left_thumb', 'right_thumb', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'left_heel',
            'right_heel', 'left_foot_index', 'right_foot_index'
        ];
        return names[index] || `unknown_${index}`;
    }
}

export const formAnalysisEngine = new FormAnalysisEngine();

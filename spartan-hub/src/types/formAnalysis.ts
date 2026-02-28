export type ExerciseType = 'squat' | 'deadlift' | 'push_up' | 'overhead_press' | 'bench_press' | 'row' | 'pull_up' | 'lunge' | 'plank' | 'custom';
export type ExercisePattern = 'squat' | 'hinge' | 'push' | 'pull' | 'lunge' | 'core';

export interface Keypoint {
    x: number;
    y: number;
    z?: number;
    score: number;
    name?: string;
}

export interface Pose {
    keypoints: Keypoint[];
    score: number;
}

export interface SquatMetrics {
    depth: number; // 0-1, where 1 is full depth
    kneeTracking: number; // Score based on knee/toe alignment
    backAngle: number; // Angle in degrees
    heelContact: boolean;
    isParallel: boolean;
}

export interface DeadliftMetrics {
    hipHinge: number; // Angle in degrees
    backStraightness: number; // 0-1 score
    barPath: number; // Deviation from vertical line
    lockoutComplete: boolean;
}

export interface PushUpMetrics {
    depth: number;
    backStraightness: number;
    elbowAngle: number;
    armExtension: number;
}

export interface PlankMetrics {
    bodyAlignment: number;
    coreEngagement: number;
    hipPosition: number;
    shoulderStability: number;
    durationQuality: number;
}

export interface RowMetrics {
    elbowRetraction: number;
    backStraightness: number;
    shoulderBladeMovement: number;
    torsoAngle: number;
    gripWidth: number;
}

export interface BaseMetrics {
  [key: string]: number | boolean | string | undefined;
}

export interface FormAnalysisResult {
    exerciseType: ExerciseType;
    pattern?: ExercisePattern;
    formScore: number; // 0-100
    repCount?: number;
    angles?: Record<string, number>;
    metrics: SquatMetrics | DeadliftMetrics | PushUpMetrics | PlankMetrics | RowMetrics | BaseMetrics;
    warnings: string[];
    recommendations: string[];
}

export interface ExerciseAnalyzer {
    pattern: ExercisePattern;
    analyze(pose: Pose, type: ExerciseType): FormAnalysisResult;
}

export interface VideoCaptureState {
    isActive: boolean;
    isRecording: boolean;
    framesProcessed: number;
    fps: number;
    lastFrameTime: number;
    error: string | null;
}

import { Pose, ExerciseType } from '../types/formAnalysis';

export type RepState = 'neutral' | 'active' | 'complete';

export interface RepCounterState {
    count: number;
    currentState: RepState;
    progress: number; // 0-1 percentage of current rep
}

/**
 * Rep Counter Service
 * Analyzes pose sequences to detect and count exercise repetitions.
 */
export class RepCounterService {
    private count = 0;
    private state: 'up' | 'down' = 'up';
    private threshold = 0.15; // Relative threshold for movement detection
    private lastHipY = 0;
    
    // For smoothing
    private smoothingWindow: number[] = [];
    private windowSize = 5;

    /**
     * Process a new pose and update rep count
     * @returns current count and whether a rep was just completed
     */
    processPose(pose: Pose, exerciseType: ExerciseType): { count: number, justCompleted: boolean } {
        const hipY = this.getAverageHipY(pose);
        if (hipY === 0) return { count: this.count, justCompleted: false };

        const smoothedY = this.smooth(hipY);
        let justCompleted = false;

        switch (exerciseType) {
            case 'squat':
                justCompleted = this.detectSquatRep(smoothedY, pose);
                break;
            case 'deadlift':
                justCompleted = this.detectDeadliftRep(smoothedY, pose);
                break;
            case 'push_up':
                justCompleted = this.detectPushUpRep(smoothedY, pose);
                break;
        }

        return { count: this.count, justCompleted };
    }

    private detectSquatRep(hipY: number, pose: Pose): boolean {
        const kneeY = this.getAverageKneeY(pose);
        if (kneeY === 0) return false;

        // In Squat: Down is Y increasing (moving towards ground)
        // Threshold: Hip goes below 90% of knee height
        const bottomThreshold = kneeY - 0.05; 
        const topThreshold = kneeY - 0.2;

        if (this.state === 'up' && hipY > bottomThreshold) {
            this.state = 'down';
            return false;
        }

        if (this.state === 'down' && hipY < topThreshold) {
            this.state = 'up';
            this.count++;
            return true;
        }

        return false;
    }

    private detectDeadliftRep(hipY: number, pose: Pose): boolean {
        const shoulderY = this.getAverageShoulderY(pose);
        if (shoulderY === 0) return false;

        // In Deadlift: Up is Shoulder Y decreasing (moving away from ground)
        // Start: Shoulders low. Lockout: Shoulders high.
        // We use shoulder-hip distance or absolute shoulder height
        
        if (this.state === 'up' && shoulderY > 0.5) { // Arbitrary "bent over" threshold
            this.state = 'down';
            return false;
        }

        if (this.state === 'down' && shoulderY < 0.3) { // Arbitrary "standing" threshold
            this.state = 'up';
            this.count++;
            return true;
        }

        return false;
    }

    private detectPushUpRep(shoulderY: number, pose: Pose): boolean {
        // Simple Y-threshold for pushups
        if (this.state === 'up' && shoulderY > 0.7) {
            this.state = 'down';
            return false;
        }
        if (this.state === 'down' && shoulderY < 0.5) {
            this.state = 'up';
            this.count++;
            return true;
        }
        return false;
    }

    private getAverageHipY(pose: Pose): number {
        const left = pose.keypoints.find(k => k.name === 'left_hip');
        const right = pose.keypoints.find(k => k.name === 'right_hip');
        if (!left || !right) return 0;
        return (left.y + right.y) / 2;
    }

    private getAverageKneeY(pose: Pose): number {
        const left = pose.keypoints.find(k => k.name === 'left_knee');
        const right = pose.keypoints.find(k => k.name === 'right_knee');
        if (!left || !right) return 0;
        return (left.y + right.y) / 2;
    }

    private getAverageShoulderY(pose: Pose): number {
        const left = pose.keypoints.find(k => k.name === 'left_shoulder');
        const right = pose.keypoints.find(k => k.name === 'right_shoulder');
        if (!left || !right) return 0;
        return (left.y + right.y) / 2;
    }

    private smooth(value: number): number {
        this.smoothingWindow.push(value);
        if (this.smoothingWindow.length > this.windowSize) {
            this.smoothingWindow.shift();
        }
        return this.smoothingWindow.reduce((a, b) => a + b, 0) / this.smoothingWindow.length;
    }

    reset(): void {
        this.count = 0;
        this.state = 'up';
        this.smoothingWindow = [];
    }

    getCount(): number {
        return this.count;
    }
}

/**
 * Mock for @mediapipe/pose
 * 
 * Provides mock implementation for the legacy Pose class.
 */

export interface PoseOptions {
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  smoothSegmentation?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export interface PoseResult {
  poseLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
  poseWorldLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
  segmentationMask?: ImageData;
}

export class Pose {
  private options: PoseOptions = {};
  private resultsCallback: ((results: PoseResult) => void) | null = null;

  setOptions = jest.fn().mockImplementation((options: PoseOptions): void => {
    this.options = { ...this.options, ...options };
  });

  onResults = jest.fn().mockImplementation((callback: (results: PoseResult) => void): void => {
    this.resultsCallback = callback;
  });

  send = jest.fn().mockImplementation(async (input: HTMLVideoElement | HTMLCanvasElement | ImageData): Promise<void> => {
    // Simulate a pose detection result
    if (this.resultsCallback) {
      this.resultsCallback({
        poseLandmarks: Array.from({ length: 33 }, (_, i) => ({
          x: 0.5 + (Math.random() - 0.5) * 0.2,
          y: 0.3 + (i / 33) * 0.4,
          z: (Math.random() - 0.5) * 0.1,
          visibility: 0.8 + Math.random() * 0.2,
        })),
        poseWorldLandmarks: Array.from({ length: 33 }, (_, i) => ({
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.5,
          z: (Math.random() - 0.5) * 0.1,
          visibility: 0.8 + Math.random() * 0.2,
        })),
      });
    }
  });

  close = jest.fn();
  initialize = jest.fn().mockResolvedValue(undefined);
}

export default { Pose };

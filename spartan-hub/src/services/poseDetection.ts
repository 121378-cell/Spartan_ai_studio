/**
 * Pose Detection Service
 * 
 * Wrapper around MediaPipe Pose Landmarker for detecting body poses
 * from video frames. Handles model initialization, frame processing,
 * and real-time pose detection.
 * 
 * @module services/poseDetection
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { Landmark, PoseFrame, PoseDetectionState } from '../types/pose';

/**
 * Service for detecting body poses using MediaPipe
 * 
 * Usage:
 * ```typescript
 * const detector = new PoseDetectionService();
 * await detector.initialize();
 * const poses = await detector.detect(videoFrame);
 * ```
 */
export class PoseDetectionService {
  private poseLandmarker: PoseLandmarker | null = null;
  private state: PoseDetectionState = {
    isInitialized: false,
    isDetecting: false,
    currentFrame: null,
    fps: 0,
    error: null,
    framesProcessed: 0,
  };

  private frameTimestamps: number[] = [];
  private lastFpsUpdate: number = Date.now();

  /**
   * Initialize MediaPipe Pose Landmarker model
   * Must be called before detect() method
   * 
   * @throws Error if initialization fails
   */
  public async initialize(): Promise<void> {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_classifier/mobilenetv3_small/float32/1_metadata.tflite',
        },
        runningMode: 'VIDEO',
        numPoses: 1, // Single person tracking for fitness
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.state.isInitialized = true;
      this.state.error = null;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      this.state.isInitialized = false;
      throw new Error(`Pose detection initialization failed: ${this.state.error}`);
    }
  }

  /**
   * Detect poses in a video frame
   * 
   * @param imageSource - HTMLVideoElement, HTMLCanvasElement, or ImageData
   * @param timestampMs - Timestamp in milliseconds (use performance.now())
   * @returns PoseFrame with detected landmarks
   * 
   * @throws Error if model not initialized
   */
  public detect(
    imageSource: HTMLVideoElement | HTMLCanvasElement | ImageData,
    timestampMs: number
  ): PoseFrame {
    if (!this.poseLandmarker) {
      throw new Error('Pose Landmarker not initialized. Call initialize() first.');
    }

    this.state.isDetecting = true;

    try {
      const result: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(
        imageSource,
        timestampMs
      );

      const poseFrame = this.convertToInternalFormat(result, timestampMs);
      this.state.currentFrame = poseFrame;
      this.state.framesProcessed++;
      this.updateFPS();

      return poseFrame;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Pose detection failed: ${this.state.error}`
      );
    } finally {
      this.state.isDetecting = false;
    }
  }

  /**
   * Detect poses in an image (single frame, not video)
   * 
   * @param imageSource - HTMLImageElement, HTMLCanvasElement, or ImageData
   * @returns PoseFrame with detected landmarks
   */
  public detectImage(
    imageSource: HTMLImageElement | HTMLCanvasElement | ImageData
  ): PoseFrame {
    if (!this.poseLandmarker) {
      throw new Error('Pose Landmarker not initialized. Call initialize() first.');
    }

    try {
      const result: PoseLandmarkerResult = this.poseLandmarker.detect(imageSource);
      const poseFrame = this.convertToInternalFormat(result, Date.now());
      return poseFrame;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Image pose detection failed: ${message}`);
    }
  }

  /**
   * Get current state of pose detection service
   */
  public getState(): PoseDetectionState {
    return { ...this.state };
  }

  /**
   * Clean up resources
   */
  public close(): void {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    this.state.isInitialized = false;
  }

  /**
   * Reset FPS counter and tracking
   */
  public reset(): void {
    this.frameTimestamps = [];
    this.state.framesProcessed = 0;
    this.state.fps = 0;
  }

  /**
   * Private: Convert MediaPipe result to internal format
   */
  private convertToInternalFormat(
    result: PoseLandmarkerResult,
    timestampMs: number
  ): PoseFrame {
    if (!result.landmarks || result.landmarks.length === 0) {
      return {
        landmarks: [],
        timestamp: timestampMs,
        frameNumber: this.state.framesProcessed,
        isValid: false,
      };
    }

    // Take first pose (single person)
    const landmarks = result.landmarks[0].map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
      visibility: point.visibility || 0,
    })) as Landmark[];

    // Check if frame has minimum required visibility
    const avgVisibility =
      landmarks.reduce((sum, l) => sum + l.visibility, 0) / landmarks.length;
    const isValid = avgVisibility > 0.5;

    return {
      landmarks,
      timestamp: timestampMs,
      frameNumber: this.state.framesProcessed,
      isValid,
    };
  }

  /**
   * Private: Update FPS counter
   */
  private updateFPS(): void {
    const now = Date.now();
    this.frameTimestamps.push(now);

    // Keep only last second of frames
    this.frameTimestamps = this.frameTimestamps.filter((ts) => now - ts < 1000);

    // Update FPS every 100ms
    if (now - this.lastFpsUpdate > 100) {
      this.state.fps = this.frameTimestamps.length;
      this.lastFpsUpdate = now;
    }
  }
}

/**
 * Singleton instance of pose detection service
 */
let poseDetectionInstance: PoseDetectionService | null = null;

/**
 * Get or create singleton instance
 */
export function getPoseDetectionService(): PoseDetectionService {
  if (!poseDetectionInstance) {
    poseDetectionInstance = new PoseDetectionService();
  }
  return poseDetectionInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetPoseDetectionService(): void {
  if (poseDetectionInstance) {
    poseDetectionInstance.close();
  }
  poseDetectionInstance = null;
}

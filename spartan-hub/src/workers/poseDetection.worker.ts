/**
 * Pose Detection Web Worker
 * 
 * Handles MediaPipe pose detection inference in a separate thread
 * to prevent UI blocking during video processing.
 * 
 * @module workers/poseDetection.worker
 */

import type { PoseFrame, Landmark } from '../types/pose';

// MediaPipe types (imported dynamically in worker)
let PoseLandmarker: any = null;
let FilesetResolver: any = null;
let poseLandmarker: any = null;

// Worker state
let isInitialized = false;
let framesProcessed = 0;
let frameTimestamps: number[] = [];
let lastFpsUpdate = Date.now();
let currentFps = 0;

// Configuration - can be updated via message
let config = {
  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  runningMode: 'VIDEO' as const,
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

/**
 * Initialize MediaPipe Pose Landmarker
 */
async function initializePoseLandmarker(): Promise<void> {
  try {
    // Import MediaPipe tasks vision dynamically
    const visionModule = await import('@mediapipe/tasks-vision');
    PoseLandmarker = visionModule.PoseLandmarker;
    FilesetResolver = visionModule.FilesetResolver;

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: config.modelAssetPath,
      },
      runningMode: config.runningMode,
      numPoses: config.numPoses,
      minPoseDetectionConfidence: config.minPoseDetectionConfidence,
      minPosePresenceConfidence: config.minPosePresenceConfidence,
      minTrackingConfidence: config.minTrackingConfidence,
    });

    isInitialized = true;
    
    self.postMessage({
      type: 'INITIALIZED',
      success: true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type: 'INITIALIZED',
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Detect pose in a video frame
 * 
 * @param imageData - Image data from video frame
 * @param timestampMs - Frame timestamp
 */
function detectPose(imageData: ImageData, timestampMs: number): PoseFrame {
  if (!poseLandmarker) {
    throw new Error('Pose Landmarker not initialized');
  }

  try {
    const result = poseLandmarker.detectForVideo(imageData, timestampMs);
    const poseFrame = convertToInternalFormat(result, timestampMs);
    
    framesProcessed++;
    updateFPS();
    
    return poseFrame;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Pose detection failed: ${message}`);
  }
}

/**
 * Convert MediaPipe result to internal PoseFrame format
 */
function convertToInternalFormat(result: any, timestampMs: number): PoseFrame {
  if (!result.landmarks || result.landmarks.length === 0) {
    return {
      landmarks: [],
      timestamp: timestampMs,
      frameNumber: framesProcessed,
      isValid: false,
    };
  }

  // Take first pose (single person)
  const landmarks = result.landmarks[0].map((point: any) => ({
    x: point.x,
    y: point.y,
    z: point.z,
    visibility: point.visibility || 0,
  })) as Landmark[];

  // Check if frame has minimum required visibility
  const avgVisibility =
    landmarks.reduce((sum: number, l: Landmark) => sum + l.visibility, 0) / landmarks.length;
  const isValid = avgVisibility > 0.5;

  return {
    landmarks,
    timestamp: timestampMs,
    frameNumber: framesProcessed,
    isValid,
  };
}

/**
 * Update FPS counter
 */
function updateFPS(): void {
  const now = Date.now();
  frameTimestamps.push(now);

  // Keep only last second of frames
  frameTimestamps = frameTimestamps.filter((ts) => now - ts < 1000);

  // Update FPS every 100ms
  if (now - lastFpsUpdate > 100) {
    currentFps = frameTimestamps.length;
    lastFpsUpdate = now;
    
    // Send FPS update to main thread
    self.postMessage({
      type: 'FPS_UPDATE',
      fps: currentFps,
      framesProcessed,
    });
  }
}

/**
 * Reset worker state
 */
function reset(): void {
  framesProcessed = 0;
  frameTimestamps = [];
  lastFpsUpdate = Date.now();
  currentFps = 0;
}

/**
 * Clean up resources
 */
function close(): void {
  if (poseLandmarker) {
    poseLandmarker.close();
    poseLandmarker = null;
  }
  isInitialized = false;
  reset();
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'INITIALIZE':
        if (payload?.config) {
          config = { ...config, ...payload.config };
        }
        await initializePoseLandmarker();
        break;

      case 'DETECT': {
        if (!isInitialized) {
          throw new Error('Worker not initialized. Call INITIALIZE first.');
        }
        
        const { imageData, timestampMs } = payload;
        const poseFrame = detectPose(imageData, timestampMs);
        
        self.postMessage({
          type: 'DETECTION_RESULT',
          poseFrame,
          success: true,
        });
        break;
      }

      case 'UPDATE_CONFIG':
        if (payload?.config) {
          config = { ...config, ...payload.config };
          // Re-initialize with new config if already initialized
          if (isInitialized) {
            close();
            await initializePoseLandmarker();
          }
        }
        break;

      case 'RESET':
        reset();
        self.postMessage({
          type: 'RESET_COMPLETE',
          success: true,
        });
        break;

      case 'CLOSE':
        close();
        self.postMessage({
          type: 'CLOSED',
          success: true,
        });
        break;

      case 'GET_STATE':
        self.postMessage({
          type: 'STATE',
          state: {
            isInitialized,
            framesProcessed,
            fps: currentFps,
          },
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({
      type,
      success: false,
      error: errorMessage,
    });
  }
};

// Export types for TypeScript
export type WorkerMessage =
  | { type: 'INITIALIZE'; payload?: { config?: Partial<typeof config> } }
  | { type: 'DETECT'; payload: { imageData: ImageData; timestampMs: number } }
  | { type: 'UPDATE_CONFIG'; payload: { config: Partial<typeof config> } }
  | { type: 'RESET'; payload?: never }
  | { type: 'CLOSE'; payload?: never }
  | { type: 'GET_STATE'; payload?: never };

export type WorkerResponse =
  | { type: 'INITIALIZED'; success: boolean; error?: string }
  | { type: 'DETECTION_RESULT'; poseFrame?: PoseFrame; success: boolean; error?: string }
  | { type: 'FPS_UPDATE'; fps: number; framesProcessed: number }
  | { type: 'RESET_COMPLETE'; success: boolean }
  | { type: 'CLOSED'; success: boolean }
  | { type: 'STATE'; state: { isInitialized: boolean; framesProcessed: number; fps: number } };

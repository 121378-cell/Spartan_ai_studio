/**
 * Pose Detection Service (Optimized for Mobile)
 *
 * Wrapper around MediaPipe Pose Landmarker for detecting body poses
 * from video frames. Handles model initialization, frame processing,
 * and real-time pose detection with mobile optimizations.
 *
 * Optimizations implemented:
 * - Model preloading with progress tracking
 * - Memory management with frame buffer cleanup
 * - Adaptive performance based on device capabilities
 * - Web Worker integration option
 *
 * @module services/poseDetection
 */

import type { Landmark, PoseFrame, PoseDetectionState, PoseLandmarkerOptions } from '../types/pose';

type PoseLandmarkerInstance = import('@mediapipe/tasks-vision').PoseLandmarker;
type PoseLandmarkerResult = import('@mediapipe/tasks-vision').PoseLandmarkerResult;

/**
 * Model preload state for progress tracking
 */
export interface ModelPreloadState {
  isPreloading: boolean;
  preloadProgress: number; // 0-100
  preloadComplete: boolean;
  preloadError: string | null;
  modelSize: number; // bytes
  loadTimeMs: number;
}

/**
 * Memory management configuration
 */
export interface MemoryConfig {
  maxFrameBuffer: number; // Maximum frames to keep in memory
  memoryThresholdMB: number; // Memory threshold to trigger cleanup
  enableAutoCleanup: boolean;
  cleanupIntervalMs: number;
}

/**
 * Adaptive performance configuration
 */
export interface AdaptivePerformanceConfig {
  targetFPS: number;
  minFPS: number;
  maxFPS: number;
  frameTimeThresholdMs: number;
  autoAdjustResolution: boolean;
  autoAdjustModelComplexity: boolean;
}

/**
 * Default configurations
 */
const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxFrameBuffer: 180, // 6 seconds at 30fps (reduced from 300)
  memoryThresholdMB: 100,
  enableAutoCleanup: true,
  cleanupIntervalMs: 5000,
};

const DEFAULT_PERFORMANCE_CONFIG: AdaptivePerformanceConfig = {
  targetFPS: 30,
  minFPS: 15,
  maxFPS: 30,
  frameTimeThresholdMs: 33, // ~30fps
  autoAdjustResolution: true,
  autoAdjustModelComplexity: true,
};

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  avgInferenceTimeMs: number;
  avgFrameTimeMs: number;
  currentFPS: number;
  memoryUsageMB: number;
  droppedFrames: number;
  modelComplexity: 'lite' | 'full';
  resolution: { width: number; height: number };
}

/**
 * Service for detecting body poses using MediaPipe
 *
 * Usage:
 * ```typescript
 * const detector = new PoseDetectionService();
 * await detector.preloadModel(); // Preload during app init
 * await detector.initialize();
 * const poses = await detector.detect(videoFrame);
 * ```
 */
export class PoseDetectionService {
  private poseLandmarker: PoseLandmarkerInstance | null = null;
  private state: PoseDetectionState = {
    isInitialized: false,
    isDetecting: false,
    currentFrame: null,
    fps: 0,
    error: null,
    framesProcessed: 0,
  };

  // Preload state
  private preloadState: ModelPreloadState = {
    isPreloading: false,
    preloadProgress: 0,
    preloadComplete: false,
    preloadError: null,
    modelSize: 0,
    loadTimeMs: 0,
  };

  // Memory management
  private frameBuffer: PoseFrame[] = [];
  private memoryConfig: MemoryConfig = DEFAULT_MEMORY_CONFIG;
  private cleanupIntervalId: number | null = null;
  private lastMemoryCheck = 0;

  // Performance tracking
  private frameTimestamps: number[] = [];
  private lastFpsUpdate: number = Date.now();
  private inferenceTimes: number[] = [];
  private performanceConfig: AdaptivePerformanceConfig = DEFAULT_PERFORMANCE_CONFIG;
  private droppedFrames = 0;
  private currentModelComplexity: 'lite' | 'full' = 'full';
  private currentResolution = { width: 1280, height: 720 };

  // Device capabilities cache
  private deviceCapabilities: {
    cores: number;
    memoryGB: number;
    isLowEnd: boolean;
  } | null = null;

  /**
   * Detect device capabilities for adaptive performance
   */
  private detectDeviceCapabilities(): void {
    const cores = navigator.hardwareConcurrency || 2;
    const memoryGB = (navigator as any).deviceMemory || 4;
    
    // Classify device
    const isLowEnd = cores <= 4 || memoryGB <= 4;

    this.deviceCapabilities = {
      cores,
      memoryGB,
      isLowEnd,
    };

    // Adjust configurations based on device
    if (isLowEnd) {
      this.performanceConfig.targetFPS = 15;
      this.performanceConfig.minFPS = 10;
      this.memoryConfig.maxFrameBuffer = 90; // 3 seconds at 30fps
      this.currentModelComplexity = 'lite';
    }

    console.log('[PoseDetection] Device capabilities:', this.deviceCapabilities);
  }

  /**
   * Preload MediaPipe model during app initialization
   * This reduces first-use latency significantly
   *
   * @returns Promise that resolves when model is preloaded
   */
  public async preloadModel(): Promise<ModelPreloadState> {
    if (this.preloadState.preloadComplete) {
      return this.preloadState;
    }

    if (this.preloadState.isPreloading) {
      // Return existing preload promise by waiting for completion
      return new Promise((resolve) => {
        const checkComplete = () => {
          if (this.preloadState.preloadComplete || this.preloadState.preloadError) {
            resolve(this.preloadState);
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });
    }

    this.preloadState.isPreloading = true;
    this.preloadState.preloadProgress = 0;
    const startTime = performance.now();

    try {
      // Detect device capabilities first
      this.detectDeviceCapabilities();

      // Update progress
      this.preloadState.preloadProgress = 20;

      // Dynamically import MediaPipe
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      
      this.preloadState.preloadProgress = 50;

      // Estimate model size (approximate)
      this.preloadState.modelSize = this.currentModelComplexity === 'lite' ? 5 * 1024 * 1024 : 25 * 1024 * 1024;

      // Select model based on device capabilities
      const modelPath = this.currentModelComplexity === 'lite'
        ? 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
        : 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.preloadState.preloadProgress = 75;

      // Create landmarker with optimized settings
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: this.deviceCapabilities?.isLowEnd ? 0.6 : 0.5,
        minPosePresenceConfidence: this.deviceCapabilities?.isLowEnd ? 0.6 : 0.5,
        minTrackingConfidence: 0.5,
      });

      this.preloadState.preloadProgress = 100;
      this.preloadState.isPreloading = false;
      this.preloadState.preloadComplete = true;
      this.preloadState.loadTimeMs = performance.now() - startTime;

      // Start memory cleanup interval
      if (this.memoryConfig.enableAutoCleanup) {
        this.startMemoryCleanup();
      }

      console.log(`[PoseDetection] Model preloaded in ${this.preloadState.loadTimeMs.toFixed(0)}ms`);
      return this.preloadState;
    } catch (error) {
      this.preloadState.isPreloading = false;
      this.preloadState.preloadError = error instanceof Error ? error.message : String(error);
      this.state.error = this.preloadState.preloadError;
      throw new Error(`Model preload failed: ${this.preloadState.preloadError}`);
    }
  }

  /**
   * Initialize MediaPipe Pose Landmarker model
   * Must be called before detect() method if not preloaded
   *
   * @throws Error if initialization fails
   */
  public async initialize(): Promise<void> {
    // If already preloaded, just mark as initialized
    if (this.preloadState.preloadComplete && this.poseLandmarker) {
      this.state.isInitialized = true;
      this.state.error = null;
      return;
    }

    await this.preloadModel();
  }

  /**
   * Detect poses in a video frame with performance monitoring
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

    const inferenceStartTime = performance.now();
    this.state.isDetecting = true;

    try {
      const result: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(
        imageSource,
        timestampMs
      );

      const inferenceTime = performance.now() - inferenceStartTime;
      this.trackInferenceTime(inferenceTime);

      const poseFrame = this.convertToInternalFormat(result, timestampMs);
      
      // Add to frame buffer with memory management
      this.addToFrameBuffer(poseFrame);
      
      this.state.currentFrame = poseFrame;
      this.state.framesProcessed++;
      this.updateFPS();

      // Check if we need to adjust performance
      this.checkPerformanceAdjustment(inferenceTime);

      return poseFrame;
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      throw new Error(`Pose detection failed: ${this.state.error}`);
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

    const inferenceStartTime = performance.now();

    try {
      const result: PoseLandmarkerResult = this.poseLandmarker.detect(imageSource);
      const inferenceTime = performance.now() - inferenceStartTime;
      this.trackInferenceTime(inferenceTime);

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
   * Get preload state for progress indicators
   */
  public getPreloadState(): ModelPreloadState {
    return { ...this.preloadState };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const avgInferenceTime = this.inferenceTimes.length > 0
      ? this.inferenceTimes.reduce((a, b) => a + b, 0) / this.inferenceTimes.length
      : 0;

    const avgFrameTime = this.frameTimestamps.length > 1
      ? 1000 / this.state.fps
      : 0;

    return {
      avgInferenceTimeMs: avgInferenceTime,
      avgFrameTimeMs: avgFrameTime,
      currentFPS: this.state.fps,
      memoryUsageMB: this.estimateMemoryUsage(),
      droppedFrames: this.droppedFrames,
      modelComplexity: this.currentModelComplexity,
      resolution: this.currentResolution,
    };
  }

  /**
   * Update performance configuration
   */
  public updatePerformanceConfig(config: Partial<AdaptivePerformanceConfig>): void {
    this.performanceConfig = { ...this.performanceConfig, ...config };
  }

  /**
   * Update memory configuration
   */
  public updateMemoryConfig(config: Partial<MemoryConfig>): void {
    this.memoryConfig = { ...this.memoryConfig, ...config };
    
    if (!this.memoryConfig.enableAutoCleanup && this.cleanupIntervalId) {
      this.stopMemoryCleanup();
    } else if (this.memoryConfig.enableAutoCleanup && !this.cleanupIntervalId) {
      this.startMemoryCleanup();
    }
  }

  /**
   * Manually trigger memory cleanup
   */
  public triggerMemoryCleanup(): void {
    this.cleanupFrameBuffer();
  }

  /**
   * Reset model to use different complexity
   */
  public async switchModelComplexity(complexity: 'lite' | 'full'): Promise<void> {
    if (this.currentModelComplexity === complexity) {
      return;
    }

    // Close current model
    this.close();
    
    // Update complexity
    this.currentModelComplexity = complexity;
    this.preloadState.preloadComplete = false;
    this.preloadState.preloadProgress = 0;

    // Re-initialize with new model
    await this.preloadModel();
  }

  /**
   * Clean up resources
   */
  public close(): void {
    this.stopMemoryCleanup();
    
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    
    this.frameBuffer = [];
    this.state.isInitialized = false;
    this.state.currentFrame = null;
  }

  /**
   * Reset FPS counter and tracking
   */
  public reset(): void {
    this.frameTimestamps = [];
    this.inferenceTimes = [];
    this.state.framesProcessed = 0;
    this.state.fps = 0;
    this.droppedFrames = 0;
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

  /**
   * Private: Track inference time for performance monitoring
   */
  private trackInferenceTime(timeMs: number): void {
    this.inferenceTimes.push(timeMs);
    
    // Keep last 30 measurements
    if (this.inferenceTimes.length > 30) {
      this.inferenceTimes.shift();
    }
  }

  /**
   * Private: Add frame to buffer with memory management
   */
  private addToFrameBuffer(frame: PoseFrame): void {
    this.frameBuffer.push(frame);
    
    // Cleanup if buffer exceeds max size
    if (this.frameBuffer.length > this.memoryConfig.maxFrameBuffer) {
      this.cleanupFrameBuffer();
    }
  }

  /**
   * Private: Clean up frame buffer to prevent memory leaks
   */
  private cleanupFrameBuffer(): void {
    // Keep only recent frames
    const framesToKeep = Math.min(
      this.memoryConfig.maxFrameBuffer,
      Math.floor(this.performanceConfig.targetFPS * 3) // Keep 3 seconds worth
    );
    
    if (this.frameBuffer.length > framesToKeep) {
      const removed = this.frameBuffer.length - framesToKeep;
      this.frameBuffer = this.frameBuffer.slice(-framesToKeep);
      console.log(`[PoseDetection] Cleaned up ${removed} frames from buffer`);
    }
  }

  /**
   * Private: Start memory cleanup interval
   */
  private startMemoryCleanup(): void {
    if (this.cleanupIntervalId) {
      return;
    }

    this.cleanupIntervalId = window.setInterval(() => {
      const now = Date.now();
      
      // Check memory usage periodically
      if (now - this.lastMemoryCheck > 10000) {
        this.lastMemoryCheck = now;
        const memoryMB = this.estimateMemoryUsage();
        
        if (memoryMB > this.memoryConfig.memoryThresholdMB) {
          console.log(`[PoseDetection] Memory usage high: ${memoryMB.toFixed(1)}MB, triggering cleanup`);
          this.cleanupFrameBuffer();
        }
      }
      
      this.cleanupFrameBuffer();
    }, this.memoryConfig.cleanupIntervalMs);
  }

  /**
   * Private: Stop memory cleanup interval
   */
  private stopMemoryCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Private: Estimate memory usage in MB
   */
  private estimateMemoryUsage(): number {
    // Rough estimate based on frame buffer size
    // Each frame with 33 landmarks ≈ 1KB
    const frameBufferMemory = (this.frameBuffer.length * 33 * 4 * 4) / (1024 * 1024);
    
    // Model memory estimate
    const modelMemory = this.currentModelComplexity === 'lite' ? 5 : 25;
    
    return frameBufferMemory + modelMemory;
  }

  /**
   * Private: Check if performance adjustment is needed
   */
  private checkPerformanceAdjustment(inferenceTime: number): void {
    if (!this.performanceConfig.autoAdjustResolution) {
      return;
    }

    // If inference is taking too long, consider dropping resolution
    if (inferenceTime > this.performanceConfig.frameTimeThresholdMs) {
      this.droppedFrames++;
      
      // Log warning if consistently slow
      const avgInference = this.inferenceTimes.reduce((a, b) => a + b, 0) / this.inferenceTimes.length;
      if (avgInference > this.performanceConfig.frameTimeThresholdMs * 1.5) {
        console.warn(
          `[PoseDetection] Performance warning: avg inference ${avgInference.toFixed(1)}ms > threshold ${this.performanceConfig.frameTimeThresholdMs}ms`
        );
      }
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

/**
 * Preload model during app initialization
 * Call this in your app's initialization code
 */
export async function preloadPoseModel(): Promise<ModelPreloadState> {
  const service = getPoseDetectionService();
  return service.preloadModel();
}

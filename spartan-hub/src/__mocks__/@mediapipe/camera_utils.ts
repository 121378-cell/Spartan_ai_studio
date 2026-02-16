/**
 * Comprehensive Mock for @mediapipe/camera_utils
 * 
 * This module provides a robust, TypeScript-compatible mock implementation
 * for the MediaPipe Camera utility class to enable testing without actual camera hardware.
 * 
 * Features:
 * - Full Camera class lifecycle simulation (constructor → start → stop)
 * - Configurable frame callback simulation
 * - Support for width/height configuration
 * - Jest mock integration for assertions
 * - Error simulation capabilities
 * 
 * @module @mediapipe/camera_utils_mock
 */

// ============================================================================
// Type Definitions - Strictly adhering to MediaPipe Camera Utils API
// ============================================================================

/**
 * Options for configuring the Camera
 */
export interface CameraOptions {
  /** Callback function invoked for each video frame */
  onFrame: () => Promise<void>;
  /** Desired video width in pixels */
  width?: number;
  /** Desired video height in pixels */
  height?: number;
  /** Frame rate for the camera (frames per second) */
  fps?: number;
  /** Whether to mirror the video horizontally */
  facingMode?: 'user' | 'environment';
}

/**
 * Camera state for tracking and testing
 */
export interface CameraState {
  isRunning: boolean;
  isPaused: boolean;
  frameCount: number;
  error: Error | null;
  lastFrameTime: number;
  stream: MediaStream | null;
}

/**
 * Event types for camera events
 */
export type CameraEventType = 'start' | 'stop' | 'frame' | 'error';

/**
 * Event handler type for camera events
 */
export type CameraEventHandler = (event: { type: CameraEventType; data?: unknown }) => void;

// ============================================================================
// Mock Implementation
// ============================================================================

/**
 * Mock Camera class that simulates the MediaPipe Camera Utils API
 * 
 * @example
 * ```typescript
 * const camera = new Camera(videoElement, {
 *   onFrame: async () => {
 *     await pose.send(videoElement);
 *   },
 *   width: 640,
 *   height: 480,
 * });
 * await camera.start();
 * // ... later
 * camera.stop();
 * ```
 */
export class Camera {
  private videoElement: HTMLVideoElement;
  private options: CameraOptions;
  private state: CameraState;
  private frameInterval: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Map<CameraEventType, CameraEventHandler[]> = new Map();

  /**
   * Create a new Camera instance
   * @param videoElement - The HTML video element to receive camera frames
   * @param options - Camera configuration options
   */
  constructor(videoElement: HTMLVideoElement, options: CameraOptions) {
    this.videoElement = videoElement;
    this.options = {
      width: 640,
      height: 480,
      fps: 30,
      facingMode: 'user',
      ...options,
    };
    
    this.state = {
      isRunning: false,
      isPaused: false,
      frameCount: 0,
      error: null,
      lastFrameTime: 0,
      stream: null,
    };
  }

  /**
   * Start the camera and begin capturing frames
   * Simulates getUserMedia and starts the frame callback loop
   */
  start = jest.fn().mockImplementation(async (): Promise<void> => {
    if (this.state.isRunning) {
      console.warn('Camera is already running');
      return;
    }

    try {
      // Simulate getUserMedia call
      const mockStream = await this.getUserMedia();
      this.state.stream = mockStream;
      
      // Set video element properties
      if (this.videoElement) {
        this.videoElement.srcObject = mockStream;
        // Use Object.defineProperty for read-only properties
        Object.defineProperty(this.videoElement, 'videoWidth', {
          value: this.options.width || 640,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(this.videoElement, 'videoHeight', {
          value: this.options.height || 480,
          writable: true,
          configurable: true,
        });
      }

      this.state.isRunning = true;
      this.state.error = null;
      
      // Emit start event
      this.emit('start');

      // Start frame callback loop
      const fps = this.options.fps || 30;
      const intervalMs = 1000 / fps;
      
      this.frameInterval = setInterval(async () => {
        if (this.state.isPaused || !this.state.isRunning) {
          return;
        }

        try {
          this.state.frameCount++;
          this.state.lastFrameTime = Date.now();
          
          // Call the onFrame callback
          await this.options.onFrame();
          
          // Emit frame event
          this.emit('frame', { frameCount: this.state.frameCount });
        } catch (error) {
          this.state.error = error instanceof Error ? error : new Error(String(error));
          this.emit('error', { error: this.state.error });
        }
      }, intervalMs);

    } catch (error) {
      this.state.error = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { error: this.state.error });
      throw error;
    }
  });

  /**
   * Stop the camera and release resources
   */
  stop = jest.fn().mockImplementation((): void => {
    if (!this.state.isRunning) {
      return;
    }

    // Clear the frame interval
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    // Stop all tracks in the stream
    if (this.state.stream) {
      this.state.stream.getTracks().forEach(track => track.stop());
      this.state.stream = null;
    }

    // Clear video element
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.state.isRunning = false;
    this.state.isPaused = false;
    
    // Emit stop event
    this.emit('stop');
  });

  /**
   * Pause frame capture (keeps camera running but stops callbacks)
   */
  pause = jest.fn().mockImplementation((): void => {
    if (this.state.isRunning) {
      this.state.isPaused = true;
    }
  });

  /**
   * Resume frame capture after pause
   */
  resume = jest.fn().mockImplementation((): void => {
    if (this.state.isRunning && this.state.isPaused) {
      this.state.isPaused = false;
    }
  });

  /**
   * Add event handler for camera events
   * @param event - Event type
   * @param handler - Event handler function
   */
  on = jest.fn().mockImplementation((event: CameraEventType, handler: CameraEventHandler): void => {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  });

  /**
   * Remove event handler for camera events
   * @param event - Event type
   * @param handler - Event handler function to remove
   */
  off = jest.fn().mockImplementation((event: CameraEventType, handler: CameraEventHandler): void => {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  });

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Simulate getUserMedia call
   */
  private async getUserMedia(): Promise<MediaStream> {
    // Create a mock MediaStream with video tracks
    const mockTrack = {
      id: `track-${Date.now()}`,
      kind: 'video',
      label: 'Mock Camera',
      enabled: true,
      muted: false,
      readyState: 'live' as MediaStreamTrackState,
      stop: jest.fn(),
      getSettings: () => ({
        width: this.options.width || 640,
        height: this.options.height || 480,
        frameRate: this.options.fps || 30,
        facingMode: this.options.facingMode || 'user',
      }),
      getConstraints: () => ({}),
      applyConstraints: jest.fn().mockResolvedValue(undefined),
      clone: () => mockTrack,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn().mockReturnValue(true),
    } as unknown as MediaStreamTrack;

    return {
      id: `stream-${Date.now()}`,
      active: true,
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
      getAudioTracks: () => [],
      getTrackById: () => mockTrack,
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      clone: jest.fn().mockReturnValue({
        getTracks: () => [mockTrack],
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn().mockReturnValue(true),
    } as unknown as MediaStream;
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(event: CameraEventType, data?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler({ type: event, data }));
    }
  }

  // ========================================================================
  // Test Utility Methods
  // ========================================================================

  /**
   * Get current camera state (for testing)
   */
  getState(): CameraState {
    return { ...this.state };
  }

  /**
   * Get current options (for testing)
   */
  getOptions(): CameraOptions {
    return { ...this.options };
  }

  /**
   * Check if camera is running (for testing)
   */
  isRunning(): boolean {
    return this.state.isRunning;
  }

  /**
   * Get frame count (for testing)
   */
  getFrameCount(): number {
    return this.state.frameCount;
  }

  /**
   * Simulate a single frame callback (for testing)
   */
  async simulateFrame(): Promise<void> {
    if (this.options.onFrame) {
      await this.options.onFrame();
      this.state.frameCount++;
    }
  }

  /**
   * Simulate an error (for testing)
   */
  simulateError(error: Error): void {
    this.state.error = error;
    this.emit('error', { error });
  }

  /**
   * Manually trigger frame processing (for testing)
   */
  async triggerFrame(): Promise<void> {
    if (this.state.isRunning && !this.state.isPaused) {
      await this.options.onFrame();
      this.state.frameCount++;
      this.state.lastFrameTime = Date.now();
    }
  }
}

// ============================================================================
// Additional Exports for Testing
// ============================================================================

/**
 * Reset all mock instances and clear mock calls
 * Note: Since methods are instance properties (not prototype methods),
 * we create a temporary instance to access the jest mocks.
 */
export const resetCameraMock = (): void => {
  // Create a temporary instance to access the mock methods
  const tempVideo = createMockVideoElement();
  const tempCamera = new Camera(tempVideo, { onFrame: async () => {} });
  if (tempCamera.start && typeof tempCamera.start.mockClear === 'function') {
    tempCamera.start.mockClear();
  }
  if (tempCamera.stop && typeof tempCamera.stop.mockClear === 'function') {
    tempCamera.stop.mockClear();
  }
  if (tempCamera.pause && typeof tempCamera.pause.mockClear === 'function') {
    tempCamera.pause.mockClear();
  }
  if (tempCamera.resume && typeof tempCamera.resume.mockClear === 'function') {
    tempCamera.resume.mockClear();
  }
  if (tempCamera.on && typeof tempCamera.on.mockClear === 'function') {
    tempCamera.on.mockClear();
  }
  if (tempCamera.off && typeof tempCamera.off.mockClear === 'function') {
    tempCamera.off.mockClear();
  }
};

/**
 * Create a pre-configured Camera instance for testing
 */
export const createMockCamera = async (
  videoElement?: HTMLVideoElement,
  options?: Partial<CameraOptions>
): Promise<Camera> => {
  const mockVideo = videoElement || createMockVideoElement();
  const camera = new Camera(mockVideo, {
    onFrame: async () => {},
    width: 640,
    height: 480,
    ...options,
  });
  return camera;
};

/**
 * Create a mock HTMLVideoElement for testing
 */
export const createMockVideoElement = (): HTMLVideoElement => {
  const video = document.createElement('video');
  Object.defineProperties(video, {
    videoWidth: { value: 640, writable: true, configurable: true },
    videoHeight: { value: 480, writable: true, configurable: true },
    readyState: { value: 4, writable: true, configurable: true },
    play: { value: jest.fn().mockResolvedValue(undefined), configurable: true },
    pause: { value: jest.fn(), configurable: true },
  });
  return video;
};

/**
 * Create a mock MediaStream for testing
 */
export const createMockMediaStream = (): MediaStream => {
  const mockTrack = {
    id: `track-${Date.now()}`,
    kind: 'video',
    label: 'Mock Camera',
    enabled: true,
    muted: false,
    readyState: 'live' as MediaStreamTrackState,
    stop: jest.fn(),
    getSettings: () => ({ width: 640, height: 480, frameRate: 30 }),
    getConstraints: () => ({}),
    applyConstraints: jest.fn().mockResolvedValue(undefined),
    clone: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn().mockReturnValue(true),
  } as unknown as MediaStreamTrack;

  return {
    id: `stream-${Date.now()}`,
    active: true,
    getTracks: () => [mockTrack],
    getVideoTracks: () => [mockTrack],
    getAudioTracks: () => [],
    getTrackById: () => mockTrack,
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    clone: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn().mockReturnValue(true),
  } as unknown as MediaStream;
};

// Default export
export default {
  Camera,
  resetCameraMock,
  createMockCamera,
  createMockVideoElement,
  createMockMediaStream,
};

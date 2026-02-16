/**
 * Comprehensive Mock for @mediapipe/tasks-vision
 * 
 * This module provides mock implementations for MediaPipe Vision tasks
 * to enable testing without the actual MediaPipe library.
 * 
 * Supported classes:
 * - PoseLandmarker
 * - HandLandmarker
 * - FaceLandmarker
 * - FilesetResolver
 */

// Type definitions for mock results
export interface MockLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
}

export interface MockLandmarkerResult {
  landmarks: MockLandmark[][];
  worldLandmarks?: MockLandmark[][];
  handedness?: Array<Array<{ categoryName: string; score: number }>>;
  faceBlendshapes?: Array<{ categories: Array<{ categoryName: string; score: number }> }>;
  segmentationMasks?: ImageData[];
}

// Default realistic pose landmarks (33 points for MediaPipe Pose)
const createDefaultPoseLandmarks = (): MockLandmark[] => {
  // Standard MediaPipe pose landmark indices
  const landmarkNames = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
    'left_index', 'right_index', 'left_thumb', 'right_thumb',
    'left_hip', 'right_hip', 'left_knee', 'right_knee',
    'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
    'left_foot_index', 'right_foot_index'
  ];

  return landmarkNames.map((name, index) => ({
    x: 0.5 + (Math.random() - 0.5) * 0.2, // Centered with some variation
    y: 0.3 + (index / landmarkNames.length) * 0.4, // Spread vertically
    z: (Math.random() - 0.5) * 0.1, // Small depth variation
    visibility: 0.8 + Math.random() * 0.2,
    presence: 0.9 + Math.random() * 0.1,
  }));
};

// Default hand landmarks (21 points for MediaPipe Hand)
const createDefaultHandLandmarks = (): MockLandmark[] => {
  return Array.from({ length: 21 }, (_, index) => ({
    x: 0.5 + (Math.random() - 0.5) * 0.3,
    y: 0.5 + (Math.random() - 0.5) * 0.3,
    z: (Math.random() - 0.5) * 0.05,
    visibility: 1.0,
    presence: 1.0,
  }));
};

// Default face landmarks (478 points for MediaPipe Face Mesh)
const createDefaultFaceLandmarks = (): MockLandmark[] => {
  return Array.from({ length: 478 }, (_, index) => ({
    x: 0.5 + (Math.random() - 0.5) * 0.2,
    y: 0.5 + (Math.random() - 0.5) * 0.2,
    z: (Math.random() - 0.5) * 0.1,
    visibility: 1.0,
    presence: 1.0,
  }));
};

// Mock landmarker options type
interface MockLandmarkerOptions {
  baseOptions?: {
    modelAssetPath?: string;
    delegate?: string;
  };
  runningMode?: 'IMAGE' | 'VIDEO' | 'LIVE_STREAM';
  numPoses?: number;
  numHands?: number;
  numFaces?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
  minHandDetectionConfidence?: number;
  minHandPresenceConfidence?: number;
  minFaceDetectionConfidence?: number;
  minFacePresenceConfidence?: number;
  outputFaceBlendshapes?: boolean;
  outputSegmentationMasks?: boolean;
}

/**
 * Mock PoseLandmarker class
 */
export class PoseLandmarker {
  private static _instance: PoseLandmarker | null = null;
  private options: MockLandmarkerOptions = {};
  private isClosed = false;

  static createFromOptions = jest.fn().mockImplementation(
    async (_vision: unknown, options: MockLandmarkerOptions): Promise<PoseLandmarker> => {
      const instance = new PoseLandmarker();
      instance.options = options;
      PoseLandmarker._instance = instance;
      return instance;
    }
  );

  detectForVideo = jest.fn().mockImplementation(
    (_imageSource: unknown, timestampMs: number): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('PoseLandmarker has been closed');
      }
      return {
        landmarks: [createDefaultPoseLandmarks()],
        worldLandmarks: [createDefaultPoseLandmarks()],
      };
    }
  );

  detect = jest.fn().mockImplementation(
    (_imageSource: unknown): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('PoseLandmarker has been closed');
      }
      return {
        landmarks: [createDefaultPoseLandmarks()],
        worldLandmarks: [createDefaultPoseLandmarks()],
      };
    }
  );

  detectForImage = jest.fn().mockImplementation(
    (_imageSource: unknown): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('PoseLandmarker has been closed');
      }
      return {
        landmarks: [createDefaultPoseLandmarks()],
        worldLandmarks: [createDefaultPoseLandmarks()],
      };
    }
  );

  setOptions = jest.fn().mockImplementation(
    async (options: MockLandmarkerOptions): Promise<void> => {
      this.options = { ...this.options, ...options };
    }
  );

  close = jest.fn().mockImplementation((): void => {
    this.isClosed = true;
    PoseLandmarker._instance = null;
  });

  // Test utility methods
  static get instance(): PoseLandmarker | null {
    return PoseLandmarker._instance;
  }

  static reset(): void {
    PoseLandmarker._instance = null;
    PoseLandmarker.createFromOptions.mockClear();
  }
}

/**
 * Mock HandLandmarker class
 */
export class HandLandmarker {
  private static _instance: HandLandmarker | null = null;
  private options: MockLandmarkerOptions = {};
  private isClosed = false;

  static createFromOptions = jest.fn().mockImplementation(
    async (_vision: unknown, options: MockLandmarkerOptions): Promise<HandLandmarker> => {
      const instance = new HandLandmarker();
      instance.options = options;
      HandLandmarker._instance = instance;
      return instance;
    }
  );

  detectForVideo = jest.fn().mockImplementation(
    (_imageSource: unknown, timestampMs: number): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('HandLandmarker has been closed');
      }
      const numHands = this.options.numHands || 2;
      return {
        landmarks: Array.from({ length: numHands }, () => createDefaultHandLandmarks()),
        worldLandmarks: Array.from({ length: numHands }, () => createDefaultHandLandmarks()),
        handedness: Array.from({ length: numHands }, () => [
          { categoryName: Math.random() > 0.5 ? 'Left' : 'Right', score: 0.95 }
        ]),
      };
    }
  );

  detect = jest.fn().mockImplementation(
    (_imageSource: unknown): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('HandLandmarker has been closed');
      }
      const numHands = this.options.numHands || 2;
      return {
        landmarks: Array.from({ length: numHands }, () => createDefaultHandLandmarks()),
        worldLandmarks: Array.from({ length: numHands }, () => createDefaultHandLandmarks()),
        handedness: Array.from({ length: numHands }, () => [
          { categoryName: Math.random() > 0.5 ? 'Left' : 'Right', score: 0.95 }
        ]),
      };
    }
  );

  detectForImage = jest.fn().mockImplementation(
    (_imageSource: unknown): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('HandLandmarker has been closed');
      }
      const numHands = this.options.numHands || 2;
      return {
        landmarks: Array.from({ length: numHands }, () => createDefaultHandLandmarks()),
        worldLandmarks: Array.from({ length: numHands }, () => createDefaultHandLandmarks()),
        handedness: Array.from({ length: numHands }, () => [
          { categoryName: Math.random() > 0.5 ? 'Left' : 'Right', score: 0.95 }
        ]),
      };
    }
  );

  setOptions = jest.fn().mockImplementation(
    async (options: MockLandmarkerOptions): Promise<void> => {
      this.options = { ...this.options, ...options };
    }
  );

  close = jest.fn().mockImplementation((): void => {
    this.isClosed = true;
    HandLandmarker._instance = null;
  });

  // Test utility methods
  static get instance(): HandLandmarker | null {
    return HandLandmarker._instance;
  }

  static reset(): void {
    HandLandmarker._instance = null;
    HandLandmarker.createFromOptions.mockClear();
  }
}

/**
 * Mock FaceLandmarker class
 */
export class FaceLandmarker {
  private static _instance: FaceLandmarker | null = null;
  private options: MockLandmarkerOptions = {};
  private isClosed = false;

  static createFromOptions = jest.fn().mockImplementation(
    async (_vision: unknown, options: MockLandmarkerOptions): Promise<FaceLandmarker> => {
      const instance = new FaceLandmarker();
      instance.options = options;
      FaceLandmarker._instance = instance;
      return instance;
    }
  );

  detectForVideo = jest.fn().mockImplementation(
    (_imageSource: unknown, timestampMs: number): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('FaceLandmarker has been closed');
      }
      const numFaces = this.options.numFaces || 1;
      return {
        landmarks: Array.from({ length: numFaces }, () => createDefaultFaceLandmarks()),
        faceBlendshapes: this.options.outputFaceBlendshapes
          ? [{ categories: [{ categoryName: 'smile', score: 0.8 }] }]
          : undefined,
        segmentationMasks: this.options.outputSegmentationMasks
          ? [new ImageData(256, 256)]
          : undefined,
      };
    }
  );

  detect = jest.fn().mockImplementation(
    (_imageSource: unknown): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('FaceLandmarker has been closed');
      }
      const numFaces = this.options.numFaces || 1;
      return {
        landmarks: Array.from({ length: numFaces }, () => createDefaultFaceLandmarks()),
        faceBlendshapes: this.options.outputFaceBlendshapes
          ? [{ categories: [{ categoryName: 'smile', score: 0.8 }] }]
          : undefined,
        segmentationMasks: this.options.outputSegmentationMasks
          ? [new ImageData(256, 256)]
          : undefined,
      };
    }
  );

  detectForImage = jest.fn().mockImplementation(
    (_imageSource: unknown): MockLandmarkerResult => {
      if (this.isClosed) {
        throw new Error('FaceLandmarker has been closed');
      }
      const numFaces = this.options.numFaces || 1;
      return {
        landmarks: Array.from({ length: numFaces }, () => createDefaultFaceLandmarks()),
        faceBlendshapes: this.options.outputFaceBlendshapes
          ? [{ categories: [{ categoryName: 'smile', score: 0.8 }] }]
          : undefined,
        segmentationMasks: this.options.outputSegmentationMasks
          ? [new ImageData(256, 256)]
          : undefined,
      };
    }
  );

  setOptions = jest.fn().mockImplementation(
    async (options: MockLandmarkerOptions): Promise<void> => {
      this.options = { ...this.options, ...options };
    }
  );

  close = jest.fn().mockImplementation((): void => {
    this.isClosed = true;
    FaceLandmarker._instance = null;
  });

  // Test utility methods
  static get instance(): FaceLandmarker | null {
    return FaceLandmarker._instance;
  }

  static reset(): void {
    FaceLandmarker._instance = null;
    FaceLandmarker.createFromOptions.mockClear();
  }
}

/**
 * Mock FilesetResolver class
 */
export class FilesetResolver {
  static forVisionTasks = jest.fn().mockResolvedValue({
    // Returns a mock vision task resolver
    _wasmLoaderPath: 'mock://wasm/path',
  });

  static forTextTasks = jest.fn().mockResolvedValue({
    _wasmLoaderPath: 'mock://text/wasm/path',
  });

  static forAudioTasks = jest.fn().mockResolvedValue({
    _wasmLoaderPath: 'mock://audio/wasm/path',
  });
}

// Define result types for compatibility with MediaPipe API
export type PoseLandmarkerResult = MockLandmarkerResult;
export type HandLandmarkerResult = MockLandmarkerResult;
export type FaceLandmarkerResult = MockLandmarkerResult;

// Reset all mocks utility
export const resetAllMediaPipeMocks = (): void => {
  PoseLandmarker.reset();
  HandLandmarker.reset();
  FaceLandmarker.reset();
  FilesetResolver.forVisionTasks.mockClear();
  FilesetResolver.forTextTasks.mockClear();
  FilesetResolver.forAudioTasks.mockClear();
};

// Default export for module mocking
export default {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
  FaceLandmarker,
  resetAllMediaPipeMocks,
};

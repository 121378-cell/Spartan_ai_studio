/**
 * Pose Detection Types & Interfaces
 * 
 * Defines all TypeScript interfaces for MediaPipe Pose detection,
 * form analysis, and exercise scoring.
 * 
 * @module types/pose
 */

/**
 * Single pose landmark (keypoint) from MediaPipe
 * Represents a single joint or body part
 */
export interface Landmark {
  /** X coordinate (0-1 normalized to video width) */
  x: number;
  
  /** Y coordinate (0-1 normalized to video height) */
  y: number;
  
  /** Z coordinate (depth, relative to hip center) */
  z: number;
  
  /** Confidence score (0-1, higher = more confident) */
  visibility: number;
  
  /** Optional presence score (0-1) for certain models */
  presence?: number;
}

/**
 * Complete pose frame with all 33 landmarks
 * Represents a single moment in time
 */
export interface PoseFrame {
  /** Array of 33 landmarks (MediaPipe Pose standard) */
  landmarks: Landmark[];
  
  /** Timestamp when frame was captured (ms) */
  timestamp: number;
  
  /** Frame number in sequence */
  frameNumber: number;
  
  /** Whether this frame had sufficient visibility */
  isValid: boolean;
}

/**
 * Form issue detected during analysis
 */
export interface FormIssue {
  /** Display label for the issue */
  label: string;
  
  /** Severity level */
  severity: 'high' | 'medium' | 'low';
  
  /** Human-readable description */
  description: string;
}

/**
 * Form analysis result for a single rep
 */
export interface FormAnalysisResult {
  /** Overall form score (0-100) */
  score: number;
  
  /** List of identified form issues */
  issues: FormIssue[];
  
  /** Coaching tips for improvement */
  tips: string[];
  
  /** Metrics breakdown by category */
  metrics?: Record<string, number | string>;
  
  /** Injury risk assessment */
  injuryRisk?: {
    total: number; // 0-1 (low to high)
    level: 'low' | 'moderate' | 'high' | 'critical';
    factors: {
      name: string;
      riskContribution: number; // 0-1
      description: string;
    }[];
  };

  /** How many frames were analyzed */
  frameCount: number;
}

/**
 * Complete exercise session analysis
 */
export interface ExerciseSession {
  /** Unique session ID */
  id: string;
  
  /** Exercise type performed */
  exerciseType: 'squat' | 'deadlift';
  
  /** When session started */
  startTime: Date;
  
  /** When session ended */
  endTime: Date;
  
  /** All reps analyzed */
  reps: FormAnalysisResult[];
  
  /** Overall session statistics */
  statistics: {
    averageScore: number;
    bestScore: number;
    worstScore: number;
    repCount: number;
    totalFrames: number;
  };
  
  /** Extracted video blob (if stored) */
  videoBlob?: Blob;
  
  /** User notes */
  notes?: string;
}

/**
 * Real-time pose detection state
 */
export interface PoseDetectionState {
  /** Is pose detection initialized */
  isInitialized: boolean;
  
  /** Is currently detecting poses */
  isDetecting: boolean;
  
  /** Latest frame detected */
  currentFrame: PoseFrame | null;
  
  /** FPS counter */
  fps: number;
  
  /** Error message if any */
  error: string | null;
  
  /** Total frames processed */
  framesProcessed: number;
}

/**
 * Video capture state
 */
export interface VideoCaptureState {
  /** Whether camera is actively capturing */
  isActive: boolean;
  
  /** Number of frames processed so far */
  framesProcessed?: number;
  
  /** Current frames per second */
  fps?: number;
  
  /** Timestamp of last frame (ms) */
  lastFrameTime?: number;
  
  /** Error message if any */
  error?: string | null;
}

/**
 * Form feedback for real-time display
 */
export interface FormFeedback {
  /** Current score */
  currentScore: number;
  
  /** List of current issues */
  issues: FormIssue[];
  
  /** Real-time tips */
  tips: string[];
  
  /** Rep progress */
  repProgress: {
    current: number;
    target: number;
  };
}

/**
 * MediaPipe Pose Landmarker constructor options
 */
export interface PoseLandmarkerOptions {
  baseOptions?: {
    modelAssetPath?: string;
  };
  runningMode?: 'IMAGE' | 'VIDEO';
  numPoses?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

/**
 * Configuration for form analysis algorithm
 */
export interface FormAnalysisConfig {
  /** Minimum confidence threshold for keypoints (0-1) */
  minConfidence: number;
  
  /** Minimum frames to analyze */
  minFrames: number;
  
  /** FPS for processing */
  targetFps: number;
  
  /** Exercise-specific thresholds */
  thresholds: {
    squat: {
      minDepth: number; // degrees
      maxKneeCave: number; // degrees
      maxHeelLift: number; // pixels
    };
    deadlift: {
      maxBackRound: number; // degrees
      minKneeExtension: number; // degrees
      maxBarDeviation: number; // pixels
    };
  };
}

/**
 * Keypoint indices for MediaPipe Pose (0-32)
 * Standard mapping from MediaPipe documentation
 */
export const POSE_LANDMARKS = {
  // Upper body
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  
  // Shoulders & torso
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  
  // Arms
  LEFT_ELBOW: 13,
  LEFT_WRIST: 14,
  LEFT_PINKY: 15,
  LEFT_INDEX: 16,
  LEFT_THUMB: 17,
  RIGHT_ELBOW: 18,
  RIGHT_WRIST: 19,
  RIGHT_PINKY: 20,
  RIGHT_INDEX: 21,
  RIGHT_THUMB: 22,
  
  // Hips & legs (Critical for fitness analysis)
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  LEFT_FOOT_INDEX: 30,
  RIGHT_HEEL: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Essential landmarks for fitness analysis
 * (The ones we actually need for squat/deadlift)
 */
export const FITNESS_CRITICAL_LANDMARKS = [
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
  POSE_LANDMARKS.LEFT_HEEL,
  POSE_LANDMARKS.RIGHT_HEEL,
] as const;

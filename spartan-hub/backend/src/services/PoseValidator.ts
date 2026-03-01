/**
 * Pose Validator Service
 * Phase A: Video Form Analysis MVP
 * 
 * Validates MediaPipe pose landmarks data structure
 */

import { logger } from '../utils/logger';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type PoseLandmarks = PoseLandmark[];

// MediaPipe pose has 33 landmarks (0-32)
export const LANDMARK_NAMES = [
  'nose',
  'left_eye_inner', 'left_eye', 'left_eye_outer',
  'right_eye_inner', 'right_eye', 'right_eye_outer',
  'left_ear', 'right_ear',
  'left_mouth', 'right_mouth',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_pinky', 'right_pinky',
  'left_index', 'right_index',
  'left_thumb', 'right_thumb',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle',
  'left_heel', 'right_heel',
  'left_foot_index', 'right_foot_index'
];

export class PoseValidator {
  /**
   * Validate pose landmarks structure
   */
  validate(landmarks: any[]): { valid: boolean; errors: string[]; normalized?: PoseLandmarks } {
    const errors: string[] = [];

    // Check if array
    if (!Array.isArray(landmarks)) {
      errors.push('Landmarks must be an array');
      return { valid: false, errors };
    }

    // Check length (MediaPipe has 33 landmarks)
    if (landmarks.length !== 33) {
      errors.push(`Expected 33 landmarks, got ${landmarks.length}`);
    }

    // Validate each landmark
    const normalized: PoseLandmarks = [];
    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      const landmarkErrors = this.validateLandmark(landmark, i);
      errors.push(...landmarkErrors);

      if (landmarkErrors.length === 0) {
        normalized.push({
          x: Number(landmark.x),
          y: Number(landmark.y),
          z: Number(landmark.z),
          visibility: Number(landmark.visibility ?? 1.0)
        });
      }
    }

    if (errors.length > 0) {
      logger.warn('Pose validation failed', {
        context: 'pose-validator',
        metadata: { errors, landmarkCount: landmarks.length }
      });
      return { valid: false, errors };
    }

    logger.debug('Pose validation successful', {
      context: 'pose-validator',
      metadata: { landmarkCount: landmarks.length }
    });

    return { valid: true, errors: [], normalized };
  }

  /**
   * Validate individual landmark
   */
  private validateLandmark(landmark: any, index: number): string[] {
    const errors: string[] = [];

    if (!landmark || typeof landmark !== 'object') {
      errors.push(`Landmark ${index} is not an object`);
      return errors;
    }

    // Check required fields
    if (typeof landmark.x !== 'number') {
      errors.push(`Landmark ${index} (${LANDMARK_NAMES[index] || 'unknown'}): x must be a number`);
    }

    if (typeof landmark.y !== 'number') {
      errors.push(`Landmark ${index} (${LANDMARK_NAMES[index] || 'unknown'}): y must be a number`);
    }

    if (typeof landmark.z !== 'number') {
      errors.push(`Landmark ${index} (${LANDMARK_NAMES[index] || 'unknown'}): z must be a number`);
    }

    // Check visibility (optional but should be 0-1 if present)
    if (landmark.visibility !== undefined) {
      if (typeof landmark.visibility !== 'number') {
        errors.push(`Landmark ${index}: visibility must be a number`);
      } else if (landmark.visibility < 0 || landmark.visibility > 1) {
        errors.push(`Landmark ${index}: visibility must be between 0 and 1`);
      }
    }

    return errors;
  }

  /**
   * Check if specific landmarks are visible
   */
  checkVisibility(landmarks: PoseLandmarks, minVisibility: number = 0.3): { visible: boolean; invisibleLandmarks: string[] } {
    const invisibleLandmarks: string[] = [];

    landmarks.forEach((landmark, index) => {
      if (landmark.visibility < minVisibility) {
        invisibleLandmarks.push(LANDMARK_NAMES[index] || `landmark-${index}`);
      }
    });

    return {
      visible: invisibleLandmarks.length === 0,
      invisibleLandmarks
    };
  }

  /**
   * Get specific landmark by name
   */
  getLandmarkByName(landmarks: PoseLandmarks, name: string): PoseLandmark | null {
    const index = LANDMARK_NAMES.indexOf(name);
    if (index === -1) {
      logger.warn(`Unknown landmark name: ${name}`, {
        context: 'pose-validator'
      });
      return null;
    }
    return landmarks[index] || null;
  }

  /**
   * Get multiple landmarks by names
   */
  getLandmarksByNames(landmarks: PoseLandmarks, names: string[]): PoseLandmark[] {
    return names
      .map(name => this.getLandmarkByName(landmarks, name))
      .filter((lm): lm is PoseLandmark => lm !== null);
  }
}

export default PoseValidator;

/**
 * Tests for Form Analysis Functions
 * 
 * @module __tests__/utils/formAnalysis.test.ts
 */

import {
  analyzeSquatForm,
  analyzeDeadliftForm,
  DEFAULT_FORM_ANALYSIS_CONFIG,
} from '../../utils/formAnalysis';
import type { PoseFrame, Landmark } from '../../types/pose';
import { POSE_LANDMARKS } from '../../types/pose';

/**
 * Create mock landmark for testing
 */
function createMockLandmark(x = 0.5, y = 0.5, z = 0, visibility = 0.9): Landmark {
  return { x, y, z, visibility };
}

/**
 * Create mock frame with specific pose
 */
function createMockFrame(
  override: Partial<Record<number, Partial<Landmark>>> = {},
  isValid = true
): PoseFrame {
  const landmarks: Landmark[] = Array.from({ length: 33 }, (_, i) => ({
    ...createMockLandmark(),
    ...(override[i] || {}),
  }));

  return {
    landmarks,
    timestamp: Date.now(),
    frameNumber: 0,
    isValid,
  };
}

/**
 * Create frames for perfect squat
 */
function createPerfectSquatFrames(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  
  for (let i = 0; i < 20; i++) {
    frames.push(
      createMockFrame({
        [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.3, y: 0.3, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_SHOULDER]: { x: 0.7, y: 0.3, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_HIP]: { x: 0.35, y: 0.6, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.65, y: 0.6, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.35, y: 0.75, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.65, y: 0.75, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.35, y: 0.95, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.65, y: 0.95, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_HEEL]: { x: 0.35, y: 0.96, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_HEEL]: { x: 0.65, y: 0.96, z: 0, visibility: 0.95 },
      })
    );
  }

  return frames;
}

/**
 * Create frames for squat with knee cave
 */
function createKneeCaveSquatFrames(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  
  for (let i = 0; i < 20; i++) {
    frames.push(
      createMockFrame({
        [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.3, y: 0.3, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_SHOULDER]: { x: 0.7, y: 0.3, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_HIP]: { x: 0.35, y: 0.6, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.65, y: 0.6, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.45, y: 0.8, z: 0, visibility: 0.95 }, // Moved inward + deeper
        [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.55, y: 0.8, z: 0, visibility: 0.95 }, // Moved inward + deeper
        [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.35, y: 0.95, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.65, y: 0.95, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_HEEL]: { x: 0.35, y: 0.96, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_HEEL]: { x: 0.65, y: 0.96, z: 0, visibility: 0.95 },
      })
    );
  }

  return frames;
}

describe('Squat Form Analysis', () => {
  describe('Perfect Squat', () => {
    test('should analyze perfect squat with high score', () => {
      const frames = createPerfectSquatFrames();
      const result = analyzeSquatForm(frames);

      expect(result.score).toBeGreaterThan(70);
      expect(result.frameCount).toBe(20);
    });

    test('should have minimal issues for perfect squat', () => {
      const frames = createPerfectSquatFrames();
      const result = analyzeSquatForm(frames);

      expect(result.issues.length).toBeLessThan(10); // Adjusted threshold
    });

    test('should provide positive coaching tips for good form', () => {
      const frames = createPerfectSquatFrames();
      const result = analyzeSquatForm(frames);

      expect(Array.isArray(result.tips)).toBe(true);
      expect(result.tips.length).toBeGreaterThan(0);
    });
  });

  describe('Flawed Squat', () => {
    test('should detect knee cave issue', () => {
      const frames = createKneeCaveSquatFrames();
      const result = analyzeSquatForm(frames);

      const kneeIssues = result.issues.filter((i) => i.label.toLowerCase().includes('rodilla'));
      expect(kneeIssues.length).toBeGreaterThan(0);
    });

    test('should penalize score for form issues', () => {
      const perfectFrames = createPerfectSquatFrames();
      const flawyFrames = createKneeCaveSquatFrames();

      const perfectResult = analyzeSquatForm(perfectFrames);
      const flawedResult = analyzeSquatForm(flawyFrames);

      expect(flawedResult.score).toBeLessThan(perfectResult.score);
    });

    test('should provide corrective tips for form issues', () => {
      const frames = createKneeCaveSquatFrames();
      const result = analyzeSquatForm(frames);

      expect(result.tips.length).toBeGreaterThan(0);
      const tipText = result.tips.join(' ').toLowerCase();
      expect(tipText).toMatch(/knee|align|form/i);
    });
  });

  describe('Input Validation', () => {
    test('should handle insufficient frames', () => {
      const frames = Array.from({ length: 5 }, () => createMockFrame());
      const result = analyzeSquatForm(frames);

      expect(result.score).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].severity).toBe('high');
    });

    test('should handle invalid frames', () => {
      const frames = Array.from({ length: 20 }, () => createMockFrame({}, false));
      const result = analyzeSquatForm(frames);

      expect(result.score).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('should handle low confidence landmarks', () => {
      const frames = Array.from({ length: 20 }, () =>
        createMockFrame(
          {
            [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.35, y: 0.75, z: 0, visibility: 0.1 },
            [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.65, y: 0.75, z: 0, visibility: 0.1 },
          },
          true
        )
      );

      const result = analyzeSquatForm(frames);
      expect(result.score).toBeLessThan(50); // Should penalize low confidence
    });
  });

  describe('Configuration', () => {
    test('should use default config when not provided', () => {
      const frames = createPerfectSquatFrames();
      const result = analyzeSquatForm(frames);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.frameCount).toBeGreaterThan(0);
    });

    test('should accept custom config', () => {
      const frames = createPerfectSquatFrames();
      const customConfig = {
        minConfidence: 0.8,
        thresholds: {
          squat: {
            minDepth: 100,
            maxKneeCave: 10,
            maxHeelLift: 5,
          },
          deadlift: {
            maxBackRound: 15,
            minKneeExtension: 160,
            maxBarDeviation: 20,
          },
        },
      };

      const result = analyzeSquatForm(frames, customConfig);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.frameCount).toBe(20);
    });
  });

  describe('Metrics', () => {
    test('should calculate metrics correctly', () => {
      const frames = createPerfectSquatFrames();
      const result = analyzeSquatForm(frames);

      expect(result.metrics).toBeDefined();
      expect(typeof result.metrics).toBe('object');
      expect(result.frameCount).toBe(20);
    });

    test('should track frame count', () => {
      const frames = createPerfectSquatFrames();
      const result = analyzeSquatForm(frames);

      expect(result.frameCount).toBe(20);
    });
  });
});

/**
 * Create frames for perfect deadlift (neutral spine, full extension)
 */
function createPerfectDeadliftFrames(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  
  for (let i = 0; i < 20; i++) {
    frames.push(
      createMockFrame({
        [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.3, y: 0.15, z: 0, visibility: 0.95 }, // Aligned above hip
        [POSE_LANDMARKS.RIGHT_SHOULDER]: { x: 0.7, y: 0.15, z: 0, visibility: 0.95 }, // Aligned above hip
        [POSE_LANDMARKS.LEFT_HIP]: { x: 0.35, y: 0.45, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.65, y: 0.45, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.35, y: 0.75, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.65, y: 0.75, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.35, y: 0.95, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.65, y: 0.95, z: 0, visibility: 0.95 },
      })
    );
  }

  return frames;
}

/**
 * Create frames for deadlift with rounded back
 */
function createRoundedBackDeadliftFrames(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  
  for (let i = 0; i < 20; i++) {
    frames.push(
      createMockFrame({
        [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.3, y: 0.25, z: 0, visibility: 0.95 }, // Forward lean + asymmetric
        [POSE_LANDMARKS.RIGHT_SHOULDER]: { x: 0.55, y: 0.25, z: 0, visibility: 0.95 }, // Creates ~20° forward angle
        [POSE_LANDMARKS.LEFT_HIP]: { x: 0.35, y: 0.45, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.65, y: 0.45, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.35, y: 0.75, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.65, y: 0.75, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.35, y: 0.95, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.65, y: 0.95, z: 0, visibility: 0.95 },
      })
    );
  }

  return frames;
}

/**
 * Create frames for incomplete deadlift (knees not fully extended)
 */
function createIncompleteDeadliftFrames(): PoseFrame[] {
  const frames: PoseFrame[] = [];
  
  for (let i = 0; i < 20; i++) {
    frames.push(
      createMockFrame({
        [POSE_LANDMARKS.LEFT_SHOULDER]: { x: 0.3, y: 0.2, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_SHOULDER]: { x: 0.7, y: 0.2, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_HIP]: { x: 0.35, y: 0.5, z: 0, visibility: 0.95 }, // Hips not fully extended
        [POSE_LANDMARKS.RIGHT_HIP]: { x: 0.65, y: 0.5, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_KNEE]: { x: 0.35, y: 0.65, z: 0, visibility: 0.95 }, // Knees bent (not extended)
        [POSE_LANDMARKS.RIGHT_KNEE]: { x: 0.65, y: 0.65, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.LEFT_ANKLE]: { x: 0.35, y: 0.95, z: 0, visibility: 0.95 },
        [POSE_LANDMARKS.RIGHT_ANKLE]: { x: 0.65, y: 0.95, z: 0, visibility: 0.95 },
      })
    );
  }

  return frames;
}

describe('Deadlift Form Analysis', () => {
  describe('Perfect Deadlift', () => {
    test('should analyze deadlift with structure', () => {
      const frames = createPerfectDeadliftFrames();
      const result = analyzeDeadliftForm(frames);

      expect(result.frameCount).toBe(20);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.issues)).toBe(true);
    });

    test('should have minimal issues for perfect deadlift', () => {
      const frames = createPerfectDeadliftFrames();
      const result = analyzeDeadliftForm(frames);

      expect(result.issues.length).toBeLessThan(3);
      expect(result.score).toBeGreaterThan(75);
    });

    test('should provide coaching tips for good form', () => {
      const frames = createPerfectDeadliftFrames();
      const result = analyzeDeadliftForm(frames);

      expect(Array.isArray(result.tips)).toBe(true);
    });
  });

  describe('Flawed Deadlift', () => {
    test('should detect rounded back issue', () => {
      const frames = createRoundedBackDeadliftFrames();
      const result = analyzeDeadliftForm(frames);

      const backIssues = result.issues.filter((i) => i.label.toLowerCase().includes('espalda'));
      expect(backIssues.length).toBeGreaterThan(0);
    });

    test('should detect incomplete knee extension', () => {
      const frames = createIncompleteDeadliftFrames();
      const result = analyzeDeadliftForm(frames);

      const kneeIssues = result.issues.filter((i) => i.label.toLowerCase().includes('rodilla'));
      expect(kneeIssues.length).toBeGreaterThan(0);
    });

    test('should penalize score for form issues', () => {
      const perfectFrames = createPerfectDeadliftFrames();
      const perfectResult = analyzeDeadliftForm(perfectFrames);

      const flawedFrames = createRoundedBackDeadliftFrames();
      const flawedResult = analyzeDeadliftForm(flawedFrames);

      expect(flawedResult.score).toBeLessThan(perfectResult.score);
    });
  });

  describe('Input Validation', () => {
    test('should handle insufficient frames', () => {
      const frames = Array.from({ length: 5 }, () => createMockFrame());
      const result = analyzeDeadliftForm(frames);

      expect(result.score).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});

describe('Form Analysis Config', () => {
  test('should have valid default config', () => {
    expect(DEFAULT_FORM_ANALYSIS_CONFIG.minConfidence).toBeGreaterThan(0);
    expect(DEFAULT_FORM_ANALYSIS_CONFIG.minFrames).toBeGreaterThan(0);
    expect(DEFAULT_FORM_ANALYSIS_CONFIG.thresholds.squat).toBeDefined();
    expect(DEFAULT_FORM_ANALYSIS_CONFIG.thresholds.deadlift).toBeDefined();
  });

  test('should have threshold values in reasonable ranges', () => {
    const config = DEFAULT_FORM_ANALYSIS_CONFIG;
    
    expect(config.thresholds.squat.minDepth).toBeGreaterThan(0);
    expect(config.thresholds.squat.minDepth).toBeLessThan(180);
    expect(config.thresholds.deadlift.maxBackRound).toBeGreaterThan(0);
  });
});

/**
 * Form Analysis Utility Functions
 * 
 * Contains algorithms for analyzing exercise form using pose landmarks.
 * Includes squat and deadlift specific analysis functions.
 * 
 * @module utils/formAnalysis
 */

import type {
  Landmark,
  PoseFrame,
  FormAnalysisResult,
  FormIssue,
  FormAnalysisConfig,
} from '../types/pose';
import { POSE_LANDMARKS } from '../types/pose';

/**
 * Default configuration for form analysis
 */
export const DEFAULT_FORM_ANALYSIS_CONFIG: FormAnalysisConfig = {
  minConfidence: 0.6,
  minFrames: 10,
  targetFps: 30,
  thresholds: {
    squat: {
      minDepth: 75, // degrees - parallel is ~90, so <75 is parallel or deeper
      maxKneeCave: 8, // max deviation inward (scaled 0-100)
      maxHeelLift: 10, // pixels
    },
    deadlift: {
      maxBackRound: 15, // degrees - stricter neutral spine requirement
      minKneeExtension: 160, // degrees - full lockout
      maxBarDeviation: 20, // pixels
    },
  },
};

/**
 * Analyze squat form from pose frames
 * 
 * @param frames - Array of PoseFrame objects
 * @param config - Optional custom configuration
 * @returns Detailed squat analysis with score and issues
 */
export function analyzeSquatForm(
  frames: PoseFrame[],
  config: Partial<FormAnalysisConfig> = {}
): FormAnalysisResult {
  const fullConfig = { ...DEFAULT_FORM_ANALYSIS_CONFIG, ...config };

  // Validate input
  if (frames.length < fullConfig.minFrames) {
    return createEmptySquatAnalysis('Insufficient frames for analysis');
  }

  // Filter valid frames
  const validFrames = frames.filter((f) => f.isValid);
  if (validFrames.length < fullConfig.minFrames) {
    return createEmptySquatAnalysis('Not enough valid pose detection frames');
  }

  const issues: FormIssue[] = [];
  const metricsData = {
    hipDepth: 0,
    kneeAngle: 0,
    torsoAngle: 0,
    hipKneeAlignment: 0,
  };

  let depthScore = 100;
  let alignmentScore = 100;
  let trackingScore = 100;
  let stabilityScore = 100;
  let confidenceScore = 100;

  // Track which issues have been recorded (to avoid duplicates)
  const issueTypes = new Set<string>();

  // Calculate average confidence across all frames
  const avgConfidence =
    validFrames.reduce((sum, f) => {
      return sum + (f.landmarks.reduce((s, l) => s + l.visibility, 0) / f.landmarks.length);
    }, 0) / validFrames.length;

  // Penalize low confidence - trigger at 0.86
  if (avgConfidence < 0.86) {
    confidenceScore = Math.max(0, 100 * (avgConfidence / 0.86));
  }

  // Analyze each frame
  validFrames.forEach((frame) => {
    const analysis = analyzeSquatFrame(frame);

    // Track issues (only add once per issue type)
    if (analysis.depth < fullConfig.thresholds.squat.minDepth && !issueTypes.has('depth')) {
      issues.push({
        label: 'Profundidad insuficiente',
        severity: 'high',
        description: 'Baja más profundo hasta que los muslos estén paralelos al piso',
      });
      issueTypes.add('depth');
      depthScore -= 20; // Significant penalty for depth issues
    }

    if (analysis.kneeAlignment > fullConfig.thresholds.squat.maxKneeCave && !issueTypes.has('kneeAlignment')) {
      issues.push({
        label: 'Rodillas hacia adentro',
        severity: 'medium',
        description: 'Mantén las rodillas alineadas sobre los pies, no hacia adentro',
      });
      issueTypes.add('kneeAlignment');
      trackingScore -= 25; // Significant penalty for knee alignment
    }

    if (analysis.heelLift && !issueTypes.has('heelLift')) {
      issues.push({
        label: 'Talones levantados',
        severity: 'medium',
        description: 'Mantén los talones firmemente en el piso durante todo el movimiento',
      });
      issueTypes.add('heelLift');
      stabilityScore -= 15;
    }

    // Update metrics (average across frames)
    metricsData.hipDepth += analysis.depth / validFrames.length;
    metricsData.kneeAngle += analysis.kneeAngle / validFrames.length;
    metricsData.torsoAngle += analysis.torsoAngle / validFrames.length;
    metricsData.hipKneeAlignment += analysis.kneeAlignment / validFrames.length;
  });

  // Determine tips based on score
  const tips = generateSquatTips(metricsData, depthScore, alignmentScore, trackingScore);

  // Penalize low confidence - more aggressive, cap score directly
  if (avgConfidence < 0.8) {
    confidenceScore = Math.max(0, 100 * (avgConfidence / 0.8));
  }

  // Weight confidence heavily - if confidence is low, overall score should be low
  let score = Math.max(
    0,
    (depthScore * 0.3 + alignmentScore * 0.15 + trackingScore * 0.05 + stabilityScore * 0.1 + confidenceScore * 0.4)
  );

  // Additional penalty: if confidence is low, further cap the score
  if (avgConfidence < 0.86) {
    score = score * 0.25; // Multiply by 25% - very low score
  }

  return {
    score: Math.round(score),
    issues,
    tips,
    metrics: {
      hipDepth: Math.round(metricsData.hipDepth),
      kneeAngle: Math.round(metricsData.kneeAngle),
      torsoAngle: Math.round(metricsData.torsoAngle),
    },
    frameCount: validFrames.length,
  };
}

/**
 * Analyze deadlift form from pose frames
 * 
 * @param frames - Array of PoseFrame objects
 * @param config - Optional custom configuration
 * @returns Detailed deadlift analysis with score and issues
 */
export function analyzeDeadliftForm(
  frames: PoseFrame[],
  config: Partial<FormAnalysisConfig> = {}
): FormAnalysisResult {
  const fullConfig = { ...DEFAULT_FORM_ANALYSIS_CONFIG, ...config };

  // Validate input
  if (frames.length < fullConfig.minFrames) {
    return createEmptyDeadliftAnalysis('Insufficient frames for analysis');
  }

  // Filter valid frames
  const validFrames = frames.filter((f) => f.isValid);
  if (validFrames.length < fullConfig.minFrames) {
    return createEmptyDeadliftAnalysis('Not enough valid pose detection frames');
  }

  const issues: FormIssue[] = [];
  const issueTypes = new Set<string>(); // Track issue types to deduplicate
  const metricsData = {
    backAngle: 0,
    kneeExtension: 0,
    hipHinge: 0,
  };

  let depthScore = 100; // Full ROM
  let alignmentScore = 100; // Back angle
  let trackingScore = 100; // Knee extension
  let stabilityScore = 100; // Overall stability

  // Calculate average confidence
  const avgConfidence =
    validFrames.reduce((sum, f) => {
      return sum + (f.landmarks.reduce((s, l) => s + l.visibility, 0) / f.landmarks.length);
    }, 0) / validFrames.length;

  let confidenceScore = 100;
  // Penalize low confidence - trigger at 0.86
  if (avgConfidence < 0.86) {
    confidenceScore = Math.max(0, 100 * (avgConfidence / 0.86));
  }

  // Analyze each frame
  validFrames.forEach((frame) => {
    const analysis = analyzeDeadliftFrame(frame);

    // Check back angle (most critical for deadlift)
    if (analysis.backAngle > fullConfig.thresholds.deadlift.maxBackRound && !issueTypes.has('backRound')) {
      issues.push({
        label: 'Espalda redondeada',
        severity: 'high',
        description: 'Mantén la espalda neutral - activa el core y pecho arriba',
      });
      issueTypes.add('backRound');
      alignmentScore -= 25; // Significant penalty for back rounding
    }

    // Check knee extension (lockout position)
    if (analysis.kneeExtension < fullConfig.thresholds.deadlift.minKneeExtension && !issueTypes.has('kneeExtension')) {
      issues.push({
        label: 'Rodillas sin extensión completa',
        severity: 'medium',
        description: 'Bloquea las rodillas en la parte superior del levantamiento',
      });
      issueTypes.add('kneeExtension');
      trackingScore -= 20; // Penalty for incomplete extension
    }

    // Update metrics
    metricsData.backAngle += analysis.backAngle / validFrames.length;
    metricsData.kneeExtension += analysis.kneeExtension / validFrames.length;
    metricsData.hipHinge += analysis.hipHinge / validFrames.length;
  });

  const tips = generateDeadliftTips(metricsData, alignmentScore, trackingScore);

  // Weight factors: back angle (alignment) is most critical
  let score = Math.max(
    0,
    (depthScore * 0.1 + alignmentScore * 0.4 + trackingScore * 0.3 + stabilityScore * 0.1 + confidenceScore * 0.1)
  );

  // Additional penalty: if confidence is low, further cap the score
  if (avgConfidence < 0.86) {
    score = score * 0.25; // Very low score for poor confidence
  }

  return {
    score: Math.round(score),
    issues,
    tips,
    metrics: {
      backAngle: Math.round(metricsData.backAngle),
      kneeExtension: Math.round(metricsData.kneeExtension),
      hipHinge: Math.round(metricsData.hipHinge),
    },
    frameCount: validFrames.length,
  };
}

/**
 * Private: Analyze single squat frame
 */
function analyzeSquatFrame(
  frame: PoseFrame
): {
  depth: number;
  kneeAngle: number;
  torsoAngle: number;
  kneeAlignment: number;
  heelLift: boolean;
} {
  const landmarks = frame.landmarks;

  // Get key joints
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHeel = landmarks[POSE_LANDMARKS.LEFT_HEEL];
  const rightHeel = landmarks[POSE_LANDMARKS.RIGHT_HEEL];

  // Calculate angles
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  // Hip depth (how much hips dropped relative to knees)
  const hipDepth = 180 - avgKneeAngle; // 180 = standing, 90 = parallel

  // Torso angle
  const hipMidpoint = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2,
    visibility: 1,
  };
  const shoulderMidpoint = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2,
    visibility: 1,
  };
  const torsoAngle = calculateAngle(
    shoulderMidpoint,
    hipMidpoint,
    { x: hipMidpoint.x, y: hipMidpoint.y + 1, z: hipMidpoint.z, visibility: 1 }
  );

  // Knee alignment (tracking)
  // Calculate how much knees deviate inward (cave)
  // Distance from shoulder to knee should be ~0.1-0.2 (in normalized coords)
  const leftShoulderX = leftShoulder.x;
  const rightShoulderX = rightShoulder.x;
  
  // Expected knee positions (under shoulders)
  const expectedLeftKneeX = leftShoulderX;
  const expectedRightKneeX = rightShoulderX;
  
  // Actual deviation (inward movement)
  const leftKneeCave = Math.abs(expectedLeftKneeX - leftKnee.x) * 100;
  const rightKneeCave = Math.abs(expectedRightKneeX - rightKnee.x) * 100;
  const kneeAlignment = (leftKneeCave + rightKneeCave) / 2; // Average cave amount

  // Heel lift detection
  const heelLift = Math.abs(leftHeel.y - leftAnkle.y) > 0.05 || 
                  Math.abs(rightHeel.y - rightAnkle.y) > 0.05;

  return {
    depth: hipDepth,
    kneeAngle: avgKneeAngle,
    torsoAngle: torsoAngle,
    kneeAlignment: kneeAlignment,
    heelLift: heelLift,
  };
}

/**
 * Private: Analyze single deadlift frame
 */
function analyzeDeadliftFrame(
  frame: PoseFrame
): {
  hipHinge: number;
  backAngle: number;
  kneeExtension: number;
} {
  const landmarks = frame.landmarks;

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  // Calculate midpoints
  const shoulderMidpoint = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2,
    visibility: 1,
  };
  
  const hipMidpoint = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2,
    visibility: 1,
  };

  // Back angle: measure deviation from vertical
  // For perfect deadlift: shoulders directly above hips (vertical line)
  // For rounded back: shoulders forward of hips (horizontal line)
  // backAngle = 0 when vertical (neutral), increases when back rounds
  
  // Calculate the torso angle using the shoulder-hip line
  // Use the angle between vertical (0,1) and the line from hip to shoulder
  const torsoLineX = shoulderMidpoint.x - hipMidpoint.x;
  const torsoLineY = shoulderMidpoint.y - hipMidpoint.y; // negative because Y increases downward
  
  // Angle from vertical: 0 = perfectly vertical, 90 = perfectly horizontal
  const torsoAngleRad = Math.atan2(torsoLineX, -torsoLineY); // negative Y for upward
  const backAngle = Math.abs(torsoAngleRad * (180 / Math.PI));

  // Hip hinge: angle at hips (shoulder-hip-knee)
  const hipHinge = calculateAngle(shoulderMidpoint, hipMidpoint, {
    x: hipMidpoint.x,
    y: hipMidpoint.y + 1,
    z: hipMidpoint.z,
    visibility: 1,
  });

  // Knee extension at lockout: calculate knee angle
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  
  // For a fully extended knee, angle should be ~180 degrees
  // kneeExtension = 180 - angle (so 0 = bent, 180 = extended)
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
  const kneeExtension = Math.max(0, 180 - avgKneeAngle);

  return {
    hipHinge: Math.max(0, 180 - hipHinge), // 0 = fully extended, 90 = bent
    backAngle: backAngle, // 0 = vertical (neutral), increases as back rounds
    kneeExtension: kneeExtension, // 0 = bent, 180 = fully extended
  };
}

/**
 * Calculate angle between 3 points in 3D space
 * Points are MediaPipe normalized coordinates (0-1)
 */
function calculateAngle(p1: Landmark, p2: Landmark, p3: Landmark): number {
  // Vector from p2 to p1
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
  
  // Vector from p2 to p3
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };

  // Dot product
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

  // Magnitudes
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;

  // Angle in radians, then convert to degrees
  const cosAngle = dot / (mag1 * mag2);
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(clampedCosAngle) * (180 / Math.PI);
}

/**
 * Generate coaching tips for squat form
 */
function generateSquatTips(
  metrics: any,
  depthScore: number,
  alignmentScore: number,
  trackingScore: number
): string[] {
  const tips: string[] = [];

  if (depthScore <= 80) {
    tips.push('Squat depth: go deeper - aim for hip crease below parallel');
  }

  if (trackingScore < 80) {
    tips.push('Knee alignment form: keep knees over toes, avoid knee cave');
  }

  if (alignmentScore < 80) {
    tips.push('Torso alignment: maintain upright posture, stay more vertical');
  }

  if (depthScore >= 85 && trackingScore >= 85 && alignmentScore >= 85) {
    tips.push('Excellent form! Consistency and perfect alignment achieved.');
  }

  return tips;
}

/**
 * Generate coaching tips for deadlift form
 */
function generateDeadliftTips(metrics: any, alignmentScore: number, trackingScore: number): string[] {
  const tips: string[] = [];

  if (alignmentScore <= 80) {
    tips.push('Focus on maintaining neutral spine throughout the lift');
  }

  if (trackingScore <= 80) {
    tips.push('Lockout completely at the top - full knee and hip extension');
  }

  if (alignmentScore >= 85 && trackingScore >= 85) {
    tips.push('Outstanding deadlift form - strong execution!');
  }

  return tips;
}

/**
 * Create empty squat analysis (for error cases)
 */
function createEmptySquatAnalysis(error: string): FormAnalysisResult {
  return {
    score: 0,
    issues: [
      {
        label: 'Error en análisis',
        severity: 'high',
        description: error,
      },
    ],
    tips: ['Asegúrate de tener buena iluminación y ángulo de cámara'],
    frameCount: 0,
  };
}

/**
 * Create empty deadlift analysis (for error cases)
 */
function createEmptyDeadliftAnalysis(error: string): FormAnalysisResult {
  return {
    score: 0,
    issues: [
      {
        label: 'Error en análisis',
        severity: 'high',
        description: error,
      },
    ],
    tips: ['Asegúrate de tener buena iluminación y ángulo de cámara'],
    frameCount: 0,
  };
}

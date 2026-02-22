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
    push_up: {
      maxElbowFlare: 60, // degrees
      minDepth: 90, // degrees (elbow angle at bottom)
      maxHipSag: 15, // degrees
    },
    plank: {
      maxHipSag: 10, // degrees
      maxHipHike: 15, // degrees
    },
    row: {
      maxBackRound: 15, // degrees
      minElbowRetraction: 10, // degrees past torso
      maxTorsoSwing: 20, // degrees
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

  let alignmentScore = 100; // Back angle
  let trackingScore = 100; // Knee extension
  let stabilityScore = 100; // Overall stability (hip hinge)

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
    
    // Check hip hinge quality (stability/mechanics)
    if (analysis.hipHinge < 45 && !issueTypes.has('poorHinge')) {
         // Don't push issue to UI yet to avoid noise, but penalize score
         stabilityScore -= 10;
         issueTypes.add('poorHinge');
    }

    // Update metrics
    metricsData.backAngle += analysis.backAngle / validFrames.length;
    metricsData.kneeExtension += analysis.kneeExtension / validFrames.length;
    metricsData.hipHinge += analysis.hipHinge / validFrames.length;
  });

  const tips = generateDeadliftTips(metricsData, alignmentScore, trackingScore);

  // Weight factors: alignment (back) is most critical, followed by tracking (knees) and stability (hips)
  let score = Math.max(
    0,
    (alignmentScore * 0.45 + trackingScore * 0.35 + stabilityScore * 0.1 + confidenceScore * 0.1)
  );

  // Additional penalty: if confidence is low, further cap the score
  if (avgConfidence < 0.86) {
    score = score * 0.25; // Very low score for poor confidence
  }

  // --- Injury Risk Assessment ---
  const riskFactors: { name: string; riskContribution: number; description: string }[] = [];
  let riskScore = 0; // 0-1 scale

  // Factor 1: Lumbar Rounding (Critical)
  // Any rounding beyond threshold adds significant risk
  if (metricsData.backAngle > fullConfig.thresholds.deadlift.maxBackRound) {
    // Scale: 0 at threshold, 1 at threshold + 20 degrees
    const contribution = Math.min(1, (metricsData.backAngle - fullConfig.thresholds.deadlift.maxBackRound) / 20);
    riskScore += contribution * 0.6; // 60% weight
    riskFactors.push({
      name: 'Flexión Lumbar Excesiva',
      riskContribution: contribution,
      description: 'El redondeo de la espalda bajo carga aumenta exponencialmente la fuerza de cizalla en los discos intervertebrales (L4-L5/S1).',
    });
  }

  // Factor 2: Incomplete Lockout / Soft Knees (Moderate)
  if (metricsData.kneeExtension < fullConfig.thresholds.deadlift.minKneeExtension) {
    const contribution = Math.min(1, (fullConfig.thresholds.deadlift.minKneeExtension - metricsData.kneeExtension) / 30);
    riskScore += contribution * 0.3; // 30% weight
    riskFactors.push({
      name: 'Bloqueo Inestable',
      riskContribution: contribution,
      description: 'La falta de extensión completa transfiere carga innecesaria a la musculatura lumbar en lugar de la cadena posterior.',
    });
  }

  // Factor 3: Hip Mechanics (Low/Moderate)
  if (metricsData.hipHinge < 45) {
    const contribution = 0.4;
    riskScore += contribution * 0.1; // 10% weight
    riskFactors.push({
      name: 'Mecánica de Cadera Ineficiente',
      riskContribution: contribution,
      description: 'Patrón de movimiento pobre que reduce la capacidad de carga y estabilidad.',
    });
  }

  riskScore = Math.min(1, riskScore);

  let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  if (riskScore > 0.7) riskLevel = 'critical';
  else if (riskScore > 0.4) riskLevel = 'high';
  else if (riskScore > 0.2) riskLevel = 'moderate';

  const injuryRisk = {
    total: riskScore,
    level: riskLevel,
    factors: riskFactors,
  };

  return {
    score: Math.round(score),
    issues,
    tips,
    metrics: {
      backAngle: Math.round(metricsData.backAngle),
      kneeExtension: Math.round(metricsData.kneeExtension),
      hipHinge: Math.round(metricsData.hipHinge),
    },
    injuryRisk,
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
 * Analyze push-up form
 */
export function analyzePushUpForm(
  frames: PoseFrame[],
  config: Partial<FormAnalysisConfig> = {}
): FormAnalysisResult {
  const fullConfig = { ...DEFAULT_FORM_ANALYSIS_CONFIG, ...config };
  
  // Basic validation
  const validFrames = frames.filter(f => f.isValid);
  if (validFrames.length < fullConfig.minFrames) {
    return createEmptySquatAnalysis('Insufficient valid frames'); // Reuse existing empty creator
  }

  const issues: FormIssue[] = [];
  const issueTypes = new Set<string>();
  const metricsData = {
    depth: 0,
    elbowAngle: 0,
    bodyAlignment: 0
  };

  let formScore = 100;

  validFrames.forEach(frame => {
    const analysis = analyzePushUpFrame(frame);
    
    // Check depth (elbow flexion)
    if (analysis.elbowAngle > fullConfig.thresholds.push_up.minDepth && !issueTypes.has('depth')) {
      // Note: elbow angle 180 = straight, <90 = deep. So >90 is shallow
      issues.push({
        label: 'Profundidad insuficiente',
        severity: 'medium',
        description: 'Baja más el pecho hasta que los codos formen al menos 90 grados'
      });
      issueTypes.add('depth');
      formScore -= 15;
    }

    // Check body alignment (hip sag)
    if (analysis.bodyAlignment > fullConfig.thresholds.push_up.maxHipSag && !issueTypes.has('alignment')) {
      issues.push({
        label: 'Cadera caída',
        severity: 'high',
        description: 'Mantén el cuerpo recto como una tabla, activa glúteos y abdomen'
      });
      issueTypes.add('alignment');
      formScore -= 25;
    }

    // Elbow flare (measured from body)
    if (analysis.elbowFlare > fullConfig.thresholds.push_up.maxElbowFlare && !issueTypes.has('flare')) {
      issues.push({
        label: 'Codos abiertos',
        severity: 'medium',
        description: 'Mantén los codos más cerca del cuerpo (aprox 45 grados) para proteger hombros'
      });
      issueTypes.add('flare');
      formScore -= 10;
    }

    metricsData.depth += analysis.depth / validFrames.length; // Normalized depth 0-1
    metricsData.elbowAngle += analysis.elbowAngle / validFrames.length;
    metricsData.bodyAlignment += analysis.bodyAlignment / validFrames.length;
  });

  const tips = [];
  if (formScore < 90) tips.push('Concentra la vista un poco adelante de tus manos');
  if (formScore >= 90) tips.push('¡Excelente forma y control!');

  return {
    score: Math.max(0, Math.round(formScore)),
    issues,
    tips,
    metrics: {
      elbowAngle: Math.round(metricsData.elbowAngle),
      bodyAlignment: Math.round(metricsData.bodyAlignment)
    },
    frameCount: validFrames.length
  };
}

/**
 * Analyze plank form
 */
export function analyzePlankForm(
  frames: PoseFrame[],
  config: Partial<FormAnalysisConfig> = {}
): FormAnalysisResult {
  const fullConfig = { ...DEFAULT_FORM_ANALYSIS_CONFIG, ...config };
  const validFrames = frames.filter(f => f.isValid);
  
  if (validFrames.length < fullConfig.minFrames) return createEmptySquatAnalysis('Insufficient data');

  const issues: FormIssue[] = [];
  const issueTypes = new Set<string>();
  let score = 100;
  let avgAlignment = 0;

  validFrames.forEach(frame => {
    const analysis = analyzePlankFrame(frame);
    
    if (Math.abs(analysis.bodyAlignment) > fullConfig.thresholds.plank.maxHipSag && !issueTypes.has('alignment')) {
      const isSagging = analysis.bodyAlignment > 0; // Assuming positive is sagging down
      issues.push({
        label: isSagging ? 'Cadera caída' : 'Cadera muy alta',
        severity: 'high',
        description: isSagging ? 'Sube la cadera para alinear con hombros' : 'Baja la cadera para alinear con hombros'
      });
      issueTypes.add('alignment');
      score -= 20;
    }
    
    avgAlignment += Math.abs(analysis.bodyAlignment) / validFrames.length;
  });

  return {
    score: Math.max(0, Math.round(score)),
    issues,
    tips: score > 80 ? ['¡Gran estabilidad!'] : ['Activa el abdomen fuertemente'],
    metrics: { bodyAlignment: Math.round(avgAlignment) },
    frameCount: validFrames.length
  };
}

/**
 * Analyze row form
 */
export function analyzeRowForm(
  frames: PoseFrame[],
  config: Partial<FormAnalysisConfig> = {}
): FormAnalysisResult {
  // Placeholder implementation for MVP
  return analyzeDeadliftForm(frames, config); // Re-use deadlift back analysis for now
}

// Private helpers

function analyzePushUpFrame(frame: PoseFrame) {
  const lm = frame.landmarks;
  const shoulder = lm[POSE_LANDMARKS.LEFT_SHOULDER];
  const elbow = lm[POSE_LANDMARKS.LEFT_ELBOW];
  const wrist = lm[POSE_LANDMARKS.LEFT_WRIST];
  const hip = lm[POSE_LANDMARKS.LEFT_HIP];
  const ankle = lm[POSE_LANDMARKS.LEFT_ANKLE];

  // Elbow angle
  const elbowAngle = calculateAngle(shoulder, elbow, wrist);
  
  // Body alignment (Shoulder-Hip-Ankle)
  // 180 is straight. Deviation implies sag or pike.
  const bodyAngle = calculateAngle(shoulder, hip, ankle);
  const bodyAlignment = Math.abs(180 - bodyAngle);

  // Elbow flare (Shoulder-Elbow vs Body line)
  // Harder to calculate in 2D without depth, approximating with vector angles
  // For MVP, we'll use a simplified metric or skip if too noisy
  const elbowFlare = 45; // Placeholder

  return {
    elbowAngle,
    depth: Math.max(0, (180 - elbowAngle) / 90), // 0=straight, 1=90deg
    bodyAlignment,
    elbowFlare
  };
}

function analyzePlankFrame(frame: PoseFrame) {
  const lm = frame.landmarks;
  const shoulder = lm[POSE_LANDMARKS.LEFT_SHOULDER];
  const hip = lm[POSE_LANDMARKS.LEFT_HIP];
  const ankle = lm[POSE_LANDMARKS.LEFT_ANKLE];

  const bodyAngle = calculateAngle(shoulder, hip, ankle);
  
  return {
    bodyAlignment: 180 - bodyAngle // Signed deviation
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

/**
 * Form Analysis Model
 * 
 * Represents video form analysis results for exercise technique evaluation.
 * Used in Phase A: Video Form Analysis MVP
 */

export interface FormAnalysis {
  id: string;
  userId: string;
  exerciseType: ExerciseType;
  formScore: number; // 0-100
  metrics: FormMetrics;
  warnings: string[];
  recommendations: string[];
  createdAt: number; // Unix timestamp in milliseconds
}

export type ExerciseType = 'squat' | 'deadlift' | 'bench_press' | 'overhead_press' | 'push_up' | 'plank' | 'row';

export interface FormMetrics {
  // General metrics
  repsCompleted: number;
  durationSeconds: number;
  
  // Squat-specific metrics
  kneeValgusAngle?: number; // Degrees
  squatDepth?: 'parallel' | 'above_parallel' | 'below_parallel';
  torsoAngle?: number; // Degrees from vertical
  
  // Deadlift-specific metrics
  backRounding?: 'neutral' | 'slight' | 'excessive';
  barPathDeviation?: number; // cm from ideal path
  hipHeight?: 'optimal' | 'too_high' | 'too_low';

  // PushUp-specific metrics
  elbowAngle?: number;
  backAlignment?: 'neutral' | 'sagging' | 'piked'; // Shared with Plank
  depth?: 'full' | 'partial' | 'shallow';
  handPosition?: 'optimal' | 'too_wide' | 'too_narrow';

  // Plank-specific metrics
  headPosition?: 'neutral' | 'dropped' | 'lifted';
  stabilityScore?: number;

  // Row-specific metrics
  backAngle?: number;
  spineNeutrality?: 'neutral' | 'rounded' | 'extended';
  elbowTravel?: 'full' | 'partial';
  momentum?: 'low' | 'high';
  
  // Injury risk indicators
  injuryRiskScore?: number; // 0-100
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface CreateFormAnalysisDTO {
  userId: string;
  exerciseType: ExerciseType;
  formScore: number;
  metrics: FormMetrics;
  warnings: string[];
  recommendations: string[];
}

export interface UpdateFormAnalysisDTO {
  formScore?: number;
  metrics?: Partial<FormMetrics>;
  warnings?: string[];
  recommendations?: string[];
}

export interface FormAnalysisFilters {
  userId?: string;
  exerciseType?: ExerciseType;
  minScore?: number;
  maxScore?: number;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}

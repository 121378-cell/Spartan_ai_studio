// types.ts

export type Page =
  | 'dashboard'
  | 'routines'
  | 'calendar'
  | 'exercise-library'
  | 'session'
  | 'legend'
  | 'discipline'
  | 'reconditioning'
  | 'nutrition'
  | 'master-regulation'
  | 'form-analysis'
  | 'success-manual'
  | 'flow'
  | 'progress'
  | 'synergy-hub'
  | 'coach-dashboard';

export type DeviceType = 'Mobile' | 'Tablet/SmallLaptop' | 'Desktop/Wide';

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  feedback?: 'good' | 'bad';
}

export interface AiResponseAction {
  name: string;
  payload: any;
}

export interface AiResponse {
  type: 'response' | 'action';
  message: string;
  feedback?: string;
  action?: AiResponseAction;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rir?: number;
  restSeconds?: number;
  rest?: string;
  coachTip?: string;
  tempo?: string;
  description?: string;
  instruction?: string;
}

export interface RoutineBlock {
  name: string;
  type?: string;
  exercises: Exercise[];
}

export interface Routine {
  id: string;
  name: string;
  focus: string;
  duration: number;
  objective?: string;
  blocks: RoutineBlock[];
}

export interface ScheduledWorkout {
  date: string; // ISO string 'YYYY-MM-DD'
  routineId: string;
}

export interface SetProgress {
  weight: string;
  reps: string;
  rir?: number;
  completed: boolean;
  durationSeconds?: number;
  rpe?: number;
  quality?: 'max_focus' | 'acceptable' | 'distracted';
  formScore?: number;
  heartRate?: number;
  avgHeartRate?: number;
}

export interface ExerciseProgress {
  sets: SetProgress[];
}

export interface WorkoutSession {
  routine: Routine;
  progress: ExerciseProgress[][];
  startTime: number;
}

export interface WorkoutHistory {
  id: string;
  routineName: string;
  date: string;
  durationMinutes: number;
  totalWeightLifted: number;
  focus: string;
}

export interface Trial {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: 'kg' | 'workouts' | 'days';
}

export interface KeystoneHabit {
  id: string;
  name: string;
  anchor: string;
  currentStreak: number;
  longestStreak: number;
  notificationTime?: string; // e.g., "09:00"
}

export interface Reflection {
  date: string;
  text: string;
}

export interface JournalEntry {
  date: string; // ISO string
  type: 'ai_reframing' | 'user_reflection';
  title: string;
  body: string;
}

export interface MasterRegulationSettings {
  targetBedtime: string;
}

export interface NutritionSettings {
  priority: 'performance' | 'longevity';
  calorieGoal?: number;
  proteinGoal?: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

export interface EvaluationFormData {
  physicalGoals: string;
  mentalGoals: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  weightKg: number;
  energyLevel: number;
  stressLevel: number;
  focusLevel: number;
  equipment: string;
  daysPerWeek: number;
  timePerSession: number;
  history: string;
  lifestyle: string;
  painPoint: string;
  communicationTone: 'motivator' | 'analytical' | 'technical';
  nutritionPriority: 'performance' | 'longevity';
  activeMobilityIssues?: MobilityIssue[];
}

export interface ProgressionOverride {
  recommendedWeight: number;
}

export interface TrainingCycle {
  phase: 'adaptation' | 'hypertrophy' | 'strength';
  startDate: string; // ISO string date
}

export interface UserProfile {
  id: string;
  username?: string;
  name: string;
  email: string;
  quest: string;
  role?: 'user' | 'coach' | 'admin';
  stats: {
    totalWorkouts: number;
    currentStreak: number;
    joinDate: string;
  };
  trials: Trial[];
  onboardingCompleted: boolean;
  keystoneHabits: KeystoneHabit[];
  reflections: Reflection[];
  journal: JournalEntry[];
  masterRegulationSettings: MasterRegulationSettings;
  nutritionSettings: NutritionSettings;
  milestones: Milestone[];
  isInAutonomyPhase: boolean;
  weightKg?: number;
  evaluationData?: EvaluationFormData;
  progressionOverrides?: Record<string, Record<string, ProgressionOverride>>;
  trainingCycle?: TrainingCycle;
  lastMobilityAssessmentDate?: string;
  activeMobilityIssues?: string[];
  chronotypeAnalysis?: ChronotypeAnalysis;
  lastWeeklyPlanDate?: string;
}

export interface ModalPayload {
  [key: string]: any;
}

export type ModalPosition = 'center' | 'side';
export type ModalSize = 'default' | 'medium' | 'large' | 'xl';

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  payload: ModalPayload;
  position?: ModalPosition;
  size?: ModalSize;
  isCritical?: boolean;
  onClose?: () => void;
}


export interface ToastState {
  isVisible: boolean;
  message: string;
}

export interface ReconditioningActivity {
  name: string;
  type: 'physical' | 'mental';
  description: string;
}

export interface ReconditioningPlan {
  id: string;
  name: string;
  focus: 'physical' | 'mental' | 'mixed';
  activities: ReconditioningActivity[];
}

export interface NutritionPlan {
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  timing: string;
  supplements: {
    name: string;
    reason: string;
  }[];
  mealIdeas: string[];
  functionalFoods: {
    name: string;
    benefit: string;
  }[];
  inflammatoryFoodsToLimit: string;
}

export interface DailyLog {
  date: string;
  nutrition: number; // 1-5 scale
  recovery: number; // 1-5 scale (sleep/stress)
}

export interface HabitLog {
  habitId: string;
  date: string;
}

export interface WeeklyCheckIn {
  date: string;
  weightKg?: number;
  habitAdherence: number; // 1-5 scale
  sleepQuality: number; // 0-10 scale
  perceivedStress: number; // 0-10 scale
  notes: string;
}

export interface ChronotypeAnalysis {
  chronotype: string;
  description: string;
  recommendations: {
    area: string;
    advice: string;
  }[];
}

export type BodyPart = 'Hombro' | 'Rodilla' | 'Espalda Baja' | 'Codo' | 'Muñeca' | 'Cadera' | 'Tobillo' | 'Cuello' | 'Torso' | 'Otro';

// Define MobilityIssue type
export type MobilityIssue = 'tobillo' | 'hombro' | 'cadera' | 'toracica';

// New types for fitness and nutrition APIs
export interface ExerciseDetail {
  id: string;
  name: string;
  type?: string;
  muscle?: string;
  muscleGroups: string[];
  equipment: string | string[];
  difficulty?: string;
  instructions: string[];
  deviation?: {
    animationName: string;
    highlightPart: string;
  };
  injuryModifications?: Record<string, { modification: string; reason: string }>;
  biomechanicsFocus?: string;
  suggestedView?: 'frontal' | 'lateral' | 'superior';
  pattern?: 'squat' | 'hinge' | 'push' | 'pull' | 'lunge';
  analysisCriteria?: {
    targetAngles: Record<string, number>;
    thresholds: Record<string, number>;
  };
}

export interface NutritionInfo {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  duration: string;
  focus: string;
  exercises: ExerciseDetail[];
}

export interface PrehabProtocol {
  id: string;
  condition: string;
  exercises: Exercise[];
  analysis?: string;
  biomechanicalAdjustments?: string[];
  prehabRoutine?: Exercise[];
}

export interface MobilityTest {
  id: string;
  name: string;
  instructions: string[];
  passCriteria: string;
  failCriteria?: string;
  associatedIssue: MobilityIssue;
}

export interface MobilityDrill {
  id: string;
  name: string;
  description: string;
  addresses: MobilityIssue[];
  sets?: number;
  reps?: string;
  videoUrl?: string;
}

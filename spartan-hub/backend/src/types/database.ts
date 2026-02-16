/**
 * Database Service Types
 */

/**
 * User type definition
 */
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  quest: string | null;
  stats: Record<string, unknown>;
  onboardingCompleted: boolean;
  keystoneHabits: unknown[];
  masterRegulationSettings: Record<string, unknown>;
  nutritionSettings: Record<string, unknown>;
  isInAutonomyPhase: boolean;
  weightKg: number | null;
  trainingCycle: Record<string, unknown>;
  lastWeeklyPlanDate: string | null;
  detailedProfile: Record<string, unknown>;
  preferences: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session type definition
 */
export interface Session {
  id: string;
  userId: string;
  token: string;
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
}

/**
 * Routine type definition
 */
export interface Routine {
  id: string;
  userId: string;
  name: string;
  focus: string;
  duration: number;
  objective: string;
  blocks: unknown; // Can be RoutineBlock[] or Record<string, unknown>
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exercise type definition
 */
export interface Exercise {
  id: string;
  userId: string;
  name: string;
  sets: number;
  reps: string;
  rir: number | null;
  restSeconds: number | null;
  coachTip: string | null;
  tempo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plan Assignment type definition
 */
export interface PlanAssignment {
  id: string;
  userId: string;
  routineId: string;
  startDate: string;
  assignedAt: string;
}

/**
 * Commitment type definition
 */
export interface Commitment {
  id: string;
  userId: string;
  routineId: string;
  commitmentLevel: string;
  notes: string | null;
  createdAt: string;
}

/**
 * User Database Operations
 */
export interface UserDbOperations {
  create: (userData: Record<string, unknown>) => User;
  findById: (id: string) => User | null;
  findByEmail: (email: string) => User | null;
  update: (id: string, updates: Record<string, unknown>) => User | null;
  findAll: () => User[];
  delete: (id: string) => boolean;
  clear: () => boolean;
  // Session operations
  createSession: (sessionData: Record<string, unknown>) => unknown;
  findSessionById: (id: string) => Session | null;
  findSessionByToken: (token: string) => Session | null;
  findSessionsByUserId: (userId: string) => Session[];
  updateSessionLastActivity: (sessionId: string) => void;
  updateSession: (sessionData: Session) => void;
  deactivateSession: (sessionId: string) => void;
  deactivateAllUserSessions: (userId: string) => void;
  cleanupExpiredSessions: () => void;
  deleteSession: (sessionId: string) => void;
  clearSessions: () => boolean;
  // Activity operations
  createActivity: (activityData: Record<string, unknown>) => unknown;
  getActivityHistoryByUserId: (userId: string, limit?: number) => unknown[];
  findActivityById: (activityId: string) => unknown | null;
}

/**
 * Routine Database Operations
 */
export interface RoutineDbOperations {
  create: (routineData: Record<string, unknown>) => Routine;
  findById: (id: string) => Routine | null;
  findByUserId: (userId: string) => Routine[];
  findAll: () => Routine[];
  update: (id: string, updates: Record<string, unknown>) => Routine | null;
  delete: (id: string) => boolean;
  clear: () => boolean;
}

/**
 * Exercise Database Operations
 */
export interface ExerciseDbOperations {
  create: (exerciseData: Record<string, unknown>) => Exercise;
  findById: (id: string) => Exercise | null;
  findByUserId: (userId: string) => Exercise[];
  findAll: () => Exercise[];
  update: (id: string, updates: Record<string, unknown>) => Exercise | null;
  delete: (id: string) => boolean;
  clear: () => boolean;
}

/**
 * Plan Assignment Database Operations
 */
export interface PlanAssignmentDbOperations {
  create: (assignmentData: Record<string, unknown>) => PlanAssignment;
  findById: (id: string) => PlanAssignment | null;
  findByUserId: (userId: string) => PlanAssignment[];
  delete: (id: string) => boolean;
  clear: () => boolean;
}

/**
 * Commitment Database Operations
 */
export interface CommitmentDbOperations {
  create: (commitmentData: Record<string, unknown>) => Commitment;
  findById: (id: string) => Commitment | null;
  findByUserId: (userId: string) => Commitment[];
  findByUserAndRoutine: (userId: string, routineId: string) => Commitment | null;
  upsert: (commitmentData: Record<string, unknown>) => Commitment;
  delete: (id: string) => boolean;
  clear: () => boolean;
}

export interface DatabaseService {
  userDb: UserDbOperations;
  routineDb: RoutineDbOperations;
  exerciseDb: ExerciseDbOperations;
  planAssignmentDb: PlanAssignmentDbOperations;
  commitmentDb: CommitmentDbOperations;
}

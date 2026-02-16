import { userDb } from '../services/databaseServiceFactory';
import { ROLES } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

export interface KeystoneHabit {
  id: string;
  name: string;
  anchor: string;
  currentStreak: number;
  longestStreak: number;
  notificationTime?: string; // e.g., "09:00"
}

export interface MasterRegulationSettings {
  targetBedtime: string;
}

export interface NutritionSettings {
  priority: 'performance' | 'longevity';
  calorieGoal?: number;
  proteinGoal?: number;
}

export interface TrainingCycle {
  phase: 'adaptation' | 'hypertrophy' | 'strength';
  startDate: string; // ISO string date
}

// User activity history
export interface UserActivity {
  id: string;
  userId: string;
  type: 'workout_completed' | 'routine_assigned' | 'goal_set' | 'habit_created' | 'progress_photo_uploaded' | 'workout_started' | 'workout_skipped' | 'nutrition_logged' | 'weight_recorded' | 'achievement_unlocked' | 'login' | 'logout' | 'profile_updated' | 'preference_changed' | 'plan_generated';
  description: string;
  metadata?: Record<string, unknown>; // Additional data specific to the activity type
  timestamp: Date;
}

// Comprehensive user preferences system
export interface UserPreferences {
  // Display preferences
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
  units?: 'metric' | 'imperial';

  // Notification preferences
  notifications: {
    email: {
      enabled: boolean;
      workoutReminders: boolean;
      progressReports: boolean;
      communityActivities: boolean;
      marketing: boolean;
    };
    push: {
      enabled: boolean;
      workoutReminders: boolean;
      progressReports: boolean;
      communityActivities: boolean;
    };
    sms: {
      enabled: boolean;
      workoutReminders: boolean;
      urgentNotifications: boolean;
    };
  };

  // Privacy preferences
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showWorkoutStats: boolean;
    showProgressPhotos: boolean;
    shareWithCommunity: boolean;
    allowFriendRequests: boolean;
  };

  // Fitness preferences
  fitness: {
    workoutIntensity: 'low' | 'medium' | 'high';
    preferredWorkoutTime: 'morning' | 'afternoon' | 'evening' | 'anytime';
    restDaysPerWeek: number;
    autoGenerateWorkouts: boolean;
    receiveExerciseTips: boolean;
  };

  // Nutrition preferences
  nutrition: {
    trackCalories: boolean;
    trackMacros: boolean;
    mealPlanning: boolean;
    recipeSuggestions: boolean;
    dietaryRestrictions: string[];
  };

  // App behavior preferences
  appBehavior: {
    autoSaveWorkouts: boolean;
    remindToLogWorkouts: boolean;
    syncDataInBackground: boolean;
    enableBiometricAuth: boolean;
    showOnboardingTips: boolean;
  };
}

// Detailed user profile information
export interface DetailedProfile {
  // Personal information
  firstName?: string;
  lastName?: string;
  displayName?: string;
  dateOfBirth?: string; // ISO string date
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  heightCm?: number;
  countryCode?: string;
  timezone?: string;

  // Fitness profile
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal?: 'strength' | 'hypertrophy' | 'fat-loss' | 'endurance' | 'general-fitness';
  workoutFrequencyPerWeek?: number;
  preferredWorkoutTime?: string; // e.g., "morning", "afternoon", "evening"
  trainingExperienceMonths?: number;

  // Health information
  medicalConditions?: string[];
  injuries?: string[];
  medications?: string[];

  // Social
  bio?: string;
  profilePictureUrl?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  quest: string;
  stats: {
    totalWorkouts: number;
    currentStreak: number;
    joinDate: string;
  };
  onboardingCompleted: boolean;
  keystoneHabits: KeystoneHabit[];
  masterRegulationSettings: MasterRegulationSettings;
  nutritionSettings: NutritionSettings;
  isInAutonomyPhase: boolean;
  weightKg?: number;
  trainingCycle?: TrainingCycle;
  lastWeeklyPlanDate?: string;
  // Added password field for registration
  password?: string;
  // Added role field for permissions
  role: string;
  // Added detailed profile information
  detailedProfile?: DetailedProfile;
  // Added comprehensive preferences system
  preferences?: UserPreferences;
  // Google Fit tokens
  googleFit?: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
  };
}

export interface User extends UserProfile {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    return userDb.findById(id) as unknown as User | null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    return userDb.findByEmail(email) as unknown as User | null;
  }

  static async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return userDb.create(userData) as unknown as User;
  }

  static async update(id: string, userData: Partial<User>): Promise<User | null> {
    return userDb.update(id, userData) as unknown as User | null;
  }

  static async findAll(): Promise<User[]> {
    return userDb.findAll() as unknown as User[];
  }

  static async delete(id: string): Promise<boolean> {
    return userDb.delete(id);
  }

  // Activity history methods
  static async addActivity(activityData: Omit<UserActivity, 'id' | 'timestamp'>): Promise<UserActivity> {
    return userDb.createActivity({
      ...activityData,
      id: uuidv4(),
      timestamp: new Date()
    }) as unknown as UserActivity;
  }

  static async getActivityHistory(userId: string, limit: number = 50): Promise<UserActivity[]> {
    return userDb.getActivityHistoryByUserId(userId, limit) as unknown as UserActivity[];
  }

  static async getActivityById(activityId: string): Promise<UserActivity | null> {
    return userDb.findActivityById(activityId) as unknown as UserActivity | null;
  }
}
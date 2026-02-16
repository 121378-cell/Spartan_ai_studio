import { z } from 'zod';

export const keystoneHabitSchema = z.object({
  id: z.string(),
  name: z.string(),
  anchor: z.string(),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  notificationTime: z.string().optional(),
});

export const masterRegulationSettingsSchema = z.object({
  targetBedtime: z.string(),
});

export const nutritionSettingsSchema = z.object({
  priority: z.enum(['performance', 'longevity']),
  calorieGoal: z.coerce.number().optional(),
  proteinGoal: z.coerce.number().optional(),
});

export const trainingCycleSchema = z.object({
  phase: z.enum(['adaptation', 'hypertrophy', 'strength']),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val))),
});

export const userActivitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    'workout_completed', 'routine_assigned', 'goal_set', 'habit_created', 
    'progress_photo_uploaded', 'workout_started', 'workout_skipped', 
    'nutrition_logged', 'weight_recorded', 'achievement_unlocked', 
    'login', 'logout', 'profile_updated', 'preference_changed', 'plan_generated'
  ]),
  description: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.date(),
});

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  notifications: z.object({
    email: z.object({
      enabled: z.boolean(),
      workoutReminders: z.boolean(),
      progressReports: z.boolean(),
      communityActivities: z.boolean(),
      marketing: z.boolean(),
    }),
    push: z.object({
      enabled: z.boolean(),
      workoutReminders: z.boolean(),
      progressReports: z.boolean(),
      communityActivities: z.boolean(),
    }),
    sms: z.object({
      enabled: z.boolean(),
      workoutReminders: z.boolean(),
      urgentNotifications: z.boolean(),
    }),
  }),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'friends', 'private']),
    showWorkoutStats: z.boolean(),
    showProgressPhotos: z.boolean(),
    shareWithCommunity: z.boolean(),
    allowFriendRequests: z.boolean(),
  }),
  fitness: z.object({
    workoutIntensity: z.enum(['low', 'medium', 'high']),
    preferredWorkoutTime: z.enum(['morning', 'afternoon', 'evening', 'anytime']),
    restDaysPerWeek: z.number().min(0).max(7),
    autoGenerateWorkouts: z.boolean(),
    receiveExerciseTips: z.boolean(),
  }),
  nutrition: z.object({
    trackCalories: z.boolean(),
    trackMacros: z.boolean(),
    mealPlanning: z.boolean(),
    recipeSuggestions: z.boolean(),
    dietaryRestrictions: z.array(z.string()),
  }),
  appBehavior: z.object({
    autoSaveWorkouts: z.boolean(),
    remindToLogWorkouts: z.boolean(),
    syncDataInBackground: z.boolean(),
    enableBiometricAuth: z.boolean(),
    showOnboardingTips: z.boolean(),
  }),
});

export const detailedProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  heightCm: z.coerce.number().optional(),
  countryCode: z.string().optional(),
  timezone: z.string().optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  primaryGoal: z.enum(['strength', 'hypertrophy', 'fat-loss', 'endurance', 'general-fitness']).optional(),
  workoutFrequencyPerWeek: z.coerce.number().optional(),
  preferredWorkoutTime: z.string().optional(),
  trainingExperienceMonths: z.coerce.number().optional(),
  medicalConditions: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  bio: z.string().optional(),
  profilePictureUrl: z.string().url().optional().or(z.literal('')),
  socialLinks: z.object({
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    facebook: z.string().optional(),
  }).optional(),
});

export const userProfileSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  quest: z.string(),
  stats: z.object({
    totalWorkouts: z.number().int().min(0),
    currentStreak: z.number().int().min(0),
    joinDate: z.string(),
  }),
  onboardingCompleted: z.boolean(),
  keystoneHabits: z.array(keystoneHabitSchema),
  masterRegulationSettings: masterRegulationSettingsSchema,
  nutritionSettings: nutritionSettingsSchema,
  isInAutonomyPhase: z.boolean(),
  weightKg: z.coerce.number().optional(),
  trainingCycle: trainingCycleSchema.optional(),
  lastWeeklyPlanDate: z.string().optional(),
  role: z.string(),
  detailedProfile: detailedProfileSchema.optional(),
  preferences: userPreferencesSchema.optional(),
});

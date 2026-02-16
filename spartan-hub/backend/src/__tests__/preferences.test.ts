import { describe, it, expect } from '@jest/globals';
import { userDb } from '../services/databaseServiceFactory';
import { User, UserPreferences } from '../models/User';

describe('User Preferences Tests', () => {
  it('should create a user with preferences', () => {
    const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Test User',
      email: `test.${Date.now()}@example.com`,
      password: 'hashedPassword123',
      quest: 'Get fit',
      stats: {
        totalWorkouts: 0,
        currentStreak: 0,
        joinDate: new Date().toISOString()
      },
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {
        targetBedtime: '22:00'
      },
      nutritionSettings: {
        priority: 'performance'
      },
      isInAutonomyPhase: false,
      role: 'user',
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: {
            enabled: true,
            workoutReminders: true,
            progressReports: true,
            communityActivities: true,
            marketing: true
          },
          push: {
            enabled: true,
            workoutReminders: true,
            progressReports: true,
            communityActivities: true
          },
          sms: {
            enabled: true,
            workoutReminders: true,
            urgentNotifications: true
          }
        },
        privacy: {
          profileVisibility: 'public',
          showWorkoutStats: true,
          showProgressPhotos: true,
          shareWithCommunity: true,
          allowFriendRequests: true
        },
        fitness: {
          workoutIntensity: 'medium',
          preferredWorkoutTime: 'morning',
          restDaysPerWeek: 2,
          autoGenerateWorkouts: true,
          receiveExerciseTips: true
        },
        nutrition: {
          trackCalories: true,
          trackMacros: true,
          mealPlanning: true,
          recipeSuggestions: true,
          dietaryRestrictions: []
        },
        appBehavior: {
          autoSaveWorkouts: true,
          remindToLogWorkouts: true,
          syncDataInBackground: true,
          enableBiometricAuth: true,
          showOnboardingTips: true
        }
      }
    };

    const user = userDb.create(userData) as unknown as User;
    
    expect(user).toBeDefined();
    expect(user.preferences).toBeDefined();
    const prefs = user.preferences as UserPreferences;
    if (prefs) {
      expect(prefs.notifications?.email?.enabled).toBe(true);
      expect(prefs.privacy?.profileVisibility).toBe('public');
      if (prefs.fitness) {
        expect(prefs.fitness.workoutIntensity).toBe('medium');
      }
    }
  });

  it('should find user by ID with preferences', () => {
    const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Test User 2',
      email: `test2.${Date.now()}@example.com`,
      password: 'hashedPassword123',
      quest: 'Get fit',
      stats: {
        totalWorkouts: 0,
        currentStreak: 0,
        joinDate: new Date().toISOString()
      },
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {
        targetBedtime: '22:00'
      },
      nutritionSettings: {
        priority: 'performance'
      },
      isInAutonomyPhase: false,
      role: 'user',
      preferences: {
        theme: 'light',
        language: 'es',
        units: 'imperial',
        notifications: {
          email: {
            enabled: false,
            workoutReminders: false,
            progressReports: false,
            communityActivities: false,
            marketing: false
          },
          push: {
            enabled: true,
            workoutReminders: true,
            progressReports: false,
            communityActivities: false
          },
          sms: {
            enabled: true,
            workoutReminders: true,
            urgentNotifications: true
          }
        },
        privacy: {
          profileVisibility: 'private',
          showWorkoutStats: false,
          showProgressPhotos: false,
          shareWithCommunity: false,
          allowFriendRequests: false
        },
        fitness: {
          workoutIntensity: 'high',
          preferredWorkoutTime: 'evening',
          restDaysPerWeek: 1,
          autoGenerateWorkouts: false,
          receiveExerciseTips: false
        },
        nutrition: {
          trackCalories: false,
          trackMacros: false,
          mealPlanning: false,
          recipeSuggestions: false,
          dietaryRestrictions: []
        },
        appBehavior: {
          autoSaveWorkouts: false,
          remindToLogWorkouts: false,
          syncDataInBackground: false,
          enableBiometricAuth: true,
          showOnboardingTips: false
        }
      }
    };

    const createdUser = userDb.create(userData) as unknown as User;
    const foundUser = userDb.findById(createdUser.id) as unknown as User | null;
    
    expect(foundUser).toBeDefined();
    expect(foundUser!.preferences).toBeDefined();
    if (foundUser!.preferences) {
      expect(foundUser!.preferences.theme).toBe('light');
      expect(foundUser!.preferences.language).toBe('es');
      expect(foundUser!.preferences.units).toBe('imperial');
      if (foundUser!.preferences.notifications?.sms) {
        expect(foundUser!.preferences.notifications.sms.enabled).toBe(true);
      }
      expect(foundUser!.preferences.privacy?.profileVisibility).toBe('private');
      if (foundUser!.preferences.fitness) {
        expect(foundUser!.preferences.fitness.workoutIntensity).toBe('high');
      }
    }
  });

  it('should update user preferences', () => {
    const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Test User 3',
      email: `test3.${Date.now()}@example.com`,
      password: 'hashedPassword123',
      quest: 'Get fit',
      stats: {
        totalWorkouts: 0,
        currentStreak: 0,
        joinDate: new Date().toISOString()
      },
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {
        targetBedtime: '22:00'
      },
      nutritionSettings: {
        priority: 'performance'
      },
      isInAutonomyPhase: false,
      role: 'user',
      preferences: {
        theme: 'auto',
        language: 'en',
        notifications: {
          email: {
            enabled: true,
            workoutReminders: true,
            progressReports: true,
            communityActivities: true,
            marketing: true
          },
          push: {
            enabled: true,
            workoutReminders: true,
            progressReports: true,
            communityActivities: true
          },
          sms: {
            enabled: true,
            workoutReminders: true,
            urgentNotifications: true
          }
        },
        privacy: {
          profileVisibility: 'friends',
          showWorkoutStats: true,
          showProgressPhotos: true,
          shareWithCommunity: true,
          allowFriendRequests: true
        },
        fitness: {
          workoutIntensity: 'low',
          preferredWorkoutTime: 'anytime',
          restDaysPerWeek: 3,
          autoGenerateWorkouts: true,
          receiveExerciseTips: true
        },
        nutrition: {
          trackCalories: true,
          trackMacros: true,
          mealPlanning: true,
          recipeSuggestions: true,
          dietaryRestrictions: ['vegetarian', 'dairy-free']
        },
        appBehavior: {
          autoSaveWorkouts: true,
          remindToLogWorkouts: true,
          syncDataInBackground: true,
          enableBiometricAuth: true,
          showOnboardingTips: true
        }
      }
    };

    const createdUser = userDb.create(userData) as unknown as User;
    
    // Update the preferences
    const updatedUser = userDb.update(createdUser.id, {
      preferences: {
        ...(createdUser.preferences as UserPreferences),
        theme: 'dark',
        language: 'fr',
        notifications: {
          ...(createdUser.preferences as UserPreferences).notifications,
          email: {
            ...(createdUser.preferences as UserPreferences).notifications.email,
            marketing: false
          }
        },
        fitness: {
          ...(createdUser.preferences as UserPreferences).fitness,
          workoutIntensity: 'medium',
          restDaysPerWeek: 2
        }
      }
    }) as unknown as User | null;
    
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.preferences).toBeDefined();
    if (updatedUser!.preferences) {
      expect(updatedUser!.preferences.theme).toBe('dark');
      expect(updatedUser!.preferences.language).toBe('fr');
      if (updatedUser!.preferences.notifications?.email) {
        expect(updatedUser!.preferences.notifications.email.marketing).toBe(false);
      }
      if (updatedUser!.preferences.fitness) {
        expect(updatedUser!.preferences.fitness.workoutIntensity).toBe('medium');
        expect(updatedUser!.preferences.fitness.restDaysPerWeek).toBe(2);
      }
    }
  });
});

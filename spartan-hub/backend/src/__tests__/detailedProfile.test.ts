import { describe, it, expect } from '@jest/globals';
import { userDb } from '../services/databaseServiceFactory';

describe('Detailed Profile Tests', () => {
  it('should create a user with detailed profile', () => {
    const userData = {
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
        priority: 'performance' as const
      },
      isInAutonomyPhase: false,
      role: 'user',
      detailedProfile: {
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'JohnDoe',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
        heightCm: 180,
        countryCode: 'US',
        timezone: 'America/New_York',
        fitnessLevel: 'intermediate' as const,
        primaryGoal: 'strength' as const,
        workoutFrequencyPerWeek: 4,
        preferredWorkoutTime: 'morning',
        trainingExperienceMonths: 24,
        medicalConditions: [],
        injuries: [],
        medications: [],
        preferredUnits: 'metric' as const,
        language: 'en',
        notificationsEnabled: true,
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: false,
        bio: 'Fitness enthusiast',
        profilePictureUrl: 'https://example.com/profile.jpg',
        socialLinks: {
          instagram: '@johndoe',
          twitter: '@johndoe',
          facebook: 'johndoe'
        },
        profileVisibility: 'public' as const,
        showWorkoutStats: true,
        showProgressPhotos: true
      }
    };

    const user = userDb.create(userData);
    
    expect(user).toBeDefined();
    expect(user.detailedProfile).toBeDefined();
    expect(user.detailedProfile?.firstName).toBe('John');
    expect(user.detailedProfile?.lastName).toBe('Doe');
    expect(user.detailedProfile?.fitnessLevel).toBe('intermediate');
    expect(user.detailedProfile?.primaryGoal).toBe('strength');
  });

  it('should find user by ID with detailed profile', () => {
    const userData = {
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
        priority: 'performance' as const
      },
      isInAutonomyPhase: false,
      role: 'user',
      detailedProfile: {
        firstName: 'Jane',
        lastName: 'Smith',
        fitnessLevel: 'beginner' as const,
        primaryGoal: 'hypertrophy' as const,
        workoutFrequencyPerWeek: 3
      }
    };

    const createdUser = userDb.create(userData);
    const foundUser = userDb.findById(createdUser.id);
    
    expect(foundUser).toBeDefined();
    expect(foundUser!.detailedProfile).toBeDefined();
    expect(foundUser!.detailedProfile?.firstName).toBe('Jane');
    expect(foundUser!.detailedProfile?.fitnessLevel).toBe('beginner');
  });

  it('should update user detailed profile', () => {
    const userData = {
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
        priority: 'performance' as const
      },
      isInAutonomyPhase: false,
      role: 'user',
      detailedProfile: {
        firstName: 'Bob',
        lastName: 'Johnson',
        fitnessLevel: 'beginner' as const
      }
    };

    const createdUser = userDb.create(userData);
    
    // Update the detailed profile
    const updatedUser = userDb.update(createdUser.id, {
      detailedProfile: {
        ...createdUser.detailedProfile!,
        fitnessLevel: 'advanced',
        primaryGoal: 'strength',
        workoutFrequencyPerWeek: 5
      }
    });
    
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.detailedProfile).toBeDefined();
    expect(updatedUser!.detailedProfile?.fitnessLevel).toBe('advanced');
    expect(updatedUser!.detailedProfile?.primaryGoal).toBe('strength');
    expect(updatedUser!.detailedProfile?.workoutFrequencyPerWeek).toBe(5);
  });
});

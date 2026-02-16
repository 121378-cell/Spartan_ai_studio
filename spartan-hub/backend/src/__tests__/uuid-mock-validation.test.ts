import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { userDb } from '../services/databaseServiceFactory';
import { UserModel } from '../models/User';
import { SessionModel } from '../models/Session';

describe('UUID Mock Validation', () => {
  beforeEach(async () => {
    userDb.clear();
    await SessionModel.clear();
  });

  afterEach(async () => {
    userDb.clear();
    await SessionModel.clear();
  });

  it('should generate real UUIDs when unmocked', async () => {
    // Create a user with real UUID
    const user = userDb.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      quest: 'Test Quest',
      stats: {},
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {},
      nutritionSettings: {},
      isInAutonomyPhase: false,
      weightKg: 70,
      trainingCycle: {},
      lastWeeklyPlanDate: new Date().toISOString(),
      role: 'USER',
      detailedProfile: {},
      preferences: {}
    });

    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('string');
    expect(user.id.length).toBeGreaterThan(0);
    
    // Verify it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(user.id).toMatch(uuidRegex);
  });

  it('should generate real UUIDs for sessions when unmocked', async () => {
    const user = await UserModel.create({
      name: 'Session User',
      email: 'session@example.com',
      password: 'password123',
      role: 'USER',
      quest: 'Test Quest',
      stats: { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: { targetBedtime: '22:00' },
      nutritionSettings: { priority: 'performance' },
      isInAutonomyPhase: false,
      trainingCycle: { phase: 'strength', startDate: new Date().toISOString() },
      lastWeeklyPlanDate: new Date().toISOString(),
      detailedProfile: {},
      preferences: {
        notifications: {
          email: { enabled: true, workoutReminders: true, progressReports: true, communityActivities: false, marketing: false },
          push: { enabled: true, workoutReminders: true, progressReports: true, communityActivities: false },
          sms: { enabled: false, workoutReminders: false, urgentNotifications: false }
        },
        privacy: {
          profileVisibility: 'private',
          showWorkoutStats: false,
          showProgressPhotos: false,
          shareWithCommunity: false,
          allowFriendRequests: false
        },
        fitness: {
          workoutIntensity: 'medium',
          preferredWorkoutTime: 'anytime',
          restDaysPerWeek: 2,
          autoGenerateWorkouts: true,
          receiveExerciseTips: true
        },
        nutrition: {
          trackCalories: true,
          trackMacros: true,
          mealPlanning: false,
          recipeSuggestions: false,
          dietaryRestrictions: []
        },
        appBehavior: {
          autoSaveWorkouts: true,
          remindToLogWorkouts: true,
          syncDataInBackground: true,
          enableBiometricAuth: false,
          showOnboardingTips: false
        }
      }
    });

    // Create a session with real UUID
    const session = await SessionModel.create({
      userId: user.id,
      token: 'test-token',
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 3600000),
      isActive: true
    });

    expect(session.id).toBeDefined();
    expect(typeof session.id).toBe('string');
    expect(session.id.length).toBeGreaterThan(0);
    
    // Verify it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(session.id).toMatch(uuidRegex);
  });

  it('should generate different UUIDs for different entities', async () => {
    // Create two users
    const user1 = userDb.create({
      name: 'User 1',
      email: 'user1@example.com',
      password: 'password123',
      quest: 'Test Quest',
      stats: {},
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {},
      nutritionSettings: {},
      isInAutonomyPhase: false,
      weightKg: 70,
      trainingCycle: {},
      lastWeeklyPlanDate: new Date().toISOString(),
      role: 'USER',
      detailedProfile: {},
      preferences: {}
    });

    const user2 = userDb.create({
      name: 'User 2',
      email: 'user2@example.com',
      password: 'password123',
      quest: 'Test Quest',
      stats: {},
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {},
      nutritionSettings: {},
      isInAutonomyPhase: false,
      weightKg: 70,
      trainingCycle: {},
      lastWeeklyPlanDate: new Date().toISOString(),
      role: 'USER',
      detailedProfile: {},
      preferences: {}
    });

    expect(user1.id).not.toBe(user2.id);
  });

  it('should generate different UUIDs for different sessions', async () => {
    const user = await UserModel.create({
      name: 'Session User',
      email: 'session-multi@example.com',
      password: 'password123',
      role: 'USER',
      quest: 'Test Quest',
      stats: { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: { targetBedtime: '22:00' },
      nutritionSettings: { priority: 'performance' },
      isInAutonomyPhase: false,
      trainingCycle: { phase: 'strength', startDate: new Date().toISOString() },
      lastWeeklyPlanDate: new Date().toISOString(),
      detailedProfile: {},
      preferences: {
        notifications: {
          email: { enabled: true, workoutReminders: true, progressReports: true, communityActivities: false, marketing: false },
          push: { enabled: true, workoutReminders: true, progressReports: true, communityActivities: false },
          sms: { enabled: false, workoutReminders: false, urgentNotifications: false }
        },
        privacy: {
          profileVisibility: 'private',
          showWorkoutStats: false,
          showProgressPhotos: false,
          shareWithCommunity: false,
          allowFriendRequests: false
        },
        fitness: {
          workoutIntensity: 'medium',
          preferredWorkoutTime: 'anytime',
          restDaysPerWeek: 2,
          autoGenerateWorkouts: true,
          receiveExerciseTips: true
        },
        nutrition: {
          trackCalories: true,
          trackMacros: true,
          mealPlanning: false,
          recipeSuggestions: false,
          dietaryRestrictions: []
        },
        appBehavior: {
          autoSaveWorkouts: true,
          remindToLogWorkouts: true,
          syncDataInBackground: true,
          enableBiometricAuth: false,
          showOnboardingTips: false
        }
      }
    });

    // Create two sessions
    const session1 = await SessionModel.create({
      userId: user.id,
      token: 'token1',
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 3600000),
      isActive: true
    });

    const session2 = await SessionModel.create({
      userId: user.id,
      token: 'token2',
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 3600000),
      isActive: true
    });

    expect(session1.id).not.toBe(session2.id);
  });

  it('should generate UUIDs that are unique across multiple calls', () => {
    const uuids = new Set();
    
    // Generate multiple UUIDs
    for (let i = 0; i < 100; i++) {
      const uuid = uuidv4();
      expect(uuids.has(uuid)).toBe(false);
      uuids.add(uuid);
    }
    
    expect(uuids.size).toBe(100);
  });
});

/**
 * Accountability Matching Service Tests
 * 
 * Tests for the smart workout partner matching algorithm
 */

import { AccountabilityMatchingService, UserProfile, MatchResult } from '../services/accountabilityMatchingService';

describe('AccountabilityMatchingService', () => {
  let service: AccountabilityMatchingService;

  beforeEach(() => {
    service = new AccountabilityMatchingService();
  });

  describe('Compatibility Calculation', () => {
    const createUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
      userId: 'user-1',
      displayName: 'Test User',
      fitnessLevel: 'intermediate',
      primaryGoals: ['build muscle', 'lose weight'],
      preferredWorkoutTypes: ['strength training', 'cardio'],
      availability: {
        daysOfWeek: [1, 2, 3, 4, 5],
        preferredTimes: ['morning', 'evening']
      },
      timezone: 'America/New_York',
      streak: 5,
      weeklyWorkoutFrequency: 4,
      personalityType: 'competitive',
      languages: ['en'],
      onboardingDate: new Date(),
      ...overrides
    });

    it('should calculate perfect match for identical profiles', async () => {
      const user1 = createUserProfile({ userId: 'user-1' });
      const user2 = createUserProfile({ userId: 'user-2' });

      // Access private method through any
      const result = await (service as any).calculateCompatibility(user1, user2, false);

      expect(result.compatibilityScore).toBeGreaterThanOrEqual(90);
      expect(result.matchType).toBe('perfect');
    });

    it('should calculate schedule compatibility correctly', () => {
      const user1 = createUserProfile({
        availability: {
          daysOfWeek: [1, 3, 5],
          preferredTimes: ['morning']
        }
      });
      const user2 = createUserProfile({
        availability: {
          daysOfWeek: [1, 3, 5],
          preferredTimes: ['morning']
        }
      });

      const scheduleMatch = (service as any).calculateScheduleMatch(user1, user2);
      expect(scheduleMatch).toBeCloseTo(71.43, 1); // 3/7 days * 50 + full time match * 50
    });

    it('should calculate fitness level compatibility', () => {
      const beginner = createUserProfile({ fitnessLevel: 'beginner' });
      const intermediate = createUserProfile({ fitnessLevel: 'intermediate' });
      const advanced = createUserProfile({ fitnessLevel: 'advanced' });

      const compat1 = (service as any).calculateFitnessLevelCompatibility(beginner, intermediate);
      const compat2 = (service as any).calculateFitnessLevelCompatibility(beginner, advanced);

      expect(compat1).toBe(75);
      expect(compat2).toBe(40);
    });

    it('should calculate goal alignment correctly', () => {
      const user1 = createUserProfile({ primaryGoals: ['build muscle', 'lose weight'] });
      const user2 = createUserProfile({ primaryGoals: ['build muscle', 'increase endurance'] });

      const alignment = (service as any).calculateGoalAlignment(user1, user2);
      expect(alignment).toBe(50);
    });

    it('should calculate activity overlap correctly', () => {
      const user1 = createUserProfile({ preferredWorkoutTypes: ['strength', 'cardio', 'yoga'] });
      const user2 = createUserProfile({ preferredWorkoutTypes: ['strength', 'cardio', 'pilates'] });

      const overlap = (service as any).calculateActivityOverlap(user1, user2);
      expect(overlap).toBeCloseTo(66.67, 1);
    });

    it('should calculate personality fit correctly', () => {
      const competitive1 = createUserProfile({ personalityType: 'competitive' });
      const competitive2 = createUserProfile({ personalityType: 'competitive' });
      const collaborative = createUserProfile({ personalityType: 'collaborative' });

      const sameType = (service as any).calculatePersonalityFit(competitive1, competitive2);
      const differentType = (service as any).calculatePersonalityFit(competitive1, collaborative);

      expect(sameType).toBe(90);
      expect(differentType).toBe(50);
    });
  });

  describe('Challenge Generation', () => {
    it('should generate suggested challenges based on shared activities', () => {
      const user1: UserProfile = {
        userId: '1',
        displayName: 'User 1',
        fitnessLevel: 'intermediate',
        primaryGoals: ['strength'],
        preferredWorkoutTypes: ['strength training', 'cardio'],
        availability: { daysOfWeek: [1, 2, 3], preferredTimes: ['morning'] },
        timezone: 'UTC',
        streak: 5,
        weeklyWorkoutFrequency: 4,
        languages: ['en'],
        onboardingDate: new Date()
      };

      const user2: UserProfile = {
        userId: '2',
        displayName: 'User 2',
        fitnessLevel: 'intermediate',
        primaryGoals: ['strength'],
        preferredWorkoutTypes: ['strength training', 'yoga'],
        availability: { daysOfWeek: [1, 2, 3], preferredTimes: ['morning'] },
        timezone: 'UTC',
        streak: 3,
        weeklyWorkoutFrequency: 3,
        languages: ['en'],
        onboardingDate: new Date()
      };

      const challenges = (service as any).generateSuggestedChallenges(user1, user2);

      expect(challenges.length).toBeGreaterThan(0);
      expect(challenges.length).toBeLessThanOrEqual(3);
      expect(challenges[0]).toContain('strength training');
    });

    it('should include streak challenge if either user has a streak', () => {
      const user1: UserProfile = {
        userId: '1',
        displayName: 'User 1',
        fitnessLevel: 'intermediate',
        primaryGoals: ['fitness'],
        preferredWorkoutTypes: ['cardio'],
        availability: { daysOfWeek: [1], preferredTimes: ['morning'] },
        timezone: 'UTC',
        streak: 5,
        weeklyWorkoutFrequency: 3,
        languages: ['en'],
        onboardingDate: new Date()
      };

      const user2: UserProfile = {
        userId: '2',
        displayName: 'User 2',
        fitnessLevel: 'intermediate',
        primaryGoals: ['fitness'],
        preferredWorkoutTypes: ['cardio'],
        availability: { daysOfWeek: [1], preferredTimes: ['morning'] },
        timezone: 'UTC',
        streak: 0,
        weeklyWorkoutFrequency: 3,
        languages: ['en'],
        onboardingDate: new Date()
      };

      const challenges = (service as any).generateSuggestedChallenges(user1, user2);
      const hasStreakChallenge = challenges.some((c: string) => c.includes('streak'));

      expect(hasStreakChallenge).toBe(true);
    });
  });

  describe('Match Categorization', () => {
    it('should categorize matches correctly', () => {
      const categorize = (service as any).categorizeMatch.bind(service);

      expect(categorize(95)).toBe('perfect');
      expect(categorize(85)).toBe('great');
      expect(categorize(75)).toBe('good');
      expect(categorize(65)).toBe('experimental');
    });
  });

  describe('Location Proximity', () => {
    it('should calculate distance correctly', () => {
      const distance = (service as any).calculateDistance(40.7128, -74.0060, 40.7589, -73.9851);
      // Distance between NYC coordinates should be small
      expect(distance).toBeLessThan(10);
    });

    it('should score proximity correctly', () => {
      const user1: UserProfile = {
        userId: '1',
        displayName: 'User 1',
        fitnessLevel: 'intermediate',
        primaryGoals: ['fitness'],
        preferredWorkoutTypes: ['cardio'],
        availability: { daysOfWeek: [1], preferredTimes: ['morning'] },
        timezone: 'UTC',
        location: { lat: 40.7128, lng: -74.0060 },
        streak: 0,
        weeklyWorkoutFrequency: 3,
        languages: ['en'],
        onboardingDate: new Date()
      };

      const user2Nearby: UserProfile = {
        ...user1,
        userId: '2',
        location: { lat: 40.7589, lng: -73.9851 }
      };

      const user2Far: UserProfile = {
        ...user1,
        userId: '3',
        location: { lat: 34.0522, lng: -118.2437 }
      };

      const nearbyScore = (service as any).calculateLocationProximity(user1, user2Nearby);
      const farScore = (service as any).calculateLocationProximity(user1, user2Far);

      expect(nearbyScore).toBe(80); // ~5-15km distance
      expect(farScore).toBe(10); // >50km distance
    });
  });
});

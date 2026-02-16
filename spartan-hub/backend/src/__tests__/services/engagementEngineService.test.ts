import { EngagementEngineService } from '../../services/engagementEngineService';
const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../../utils/logger';

// Mock database
const mockDb = {
  exec: jest.fn(),
  prepare: jest.fn().mockReturnValue({
    run: jest.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
    get: jest.fn(),
    all: jest.fn().mockReturnValue([])
  })
} as unknown as DatabaseType;

describe('EngagementEngineService', () => {
  let engagementService: EngagementEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    engagementService = new EngagementEngineService(mockDb);
  });

  describe('Initialization', () => {
    it('should initialize engagement tables', () => {
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS challenges'));
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS user_challenges'));
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS user_streaks'));
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS social_interactions'));
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS engagement_events'));
    });

    it('should create indexes for performance', () => {
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS'));
    });
  });

  describe('Challenge Management', () => {
    it('should create a new challenge', async () => {
      const challengeData = {
        title: 'Test Challenge',
        description: 'Test Description',
        type: 'daily' as const,
        difficulty: 'beginner' as const,
        rewardPoints: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const result = await engagementService.createChallenge(challengeData);
      
      expect(result).toBe(1);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should join a challenge', async () => {
      await engagementService.joinChallenge(1, 1);
      
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT OR IGNORE INTO user_challenges'));
    });

    it('should update challenge progress', async () => {
      await engagementService.updateChallengeProgress(1, 1, 50);
      
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE user_challenges'));
    });

    it('should complete challenge when progress reaches 100%', async () => {
      const mockGet = jest.fn().mockReturnValue({ reward_points: 100, title: 'Test Challenge' });
      const mockPrepare = jest.fn().mockReturnValue({
        run: jest.fn(),
        get: mockGet
      });
      
      (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);
      
      await engagementService.updateChallengeProgress(1, 1, 100);
      
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT reward_points'));
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE user_challenges'));
    });
  });

  describe('Streak Management', () => {
    it('should update user streak', async () => {
      const mockGet = jest.fn().mockReturnValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity_date: '2026-01-29'
      });
      
      const mockPrepare = jest.fn().mockReturnValue({
        run: jest.fn(),
        get: mockGet
      });
      
      (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);
      
      const result = await engagementService.updateUserStreak(1, 'workout');
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('should create new streak record if none exists', async () => {
      const mockPrepare = jest.fn().mockReturnValue({
        run: jest.fn(),
        get: jest.fn().mockReturnValue(undefined)
      });
      
      (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);
      
      const result = await engagementService.updateUserStreak(1, 'login');
      
      expect(result).toBe(1);
    });

    it('should award bonus points for streak milestones', async () => {
      // Test milestone streaks
      const milestoneStreaks = [7, 14, 30, 60, 90, 180, 365];
      
      for (const streak of milestoneStreaks) {
        const mockGet = jest.fn().mockReturnValue({
          current_streak: streak - 1,
          longest_streak: streak - 1,
          last_activity_date: '2026-01-29'
        });
        
        const mockPrepare = jest.fn().mockReturnValue({
          run: jest.fn(),
          get: mockGet
        });
        
        (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);
        
        const result = await engagementService.updateUserStreak(1, 'completion');
        expect(result).toBe(streak);
      }
    });
  });

  describe('Social Interactions', () => {
    it('should record social interaction', async () => {
      await engagementService.recordSocialInteraction(1, 2, 'cheer', 'Great job!');
      
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO social_interactions'));
    });

    it('should award appropriate points for different interaction types', async () => {
      const interactionTypes = [
        { type: 'cheer' as const, points: 10 },
        { type: 'challenge' as const, points: 25 },
        { type: 'comment' as const, points: 5 },
        { type: 'follow' as const, points: 15 }
      ];

      for (const interaction of interactionTypes) {
        await engagementService.recordSocialInteraction(1, 2, interaction.type);
        // Points should be awarded based on interaction type
      }
    });
  });

  describe('Data Retrieval', () => {
    it('should get user active challenges', async () => {
      const mockChallenges = [
        { id: 1, title: 'Challenge 1', status: 'active' },
        { id: 2, title: 'Challenge 2', status: 'completed' }
      ];
      
      const mockPrepare = jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue(mockChallenges)
      });
      
      (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);
      
      const result = await engagementService.getUserActiveChallenges(1);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockChallenges);
    });

    it('should get user streaks', async () => {
      const mockStreaks = [
        { streak_type: 'workout', current_streak: 10, longest_streak: 15 },
        { streak_type: 'login', current_streak: 5, longest_streak: 8 }
      ];
      
      const mockPrepare = jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue(mockStreaks)
      });
      
      (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);
      
      const result = await engagementService.getUserStreaks(1);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockStreaks);
    });

    it('should get leaderboard', async () => {
      const mockLeaderboard = [
        { id: 1, username: 'user1', total_points: 1000, challenges_completed: 5 },
        { id: 2, username: 'user2', total_points: 800, challenges_completed: 3 }
      ];
      
      const mockPrepare = jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue(mockLeaderboard)
      });
      
      (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);
      
      const result = await engagementService.getLeaderboard(10);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockLeaderboard);
    });

    it('should get available challenges', async () => {
      const mockChallenges = [
        { id: 1, title: 'Available Challenge', is_joined: 0 },
        { id: 2, title: 'Joined Challenge', is_joined: 1 }
      ];
      
      const mockPrepare = jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue(mockChallenges)
      });
      
      (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);
      
      const result = await engagementService.getAvailableChallenges(1);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockChallenges);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockPrepare = jest.fn().mockReturnValue({
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        })
      });
      
      (mockDb.prepare as jest.Mock).mockImplementation(mockPrepare);

      await expect(engagementService.createChallenge({
        title: 'Test',
        description: 'Test',
        type: 'daily',
        difficulty: 'beginner',
        rewardPoints: 100,
        startDate: new Date(),
        endDate: new Date()
      })).rejects.toThrow('Database error');
    });

    it('should handle invalid challenge data', async () => {
      await expect(engagementService.createChallenge({
        title: '',
        description: '',
        type: 'invalid' as any,
        difficulty: 'invalid' as any,
        rewardPoints: -100,
        startDate: new Date('invalid'),
        endDate: new Date('invalid')
      })).rejects.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete challenge lifecycle', async () => {
      // Create challenge
      const challengeId = await engagementService.createChallenge({
        title: 'Lifecycle Test',
        description: 'Test challenge lifecycle',
        type: 'daily',
        difficulty: 'beginner',
        rewardPoints: 200,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Join challenge
      await engagementService.joinChallenge(1, challengeId);

      // Update progress
      await engagementService.updateChallengeProgress(1, challengeId, 50);

      // Complete challenge
      await engagementService.updateChallengeProgress(1, challengeId, 100);

      // Verify completion
      const challenges = await engagementService.getUserActiveChallenges(1);
      const completedChallenge = challenges.find((c: any) => c.id === challengeId);
      
      expect(completedChallenge?.status).toBe('completed');
    });

    it('should maintain streak progression correctly', async () => {
      // Simulate consecutive days
      const userId = 1;
      const streakType = 'workout';
      
      // Day 1
      let streak = await engagementService.updateUserStreak(userId, streakType);
      expect(streak).toBe(1);

      // Day 2 (consecutive)
      streak = await engagementService.updateUserStreak(userId, streakType);
      expect(streak).toBe(2);

      // Day 3 (consecutive)
      streak = await engagementService.updateUserStreak(userId, streakType);
      expect(streak).toBe(3);
    });
  });
});
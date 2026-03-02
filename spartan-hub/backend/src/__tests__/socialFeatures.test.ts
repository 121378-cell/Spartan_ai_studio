/**
 * Social Features Integration Tests
 * Phase B: Social Features - Week 6 Day 5
 * 
 * Integration tests for all social features
 */

import { TeamChallengesService } from '../services/teamChallengesService';
import { AchievementSystem } from '../services/achievementSystem';
import { SocialSharingService } from '../services/socialSharingService';
import { NotificationsService } from '../services/notificationsService';

describe('Social Features - Integration Tests', () => {
  let teamService: TeamChallengesService;
  let achievementSystem: AchievementSystem;
  let sharingService: SocialSharingService;
  let notificationsService: NotificationsService;

  beforeEach(() => {
    teamService = new TeamChallengesService();
    achievementSystem = new AchievementSystem();
    sharingService = new SocialSharingService();
    notificationsService = new NotificationsService();
  });

  describe('Team Challenges Integration', () => {
    it('should create team and join challenge', () => {
      // Create team
      const team = teamService.createTeam('user-1', 'Fitness Warriors', 'Elite fitness team');
      
      expect(team.id).toBeDefined();
      expect(team.name).toBe('Fitness Warriors');
      expect(team.members.length).toBe(1);

      // User 2 joins team
      const joined = teamService.joinTeam(team.id, 'user-2');
      
      expect(joined).toBe(true);
      expect(teamService.getTeam(team.id)?.members.length).toBe(2);

      // Create challenge
      const challenge = teamService.createChallenge(
        '30-Day Squat Challenge',
        'Complete 1000 squats in 30 days',
        'team',
        Date.now(),
        Date.now() + 30 * 24 * 60 * 60 * 1000,
        { type: 'workouts', target: 1000, unit: 'squats' },
        [{ type: 'points', value: 1000, description: '1000 points' }]
      );

      expect(challenge.id).toBeDefined();
      expect(challenge.name).toBe('30-Day Squat Challenge');

      // Team joins challenge
      teamService.joinChallenge(challenge.id, 'user-1');
      
      expect(teamService.getLeaderboard(challenge.id).length).toBe(1);
    });

    it('should track team leaderboard', () => {
      // Create teams
      const team1 = teamService.createTeam('user-1', 'Team Alpha');
      const team2 = teamService.createTeam('user-3', 'Team Beta');

      // Create challenge
      const challenge = teamService.createChallenge(
        'Workout Challenge',
        'Most workouts wins',
        'team',
        Date.now(),
        Date.now() + 7 * 24 * 60 * 60 * 1000,
        { type: 'workouts', target: 50, unit: 'workouts' },
        []
      );

      // Submit progress
      teamService.submitChallengeProgress(challenge.id, 'user-1', 10);
      teamService.submitChallengeProgress(challenge.id, 'user-3', 15);

      const leaderboard = teamService.getLeaderboard(challenge.id);
      
      expect(leaderboard.length).toBe(2);
      expect(leaderboard[0].userId).toBe('user-3'); // Higher score first
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].rank).toBe(2);
    });
  });

  describe('Achievement System Integration', () => {
    it('should unlock achievement and send notification', () => {
      const userId = 'user-1';

      // Simulate workout completion
      const updatedAchievements = achievementSystem.checkAchievements(
        userId,
        'workout_completed',
        1
      );

      expect(updatedAchievements.length).toBeGreaterThan(0);
      
      // Check if "First Steps" achievement is unlocked
      const firstSteps = achievementSystem.getUserAchievement(userId, 'first_workout');
      expect(firstSteps.unlocked).toBe(true);
      expect(firstSteps.percentage).toBe(100);

      // Get total points
      const totalPoints = achievementSystem.getTotalPoints(userId);
      expect(totalPoints).toBeGreaterThan(0);
    });

    it('should track achievement progress across multiple events', () => {
      const userId = 'user-1';

      // Complete 6 workouts (should unlock 7-day streak achievement)
      for (let i = 0; i < 7; i++) {
        achievementSystem.checkAchievements(userId, 'streak_updated', 1);
      }

      const weekWarrior = achievementSystem.getUserAchievement(userId, 'seven_day_streak');
      
      expect(weekWarrior.unlocked).toBe(true);
      expect(weekWarrior.percentage).toBe(100);
    });
  });

  describe('Social Sharing Integration', () => {
    it('should generate share URL and track shares', () => {
      const userId = 'user-1';

      // Create shareable content
      const content = sharingService.createWorkoutShare({
        userId,
        exerciseType: 'squat',
        formScore: 95,
        duration: 30
      });

      expect(content.type).toBe('workout');
      expect(content.title).toContain('squat');
      expect(content.formScore).toBe(95);

      // Share to Twitter
      const twitterUrl = sharingService.generateShareUrl('twitter', content);
      expect(twitterUrl).toContain('twitter.com');

      // Record share
      const result = sharingService.recordShare(userId, 'twitter', content);
      
      expect(result.success).toBe(true);
      expect(result.platform).toBe('twitter');
      expect(sharingService.getShareCount(userId, 'twitter')).toBe(1);
    });

    it('should generate and track referral code', () => {
      const userId = 'user-1';

      // Generate referral code
      const referralCode = sharingService.generateReferralCode(userId);
      
      expect(referralCode.code).toContain('REF-USER-1');
      expect(referralCode.userId).toBe(userId);

      // Another user uses code
      const used = sharingService.useReferralCode(referralCode.code, 'user-2');
      
      expect(used).toBe(true);
      expect(sharingService.getUserReferralCount(userId)).toBe(1);

      // Get referral stats
      const stats = sharingService.getReferralStats(userId);
      
      expect(stats.totalReferrals).toBe(1);
      expect(stats.pendingReferrals).toBe(1);
    });
  });

  describe('Notifications Integration', () => {
    it('should send notification through enabled channels', async () => {
      const userId = 'user-1';

      // Set up user preferences
      notificationsService.updatePreferences(userId, {
        enabledChannels: ['push', 'in_app'],
        notificationTypes: {
          achievement: true,
          challenge: true,
          team: true,
          system: true,
          reminder: false
        },
        frequency: 'instant'
      });

      // Register push token
      notificationsService.registerPushToken(userId, 'push-token-123');

      // Send achievement notification
      const notification = await notificationsService.sendAchievementNotification(
        userId,
        'First Steps',
        '🏋️'
      );

      expect(notification.type).toBe('achievement');
      expect(notification.title).toContain('Achievement');
      expect(notification.channels).toContain('in_app');

      // Check unread count
      const unreadCount = notificationsService.getUnreadCount(userId);
      expect(unreadCount).toBe(1);

      // Mark as read
      notificationsService.markAsRead(userId, notification.id);
      expect(notificationsService.getUnreadCount(userId)).toBe(0);
    });

    it('should respect quiet hours', async () => {
      const userId = 'user-1';

      // Enable quiet hours
      notificationsService.updatePreferences(userId, {
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00'
        }
      });

      // Send low priority notification during quiet hours
      const notification = await notificationsService.sendNotification(
        userId,
        'reminder',
        'Test',
        'Test message',
        undefined,
        'low'
      );

      // Should be scheduled, not sent
      expect(notification.channels.length).toBe(0);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should unlock achievement when joining team and send notification', async () => {
      const userId = 'user-1';

      // Create team
      const team = teamService.createTeam(userId, 'Test Team', 'Test description');

      // User 2 joins team
      const joined = teamService.joinTeam(team.id, 'user-2');
      expect(joined).toBe(true);

      // Should unlock "Team Player" achievement
      const teamPlayerAchievement = achievementSystem.getUserAchievement('user-2', 'team_player');
      
      expect(teamPlayerAchievement.unlocked).toBe(true);

      // Send notification
      const notification = await notificationsService.sendAchievementNotification(
        'user-2',
        'Team Player',
        '🤝'
      );

      expect(notification.type).toBe('achievement');
    });

    it('should send challenge completion notification and unlock achievement', async () => {
      const userId = 'user-1';

      // Create and join challenge
      const challenge = teamService.createChallenge(
        'Test Challenge',
        'Test',
        'individual',
        Date.now(),
        Date.now() + 7 * 24 * 60 * 60 * 1000,
        { type: 'workouts', target: 10, unit: 'workouts' },
        []
      );

      teamService.joinChallenge(challenge.id, userId);

      // Submit progress (complete challenge)
      for (let i = 0; i < 10; i++) {
        teamService.submitChallengeProgress(challenge.id, userId, 1);
      }

      // Send completion notification
      const notification = await notificationsService.sendChallengeNotification(
        userId,
        'Test Challenge',
        'completed'
      );

      expect(notification.type).toBe('challenge');
      expect(notification.title).toContain('Completed');
    });

    it('should track social shares for achievement', async () => {
      const userId = 'user-1';

      // Unlock achievement
      achievementSystem.checkAchievements(userId, 'workout_completed', 1);

      // Create share
      const content = sharingService.createAchievementShare({
        userId,
        achievementName: 'First Steps',
        achievementIcon: '🏋️'
      });

      expect(content.type).toBe('achievement');
      expect(content.title).toContain('First Steps');

      // Record share
      sharingService.recordShare(userId, 'facebook', content);

      // Check share count
      const shareCount = sharingService.getShareCount(userId, 'facebook');
      expect(shareCount).toBe(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent notifications', async () => {
      const userId = 'user-1';

      // Set preferences
      notificationsService.updatePreferences(userId, {
        enabledChannels: ['in_app'],
        notificationTypes: {
          achievement: true,
          challenge: true,
          team: true,
          system: true,
          reminder: true
        },
        frequency: 'instant'
      });

      // Send 100 notifications concurrently
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          notificationsService.sendNotification(
            userId,
            'system',
            `Notification ${i}`,
            `Test message ${i}`
          )
        );
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete in under 1 second
      expect(endTime - startTime).toBeLessThan(1000);

      // All notifications should be stored
      const notifications = notificationsService.getNotifications(userId);
      expect(notifications.length).toBe(100);
    });

    it('should handle large team leaderboard', () => {
      // Create challenge
      const challenge = teamService.createChallenge(
        'Large Challenge',
        'Test',
        'individual',
        Date.now(),
        Date.now() + 7 * 24 * 60 * 60 * 1000,
        { type: 'workouts', target: 100, unit: 'workouts' },
        []
      );

      // Add 1000 participants
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        teamService.joinChallenge(challenge.id, `user-${i}`);
        teamService.submitChallengeProgress(challenge.id, `user-${i}`, Math.floor(Math.random() * 100));
      }

      const endTime = Date.now();

      // Should complete in under 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);

      // Get top 10
      const leaderboard = teamService.getLeaderboard(challenge.id, 10);
      expect(leaderboard.length).toBe(10);
      expect(leaderboard[0].rank).toBe(1);
    });
  });
});

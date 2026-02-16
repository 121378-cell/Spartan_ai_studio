const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';
import { AchievementService } from './achievementService';

/**
 * Engagement Engine Service
 * Manages user engagement through gamification, challenges, and interactive features
 */
export class EngagementEngineService {
  private db: DatabaseType;
  private achievementService: AchievementService;

  constructor(db: DatabaseType) {
    this.db = db;
    this.achievementService = new AchievementService(db);
    this.initializeTables();
  }

  /**
   * Initialize engagement-related database tables
   */
  private initializeTables(): void {
    try {
      // Challenges table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS challenges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('daily', 'weekly', 'monthly', 'special')),
          difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
          reward_points INTEGER NOT NULL DEFAULT 100,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User challenges participation
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_challenges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          challenge_id INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'failed', 'expired')),
          progress_percentage REAL DEFAULT 0.0,
          start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          completion_date DATETIME NULL,
          earned_points INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (challenge_id) REFERENCES challenges(id),
          UNIQUE(user_id, challenge_id)
        )
      `);

      // Streak tracking
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_streaks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          streak_type TEXT NOT NULL CHECK(streak_type IN ('workout', 'login', 'completion')),
          current_streak INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          last_activity_date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, streak_type)
        )
      `);

      // Social interactions
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS social_interactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          target_user_id INTEGER NOT NULL,
          interaction_type TEXT NOT NULL CHECK(interaction_type IN ('cheer', 'challenge', 'comment', 'follow')),
          message TEXT,
          points_awarded INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (target_user_id) REFERENCES users(id)
        )
      `);

      // Engagement events tracking
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS engagement_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          event_data TEXT,
          points_earned INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      logger.info('Engagement engine tables initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize engagement tables', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Create a new challenge
   */
  async createChallenge(challengeData: {
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'special';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    rewardPoints: number;
    startDate: Date;
    endDate: Date;
  }): Promise<number> {
    try {
      const sanitizedTitle = sanitizeInput(challengeData.title);
      const sanitizedDescription = sanitizeInput(challengeData.description);

      const stmt = this.db.prepare(`
        INSERT INTO challenges (title, description, type, difficulty, reward_points, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        sanitizedTitle,
        sanitizedDescription,
        challengeData.type,
        challengeData.difficulty,
        challengeData.rewardPoints,
        challengeData.startDate.toISOString(),
        challengeData.endDate.toISOString()
      );

      logger.info('Challenge created successfully', { context: 'engagement', metadata: { challengeId: String(result.lastInsertRowid) } });

      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create challenge', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(userId: number, challengeId: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO user_challenges (user_id, challenge_id, status, start_date)
        VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(userId, challengeId);

      if (result.changes > 0) {
        // Log engagement event
        await this.logEngagementEvent(userId, 'challenge_joined', {
          challengeId,
          timestamp: new Date().toISOString()
        }, 50);

        logger.info('User joined challenge successfully', { context: 'engagement' });
      }
    } catch (error) {
      logger.error('Failed to join challenge', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Update challenge progress
   */
  async updateChallengeProgress(userId: number, challengeId: number, progress: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE user_challenges 
        SET progress_percentage = ?
        WHERE user_id = ? AND challenge_id = ?
      `);

      stmt.run(progress, userId, challengeId);

      // Check if challenge is completed
      if (progress >= 100) {
        await this.completeChallenge(userId, challengeId);
      }

      logger.info('Challenge progress updated', { context: 'engagement' });
    } catch (error) {
      logger.error('Failed to update challenge progress', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Complete a challenge
   */
  private async completeChallenge(userId: number, challengeId: number): Promise<void> {
    try {
      // Get challenge details
      const challengeStmt = this.db.prepare('SELECT reward_points, title FROM challenges WHERE id = ?');
      const challenge = challengeStmt.get(challengeId) as { reward_points: number; title: string };

      if (!challenge) {
        throw new Error(`Challenge ${challengeId} not found`);
      }

      // Update user challenge status
      const updateStmt = this.db.prepare(`
        UPDATE user_challenges 
        SET status = 'completed', completion_date = CURRENT_TIMESTAMP, earned_points = ?
        WHERE user_id = ? AND challenge_id = ?
      `);

      updateStmt.run(challenge.reward_points, userId, challengeId);

      // Award points to user
      await this.awardPoints(userId, challenge.reward_points, 'challenge_completion');

      // Log engagement event
      await this.logEngagementEvent(userId, 'challenge_completed', {
        challengeId,
        title: challenge.title,
        points: challenge.reward_points,
        timestamp: new Date().toISOString()
      }, challenge.reward_points);

      logger.info('Challenge completed successfully', { context: 'engagement' });
    } catch (error) {
      logger.error('Failed to complete challenge', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Update user streak
   */
  async updateUserStreak(userId: number, streakType: 'workout' | 'login' | 'completion'): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current streak
      const getStmt = this.db.prepare(`
        SELECT current_streak, longest_streak, last_activity_date 
        FROM user_streaks 
        WHERE user_id = ? AND streak_type = ?
      `);
      
      let streak = getStmt.get(userId, streakType) as {
        current_streak: number;
        longest_streak: number;
        last_activity_date: string;
      } | undefined;

      let newStreak = 1;
      
      if (streak) {
        const lastActivityDate = new Date(streak.last_activity_date);
        const currentDate = new Date(today);
        const dayDifference = Math.floor(
          (currentDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDifference === 1) {
          // Consecutive day - increment streak
          newStreak = streak.current_streak + 1;
        } else if (dayDifference === 0) {
          // Same day - no change
          newStreak = streak.current_streak;
        } else {
          // Break in streak - reset to 1
          newStreak = 1;
        }

        // Update existing streak
        const updateStmt = this.db.prepare(`
          UPDATE user_streaks 
          SET current_streak = ?, longest_streak = MAX(longest_streak, ?), 
              last_activity_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND streak_type = ?
        `);

        updateStmt.run(newStreak, newStreak, today, userId, streakType);
      } else {
        // Create new streak record
        const insertStmt = this.db.prepare(`
          INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date)
          VALUES (?, ?, ?, ?, ?)
        `);

        insertStmt.run(userId, streakType, newStreak, newStreak, today);
      }

      // Award streak bonus points for milestones
      if ([7, 14, 30, 60, 90, 180, 365].includes(newStreak)) {
        const bonusPoints = newStreak * 10;
        await this.awardPoints(userId, bonusPoints, `streak_${streakType}_${newStreak}`);
        
        await this.logEngagementEvent(userId, 'streak_milestone', {
          streakType,
          streakCount: newStreak,
          points: bonusPoints
        }, bonusPoints);
      }

      logger.info('User streak updated', { context: 'engagement' });
      return newStreak;
    } catch (error) {
      logger.error('Failed to update user streak', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Record social interaction
   */
  async recordSocialInteraction(
    userId: number,
    targetUserId: number,
    interactionType: 'cheer' | 'challenge' | 'comment' | 'follow',
    message?: string
  ): Promise<void> {
    try {
      const pointsMap = {
        cheer: 10,
        challenge: 25,
        comment: 5,
        follow: 15
      };

      const points = pointsMap[interactionType];

      const stmt = this.db.prepare(`
        INSERT INTO social_interactions (user_id, target_user_id, interaction_type, message, points_awarded)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(userId, targetUserId, interactionType, message || null, points);

      // Award points to both users
      await this.awardPoints(userId, points, `social_${interactionType}_given`);
      await this.awardPoints(targetUserId, Math.floor(points * 0.5), `social_${interactionType}_received`);

      // Log engagement events
      await this.logEngagementEvent(userId, `social_interaction_given`, {
        interactionType,
        targetUserId,
        points
      }, points);

      await this.logEngagementEvent(targetUserId, `social_interaction_received`, {
        interactionType,
        fromUserId: userId,
        points: Math.floor(points * 0.5)
      }, Math.floor(points * 0.5));

      logger.info('Social interaction recorded', { context: 'engagement' });
    } catch (error) {
      logger.error('Failed to record social interaction', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Award engagement points to user
   */
  private async awardPoints(userId: number, points: number, reason: string): Promise<void> {
    try {
      // Update user's total points in users table (assuming we have a points column)
      const stmt = this.db.prepare(`
        UPDATE users 
        SET points = COALESCE(points, 0) + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(points, userId);

      logger.info('Points awarded to user', { context: 'engagement' });
    } catch (error) {
      logger.error('Failed to award points', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Log engagement event for analytics
   */
  private async logEngagementEvent(
    userId: number,
    eventType: string,
    eventData: Record<string, any>,
    pointsEarned: number = 0
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO engagement_events (user_id, event_type, event_data, points_earned)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(userId, eventType, JSON.stringify(eventData), pointsEarned);
    } catch (error) {
      logger.error('Failed to log engagement event', { context: 'engagement', metadata: { error: String(error) } });
      // Don't throw error as this is supplementary logging
    }
  }

  /**
   * Get user's active challenges
   */
  async getUserActiveChallenges(userId: number): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          c.id,
          c.title,
          c.description,
          c.type,
          c.difficulty,
          c.reward_points,
          c.start_date,
          c.end_date,
          uc.status,
          uc.progress_percentage,
          uc.start_date as joined_date,
          uc.earned_points
        FROM challenges c
        JOIN user_challenges uc ON c.id = uc.challenge_id
        WHERE uc.user_id = ? AND c.is_active = 1 AND c.end_date > CURRENT_TIMESTAMP
        ORDER BY c.end_date ASC
      `);

      const challenges = stmt.all(userId);
      return challenges as any[];
    } catch (error) {
      logger.error('Failed to get user active challenges', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Get user's streak information
   */
  async getUserStreaks(userId: number): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          streak_type,
          current_streak,
          longest_streak,
          last_activity_date
        FROM user_streaks
        WHERE user_id = ?
        ORDER BY streak_type
      `);

      const streaks = stmt.all(userId);
      return streaks as any[];
    } catch (error) {
      logger.error('Failed to get user streaks', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          u.id,
          u.username,
          COALESCE(u.points, 0) as total_points,
          COUNT(uc.id) as challenges_completed,
          MAX(CASE WHEN us.streak_type = 'workout' THEN us.current_streak ELSE 0 END) as workout_streak
        FROM users u
        LEFT JOIN user_challenges uc ON u.id = uc.user_id AND uc.status = 'completed'
        LEFT JOIN user_streaks us ON u.id = us.user_id
        WHERE u.is_active = 1
        GROUP BY u.id, u.username, u.points
        ORDER BY total_points DESC, challenges_completed DESC
        LIMIT ?
      `);

      const leaderboard = stmt.all(limit);
      return leaderboard as any[];
    } catch (error) {
      logger.error('Failed to get leaderboard', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Get available challenges
   */
  async getAvailableChallenges(userId: number): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          c.id,
          c.title,
          c.description,
          c.type,
          c.difficulty,
          c.reward_points,
          c.start_date,
          c.end_date,
          CASE 
            WHEN uc.user_id IS NOT NULL THEN 1 
            ELSE 0 
          END as is_joined
        FROM challenges c
        LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = ?
        WHERE c.is_active = 1 AND c.start_date <= CURRENT_TIMESTAMP AND c.end_date > CURRENT_TIMESTAMP
        ORDER BY c.start_date DESC
      `);

      const challenges = stmt.all(userId);
      return challenges as any[];
    } catch (error) {
      logger.error('Failed to get available challenges', { context: 'engagement', metadata: { error: String(error) } });
      throw error;
    }
  }
}
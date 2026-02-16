const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';

/**
 * Community Features Service
 * Manages social features, user connections, and community interactions
 */
export class CommunityFeaturesService {
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
    this.initializeTables();
  }

  /**
   * Initialize community-related database tables
   */
  private initializeTables(): void {
    try {
      // User connections/following
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          follower_id INTEGER NOT NULL,
          followed_id INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'blocked')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (follower_id) REFERENCES users(id),
          FOREIGN KEY (followed_id) REFERENCES users(id),
          UNIQUE(follower_id, followed_id)
        )
      `);

      // Community posts
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS community_posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          media_url TEXT,
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          is_public BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Post likes
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS post_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          post_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (post_id) REFERENCES community_posts(id),
          UNIQUE(user_id, post_id)
        )
      `);

      // Post comments
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          likes_count INTEGER DEFAULT 0,
          parent_comment_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES community_posts(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id)
        )
      `);

      // Comment likes
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS comment_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          comment_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (comment_id) REFERENCES post_comments(id),
          UNIQUE(user_id, comment_id)
        )
      `);

      // Workout sharing
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS shared_workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          workout_data TEXT NOT NULL,
          description TEXT,
          likes_count INTEGER DEFAULT 0,
          shares_count INTEGER DEFAULT 0,
          is_public BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Workout likes
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS workout_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          workout_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (workout_id) REFERENCES shared_workouts(id),
          UNIQUE(user_id, workout_id)
        )
      `);

      // Group challenges
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS group_challenges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          creator_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          goal_type TEXT NOT NULL CHECK(goal_type IN ('distance', 'time', 'calories', 'workouts')),
          goal_value REAL NOT NULL,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          max_participants INTEGER,
          current_participants INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (creator_id) REFERENCES users(id)
        )
      `);

      // Group challenge participants
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS challenge_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          challenge_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          progress_value REAL DEFAULT 0.0,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME NULL,
          FOREIGN KEY (challenge_id) REFERENCES group_challenges(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(challenge_id, user_id)
        )
      `);

      // Create indexes for better performance
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_connections_follower ON user_connections(follower_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_connections_followed ON user_connections(followed_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_shared_workouts_user ON shared_workouts(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_group_challenges_creator ON group_challenges(creator_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id)');

      logger.info('Community features tables initialized successfully', { context: 'community' });
    } catch (error) {
      logger.error('Failed to initialize community tables', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Follow a user
   */
  async followUser(followerId: number, followedId: number): Promise<void> {
    try {
      if (followerId === followedId) {
        throw new Error('Cannot follow yourself');
      }

      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO user_connections (follower_id, followed_id, status)
        VALUES (?, ?, 'accepted')
      `);

      const result = stmt.run(followerId, followedId);

      if (result.changes > 0) {
        logger.info('User followed successfully', { context: 'community' });
      }
    } catch (error) {
      logger.error('Failed to follow user', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: number, followedId: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM user_connections 
        WHERE follower_id = ? AND followed_id = ?
      `);

      stmt.run(followerId, followedId);
      
      logger.info('User unfollowed successfully', { context: 'community' });
    } catch (error) {
      logger.error('Failed to unfollow user', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Get user followers
   */
  async getUserFollowers(userId: number): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.email,
          uc.created_at as followed_at
        FROM user_connections uc
        JOIN users u ON uc.follower_id = u.id
        WHERE uc.followed_id = ? AND uc.status = 'accepted'
        ORDER BY uc.created_at DESC
      `);

      const followers = stmt.all(userId);
      return followers as any[];
    } catch (error) {
      logger.error('Failed to get user followers', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Get user following
   */
  async getUserFollowing(userId: number): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.email,
          uc.created_at as following_since
        FROM user_connections uc
        JOIN users u ON uc.followed_id = u.id
        WHERE uc.follower_id = ? AND uc.status = 'accepted'
        ORDER BY uc.created_at DESC
      `);

      const following = stmt.all(userId);
      return following as any[];
    } catch (error) {
      logger.error('Failed to get user following', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Create a community post
   */
  async createPost(userId: number, content: string, mediaUrl?: string): Promise<number> {
    try {
      const sanitizedContent = sanitizeInput(content);

      const stmt = this.db.prepare(`
        INSERT INTO community_posts (user_id, content, media_url)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(userId, sanitizedContent, mediaUrl || null);
      
      logger.info('Community post created successfully', { context: 'community' });
      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create community post', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Like a post
   */
  async likePost(userId: number, postId: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO post_likes (user_id, post_id)
        VALUES (?, ?)
      `);

      const result = stmt.run(userId, postId);

      if (result.changes > 0) {
        // Update post likes count
        const updateStmt = this.db.prepare(`
          UPDATE community_posts 
          SET likes_count = likes_count + 1
          WHERE id = ?
        `);
        updateStmt.run(postId);
        
        logger.info('Post liked successfully', { context: 'community' });
      }
    } catch (error) {
      logger.error('Failed to like post', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Unlike a post
   */
  async unlikePost(userId: number, postId: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM post_likes 
        WHERE user_id = ? AND post_id = ?
      `);

      const result = stmt.run(userId, postId);

      if (result.changes > 0) {
        // Update post likes count
        const updateStmt = this.db.prepare(`
          UPDATE community_posts 
          SET likes_count = MAX(0, likes_count - 1)
          WHERE id = ?
        `);
        updateStmt.run(postId);
        
        logger.info('Post unliked successfully', { context: 'community' });
      }
    } catch (error) {
      logger.error('Failed to unlike post', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Add comment to post
   */
  async addComment(postId: number, userId: number, content: string, parentCommentId?: number): Promise<number> {
    try {
      const sanitizedContent = sanitizeInput(content);

      const stmt = this.db.prepare(`
        INSERT INTO post_comments (post_id, user_id, content, parent_comment_id)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(postId, userId, sanitizedContent, parentCommentId || null);

      // Update post comments count
      const updateStmt = this.db.prepare(`
        UPDATE community_posts 
        SET comments_count = comments_count + 1
        WHERE id = ?
      `);
      updateStmt.run(postId);
      
      logger.info('Comment added successfully', { context: 'community' });
      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to add comment', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Share a workout
   */
  async shareWorkout(userId: number, workoutData: any, description?: string): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO shared_workouts (user_id, workout_data, description)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(userId, JSON.stringify(workoutData), description || null);
      
      logger.info('Workout shared successfully', { context: 'community' });
      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to share workout', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Like a shared workout
   */
  async likeWorkout(userId: number, workoutId: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO workout_likes (user_id, workout_id)
        VALUES (?, ?)
      `);

      const result = stmt.run(userId, workoutId);

      if (result.changes > 0) {
        // Update workout likes count
        const updateStmt = this.db.prepare(`
          UPDATE shared_workouts 
          SET likes_count = likes_count + 1
          WHERE id = ?
        `);
        updateStmt.run(workoutId);
        
        logger.info('Workout liked successfully', { context: 'community' });
      }
    } catch (error) {
      logger.error('Failed to like workout', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Create a group challenge
   */
  async createGroupChallenge(challengeData: {
    creatorId: number;
    title: string;
    description: string;
    goalType: 'distance' | 'time' | 'calories' | 'workouts';
    goalValue: number;
    startDate: Date;
    endDate: Date;
    maxParticipants?: number;
  }): Promise<number> {
    try {
      const sanitizedTitle = sanitizeInput(challengeData.title);
      const sanitizedDescription = sanitizeInput(challengeData.description);

      const stmt = this.db.prepare(`
        INSERT INTO group_challenges 
        (creator_id, title, description, goal_type, goal_value, start_date, end_date, max_participants)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        challengeData.creatorId,
        sanitizedTitle,
        sanitizedDescription,
        challengeData.goalType,
        challengeData.goalValue,
        challengeData.startDate.toISOString(),
        challengeData.endDate.toISOString(),
        challengeData.maxParticipants || null
      );

      // Add creator as first participant
      const participantStmt = this.db.prepare(`
        INSERT INTO challenge_participants (challenge_id, user_id)
        VALUES (?, ?)
      `);
      participantStmt.run(result.lastInsertRowid, challengeData.creatorId);
      
      logger.info('Group challenge created successfully', { context: 'community' });
      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create group challenge', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Join a group challenge
   */
  async joinGroupChallenge(userId: number, challengeId: number): Promise<void> {
    try {
      // Check if challenge exists and is active
      const challengeStmt = this.db.prepare('SELECT max_participants, current_participants FROM group_challenges WHERE id = ? AND is_active = 1');
      const challenge = challengeStmt.get(challengeId) as { max_participants: number | null; current_participants: number } | undefined;

      if (!challenge) {
        throw new Error('Challenge not found or inactive');
      }

      // Check participant limit
      if (challenge.max_participants && challenge.current_participants >= challenge.max_participants) {
        throw new Error('Challenge is full');
      }

      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO challenge_participants (challenge_id, user_id)
        VALUES (?, ?)
      `);

      const result = stmt.run(challengeId, userId);

      if (result.changes > 0) {
        // Update participant count
        const updateStmt = this.db.prepare(`
          UPDATE group_challenges 
          SET current_participants = current_participants + 1
          WHERE id = ?
        `);
        updateStmt.run(challengeId);
        
        logger.info('Joined group challenge successfully', { context: 'community' });
      }
    } catch (error) {
      logger.error('Failed to join group challenge', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Update challenge progress
   */
  async updateChallengeProgress(participantId: number, challengeId: number, progressValue: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE challenge_participants 
        SET progress_value = ?
        WHERE id = ? AND challenge_id = ?
      `);

      stmt.run(progressValue, participantId, challengeId);
      
      logger.info('Challenge progress updated', { context: 'community' });
    } catch (error) {
      logger.error('Failed to update challenge progress', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Get feed posts for user
   */
  async getUserFeed(userId: number, limit: number = 20): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          cp.id,
          cp.user_id,
          u.username,
          cp.content,
          cp.media_url,
          cp.likes_count,
          cp.comments_count,
          cp.created_at,
          CASE 
            WHEN pl.id IS NOT NULL THEN 1 
            ELSE 0 
          END as liked_by_user
        FROM community_posts cp
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN post_likes pl ON cp.id = pl.post_id AND pl.user_id = ?
        WHERE cp.is_public = 1 
          AND (cp.user_id = ? OR cp.user_id IN (
            SELECT followed_id FROM user_connections WHERE follower_id = ? AND status = 'accepted'
          ))
        ORDER BY cp.created_at DESC
        LIMIT ?
      `);

      const posts = stmt.all(userId, userId, userId, limit);
      return posts as any[];
    } catch (error) {
      logger.error('Failed to get user feed', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(query: string, limit: number = 10): Promise<any[]> {
    try {
      const sanitizedQuery = sanitizeInput(query);
      const searchPattern = `%${sanitizedQuery}%`;

      const stmt = this.db.prepare(`
        SELECT 
          id,
          username,
          email,
          created_at
        FROM users
        WHERE (username LIKE ? OR email LIKE ?) AND is_active = 1
        ORDER BY username
        LIMIT ?
      `);

      const users = stmt.all(searchPattern, searchPattern, limit);
      return users as any[];
    } catch (error) {
      logger.error('Failed to search users', { context: 'community', metadata: { error: String(error) } });
      throw error;
    }
  }
}
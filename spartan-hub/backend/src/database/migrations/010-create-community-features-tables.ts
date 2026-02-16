import Database from 'better-sqlite3';
type DatabaseType = any;

/**
 * Migration 010: Create Community Features Tables
 * Adds tables for social connections, posts, comments, and group challenges
 */

export async function up(db: any): Promise<void> {
  // User connections/following
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_connections_follower ON user_connections(follower_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_connections_followed ON user_connections(followed_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_shared_workouts_user ON shared_workouts(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_group_challenges_creator ON group_challenges(creator_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id)');

  // Insert sample data
  const postStmt = db.prepare(`
    INSERT OR IGNORE INTO community_posts (user_id, content, likes_count, comments_count)
    VALUES (?, ?, ?, ?)
  `);

  // Sample posts
  postStmt.run(1, 'Just finished an amazing workout! Feeling great! 💪', 15, 3);
  postStmt.run(1, 'Anyone up for a morning run tomorrow?', 8, 12);
  postStmt.run(1, 'Reached my monthly fitness goal! So proud of the progress 🎉', 25, 7);

  // Sample group challenge
  const challengeStmt = db.prepare(`
    INSERT OR IGNORE INTO group_challenges 
    (creator_id, title, description, goal_type, goal_value, start_date, end_date, max_participants)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  challengeStmt.run(
    1,
    '30-Day Plank Challenge',
    'Hold a plank for 2 minutes by the end of this 30-day challenge!',
    'time',
    120,
    now.toISOString(),
    nextMonth.toISOString(),
    50
  );
}

export async function down(db: any): Promise<void> {
  db.exec('DROP TABLE IF EXISTS challenge_participants');
  db.exec('DROP TABLE IF EXISTS group_challenges');
  db.exec('DROP TABLE IF EXISTS workout_likes');
  db.exec('DROP TABLE IF EXISTS shared_workouts');
  db.exec('DROP TABLE IF EXISTS comment_likes');
  db.exec('DROP TABLE IF EXISTS post_comments');
  db.exec('DROP TABLE IF EXISTS post_likes');
  db.exec('DROP TABLE IF EXISTS community_posts');
  db.exec('DROP TABLE IF EXISTS user_connections');
}
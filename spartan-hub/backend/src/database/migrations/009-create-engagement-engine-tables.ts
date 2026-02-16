import Database from 'better-sqlite3';
type DatabaseType = any;

/**
 * Migration 009: Create Engagement Engine Tables
 * Adds tables for challenges, streaks, social interactions, and engagement tracking
 */

export async function up(db: any): Promise<void> {
  // Challenges table
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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

  // Add points column to users table if it doesn't exist
  const columns = db.pragma('table_info(users)') as Array<{ name: string }>;
  const hasPointsColumn = columns.some(col => col.name === 'points');
  
  if (!hasPointsColumn) {
    db.exec('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0');
  }

  // Create indexes for better performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON user_challenges(challenge_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_social_interactions_user_id ON social_interactions(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_engagement_events_user_id ON engagement_events(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date)');

  // Insert sample challenges
  const challengeStmt = db.prepare(`
    INSERT OR IGNORE INTO challenges 
    (title, description, type, difficulty, reward_points, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Daily challenges
  challengeStmt.run(
    'Complete 3 Workouts This Week',
    'Finish 3 workout sessions within 7 days to earn bonus points',
    'daily',
    'beginner',
    150,
    now.toISOString(),
    nextWeek.toISOString()
  );

  challengeStmt.run(
    'Perfect Week Challenge',
    'Complete all scheduled workouts this week without skipping any',
    'daily',
    'intermediate',
    300,
    now.toISOString(),
    nextWeek.toISOString()
  );

  // Weekly challenges
  challengeStmt.run(
    'Monthly Milestone',
    'Complete 12 workouts this month to unlock special achievements',
    'weekly',
    'intermediate',
    500,
    now.toISOString(),
    nextMonth.toISOString()
  );

  challengeStmt.run(
    'Consistency King',
    'Maintain a workout streak of 30 days straight',
    'weekly',
    'advanced',
    1000,
    now.toISOString(),
    nextMonth.toISOString()
  );

  // Special challenges
  challengeStmt.run(
    'New Year New You',
    'Complete your first workout of the year and start strong',
    'special',
    'beginner',
    75,
    now.toISOString(),
    new Date(now.getFullYear() + 1, 0, 1).toISOString()
  );
}

export async function down(db: any): Promise<void> {
  db.exec('DROP TABLE IF EXISTS engagement_events');
  db.exec('DROP TABLE IF EXISTS social_interactions');
  db.exec('DROP TABLE IF EXISTS user_streaks');
  db.exec('DROP TABLE IF EXISTS user_challenges');
  db.exec('DROP TABLE IF EXISTS challenges');
  
  // Note: We don't drop the points column from users table as it might be used elsewhere
}
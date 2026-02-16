import Database from 'better-sqlite3';
type DatabaseType = any;

/**
 * Migration 011: Create Retention Analytics Tables
 * Adds tables for user activity tracking, churn prediction, and retention analytics
 */

export async function up(db: any): Promise<void> {
  // User activity tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      activity_data TEXT,
      session_duration INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Churn prediction data
  db.exec(`
    CREATE TABLE IF NOT EXISTS churn_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prediction_score REAL NOT NULL,
      risk_level TEXT NOT NULL CHECK(risk_level IN ('low', 'medium', 'high')),
      factors TEXT,
      predicted_churn_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User engagement scores
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_engagement_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      engagement_score REAL NOT NULL,
      activity_frequency INTEGER DEFAULT 0,
      last_active_date DATE NOT NULL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Cohort analysis
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_cohorts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      cohort_month DATE NOT NULL,
      signup_source TEXT,
      user_segment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Retention events
  db.exec(`
    CREATE TABLE IF NOT EXISTS retention_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_value REAL,
      related_entity_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Intervention records
  db.exec(`
    CREATE TABLE IF NOT EXISTS retention_interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      intervention_type TEXT NOT NULL,
      intervention_data TEXT,
      outcome TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_activities_date ON user_activities(created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_churn_predictions_user ON churn_predictions(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_engagement_scores_user ON user_engagement_scores(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_cohorts_month ON user_cohorts(cohort_month)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_retention_events_user ON retention_events(user_id)');

  // Populate initial cohort data for existing users
  const cohortStmt = db.prepare(`
    INSERT OR IGNORE INTO user_cohorts (user_id, cohort_month, signup_source, user_segment)
    SELECT 
      id,
      strftime('%Y-%m-01', created_at) as cohort_month,
      'existing_users' as signup_source,
      'standard' as user_segment
    FROM users
    WHERE is_active = 1
  `);
  cohortStmt.run();

  // Insert sample activity data
  const activityStmt = db.prepare(`
    INSERT OR IGNORE INTO user_activities (user_id, activity_type, session_duration, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  // Sample activities for user 1
  activityStmt.run(1, 'app_login', 300, new Date(now.getTime() - oneDay).toISOString());
  activityStmt.run(1, 'workout_completed', 1800, new Date(now.getTime() - 2 * oneDay).toISOString());
  activityStmt.run(1, 'workout_started', 600, new Date(now.getTime() - 3 * oneDay).toISOString());
  activityStmt.run(1, 'social_interaction', 120, new Date(now.getTime() - 4 * oneDay).toISOString());

  // Sample activities for user 2
  activityStmt.run(2, 'app_login', 150, new Date(now.getTime() - 2 * oneDay).toISOString());
  activityStmt.run(2, 'workout_completed', 900, new Date(now.getTime() - 5 * oneDay).toISOString());

  // Insert sample engagement scores
  const engagementStmt = db.prepare(`
    INSERT OR IGNORE INTO user_engagement_scores (user_id, engagement_score, activity_frequency, last_active_date)
    VALUES (?, ?, ?, ?)
  `);

  engagementStmt.run(1, 85.5, 12, new Date(now.getTime() - oneDay).toISOString().split('T')[0]);
  engagementStmt.run(2, 42.3, 5, new Date(now.getTime() - 2 * oneDay).toISOString().split('T')[0]);

  // Insert sample churn predictions
  const churnStmt = db.prepare(`
    INSERT OR IGNORE INTO churn_predictions (user_id, prediction_score, risk_level, factors, predicted_churn_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  churnStmt.run(1, 15.2, 'low', '["active_recently","consistent_workouts"]', new Date(now.getTime() + 60 * oneDay).toISOString().split('T')[0]);
  churnStmt.run(2, 65.8, 'medium', '["declining_activity","low_engagement"]', new Date(now.getTime() + 30 * oneDay).toISOString().split('T')[0]);
}

export async function down(db: any): Promise<void> {
  db.exec('DROP TABLE IF EXISTS retention_interventions');
  db.exec('DROP TABLE IF EXISTS retention_events');
  db.exec('DROP TABLE IF EXISTS user_cohorts');
  db.exec('DROP TABLE IF EXISTS user_engagement_scores');
  db.exec('DROP TABLE IF EXISTS churn_predictions');
  db.exec('DROP TABLE IF EXISTS user_activities');
}
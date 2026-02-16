
const Database = require('better-sqlite3');
type DatabaseType = any;

export function createTestDatabase(): DatabaseType {
  const db = new Database(':memory:');

  // Create tables needed for ML forecasting
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_forecasts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      predictedReadiness REAL,
      predictedInjuryRisk REAL,
      predictedFatigue REAL,
      confidence INTEGER,
      direction TEXT,
      trend_influence REAL,
      cycle_influence REAL,
      seasonal_influence REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, date)
    );

    CREATE TABLE IF NOT EXISTS injury_probabilities (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      probability_percent REAL,
      risk_score REAL,
      elevated_rhr INTEGER,
      suppressed_hrv INTEGER,
      sleep_deprivation INTEGER,
      consecutive_hard_days INTEGER,
      overtraining_marker INTEGER,
      confidence_score INTEGER,
      recommendation TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, date)
    );

    CREATE TABLE IF NOT EXISTS fatigue_estimates (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      fatigue_level REAL,
      acute_chronic_ratio REAL,
      recovery_capacity REAL,
      estimated_recovery_days INTEGER,
      recommendation TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, date)
    );

    CREATE TABLE IF NOT EXISTS training_suggestions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      suggested_load TEXT,
      max_duration_minutes INTEGER,
      recommended_exercises TEXT,
      rationale TEXT,
      expected_recovery_hours INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, date)
    );

    CREATE TABLE IF NOT EXISTS model_metadata (
      id TEXT PRIMARY KEY,
      version TEXT UNIQUE,
      training_date TEXT,
      accuracy_score REAL,
      data_points INTEGER,
      model_type TEXT,
      window_size INTEGER,
      seasonal_cycle INTEGER,
      alpha REAL,
      beta REAL,
      gamma REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Mock table for biometric data needed by forecasting
    CREATE TABLE IF NOT EXISTS daily_biometric_summaries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      recovery_score REAL,
      readiness_score REAL,
      injury_risk REAL,
      fatigue_level REAL,
      sleep_duration REAL,
      stress_level REAL,
      activity_load REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    );
  `);

  return db;
}

export function cleanupTestData(db: DatabaseType): void {
  if (db && db.open) {
    db.exec(`
      DELETE FROM ml_forecasts;
      DELETE FROM injury_probabilities;
      DELETE FROM fatigue_estimates;
      DELETE FROM training_suggestions;
      DELETE FROM daily_biometric_summaries;
    `);
  }
}

export function closeTestDatabase(db: DatabaseType): void {
  if (db && db.open) {
    db.close();
  }
}

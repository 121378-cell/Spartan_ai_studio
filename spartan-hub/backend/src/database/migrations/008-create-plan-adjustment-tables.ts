/**
 * Migration 008: Create Plan Adjustment Tables
 * 
 * Creates tables for the Real Time Adaptive Brain system:
 * - workout_sessions: Enhanced workout session tracking
 * - plan_adjustments: Track all plan modifications
 * - user_feedback: Store user feedback for ML learning
 * - adaptation_history: Historical adaptation records
 */

import { logger } from '../../utils/logger';

export async function up(db: any): Promise<void> {
  logger.info('Migration 008: Creating plan adjustment tables', { context: 'migration' });

  try {
    // Create workout_sessions table (enhanced version)
    db.exec(`
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        exercise_type TEXT NOT NULL,
        planned_intensity TEXT NOT NULL CHECK(planned_intensity IN ('very_light', 'light', 'moderate', 'hard', 'very_hard')),
        planned_volume REAL NOT NULL,
        actual_intensity TEXT CHECK(actual_intensity IN ('very_light', 'light', 'moderate', 'hard', 'very_hard')),
        actual_volume REAL,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'skipped')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (plan_id) REFERENCES training_plans(id)
      )
    `);

    // Create indexes for performance
    db.exec('CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, scheduled_date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan ON workout_sessions(plan_id)');

    // Create plan_adjustments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS plan_adjustments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('CANCEL_WORKOUT', 'REDUCE_INTENSITY', 'INCREASE_INTENSITY', 'ADD_RECOVERY_DAY', 'MODIFY_EXERCISES', 'ADJUST_VOLUME', 'RESCHEDULE_SESSION')),
        reason TEXT NOT NULL,
        user_feedback TEXT,
        parameters TEXT, -- JSON string for flexibility
        confidence_score INTEGER NOT NULL CHECK(confidence_score >= 0 AND confidence_score <= 100),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_plan_adjustments_user ON plan_adjustments(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_plan_adjustments_session ON plan_adjustments(session_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_plan_adjustments_type ON plan_adjustments(adjustment_type)');

    // Create user_feedback table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL CHECK(feedback_type IN ('positive', 'negative', 'neutral')),
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comments TEXT,
        physiological_data TEXT, -- JSON string containing HR, HRV, etc.
        timestamp INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_feedback_session ON user_feedback(session_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_feedback_timestamp ON user_feedback(timestamp)');

    // Create adaptation_history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS adaptation_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        adjustment_type TEXT NOT NULL,
        before_state TEXT NOT NULL, -- JSON string of session state before adjustment
        after_state TEXT NOT NULL,  -- JSON string of session state after adjustment
        user_feedback_id TEXT,
        model_confidence INTEGER NOT NULL CHECK(model_confidence >= 0 AND model_confidence <= 100),
        timestamp INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
        FOREIGN KEY (user_feedback_id) REFERENCES user_feedback(id)
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_adaptation_history_user ON adaptation_history(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_adaptation_history_session ON adaptation_history(session_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_adaptation_history_timestamp ON adaptation_history(timestamp)');

    // Create learning_weights table for user preferences
    db.exec(`
      CREATE TABLE IF NOT EXISTS learning_weights (
        user_id TEXT PRIMARY KEY,
        user_preference_weight REAL NOT NULL DEFAULT 0.3 CHECK(user_preference_weight >= 0 AND user_preference_weight <= 1),
        physiological_weight REAL NOT NULL DEFAULT 0.25 CHECK(physiological_weight >= 0 AND physiological_weight <= 1),
        performance_weight REAL NOT NULL DEFAULT 0.2 CHECK(performance_weight >= 0 AND performance_weight <= 1),
        contextual_weight REAL NOT NULL DEFAULT 0.15 CHECK(contextual_weight >= 0 AND contextual_weight <= 1),
        temporal_weight REAL NOT NULL DEFAULT 0.1 CHECK(temporal_weight >= 0 AND temporal_weight <= 1),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Insert default learning weights for existing users
    db.exec(`
      INSERT OR IGNORE INTO learning_weights (user_id)
      SELECT id FROM users
    `);

    logger.info('Migration 008: Plan adjustment tables created successfully', { context: 'migration' });

  } catch (error) {
    logger.error('Migration 008: Error creating plan adjustment tables', {
      context: 'migration',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
}

export async function down(db: any): Promise<void> {
  logger.info('Migration 008: Dropping plan adjustment tables', { context: 'migration' });

  try {
    // Drop tables in reverse order of creation
    db.exec('DROP TABLE IF EXISTS adaptation_history');
    db.exec('DROP TABLE IF EXISTS user_feedback');
    db.exec('DROP TABLE IF EXISTS plan_adjustments');
    db.exec('DROP TABLE IF EXISTS learning_weights');
    db.exec('DROP TABLE IF EXISTS workout_sessions');

    logger.info('Migration 008: Plan adjustment tables dropped successfully', { context: 'migration' });

  } catch (error) {
    logger.error('Migration 008: Error dropping plan adjustment tables', {
      context: 'migration',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
}
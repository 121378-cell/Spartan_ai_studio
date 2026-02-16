import Database from 'better-sqlite3';
type DatabaseType = any;
import { logger } from '../../utils/logger';

/**
 * Migration 012: Create Form Analysis Tables
 * Adds tables for video form analysis and rep tracking
 */

export async function up(db: any): Promise<void> {
  // Form analysis sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS form_analysis_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      session_end TIMESTAMP,
      duration_seconds INTEGER,
      average_score REAL,
      best_score REAL,
      worst_score REAL,
      total_reps INTEGER DEFAULT 0,
      completed_reps INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Individual rep analysis
  db.exec(`
    CREATE TABLE IF NOT EXISTS rep_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      rep_number INTEGER NOT NULL,
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      duration_ms INTEGER,
      score REAL,
      feedback TEXT,
      keypoints JSON,
      angles JSON,
      metrics JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES form_analysis_sessions(id)
    )
  `);

  // Exercise templates
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      exercise_type TEXT NOT NULL,
      target_angles JSON,
      target_positions JSON,
      scoring_weights JSON,
      difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
      description TEXT,
      video_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User exercise preferences
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_exercise_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      preferred_template_id INTEGER,
      custom_settings JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (preferred_template_id) REFERENCES exercise_templates(id),
      UNIQUE(user_id, exercise_type)
    )
  `);

  // Form analysis feedback
  db.exec(`
    CREATE TABLE IF NOT EXISTS form_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      session_id INTEGER NOT NULL,
      rep_id INTEGER,
      feedback_type TEXT CHECK(feedback_type IN ('correction', 'encouragement', 'tip', 'warning')),
      body_part TEXT,
      issue TEXT,
      suggestion TEXT,
      severity TEXT CHECK(severity IN ('low', 'medium', 'high')),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (session_id) REFERENCES form_analysis_sessions(id),
      FOREIGN KEY (rep_id) REFERENCES rep_analyses(id)
    )
  `);

  // Create indexes for performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_form_sessions_user ON form_analysis_sessions(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_form_sessions_exercise ON form_analysis_sessions(exercise_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_rep_analyses_session ON rep_analyses(session_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_rep_analyses_score ON rep_analyses(score)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_form_feedback_user ON form_feedback(user_id)');

  // Insert sample exercise templates
  const templateStmt = db.prepare(`
    INSERT OR IGNORE INTO exercise_templates 
    (name, exercise_type, target_angles, target_positions, scoring_weights, difficulty, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Squat template
  templateStmt.run(
    'Basic Squat',
    'squat',
    JSON.stringify({
      knee_angle_min: 80,
      knee_angle_max: 120,
      hip_angle_min: 60,
      hip_angle_max: 100,
      back_angle_min: 160,
      back_angle_max: 180
    }),
    JSON.stringify({
      feet_width: 'shoulder_width',
      foot_angle: 30,
      stance: 'parallel'
    }),
    JSON.stringify({
      depth: 0.3,
      knee_tracking: 0.25,
      back_straightness: 0.25,
      balance: 0.2
    }),
    'beginner',
    'Fundamental squat movement focusing on proper form and depth'
  );

  // Deadlift template
  templateStmt.run(
    'Conventional Deadlift',
    'deadlift',
    JSON.stringify({
      hip_angle_start: 160,
      hip_angle_end: 170,
      knee_angle_start: 160,
      knee_angle_end: 170,
      back_angle_start: 170,
      back_angle_end: 180
    }),
    JSON.stringify({
      feet_position: 'under_hips',
      grip_width: 'shoulder_width',
      stance: 'hip_width'
    }),
    JSON.stringify({
      hip_hinge: 0.3,
      back_straightness: 0.3,
      bar_path: 0.2,
      lockout: 0.2
    }),
    'intermediate',
    'Classic deadlift form emphasizing hip hinge and back position'
  );

  // Push-up template
  templateStmt.run(
    'Standard Push-up',
    'pushup',
    JSON.stringify({
      elbow_angle_min: 80,
      elbow_angle_max: 100,
      body_angle_min: 170,
      body_angle_max: 180,
      shoulder_position: 'aligned'
    }),
    JSON.stringify({
      hand_position: 'shoulder_width',
      body_alignment: 'straight_line',
      core_engagement: 'tight'
    }),
    JSON.stringify({
      body_alignment: 0.35,
      depth_control: 0.3,
      stability: 0.2,
      breathing: 0.15
    }),
    'beginner',
    'Basic push-up focusing on body alignment and controlled movement'
  );

  logger.info('Form analysis tables and templates created successfully');
}

export async function down(db: any): Promise<void> {
  db.exec('DROP TABLE IF EXISTS form_feedback');
  db.exec('DROP TABLE IF EXISTS user_exercise_preferences');
  db.exec('DROP TABLE IF EXISTS exercise_templates');
  db.exec('DROP TABLE IF EXISTS rep_analyses');
  db.exec('DROP TABLE IF EXISTS form_analysis_sessions');
}
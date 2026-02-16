import { logger } from '../../utils/logger';

/**
 * Migration 023: Enterprise Coach Dashboard Tables
 * 
 * Adds infrastructure for professional trainers to manage athletes:
 * - coach_assignments: Linking trainers to athletes
 * - technical_feedback_manual: Human coach annotations on AI form analysis
 */

export async function up(db: any): Promise<void> {
  // Coach to Athlete Assignments
  db.exec(`
    CREATE TABLE IF NOT EXISTS coach_assignments (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      athlete_id TEXT NOT NULL,
      status TEXT DEFAULT 'active', -- 'active', 'pending', 'terminated'
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      permissions_level TEXT DEFAULT 'full', -- 'read_only', 'full'
      FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(coach_id, athlete_id)
    )
  `);

  // Manual Coach Feedback on AI Analysis
  db.exec(`
    CREATE TABLE IF NOT EXISTS coach_technical_annotations (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      athlete_id TEXT NOT NULL,
      form_analysis_session_id INTEGER NOT NULL,
      rep_number INTEGER, -- Specific rep or null for entire session
      comment TEXT NOT NULL,
      focus_part TEXT, -- 'knees', 'back', 'hip', etc.
      severity TEXT CHECK(severity IN ('low', 'medium', 'high')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id),
      FOREIGN KEY (athlete_id) REFERENCES users(id),
      FOREIGN KEY (form_analysis_session_id) REFERENCES form_analysis_sessions(id)
    )
  `);

  // Create indexes for performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_coach_athlete ON coach_assignments(coach_id, athlete_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_coach_annotations ON coach_technical_annotations(coach_id, athlete_id)');

  logger.info('Migration 023: Coach Dashboard tables created successfully');
}

export async function down(db: any): Promise<void> {
  db.exec('DROP TABLE IF EXISTS coach_technical_annotations');
  db.exec('DROP TABLE IF EXISTS coach_assignments');
}

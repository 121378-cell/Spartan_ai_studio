/*
 * Migration: Create form_analyses table
 * Description: Adds the database table for storing video form analysis results
 */

import Database from 'better-sqlite3';

export function up(db: Database): void {
  // Create table
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS form_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      form_score REAL NOT NULL,
      metric_details TEXT NOT NULL,
      feedback TEXT,
      video_frames INTEGER,
      analysis_duration REAL,
      injury_risk_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_form_analyses_user_id ON form_analyses(user_id);
    CREATE INDEX IF NOT EXISTS idx_form_analyses_exercise_type ON form_analyses(exercise_type);
    CREATE INDEX IF NOT EXISTS idx_form_analyses_created_at ON form_analyses(created_at);
  `;
  
  db.exec(createTableSql);
  
  // Create trigger to update 'updated_at' field
  const triggerSql = `
    CREATE TRIGGER IF NOT EXISTS update_form_analyses_updated_at
    AFTER UPDATE ON form_analyses
    FOR EACH ROW
    BEGIN
      UPDATE form_analyses SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `;
  
  db.exec(triggerSql);
}

export function down(db: Database): void {
  const dropSql = `
    DROP TRIGGER IF EXISTS update_form_analyses_updated_at;
    DROP INDEX IF EXISTS idx_form_analyses_created_at;
    DROP INDEX IF EXISTS idx_form_analyses_exercise_type;
    DROP INDEX IF EXISTS idx_form_analyses_user_id;
    DROP TABLE IF EXISTS form_analyses;
  `;
  
  db.exec(dropSql);
}

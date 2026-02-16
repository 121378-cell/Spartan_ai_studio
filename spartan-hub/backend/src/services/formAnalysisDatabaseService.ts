import { logger } from '../utils/logger';

// Properly handle better-sqlite3 CommonJS/ES6 compatibility
const Database: any = require('better-sqlite3');

// Define type for database operations
type DatabaseType = any;

/**
 * Form Analysis Database Service
 * Manages storage and retrieval of form analysis data
 */
export class FormAnalysisDatabaseService {
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
    this.initializeTables();
  }

  /**
   * Initialize form analysis database tables
   */
  private initializeTables(): void {
    try {
      // Form analysis sessions
      this.db.exec(`
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
          injury_risk_score REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Individual rep analysis
      this.db.exec(`
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
      this.db.exec(`
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
      this.db.exec(`
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
      this.db.exec(`
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
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_form_sessions_user ON form_analysis_sessions(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_form_sessions_exercise ON form_analysis_sessions(exercise_type)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_rep_analyses_session ON rep_analyses(session_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_rep_analyses_score ON rep_analyses(score)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_form_feedback_user ON form_feedback(user_id)');

      logger.info('Form analysis database tables initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize form analysis tables', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create a new form analysis session
   */
  async createSession(userId: string | number, exerciseType: string, notes?: string): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO form_analysis_sessions (user_id, exercise_type, notes)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(userId, exerciseType, notes || null);
      logger.info('Form analysis session created', { metadata: { sessionId: result.lastInsertRowid.toString(), userId: userId.toString(), exerciseType } });
      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to create form analysis session', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { userId: userId.toString(), exerciseType }
      });
      throw error;
    }
  }

  /**
   * End a form analysis session
   */
  async endSession(sessionId: number, durationSeconds: number, stats: {
    averageScore: number;
    bestScore: number;
    worstScore: number;
    totalReps: number;
    completedReps: number;
    injuryRiskScore?: number;
  }): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE form_analysis_sessions 
        SET session_end = CURRENT_TIMESTAMP,
            duration_seconds = ?,
            average_score = ?,
            best_score = ?,
            worst_score = ?,
            total_reps = ?,
            completed_reps = ?,
            injury_risk_score = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(
        durationSeconds,
        stats.averageScore,
        stats.bestScore,
        stats.worstScore,
        stats.totalReps,
        stats.completedReps,
        stats.injuryRiskScore || 0,
        sessionId
      );

      logger.info('Form analysis session ended', { metadata: { sessionId, durationSeconds, ...stats } });
    } catch (error) {
      logger.error('Failed to end form analysis session', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { sessionId }
      });
      throw error;
    }
  }

  /**
   * Add rep analysis to session
   */
  async addRepAnalysis(sessionId: number, repData: {
    repNumber: number;
    startTime?: Date;
    endTime?: Date;
    durationMs?: number;
    score: number;
    feedback?: string;
    keypoints: any;
    angles: any;
    metrics: any;
  }): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO rep_analyses (
          session_id, rep_number, start_time, end_time, duration_ms,
          score, feedback, keypoints, angles, metrics
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        sessionId,
        repData.repNumber,
        repData.startTime?.toISOString() || null,
        repData.endTime?.toISOString() || null,
        repData.durationMs || null,
        repData.score,
        repData.feedback || null,
        JSON.stringify(repData.keypoints),
        JSON.stringify(repData.angles),
        JSON.stringify(repData.metrics)
      );

      logger.info('Rep analysis added', {
        metadata: {
          repId: result.lastInsertRowid.toString(),
          sessionId: sessionId.toString(),
          repNumber: repData.repNumber.toString(),
          score: repData.score.toString()
        }
      });

      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to add rep analysis', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { sessionId: sessionId.toString(), repNumber: repData.repNumber.toString() }
      });
      throw error;
    }
  }

  /**
   * Get user's form analysis sessions
   */
  async getUserSessions(userId: string | number, limit: number = 20): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          exercise_type,
          session_start,
          session_end,
          duration_seconds,
          average_score,
          best_score,
          worst_score,
          total_reps,
          completed_reps,
          notes,
          created_at
        FROM form_analysis_sessions
        WHERE user_id = ?
        ORDER BY session_start DESC
        LIMIT ?
      `);

      const sessions = stmt.all(userId, limit);
      return sessions as any[];
    } catch (error) {
      logger.error('Failed to get user sessions', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { userId: userId.toString() }
      });
      throw error;
    }
  }

  /**
   * Get session details with rep analyses
   */
  async getSessionDetails(sessionId: number): Promise<any> {
    try {
      // Get session data
      const sessionStmt = this.db.prepare(`
        SELECT *
        FROM form_analysis_sessions
        WHERE id = ?
      `);

      const session = sessionStmt.get(sessionId) as any;

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Get rep analyses
      const repsStmt = this.db.prepare(`
        SELECT *
        FROM rep_analyses
        WHERE session_id = ?
        ORDER BY rep_number
      `);

      const repAnalyses = repsStmt.all(sessionId) as any[];

      return {
        ...session,
        repAnalyses: repAnalyses.map(rep => ({
          ...rep,
          keypoints: JSON.parse(rep.keypoints || '{}'),
          angles: JSON.parse(rep.angles || '{}'),
          metrics: JSON.parse(rep.metrics || '{}')
        }))
      };
    } catch (error) {
      logger.error('Failed to get session details', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { sessionId: sessionId.toString() }
      });
      throw error;
    }
  }

  /**
   * Get user's exercise statistics
   */
  async getUserExerciseStats(userId: string | number, exerciseType?: string): Promise<any> {
    try {
      let query = `
        SELECT 
          exercise_type,
          COUNT(*) as total_sessions,
          AVG(average_score) as avg_score,
          MAX(best_score) as best_score,
          MIN(worst_score) as worst_score,
          SUM(total_reps) as total_reps,
          SUM(completed_reps) as completed_reps,
          AVG(duration_seconds) as avg_duration
        FROM form_analysis_sessions
        WHERE user_id = ? AND session_end IS NOT NULL
      `;

      const params: any[] = [userId];

      if (exerciseType) {
        query += ' AND exercise_type = ?';
        params.push(exerciseType);
      }

      query += ' GROUP BY exercise_type ORDER BY total_sessions DESC';

      const stmt = this.db.prepare(query);
      const stats = stmt.all(...params);

      return stats as any[];
    } catch (error) {
      logger.error('Failed to get user exercise stats', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { userId: userId.toString(), exerciseType }
      });
      throw error;
    }
  }

  /**
   * Add form feedback
   */
  async addFeedback(feedbackData: {
    userId: string | number;
    sessionId: number;
    repId?: number;
    feedbackType: 'correction' | 'encouragement' | 'tip' | 'warning';
    bodyPart: string;
    issue: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO form_feedback (
          user_id, session_id, rep_id, feedback_type, body_part,
          issue, suggestion, severity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        feedbackData.userId,
        feedbackData.sessionId,
        feedbackData.repId || null,
        feedbackData.feedbackType,
        feedbackData.bodyPart,
        feedbackData.issue,
        feedbackData.suggestion,
        feedbackData.severity
      );

      logger.info('Form feedback added', {
        metadata: {
          feedbackId: result.lastInsertRowid.toString(),
          ...feedbackData
        }
      });

      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Failed to add form feedback', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { ...feedbackData }
      });
      throw error;
    }
  }

  /**
   * Get rep analyses by session ID
   */
  async getRepAnalysesBySession(sessionId: number): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT *
        FROM rep_analyses
        WHERE session_id = ?
        ORDER BY rep_number
      `);

      const repAnalyses = stmt.all(sessionId) as any[];

      return repAnalyses.map(rep => ({
        ...rep,
        keypoints: JSON.parse(rep.keypoints || '{}'),
        angles: JSON.parse(rep.angles || '{}'),
        metrics: JSON.parse(rep.metrics || '{}')
      }));
    } catch (error) {
      logger.error('Failed to get rep analyses by session', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { sessionId: sessionId.toString() }
      });
      throw error;
    }
  }

  /**
   * Get sessions by user ID
   */
  async getSessionsByUserId(userId: string | number): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT *
        FROM form_analysis_sessions
        WHERE user_id = ?
        ORDER BY session_start DESC
      `);

      const sessions = stmt.all(userId) as any[];
      return sessions;
    } catch (error) {
      logger.error('Failed to get sessions by user ID', {
        error: error instanceof Error ? error.message : String(error),
        metadata: { userId: userId.toString() }
      });
      throw error;
    }
  }
}
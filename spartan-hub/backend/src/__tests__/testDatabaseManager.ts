import fs from 'fs';
import path from 'path';
import DatabaseManager from '../database/databaseManager';

/**
 * Test Database Manager
 * Handles setup, teardown, and isolation for test databases
 */
export class TestDatabaseManager {
  private testDbPath: string;
  private originalDbPath: string;

  constructor() {
    const workerId = process.env.JEST_WORKER_ID || '1';
    this.testDbPath = path.join(process.cwd(), 'data', `test_spartan_${workerId}.db`);
    this.originalDbPath = path.join(process.cwd(), 'data', 'spartan.db');
  }

  /**
   * Set up isolated test database
   */
  async setupTestDatabase(): Promise<void> {
    // Ensure test data directory exists
    const testDataDir = path.dirname(this.testDbPath);
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Remove existing test database if it exists
    this.deleteDatabaseFiles();

    // Initialize using DatabaseManager
    const manager = DatabaseManager.getInstance(this.testDbPath);
    await manager.initialize({
      dbPath: this.testDbPath,
      verbose: false
    });

    // Ensure core schema is fully initialized
    const db = manager.getDatabase();
    
    // Explicitly create core tables if they don't exist (safety for parallel tests)
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        quest TEXT,
        stats TEXT DEFAULT '{}',
        onboardingCompleted INTEGER DEFAULT 0,
        keystoneHabits TEXT DEFAULT '[]',
        masterRegulationSettings TEXT DEFAULT '{}',
        nutritionSettings TEXT DEFAULT '{}',
        isInAutonomyPhase INTEGER DEFAULT 0,
        weightKg REAL,
        trainingCycle TEXT DEFAULT '{}',
        lastWeeklyPlanDate TEXT,
        detailedProfile TEXT DEFAULT '{}',
        preferences TEXT DEFAULT '{}',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS training_plans (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT,
        status TEXT DEFAULT 'active',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        userAgent TEXT,
        ipAddress TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        expiresAt TEXT NOT NULL,
        lastActivityAt TEXT DEFAULT CURRENT_TIMESTAMP,
        isActive INTEGER DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS daily_biometric_summaries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        avg_hr REAL,
        min_hr REAL,
        max_hr REAL,
        avg_hrv REAL,
        sleep_score INTEGER,
        recovery_score REAL,
        recoveryScore REAL, -- Compatibility
        readiness_score REAL,
        readinessScore REAL, -- Compatibility
        injury_probability REAL,
        injuryProbability REAL, -- Compatibility
        stress_level REAL,
        stressLevel REAL, -- Compatibility
        sleep_duration REAL,
        sleepDuration REAL, -- Compatibility
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        channel TEXT NOT NULL,
        priority TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        delivered_at TEXT,
        failure_reason TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id TEXT PRIMARY KEY,
        email_notifications INTEGER DEFAULT 1,
        push_notifications INTEGER DEFAULT 1,
        in_app_notifications INTEGER DEFAULT 1,
        injury_risk_alerts INTEGER DEFAULT 1,
        poor_recovery_alerts INTEGER DEFAULT 1,
        training_recommendations INTEGER DEFAULT 1,
        motivational_messages INTEGER DEFAULT 1,
        weekly_digest INTEGER DEFAULT 1,
        unsubscribe_token TEXT UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_learning_weights (
        user_id TEXT PRIMARY KEY,
        user_pref REAL DEFAULT 0.3,
        physio REAL DEFAULT 0.25,
        perf REAL DEFAULT 0.2,
        context REAL DEFAULT 0.15,
        temporal REAL DEFAULT 0.1,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS plan_adaptations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        confidence REAL,
        timestamp INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_adaptation_feedback (
        user_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        rating INTEGER,
        timestamp INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ml_forecasts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        predicted_readiness REAL,
        confidence REAL,
        direction TEXT,
        trend_influence REAL,
        cycle_influence REAL,
        seasonal_influence REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS injury_probabilities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        probability_percent REAL,
        risk_score REAL,
        elevated_rhr INTEGER,
        suppressed_hrv INTEGER,
        sleep_deprivation INTEGER,
        consecutive_hard_days INTEGER,
        overtraining_marker INTEGER,
        confidence_score REAL,
        recommendation TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS vital_coach_decisions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        hrv_status TEXT,
        rhr_trend TEXT,
        stress_status TEXT,
        training_load_status TEXT,
        sleep_quality TEXT,
        overall_recovery_status TEXT,
        nervous_system_load INTEGER,
        injury_risk TEXT,
        training_readiness INTEGER,
        triggered_rules TEXT,
        recommended_action TEXT,
        action_priority TEXT,
        confidence_score REAL,
        explanation TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS vital_coach_alerts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        recommended_action TEXT,
        is_read INTEGER DEFAULT 0,
        expires_at TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rag_citations (
        id TEXT PRIMARY KEY,
        chunk_id TEXT NOT NULL,
        source_title TEXT NOT NULL,
        authors TEXT,
        publication_date TEXT,
        page_number INTEGER,
        url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // The manager stays open and will be used by the app code
  }

  /**
   * Clean up test database
   */
  async cleanupTestDatabase(): Promise<void> {
    try {
      const manager = DatabaseManager.getInstance();
      if (manager) {
        manager.close();
      }
    } catch (e) {
      // Ignore errors if already closed
    }

    // Small delay to allow OS to release file handles
    await new Promise(resolve => setTimeout(resolve, 500));

    this.deleteDatabaseFiles();
  }

  /**
   * Delete database and its side files (WAL, SHM)
   */
  private deleteDatabaseFiles(): void {
    const filesToDelete = [
      this.testDbPath,
      `${this.testDbPath}-wal`,
      `${this.testDbPath}-shm`
    ];

    for (const file of filesToDelete) {
      if (!fs.existsSync(file)) continue;

      let deleted = false;
      const maxRetries = 5;

      for (let i = 0; i < maxRetries && !deleted; i++) {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
          deleted = true;
        } catch (error) {
          if (i < maxRetries - 1) {
            // Wait increasingly for file lock to release
            const waitTime = 200 * (i + 1);
            const start = Date.now();
            while (Date.now() - start < waitTime) { /* sync wait for reliability in tests */ }
          }
        }
      }

      if (!deleted) {
        // If file is still locked, try to rename it for future cleanup
        try {
          const tempPath = `${file}.old_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          fs.renameSync(file, tempPath);
        } catch (renameError) {
          // Final fallback: just log it
          // console.warn(`Could not delete or rename test database file: ${file}`);
        }
      }
    }
  }

  /**
   * Get test database path
   */
  getTestDbPath(): string {
    return this.testDbPath;
  }

  /**
   * Set environment to use test database
   */
  setTestEnvironment(): void {
    process.env.DATABASE_TYPE = 'sqlite';
    process.env.TEST_DATABASE_PATH = this.testDbPath;

    // Override the database path in config
    process.env.DB_PATH = this.testDbPath;
  }

  /**
   * Restore original environment
   */
  restoreOriginalEnvironment(): void {
    delete process.env.TEST_DATABASE_PATH;
    delete process.env.DB_PATH;
  }
}

// Global test database manager instance
export const testDbManager = new TestDatabaseManager();
import fs from 'fs';
import path from 'path';
import os from 'os';
import DatabaseManager from '../database/databaseManager';
import { logger } from '../utils/logger';
const Database = require('better-sqlite3');
type DatabaseType = any;

/**
 * E2E Test Database Manager
 * Handles persistent database for End-to-End testing
 */
export class E2ETestManager {
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.E2E_DB_PATH || path.join(os.tmpdir(), 'spartan-hub-e2e', 'test_e2e.db');
  }

  /**
   * Initialize E2E database with schema
   */
  async setupDatabase(): Promise<void> {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize using DatabaseManager
    const manager = DatabaseManager.getInstance(this.dbPath);
    await manager.initialize({
      dbPath: this.dbPath,
      verbose: false
    });

    logger.info('✅ E2E Test Database initialized', { context: 'e2e-test' });
  }

  /**
   * Clean all data but preserve schema
   */
  async cleanDatabase(): Promise<void> {
    const db = this.openWritableDb();

    // Get all tables to clear from the migrations and schema
    const tables = [
      'sessions',
      'plan_assignments',
      'commitments',
      'user_activities',
      'exercises',
      'routines',
      'users',
      'form_analyses' // This was missing and caused previous test failures!
    ];

    try {
      db.pragma('foreign_keys = OFF');
      const tx = (db as any).transaction
        ? (db as any).transaction.bind(db)
        : null;

      const clearTables = () => {
        for (const table of tables) {
          try {
            db.prepare(`DELETE FROM ${table}`).run();
          } catch (error) {
            // Ignore if table doesn't exist yet
            const message = error instanceof Error ? error.message : String(error);
            if (!message.includes('no such table')) {
              throw error;
            }
          }
        }
      };

      if (tx) {
        tx(clearTables)();
      } else {
        clearTables();
      }
    } finally {
      db.pragma('foreign_keys = ON');
      db.close();
    }
    logger.info('🧹 E2E Test Database cleaned', { context: 'e2e-test' });
  }

  /**
   * Close database connection
   */
  close(): void {
    DatabaseManager.getInstance(this.dbPath).close();
  }

  /**
   * Get database path
   */
  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Seed a user
   */
  async seedUser(user: any): Promise<void> {
    const db = this.openWritableDb();

    try {
      const stmt = db.prepare(`
        INSERT INTO users (
          id, name, email, password, role, onboardingCompleted, 
          stats, preferences, createdAt, updatedAt
        ) VALUES (
          @id, @name, @email, @password, @role, @onboardingCompleted,
          @stats, @preferences, @createdAt, @updatedAt
        )
      `);

      stmt.run({
        id: user.id || 'test-user-id',
        name: user.name || 'Test User',
        email: user.email || 'test@example.com',
        password: user.password || '$2b$10$EpIc.k.d.g.h.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z', // Mock hash
        role: user.role || 'user',
        onboardingCompleted: user.onboardingCompleted ? 1 : 0,
        stats: JSON.stringify(user.stats || {}),
        preferences: JSON.stringify(user.preferences || {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } finally {
      db.close();
    }
  }

  /**
   * Seed a session
   */
  async seedSession(session: any): Promise<void> {
    const db = this.openWritableDb();

    try {
      const stmt = db.prepare(`
        INSERT INTO sessions (
          id, userId, token, userAgent, ipAddress, 
          createdAt, expiresAt, lastActivityAt, isActive
        ) VALUES (
          @id, @userId, @token, @userAgent, @ipAddress,
          @createdAt, @expiresAt, @lastActivityAt, @isActive
        )
      `);

      stmt.run({
        id: session.id || 'test-session-id',
        userId: session.userId,
        token: session.token,
        userAgent: session.userAgent || 'TestAgent',
        ipAddress: session.ipAddress || '127.0.0.1',
        createdAt: new Date().toISOString(),
        expiresAt: session.expiresAt || new Date(Date.now() + 86400000).toISOString(),
        lastActivityAt: new Date().toISOString(),
        isActive: 1
      });
    } finally {
      db.close();
    }
  }

  private openWritableDb(): DatabaseType {
    return new Database(this.dbPath, {
      readonly: false,
      timeout: 10000
    } as any);
  }
}

export const e2eManager = new E2ETestManager();

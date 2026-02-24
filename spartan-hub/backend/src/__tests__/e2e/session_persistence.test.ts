import fs from 'fs';
import os from 'os';
import path from 'path';

const Database = require('better-sqlite3');
type DatabaseType = any;

describe('E2E Session Persistence', () => {
  let dbPath: string;

  const testUser = {
    id: 'e2e-user-1',
    name: 'E2E User',
    email: 'e2e@example.com',
    password: 'password123',
    role: 'user'
  };

  const testSession = {
    id: 'e2e-session-1',
    userId: testUser.id,
    token: 'persistent-token-123'
  };

  beforeAll(async () => {
    const dataDir = path.join(os.tmpdir(), 'spartan-hub-e2e');
    fs.mkdirSync(dataDir, { recursive: true });
    dbPath = path.join(dataDir, 'test_session_persistence.db');

    for (const filePath of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const db: DatabaseType = new Database(dbPath, {
      readonly: false,
      timeout: 10000
    } as any);

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        onboardingCompleted INTEGER DEFAULT 0,
        stats TEXT,
        preferences TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        userAgent TEXT,
        ipAddress TEXT,
        createdAt TEXT,
        expiresAt TEXT,
        lastActivityAt TEXT,
        isActive INTEGER DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    db.prepare(`
      INSERT INTO users (
        id, name, email, password, role, onboardingCompleted, stats, preferences, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testUser.id,
      testUser.name,
      testUser.email,
      testUser.password,
      testUser.role,
      0,
      JSON.stringify({}),
      JSON.stringify({}),
      new Date().toISOString(),
      new Date().toISOString()
    );

    db.close();
  });

  afterAll(() => {
    for (const filePath of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  test('Step 1: Create Session (Seed)', async () => {
    const db: DatabaseType = new Database(dbPath, {
      readonly: false,
      timeout: 10000
    } as any);

    db.prepare(`
      INSERT INTO sessions (
        id, userId, token, userAgent, ipAddress, createdAt, expiresAt, lastActivityAt, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testSession.id,
      testSession.userId,
      testSession.token,
      'TestAgent',
      '127.0.0.1',
      new Date().toISOString(),
      new Date(Date.now() + 86400000).toISOString(),
      new Date().toISOString(),
      1
    );

    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(testSession.token);
    db.close();

    expect(session).toBeDefined();
    expect(session.userId).toBe(testUser.id);
  });

  test('Step 2: Verify Session Persistence', async () => {
    const db: DatabaseType = new Database(dbPath, {
      readonly: false,
      timeout: 10000
    } as any);

    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(testSession.token);
    db.close();

    expect(session).toBeDefined();
    expect(session.isActive).toBeTruthy();
  });
});

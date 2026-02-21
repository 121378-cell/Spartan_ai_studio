/**
 * Test Database Utilities
 * Configuración de base de datos para tests aislados
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_PATH = path.join(__dirname, '../../data/test.db');

/**
 * Creates an isolated test database
 */
export function createTestDatabase(): Database {
  // Ensure data directory exists
  const dataDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  const db = new Database(TEST_DB_PATH);
  db.pragma('journal_mode = WAL');
  
  return db;
}

/**
 * Initialize test database with schema
 */
export function initTestSchema(db: Database): void {
  // Users table with role field
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Refresh tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Add indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);`);
}

/**
 * Seed test data
 */
export function seedTestData(db: Database): void {
  const stmt = db.prepare(`
    INSERT INTO users (email, password, name, role)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run('test@example.com', 'hashedpassword', 'Test User', 'user');
  stmt.run('admin@example.com', 'hashedpassword', 'Admin User', 'admin');
}

/**
 * Close and cleanup test database
 */
export function closeTestDatabase(db: Database): void {
  db.close();
  
  // Cleanup WAL files
  const walPath = TEST_DB_PATH + '-wal';
  const shmPath = TEST_DB_PATH + '-shm';
  
  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
  }
  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

/**
 * Setup helper for Jest tests
 */
export function setupTestDb(): { db: Database; cleanup: () => void } {
  const db = createTestDatabase();
  initTestSchema(db);
  seedTestData(db);

  return {
    db,
    cleanup: () => closeTestDatabase(db)
  };
}

/**
 * Database Initialization Tests
 * 
 * Tests for database setup, migrations, backup/recovery, and integrity verification
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import {
  initializeDatabase,
  getDatabase,
  getDatabaseManager,
  closeDatabase
} from '../databaseManager';
import migrate_001_create_biometric_tables from '../migrations/001-create-biometric-tables';
import BackupManager from '../backupManager';

describe('Database Initialization', () => {
  const testDbPath = 'data/test-spartan-hub.db';
  const testBackupDir = 'data/test-backups';

  beforeAll(async () => {
    // Cleanup test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true });
    }
  });

  afterAll(() => {
    closeDatabase();
    // Cleanup
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true });
    }
  });

  describe('DatabaseManager', () => {
    it('should initialize database with biometric tables', async () => {
      const result = await initializeDatabase({ dbPath: testDbPath });

      expect(result.success).toBe(true);
      expect(result.initialized).toBe(true);
      expect(result.schemaVersion).toBe(1);
      expect(result.tablesCount).toBeGreaterThan(0);
      expect(result.indexesCount).toBeGreaterThan(0);
      expect(result.migrationsRun).toContain('001-create-biometric-tables');
    });

    it('should have created required tables', async () => {
      const db = getDatabase();
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as any[];

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('wearable_devices');
      expect(tableNames).toContain('biometric_data_points');
      expect(tableNames).toContain('daily_biometric_summaries');
    });

    it('should have created performance indexes', async () => {
      const db = getDatabase();
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
        ORDER BY name
      `).all() as any[];

      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_biometric_user_timestamp');
      expect(indexNames).toContain('idx_biometric_user_type');
      expect(indexNames).toContain('idx_daily_summary_user_date');
      expect(indexNames).toContain('idx_wearable_device_user');
    });

    it('should pass health check', async () => {
      const manager = getDatabaseManager();
      const health = await manager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.connected).toBe(true);
      expect(health.tables).toBeGreaterThan(0);
      expect(health.errors.length).toBe(0);
    });

    it('should have foreign keys enabled', () => {
      const db = getDatabase();
      const fk = db.prepare('PRAGMA foreign_keys').get() as any;

      expect(fk.foreign_keys).toBe(1);
    });
  });

  describe('Migration', () => {
    it('should run migration without errors', () => {
      const db = new Database(':memory:');
      const result = migrate_001_create_biometric_tables(db);

      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.tablesCreated.length).toBeGreaterThan(0);
      expect(result.indexesCreated.length).toBeGreaterThan(0);

      db.close();
    });

    it('should create wearable_devices table with correct schema', () => {
      const db = getDatabase();
      const columns = db.prepare('PRAGMA table_info(wearable_devices)').all() as any[];

      const columnNames = columns.map(c => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('deviceType');
      expect(columnNames).toContain('accessToken');
      expect(columnNames).toContain('refreshToken');
      expect(columnNames).toContain('isActive');
    });

    it('should create biometric_data_points table with correct schema', () => {
      const db = getDatabase();
      const columns = db.prepare('PRAGMA table_info(biometric_data_points)').all() as any[];

      const columnNames = columns.map(c => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('timestamp');
      expect(columnNames).toContain('dataType');
      expect(columnNames).toContain('value');
      expect(columnNames).toContain('confidence');
    });

    it('should create daily_biometric_summaries table with correct schema', () => {
      const db = getDatabase();
      const columns = db.prepare('PRAGMA table_info(daily_biometric_summaries)').all() as any[];

      const columnNames = columns.map(c => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('date');
      expect(columnNames).toContain('heartRateAvg');
      expect(columnNames).toContain('hrvAvg');
      expect(columnNames).toContain('sleepDuration');
    });
  });

  describe('Backup & Recovery', () => {
    it('should create database backup', async () => {
      const db = getDatabase();
      const backupManager = new BackupManager(db, testBackupDir);

      const backupResult = await backupManager.createBackup({ retain: 3 });

      expect(backupResult.success).toBe(true);
      expect(backupResult.backupPath).toBeTruthy();
      expect(backupResult.size).toBeGreaterThan(0);
      expect(fs.existsSync(backupResult.backupPath)).toBe(true);
    });

    it('should list backups', async () => {
      const db = getDatabase();
      const backupManager = new BackupManager(db, testBackupDir);

      // Create a backup first
      await backupManager.createBackup();

      const backups = backupManager.listBackups();

      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0].name).toBeTruthy();
      expect(backups[0].size).toBeGreaterThan(0);
    });

    it('should verify database integrity', async () => {
      const db = getDatabase();
      const backupManager = new BackupManager(db, testBackupDir);

      const integrityResult = await backupManager.verifyIntegrity();

      expect(integrityResult.healthy).toBe(true);
      expect(integrityResult.errors.length).toBe(0);
      expect(integrityResult.tables.length).toBeGreaterThan(0);
    });

    it('should optimize database', async () => {
      const db = getDatabase();
      const backupManager = new BackupManager(db, testBackupDir);

      const optimizeResult = await backupManager.optimize();

      expect(optimizeResult.success).toBe(true);
      expect(optimizeResult.errors.length).toBe(0);
    });
  });

  describe('Data Operations', () => {
    beforeEach(() => {
      // Insert test user first
      const db = getDatabase();
      const userId = `test-user-${Date.now()}`;
      db.prepare(`
        INSERT OR IGNORE INTO users (id, email, name, createdAt)
        VALUES (?, ?, ?, ?)
      `).run(userId, `${userId}@test.com`, 'Test User', Date.now());
    });

    it('should insert and retrieve wearable device', () => {
      const db = getDatabase();
      const userId = 'test-user';
      const deviceId = `${userId}_apple_health_${Date.now()}`;

      const insertStmt = db.prepare(`
        INSERT INTO wearable_devices (
          id, userId, deviceType, deviceName, accessToken, isActive, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        deviceId,
        userId,
        'apple_health',
        'Apple Health',
        'test_token',
        1,
        Date.now(),
        Date.now()
      );

      const device = db.prepare('SELECT * FROM wearable_devices WHERE id = ?').get(deviceId) as any;

      expect(device).toBeTruthy();
      expect(device.userId).toBe(userId);
      expect(device.deviceType).toBe('apple_health');
      expect(device.isActive).toBe(1);
    });

    it('should insert and retrieve biometric data point', () => {
      const db = getDatabase();
      const userId = 'test-user';
      const dataPointId = `bp_${userId}_${Date.now()}`;

      const insertStmt = db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, confidence, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        dataPointId,
        userId,
        Date.now(),
        'heart_rate',
        72,
        'bpm',
        'apple_health',
        'Apple Health',
        0.95,
        Date.now()
      );

      const dataPoint = db.prepare(
        'SELECT * FROM biometric_data_points WHERE id = ?'
      ).get(dataPointId) as any;

      expect(dataPoint).toBeTruthy();
      expect(dataPoint.dataType).toBe('heart_rate');
      expect(dataPoint.value).toBe(72);
      expect(dataPoint.confidence).toBe(0.95);
    });

    it('should insert and retrieve daily summary', () => {
      const db = getDatabase();
      const userId = 'test-user';
      const date = new Date().toISOString().split('T')[0];
      const summaryId = `ds_${userId}_${date}`;

      const insertStmt = db.prepare(`
        INSERT INTO daily_biometric_summaries (
          id, userId, date, heartRateAvg, heartRateMin, heartRateMax,
          rhhr, hrvAvg, sleepDuration, totalSteps, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        summaryId,
        userId,
        date,
        70,
        60,
        85,
        58,
        45,
        7,
        8000,
        Date.now(),
        Date.now()
      );

      const summary = db.prepare(
        'SELECT * FROM daily_biometric_summaries WHERE id = ?'
      ).get(summaryId) as any;

      expect(summary).toBeTruthy();
      expect(summary.date).toBe(date);
      expect(summary.heartRateAvg).toBe(70);
      expect(summary.sleepDuration).toBe(7);
    });
  });

  describe('Constraints & Validation', () => {
    it('should enforce NOT NULL constraints', () => {
      const db = getDatabase();

      // Try to insert without required fields
      const insertStmt = db.prepare(`
        INSERT INTO biometric_data_points (
          id, userId, timestamp, dataType, value, unit, device, source, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      expect(() => {
        insertStmt.run(
          'test-id',
          null, // Missing userId
          Date.now(),
          'heart_rate',
          72,
          'bpm',
          'apple_health',
          'Apple Health',
          Date.now()
        );
      }).toThrow();
    });

    it('should enforce UNIQUE constraints', () => {
      const db = getDatabase();
      const userId = 'test-user';
      const date = new Date().toISOString().split('T')[0];

      const insertStmt = db.prepare(`
        INSERT INTO daily_biometric_summaries (
          id, userId, date, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?)
      `);

      insertStmt.run(`ds_1_${date}`, userId, date, Date.now(), Date.now());

      // Try to insert duplicate
      expect(() => {
        insertStmt.run(`ds_2_${date}`, userId, date, Date.now(), Date.now());
      }).toThrow();
    });
  });
});

/**
 * Form Analysis Service - Simple Test
 * Phase A: Video Form Analysis MVP
 * 
 * This is a simple JavaScript test to verify the service works.
 * Full TypeScript tests will be added later.
 */

const Database = require('better-sqlite3');
const { FormAnalysisService } = require('../services/formAnalysisService');

describe('FormAnalysisService - Simple', () => {
  let db;
  let service;

  beforeAll(() => {
    // Create in-memory test database
    db = new Database(':memory:');
    
    // Create table
    db.exec(`
      CREATE TABLE form_analyses (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        exerciseType TEXT NOT NULL,
        formScore INTEGER NOT NULL,
        metrics TEXT NOT NULL,
        warnings TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
      )
    `);

    service = new FormAnalysisService(db);
  });

  afterAll(() => {
    db.close();
  });

  test('should create a form analysis', () => {
    const result = service.create({
      userId: 'user-123',
      exerciseType: 'squat',
      formScore: 85,
      metrics: { repsCompleted: 10, durationSeconds: 45 },
      warnings: ['Good form'],
      recommendations: ['Keep it up']
    });

    expect(result.id).toBeDefined();
    expect(result.formScore).toBe(85);
    expect(result.userId).toBe('user-123');
  });

  test('should find by ID', () => {
    const created = service.create({
      userId: 'user-456',
      exerciseType: 'deadlift',
      formScore: 90,
      metrics: { repsCompleted: 5 },
      warnings: [],
      recommendations: []
    });

    const found = service.findById(created.id);
    expect(found).not.toBeNull();
    expect(found.formScore).toBe(90);
  });

  test('should return user stats', () => {
    service.create({
      userId: 'user-stats',
      exerciseType: 'squat',
      formScore: 80,
      metrics: { repsCompleted: 10 },
      warnings: [],
      recommendations: []
    });

    service.create({
      userId: 'user-stats',
      exerciseType: 'squat',
      formScore: 90,
      metrics: { repsCompleted: 10 },
      warnings: [],
      recommendations: []
    });

    const stats = service.getUserStats('user-stats');
    expect(stats.totalAnalyses).toBe(2);
    expect(stats.averageScore).toBe(85);
  });
});

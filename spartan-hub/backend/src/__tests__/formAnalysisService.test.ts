/**
 * Form Analysis Service Tests
 * Phase A: Video Form Analysis MVP
 */

import Database from 'better-sqlite3';
import { FormAnalysisService } from '../services/formAnalysisService';
import { FormAnalysis, ExerciseType } from '../models/FormAnalysis';

describe('FormAnalysisService', () => {
  let db: Database;
  let service: FormAnalysisService;

  beforeAll(() => {
    // Create in-memory test database
    db = new Database(':memory:');
    db.pragma('foreign_keys = OFF');
    
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
        createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX idx_form_analysis_user_created 
      ON form_analyses(userId, createdAt DESC)
    `);

    db.exec(`
      CREATE INDEX idx_form_analysis_type 
      ON form_analyses(userId, exerciseType)
    `);

    service = new FormAnalysisService(db);
  });

  afterAll(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a form analysis successfully', () => {
      const dto = {
        userId: 'user-123',
        exerciseType: 'squat' as ExerciseType,
        formScore: 85,
        metrics: {
          repsCompleted: 10,
          durationSeconds: 45,
          kneeValgusAngle: 5,
          squatDepth: 'parallel' as const,
          torsoAngle: 15
        },
        warnings: ['Slight knee valgus detected'],
        recommendations: ['Focus on pushing knees out during ascent']
      };

      const result = service.create(dto);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(dto.userId);
      expect(result.exerciseType).toBe(dto.exerciseType);
      expect(result.formScore).toBe(dto.formScore);
      expect(result.metrics).toEqual(dto.metrics);
      expect(result.warnings).toEqual(dto.warnings);
      expect(result.recommendations).toEqual(dto.recommendations);
      expect(result.createdAt).toBeDefined();
    });

    it('should create form analysis for deadlift', () => {
      const dto = {
        userId: 'user-456',
        exerciseType: 'deadlift' as ExerciseType,
        formScore: 92,
        metrics: {
          repsCompleted: 5,
          durationSeconds: 30,
          backRounding: 'neutral' as const,
          barPathDeviation: 2.5,
          hipHeight: 'optimal' as const
        },
        warnings: [],
        recommendations: ['Excellent form! Maintain this technique.']
      };

      const result = service.create(dto);

      expect(result.formScore).toBe(92);
      expect(result.metrics.backRounding).toBe('neutral');
    });
  });

  describe('findById', () => {
    it('should find form analysis by ID', () => {
      const dto = {
        userId: 'user-789',
        exerciseType: 'squat' as ExerciseType,
        formScore: 78,
        metrics: {
          repsCompleted: 8,
          durationSeconds: 40,
          kneeValgusAngle: 10
        },
        warnings: ['Moderate knee valgus'],
        recommendations: ['Reduce weight and focus on form']
      };

      const created = service.create(dto);
      const found = service.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.formScore).toBe(78);
    });

    it('should return null for non-existent ID', () => {
      const result = service.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return all analyses for a user', () => {
      // Create multiple analyses for same user
      service.create({
        userId: 'user-multi',
        exerciseType: 'squat' as ExerciseType,
        formScore: 80,
        metrics: { repsCompleted: 10, durationSeconds: 45 },
        warnings: [],
        recommendations: []
      });

      service.create({
        userId: 'user-multi',
        exerciseType: 'deadlift' as ExerciseType,
        formScore: 85,
        metrics: { repsCompleted: 5, durationSeconds: 30 },
        warnings: [],
        recommendations: []
      });

      const results = service.findByUserId('user-multi');

      expect(results.length).toBe(2);
      expect(results.map(r => r.userId)).toEqual(['user-multi', 'user-multi']);
    });

    it('should respect limit parameter', () => {
      const results = service.findByUserId('user-multi', 1);
      expect(results.length).toBe(1);
    });
  });

  describe('find with filters', () => {
    it('should filter by exercise type', () => {
      const results = service.find({ exerciseType: 'squat' });
      expect(results.every(r => r.exerciseType === 'squat')).toBe(true);
    });

    it('should filter by min score', () => {
      const results = service.find({ minScore: 80 });
      expect(results.every(r => r.formScore >= 80)).toBe(true);
    });

    it('should filter by max score', () => {
      const results = service.find({ maxScore: 85 });
      expect(results.every(r => r.formScore <= 85)).toBe(true);
    });

    it('should combine multiple filters', () => {
      const results = service.find({
        exerciseType: 'squat',
        minScore: 80,
        maxScore: 90
      });

      expect(results.every(r => 
        r.exerciseType === 'squat' && 
        r.formScore >= 80 && 
        r.formScore <= 90
      )).toBe(true);
    });
  });

  describe('update', () => {
    it('should update form analysis', () => {
      const created = service.create({
        userId: 'user-update',
        exerciseType: 'squat' as ExerciseType,
        formScore: 70,
        metrics: { repsCompleted: 10, durationSeconds: 45 },
        warnings: ['Poor form'],
        recommendations: ['Improve technique']
      });

      const updated = service.update(created.id, {
        formScore: 85,
        recommendations: ['Much better!']
      });

      expect(updated?.formScore).toBe(85);
      expect(updated?.recommendations).toEqual(['Much better!']);
    });

    it('should return null for non-existent ID', () => {
      const result = service.update('non-existent-id', { formScore: 90 });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete form analysis', () => {
      const created = service.create({
        userId: 'user-delete',
        exerciseType: 'squat' as ExerciseType,
        formScore: 75,
        metrics: { repsCompleted: 10, durationSeconds: 45 },
        warnings: [],
        recommendations: []
      });

      const deleted = service.delete(created.id);
      expect(deleted).toBe(true);

      const found = service.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const result = service.delete('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', () => {
      // Create test data
      service.create({
        userId: 'user-stats',
        exerciseType: 'squat' as ExerciseType,
        formScore: 80,
        metrics: { repsCompleted: 10, durationSeconds: 45 },
        warnings: [],
        recommendations: []
      });

      service.create({
        userId: 'user-stats',
        exerciseType: 'deadlift' as ExerciseType,
        formScore: 90,
        metrics: { repsCompleted: 5, durationSeconds: 30 },
        warnings: [],
        recommendations: []
      });

      const stats = service.getUserStats('user-stats');

      expect(stats.totalAnalyses).toBe(2);
      expect(stats.averageScore).toBe(85);
      expect(stats.bestScore).toBe(90);
      expect(stats.worstScore).toBe(80);
      expect(stats.byExerciseType.squat.count).toBe(1);
      expect(stats.byExerciseType.deadlift.count).toBe(1);
    });

    it('should return zeros for user with no analyses', () => {
      const stats = service.getUserStats('non-existent-user');

      expect(stats.totalAnalyses).toBe(0);
      expect(stats.averageScore).toBe(0);
    });
  });
});

/**
 * Form Analysis Routes - Simple Integration Test
 * Phase A: Video Form Analysis MVP
 * 
 * @jest-environment node
 */

const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const { FormAnalysisService } = require('../../services/formAnalysisService');

describe('Form Analysis API - Simple', () => {
  let app;
  let db;

  beforeAll(() => {
    // Create test database
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

    // Create test Express app
    app = express();
    app.use(express.json());

    // Simple routes without middleware
    app.post('/api/form-analysis', (req, res) => {
      try {
        const service = new FormAnalysisService(db);
        const result = service.create(req.body);
        res.status(201).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get('/api/form-analysis/:id', (req, res) => {
      try {
        const service = new FormAnalysisService(db);
        const result = service.findById(req.params.id);
        if (!result) {
          return res.status(404).json({ success: false, message: 'Not found' });
        }
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get('/api/form-analysis/user/:userId', (req, res) => {
      try {
        const service = new FormAnalysisService(db);
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const results = service.findByUserId(req.params.userId, limit);
        res.status(200).json({ success: true, data: results, count: results.length });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get('/api/form-analysis/user/:userId/stats', (req, res) => {
      try {
        const service = new FormAnalysisService(db);
        const stats = service.getUserStats(req.params.userId);
        res.status(200).json({ success: true, data: stats });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  });

  afterAll(() => {
    db.close();
  });

  describe('POST /api/form-analysis', () => {
    it('should create a form analysis', async () => {
      const response = await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-123',
          exerciseType: 'squat',
          formScore: 85,
          metrics: {
            repsCompleted: 10,
            durationSeconds: 45
          },
          warnings: ['Good form'],
          recommendations: ['Keep it up']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.formScore).toBe(85);
      expect(response.body.data.id).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/form-analysis')
        .send({ userId: 'test-user-123' });

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/form-analysis/:id', () => {
    let createdId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-456',
          exerciseType: 'deadlift',
          formScore: 92,
          metrics: { repsCompleted: 5 },
          warnings: [],
          recommendations: []
        });

      createdId = response.body.data.id;
    });

    it('should get form analysis by ID', async () => {
      const response = await request(app)
        .get(`/api/form-analysis/${createdId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.formScore).toBe(92);
    });
  });

  describe('GET /api/form-analysis/user/:userId', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-789',
          exerciseType: 'squat',
          formScore: 80,
          metrics: { repsCompleted: 10 },
          warnings: [],
          recommendations: []
        });

      await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-789',
          exerciseType: 'deadlift',
          formScore: 90,
          metrics: { repsCompleted: 5 },
          warnings: [],
          recommendations: []
        });
    });

    it('should get all analyses for a user', async () => {
      const response = await request(app)
        .get('/api/form-analysis/user/test-user-789');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(response.body.count).toBe(2);
    });

    it('should get user statistics', async () => {
      const response = await request(app)
        .get('/api/form-analysis/user/test-user-789/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.totalAnalyses).toBe(2);
      expect(response.body.data.averageScore).toBe(85);
    });
  });
});

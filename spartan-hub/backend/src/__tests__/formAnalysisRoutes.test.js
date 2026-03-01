/**
 * Form Analysis Routes Tests
 * Phase A: Video Form Analysis MVP
 * 
 * @jest-environment node
 */

const request = require('supertest');
const Database = require('better-sqlite3');
const express = require('express');

// Mock auth middleware BEFORE importing routes
jest.mock('../../middleware/auth', () => ({
  verifyJWT: (req, res, next) => {
    req.user = { userId: 'test-user-123' };
    next();
  }
}));

// Mock rate limiting
jest.mock('../../middleware/rateLimitMiddleware', () => ({
  apiRateLimit: (req, res, next) => {
    next();
  }
}));

const router = require('../../routes/formAnalysisRoutes').default;

describe('Form Analysis Routes - E2E', () => {
  let app;
  let db;
  let authToken;

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
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { userId: 'test-user-123' };
      next();
    });
    
    app.use('/api/form-analysis', router);
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
            durationSeconds: 45,
            kneeValgusAngle: 5
          },
          warnings: ['Slight knee valgus'],
          recommendations: ['Focus on form']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.formScore).toBe(85);
      expect(response.body.data.id).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-123'
          // Missing exerciseType and formScore
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid formScore', async () => {
      const response = await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-123',
          exerciseType: 'squat',
          formScore: 150 // Invalid: > 100
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/form-analysis/:id', () => {
    let createdId;

    beforeAll(async () => {
      // Create a test record
      const response = await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-123',
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
      expect(response.body.data.id).toBe(createdId);
      expect(response.body.data.formScore).toBe(92);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/api/form-analysis/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/form-analysis/user/:userId', () => {
    beforeAll(async () => {
      // Create multiple test records
      await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-456',
          exerciseType: 'squat',
          formScore: 80,
          metrics: { repsCompleted: 10 },
          warnings: [],
          recommendations: []
        });

      await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-456',
          exerciseType: 'deadlift',
          formScore: 85,
          metrics: { repsCompleted: 5 },
          warnings: [],
          recommendations: []
        });
    });

    it('should get all analyses for a user', async () => {
      const response = await request(app)
        .get('/api/form-analysis/user/test-user-456');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.count).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/form-analysis/user/test-user-456?limit=1');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe('GET /api/form-analysis/user/:userId/stats', () => {
    it('should get user statistics', async () => {
      const response = await request(app)
        .get('/api/form-analysis/user/test-user-456/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAnalyses).toBe(2);
      expect(response.body.data.averageScore).toBe(82.5);
    });
  });

  describe('PUT /api/form-analysis/:id', () => {
    let createdId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-update',
          exerciseType: 'squat',
          formScore: 70,
          metrics: { repsCompleted: 10 },
          warnings: ['Poor form'],
          recommendations: ['Improve technique']
        });

      createdId = response.body.data.id;
    });

    it('should update form analysis', async () => {
      const response = await request(app)
        .put(`/api/form-analysis/${createdId}`)
        .send({
          formScore: 85,
          recommendations: ['Much better!']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.formScore).toBe(85);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .put('/api/form-analysis/non-existent-id')
        .send({ formScore: 90 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/form-analysis/:id', () => {
    let createdId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/form-analysis')
        .send({
          userId: 'test-user-delete',
          exerciseType: 'squat',
          formScore: 75,
          metrics: { repsCompleted: 10 },
          warnings: [],
          recommendations: []
        });

      createdId = response.body.data.id;
    });

    it('should delete form analysis', async () => {
      const response = await request(app)
        .delete(`/api/form-analysis/${createdId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .delete('/api/form-analysis/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});

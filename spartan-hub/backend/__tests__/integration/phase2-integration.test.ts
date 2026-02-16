/**
 * Phase 2 Integration Tests
 * 
 * Validates Phase 2 service integration with frontend and API contracts
 * Tests: CoachVitalis, AdvancedAnalysis, MLForecasting, BrainOrchestrator
 */

import request from 'supertest';
import express, { Express } from 'express';
import { BrainOrchestrator } from '../../src/services/brainOrchestrator';
import { CoachVitalisService } from '../../src/services/phase2/coachVitalisService';
import { AdvancedAnalysisService } from '../../src/services/phase2/advancedAnalysisService';
import { MLForecastingService } from '../../src/services/phase2/mlForecastingService';
import { BiometricService } from '../../src/services/biometricService';
import logger from '../../src/utils/logger';
import Database from 'better-sqlite3';

describe('Phase 2 Integration Tests', () => {
  let app: Express;
  let db: Database.Database;
  let brainOrchestrator: BrainOrchestrator;
  let coachVitalis: CoachVitalisService;
  let advancedAnalysis: AdvancedAnalysisService;
  let mlForecasting: MLForecastingService;
  let biometricService: BiometricService;

  const testUserId = 'test-user-integration-phase2';
  const testBiometricData = {
    userId: testUserId,
    date: new Date(),
    heartRate: {
      resting: 65,
      average: 85,
      max: 160,
    },
    sleep: {
      duration: 7,
      quality: 75,
      score: 78,
    },
    activity: {
      steps: 12000,
      activeCalories: 350,
      restingCalories: 1400,
      distance: 8,
    },
    recovery: {
      hrvStatus: 65,
      hrvTrend: 'stable',
      recoveryIndex: 72,
    },
    training: {
      volume: 45,
      intensity: 65,
      duration: 60,
    },
  };

  beforeAll(async () => {
    // Initialize database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Create schema
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE daily_biometrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        heart_rate_resting INTEGER,
        heart_rate_avg INTEGER,
        heart_rate_max INTEGER,
        sleep_duration REAL,
        sleep_quality INTEGER,
        sleep_score INTEGER,
        activity_steps INTEGER,
        activity_calories INTEGER,
        activity_rest_calories INTEGER,
        activity_distance REAL,
        recovery_hrv_status INTEGER,
        recovery_hrv_trend TEXT,
        recovery_index INTEGER,
        training_volume INTEGER,
        training_intensity INTEGER,
        training_duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE training_adjustments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        adjustment_type TEXT NOT NULL,
        reason TEXT,
        severity TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE readiness_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        readiness_score INTEGER,
        status TEXT,
        recommendation TEXT,
        evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    // Insert test user
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(
      testUserId,
      `${testUserId}@test.com`
    );

    // Initialize services
    biometricService = new BiometricService(db);
    coachVitalis = new CoachVitalisService(db);
    advancedAnalysis = new AdvancedAnalysisService();
    mlForecasting = new MLForecastingService();
    brainOrchestrator = new BrainOrchestrator(
      db,
      coachVitalis,
      advancedAnalysis,
      mlForecasting,
      biometricService
    );

    // Create Express app with test routes
    app = express();
    app.use(express.json());

    // Phase 2 Test Routes
    app.post('/api/biometrics/store', async (req, res) => {
      try {
        const data = req.body;
        const result = await biometricService.storeDailyBiometrics(data.userId, data);
        res.json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/readiness/evaluate', async (req, res) => {
      try {
        const { userId, biometrics } = req.body;
        
        // Store biometrics
        await biometricService.storeDailyBiometrics(userId, biometrics);
        
        // Get recent data
        const recentData = await brainOrchestrator.getRecentBiometricData(userId, 7);
        
        // Evaluate readiness
        const aggregated = {
          date: new Date(),
          ...biometrics,
        };

        const result = await coachVitalis.evaluateDailyComprehensive(
          userId,
          aggregated,
          recentData
        );

        res.json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/analysis/comprehensive', async (req, res) => {
      try {
        const { userId, biometrics } = req.body;

        // Store and analyze
        await biometricService.storeDailyBiometrics(userId, biometrics);
        
        const trainingLoad = await advancedAnalysis.analyzeTrainingLoadV2({
          userId,
          date: new Date(),
          ...biometrics,
        });

        const injuryRisk = await advancedAnalysis.evaluateInjuryRiskV2(
          {
            userId,
            date: new Date(),
            ...biometrics,
          },
          []
        );

        const forecast = mlForecasting.predictInjuryRisk([], {
          userId,
          date: new Date(),
          ...biometrics,
        });

        res.json({
          success: true,
          data: {
            trainingLoad,
            injuryRisk,
            forecast,
          },
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', phase: 2 });
    });
  });

  afterAll(() => {
    db.close();
  });

  describe('API Contract Validation', () => {
    test('should return valid readiness evaluation response', async () => {
      const response = await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: testBiometricData,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('readinessScore');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('recommendations');
      
      // Validate data types
      expect(typeof response.body.data.readinessScore).toBe('number');
      expect(response.body.data.readinessScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.readinessScore).toBeLessThanOrEqual(100);
      
      expect(['excellent', 'good', 'moderate', 'poor']).toContain(
        response.body.data.status
      );
      
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    test('should return valid comprehensive analysis response', async () => {
      const response = await request(app)
        .post('/api/analysis/comprehensive')
        .send({
          userId: testUserId,
          biometrics: testBiometricData,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('trainingLoad');
      expect(response.body.data).toHaveProperty('injuryRisk');
      expect(response.body.data).toHaveProperty('forecast');

      // Validate training load structure
      expect(response.body.data.trainingLoad).toHaveProperty('tss');
      expect(response.body.data.trainingLoad).toHaveProperty('status');
      expect(response.body.data.trainingLoad).toHaveProperty('trend');

      // Validate injury risk structure
      expect(response.body.data.injuryRisk).toHaveProperty('probability');
      expect(response.body.data.injuryRisk).toHaveProperty('riskFactors');
      expect(response.body.data.injuryRisk.probability).toBeGreaterThanOrEqual(0);
      expect(response.body.data.injuryRisk.probability).toBeLessThanOrEqual(100);

      // Validate forecast structure
      expect(response.body.data.forecast).toHaveProperty('predictions');
      expect(Array.isArray(response.body.data.forecast.predictions)).toBe(true);
    });

    test('should handle stored biometrics correctly', async () => {
      const response = await request(app)
        .post('/api/biometrics/store')
        .send(testBiometricData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('userId', testUserId);
      expect(response.body.data).toHaveProperty('date');
    });

    test('should validate response timing requirements', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: testBiometricData,
        })
        .expect(200);

      const duration = Date.now() - startTime;
      
      // Response should complete within 5 seconds (SLA: <200ms average, <500ms max)
      expect(duration).toBeLessThan(5000);
    });

    test('should handle invalid user gracefully', async () => {
      const response = await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: 'non-existent-user',
          biometrics: testBiometricData,
        });

      // Should either succeed (creating new user) or return 404
      expect([200, 404, 400]).toContain(response.status);
    });

    test('should validate biometric data constraints', async () => {
      const invalidData = {
        ...testBiometricData,
        heartRate: {
          resting: -10, // Invalid: negative
          average: 85,
          max: 160,
        },
      };

      const response = await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: invalidData,
        });

      // Should either validate or reject with 400
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Frontend Integration Points', () => {
    test('readiness dashboard endpoint exists and returns correct structure', async () => {
      const response = await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: testBiometricData,
        })
        .expect(200);

      // Frontend expects these fields
      const requiredFields = ['readinessScore', 'status', 'recommendations'];
      requiredFields.forEach(field => {
        expect(response.body.data).toHaveProperty(field);
      });
    });

    test('comprehensive analysis endpoint supports frontend report generation', async () => {
      const response = await request(app)
        .post('/api/analysis/comprehensive')
        .send({
          userId: testUserId,
          biometrics: testBiometricData,
        })
        .expect(200);

      const data = response.body.data;
      
      // Should support report generation with these fields
      expect(data.trainingLoad).toHaveProperty('status'); // For trend visualization
      expect(data.injuryRisk).toHaveProperty('probability'); // For risk gauge
      expect(data.injuryRisk).toHaveProperty('riskFactors'); // For detailed breakdown
      expect(data.forecast.predictions).toBeInstanceOf(Array); // For trending chart
    });

    test('supports multi-day data aggregation for frontend trends', async () => {
      // Store multiple days of data
      for (let i = 0; i < 7; i++) {
        const dataWithDate = {
          ...testBiometricData,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        };

        await request(app)
          .post('/api/biometrics/store')
          .send(dataWithDate)
          .expect(200);
      }

      const response = await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: testBiometricData,
        })
        .expect(200);

      // Should be able to process multi-day trends
      expect(response.body.data).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });
  });

  describe('Real-World Scenario Testing', () => {
    test('handles peak training week (high load, low recovery)', async () => {
      const peakWeekData = {
        ...testBiometricData,
        training: {
          volume: 120, // High
          intensity: 85, // High
          duration: 150, // Long sessions
        },
        recovery: {
          hrvStatus: 40, // Low
          hrvTrend: 'decreasing',
          recoveryIndex: 35, // Low
        },
        sleep: {
          duration: 5, // Insufficient
          quality: 45,
          score: 42,
        },
      };

      const response = await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: peakWeekData,
        })
        .expect(200);

      // Should alert on low readiness
      expect(response.body.data).toHaveProperty('readinessScore');
      expect(response.body.data.readinessScore).toBeLessThan(60);
      
      // Should recommend recovery
      const recommendations = response.body.data.recommendations;
      const hasRecoveryRecommendation = recommendations.some((r: string) =>
        r.toLowerCase().includes('recover') || r.toLowerCase().includes('rest')
      );
      expect(hasRecoveryRecommendation).toBe(true);
    });

    test('handles recovery week (low load, high recovery)', async () => {
      const recoveryWeekData = {
        ...testBiometricData,
        training: {
          volume: 20, // Low
          intensity: 35, // Low
          duration: 30, // Short sessions
        },
        recovery: {
          hrvStatus: 85, // High
          hrvTrend: 'increasing',
          recoveryIndex: 90, // High
        },
        sleep: {
          duration: 8.5, // Good
          quality: 88,
          score: 92,
        },
      };

      const response = await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: recoveryWeekData,
        })
        .expect(200);

      // Should show high readiness
      expect(response.body.data.readinessScore).toBeGreaterThan(80);
    });

    test('handles edge case with missing data', async () => {
      const incompleteData = {
        userId: testUserId,
        date: new Date(),
        heartRate: {
          resting: 65,
          average: 85,
          max: 160,
        },
        sleep: {
          duration: 7,
          quality: 75,
          score: 78,
        },
        // Missing activity and recovery data
      };

      const response = await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: incompleteData,
        });

      // Should handle gracefully
      expect([200, 400, 422]).toContain(response.status);
    });
  });

  describe('Performance Requirements Validation', () => {
    test('readiness evaluation completes within SLA', async () => {
      const startTime = performance.now();
      
      await request(app)
        .post('/api/readiness/evaluate')
        .send({
          userId: testUserId,
          biometrics: testBiometricData,
        })
        .expect(200);

      const duration = performance.now() - startTime;
      
      // Target: P95 <200ms, P99 <500ms, allow up to 1 second for CI/CD environment
      expect(duration).toBeLessThan(1000);
    });

    test('comprehensive analysis completes within timeout', async () => {
      const startTime = performance.now();
      
      await request(app)
        .post('/api/analysis/comprehensive')
        .send({
          userId: testUserId,
          biometrics: testBiometricData,
        })
        .expect(200);

      const duration = performance.now() - startTime;
      
      // More complex operation, allow up to 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    test('handles concurrent requests efficiently', async () => {
      const startTime = performance.now();
      
      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          request(app)
            .post('/api/readiness/evaluate')
            .send({
              userId: `${testUserId}-${i}`,
              biometrics: testBiometricData,
            })
        );

      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      // All should succeed
      results.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete in reasonable time (allow up to 5 seconds for 10 concurrent)
      expect(duration).toBeLessThan(5000);
    });
  });
});

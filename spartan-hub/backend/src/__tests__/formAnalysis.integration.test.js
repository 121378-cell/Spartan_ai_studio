/**
 * Form Analysis Integration Tests
 * Phase A: Video Form Analysis MVP
 * 
 * End-to-end integration tests for complete form analysis flow
 */

const Database = require('better-sqlite3');
const { FormAnalysisService } = require('../../services/formAnalysisService');
const { PoseValidator } = require('../../services/PoseValidator');
const { SquatFormAnalyzer } = require('../../services/SquatFormAnalyzer');
const { DeadliftFormAnalyzer } = require('../../services/DeadliftFormAnalyzer');
const { InjuryRiskCalculator } = require('../../services/InjuryRiskCalculator');
const { RealTimeFeedbackService } = require('../../services/RealTimeFeedbackService');
const { FormAnalysisCache } = require('../../services/FormAnalysisCache');

describe('Form Analysis - Integration Tests', () => {
  let db;
  let service;
  let cache;

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

    service = new FormAnalysisService(db);
    cache = new FormAnalysisCache({ defaultTTL: 60, maxEntries: 100 });
  });

  afterAll(() => {
    db.close();
  });

  describe('Complete Form Analysis Flow', () => {
    it('should analyze squat form end-to-end', () => {
      // Mock pose landmarks (simplified)
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5 + (Math.random() - 0.5) * 0.1,
        y: 0.5 + (Math.random() - 0.5) * 0.1,
        z: 0,
        visibility: 0.8
      }));

      // Validate landmarks
      const validator = new PoseValidator();
      const validation = validator.validate(mockLandmarks);
      expect(validation.valid).toBe(true);

      // Analyze squat
      const squatAnalyzer = new SquatFormAnalyzer();
      const analysis = squatAnalyzer.analyze(validation.normalized, {
        reps: 10,
        duration: 45
      });

      expect(analysis.formScore).toBeGreaterThanOrEqual(0);
      expect(analysis.formScore).toBeLessThanOrEqual(100);
      expect(analysis.metrics.repsCompleted).toBe(10);

      // Save to database
      const saved = service.create({
        userId: 'test-user',
        exerciseType: 'squat',
        formScore: analysis.formScore,
        metrics: analysis.metrics,
        warnings: analysis.warnings,
        recommendations: analysis.recommendations
      });

      expect(saved.id).toBeDefined();
      expect(saved.formScore).toBe(analysis.formScore);

      // Retrieve from database
      const retrieved = service.findById(saved.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.formScore).toBe(analysis.formScore);
    });

    it('should analyze deadlift form end-to-end', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5 + (Math.random() - 0.5) * 0.1,
        y: 0.5 + (Math.random() - 0.5) * 0.1,
        z: 0,
        visibility: 0.8
      }));

      const validator = new PoseValidator();
      const validation = validator.validate(mockLandmarks);

      const deadliftAnalyzer = new DeadliftFormAnalyzer();
      const analysis = deadliftAnalyzer.analyze(validation.normalized, {
        reps: 5,
        duration: 30
      });

      expect(analysis.formScore).toBeGreaterThanOrEqual(0);
      expect(analysis.formScore).toBeLessThanOrEqual(100);
      expect(analysis.metrics.repsCompleted).toBe(5);
    });
  });

  describe('Injury Risk Integration', () => {
    it('should calculate injury risk from form analysis', () => {
      const calculator = new InjuryRiskCalculator();

      // High risk scenario
      const highRiskResult = calculator.calculate({
        formScore: 50,
        injuryRiskFromForm: 80
      });

      expect(highRiskResult.riskScore).toBeGreaterThan(40);
      expect(['low', 'medium', 'high', 'critical']).toContain(highRiskResult.riskLevel);
      expect(typeof highRiskResult.shouldTrainToday).toBe('boolean');

      // Low risk scenario
      const lowRiskResult = calculator.calculate({
        formScore: 90,
        injuryRiskFromForm: 10
      });

      expect(lowRiskResult.riskScore).toBeLessThan(50);
    });

    it('should integrate recovery data into risk calculation', () => {
      const calculator = new InjuryRiskCalculator();

      const result = calculator.calculate({
        formScore: 80,
        hrv: 60,
        hrvBaseline: 80, // Low HRV
        sleepHours: 5, // Poor sleep
        stressLevel: 8 // High stress
      });

      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Feedback Integration', () => {
    it('should generate real-time feedback', () => {
      const feedbackService = new RealTimeFeedbackService({
        maxFeedbackPerSecond: 1,
        enableInjuryDetection: true
      });

      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const feedback = feedbackService.processFrame(
        'test-session-1',
        'squat',
        mockLandmarks,
        { currentRep: 1 }
      );

      expect(feedback.timestamp).toBeDefined();
      expect(feedback.exerciseType).toBe('squat');
      expect(feedback.formScore).toBeGreaterThanOrEqual(0);
      expect(feedback.formScore).toBeLessThanOrEqual(100);
      expect(typeof feedback.shouldStop).toBe('boolean');
    });

    it('should rate limit feedback', () => {
      const feedbackService = new RealTimeFeedbackService({
        maxFeedbackPerSecond: 1
      });

      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      // First call
      const feedback1 = feedbackService.processFrame(
        'test-session-2',
        'squat',
        mockLandmarks
      );

      // Immediate second call (should be rate limited)
      const feedback2 = feedbackService.processFrame(
        'test-session-2',
        'squat',
        mockLandmarks
      );

      // Second feedback should be empty (rate limited)
      expect(feedback2.feedback.length).toBe(0);
    });
  });

  describe('Cache Integration', () => {
    it('should cache and retrieve form analysis', () => {
      const testData = { formScore: 85, metrics: { reps: 10 } };

      // Set cache
      cache.set('test-key-1', testData, 60);

      // Get from cache
      const retrieved = cache.get('test-key-1');
      expect(retrieved).toEqual(testData);
    });

    it('should respect TTL', (done) => {
      const shortTTLCache = new FormAnalysisCache({ defaultTTL: 1 }); // 1 second TTL
      const testData = { formScore: 90 };

      shortTTLCache.set('test-key-2', testData);

      // Should exist initially
      expect(shortTTLCache.get('test-key-2')).toEqual(testData);

      // Wait for expiration
      setTimeout(() => {
        expect(shortTTLCache.get('test-key-2')).toBeNull();
        done();
      }, 1100);
    });

    it('should track cache statistics', () => {
      cache.set('stats-key-1', { data: 1 });
      cache.set('stats-key-2', { data: 2 });

      cache.get('stats-key-1'); // Hit
      cache.get('stats-key-1'); // Hit
      cache.get('non-existent'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(2);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should analyze form within 100ms', () => {
      const analyzer = new SquatFormAnalyzer();
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const startTime = Date.now();
      analyzer.analyze(mockLandmarks);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle 100 analyses in under 5 seconds', () => {
      const analyzer = new SquatFormAnalyzer();
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        analyzer.analyze(mockLandmarks);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});

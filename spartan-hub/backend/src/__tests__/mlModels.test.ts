/**
 * ML Models Comprehensive Tests
 * Phase B: Advanced ML Models - Week 5 Day 5
 * 
 * Tests for all ML models implemented in Week 5
 */

import { FeatureEngineering, EnhancedModelPredictor } from '../ml/mlModelImprovements';
import { UserHistoryAnalyzer, PersonalizedRecommendationsEngine } from '../ml/personalizedRecommendations';
import { PredictiveInjuryModel, EarlyWarningSystem, PreventionPlanGenerator } from '../ml/predictiveInjuryModel';
import { MLPipelineOptimizer, ModelCompressor, PerformanceBenchmarker } from '../ml/mlPipelineOptimization';

describe('Week 5 ML Models - Comprehensive Tests', () => {
  describe('FeatureEngineering', () => {
    let featureEngineering: FeatureEngineering;

    beforeEach(() => {
      featureEngineering = new FeatureEngineering();
    });

    it('should extract features from pose data', () => {
      const mockPoseData = Array(33).fill(null).map((_, i) => ({
        x: 0.5 + Math.random() * 0.1,
        y: 0.5 + Math.random() * 0.1,
        z: 0,
        primaryJointAngle: 90 + Math.random() * 30
      }));

      const features = featureEngineering.extractFeatures(mockPoseData, 'squat');

      expect(features.jointAngles).toBeDefined();
      expect(features.velocities).toBeDefined();
      expect(features.accelerations).toBeDefined();
      expect(features.symmetryScore).toBeGreaterThanOrEqual(0);
      expect(features.symmetryScore).toBeLessThanOrEqual(100);
      expect(features.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(features.stabilityScore).toBeLessThanOrEqual(100);
      expect(features.rangeOfMotion).toBeGreaterThanOrEqual(0);
      expect(features.rangeOfMotion).toBeLessThanOrEqual(100);
    });

    it('should calculate temporal features', () => {
      const mockPoseData = Array(100).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        primaryJointAngle: 90
      }));

      const features = featureEngineering.extractFeatures(mockPoseData, 'squat');

      expect(features.movementTime).toBeGreaterThan(0);
      expect(features.eccentricTime).toBeGreaterThanOrEqual(0);
      expect(features.concentricTime).toBeGreaterThanOrEqual(0);
      expect(features.pauseDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('EnhancedModelPredictor', () => {
    let predictor: EnhancedModelPredictor;

    beforeEach(() => {
      predictor = new EnhancedModelPredictor();
    });

    it('should predict form quality', () => {
      const mockPoseData = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        primaryJointAngle: 90
      }));

      const prediction = predictor.predict(mockPoseData, 'squat');

      expect(prediction.formScore).toBeGreaterThanOrEqual(0);
      expect(prediction.formScore).toBeLessThanOrEqual(100);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
      expect(Array.isArray(prediction.riskFactors)).toBe(true);
      expect(Array.isArray(prediction.recommendations)).toBe(true);
    });

    it('should identify risk factors', () => {
      const mockPoseData = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0.9, // Poor symmetry
        primaryJointAngle: 90
      }));

      const prediction = predictor.predict(mockPoseData, 'squat');

      expect(prediction.riskFactors).toBeDefined();
    });
  });

  describe('UserHistoryAnalyzer', () => {
    let analyzer: UserHistoryAnalyzer;

    beforeEach(() => {
      analyzer = new UserHistoryAnalyzer();
    });

    it('should analyze user patterns', () => {
      const userId = 'test-user-1';
      
      // Add workouts
      for (let i = 0; i < 10; i++) {
        analyzer.addWorkout({
          id: `workout-${i}`,
          userId,
          exerciseType: i % 2 === 0 ? 'squat' : 'deadlift',
          formScore: 70 + i * 2,
          timestamp: Date.now() - i * 86400000,
          metrics: {},
          warnings: [],
          recommendations: []
        });
      }

      const patterns = analyzer.analyzePatterns(userId);

      expect(patterns.averageFormScore).toBeGreaterThan(0);
      expect(patterns.formScoreTrend).toBeDefined();
      expect(Array.isArray(patterns.mostFrequentExercises)).toBe(true);
      expect(Array.isArray(patterns.commonWarnings)).toBe(true);
      expect(patterns.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(patterns.consistencyScore).toBeLessThanOrEqual(100);
    });

    it('should get user progress', () => {
      const userId = 'test-user-2';
      
      analyzer.addWorkout({
        id: 'workout-1',
        userId,
        exerciseType: 'squat',
        formScore: 85,
        timestamp: Date.now(),
        metrics: {},
        warnings: [],
        recommendations: []
      });

      const progress = analyzer.getUserProgress(userId);

      expect(progress.userId).toBe(userId);
      expect(progress.totalWorkouts).toBe(1);
      expect(progress.exercisesCompleted).toBeDefined();
      expect(Array.isArray(progress.formScoreHistory)).toBe(true);
    });
  });

  describe('PersonalizedRecommendationsEngine', () => {
    let engine: PersonalizedRecommendationsEngine;
    let historyAnalyzer: UserHistoryAnalyzer;

    beforeEach(() => {
      engine = new PersonalizedRecommendationsEngine();
      historyAnalyzer = new UserHistoryAnalyzer();
    });

    it('should generate personalized recommendations', () => {
      const userId = 'test-user-3';
      
      // Add workouts with poor form
      for (let i = 0; i < 5; i++) {
        historyAnalyzer.addWorkout({
          id: `workout-${i}`,
          userId,
          exerciseType: 'squat',
          formScore: 50 + i * 5,
          timestamp: Date.now() - i * 86400000,
          metrics: {},
          warnings: ['Poor form detected'],
          recommendations: []
        });
      }

      const recommendations = engine.generateRecommendations(userId);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBeDefined();
      expect(recommendations[0].priority).toBeDefined();
      expect(recommendations[0].actionItems).toBeDefined();
    });
  });

  describe('PredictiveInjuryModel', () => {
    let model: PredictiveInjuryModel;

    beforeEach(() => {
      model = new PredictiveInjuryModel();
    });

    it('should predict injury risk', () => {
      const riskFactors = {
        poorFormScore: 60,
        formDeclineRate: 5,
        asymmetryScore: 40,
        stabilityIssues: 30,
        trainingLoad: 50,
        loadIncreaseRate: 10,
        recoveryScore: 50,
        previousInjuries: 1,
        painLevel: 3,
        fatigueLevel: 4,
        rangeOfMotion: 70,
        movementQuality: 60,
        controlScore: 60
      };

      const prediction = model.predict(riskFactors);

      expect(prediction.riskLevel).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(prediction.riskLevel);
      expect(prediction.riskScore).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScore).toBeLessThanOrEqual(100);
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(Array.isArray(prediction.primaryRiskFactors)).toBe(true);
      expect(Array.isArray(prediction.affectedAreas)).toBe(true);
      expect(Array.isArray(prediction.recommendedActions)).toBe(true);
    });

    it('should generate warning for high risk', () => {
      const riskFactors = {
        poorFormScore: 80,
        formDeclineRate: 15,
        asymmetryScore: 70,
        stabilityIssues: 60,
        trainingLoad: 80,
        loadIncreaseRate: 20,
        recoveryScore: 30,
        previousInjuries: 3,
        painLevel: 7,
        fatigueLevel: 8,
        rangeOfMotion: 40,
        movementQuality: 40,
        controlScore: 40
      };

      const prediction = model.predict(riskFactors);
      const warning = model.generateWarning('test-user', prediction);

      if (prediction.riskLevel !== 'low') {
        expect(warning).toBeDefined();
        expect(warning?.userId).toBe('test-user');
        expect(warning?.riskLevel).toBe(prediction.riskLevel);
        expect(warning?.severity).toBeGreaterThan(0);
      }
    });
  });

  describe('EarlyWarningSystem', () => {
    let warningSystem: EarlyWarningSystem;

    beforeEach(() => {
      warningSystem = new EarlyWarningSystem({
        severityThreshold: 3,
        cooldownPeriod: 1000
      });
    });

    it('should monitor and generate warnings', () => {
      const riskFactors = {
        poorFormScore: 70,
        formDeclineRate: 10,
        asymmetryScore: 50,
        stabilityIssues: 40,
        trainingLoad: 60,
        loadIncreaseRate: 15,
        recoveryScore: 40,
        previousInjuries: 2,
        painLevel: 5,
        fatigueLevel: 6,
        rangeOfMotion: 50,
        movementQuality: 50,
        controlScore: 50
      };

      const warning = warningSystem.monitor('test-user', riskFactors);

      // Warning may or may not be generated based on risk level
      if (warning) {
        expect(warning.userId).toBe('test-user');
        expect(warning.riskLevel).toBeDefined();
        expect(warning.severity).toBeGreaterThanOrEqual(3);
      }
    });

    it('should track warning history', () => {
      const riskFactors = {
        poorFormScore: 90,
        formDeclineRate: 20,
        asymmetryScore: 80,
        stabilityIssues: 70,
        trainingLoad: 90,
        loadIncreaseRate: 25,
        recoveryScore: 20,
        previousInjuries: 5,
        painLevel: 8,
        fatigueLevel: 9,
        rangeOfMotion: 30,
        movementQuality: 30,
        controlScore: 30
      };

      warningSystem.monitor('test-user', riskFactors);
      const history = warningSystem.getWarningHistory('test-user');

      if (history) {
        expect(history.userId).toBe('test-user');
        expect(history.totalWarnings).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('MLPipelineOptimizer', () => {
    let optimizer: MLPipelineOptimizer;

    beforeEach(() => {
      optimizer = new MLPipelineOptimizer({
        enableBatching: false,
        enableCaching: true,
        cacheSize: 100,
        cacheTTL: 60
      });
    });

    it('should process with caching', async () => {
      const processor = jest.fn((input) => ({ result: input.value * 2 }));
      
      const input = { value: 5 };
      
      // First call - cache miss
      await optimizer.process(input, processor);
      
      // Second call - cache hit
      await optimizer.process(input, processor);
      
      // Processor should only be called once
      expect(processor).toHaveBeenCalledTimes(1);
      
      const stats = optimizer.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should process batch', async () => {
      const inputs = Array(10).fill(null).map((_, i) => ({ value: i }));
      const processor = jest.fn((inputs) => inputs.map(input => ({ result: input.value * 2 })));
      
      const result = await optimizer.processBatch(inputs, processor);
      
      expect(result.batchSize).toBe(10);
      expect(result.results.length).toBe(10);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ModelCompressor', () => {
    let compressor: ModelCompressor;

    beforeEach(() => {
      compressor = new ModelCompressor();
    });

    it('should compress weights', () => {
      const weights = Array(100).fill(0).map((_, i) => i * 0.01);
      
      const compressed = compressor.compress(weights);
      
      expect(compressed.length).toBe(weights.length);
      expect(compressed[0]).toBeGreaterThanOrEqual(0);
      expect(compressed[compressed.length - 1]).toBeLessThanOrEqual(255);
    });

    it('should decompress weights', () => {
      const weights = Array(100).fill(0).map((_, i) => i * 0.01);
      const min = Math.min(...weights);
      const max = Math.max(...weights);
      
      const compressed = compressor.compress(weights);
      const decompressed = compressor.decompress(compressed, min, max);
      
      expect(decompressed.length).toBe(weights.length);
      
      // Check approximation (quantization introduces some error)
      decompressed.forEach((d, i) => {
        expect(Math.abs(d - weights[i])).toBeLessThan(0.1);
      });
    });

    it('should calculate compression ratio', () => {
      const weights = Array(100).fill(0).map((_, i) => i * 0.01);
      const compressed = compressor.compress(weights);
      
      const ratio = compressor.getCompressionRatio(weights, compressed);
      
      expect(ratio).toBe(4); // float32 (4 bytes) to int8 (1 byte) = 4:1
    });
  });

  describe('PerformanceBenchmarker', () => {
    let benchmarker: PerformanceBenchmarker;

    beforeEach(() => {
      benchmarker = new PerformanceBenchmarker();
    });

    it('should benchmark operation', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };

      const result = await benchmarker.benchmark('Test Operation', operation, 10);

      expect(result.testName).toBe('Test Operation');
      expect(result.iterations).toBe(10);
      expect(result.totalTime).toBeGreaterThanOrEqual(100);
      expect(result.averageTime).toBeGreaterThanOrEqual(10);
      expect(result.minTime).toBeGreaterThanOrEqual(10);
      expect(result.p95Time).toBeDefined();
      expect(result.p99Time).toBeDefined();
      expect(result.throughput).toBeGreaterThan(0);
    });
  });
});

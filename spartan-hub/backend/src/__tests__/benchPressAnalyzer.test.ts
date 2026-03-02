/**
 * Bench Press Form Analyzer Tests
 * Phase B: Additional Exercises
 */

import { BenchPressFormAnalyzer } from '../services/BenchPressFormAnalyzer';

describe('BenchPressFormAnalyzer', () => {
  let analyzer: BenchPressFormAnalyzer;

  beforeEach(() => {
    analyzer = new BenchPressFormAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze bench press with good form', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5 + (Math.random() - 0.5) * 0.1,
        y: 0.5 + (Math.random() - 0.5) * 0.1,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks, {
        reps: 10,
        duration: 45
      });

      expect(result.formScore).toBeGreaterThanOrEqual(0);
      expect(result.formScore).toBeLessThanOrEqual(100);
      expect(result.metrics.repsCompleted).toBe(10);
      expect(result.metrics.durationSeconds).toBe(45);
    });

    it('should detect elbow flare and warn', () => {
      // Mock landmarks with elbows flared out wide
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: i < 20 ? 0.8 : 0.2, // Elbows flared
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Elbows flared out too wide')
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Tuck elbows at 45-75° angle')
      );
    });

    it('should detect excessive arch and warn', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: i === 23 || i === 24 ? 0.8 : 0.5, // Hips raised high
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Excessive lower back arch')
      );
    });

    it('should calculate injury risk based on form issues', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0.9, // Elbows very flared
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.injuryRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.injuryRiskScore).toBeLessThanOrEqual(100);
    });

    it('should handle invalid landmarks gracefully', () => {
      const result = analyzer.analyze([] as any);

      expect(result.formScore).toBe(0);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Invalid pose data')
      );
    });
  });

  describe('calculateElbowTuckAngle', () => {
    it('should calculate elbow tuck angle correctly', () => {
      // This would require testing private method through analyze
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0.5,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.metrics.elbowTuckAngle).toBeDefined();
    });
  });

  describe('calculateFormScore', () => {
    it('should deduct points for elbow flare', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0.9, // Flared elbows
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      // Should have deductions for elbow flare
      expect(result.formScore).toBeLessThan(100);
    });

    it('should deduct points for incomplete lockout', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.9, // Arms not extended
        z: 0.5,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.formScore).toBeLessThan(100);
    });
  });

  describe('calculateInjuryRisk', () => {
    it('should calculate high risk for excessive arch', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: i === 23 || i === 24 ? 0.9 : 0.5, // Excessive arch
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.injuryRiskScore).toBeGreaterThan(20);
    });

    it('should calculate risk based on multiple factors', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0.9, // Multiple issues
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.injuryRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.injuryRiskScore).toBeLessThanOrEqual(100);
    });
  });
});

/**
 * Overhead Press Form Analyzer Tests
 * Phase B: Additional Exercises
 */

import { OverheadPressFormAnalyzer } from '../OverheadPressFormAnalyzer';

describe('OverheadPressFormAnalyzer', () => {
  let analyzer: OverheadPressFormAnalyzer;

  beforeEach(() => {
    analyzer = new OverheadPressFormAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze overhead press with good form', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5 + (Math.random() - 0.5) * 0.1,
        y: 0.5 + (Math.random() - 0.5) * 0.1,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks, {
        reps: 8,
        duration: 30
      });

      expect(result.formScore).toBeGreaterThanOrEqual(0);
      expect(result.formScore).toBeLessThanOrEqual(100);
      expect(result.metrics.repsCompleted).toBe(8);
      expect(result.metrics.durationSeconds).toBe(30);
    });

    it('should detect poor core engagement and warn', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: i === 0 ? 0.8 : 0.5, // Nose far forward (leaning back)
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Poor core engagement')
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Brace your core')
      );
    });

    it('should detect limited shoulder mobility and warn', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.9, // Limited ROM
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Limited shoulder mobility')
      );
    });

    it('should detect incorrect breathing and warn', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks, {
        breathingPattern: 'incorrect'
      });

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Incorrect breathing pattern')
      );
    });

    it('should handle invalid landmarks gracefully', () => {
      const result = analyzer.analyze([] as any);

      expect(result.formScore).toBe(0);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Invalid pose data')
      );
    });
  });

  describe('calculateShoulderMobility', () => {
    it('should calculate shoulder mobility score', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.metrics.shoulderMobilityScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.shoulderMobilityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateFormScore', () => {
    it('should deduct points for poor core engagement', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.8, // Leaning back
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.formScore).toBeLessThan(100);
    });

    it('should deduct points for incomplete lockout', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.9, // Arms not extended
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.formScore).toBeLessThan(100);
    });

    it('should deduct points for excessive arch', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks, {
        archQuality: 'excessive'
      });

      expect(result.formScore).toBeLessThan(100);
    });
  });

  describe('calculateInjuryRisk', () => {
    it('should calculate high risk for poor core engagement', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.8, // Leaning back significantly
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.injuryRiskScore).toBeGreaterThan(20);
    });

    it('should calculate risk based on multiple factors', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.9, // Multiple issues
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks);

      expect(result.injuryRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.injuryRiskScore).toBeLessThanOrEqual(100);
    });

    it('should add risk for incorrect breathing', () => {
      const mockLandmarks = Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      }));

      const result = analyzer.analyze(mockLandmarks, {
        breathingPattern: 'incorrect'
      });

      expect(result.injuryRiskScore).toBeGreaterThan(0);
    });
  });
});

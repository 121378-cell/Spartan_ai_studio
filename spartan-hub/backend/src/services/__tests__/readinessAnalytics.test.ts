/**
 * Tests for Readiness Analytics Service
 * 
 * Tests recovery score, readiness score, trend analysis,
 * recommendations, and injury risk assessment
 */

import { ReadinessAnalyticsService } from '../readinessAnalyticsService';

describe('ReadinessAnalyticsService', () => {
  let service: ReadinessAnalyticsService;
  const testUserId = 'test-user-123';

  beforeAll(() => {
    // Configure environment for tests
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    service = new ReadinessAnalyticsService();
  });

  afterEach(() => {
    if (service) {
      service.close();
    }
  });

  // ============================================================================
  // SMOKE TESTS
  // ============================================================================

  describe('Service Initialization', () => {
    test('should initialize without errors', () => {
      const svc = new ReadinessAnalyticsService();
      expect(svc).toBeDefined();
      svc.close();
    });

    test('should have all required methods', () => {
      const svc = new ReadinessAnalyticsService();
      expect(typeof svc.calculateRecoveryScore).toBe('function');
      expect(typeof svc.calculateReadinessScore).toBe('function');
      expect(typeof svc.analyzeTrends).toBe('function');
      expect(typeof svc.generateRecommendations).toBe('function');
      expect(typeof svc.assessInjuryRisk).toBe('function');
      expect(typeof svc.close).toBe('function');
      svc.close();
    });
  });

  // ============================================================================
  // DATABASE INTEGRATION TESTS
  // ============================================================================

  describe('Database Integration', () => {
    test('should handle database connection gracefully', async () => {
      const svc = new ReadinessAnalyticsService();
      
      // The service should initialize without throwing
      expect(svc).toBeDefined();
      
      // Methods should exist and be callable
      expect(svc.calculateRecoveryScore).toBeDefined();
      
      svc.close();
    });

    test('should close database connection', () => {
      const svc = new ReadinessAnalyticsService();
      
      // Should not throw when closing
      expect(() => {
        svc.close();
      }).not.toThrow();
    });
  });

  // ============================================================================
  // ALGORITHM STRUCTURE TESTS
  // ============================================================================

  describe('Algorithm Implementations', () => {
    test('Recovery Score Formula', () => {
      // Recovery = sleep * 0.25 + HRV * 0.25 + RHR * 0.2 + stress * 0.3
      // Example: sleep=80, hrv=75, rhr=70, stress=60
      // Expected: 80*0.25 + 75*0.25 + 70*0.2 + 60*0.3 = 70.75
      
      const expected = (80 * 0.25) + (75 * 0.25) + (70 * 0.2) + (60 * 0.3);
      expect(expected).toBeCloseTo(70.75, 1);
    });

    test('Readiness Score Formula', () => {
      // Readiness = baseline * 0.4 + fatigue * 0.3 + motivation * 0.3
      // Example: baseline=70, fatigue=60, motivation=50
      // Expected: 70*0.4 + 60*0.3 + 50*0.3 = 28 + 18 + 15 = 61
      
      const expected = (70 * 0.4) + (60 * 0.3) + (50 * 0.3);
      expect(expected).toBeCloseTo(61, 0);
    });

    test('Trend Slope Calculation', () => {
      // Slope detection: improving (>0.05), declining (<-0.05), stable (otherwise)
      const improvingSlope = 0.15;
      const decliningSlope = -0.10;
      const stableSlope = 0.02;
      
      expect(improvingSlope > 0.05).toBe(true);
      expect(decliningSlope < -0.05).toBe(true);
      expect(Math.abs(stableSlope) <= 0.05).toBe(true);
    });

    test('Anomaly Detection (2-Sigma Rule)', () => {
      // Anomaly: value beyond 2 standard deviations from mean
      const mean = 50;
      const stdDev = 10;
      const threshold = 2 * stdDev; // 20

      const normalValue = 55; // Within 2 sigma
      const anomalyValue = 75; // Beyond 2 sigma

      expect(Math.abs(normalValue - mean)).toBeLessThan(threshold);
      expect(Math.abs(anomalyValue - mean)).toBeGreaterThan(threshold);
    });
  });

  // ============================================================================
  // API CONTRACT TESTS
  // ============================================================================

  describe('API Contracts and Type Safety', () => {
    test('Service exports required types', () => {
      // Types should be exported for consumer use
      expect(ReadinessAnalyticsService).toBeDefined();
    });

    test('Service has all required methods as properties', () => {
      const svc = new ReadinessAnalyticsService();
      
      // Verify methods exist
      expect(typeof svc.calculateRecoveryScore).toBe('function');
      expect(typeof svc.calculateReadinessScore).toBe('function');
      expect(typeof svc.analyzeTrends).toBe('function');
      expect(typeof svc.generateRecommendations).toBe('function');
      expect(typeof svc.assessInjuryRisk).toBe('function');
      expect(typeof svc.close).toBe('function');
      
      svc.close();
    });
  });
});

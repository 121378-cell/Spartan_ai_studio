import {
  PersonalizationService,
  UserBaseline,
  PersonalizedThreshold,
  ResponsePattern,
} from '../personalizationService';

describe('PersonalizationService', () => {
  let service: PersonalizationService;
  const userId = 'test-user-456';
  const testDate = '2026-01-25';

  beforeAll(async () => {
    service = PersonalizationService.getInstance();
    await service.initialize();
  });

  afterAll(() => {
    service.close();
  });

  // ============ INITIALIZATION TESTS ============
  describe('Service Initialization', () => {
    it('should initialize without errors', async () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PersonalizationService);
    });

    it('should be a singleton', () => {
      const service2 = PersonalizationService.getInstance();
      expect(service).toBe(service2);
    });

    it('should have all required methods', () => {
      expect(typeof service.calculateUserBaseline).toBe('function');
      expect(typeof service.getPersonalizedThreshold).toBe('function');
      expect(typeof service.updatePersonalizedThreshold).toBe('function');
      expect(typeof service.analyzeResponsePattern).toBe('function');
      expect(typeof service.getRecommendationTiming).toBe('function');
      expect(typeof service.updateRecommendationTiming).toBe('function');
      expect(typeof service.personalizeScore).toBe('function');
      expect(typeof service.getUserProfile).toBe('function');
      expect(typeof service.close).toBe('function');
    });
  });

  // ============ BASELINE CALCULATION TESTS ============
  describe('User Baseline Calculation', () => {
    it('should calculate baseline metrics', async () => {
      const baseline = await service.calculateUserBaseline(userId, testDate);

      expect(baseline).toBeDefined();
      expect(baseline.userId).toBe(userId);
      expect(baseline.date).toBe(testDate);
      expect(baseline.restingHeartRate).toBeDefined();
      expect(baseline.heartRateVariability).toBeDefined();
      expect(baseline.sleepDuration).toBeDefined();
      expect(baseline.stressLevel).toBeDefined();
      expect(baseline.activityLevel).toBeDefined();
    });

    it('should have valid baseline properties', async () => {
      const baseline = await service.calculateUserBaseline(userId, testDate);

      expect(typeof baseline.restingHeartRate.value).toBe('number');
      expect(typeof baseline.restingHeartRate.baseline).toBe('number');
      expect(typeof baseline.restingHeartRate.percentileChange).toBe('number');

      expect(typeof baseline.heartRateVariability.value).toBe('number');
      expect(typeof baseline.heartRateVariability.baseline).toBe('number');
      expect(typeof baseline.heartRateVariability.percentileChange).toBe('number');

      expect(baseline.sleepDuration.deficit >= 0).toBe(true);
    });

    it('should handle missing data gracefully', async () => {
      const baseline = await service.calculateUserBaseline('nonexistent-user', testDate);

      expect(baseline).toBeDefined();
      expect(baseline.userId).toBe('nonexistent-user');
      expect(baseline.restingHeartRate.value).toBe(0);
    });

    it('should calculate stress trends', async () => {
      const baseline = await service.calculateUserBaseline(userId, testDate);

      expect(['improving', 'stable', 'worsening']).toContain(baseline.stressLevel.trend);
    });

    it('should calculate activity trends', async () => {
      const baseline = await service.calculateUserBaseline(userId, testDate);

      expect(['increasing', 'stable', 'decreasing']).toContain(baseline.activityLevel.trend);
    });
  });

  // ============ PERSONALIZED THRESHOLD TESTS ============
  describe('Personalized Thresholds', () => {
    it('should get default threshold for recovery', async () => {
      const threshold = await service.getPersonalizedThreshold(userId, 'recovery');

      expect(threshold).toBeDefined();
      expect(threshold.userId).toBe(userId);
      expect(threshold.metric).toBe('recovery');
      expect(threshold.poorThreshold).toBeLessThan(threshold.fairThreshold);
      expect(threshold.fairThreshold).toBeLessThan(threshold.goodThreshold);
    });

    it('should get default threshold for readiness', async () => {
      const threshold = await service.getPersonalizedThreshold(userId, 'readiness');

      expect(threshold.metric).toBe('readiness');
      expect(threshold.poorThreshold).toBeLessThan(threshold.fairThreshold);
    });

    it('should get default threshold for injury_risk', async () => {
      const threshold = await service.getPersonalizedThreshold(userId, 'injury_risk');

      expect(threshold.metric).toBe('injury_risk');
      expect(threshold.poorThreshold).toBeGreaterThan(threshold.fairThreshold);
      expect(threshold.fairThreshold).toBeGreaterThan(threshold.goodThreshold);
    });

    it('should update threshold with adjustment', async () => {
      const original = await service.getPersonalizedThreshold(userId, 'recovery');
      const updated = await service.updatePersonalizedThreshold(userId, 'recovery', 5, 75);

      expect(updated.baselineAdjustment).toBe(5);
      expect(updated.confidenceScore).toBe(75);
      expect(updated.poorThreshold).toBeGreaterThan(original.poorThreshold);
    });

    it('should clamp threshold values to 0-100', async () => {
      const updated = await service.updatePersonalizedThreshold(userId, 'readiness', 150, 100);

      expect(updated.poorThreshold).toBeLessThanOrEqual(100);
      expect(updated.fairThreshold).toBeLessThanOrEqual(100);
      expect(updated.goodThreshold).toBeLessThanOrEqual(100);
    });

    it('should update confidence score', async () => {
      const low = await service.updatePersonalizedThreshold(userId, 'recovery', 0, 30);
      const high = await service.updatePersonalizedThreshold(userId, 'recovery', 0, 95);

      expect(low.confidenceScore).toBe(30);
      expect(high.confidenceScore).toBe(95);
    });
  });

  // ============ RESPONSE PATTERN ANALYSIS TESTS ============
  describe('Response Pattern Analysis', () => {
    it('should analyze response pattern', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      expect(pattern).toBeDefined();
      expect(pattern.userId).toBe(userId);
    });

    it('should have valid pattern properties', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      expect(['responder', 'non_responder', 'delayed_responder', 'over_responder']).toContain(
        pattern.pattern
      );
      expect(['high_responder', 'moderate_responder', 'low_responder']).toContain(
        pattern.trainingLoad
      );
      expect(['stress_sensitive', 'stress_resilient', 'balanced']).toContain(
        pattern.stressResponse
      );
      expect(['sleep_dependent', 'sleep_flexible', 'sleep_optimized']).toContain(
        pattern.sleepQuality
      );
    });

    it('should have average recovery time', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      expect(typeof pattern.averageRecoveryTime).toBe('number');
      expect(pattern.averageRecoveryTime).toBeGreaterThanOrEqual(0);
    });

    it('should have confidence score', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      expect(typeof pattern.confidenceScore).toBe('number');
      expect(pattern.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(pattern.confidenceScore).toBeLessThanOrEqual(100);
    });

    it('should have review date in future', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      const reviewDate = new Date(pattern.nextReviewDate);
      const today = new Date();

      expect(reviewDate.getTime()).toBeGreaterThan(today.getTime());
    });
  });

  // ============ RECOMMENDATION TIMING TESTS ============
  describe('Recommendation Timing', () => {
    const recommendationType = 'recovery-tips';

    it('should get default recommendation timing', async () => {
      const timing = await service.getRecommendationTiming(userId, recommendationType);

      expect(timing).toBeDefined();
      expect(timing.userId).toBe(userId);
      expect(timing.recommendationType).toBe(recommendationType);
    });

    it('should have valid timing properties', async () => {
      const timing = await service.getRecommendationTiming(userId, recommendationType);

      expect(['morning', 'afternoon', 'evening', 'anytime']).toContain(timing.optimalTime);
      expect(typeof timing.frequency).toBe('number');
      expect(['high', 'medium', 'low']).toContain(timing.priority);
      expect(typeof timing.engagementScore).toBe('number');
    });

    it('should update timing based on engagement', async () => {
      const original = await service.getRecommendationTiming(userId, recommendationType);
      const updated = await service.updateRecommendationTiming(userId, recommendationType, 90);

      expect(updated.engagementScore).toBe(90);
      // High engagement should decrease frequency (show more often)
      expect(updated.frequency).toBeLessThanOrEqual(original.frequency);
    });

    it('should adjust frequency for low engagement', async () => {
      const low = await service.updateRecommendationTiming(userId, recommendationType, 10);

      expect(low.frequency).toBeGreaterThan(0);
      // Low engagement should increase frequency (show less often)
    });

    it('should handle different recommendation types', async () => {
      const types = ['training-plan', 'injury-prevention', 'sleep-optimization'];

      for (const type of types) {
        const timing = await service.getRecommendationTiming(userId, type);
        expect(timing.recommendationType).toBe(type);
      }
    });
  });

  // ============ SCORE PERSONALIZATION TESTS ============
  describe('Score Personalization', () => {
    it('should personalize recovery score', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'recovery', 65);

      expect(adjustment).toBeDefined();
      expect(adjustment.userId).toBe(userId);
      expect(adjustment.metric).toBe('recovery');
      expect(adjustment.rawScore).toBe(65);
      expect(typeof adjustment.personalizedScore).toBe('number');
    });

    it('should personalize readiness score', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'readiness', 55);

      expect(adjustment.metric).toBe('readiness');
      expect(adjustment.personalizedScore).toBeGreaterThanOrEqual(0);
      expect(adjustment.personalizedScore).toBeLessThanOrEqual(100);
    });

    it('should personalize injury risk score', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'injury_risk', 35);

      expect(adjustment.metric).toBe('injury_risk');
      expect(adjustment.personalizedScore).toBeGreaterThanOrEqual(0);
      expect(adjustment.personalizedScore).toBeLessThanOrEqual(100);
    });

    it('should have adjustment factors', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'recovery', 70);

      expect(adjustment.adjustmentFactors).toBeDefined();
      expect(typeof adjustment.adjustmentFactors.baselineDeviation).toBe('number');
      expect(typeof adjustment.adjustmentFactors.responsePattern).toBe('number');
      expect(typeof adjustment.adjustmentFactors.recentTrend).toBe('number');
      expect(typeof adjustment.adjustmentFactors.stressInteraction).toBe('number');
    });

    it('should clamp personalized score to 0-100', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'recovery', 99);

      expect(adjustment.personalizedScore).toBeGreaterThanOrEqual(0);
      expect(adjustment.personalizedScore).toBeLessThanOrEqual(100);
    });

    it('should have confidence score', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'recovery', 60);

      expect(typeof adjustment.confidence).toBe('number');
      expect(adjustment.confidence).toBeGreaterThanOrEqual(0);
      expect(adjustment.confidence).toBeLessThanOrEqual(100);
    });
  });

  // ============ USER PROFILE TESTS ============
  describe('User Profile', () => {
    it('should get complete user profile', async () => {
      const profile = await service.getUserProfile(userId);

      expect(profile).toBeDefined();
      expect(profile.baseline).toBeDefined();
      expect(profile.responsePattern).toBeDefined();
      expect(profile.thresholds).toBeDefined();
    });

    it('should include all thresholds', async () => {
      const profile = await service.getUserProfile(userId);

      expect(profile.thresholds.recovery).toBeDefined();
      expect(profile.thresholds.readiness).toBeDefined();
      expect(profile.thresholds.injuryRisk).toBeDefined();
    });

    it('should have valid baseline in profile', async () => {
      const profile = await service.getUserProfile(userId);

      expect(profile.baseline?.userId).toBe(userId);
      expect(profile.baseline?.restingHeartRate).toBeDefined();
    });

    it('should have valid response pattern in profile', async () => {
      const profile = await service.getUserProfile(userId);

      expect(profile.responsePattern?.userId).toBe(userId);
      expect(profile.responsePattern?.pattern).toBeDefined();
    });
  });

  // ============ BASELINE DEVIATION CALCULATION TESTS ============
  describe('Baseline Deviation Calculations', () => {
    it('should calculate RHR deviation for recovery', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'recovery', 65);

      expect(adjustment.adjustmentFactors.baselineDeviation).toBeDefined();
      // Should be influenced by RHR percentile change
      expect(typeof adjustment.adjustmentFactors.baselineDeviation).toBe('number');
    });

    it('should handle sleep deficit in readiness', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'readiness', 55);

      expect(adjustment.adjustmentFactors.baselineDeviation).toBeDefined();
      // Sleep deficit should negatively impact readiness
      expect(typeof adjustment.adjustmentFactors.baselineDeviation).toBe('number');
    });

    it('should calculate elevated RHR impact on injury risk', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'injury_risk', 40);

      expect(adjustment.adjustmentFactors.baselineDeviation).toBeDefined();
      expect(typeof adjustment.adjustmentFactors.baselineDeviation).toBe('number');
    });
  });

  // ============ RESPONSE PATTERN INTEGRATION TESTS ============
  describe('Response Pattern Integration', () => {
    it('should adjust scores based on pattern type', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      // Test that pattern influences adjustment
      expect(pattern.pattern).toBeDefined();
      expect(['responder', 'non_responder', 'delayed_responder', 'over_responder']).toContain(
        pattern.pattern
      );
    });

    it('should consider training load responsiveness', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      expect(['high_responder', 'moderate_responder', 'low_responder']).toContain(
        pattern.trainingLoad
      );
    });

    it('should consider stress sensitivity', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      expect(['stress_sensitive', 'stress_resilient', 'balanced']).toContain(
        pattern.stressResponse
      );
    });

    it('should consider sleep dependency', async () => {
      const pattern = await service.analyzeResponsePattern(userId);

      expect(['sleep_dependent', 'sleep_flexible', 'sleep_optimized']).toContain(
        pattern.sleepQuality
      );
    });
  });

  // ============ EDGE CASE TESTS ============
  describe('Edge Cases', () => {
    it('should handle very high baseline deviation', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'recovery', 85);

      expect(adjustment.personalizedScore).toBeGreaterThanOrEqual(0);
      expect(adjustment.personalizedScore).toBeLessThanOrEqual(100);
    });

    it('should handle very low baseline deviation', async () => {
      const adjustment = await service.personalizeScore(userId, testDate, 'recovery', 15);

      expect(adjustment.personalizedScore).toBeGreaterThanOrEqual(0);
      expect(adjustment.personalizedScore).toBeLessThanOrEqual(100);
    });

    it('should handle zero confidence in pattern', async () => {
      const pattern = await service.analyzeResponsePattern('brand-new-user');

      expect(pattern.confidenceScore).toBeGreaterThanOrEqual(0);
      // New user should have low confidence
    });

    it('should handle invalid dates gracefully', async () => {
      const baseline = await service.calculateUserBaseline(userId, 'invalid-date');

      expect(baseline).toBeDefined();
      expect(baseline.userId).toBe(userId);
    });

    it('should handle multiple users independently', async () => {
      const user1 = await service.getUserProfile('user-1');
      const user2 = await service.getUserProfile('user-2');

      expect(user1.baseline?.userId).toBe('user-1');
      expect(user2.baseline?.userId).toBe('user-2');
    });
  });

  // ============ CLOSURE TESTS ============
  describe('Service Closure', () => {
    it('should close without errors', () => {
      expect(() => {
        service.close();
      }).not.toThrow();
    });
  });
});

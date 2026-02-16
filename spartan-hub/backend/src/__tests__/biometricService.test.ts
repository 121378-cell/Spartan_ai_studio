/**
 * Biometric Service Tests
 * 
 * Test suite for biometric data collection and processing
 */

import { biometricService } from '../services/biometricService';
import { logger } from '../utils/logger';

jest.mock('../utils/logger');

describe('BiometricService', () => {
  const testUserId = 'test-user-biometric';
  const testDate = '2024-01-23';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRecoveryIndex', () => {
    it('should calculate recovery index from metrics', () => {
      const recovery = biometricService.calculateRecoveryIndex(
        75, // hrv (ms)
        55, // rhr (bpm)
        85, // sleep score (0-100)
        30  // stress level (0-100)
      );

      expect(recovery).toBeDefined();
      expect(recovery.score).toBeGreaterThanOrEqual(0);
      expect(recovery.score).toBeLessThanOrEqual(100);
      expect(recovery.components).toBeDefined();
      expect(recovery.readinessToTrain).toMatch(/ready|caution|need-rest/);
    });

    it('should handle excellent recovery', () => {
      const recovery = biometricService.calculateRecoveryIndex(
        120, // high HRV
        48,  // low RHR
        95,  // high sleep
        15   // low stress
      );

      expect(recovery.score).toBeGreaterThan(75);
      expect(recovery.readinessToTrain).toBe('ready');
    });

    it('should handle poor recovery', () => {
      const recovery = biometricService.calculateRecoveryIndex(
        30,  // low HRV
        75,  // high RHR
        45,  // poor sleep
        80   // high stress
      );

      expect(recovery.score).toBeLessThan(50);
      expect(recovery.readinessToTrain).toBe('need-rest');
    });

    it('should return neutral score on error', () => {
      jest.spyOn(biometricService as any, 'getRecoveryRecommendation')
        .mockImplementation(() => { throw new Error('Test error'); });

      const recovery = biometricService.calculateRecoveryIndex(75, 55, 85, 30);

      expect(recovery.score).toBe(50);
    });
  });

  describe('aggregateDailyBiometrics', () => {
    it('should aggregate data from multiple sources', async () => {
      const aggregated = await biometricService.aggregateDailyBiometrics(
        testUserId,
        testDate,
        {
          hrvData: [{
            timestamp: new Date(),
            value: 75,
            source: 'apple-health'
          }],
          rhrData: [{
            timestamp: new Date(),
            value: 55,
            source: 'apple-health'
          }],
          sleepData: {
            date: testDate,
            startTime: new Date('2024-01-22T23:00:00'),
            endTime: new Date('2024-01-23T07:00:00'),
            duration: 480,
            quality: 'good',
            source: 'apple-health'
          }
        }
      );

      expect(aggregated.userId).toBe(testUserId);
      expect(aggregated.date).toBe(testDate);
      expect(aggregated.hrv).toHaveLength(1);
      expect(aggregated.restingHeartRate).toHaveLength(1);
      expect(aggregated.sleep).toBeDefined();
      expect(aggregated.sources.size).toBeGreaterThan(0);
      expect(aggregated.dataCompleteness).toBeGreaterThan(0);
    });

    it('should track multiple sources', async () => {
      const aggregated = await biometricService.aggregateDailyBiometrics(
        testUserId,
        testDate,
        {
          hrvData: [{
            timestamp: new Date(),
            value: 75,
            source: 'apple-health'
          }],
          activityData: {
            date: testDate,
            steps: 10000,
            source: 'google-fit'
          }
        }
      );

      expect(aggregated.sources.has('apple-health')).toBe(true);
      expect(aggregated.sources.has('google-fit')).toBe(true);
    });
  });

  describe('validateBiometricData', () => {
    it('should validate good data', () => {
      const result = biometricService.validateBiometricData({
        hrv: 75,
        rhr: 55,
        sleepMinutes: 480,
        steps: 10000,
        weight: 80,
        bodyFat: 18
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid HRV', () => {
      const result = biometricService.validateBiometricData({
        hrv: 600 // outside normal range
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('HRV');
    });

    it('should reject invalid RHR', () => {
      const result = biometricService.validateBiometricData({
        rhr: 200 // outside normal range
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('RHR');
    });

    it('should reject invalid sleep duration', () => {
      const result = biometricService.validateBiometricData({
        sleepMinutes: 1500 // more than 24 hours
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Sleep');
    });

    it('should reject invalid steps', () => {
      const result = biometricService.validateBiometricData({
        steps: 150000 // unrealistic
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Steps');
    });

    it('should reject invalid body fat', () => {
      const result = biometricService.validateBiometricData({
        bodyFat: 75 // outside valid range
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Body fat');
    });
  });

  describe('normalizeSourceData', () => {
    it('should normalize Apple Health data', () => {
      const normalized = biometricService.normalizeSourceData('apple-health', {
        timestamp: new Date().toISOString(),
        hrv: 75,
        rhr: 55
      });

      expect(normalized.hrv).toBeDefined();
      expect(normalized.restingHeartRate).toBeDefined();
    });

    it('should normalize Garmin data', () => {
      const normalized = biometricService.normalizeSourceData('garmin', {
        date: testDate,
        restingHeartRate: 55,
        steps: 10000,
        sleepStartTime: new Date('2024-01-22T23:00:00'),
        sleepEndTime: new Date('2024-01-23T07:00:00')
      });

      expect(normalized.restingHeartRate).toBeDefined();
      expect(normalized.activity).toBeDefined();
      expect(normalized.sleep).toBeDefined();
    });

    it('should normalize Google Fit data', () => {
      const normalized = biometricService.normalizeSourceData('google-fit', {
        date: testDate,
        steps: 10000,
        calories: 2000
      });

      expect(normalized.activity).toBeDefined();
      expect(normalized.activity?.steps).toBe(10000);
    });

    it('should normalize HealthConnect data', () => {
      const normalized = biometricService.normalizeSourceData('healthconnect', {
        date: testDate,
        time: new Date().toISOString(),
        hrvRmssd: 75,
        startTime: new Date('2024-01-22T23:00:00'),
        endTime: new Date('2024-01-23T07:00:00')
      });

      expect(normalized.hrv).toBeDefined();
      expect(normalized.sleep).toBeDefined();
    });

    it('should normalize WHOOP data', () => {
      const normalized = biometricService.normalizeSourceData('whoop', {
        timestamp: new Date().toISOString(),
        hrv: 75,
        restingHeartRate: 55,
        sleepStart: new Date('2024-01-22T23:00:00'),
        sleepEnd: new Date('2024-01-23T07:00:00')
      });

      expect(normalized.hrv).toBeDefined();
      expect(normalized.restingHeartRate).toBeDefined();
      expect(normalized.sleep).toBeDefined();
    });

    it('should normalize Oura data', () => {
      const normalized = biometricService.normalizeSourceData('oura', {
        bedtimeStart: new Date('2024-01-22T23:00:00'),
        bedtimeEnd: new Date('2024-01-23T07:00:00'),
        sleepScore: 85,
        restingHeartRate: 55
      });

      expect(normalized.sleep).toBeDefined();
      expect(normalized.restingHeartRate).toBeDefined();
    });

    it('should handle unknown source gracefully', () => {
      const normalized = biometricService.normalizeSourceData('unknown' as any, {});

      expect(normalized).toBeDefined();
      expect(Object.keys(normalized)).toHaveLength(0);
    });
  });

  describe('Data Completeness', () => {
    it('should calculate 100% completeness with all data', async () => {
      const aggregated = await biometricService.aggregateDailyBiometrics(
        testUserId,
        testDate,
        {
          hrvData: [{ timestamp: new Date(), value: 75, source: 'apple-health' }],
          rhrData: [{ timestamp: new Date(), value: 55, source: 'apple-health' }],
          sleepData: {
            date: testDate,
            startTime: new Date(),
            endTime: new Date(),
            duration: 480,
            source: 'apple-health'
          },
          activityData: {
            date: testDate,
            steps: 10000,
            source: 'apple-health'
          },
          bodyMetrics: {
            timestamp: new Date(),
            weight: { value: 80, unit: 'kg', source: 'scale' }
          }
        }
      );

      expect(aggregated.dataCompleteness).toBe(100);
    });

    it('should calculate partial completeness with partial data', async () => {
      const aggregated = await biometricService.aggregateDailyBiometrics(
        testUserId,
        testDate,
        {
          hrvData: [{ timestamp: new Date(), value: 75, source: 'apple-health' }],
          sleepData: {
            date: testDate,
            startTime: new Date(),
            endTime: new Date(),
            duration: 480,
            source: 'apple-health'
          }
        }
      );

      expect(aggregated.dataCompleteness).toBe(40); // 2 out of 5
    });
  });
});

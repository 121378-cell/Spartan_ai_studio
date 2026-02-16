/**
 * Garmin Manual Data Entry Tests
 *
 * Tests for manual biometric data entry endpoints
 * Until API credentials are implemented
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import garminManualDataService from '../garminManualDataService';
import { getDatabase, initializeDatabase } from '../../database/databaseManager';

describe('Garmin Manual Data Entry Service', () => {
  const testUserId = 'test-user-manual';
  const testDeviceId = 'test-device-manual';
  let db: any;

  beforeAll(async () => {
    await initializeDatabase({ dbPath: ':memory:' });
    db = getDatabase();
    db.pragma('foreign_keys = OFF');
  });

  describe('Manual Heart Rate Entry', () => {
    it('should add manual heart rate data', async () => {
      const heartRateData = {
        timestamp: Date.now(),
        value: 72,
        unit: 'bpm'
      };

      const dataPoint = await garminManualDataService.addManualHeartRateData(
        testUserId,
        testDeviceId,
        heartRateData
      );

      expect(dataPoint).toBeDefined();
      expect(dataPoint.dataType).toBe('heart_rate');
      expect(dataPoint.value).toBe(72);
      expect(dataPoint.source).toBe('garmin_manual');
      expect(dataPoint.device).toBe('garmin');
    });

    it('should reject invalid heart rate values', async () => {
      const invalidHeartRate = {
        timestamp: Date.now(),
        value: 300 // Out of range
      };

      await expect(
        garminManualDataService.addManualHeartRateData(testUserId, testDeviceId, invalidHeartRate)
      ).rejects.toThrow('Heart rate must be between 0 and 250 bpm');
    });

    it('should reject invalid timestamp', async () => {
      const invalidTimestamp = {
        timestamp: -1000,
        value: 72
      };

      await expect(
        garminManualDataService.addManualHeartRateData(testUserId, testDeviceId, invalidTimestamp)
      ).rejects.toThrow('Invalid timestamp');
    });
  });

  describe('Manual Sleep Entry', () => {
    it('should add manual sleep data', async () => {
      const sleepData: any = {
        date: '2026-01-24',
        startTime: Math.floor(Date.now() / 1000) - 28800,
        endTime: Math.floor(Date.now() / 1000),
        duration: 28800,
        quality: 'GOOD' as const
      };

      const dataPoint = await garminManualDataService.addManualSleepData(testUserId, testDeviceId, sleepData);

      expect(dataPoint).toBeDefined();
      expect(dataPoint.dataType).toBe('sleep_duration');
      expect(dataPoint.unit).toBe('hours');
      expect(dataPoint.value).toBe(8); // 28800 seconds = 8 hours
      expect(dataPoint.source).toBe('garmin_manual');
    });

    it('should reject invalid sleep duration', async () => {
      const invalidSleep = {
        date: '2026-01-24',
        startTime: 1000,
        endTime: 900, // End before start
        duration: -3600
      };

      await expect(
        garminManualDataService.addManualSleepData(testUserId, testDeviceId, invalidSleep)
      ).rejects.toThrow('End time must be after start time');
    });

    it('should set confidence based on quality', async () => {
      const excellentSleep: any = {
        date: '2026-01-24',
        startTime: Math.floor(Date.now() / 1000) - 28800,
        endTime: Math.floor(Date.now() / 1000),
        duration: 28800,
        quality: 'EXCELLENT' as const
      };

      const dataPoint = await garminManualDataService.addManualSleepData(testUserId, testDeviceId, excellentSleep);

      expect(dataPoint.confidence).toBe(1.0);
    });
  });

  describe('Manual Activity Entry', () => {
    it('should add manual activity data', async () => {
      const activityData = {
        date: '2026-01-24',
        name: 'Running',
        startTime: Math.floor(Date.now() / 1000) - 3600,
        duration: 3600,
        calories: 500,
        distance: 5000,
        steps: 5500,
        avgHeartRate: 140,
        maxHeartRate: 160
      };

      const dataPoints = await garminManualDataService.addManualActivityData(
        testUserId,
        testDeviceId,
        activityData
      );

      expect(dataPoints).toBeDefined();
      expect(dataPoints.length).toBeGreaterThan(0);
      // Check for activity with distance in rawData
      const distances = dataPoints.filter((p: any) => p.dataType === 'activity' && p.unit === 'meters');
      expect(distances.length).toBeGreaterThan(0);
      // Check for activity with steps in rawData
      const steps = dataPoints.filter((p: any) => p.dataType === 'activity' && p.unit === 'count');
      expect(steps.length).toBeGreaterThan(0);
      const avgHR = dataPoints.filter((p: any) => p.dataType === 'heart_rate_avg');
      expect(avgHR.length).toBeGreaterThan(0);
    });

    it('should reject activity without name', async () => {
      const invalidActivity = {
        date: '2026-01-24',
        name: '',
        startTime: 1000,
        duration: 3600
      };

      await expect(
        garminManualDataService.addManualActivityData(testUserId, testDeviceId, invalidActivity)
      ).rejects.toThrow('Activity name is required');
    });

    it('should handle optional activity fields', async () => {
      const minimalActivity = {
        date: '2026-01-24',
        name: 'Walking',
        startTime: Math.floor(Date.now() / 1000) - 1800,
        duration: 1800
      };

      const dataPoints = await garminManualDataService.addManualActivityData(
        testUserId,
        testDeviceId,
        minimalActivity
      );

      expect(dataPoints).toBeDefined();
      expect(dataPoints.length).toBe(1); // Just the activity point, no optional fields
    });
  });

  describe('Manual Stress Entry', () => {
    it('should add manual stress data', async () => {
      const stressData = {
        date: '2026-01-24',
        dayAverage: 45,
        minStress: 20,
        maxStress: 75
      };

      const dataPoint = await garminManualDataService.addManualStressData(testUserId, testDeviceId, stressData);

      expect(dataPoint).toBeDefined();
      expect(dataPoint.dataType).toBe('stress_level');
      expect(dataPoint.value).toBe(45);
      expect(dataPoint.unit).toBe('index');
      expect(dataPoint.source).toBe('garmin_manual');
    });

    it('should reject stress values outside range', async () => {
      const invalidStress = {
        date: '2026-01-24',
        dayAverage: 150 // Out of 0-100 range
      };

      await expect(
        garminManualDataService.addManualStressData(testUserId, testDeviceId, invalidStress)
      ).rejects.toThrow('Stress level must be between 0 and 100');
    });
  });

  describe('Retrieve Manual Data', () => {
    it('should retrieve manual data entries', async () => {
      // Add some test data first
      await garminManualDataService.addManualHeartRateData(testUserId, testDeviceId, {
        timestamp: Date.now(),
        value: 70
      });

      await garminManualDataService.addManualHeartRateData(testUserId, testDeviceId, {
        timestamp: Date.now() - 3600000,
        value: 75
      });

      const dataPoints = await garminManualDataService.getManualDataEntries(testUserId);

      expect(dataPoints).toBeDefined();
      expect(dataPoints.length).toBeGreaterThan(0);
      const allManual = dataPoints.filter((p: any) => p.source === 'garmin_manual');
      expect(allManual.length).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const now = Date.now();
      const startDate = new Date(now - 86400000); // 1 day ago
      const endDate = new Date(now);

      const dataPoints = await garminManualDataService.getManualDataEntries(testUserId, startDate, endDate);

      expect(dataPoints).toBeDefined();
      expect(dataPoints.every((p) => p.timestamp >= startDate.getTime() && p.timestamp <= endDate.getTime())).toBe(
        true
      );
    });
  });

  describe('Bulk Import', () => {
    it('should bulk import data points', async () => {
      const dataPointsToImport = [
        {
          timestamp: Date.now(),
          dataType: 'heart_rate',
          value: 72,
          unit: 'bpm',
          confidence: 0.95
        },
        {
          timestamp: Date.now() - 3600000,
          dataType: 'heart_rate',
          value: 75,
          unit: 'bpm',
          confidence: 0.95
        },
        {
          timestamp: Date.now() - 7200000,
          dataType: 'steps',
          value: 8500,
          unit: 'count',
          confidence: 0.9
        }
      ];

      const inserted = await garminManualDataService.bulkImportManualData(
        testUserId,
        testDeviceId,
        dataPointsToImport
      );

      expect(inserted).toBe(3);
    });

    it('should skip invalid data points', async () => {
      const mixedData = [
        {
          timestamp: Date.now(),
          dataType: 'heart_rate',
          value: 72,
          unit: 'bpm'
        },
        {
          timestamp: 0, // Invalid
          dataType: 'heart_rate',
          value: 75,
          unit: 'bpm'
        },
        {
          timestamp: Date.now(),
          dataType: 'steps',
          value: 'invalid' as any, // Invalid
          unit: 'count'
        }
      ];

      const inserted = await garminManualDataService.bulkImportManualData(testUserId, testDeviceId, mixedData);

      expect(inserted).toBe(1); // Only the first one inserted
    });

    it('should reject empty import array', async () => {
      await expect(garminManualDataService.bulkImportManualData(testUserId, testDeviceId, [])).rejects.toThrow(
        'Data points array is required and must not be empty'
      );
    });
  });

  describe('Data Validation', () => {
    it('should store data with correct source identifier', async () => {
      const heartRateData = {
        timestamp: Date.now(),
        value: 65,
        unit: 'bpm'
      };

      const dataPoint = await garminManualDataService.addManualHeartRateData(testUserId, testDeviceId, heartRateData);

      expect(dataPoint.source).toBe('garmin_manual');
      expect(dataPoint.device).toBe('garmin');

      // Verify in database
      const stored = db
        .prepare('SELECT * FROM biometric_data_points WHERE source = ? LIMIT 1')
        .get('garmin_manual') as any;
      expect(stored).toBeDefined();
      expect(stored.source).toBe('garmin_manual');
    });

    it('should maintain data integrity on concurrent writes', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          garminManualDataService.addManualHeartRateData(testUserId, testDeviceId, {
            timestamp: Date.now() + i,
            value: 70 + i
          })
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.dataType === 'heart_rate')).toBe(true);
    });
  });
});

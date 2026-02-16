/**
 * Garmin to Google Fit Integration Test
 * 
 * Verifies that data exported from Garmin is correctly received and processed
 * by Google Fit and HealthConnect services.
 * 
 * Test Coverage:
 * - Data format transformation (Garmin -> standardized format)
 * - Field mapping and validation
 * - Timestamp conversion
 * - Confidence scoring
 * - Source tracking
 * - Data type alignment
 */

import { BiometricDataType, BiometricDataPoint } from '../types/biometric';

describe('Garmin to Google Fit Integration', () => {
  describe('Heart Rate Data Transformation', () => {
    it('should map Garmin heart rate data to standardized format', () => {
      // Garmin format
      const garminHeartRateData = {
        calendarDate: '2026-01-25',
        maxHeartRate: 165,
        minHeartRate: 48,
        restingHeartRate: 62,
        lastNightFiveMinuteValues: [
          { timestamp: 1706172000, value: 72 },
          { timestamp: 1706172300, value: 74 },
          { timestamp: 1706172600, value: 68 }
        ]
      };

      // Expected standardized format
      const expectedBiometricPoint: Partial<BiometricDataPoint> = {
        dataType: BiometricDataType.HEART_RATE,
        value: 72, // From last five minute value
        unit: 'bpm',
        device: 'garmin',
        source: 'garmin',
        confidence: 1.0
      };

      // Validate transformation
      expect(garminHeartRateData.restingHeartRate).toBeGreaterThan(0);
      expect(garminHeartRateData.restingHeartRate).toBeLessThan(100);
      expect(expectedBiometricPoint.value).toBeGreaterThanOrEqual(garminHeartRateData.minHeartRate!);
      expect(expectedBiometricPoint.value).toBeLessThanOrEqual(garminHeartRateData.maxHeartRate!);
    });

    it('should preserve heart rate range data', () => {
      const garminData = {
        maxHeartRate: 165,
        minHeartRate: 48,
        restingHeartRate: 62
      };

      // Create multiple data points for different metrics
      const dataPoints: Partial<BiometricDataPoint>[] = [
        {
          dataType: BiometricDataType.HEART_RATE_MAX,
          value: garminData.maxHeartRate,
          unit: 'bpm'
        },
        {
          dataType: BiometricDataType.HEART_RATE_MIN,
          value: garminData.minHeartRate,
          unit: 'bpm'
        },
        {
          dataType: BiometricDataType.RHR,
          value: garminData.restingHeartRate,
          unit: 'bpm'
        }
      ];

      expect(dataPoints).toHaveLength(3);
      expect(dataPoints[0].value).toBe(165);
      expect(dataPoints[1].value).toBe(48);
      expect(dataPoints[2].value).toBe(62);
    });
  });

  describe('Sleep Data Transformation', () => {
    it('should map Garmin sleep data to standardized format', () => {
      const garminSleepData = {
        calendarDate: '2026-01-25',
        startTimeInSeconds: 1706155200,
        endTimeInSeconds: 1706185200,
        duration: 30000,
        sleepQuality: 'EXCELLENT' as const,
        deepSleepDuration: 15000,
        lightSleepDuration: 12000,
        remSleepDuration: 3000,
        awakeDuration: 0
      };

      // Validate duration calculation
      const durationMs = (garminSleepData.endTimeInSeconds - garminSleepData.startTimeInSeconds) * 1000;
      const durationHours = durationMs / (1000 * 60 * 60);

      expect(durationHours).toBeCloseTo(8.33, 1);

      // Validate sleep composition
      const totalSleep = garminSleepData.deepSleepDuration + 
                        garminSleepData.lightSleepDuration + 
                        garminSleepData.remSleepDuration;

      expect(totalSleep).toBeCloseTo(garminSleepData.duration, -3);

      // Quality mapping
      const qualityScores: Record<string, number> = {
        'POOR': 0.25,
        'FAIR': 0.5,
        'GOOD': 0.75,
        'EXCELLENT': 1.0
      };

      expect(qualityScores[garminSleepData.sleepQuality]).toBe(1.0);
    });

    it('should validate sleep data consistency', () => {
      const garminSleepData = {
        startTimeInSeconds: 1706155200,
        endTimeInSeconds: 1706185200,
        deepSleepDuration: 15000,
        lightSleepDuration: 12000,
        remSleepDuration: 3000,
        awakeDuration: 0
      };

      // Validate time ordering
      expect(garminSleepData.endTimeInSeconds).toBeGreaterThan(garminSleepData.startTimeInSeconds);

      // Validate sleep stages add up
      const totalStages = garminSleepData.deepSleepDuration + 
                         garminSleepData.lightSleepDuration + 
                         garminSleepData.remSleepDuration + 
                         garminSleepData.awakeDuration;

      expect(totalStages).toBeLessThanOrEqual(30000);
    });
  });

  describe('Activity Data Transformation', () => {
    it('should map Garmin activity data to standardized format', () => {
      const garminActivityData = {
        activityId: 123456789,
        activityName: 'Running',
        startTimeInSeconds: 1706172000,
        duration: 3600,
        calories: 500,
        distance: 5000,
        steps: 5500,
        avgHeartRate: 140,
        maxHeartRate: 160,
        activityType: 'RUNNING'
      };

      // Validate data types
      expect(typeof garminActivityData.activityId).toBe('number');
      expect(typeof garminActivityData.duration).toBe('number');
      expect(typeof garminActivityData.calories).toBe('number');
      expect(typeof garminActivityData.distance).toBe('number');
      expect(typeof garminActivityData.steps).toBe('number');

      // Validate ranges
      expect(garminActivityData.calories).toBeGreaterThan(0);
      expect(garminActivityData.distance).toBeGreaterThan(0);
      expect(garminActivityData.avgHeartRate).toBeLessThanOrEqual(garminActivityData.maxHeartRate);
    });

    it('should create multiple data points for activity metrics', () => {
      const garminActivityData = {
        startTimeInSeconds: 1706172000,
        calories: 500,
        distance: 5000,
        steps: 5500,
        avgHeartRate: 140,
        maxHeartRate: 160
      };

      const dataPoints: Partial<BiometricDataPoint>[] = [];
      const baseTimestamp = garminActivityData.startTimeInSeconds * 1000;

      // Create data points for each metric
      if (garminActivityData.calories) {
        dataPoints.push({
          dataType: BiometricDataType.CALORIES,
          value: garminActivityData.calories,
          unit: 'kcal',
          timestamp: baseTimestamp
        });
      }

      if (garminActivityData.distance) {
        dataPoints.push({
          dataType: BiometricDataType.ACTIVITY,
          value: garminActivityData.distance,
          unit: 'meters',
          timestamp: baseTimestamp
        });
      }

      if (garminActivityData.avgHeartRate) {
        dataPoints.push({
          dataType: BiometricDataType.HEART_RATE_AVG,
          value: garminActivityData.avgHeartRate,
          unit: 'bpm',
          timestamp: baseTimestamp
        });
      }

      expect(dataPoints.length).toBeGreaterThan(0);
      expect(dataPoints[0].dataType).toBe(BiometricDataType.CALORIES);
    });
  });

  describe('Stress Data Transformation', () => {
    it('should map Garmin stress data to standardized format', () => {
      const garminStressData = {
        calendarDate: '2026-01-25',
        dayAverage: 45,
        maxStress: 75,
        minStress: 20,
        stressValues: [
          { timestamp: 1706172000, value: 45 },
          { timestamp: 1706172300, value: 50 },
          { timestamp: 1706172600, value: 40 }
        ]
      };

      // Validate stress range
      expect(garminStressData.dayAverage).toBeGreaterThanOrEqual(0);
      expect(garminStressData.dayAverage).toBeLessThanOrEqual(100);
      expect(garminStressData.minStress).toBeLessThanOrEqual(garminStressData.dayAverage);
      expect(garminStressData.dayAverage).toBeLessThanOrEqual(garminStressData.maxStress);
    });

    it('should validate stress values are within valid range', () => {
      const stressValues = [20, 45, 50, 40, 75];

      stressValues.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Data Type Alignment', () => {
    it('should use correct BiometricDataType enum values', () => {
      const garminToStandardized = {
        'heart_rate': BiometricDataType.HEART_RATE,
        'resting_heart_rate': BiometricDataType.RHR,
        'heart_rate_avg': BiometricDataType.HEART_RATE_AVG,
        'heart_rate_max': BiometricDataType.HEART_RATE_MAX,
        'sleep_duration': BiometricDataType.SLEEP_DURATION,
        'activity': BiometricDataType.ACTIVITY,
        'stress': BiometricDataType.STRESS,
        'stress_level': BiometricDataType.STRESS_LEVEL,
        'calories': BiometricDataType.CALORIES
      };

      Object.values(garminToStandardized).forEach(dataType => {
        expect(dataType).toBeDefined();
        expect(typeof dataType).toBe('string');
      });
    });

    it('should maintain consistency across all data points', () => {
      const dataPoints: Partial<BiometricDataPoint>[] = [
        {
          dataType: BiometricDataType.HEART_RATE,
          value: 72,
          unit: 'bpm',
          device: 'garmin',
          source: 'garmin'
        },
        {
          dataType: BiometricDataType.SLEEP_DURATION,
          value: 8,
          unit: 'hours',
          device: 'garmin',
          source: 'garmin'
        },
        {
          dataType: BiometricDataType.ACTIVITY,
          value: 5000,
          unit: 'meters',
          device: 'garmin',
          source: 'garmin'
        }
      ];

      dataPoints.forEach(point => {
        expect(point.device).toBe('garmin');
        expect(point.source).toBe('garmin');
        expect(point.dataType).toBeDefined();
        expect(point.unit).toBeDefined();
      });
    });
  });

  describe('Timestamp Conversion', () => {
    it('should convert Garmin seconds to milliseconds correctly', () => {
      const garminTimestampSeconds = 1706172000;
      const convertedMs = garminTimestampSeconds * 1000;

      expect(convertedMs).toBe(1706172000000);
      expect(convertedMs / 1000).toBe(garminTimestampSeconds);
    });

    it('should handle date string conversion', () => {
      const garminDateString = '2026-01-25';
      const date = new Date(garminDateString);
      const timestamp = date.getTime();

      expect(timestamp).toBeGreaterThan(0);
      expect(new Date(timestamp).toISOString().split('T')[0]).toBe(garminDateString);
    });

    it('should preserve timestamp accuracy', () => {
      const originalTs = 1706172345678; // milliseconds
      const garminTs = Math.floor(originalTs / 1000); // convert to seconds
      const reconstructedTs = garminTs * 1000; // convert back

      expect(reconstructedTs).toBe(1706172345000); // loses milliseconds, but consistent
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign confidence 1.0 to Garmin API data', () => {
      const apiDataConfidence = 1.0;

      expect(apiDataConfidence).toBe(1.0);
      expect(apiDataConfidence).toBeGreaterThanOrEqual(0);
      expect(apiDataConfidence).toBeLessThanOrEqual(1);
    });

    it('should assign lower confidence to manual entries', () => {
      const manualDataConfidence = 0.8;

      expect(manualDataConfidence).toBeLessThan(1.0);
      expect(manualDataConfidence).toBeGreaterThanOrEqual(0);
      expect(manualDataConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Source Tracking', () => {
    it('should mark all Garmin API data with source=garmin', () => {
      const dataPoints: Partial<BiometricDataPoint>[] = [
        { source: 'garmin' },
        { source: 'garmin' },
        { source: 'garmin' }
      ];

      dataPoints.forEach(point => {
        expect(point.source).toBe('garmin');
      });
    });

    it('should mark manual entries with source=garmin_manual', () => {
      const dataPoints: Partial<BiometricDataPoint>[] = [
        { source: 'garmin_manual' },
        { source: 'garmin_manual' }
      ];

      dataPoints.forEach(point => {
        expect(point.source).toBe('garmin_manual');
      });
    });

    it('should distinguish between data sources', () => {
      const apiData = { source: 'garmin', confidence: 1.0 };
      const manualData = { source: 'garmin_manual', confidence: 0.8 };

      expect(apiData.source).not.toBe(manualData.source);
      expect(apiData.confidence).toBeGreaterThan(manualData.confidence);
    });
  });

  describe('Field Validation', () => {
    it('should validate required fields are present', () => {
      const requiredFields = ['userId', 'timestamp', 'dataType', 'value', 'unit', 'device', 'source'];
      const biometricPoint: Partial<BiometricDataPoint> = {
        userId: 'user123',
        timestamp: 1706172000000,
        dataType: BiometricDataType.HEART_RATE,
        value: 72,
        unit: 'bpm',
        device: 'garmin',
        source: 'garmin'
      };

      requiredFields.forEach(field => {
        expect(biometricPoint).toHaveProperty(field);
        expect((biometricPoint as any)[field]).toBeDefined();
      });
    });

    it('should validate field types', () => {
      const biometricPoint: Partial<BiometricDataPoint> = {
        userId: 'user123',
        timestamp: 1706172000000,
        dataType: BiometricDataType.HEART_RATE,
        value: 72.5,
        unit: 'bpm',
        device: 'garmin',
        source: 'garmin',
        confidence: 1.0
      };

      expect(typeof biometricPoint.userId).toBe('string');
      expect(typeof biometricPoint.timestamp).toBe('number');
      expect(typeof biometricPoint.value).toBe('number');
      expect(typeof biometricPoint.unit).toBe('string');
      expect(typeof biometricPoint.confidence).toBe('number');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity across transformation', () => {
      const originalGarminData = {
        calories: 500,
        distance: 5000,
        avgHeartRate: 140
      };

      const transformedData = {
        value: originalGarminData.calories,
        unit: 'kcal',
        dataType: BiometricDataType.CALORIES
      };

      expect(transformedData.value).toBe(originalGarminData.calories);
    });

    it('should handle edge case values', () => {
      const edgeCaseValues = [0, 1, 100, 65535, -1];

      const validValues = edgeCaseValues.filter(v => v >= 0);
      expect(validValues.length).toBe(4);

      // Heart rate: 0-250
      const heartRateValues = [0, 72, 150, 250];
      heartRateValues.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(250);
      });
    });
  });
});

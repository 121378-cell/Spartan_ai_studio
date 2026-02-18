/**
 * Biometric Service Phase 2 Tests
 *
 * Comprehensive tests for Phase 2.5 enhanced aggregation methods:
 * - aggregateDailyDataV2()
 * - normalizeTerraPayload()
 * - Training load calculations
 * - Data quality metrics
 */

import { biometricService } from '../services/biometricService';
import { logger } from '../utils/logger';

jest.mock('../utils/logger');

describe('BiometricService - Phase 2', () => {
  const testUserId = 'test-user-phase2';
  const testDate = '2024-01-23';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('aggregateDailyDataV2', () => {
    describe('Basic Functionality', () => {
      it('should return default values when no terraData provided', async () => {
        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate);

        expect(result.date).toBe(testDate);
        expect(result.hrvAvg).toBe(50);
        expect(result.rhrAvg).toBe(60);
        expect(result.sleepDuration).toBe(420);
        expect(result.sleepQuality).toBe(70);
        expect(result.activityCalories).toBe(400);
        expect(result.steps).toBe(8000);
        expect(result.dataQuality).toBe(0.3);
        expect(result.sources).toContain('estimated');
      });

      it('should process HRV data from terraData', async () => {
        const terraData = {
          hrv: [
            { value: 65, baseline: 55, percentile: 70 },
            { value: 75, baseline: 55, percentile: 80 }
          ]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.hrvAvg).toBe(70);
        expect(result.hrvBaseline).toBe(55);
        expect(result.sources).toContain('wearable-hrv');
      });

      it('should process RHR data from terraData', async () => {
        const terraData = {
          rhr: [
            { value: 58 },
            { value: 62 }
          ]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.rhrAvg).toBe(60);
        expect(result.sources).toContain('wearable-rhr');
      });

      it('should process sleep data from terraData', async () => {
        const terraData = {
          sleep: [
            { duration: 420, quality: 80, deep: 90, rem: 60 }
          ]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.sleepDuration).toBe(420);
        expect(result.sleepQuality).toBe(80);
        expect(result.sources).toContain('wearable-sleep');
      });

      it('should process activity data from terraData', async () => {
        const terraData = {
          activity: [
            { steps: 10000, calories: 500, moderate: 45, vigorous: 20 }
          ]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.steps).toBe(10000);
        expect(result.activityCalories).toBe(500);
        expect(result.sources).toContain('wearable-activity');
      });

      it('should aggregate multiple activity entries', async () => {
        const terraData = {
          activity: [
            { steps: 5000, calories: 250, moderate: 20, vigorous: 10 },
            { steps: 6000, calories: 300, moderate: 30, vigorous: 15 }
          ]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.steps).toBe(11000);
        expect(result.activityCalories).toBe(550);
      });
    });

    describe('Recovery Index Calculation', () => {
      it('should calculate recovery index with excellent data', async () => {
        const terraData = {
          hrv: [{ value: 100, baseline: 60, percentile: 90 }],
          rhr: [{ value: 48 }],
          sleep: [{ duration: 480, quality: 95, deep: 120, rem: 90 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.recoveryIndex).toBeGreaterThan(70);
      });

      it('should calculate recovery index with poor data', async () => {
        const terraData = {
          hrv: [{ value: 30, baseline: 60, percentile: 20 }],
          rhr: [{ value: 80 }],
          sleep: [{ duration: 300, quality: 40, deep: 30, rem: 20 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.recoveryIndex).toBeLessThan(60);
      });
    });

    describe('Stress Level Calculation', () => {
      it('should estimate low stress with high HRV', async () => {
        const terraData = {
          hrv: [{ value: 100, baseline: 60, percentile: 90 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.stressLevel).toBeLessThan(30);
      });

      it('should estimate high stress with low HRV', async () => {
        const terraData = {
          hrv: [{ value: 30, baseline: 60, percentile: 20 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.stressLevel).toBeGreaterThan(50);
      });
    });

    describe('Training Load Calculation', () => {
      it('should calculate training load from activity', async () => {
        const terraData = {
          activity: [
            { steps: 15000, calories: 800, moderate: 60, vigorous: 30 }
          ],
          hrv: [{ value: 60, baseline: 60, percentile: 50 }],
          rhr: [{ value: 60 }],
          sleep: [{ duration: 480, quality: 80, deep: 100, rem: 80 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.trainingLoad).toBeGreaterThan(0);
        expect(typeof result.trainingLoad).toBe('number');
      });

      it('should increase training load with vigorous activity', async () => {
        const moderateOnly = {
          activity: [{ steps: 10000, calories: 400, moderate: 60, vigorous: 0 }],
          hrv: [{ value: 60, baseline: 60, percentile: 50 }],
          rhr: [{ value: 60 }],
          sleep: [{ duration: 480, quality: 80, deep: 100, rem: 80 }]
        };

        const withVigorous = {
          activity: [{ steps: 10000, calories: 400, moderate: 30, vigorous: 30 }],
          hrv: [{ value: 60, baseline: 60, percentile: 50 }],
          rhr: [{ value: 60 }],
          sleep: [{ duration: 480, quality: 80, deep: 100, rem: 80 }]
        };

        const resultModerate = await biometricService.aggregateDailyDataV2(testUserId, testDate, moderateOnly);
        const resultVigorous = await biometricService.aggregateDailyDataV2(testUserId, testDate, withVigorous);

        expect(resultVigorous.trainingLoad).toBeGreaterThan(resultModerate.trainingLoad);
      });

      it('should adjust training load based on recovery', async () => {
        const goodRecovery = {
          activity: [{ steps: 10000, calories: 400, moderate: 30, vigorous: 10 }],
          hrv: [{ value: 100, baseline: 60, percentile: 90 }],
          rhr: [{ value: 48 }],
          sleep: [{ duration: 480, quality: 95, deep: 120, rem: 90 }]
        };

        const poorRecovery = {
          activity: [{ steps: 10000, calories: 400, moderate: 30, vigorous: 10 }],
          hrv: [{ value: 30, baseline: 60, percentile: 20 }],
          rhr: [{ value: 80 }],
          sleep: [{ duration: 300, quality: 40, deep: 30, rem: 20 }]
        };

        const resultGood = await biometricService.aggregateDailyDataV2(testUserId, testDate, goodRecovery);
        const resultPoor = await biometricService.aggregateDailyDataV2(testUserId, testDate, poorRecovery);

        expect(resultPoor.trainingLoad).toBeGreaterThan(resultGood.trainingLoad);
      });
    });

    describe('Data Quality Calculation', () => {
      it('should return 0.3 quality with no terraData', async () => {
        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate);

        expect(result.dataQuality).toBe(0.3);
      });

      it('should calculate quality with partial data', async () => {
        const terraData = {
          hrv: [{ value: 60, baseline: 60, percentile: 50 }],
          rhr: [{ value: 60 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.dataQuality).toBe(0.45);
      });

      it('should calculate quality with all data types', async () => {
        const terraData = {
          hrv: [{ value: 60, baseline: 60, percentile: 50 }],
          rhr: [{ value: 60 }],
          sleep: [{ duration: 480, quality: 80, deep: 100, rem: 80 }],
          activity: [{ steps: 10000, calories: 400, moderate: 30, vigorous: 10 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.dataQuality).toBe(1.0);
      });

      it('should add bonus for multiple sources', async () => {
        const threeSources = {
          hrv: [{ value: 60, baseline: 60, percentile: 50 }],
          rhr: [{ value: 60 }],
          sleep: [{ duration: 480, quality: 80, deep: 100, rem: 80 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, threeSources);

        expect(result.dataQuality).toBeCloseTo(0.8, 2);
      });
    });

    describe('Error Handling', () => {
      it('should handle gracefully with null terraData', async () => {
        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, null as any);

        expect(result.date).toBe(testDate);
        expect(result.dataQuality).toBe(0.3);
      });

      it('should handle undefined terraData', async () => {
        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, undefined);

        expect(result.date).toBe(testDate);
        expect(result.sources).toContain('estimated');
      });
    });
  });

  describe('normalizeTerraPayload', () => {
    describe('Garmin Normalization', () => {
      it('should normalize Garmin HRV data', () => {
        const payload = {
          hrv_summary: {
            weekly_avg: 65,
            baseline: 55,
            percentile: 72
          }
        };

        const result = biometricService.normalizeTerraPayload('garmin', payload);

        expect(result.hrv).toBeDefined();
        expect(result.hrv![0].value).toBe(65);
        expect(result.hrv![0].baseline).toBe(55);
        expect(result.hrv![0].percentile).toBe(72);
      });

      it('should normalize Garmin sleep data', () => {
        const payload = {
          sleep_data: {
            duration_seconds: 28800,
            overall_score: 85,
            deep_sleep_seconds: 5400,
            rem_sleep_seconds: 3600
          }
        };

        const result = biometricService.normalizeTerraPayload('garmin', payload);

        expect(result.sleep).toBeDefined();
        expect(result.sleep![0].duration).toBe(480);
        expect(result.sleep![0].quality).toBe(85);
        expect(result.sleep![0].deep).toBe(90);
        expect(result.sleep![0].rem).toBe(60);
      });

      it('should normalize Garmin activity data', () => {
        const payload = {
          activity_data: {
            steps: 12000,
            active_calories: 600,
            moderate_intensity_minutes: 45,
            vigorous_intensity_minutes: 20
          }
        };

        const result = biometricService.normalizeTerraPayload('garmin', payload);

        expect(result.activity).toBeDefined();
        expect(result.activity![0].steps).toBe(12000);
        expect(result.activity![0].calories).toBe(600);
        expect(result.activity![0].moderate).toBe(45);
        expect(result.activity![0].vigorous).toBe(20);
      });

      it('should normalize Garmin RHR data', () => {
        const payload = {
          heart_rate_data: {
            resting_hr: 52
          }
        };

        const result = biometricService.normalizeTerraPayload('garmin', payload);

        expect(result.rhr).toBeDefined();
        expect(result.rhr![0].value).toBe(52);
      });

      it('should use fallback values for Garmin missing data', () => {
        const payload = {
          hrv_summary: {},
          sleep_data: {}
        };

        const result = biometricService.normalizeTerraPayload('garmin', payload);

        expect(result.hrv![0].value).toBe(50);
        expect(result.sleep![0].duration).toBe(420);
      });
    });

    describe('Apple Health Normalization', () => {
      it('should normalize Apple HRV data', () => {
        const payload = {
          heart_rate_variability: {
            avg: 72
          }
        };

        const result = biometricService.normalizeTerraPayload('apple', payload);

        expect(result.hrv).toBeDefined();
        expect(result.hrv![0].value).toBe(72);
        expect(result.hrv![0].baseline).toBe(55);
      });

      it('should normalize Apple sleep data', () => {
        const payload = {
          sleep: {
            duration: 28800,
            quality_score: 88,
            deep_sleep: 5400,
            rem_sleep: 3600
          }
        };

        const result = biometricService.normalizeTerraPayload('apple', payload);

        expect(result.sleep).toBeDefined();
        expect(result.sleep![0].duration).toBe(480);
        expect(result.sleep![0].quality).toBe(88);
      });
    });

    describe('WHOOP Normalization', () => {
      it('should normalize WHOOP recovery data', () => {
        const payload = {
          recovery: {
            hrv: 68,
            recovery_score: 82
          }
        };

        const result = biometricService.normalizeTerraPayload('whoop', payload);

        expect(result.hrv).toBeDefined();
        expect(result.hrv![0].value).toBe(68);
        expect(result.hrv![0].percentile).toBe(82);
      });

      it('should normalize WHOOP sleep data', () => {
        const payload = {
          sleep: {
            duration: 27000,
            sleep_performance: 78,
            deep_sleep: 6000,
            rem_sleep: 4200
          }
        };

        const result = biometricService.normalizeTerraPayload('whoop', payload);

        expect(result.sleep).toBeDefined();
        expect(result.sleep![0].duration).toBe(450);
        expect(result.sleep![0].quality).toBe(78);
      });
    });

    describe('Oura Normalization', () => {
      it('should normalize Oura HRV data', () => {
        const payload = {
          hrv: {
            average: 58,
            baseline_deviation: 45
          }
        };

        const result = biometricService.normalizeTerraPayload('oura', payload);

        expect(result.hrv).toBeDefined();
        expect(result.hrv![0].value).toBe(58);
        expect(result.hrv![0].percentile).toBe(45);
      });

      it('should normalize Oura sleep data', () => {
        const payload = {
          sleep: {
            duration: 28800,
            score: 86,
            deep: 6000,
            rem: 4800
          }
        };

        const result = biometricService.normalizeTerraPayload('oura', payload);

        expect(result.sleep).toBeDefined();
        expect(result.sleep![0].duration).toBe(480);
        expect(result.sleep![0].quality).toBe(86);
        expect(result.sleep![0].deep).toBe(100);
        expect(result.sleep![0].rem).toBe(80);
      });
    });

    describe('Google Fit Normalization', () => {
      it('should normalize Google Fit heart rate data', () => {
        const payload = {
          heart_rate: {
            resting: 58
          }
        };

        const result = biometricService.normalizeTerraPayload('google_fit', payload);

        expect(result.rhr).toBeDefined();
        expect(result.rhr![0].value).toBe(58);
      });

      it('should normalize Google Fit activity data', () => {
        const payload = {
          activity: {
            steps: 8500,
            calories: 380,
            moderate_minutes: 35,
            vigorous_minutes: 15
          }
        };

        const result = biometricService.normalizeTerraPayload('google_fit', payload);

        expect(result.activity).toBeDefined();
        expect(result.activity![0].steps).toBe(8500);
        expect(result.activity![0].calories).toBe(380);
        expect(result.activity![0].moderate).toBe(35);
        expect(result.activity![0].vigorous).toBe(15);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty payload', () => {
        const result = biometricService.normalizeTerraPayload('garmin', {});

        expect(result).toBeDefined();
        expect(Object.keys(result).length).toBe(0);
      });

      it('should handle partial payload', () => {
        const result = biometricService.normalizeTerraPayload('garmin', {
          activity_data: { steps: 5000 }
        });

        expect(result.activity).toBeDefined();
        expect(result.hrv).toBeUndefined();
        expect(result.sleep).toBeUndefined();
      });

      it('should handle null values in payload', () => {
        const payload = {
          hrv_summary: {
            weekly_avg: null,
            baseline: null
          }
        };

        const result = biometricService.normalizeTerraPayload('garmin', payload);

        expect(result.hrv).toBeDefined();
        expect(result.hrv![0].value).toBe(50);
        expect(result.hrv![0].baseline).toBe(50);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should process full Terra webhook payload end-to-end', async () => {
      const garminPayload = {
        hrv_summary: {
          weekly_avg: 72,
          baseline: 65,
          percentile: 78
        },
        sleep_data: {
          duration_seconds: 28800,
          overall_score: 85,
          deep_sleep_seconds: 5400,
          rem_sleep_seconds: 3600
        },
        activity_data: {
          steps: 12500,
          active_calories: 650,
          moderate_intensity_minutes: 50,
          vigorous_intensity_minutes: 25
        },
        heart_rate_data: {
          resting_hr: 50
        }
      };

      const normalizedData = biometricService.normalizeTerraPayload('garmin', garminPayload);
      const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, normalizedData);

      expect(result.hrvAvg).toBe(72);
      expect(result.hrvBaseline).toBe(65);
      expect(result.rhrAvg).toBe(50);
      expect(result.sleepDuration).toBe(480);
      expect(result.sleepQuality).toBe(85);
      expect(result.steps).toBe(12500);
      expect(result.activityCalories).toBe(650);
      expect(result.dataQuality).toBe(1.0);
      expect(result.sources).toHaveLength(4);
    });

    it('should handle multi-source data aggregation', async () => {
      const garminData = biometricService.normalizeTerraPayload('garmin', {
        hrv_summary: { weekly_avg: 70, baseline: 60 },
        heart_rate_data: { resting_hr: 52 }
      });

      const whoopData = biometricService.normalizeTerraPayload('whoop', {
        sleep: { duration: 27000, sleep_performance: 82, deep_sleep: 5400, rem_sleep: 3600 }
      });

      const combinedData = {
        hrv: [...(garminData.hrv || []), ...(whoopData.hrv || [])],
        rhr: garminData.rhr,
        sleep: whoopData.sleep,
        activity: []
      };

      const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, combinedData);

      expect(result.hrvAvg).toBe(70);
      expect(result.rhrAvg).toBe(52);
      expect(result.sleepDuration).toBe(450);
    });

    it('should maintain data consistency across processing pipeline', async () => {
      const payload = {
        hrv: [{ value: 65, baseline: 60, percentile: 70 }],
        rhr: [{ value: 55 }],
        sleep: [{ duration: 450, quality: 82, deep: 90, rem: 70 }],
        activity: [{ steps: 10000, calories: 450, moderate: 40, vigorous: 15 }]
      };

      const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, payload);

      expect(result.date).toBe(testDate);
      expect(typeof result.hrvAvg).toBe('number');
      expect(typeof result.rhrAvg).toBe('number');
      expect(typeof result.sleepDuration).toBe('number');
      expect(typeof result.sleepQuality).toBe('number');
      expect(typeof result.stressLevel).toBe('number');
      expect(typeof result.recoveryIndex).toBe('number');
      expect(typeof result.trainingLoad).toBe('number');
      expect(typeof result.dataQuality).toBe('number');
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should process large activity datasets efficiently', async () => {
      const largeActivity = Array(100).fill(null).map((_, i) => ({
        steps: 100 + i,
        calories: 10 + i,
        moderate: 5 + i,
        vigorous: 2 + i
      }));

      const terraData = {
        activity: largeActivity,
        hrv: [{ value: 60, baseline: 60, percentile: 50 }],
        rhr: [{ value: 60 }],
        sleep: [{ duration: 480, quality: 80, deep: 100, rem: 80 }]
      };

      const startTime = Date.now();
      const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
      expect(result.steps).toBeGreaterThan(0);
    });
  });

  describe('Extended Edge Cases', () => {
    describe('Extreme Values', () => {
      it('should handle zero HRV values', async () => {
        const terraData = {
          hrv: [{ value: 0, baseline: 50, percentile: 0 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.hrvAvg).toBe(0);
        expect(result.stressLevel).toBe(100);
      });

      it('should handle very high HRV values', async () => {
        const terraData = {
          hrv: [{ value: 200, baseline: 60, percentile: 99 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.hrvAvg).toBe(200);
        expect(result.stressLevel).toBeLessThan(20);
      });

      it('should handle zero sleep duration', async () => {
        const terraData = {
          sleep: [{ duration: 0, quality: 0, deep: 0, rem: 0 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.sleepDuration).toBe(0);
        expect(result.sleepQuality).toBe(0);
      });

      it('should handle very high activity values', async () => {
        const terraData = {
          activity: [{ steps: 50000, calories: 3000, moderate: 180, vigorous: 120 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.steps).toBe(50000);
        expect(result.trainingLoad).toBeGreaterThan(500);
      });
    });

    describe('Boundary Conditions', () => {
      it('should cap stress level at 100', async () => {
        const terraData = {
          hrv: [{ value: 10, baseline: 100, percentile: 5 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.stressLevel).toBeLessThanOrEqual(100);
        expect(result.stressLevel).toBeGreaterThanOrEqual(0);
      });

      it('should handle baseline equal to HRV', async () => {
        const terraData = {
          hrv: [{ value: 60, baseline: 60, percentile: 50 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.hrvAvg).toBe(result.hrvBaseline);
        expect(result.stressLevel).toBe(50);
      });

      it('should handle baseline higher than HRV', async () => {
        const terraData = {
          hrv: [{ value: 40, baseline: 80, percentile: 20 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.stressLevel).toBeGreaterThan(50);
      });
    });

    describe('Empty and Missing Data', () => {
      it('should handle empty arrays in terraData', async () => {
        const terraData = {
          hrv: [],
          rhr: [],
          sleep: [],
          activity: []
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.dataQuality).toBe(0);
        expect(result.hrvAvg).toBe(50);
        expect(result.rhrAvg).toBe(60);
      });

      it('should handle missing optional fields in activity', async () => {
        const terraData = {
          activity: [{ steps: 5000, calories: 200, moderate: 0, vigorous: 0 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.steps).toBe(5000);
        expect(result.trainingLoad).toBeGreaterThan(0);
      });

      it('should handle incomplete HRV data', async () => {
        const terraData = {
          hrv: [{ value: 60, baseline: 50, percentile: 50 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.hrvAvg).toBe(60);
      });
    });

    describe('Data Quality Edge Cases', () => {
      it('should calculate quality with only one source', async () => {
        const terraData = {
          hrv: [{ value: 60, baseline: 60, percentile: 50 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.dataQuality).toBe(0.25);
      });

      it('should calculate quality with two sources', async () => {
        const terraData = {
          hrv: [{ value: 60, baseline: 60, percentile: 50 }],
          rhr: [{ value: 60 }]
        };

        const result = await biometricService.aggregateDailyDataV2(testUserId, testDate, terraData);

        expect(result.dataQuality).toBe(0.45);
      });
    });

    describe('Training Load Calculations', () => {
      it('should calculate higher load with low recovery', async () => {
        const lowRecoveryData = {
          activity: [{ steps: 10000, calories: 500, moderate: 30, vigorous: 10 }],
          hrv: [{ value: 20, baseline: 60, percentile: 10 }],
          rhr: [{ value: 80 }],
          sleep: [{ duration: 300, quality: 30, deep: 20, rem: 20 }]
        };

        const highRecoveryData = {
          activity: [{ steps: 10000, calories: 500, moderate: 30, vigorous: 10 }],
          hrv: [{ value: 100, baseline: 60, percentile: 95 }],
          rhr: [{ value: 45 }],
          sleep: [{ duration: 500, quality: 95, deep: 120, rem: 100 }]
        };

        const lowResult = await biometricService.aggregateDailyDataV2(testUserId, testDate, lowRecoveryData);
        const highResult = await biometricService.aggregateDailyDataV2(testUserId, testDate, highRecoveryData);

        expect(lowResult.trainingLoad).toBeGreaterThan(highResult.trainingLoad);
      });

      it('should scale training load with calories', async () => {
        const lowCalories = {
          activity: [{ steps: 5000, calories: 100, moderate: 10, vigorous: 0 }]
        };

        const highCalories = {
          activity: [{ steps: 20000, calories: 1500, moderate: 60, vigorous: 30 }]
        };

        const lowResult = await biometricService.aggregateDailyDataV2(testUserId, testDate, lowCalories);
        const highResult = await biometricService.aggregateDailyDataV2(testUserId, testDate, highCalories);

        expect(highResult.trainingLoad).toBeGreaterThan(lowResult.trainingLoad * 5);
      });
    });

    describe('Terra Payload Edge Cases', () => {
      it('should handle Garmin with missing nested data', () => {
        const result = biometricService.normalizeTerraPayload('garmin', {
          hrv_summary: null,
          sleep_data: undefined
        });

        expect(result.hrv).toBeUndefined();
        expect(result.sleep).toBeUndefined();
      });

      it('should handle Apple with empty objects', () => {
        const result = biometricService.normalizeTerraPayload('apple', {
          heart_rate_variability: {},
          sleep: {}
        });

        expect(result.hrv).toBeDefined();
        expect(result.hrv![0].value).toBe(50);
      });

      it('should handle WHOOP with partial recovery data', () => {
        const result = biometricService.normalizeTerraPayload('whoop', {
          recovery: { hrv: 55 }
        });

        expect(result.hrv).toBeDefined();
        expect(result.hrv![0].value).toBe(55);
      });

      it('should handle Oura with missing hrv baseline deviation', () => {
        const result = biometricService.normalizeTerraPayload('oura', {
          hrv: { average: 50 }
        });

        expect(result.hrv).toBeDefined();
        expect(result.hrv![0].percentile).toBe(50);
      });

      it('should handle Google Fit with zero values', () => {
        const result = biometricService.normalizeTerraPayload('google_fit', {
          activity: {
            steps: 0,
            calories: 0,
            moderate_minutes: 0,
            vigorous_minutes: 0
          }
        });

        expect(result.activity).toBeDefined();
        expect(result.activity![0].steps).toBe(0);
      });
    });
  });
});

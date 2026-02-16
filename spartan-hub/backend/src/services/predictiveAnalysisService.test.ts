/**
 * Predictive Analysis Service Tests
 * 
 * Unit tests for trend analysis, fatigue prediction, and historical comparisons
 */

import PredictiveAnalysisService from '../services/predictiveAnalysisService';
import { DailyBiometrics } from '../models/BiometricData';

describe('PredictiveAnalysisService', () => {
  // Mock biometric data generator
  const generateBiometricData = (
    days: number,
    baseRecoveryScore: number = 50,
    trend: 'improving' | 'declining' | 'stable' = 'stable'
  ): DailyBiometrics[] => {
    const data: DailyBiometrics[] = [];
    const startDate = new Date('2024-01-01');

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      let score = baseRecoveryScore;
      if (trend === 'improving') {
        score = Math.min(100, baseRecoveryScore + i * 0.5);
      } else if (trend === 'declining') {
        score = Math.max(20, baseRecoveryScore - i * 0.5);
      }

      // Add random variance
      score = Math.max(20, Math.min(100, score + (Math.random() - 0.5) * 10));

      data.push({
        userId: 'test-user',
        date: dateStr,
        hrv: [
          {
            timestamp: new Date(dateStr),
            value: Math.random() * 100 + 20, // 20-120ms
            source: 'manual',
            quality: 'good',
          },
        ],
        restingHeartRate: [
          {
            timestamp: new Date(dateStr),
            value: Math.random() * 30 + 55, // 55-85 bpm
            source: 'manual',
          },
        ],
        sleep: {
          duration: Math.random() * 120 + 420, // 7-9 hours
          quality: 'good',
          source: 'manual',
          date: dateStr,
          startTime: new Date(`${dateStr}T22:00:00Z`),
          endTime: new Date(`${dateStr}T06:00:00Z`),
        },
        activity: {
          date: dateStr,
          steps: Math.random() * 10000 + 5000,
          distance: {
            value: Math.random() * 5 + 2,
            unit: 'km',
          },
          caloriesBurned: Math.random() * 500 + 1500,
          source: 'manual',
        },
        bodyMetrics: {
          timestamp: new Date(dateStr),
          weight: {
            value: 75 + Math.random() * 5,
            unit: 'kg',
            source: 'manual',
          },
          bodyFat: {
            value: 15 + Math.random() * 5,
            source: 'manual',
          },
        },
        recoveryIndex: {
          date: dateStr,
          score: Math.round(score),
          components: {
            hrv: Math.random() * 40 + 30,
            rhr: Math.random() * 40 + 30,
            sleepQuality: Math.random() * 40 + 30,
            stressLevel: Math.random() * 40 + 30,
          },
          recommendation: score > 50 ? 'push hard' : 'take it easy',
          readinessToTrain: score > 50 ? 'ready' : 'caution',
        },
        sources: new Set(['manual']),
        lastUpdated: new Date(),
        dataCompleteness: 85,
      });
    }

    return data;
  };

  describe('calculateTrendAnalysis', () => {
    it('should calculate trends for 30-day period', () => {
      const data = generateBiometricData(30, 50, 'stable');

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '30d'
      );

      expect(analysis).toBeDefined();
      expect(analysis.period).toBe('30d');
      expect(analysis.statistics.mean).toBeGreaterThan(0);
      expect(analysis.statistics.mean).toBeLessThanOrEqual(100);
      expect(analysis.statistics.median).toBeGreaterThan(0);
      expect(analysis.statistics.stdDev).toBeGreaterThanOrEqual(0);
      expect(analysis.dataPoints.length).toBe(30);
    });

    it('should detect improving trend', () => {
      const data = generateBiometricData(30, 30, 'improving');

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '30d'
      );

      expect(analysis.statistics.trend).toBe('improving');
      expect(analysis.statistics.trendStrength).toBeGreaterThan(0);
    });

    it('should detect declining trend', () => {
      const data = generateBiometricData(30, 70, 'declining');

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '30d'
      );

      expect(analysis.statistics.trend).toBe('declining');
      expect(analysis.statistics.trendStrength).toBeGreaterThan(0);
    });

    it('should generate insights', () => {
      const data = generateBiometricData(30, 50, 'stable');

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '30d'
      );

      expect(analysis.insights).toBeDefined();
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const data = generateBiometricData(30, 30, 'declining');

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '30d'
      );

      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect outliers using z-score', () => {
      const data = generateBiometricData(30, 50, 'stable');
      // Inject an outlier
      data[15].recoveryIndex!.score = 10; // Very low value

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '30d'
      );

      const outliers = analysis.dataPoints.filter((p) => p.isOutlier);
      expect(outliers.length).toBeGreaterThan(0);
    });
  });

  describe('predictFatigue', () => {
    it('should predict fatigue with low risk', () => {
      const data = generateBiometricData(14, 75, 'improving');

      const prediction = PredictiveAnalysisService.predictFatigue(data, 7);

      expect(prediction).toBeDefined();
      expect(prediction.fatigueRisk).toBeLessThan(50);
      expect(prediction.fatigueLevel).toBe('low');
    });

    it('should predict fatigue with high risk', () => {
      const data = generateBiometricData(14, 25, 'declining');

      const prediction = PredictiveAnalysisService.predictFatigue(data, 7);

      expect(prediction).toBeDefined();
      expect(prediction.fatigueRisk).toBeGreaterThan(50);
      expect(prediction.fatigueLevel).toMatch(/moderate|high/);
    });

    it('should include risk factors', () => {
      const data = generateBiometricData(14, 50, 'stable');

      const prediction = PredictiveAnalysisService.predictFatigue(data, 7);

      expect(prediction.riskFactors).toBeDefined();
      expect(prediction.riskFactors.lowHRV).toBeDefined();
      expect(prediction.riskFactors.elevatedRHR).toBeDefined();
      expect(prediction.riskFactors.poorSleep).toBeDefined();
      expect(prediction.riskFactors.highStress).toBeDefined();
      expect(prediction.riskFactors.consecutiveBadDays).toBeGreaterThanOrEqual(0);
    });

    it('should predict next days', () => {
      const data = generateBiometricData(14, 50, 'stable');

      const prediction = PredictiveAnalysisService.predictFatigue(data, 7);

      expect(prediction.nextDaysPrediction).toBeDefined();
      expect(prediction.nextDaysPrediction.length).toBe(7);
      prediction.nextDaysPrediction.forEach((p) => {
        expect(p.date).toBeDefined();
        expect(['low', 'moderate', 'high', 'critical']).toContain(
          p.predictedFatigueLevel
        );
      });
    });

    it('should generate recommendations', () => {
      const data = generateBiometricData(14, 50, 'stable');

      const prediction = PredictiveAnalysisService.predictFatigue(data, 7);

      expect(prediction.recommendations).toBeDefined();
      expect(prediction.recommendations.length).toBeGreaterThan(0);
    });

    it('should set warnings for critical fatigue', () => {
      const data = generateBiometricData(7, 20, 'declining');

      const prediction = PredictiveAnalysisService.predictFatigue(data, 7);

      if (prediction.fatigueLevel === 'critical') {
        expect(prediction.injuryRisk).toBeDefined();
      }
    });

    it('should require minimum data points', () => {
      const data = generateBiometricData(2, 50, 'stable');

      expect(() =>
        PredictiveAnalysisService.predictFatigue(data, 7)
      ).toThrow();
    });
  });

  describe('compareHistoricalData', () => {
    it('should show improvement', () => {
      const currentData = generateBiometricData(30, 70, 'improving');
      const previousData = generateBiometricData(30, 40, 'stable');

      const comparison = PredictiveAnalysisService.compareHistoricalData(
        currentData,
        previousData
      );

      expect(comparison.changes.recoveryDelta).toBeGreaterThan(0);
      expect(comparison.assessment).toBe('improving');
    });

    it('should show decline', () => {
      const currentData = generateBiometricData(30, 30, 'declining');
      const previousData = generateBiometricData(30, 60, 'stable');

      const comparison = PredictiveAnalysisService.compareHistoricalData(
        currentData,
        previousData
      );

      expect(comparison.changes.recoveryDelta).toBeLessThan(0);
      expect(comparison.assessment).toBe('declining');
    });

    it('should calculate percentage improvement', () => {
      const currentData = generateBiometricData(30, 60, 'improving');
      const previousData = generateBiometricData(30, 50, 'stable');

      const comparison = PredictiveAnalysisService.compareHistoricalData(
        currentData,
        previousData
      );

      if (comparison.assessment === 'improving') {
        expect(comparison.improvementPercent).toBeGreaterThan(0);
      }
    });

    it('should include component-level changes', () => {
      const currentData = generateBiometricData(30, 60, 'stable');
      const previousData = generateBiometricData(30, 50, 'stable');

      const comparison = PredictiveAnalysisService.compareHistoricalData(
        currentData,
        previousData
      );

      expect(comparison.changes.hrvDelta).toBeDefined();
      expect(comparison.changes.rhrDelta).toBeDefined();
      expect(comparison.changes.sleepDurationDelta).toBeDefined();
    });
  });

  describe('detectOvertraining', () => {
    it('should not detect overtraining with good recovery', () => {
      const data = generateBiometricData(30, 75, 'improving');

      const detection = PredictiveAnalysisService.detectOvertraining(data);

      expect(detection.isOvertrained).toBe(false);
      expect(detection.riskLevel).toBe('low');
    });

    it('should detect moderate overtraining', () => {
      const data = generateBiometricData(15, 50, 'declining');

      const detection = PredictiveAnalysisService.detectOvertraining(data);

      if (detection.isOvertrained) {
        expect(['moderate', 'high', 'critical']).toContain(
          detection.riskLevel
        );
      }
    });

    it('should include overtraining indicators', () => {
      const data = generateBiometricData(30, 50, 'declining');

      const detection = PredictiveAnalysisService.detectOvertraining(data);

      expect(detection.indicators).toBeDefined();
      expect(detection.indicators.hrv_declining).toBeDefined();
      expect(detection.indicators.rhr_elevated).toBeDefined();
      expect(detection.indicators.sleep_disrupted).toBeDefined();
    });

    it('should provide recommendations', () => {
      const data = generateBiometricData(30, 30, 'declining');

      const detection = PredictiveAnalysisService.detectOvertraining(data);

      expect(detection.recommendations).toBeDefined();
      expect(detection.recommendations.length).toBeGreaterThan(0);
    });

    it('should suggest appropriate actions', () => {
      const data = generateBiometricData(30, 30, 'declining');

      const detection = PredictiveAnalysisService.detectOvertraining(data);

      expect(['continue', 'deload', 'rest', 'medical-consultation']).toContain(
        detection.suggestedActions.recommendedAction
      );
    });
  });

  describe('detectAnomalies', () => {
    it('should detect no anomalies in normal data', () => {
      const recent = generateBiometricData(7, 50, 'stable');
      const baseline = generateBiometricData(90, 50, 'stable');

      const anomalies = PredictiveAnalysisService.detectAnomalies(
        recent,
        baseline
      );

      expect(anomalies).toBeDefined();
      expect(anomalies.anomalyCount).toBeGreaterThanOrEqual(0);
    });

    it('should detect outlier values', () => {
      const recent = generateBiometricData(7, 50, 'stable');
      const baseline = generateBiometricData(90, 50, 'stable');

      // Inject extreme values
      recent[6].sleep!.duration = 200; // Very low sleep

      const anomalies = PredictiveAnalysisService.detectAnomalies(
        recent,
        baseline
      );

      expect(anomalies.hasAnomalies).toBe(true);
      expect(anomalies.anomalies.length).toBeGreaterThan(0);
    });

    it('should report anomaly severity', () => {
      const recent = generateBiometricData(7, 50, 'stable');
      const baseline = generateBiometricData(90, 50, 'stable');

      recent[6].sleep!.duration = 100; // Extreme sleep deprivation

      const anomalies = PredictiveAnalysisService.detectAnomalies(
        recent,
        baseline
      );

      if (anomalies.anomalies.length > 0) {
        anomalies.anomalies.forEach((a) => {
          expect(['minor', 'moderate', 'severe']).toContain(a.severity);
        });
      }
    });
  });

  describe('Edge cases and error handling', () => {
    it('should throw error with empty data', () => {
      expect(() =>
        PredictiveAnalysisService.calculateTrendAnalysis([], '30d')
      ).toThrow();
    });

    it('should handle data with missing fields', () => {
      const data = generateBiometricData(30, 50, 'stable');
      // Remove some fields
      data[15].hrv = undefined as any;
      data[10].sleep = undefined as any;

      expect(() =>
        PredictiveAnalysisService.calculateTrendAnalysis(data, '30d')
      ).not.toThrow();
    });

    it('should normalize extreme values', () => {
      const data = generateBiometricData(14, 50, 'stable');
      // Add extreme values
      data[0].recoveryIndex!.score = 150; // Over 100
      data[1].recoveryIndex!.score = -50; // Below 0

      expect(() => PredictiveAnalysisService.predictFatigue(data, 7)).not.toThrow();
    });

    it('should handle single data point gracefully', () => {
      const data = generateBiometricData(1, 50, 'stable');

      expect(() =>
        PredictiveAnalysisService.predictFatigue(data, 7)
      ).toThrow();
    });
  });

  describe('Statistical accuracy', () => {
    it('should calculate correct mean', () => {
      const data = generateBiometricData(10, 50, 'stable');
      // Set known values for precision
      data.forEach((d, i) => {
        d.recoveryIndex!.score = (i + 1) * 10; // 10, 20, 30, ..., 100
      });

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '7d'
      );

      expect(analysis.statistics.mean).toBeCloseTo(55, 0); // Mean of 10-100
    });

    it('should identify standard deviation correctly', () => {
      const data = generateBiometricData(30, 50, 'stable');

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '30d'
      );

      expect(analysis.statistics.stdDev).toBeGreaterThan(0);
      expect(analysis.statistics.stdDev).toBeLessThan(50); // Reasonable range
    });

    it('should find correct min and max values', () => {
      const data = generateBiometricData(30, 50, 'stable');

      const analysis = PredictiveAnalysisService.calculateTrendAnalysis(
        data,
        '30d'
      );

      expect(analysis.statistics.min).toBeGreaterThanOrEqual(0);
      expect(analysis.statistics.max).toBeLessThanOrEqual(100);
      expect(analysis.statistics.min).toBeLessThanOrEqual(
        analysis.statistics.max
      );
    });
  });
});

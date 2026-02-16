/**
 * Advanced Analysis Service Tests
 */

import AdvancedAnalysisService from '../services/advancedAnalysisService';
import { DailyBiometrics } from '../models/BiometricData';

describe('AdvancedAnalysisService', () => {
  const generateBiometricData = (days: number, riskProfile: 'low' | 'moderate' | 'high' = 'low'): DailyBiometrics[] => {
    const data: DailyBiometrics[] = [];
    const startDate = new Date('2024-01-01');

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      let score = 70;
      let hrv = 55;
      let rhr = 60;

      if (riskProfile === 'high') {
        score = Math.max(20, 40 - i * 0.5);
        hrv = Math.max(20, 40 - i * 0.3);
        rhr = Math.min(85, 60 + i * 0.2);
      } else if (riskProfile === 'moderate') {
        score = 55 + Math.sin(i / 7) * 15;
        hrv = 45 + Math.sin(i / 7) * 10;
        rhr = 65 + Math.cos(i / 7) * 5;
      }

      data.push({
        userId: 'test-user',
        date: dateStr,
        hrv: [
          {
            timestamp: new Date(dateStr),
            value: hrv + Math.random() * 10,
            source: 'manual',
            quality: 'good',
          },
        ],
        restingHeartRate: [
          {
            timestamp: new Date(dateStr),
            value: rhr + Math.random() * 5,
            source: 'manual',
          },
        ],
        sleep: {
          duration: riskProfile === 'high' ? 300 + Math.random() * 60 : 420 + Math.random() * 120,
          quality: riskProfile === 'high' ? 'poor' : 'good',
          source: 'manual',
          date: dateStr,
          startTime: new Date(`${dateStr}T22:00:00Z`),
          endTime: new Date(`${dateStr}T06:00:00Z`),
        },
        activity: {
          date: dateStr,
          steps: 8000,
          distance: {
            value: 5,
            unit: 'km',
          },
          caloriesBurned: 2000,
          source: 'manual',
        },
        bodyMetrics: {
          timestamp: new Date(dateStr),
          weight: {
            value: 75,
            unit: 'kg',
            source: 'manual',
          },
          bodyFat: {
            value: 15,
            source: 'manual',
          },
        },
        recoveryIndex: {
          date: dateStr,
          score: Math.round(score),
          components: {
            hrv: 50 + Math.random() * 30,
            rhr: 50 + Math.random() * 30,
            sleepQuality: 50 + Math.random() * 30,
            stressLevel: 50 + Math.random() * 30,
          },
          recommendation: score > 50 ? 'push hard' : 'take it easy',
          readinessToTrain: score > 50 ? 'ready' : 'caution',
        },
        sources: new Set(['manual']),
        lastUpdated: new Date(),
        dataCompleteness: 90,
      });
    }

    return data;
  };

  describe('predictInjuryRisk', () => {
    it('should predict low injury risk with good recovery', () => {
      const data = generateBiometricData(30, 'low');
      const prediction = AdvancedAnalysisService.predictInjuryRisk(data);

      expect(prediction).toBeDefined();
      expect(prediction.injuryRisk).toBeLessThan(30);
      expect(prediction.riskLevel).toBe('low');
    });

    it('should predict high injury risk with poor recovery', () => {
      const data = generateBiometricData(30, 'high');
      const prediction = AdvancedAnalysisService.predictInjuryRisk(data);

      expect(prediction).toBeDefined();
      expect(prediction.injuryRisk).toBeGreaterThan(30);
      expect(['moderate', 'high', 'critical']).toContain(prediction.riskLevel);
    });

    it('should include area-specific risks', () => {
      const data = generateBiometricData(14, 'moderate');
      const prediction = AdvancedAnalysisService.predictInjuryRisk(data);

      expect(prediction.areaRisks).toBeDefined();
      expect(prediction.areaRisks.lowerBody).toBeGreaterThanOrEqual(0);
      expect(prediction.areaRisks.upperBody).toBeGreaterThanOrEqual(0);
      expect(prediction.areaRisks.core).toBeGreaterThanOrEqual(0);
      expect(prediction.areaRisks.cardiovascular).toBeGreaterThanOrEqual(0);
    });

    it('should identify injury types', () => {
      const data = generateBiometricData(30, 'high');
      const prediction = AdvancedAnalysisService.predictInjuryRisk(data);

      expect(prediction.injuryTypes).toBeDefined();
      expect(prediction.injuryTypes.length).toBeGreaterThan(0);
      prediction.injuryTypes.forEach((type) => {
        expect(['muscle-strain', 'joint-stress', 'overuse', 'stress-fracture', 'tendinitis']).toContain(type.type);
        expect(type.probability).toBeGreaterThan(0);
        expect(type.probability).toBeLessThanOrEqual(100);
      });
    });

    it('should include prevention recommendations', () => {
      const data = generateBiometricData(14, 'moderate');
      const prediction = AdvancedAnalysisService.predictInjuryRisk(data);

      expect(prediction.preventionRecommendations).toBeDefined();
      expect(prediction.preventionRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeTrainingLoad', () => {
    it('should analyze training load correctly', () => {
      const trainingData = Array(7)
        .fill(0)
        .map((_, i) => ({
          date: new Date(new Date().getTime() - (7 - i) * 86400000).toISOString().split('T')[0],
          volume: 100 + Math.random() * 50,
          intensity: 50 + Math.random() * 30,
        }));

      const biometrics = generateBiometricData(7);
      const analysis = AdvancedAnalysisService.analyzeTrainingLoad(trainingData, biometrics);

      expect(analysis).toBeDefined();
      expect(analysis.weeklyLoad).toBeDefined();
      expect(analysis.acuteToChronic).toBeDefined();
      expect(['undertraining', 'optimal', 'overtraining']).toContain(
        analysis.acuteToChronic.status
      );
    });

    it('should calculate training distribution', () => {
      const trainingData = Array(7)
        .fill(0)
        .map((_, i) => ({
          date: new Date(new Date().getTime() - (7 - i) * 86400000).toISOString().split('T')[0],
          volume: 100,
          intensity: 60,
        }));

      const biometrics = generateBiometricData(7);
      const analysis = AdvancedAnalysisService.analyzeTrainingLoad(trainingData, biometrics);

      expect(analysis.distribution).toBeDefined();
      expect(analysis.distribution.strength).toBeGreaterThanOrEqual(0);
      expect(analysis.distribution.cardio).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateTrainingRecommendations', () => {
    it('should generate training recommendations', () => {
      const biometrics = generateBiometricData(30, 'low');
      const injury = AdvancedAnalysisService.predictInjuryRisk(biometrics);
      const load = AdvancedAnalysisService.analyzeTrainingLoad([], biometrics);

      const recommendations = AdvancedAnalysisService.generateTrainingRecommendations(
        injury,
        load,
        biometrics
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.recommendedFocus).toBeDefined();
      expect(recommendations.suggestions).toBeDefined();
      expect(recommendations.weeklyPlan).toBeDefined();
      expect(recommendations.weeklyPlan.length).toBe(7);
    });

    it('should set performance targets', () => {
      const biometrics = generateBiometricData(30, 'low');
      const injury = AdvancedAnalysisService.predictInjuryRisk(biometrics);
      const load = AdvancedAnalysisService.analyzeTrainingLoad([], biometrics);

      const recommendations = AdvancedAnalysisService.generateTrainingRecommendations(
        injury,
        load,
        biometrics
      );

      expect(recommendations.targets).toBeDefined();
      expect(recommendations.targets.length).toBeGreaterThan(0);
    });
  });

  describe('createPeriodizationPlan', () => {
    it('should create 12-week periodization plan', () => {
      const today = new Date().toISOString().split('T')[0];
      const plan = AdvancedAnalysisService.createPeriodizationPlan(today, 12, 'strength');

      expect(plan).toBeDefined();
      expect(plan.totalWeeks).toBe(12);
      expect(plan.phases).toBeDefined();
      expect(plan.phases.length).toBeGreaterThan(0);
      expect(plan.milestones).toBeDefined();
    });

    it('should support different goals', () => {
      const today = new Date().toISOString().split('T')[0];
      const strengths = AdvancedAnalysisService.createPeriodizationPlan(today, 8, 'strength');
      const endurance = AdvancedAnalysisService.createPeriodizationPlan(today, 8, 'endurance');
      const power = AdvancedAnalysisService.createPeriodizationPlan(today, 8, 'power');

      expect(strengths).toBeDefined();
      expect(endurance).toBeDefined();
      expect(power).toBeDefined();
    });
  });

  describe('assessMovementQuality', () => {
    it('should assess movement quality', () => {
      const biometrics = generateBiometricData(30);
      const assessment = AdvancedAnalysisService.assessMovementQuality(biometrics);

      expect(assessment).toBeDefined();
      expect(assessment.qualityScore).toBeGreaterThanOrEqual(0);
      expect(assessment.qualityScore).toBeLessThanOrEqual(100);
      expect(assessment.patterns).toBeDefined();
      expect(assessment.flexibility).toBeDefined();
    });

    it('should identify main concerns', () => {
      const biometrics = generateBiometricData(30, 'high');
      const assessment = AdvancedAnalysisService.assessMovementQuality(biometrics);

      expect(assessment.mainConcerns).toBeDefined();
      expect(assessment.prioritizedCorrections).toBeDefined();
    });
  });

  describe('forecastPerformance', () => {
    it('should forecast 12-week performance', () => {
      const biometrics = generateBiometricData(30, 'low');
      const forecast = AdvancedAnalysisService.forecastPerformance(biometrics, undefined, 12);

      expect(forecast).toBeDefined();
      expect(forecast.evaluationPeriod).toBe(12);
      expect(forecast.currentBaseline).toBeDefined();
      expect(forecast.projections).toBeDefined();
      expect(forecast.plateauRisk).toBeDefined();
    });

    it('should require minimum data', () => {
      const biometrics = generateBiometricData(5);

      expect(() => AdvancedAnalysisService.forecastPerformance(biometrics, undefined, 12)).toThrow();
    });
  });

  describe('prescribeRecoveryProtocol', () => {
    it('should prescribe appropriate recovery protocol', () => {
      const biometrics = generateBiometricData(30, 'moderate');
      const injury = AdvancedAnalysisService.predictInjuryRisk(biometrics);
      const protocol = AdvancedAnalysisService.prescribeRecoveryProtocol(injury, biometrics);

      expect(protocol).toBeDefined();
      expect(['light', 'moderate', 'intensive', 'emergency']).toContain(protocol.recoveryNeeded);
      expect(protocol.modalities).toBeDefined();
      expect(protocol.timeline).toBeDefined();
      expect(protocol.monitoringMetrics).toBeDefined();
    });
  });

  describe('generateAdvancedDashboard', () => {
    it('should generate comprehensive dashboard', () => {
      const biometrics = generateBiometricData(30, 'low');
      const dashboard = AdvancedAnalysisService.generateAdvancedDashboard(
        'test-user',
        biometrics
      );

      expect(dashboard).toBeDefined();
      expect(dashboard.userId).toBe('test-user');
      expect(dashboard.currentStatus).toBeDefined();
      expect(dashboard.recommendations).toBeDefined();
      expect(dashboard.forecasts).toBeDefined();
      expect(dashboard.summary).toBeDefined();
      expect(['ready', 'caution', 'stop']).toContain(dashboard.summary.trainingStatus);
    });

    it('should include key warnings', () => {
      const biometrics = generateBiometricData(30, 'high');
      const dashboard = AdvancedAnalysisService.generateAdvancedDashboard(
        'test-user',
        biometrics
      );

      expect(dashboard.summary.keyWarnings).toBeDefined();
      if (dashboard.currentStatus.injuryRisk.riskLevel !== 'low') {
        expect(dashboard.summary.keyWarnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge cases', () => {
    it('should throw error with insufficient data for injury prediction', () => {
      const data = generateBiometricData(3);

      expect(() => AdvancedAnalysisService.predictInjuryRisk(data)).toThrow();
    });

    it('should handle empty training data', () => {
      expect(() => AdvancedAnalysisService.analyzeTrainingLoad([], generateBiometricData(7))).toThrow();
    });

    it('should require valid periodization weeks', () => {
      const today = new Date().toISOString().split('T')[0];

      expect(() => AdvancedAnalysisService.createPeriodizationPlan(today, 2)).toThrow();
    });
  });
});

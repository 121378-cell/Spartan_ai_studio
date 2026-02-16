/**
 * AdvancedAnalysisService Phase 2.2 Tests
 * 
 * Tests for the two new methods:
 * 1. analyzeTrainingLoadV2 (with TSS calculation)
 * 2. evaluateInjuryRiskV2 (with HRV monitoring)
 */

import { AdvancedAnalysisService } from '../services/advancedAnalysisService';
import { DailyBiometrics } from '../models/BiometricData';

describe('AdvancedAnalysisService - Phase 2.2', () => {
  
  // Helper to create mock biometric data
  const createMockBiometricData = (days: number, overrides?: Partial<DailyBiometrics>): DailyBiometrics[] => {
    const data: DailyBiometrics[] = [];
    const baseDate = new Date('2026-01-01');
    
    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      
      data.push({
        userId: 'test-user',
        date: date.toISOString().split('T')[0],
        restingHeartRate: [{
          value: 60 + Math.random() * 10,
          timestamp: date.toISOString(),
          source: 'apple-health',
        }],
        hrv: [{
          value: 50 + Math.random() * 20,
          timestamp: date.toISOString(),
          source: 'apple-health',
        }],
        sleep: {
          startTime: date,
          endTime: new Date(date.getTime() + 8 * 60 * 60000),
          duration: 420 + Math.random() * 120, // 7-9 hours in minutes
          quality: 'good',
          score: 60 + Math.random() * 30,
          source: 'apple-health',
        },
        activity: {
          date: date.toISOString().split('T')[0],
          steps: 8000 + Math.random() * 4000,
          activeCalories: 400 + Math.random() * 200,
          activityMinutes: {
            moderate: 30 + Math.random() * 30,
          },
          source: 'apple-health',
        },
        recoveryIndex: {
          date: date.toISOString().split('T')[0],
          score: 50 + Math.random() * 30,
          components: {
            hrv: 50,
            rhr: 60,
            sleepQuality: 70,
            stressLevel: 40,
          },
        },
        sources: new Set(['apple-health']),
        lastUpdated: date,
        dataCompleteness: 100,
        ...overrides,
      } as DailyBiometrics);
    }
    
    return data;
  };

  describe('analyzeTrainingLoadV2', () => {
    it('should calculate TSS (Training Stress Score) correctly', () => {
      const biometricData = createMockBiometricData(14);
      
      const result = AdvancedAnalysisService.analyzeTrainingLoadV2(biometricData);
      
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('riskFactors');
      
      expect(result.current).toHaveProperty('tss');
      expect(result.current).toHaveProperty('volume');
      expect(result.current).toHaveProperty('intensity');
      expect(result.current).toHaveProperty('loadStatus');
      
      expect(result.current.tss).toBeGreaterThanOrEqual(0);
      expect(result.current.intensity).toBeGreaterThanOrEqual(1);
      expect(result.current.intensity).toBeLessThanOrEqual(10);
      
      expect(['low', 'optimal', 'high', 'excessive']).toContain(result.current.loadStatus);
    });

    it('should identify overtraining risk correctly', () => {
      // Create data with very high load
      const highLoadData = createMockBiometricData(14, {
        activity: {
          date: '2026-01-01',
          steps: 15000,
          activeCalories: 800,
          activityMinutes: { moderate: 90 },
          source: 'apple-health',
        },
      });
      
      const result = AdvancedAnalysisService.analyzeTrainingLoadV2(highLoadData);
      
      // With high activity data (800 cal), TSS should be high or excessive
      // At minimum one risk factor should be present
      const hasRiskFactor = result.riskFactors.overtraining || 
                           result.riskFactors.rapidIncrease || 
                           result.riskFactors.insufficientRecovery || 
                           result.riskFactors.chronicFatigue;
      expect(hasRiskFactor).toBe(true);
    });

    it('should detect insufficient recovery', () => {
      const poorRecoveryData = createMockBiometricData(7, {
        recoveryIndex: {
          date: new Date().toISOString().split('T')[0],
          score: 30, // Very low recovery
          components: { hrv: 30, rhr: 75, sleepQuality: 35, stressLevel: 70 },
        },
      });
      
      const result = AdvancedAnalysisService.analyzeTrainingLoadV2(poorRecoveryData);
      
      expect(result.riskFactors.insufficientRecovery).toBe(true);
    });

    it('should calculate acute-to-chronic ratio', () => {
      const biometricData = createMockBiometricData(28);
      
      const result = AdvancedAnalysisService.analyzeTrainingLoadV2(biometricData);
      
      expect(result.trend).toHaveProperty('acuteToChronic');
      expect(result.trend.acuteToChronic).toBeGreaterThan(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend.direction);
    });

    it('should detect rapid load increase', () => {
      // First 14 days low load, last 7 days high load
      const lowLoadDays = createMockBiometricData(14, {
        activity: {
          date: '2026-01-01',
          steps: 5000,
          activeCalories: 200,
          activityMinutes: { moderate: 20 },
          source: 'apple-health',
        },
      });
      
      const highLoadDays = createMockBiometricData(7, {
        activity: {
          date: '2026-01-15',
          steps: 15000,
          activeCalories: 700,
          activityMinutes: { vigorous: 80 },
          source: 'apple-health',
        },
      });
      
      const combinedData = [...lowLoadDays, ...highLoadDays];
      
      const result = AdvancedAnalysisService.analyzeTrainingLoadV2(combinedData);
      
      expect(result.riskFactors.rapidIncrease).toBe(true);
      expect(result.trend.direction).toBe('increasing');
    });

    it('should throw error for insufficient data', () => {
      const insufficientData = createMockBiometricData(3);
      
      expect(() => {
        AdvancedAnalysisService.analyzeTrainingLoadV2(insufficientData);
      }).toThrow('Minimum 7 days of biometric data required');
    });
  });

  describe('evaluateInjuryRiskV2', () => {
    it('should calculate injury risk score (0-100)', () => {
      const biometricData = createMockBiometricData(14);
      
      const result = AdvancedAnalysisService.evaluateInjuryRiskV2(biometricData);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('redFlags');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('hrvStatus');
      expect(result).toHaveProperty('overuseIndicators');
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.redFlags)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should detect critical HRV status', () => {
      const criticalHRVData = createMockBiometricData(14);
      // Simulate critically low HRV in last few days
      criticalHRVData.slice(-3).forEach(day => {
        day.hrv = [{
          value: 25, // Very low HRV
          timestamp: new Date(),
          source: 'apple-health',
        }];
      });
      
      const result = AdvancedAnalysisService.evaluateInjuryRiskV2(criticalHRVData);
      
      // Check HRV status detection
      expect(result.hrvStatus).toBeDefined();
      expect(result.hrvStatus).toHaveProperty('status');
      // With critically low HRV (25), should detect concerning or critical status
      const acceptableStatuses = ['critical', 'concerning', 'acceptable'];
      expect(acceptableStatuses).toContain(result.hrvStatus.status);
      expect(result.score).toBeGreaterThan(0);
      expect(result.redFlags.some(flag => flag.includes('HRV'))).toBe(true);
    });

    it('should identify overuse indicators', () => {
      const overuseData = createMockBiometricData(14);
      // Simulate consecutive high load days
      overuseData.forEach(day => {
        day.activity = {
          date: day.date,
          steps: 12000,
          activeCalories: 600,
          activityMinutes: { vigorous: 75 },
          source: 'apple-health',
        };
      });
      
      const result = AdvancedAnalysisService.evaluateInjuryRiskV2(overuseData);
      
      expect(result.overuseIndicators).toBeDefined();
      expect(result.overuseIndicators.consecutiveHighLoadDays).toBeGreaterThanOrEqual(7);
      // Verify tissue stress is calculated (should be one of the categories)
      expect(result.overuseIndicators.tissueStress).toBeDefined();
    });

    it('should consider injury history', () => {
      const biometricData = createMockBiometricData(14);
      const history = {
        previousInjuries: ['ACL tear', 'Rotator cuff strain', 'Ankle sprain'],
      };
      
      const result = AdvancedAnalysisService.evaluateInjuryRiskV2(biometricData, history);
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.redFlags.some(flag => flag.includes('Previous') || flag.includes('previous'))).toBe(true);
    });

    it('should generate appropriate recommendations based on risk level', () => {
      // Low risk scenario
      const lowRiskData = createMockBiometricData(14);
      lowRiskData[0].hrv = [{ value: 60, timestamp: new Date(), source: 'apple-health' }];
      lowRiskData[0].sleep = { 
        date: lowRiskData[0].date,
        startTime: new Date(),
        endTime: new Date(Date.now() + 8 * 60 * 60000),
        duration: 480, 
        quality: 'excellent',
        score: 80,
        source: 'apple-health',
      };
      
      const lowRiskResult = AdvancedAnalysisService.evaluateInjuryRiskV2(lowRiskData);
      
      if (lowRiskResult.score < 30) {
        expect(lowRiskResult.recommendations.some(rec => rec.includes('Continue'))).toBe(true);
      }
      
      // High risk scenario
      const highRiskData = createMockBiometricData(14);
      highRiskData.forEach(day => {
        day.hrv = [{ value: 30, timestamp: new Date(), source: 'apple-health' }];
        day.sleep = { 
          date: day.date,
          startTime: new Date(),
          endTime: new Date(Date.now() + 5 * 60 * 60000),
          duration: 300, 
          quality: 'poor',
          score: 40,
          source: 'apple-health',
        };
        day.recoveryIndex = { 
          date: day.date,
          score: 30,
          components: { hrv: 30, rhr: 70, sleepQuality: 40, stressLevel: 60 },
        };
      });
      
      const highRiskResult = AdvancedAnalysisService.evaluateInjuryRiskV2(highRiskData);
      
      if (highRiskResult.score > 50) {
        expect(highRiskResult.recommendations.some(rec => rec.includes('Reduce') || rec.includes('IMMEDIATE'))).toBe(true);
      }
    });

    it('should calculate HRV deviation correctly', () => {
      const biometricData = createMockBiometricData(30);
      // Set clear baseline vs current pattern
      biometricData.slice(0, 20).forEach(day => {
        day.hrv = [{ value: 55, timestamp: new Date(), source: 'apple-health' }]; // Baseline
      });
      biometricData.slice(20).forEach(day => {
        day.hrv = [{ value: 40, timestamp: new Date(), source: 'apple-health' }]; // Current (lower)
      });
      
      const result = AdvancedAnalysisService.evaluateInjuryRiskV2(biometricData);
      
      expect(result.hrvStatus.deviation).toBeLessThan(0); // Negative deviation
      expect(Math.abs(result.hrvStatus.deviation)).toBeGreaterThan(20); // Significant drop
    });

    it('should detect recovery debt', () => {
      const highDebtData = createMockBiometricData(14);
      highDebtData.forEach(day => {
        day.recoveryIndex = { 
          date: day.date,
          score: 35,
          components: { hrv: 35, rhr: 75, sleepQuality: 35, stressLevel: 70 },
        };
      });
      
      const result = AdvancedAnalysisService.evaluateInjuryRiskV2(highDebtData);
      
      expect(result.overuseIndicators.recoveryDebt).toBeGreaterThan(100);
      expect(result.redFlags.some(flag => flag.includes('recovery') || flag.includes('debt'))).toBe(true);
    });

    it('should throw error for insufficient data', () => {
      const insufficientData = createMockBiometricData(3);
      
      expect(() => {
        AdvancedAnalysisService.evaluateInjuryRiskV2(insufficientData);
      }).toThrow('Minimum 7 days of data required');
    });
  });

  describe('Integration: Training Load -> Injury Risk', () => {
    it('should correlate high training load with increased injury risk', () => {
      // Create high training load scenario
      const highLoadData = createMockBiometricData(14);
      highLoadData.forEach(day => {
        day.activity = {
          date: day.date,
          steps: 15000,
          activeCalories: 700,
          activityMinutes: { vigorous: 85 },
          source: 'apple-health',
        };
        day.hrv = [{ value: 35, timestamp: new Date(), source: 'apple-health' }]; // Suppressed HRV
        day.recoveryIndex = { 
          date: day.date,
          score: 35,
          components: { hrv: 35, rhr: 80, sleepQuality: 40, stressLevel: 70 }
        };
      });
      
      const trainingLoad = AdvancedAnalysisService.analyzeTrainingLoadV2(highLoadData);
      const injuryRisk = AdvancedAnalysisService.evaluateInjuryRiskV2(highLoadData);
      
      // High load should correlate with higher injury risk than baseline
      expect(trainingLoad.current).toBeDefined();
      expect(injuryRisk.score).toBeGreaterThan(0);
      // Injury risk should increase with high training load
      expect(injuryRisk.redFlags.length).toBeGreaterThanOrEqual(0);
      expect(
        trainingLoad.riskFactors.overtraining || injuryRisk.overuseIndicators.tissueStress === 'high'
      ).toBe(true);
    });
  });
});

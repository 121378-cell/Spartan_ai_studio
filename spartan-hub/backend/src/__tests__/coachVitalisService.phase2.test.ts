/**
 * CoachVitalisService Phase 2.1 Tests
 * 
 * Tests for the three new methods:
 * 1. evaluateDailyComprehensive
 * 2. decidePlanAdjustments  
 * 3. executeAutoApproval
 */

import { getCoachVitalisService } from '../services/coachVitalisService';
import { initializeDatabase } from '../config/database';
import Database from 'better-sqlite3';

describe('CoachVitalisService - Phase 2.1', () => {
  let service: ReturnType<typeof getCoachVitalisService>;

  beforeEach(async () => {
    // Initialize database for tests
    initializeDatabase();
    service = getCoachVitalisService();
    await service.initialize();
  });

  describe('evaluateDailyComprehensive', () => {
    it('should calculate readiness score based on bio state', async () => {
      const userId = 'test-user-1';
      const aggregatedData = {
        hrv: 45,
        hrvBaseline: 50,
        hrvPercentile: 60,
        rhr: 62,
        rhrBaseline: 60,
        stressLevel: 45,
        trainingLoad: 70,
        sleepDuration: 7.5,
        motivation: 8
      };

      const result = await service.evaluateDailyComprehensive(userId, aggregatedData);

      expect(result).toHaveProperty('readinessScore');
      expect(result.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.readinessScore).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('recoveryNeeds');
      expect(result).toHaveProperty('preliminaryRecommendations');
      expect(Array.isArray(result.recoveryNeeds)).toBe(true);
      expect(Array.isArray(result.preliminaryRecommendations)).toBe(true);
    });

    it('should identify recovery needs for low readiness', async () => {
      const userId = 'test-user-2';
      const aggregatedData = {
        hrv: 30,
        hrvBaseline: 50,
        hrvPercentile: 30,
        rhr: 70,
        rhrBaseline: 60,
        stressLevel: 80,
        trainingLoad: 90,
        sleepDuration: 5,
        motivation: 4
      };

      const result = await service.evaluateDailyComprehensive(userId, aggregatedData);

      // Should have recovery needs for low HRV and high stress
      expect(result.recoveryNeeds.length).toBeGreaterThan(0);
      expect(result.readinessScore).toBeLessThan(60);
    });

    it('should generate recommendations based on bio state', async () => {
      const userId = 'test-user-3';
      const aggregatedData = {
        hrv: 55,
        hrvBaseline: 50,
        hrvPercentile: 70,
        rhr: 58,
        rhrBaseline: 60,
        stressLevel: 30,
        trainingLoad: 65,
        sleepDuration: 8,
        motivation: 9
      };

      const result = await service.evaluateDailyComprehensive(userId, aggregatedData);

      expect(result.preliminaryRecommendations.length).toBeGreaterThan(0);
      // Should recommend optimal training for high readiness
      const hasOptimalRecommendation = result.preliminaryRecommendations.some(
        rec => rec.toLowerCase().includes('optimal') || rec.toLowerCase().includes('proceed')
      );
      expect(hasOptimalRecommendation).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const userId = '';
      const aggregatedData = {};

      await expect(service.evaluateDailyComprehensive(userId, aggregatedData))
        .rejects.toThrow();
    });
  });

  describe('decidePlanAdjustments', () => {
    it('should generate modifications based on readiness', async () => {
      const userId = 'test-user-1';
      const analysis = {
        readiness: 35,
        trainingLoad: {
          current: 85,
          trend: 'stable',
          riskFactors: { excessiveVolume: true }
        },
        injuryRisk: {
          score: 65,
          redFlags: ['elevated_rhr', 'low_hrv'],
          recommendations: ['Reduce volume by 20%']
        }
      };

      const result = await service.decidePlanAdjustments(userId, analysis);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Each modification should have required properties
      result.forEach(mod => {
        expect(mod).toHaveProperty('type');
        expect(mod).toHaveProperty('modification');
        expect(mod).toHaveProperty('reason');
        expect(mod).toHaveProperty('confidence');
        expect(mod.confidence).toBeGreaterThanOrEqual(0);
        expect(mod.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should reduce intensity for low readiness', async () => {
      const userId = 'test-user-2';
      const analysis = {
        readiness: 30,
        trainingLoad: { current: 80, trend: 'increasing', riskFactors: {} },
        injuryRisk: { score: 40, redFlags: [], recommendations: [] }
      };

      const result = await service.decidePlanAdjustments(userId, analysis);

      const intensityMod = result.find(m => m.type === 'training_intensity');
      expect(intensityMod).toBeDefined();
      expect(intensityMod?.modification.toLowerCase()).toContain('reduce');
      expect(intensityMod?.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should increase intensity for high readiness', async () => {
      const userId = 'test-user-3';
      const analysis = {
        readiness: 85,
        trainingLoad: { current: 60, trend: 'stable', riskFactors: {} },
        injuryRisk: { score: 20, redFlags: [], recommendations: [] }
      };

      const result = await service.decidePlanAdjustments(userId, analysis);

      const intensityMod = result.find(m => m.type === 'training_intensity');
      expect(intensityMod).toBeDefined();
      expect(intensityMod?.modification.toLowerCase()).toContain('increase');
    });

    it('should add injury prevention for high injury risk', async () => {
      const userId = 'test-user-4';
      const analysis = {
        readiness: 50,
        trainingLoad: { current: 75, trend: 'stable', riskFactors: {} },
        injuryRisk: {
          score: 75,
          redFlags: ['fatigue', 'poor_recovery'],
          recommendations: ['Focus on mobility', 'Reduce impact exercises']
        }
      };

      const result = await service.decidePlanAdjustments(userId, analysis);

      const preventiveMods = result.filter(m => 
        m.type === 'preventive_measure' || m.type === 'recovery_focus'
      );
      expect(preventiveMods.length).toBeGreaterThan(0);
      expect(preventiveMods[0].confidence).toBeGreaterThanOrEqual(80);
    });
  });

  describe('executeAutoApproval', () => {
    it('should auto-approve small intensity changes (≤10%)', async () => {
      const modifications = [
        {
          type: 'training_intensity',
          modification: 'Reduce intensity by 10%',
          reason: 'Low readiness',
          confidence: 85
        },
        {
          type: 'training_intensity',
          modification: 'Reduce intensity by 5%',
          reason: 'Moderate fatigue',
          confidence: 80
        }
      ];
      const autonomyRules = {
        autoApproveIntensityChangesBelowPercent: 10,
        requireApprovalForMajorChanges: true
      };

      const result = await service.executeAutoApproval(modifications, autonomyRules);

      expect(result.approved.length).toBe(2);
      expect(result.pendingReview.length).toBe(0);
      expect(result.approved[0].reason).toContain('Auto-approved');
    });

    it('should require approval for large intensity changes (>10%)', async () => {
      const modifications = [
        {
          type: 'training_intensity',
          modification: 'Reduce intensity by 50%',
          reason: 'Very low readiness',
          confidence: 90
        }
      ];
      const autonomyRules = {
        autoApproveIntensityChangesBelowPercent: 10,
        requireApprovalForMajorChanges: true
      };

      const result = await service.executeAutoApproval(modifications, autonomyRules);

      expect(result.approved.length).toBe(0);
      expect(result.pendingReview.length).toBe(1);
    });

    it('should auto-approve preventive measures', async () => {
      const modifications = [
        {
          type: 'preventive_measure',
          modification: 'Add mobility work',
          reason: 'Injury prevention',
          confidence: 85
        },
        {
          type: 'recovery_focus',
          modification: 'Extra stretching',
          reason: 'Recovery optimization',
          confidence: 80
        }
      ];
      const autonomyRules = {};

      const result = await service.executeAutoApproval(modifications, autonomyRules);

      expect(result.approved.length).toBe(2);
      expect(result.pendingReview.length).toBe(0);
    });

    it('should respect requireApprovalForMajorChanges setting', async () => {
      const modifications = [
        {
          type: 'training_intensity',
          modification: 'Reduce intensity by 50%',
          reason: 'Critical state',
          confidence: 95
        }
      ];
      const autonomyRules = {
        requireApprovalForMajorChanges: false
      };

      const result = await service.executeAutoApproval(modifications, autonomyRules);

      // With requireApprovalForMajorChanges: false, high confidence changes auto-approve
      expect(result.approved.length).toBe(1);
      expect(result.pendingReview.length).toBe(0);
    });

    it('should handle empty modifications array', async () => {
      const modifications: any[] = [];
      const autonomyRules = {};

      const result = await service.executeAutoApproval(modifications, autonomyRules);

      expect(result.approved.length).toBe(0);
      expect(result.pendingReview.length).toBe(0);
    });

    it('should use default threshold of 10% when not specified', async () => {
      const modifications = [
        {
          type: 'training_intensity',
          modification: 'Reduce intensity by 8%',
          reason: 'Slight fatigue',
          confidence: 75
        }
      ];
      const autonomyRules = {}; // No threshold specified

      const result = await service.executeAutoApproval(modifications, autonomyRules);

      expect(result.approved.length).toBe(1);
    });
  });

  describe('Integration Flow', () => {
    it('should complete full Phase 2.1 workflow', async () => {
      const userId = 'integration-test-user';
      
      // Step 1: Evaluate comprehensive daily data
      const aggregatedData = {
        hrv: 35,
        hrvBaseline: 50,
        hrvPercentile: 40,
        rhr: 68,
        rhrBaseline: 60,
        stressLevel: 75,
        trainingLoad: 85,
        sleepDuration: 6,
        motivation: 5
      };
      
      const evaluation = await service.evaluateDailyComprehensive(userId, aggregatedData);
      expect(evaluation.readinessScore).toBeLessThan(60);
      expect(evaluation.recoveryNeeds.length).toBeGreaterThan(0);
      
      // Step 2: Decide plan adjustments
      const analysis = {
        readiness: evaluation.readinessScore,
        trainingLoad: {
          current: aggregatedData.trainingLoad,
          trend: 'increasing',
          riskFactors: { excessiveVolume: true }
        },
        injuryRisk: {
          score: 70,
          redFlags: ['low_hrv', 'poor_sleep'],
          recommendations: evaluation.preliminaryRecommendations
        }
      };
      
      const adjustments = await service.decidePlanAdjustments(userId, analysis);
      expect(adjustments.length).toBeGreaterThan(0);
      
      // Step 3: Execute auto-approval
      const autonomyRules = {
        autoApproveIntensityChangesBelowPercent: 15,
        requireApprovalForMajorChanges: true
      };
      
      const approval = await service.executeAutoApproval(adjustments, autonomyRules);
      
      // Verify the flow completed
      expect(approval.approved.length + approval.pendingReview.length).toBe(adjustments.length);
    });
  });
});

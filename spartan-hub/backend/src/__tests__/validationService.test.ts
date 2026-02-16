/**
 * Test suite for validation service
 */

import { ValidationService, ValidationError } from '../services/validationService';

describe('ValidationService', () => {
  describe('validateUserProfile', () => {
    it('should validate a correct user profile', () => {
      const validProfile = {
        name: 'John Doe',
        email: 'john@example.com',
        quest: 'Become stronger',
        stats: {
          totalWorkouts: 10,
          currentStreak: 5,
          joinDate: '2023-01-01T00:00:00.000Z'
        },
        trials: [],
        onboardingCompleted: true,
        keystoneHabits: [],
        reflections: [],
        journal: [],
        masterRegulationSettings: {
          targetBedtime: '22:00'
        },
        nutritionSettings: {
          priority: 'performance' as const,
          calorieGoal: 2500,
          proteinGoal: 150
        },
        milestones: [],
        isInAutonomyPhase: false
      };

      expect(() => {
        ValidationService.validateUserProfile(validProfile);
      }).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidProfile = {
        name: 'John Doe',
        email: 'invalid-email',
        quest: 'Become stronger',
        stats: {
          totalWorkouts: 10,
          currentStreak: 5,
          joinDate: '2023-01-01T00:00:00.000Z'
        },
        trials: [],
        onboardingCompleted: true,
        keystoneHabits: [],
        reflections: [],
        journal: [],
        masterRegulationSettings: {
          targetBedtime: '22:00'
        },
        nutritionSettings: {
          priority: 'performance',
          calorieGoal: 2500,
          proteinGoal: 150
        },
        milestones: [],
        isInAutonomyPhase: false
      };

      expect(() => {
        ValidationService.validateUserProfile(invalidProfile);
      }).toThrow(ValidationError);
    });
  });

  describe('validateEvaluationFormData', () => {
    it('should validate correct evaluation form data', () => {
      const validData = {
        physicalGoals: 'Gain muscle',
        mentalGoals: 'Improve focus',
        experienceLevel: 'intermediate' as const,
        weightKg: 75,
        energyLevel: 7,
        stressLevel: 5,
        focusLevel: 8,
        equipment: 'Dumbbells, barbell',
        daysPerWeek: 4,
        timePerSession: 60,
        history: 'I have been working out for 2 years',
        lifestyle: 'Active job, good sleep',
        painPoint: 'Lower back pain',
        communicationTone: 'motivator' as const,
        nutritionPriority: 'performance' as const
      };

      expect(() => {
        ValidationService.validateEvaluationFormData(validData);
      }).not.toThrow();
    });

    it('should reject invalid experience level', () => {
      const invalidData = {
        physicalGoals: 'Gain muscle',
        mentalGoals: 'Improve focus',
        experienceLevel: 'expert' as const, // Invalid experience level
        weightKg: 75,
        energyLevel: 7,
        stressLevel: 5,
        focusLevel: 8,
        equipment: 'Dumbbells, barbell',
        daysPerWeek: 4,
        timePerSession: 60,
        history: 'I have been working out for 2 years',
        lifestyle: 'Active job, good sleep',
        painPoint: 'Lower back pain',
        communicationTone: 'motivator' as const,
        nutritionPriority: 'performance' as const
      };

      expect(() => {
        ValidationService.validateEvaluationFormData(invalidData);
      }).toThrow(ValidationError);
    });
  });

  describe('validateRoutine', () => {
    it('should validate correct routine data', () => {
      const validRoutine = {
        id: 'routine-1',
        name: 'Upper Body Strength',
        focus: 'Strength',
        duration: 60,
        blocks: [
          {
            name: 'Warm-up',
            exercises: [
              {
                name: 'Arm Circles',
                sets: 2,
                reps: '10 each direction'
              }
            ]
          }
        ]
      };

      expect(() => {
        ValidationService.validateRoutine(validRoutine);
      }).not.toThrow();
    });

    it('should reject routine with negative duration', () => {
      const invalidRoutine = {
        id: 'routine-1',
        name: 'Upper Body Strength',
        focus: 'Strength',
        duration: -60, // Invalid negative duration
        blocks: [
          {
            name: 'Warm-up',
            exercises: [
              {
                name: 'Arm Circles',
                sets: 2,
                reps: '10 each direction'
              }
            ]
          }
        ]
      };

      expect(() => {
        ValidationService.validateRoutine(invalidRoutine);
      }).toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize potentially dangerous input', () => {
      const dangerousInput = '<script>alert("xss")</script>';
      const sanitized = ValidationService.sanitizeInput(dangerousInput);
      
      expect(sanitized).toBe('');
    });

    it('should not modify safe input', () => {
      const safeInput = 'Hello World!';
      const sanitized = ValidationService.sanitizeInput(safeInput);
      
      expect(sanitized).toBe(safeInput);
    });
  });
});

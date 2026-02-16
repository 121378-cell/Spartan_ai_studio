/**
 * Test suite for validation middleware
 */

import express from 'express';
import request from 'supertest';
import { validateUserProfile, validateEvaluationForm } from '../middleware/validationMiddleware';

// Create a test Express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test route for user profile validation
  app.post('/profile', validateUserProfile, (req, res) => {
    res.status(200).json({ success: true, message: 'Profile is valid' });
  });
  
  // Test route for evaluation form validation
  app.post('/evaluation', validateEvaluationForm, (req, res) => {
    res.status(200).json({ success: true, message: 'Evaluation form is valid' });
  });
  
  return app;
};

describe('Validation Middleware', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  describe('validateUserProfile', () => {
    it('should accept valid user profile data', async () => {
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
          priority: 'performance',
          calorieGoal: 2500,
          proteinGoal: 150
        },
        milestones: [],
        isInAutonomyPhase: false
      };
      
      const response = await request(app)
        .post('/profile')
        .send(validProfile)
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile is valid');
    });
    
    it('should reject invalid user profile data', async () => {
      const invalidProfile = {
        name: 'John Doe',
        email: 'invalid-email', // Invalid email
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
      
      const response = await request(app)
        .post('/profile')
        .send(invalidProfile)
        .expect(400);
        
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('Valid email is required');
    });
  });
  
  describe('validateEvaluationForm', () => {
    it('should accept valid evaluation form data', async () => {
      const validData = {
        physicalGoals: 'Gain muscle',
        mentalGoals: 'Improve focus',
        experienceLevel: 'intermediate',
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
        communicationTone: 'motivator',
        nutritionPriority: 'performance'
      };
      
      const response = await request(app)
        .post('/evaluation')
        .send(validData)
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Evaluation form is valid');
    });
    
    it('should reject invalid evaluation form data', async () => {
      const invalidData = {
        physicalGoals: 'Gain muscle',
        mentalGoals: 'Improve focus',
        experienceLevel: 'expert', // Invalid experience level
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
        communicationTone: 'motivator',
        nutritionPriority: 'performance'
      };
      
      const response = await request(app)
        .post('/evaluation')
        .send(invalidData)
        .expect(400);
        
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});

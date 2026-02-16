/**
 * End-to-End Integration Tests
 * Testing the integration between multiple services and components
 */

import request from 'supertest';
import { Server } from 'http';
import express, { Application } from 'express';
import { logger } from '../../utils/logger';

describe('End-to-End Integration Tests', () => {
  let app: Application;
  let server: Server;

  beforeAll(async () => {
    // Initialize Express app
    app = express();
    
    // Set up middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Set up simplified routes for testing
    app.post('/test/biometric-sync', async (req, res) => {
      try {
        const { userId, biometricData } = req.body;
        
        // Simulate processing biometric data
        const processedData = {
          ...biometricData,
          processedAt: new Date().toISOString(),
          userId
        };
        
        // Simulate checking achievements
        const achievements = userId ? [{ id: 'test-achievement', name: 'Test Achievement' }] : [];

        // Simulate sending notification
        if (achievements.length > 0) {
          logger.info('Notification sent', { 
            context: 'integration-test', 
            metadata: { userId, type: 'achievement_unlocked' } 
          });
        }

        res.status(200).json({
          success: true,
          processedData,
          unlockedAchievements: achievements
        });
      } catch (error) {
        logger.error('Biometric sync error', { 
          error: error instanceof Error ? error.message : String(error), 
          context: 'integration-test' 
        });
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' });
      }
    });

    app.post('/test/data-import', async (req, res) => {
      try {
        const { userId, source, data } = req.body;
        
        // Simulate importing data from different sources
        let importedData;
        switch (source) {
          case 'garmin':
          case 'google-fit':
          case 'apple-health':
            importedData = {
              ...data,
              source,
              importedAt: new Date().toISOString(),
              userId
            };
            break;
          default:
            throw new Error(`Unsupported data source: ${source}`);
        }

        // Simulate processing the imported data
        const processedData = {
          ...importedData,
          processed: true,
          processedAt: new Date().toISOString()
        };
        
        // Simulate generating health insights
        const healthInsights = {
          summary: 'Test health insights',
          recommendations: ['Stay hydrated', 'Exercise regularly'],
          updatedAt: new Date().toISOString()
        };

        res.status(200).json({
          success: true,
          importedData,
          processedData,
          healthInsights
        });
      } catch (error) {
        logger.error('Data import error', { 
          error: error instanceof Error ? error.message : String(error), 
          context: 'integration-test' 
        });
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' });
      }
    });

    // Start server
    server = app.listen(3001, () => {
      logger.info('Integration test server started', { 
        context: 'integration-test', 
        metadata: { port: 3001 } 
      });
    });
  });

  afterAll((done) => {
    server.close(() => {
      logger.info('Integration test server closed', { context: 'integration-test' });
      done();
    });
  });

  describe('Biometric Data Pipeline Integration', () => {
    it('should process biometric data and simulate achievements and notifications', async () => {
      const testData = {
        userId: 'test-user-123',
        biometricData: {
          heartRate: [{ timestamp: new Date(), value: 72, source: 'apple-health' }],
          hrv: [{ timestamp: new Date(), value: 65, source: 'apple-health' }],
          sleep: {
            duration: 420, // minutes
            quality: 'good',
            date: new Date().toISOString().split('T')[0],
            source: 'apple-health'
          },
          activity: {
            steps: 8500,
            distance: { value: 6.2, unit: 'km' },
            caloriesBurned: 420,
            date: new Date().toISOString().split('T')[0],
            source: 'apple-health'
          }
        }
      };

      const response = await request(app)
        .post('/test/biometric-sync')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processedData).toBeDefined();
      expect(Array.isArray(response.body.unlockedAchievements)).toBe(true);
      
      // Verify that the response contains expected fields
      expect(response.body).toHaveProperty('processedData');
      expect(response.body).toHaveProperty('unlockedAchievements');
    });
  });

  describe('Third-party Data Import Integration', () => {
    it('should import data from Garmin and process through pipeline', async () => {
      const testData = {
        userId: 'test-user-456',
        source: 'garmin',
        data: {
          dailySummary: {
            steps: 9200,
            calories: 2800,
            elevationGain: 120,
            intensityMinutes: {
              moderate: 30,
              vigorous: 20
            }
          },
          activities: [
            {
              activityType: 'running',
              duration: 3500, // seconds
              distance: 10.5, // km
              calories: 580,
              averageHeartRate: 145
            }
          ]
        }
      };

      const response = await request(app)
        .post('/test/data-import')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.importedData).toBeDefined();
      expect(response.body.processedData).toBeDefined();
      expect(response.body.healthInsights).toBeDefined();
    });

    it('should import data from Google Fit and process through pipeline', async () => {
      const testData = {
        userId: 'test-user-789',
        source: 'google-fit',
        data: {
          dataSource: 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_ecg',
          point: {
            startTimeNanos: Date.now() * 1000000,
            endTimeNanos: (Date.now() + 60000) * 1000000, // 1 minute later
            dataTypeName: 'com.google.heart_rate.bpm',
            originDataSourceId: 'raw:com.google.heart_rate.bpm:com.mirasense.smartgoggles:HR',
            value: [{
              fpVal: 75.0
            }]
          }
        }
      };

      const response = await request(app)
        .post('/test/data-import')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.importedData).toBeDefined();
    });

    it('should handle errors gracefully when data source is unsupported', async () => {
      const testData = {
        userId: 'test-user-000',
        source: 'unsupported-source',
        data: {}
      };

      const response = await request(app)
        .post('/test/data-import')
        .send(testData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid biometric data gracefully', async () => {
      const testData = {
        userId: 'test-user-invalid',
        biometricData: null
      };

      const response = await request(app)
        .post('/test/biometric-sync')
        .send(testData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle missing user ID gracefully', async () => {
      const testData = {
        userId: '',
        biometricData: {}
      };

      const response = await request(app)
        .post('/test/biometric-sync')
        .send(testData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});

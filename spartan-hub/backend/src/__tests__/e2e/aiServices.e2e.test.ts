import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('AI Services Integration Tests', () => {
    let app: any;
    let db: DatabaseType;
    let authToken: string;

    const testUser = {
        id: 'integration-ai-user-1',
        name: 'AI Integration Test User',
        email: 'ai-integration@test.com',
        password: 'aiTestPassword123!'
    };

    beforeAll(async () => {
        // Setup environment
        process.env.DB_PATH = e2eManager.getDbPath();
        
        // Import server
        const serverModule = await import('../../server');
        app = serverModule.app;

        // Setup database
        await e2eManager.cleanDatabase();
        await e2eManager.seedUser({
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            password: testUser.password
        });
        
        await e2eManager.seedSession({
            id: 'integration-ai-session-1',
            userId: testUser.id,
            token: 'ai-integration-token-123'
        });

        db = new Database(e2eManager.getDbPath());
        authToken = 'ai-integration-token-123';

        // Create necessary tables for testing
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_workouts (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                scheduledDate TEXT,
                completed BOOLEAN DEFAULT FALSE,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS user_metrics (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                date TEXT NOT NULL,
                readinessScore REAL,
                recoveryScore REAL,
                injuryRisk REAL,
                fatigueLevel REAL,
                sleepHours REAL,
                stressLevel REAL,
                activityLoad REAL,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )
        `);
    });

    afterAll(() => {
        if (db) db.close();
    });

    describe('AI Workout Planning Integration', () => {
        test('POST /api/ai/workout-plan should generate personalized workout', async () => {
            const workoutRequest = {
                goal: 'strength',
                experienceLevel: 'intermediate',
                availableEquipment: ['barbell', 'dumbbells', 'bench'],
                availableTime: 60,
                focusAreas: ['upper_body', 'core'],
                lastWorkoutDate: '2026-01-28'
            };

            const response = await request(app)
                .post('/api/ai/workout-plan')
                .set('Authorization', `Bearer ${authToken}`)
                .send(workoutRequest)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.plan).toBeDefined();
            expect(Array.isArray(response.body.data.plan.exercises)).toBe(true);
            expect(response.body.data.plan.durationMinutes).toBeGreaterThan(0);
            expect(response.body.data.plan.intensityLevel).toBeDefined();
        });

        test('POST /api/ai/workout-plan should handle different goals', async () => {
            const goals = ['endurance', 'hypertrophy', 'strength', 'recovery'];
            
            for (const goal of goals) {
                const response = await request(app)
                    .post('/api/ai/workout-plan')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        goal: goal,
                        experienceLevel: 'beginner',
                        availableTime: 45
                    })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.plan.goal).toBe(goal);
            }
        });

        test('POST /api/ai/workout-plan should validate input parameters', async () => {
            const invalidRequest = {
                goal: 'invalid-goal', // Invalid goal
                experienceLevel: 'master', // Invalid experience level
                availableTime: -30 // Invalid time
            };

            const response = await request(app)
                .post('/api/ai/workout-plan')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidRequest)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('validation');
        });

        test('POST /api/ai/workout-plan should consider user history', async () => {
            // First, create some workout history
            const stmt = db.prepare(`
                INSERT INTO user_workouts (id, userId, title, completed, createdAt)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                'history-1',
                testUser.id,
                'Previous Chest Workout',
                true,
                '2026-01-25T10:00:00Z'
            );
            
            stmt.run(
                'history-2',
                testUser.id,
                'Previous Leg Workout',
                true,
                '2026-01-26T10:00:00Z'
            );

            const response = await request(app)
                .post('/api/ai/workout-plan')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    goal: 'strength',
                    experienceLevel: 'intermediate',
                    availableTime: 60,
                    avoidMuscleGroups: ['chest'] // Should avoid chest due to recent workout
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            // Verify that chest exercises are minimized or avoided
            const chestExercises = response.body.data.plan.exercises.filter(
                (ex: any) => ex.primaryMuscleGroup === 'chest'
            );
            expect(chestExercises.length).toBeLessThan(3); // Should have few chest exercises
        });
    });

    describe('AI Biometric Analysis Integration', () => {
        beforeEach(() => {
            // Seed biometric data
            const stmt = db.prepare(`
                INSERT INTO user_metrics (
                    id, userId, date, readinessScore, recoveryScore, 
                    injuryRisk, fatigueLevel, sleepHours, stressLevel, activityLoad
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const dates = ['2026-01-20', '2026-01-21', '2026-01-22', '2026-01-23', '2026-01-24'];
            
            dates.forEach((date, index) => {
                stmt.run(
                    `metric-${index}`,
                    testUser.id,
                    date,
                    60 + (index * 5), // Increasing readiness
                    55 + (index * 4), // Increasing recovery
                    25 - (index * 3), // Decreasing injury risk
                    65 - (index * 8), // Decreasing fatigue
                    6.5 + (index * 0.5), // Increasing sleep
                    50 - (index * 5), // Decreasing stress
                    80 + (index * 10) // Increasing activity load
                );
            });
        });

        test('GET /api/ai/biometric-analysis should provide comprehensive analysis', async () => {
            const response = await request(app)
                .get('/api/ai/biometric-analysis')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.trends).toBeDefined();
            expect(response.body.data.recommendations).toBeDefined();
            expect(response.body.data.riskAssessment).toBeDefined();
            expect(response.body.data.currentStatus).toBeDefined();
        });

        test('GET /api/ai/biometric-analysis should show improving trends', async () => {
            const response = await request(app)
                .get('/api/ai/biometric-analysis')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const trends = response.body.data.trends;
            
            // Verify positive trends based on seeded data
            expect(trends.readiness.scoreChange).toBeGreaterThan(0);
            expect(trends.recovery.scoreChange).toBeGreaterThan(0);
            expect(trends.injuryRisk.scoreChange).toBeLessThan(0); // Should be decreasing
            expect(trends.fatigue.scoreChange).toBeLessThan(0); // Should be decreasing
        });

        test('GET /api/ai/biometric-analysis should provide actionable recommendations', async () => {
            const response = await request(app)
                .get('/api/ai/biometric-analysis')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const recommendations = response.body.data.recommendations;
            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations.length).toBeGreaterThan(0);
            
            // Verify recommendation structure
            recommendations.forEach((rec: any) => {
                expect(rec.category).toBeDefined();
                expect(rec.priority).toBeDefined();
                expect(rec.description).toBeDefined();
                expect(typeof rec.actionable).toBe('boolean');
            });
        });

        test('GET /api/ai/biometric-analysis should assess current risk level', async () => {
            const response = await request(app)
                .get('/api/ai/biometric-analysis')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const riskAssessment = response.body.data.riskAssessment;
            expect(riskAssessment.overallRisk).toBeDefined();
            expect(riskAssessment.riskFactors).toBeDefined();
            expect(Array.isArray(riskAssessment.riskFactors)).toBe(true);
        });
    });

    describe('AI Nutrition Planning Integration', () => {
        test('POST /api/ai/nutrition-plan should generate personalized nutrition plan', async () => {
            const nutritionRequest = {
                goal: 'muscle_gain',
                currentWeight: 75,
                targetWeight: 80,
                height: 180,
                age: 28,
                gender: 'male',
                activityLevel: 'moderately_active',
                dietaryRestrictions: ['dairy'],
                preferredCuisines: ['mediterranean', 'asian']
            };

            const response = await request(app)
                .post('/api/ai/nutrition-plan')
                .set('Authorization', `Bearer ${authToken}`)
                .send(nutritionRequest)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.plan).toBeDefined();
            expect(response.body.data.plan.macros).toBeDefined();
            expect(response.body.data.plan.calorieTarget).toBeGreaterThan(0);
            expect(Array.isArray(response.body.data.plan.mealSuggestions)).toBe(true);
        });

        test('POST /api/ai/nutrition-plan should respect dietary restrictions', async () => {
            const response = await request(app)
                .post('/api/ai/nutrition-plan')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    goal: 'weight_loss',
                    currentWeight: 80,
                    targetWeight: 75,
                    height: 170,
                    age: 30,
                    gender: 'female',
                    activityLevel: 'lightly_active',
                    dietaryRestrictions: ['gluten', 'shellfish']
                })
                .expect(200);

            const mealSuggestions = response.body.data.plan.mealSuggestions;
            
            // Verify no gluten or shellfish in meal suggestions
            const restrictedIngredients = ['gluten', 'shellfish'];
            mealSuggestions.forEach((meal: any) => {
                restrictedIngredients.forEach(restriction => {
                    expect(meal.ingredients.toLowerCase()).not.toContain(restriction);
                });
            });
        });

        test('POST /api/ai/nutrition-plan should adjust for different activity levels', async () => {
            const activityLevels = ['sedentary', 'lightly_active', 'moderately_active', 'very_active'];
            
            for (const level of activityLevels) {
                const response = await request(app)
                    .post('/api/ai/nutrition-plan')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        goal: 'maintenance',
                        currentWeight: 70,
                        height: 175,
                        age: 25,
                        gender: 'male',
                        activityLevel: level
                    })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.plan.activityLevel).toBe(level);
                // Higher activity should result in higher calorie targets
                expect(response.body.data.plan.calorieTarget).toBeGreaterThan(1500);
            }
        });
    });

    describe('AI Coaching Integration', () => {
        test('POST /api/ai/coaching-advice should provide personalized coaching', async () => {
            const coachingRequest = {
                concern: 'plateau',
                currentRoutine: 'working out 3x per week, strength training',
                duration: '3 months',
                symptoms: ['no strength gains', 'decreased motivation'],
                goals: ['break through plateau', 'increase strength']
            };

            const response = await request(app)
                .post('/api/ai/coaching-advice')
                .set('Authorization', `Bearer ${authToken}`)
                .send(coachingRequest)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.advice).toBeDefined();
            expect(Array.isArray(response.body.data.strategies)).toBe(true);
            expect(response.body.data.timeline).toBeDefined();
        });

        test('POST /api/ai/coaching-advice should handle different concern types', async () => {
            const concerns = [
                { type: 'injury_recovery', details: 'recovering from shoulder injury' },
                { type: 'motivation', details: 'struggling with consistency' },
                { type: 'technique', details: 'want to improve form' },
                { type: 'programming', details: 'unsure about workout split' }
            ];

            for (const concern of concerns) {
                const response = await request(app)
                    .post('/api/ai/coaching-advice')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        concern: concern.type,
                        currentRoutine: 'regular exerciser',
                        duration: '6 months',
                        symptoms: [concern.details]
                    })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.concernType).toBe(concern.type);
                expect(response.body.data.advice.length).toBeGreaterThan(50);
            }
        });

        test('GET /api/ai/daily-coaching should provide daily insights', async () => {
            const response = await request(app)
                .get('/api/ai/daily-coaching')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.insight).toBeDefined();
            expect(response.body.data.focusArea).toBeDefined();
            expect(response.body.data.actionItems).toBeDefined();
            expect(Array.isArray(response.body.data.actionItems)).toBe(true);
        });

        test('GET /api/ai/daily-coaching should vary content daily', async () => {
            const response1 = await request(app)
                .get('/api/ai/daily-coaching')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Simulate next day by modifying date context
            const response2 = await request(app)
                .get('/api/ai/daily-coaching?date=2026-01-30')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Should provide different insights for different days
            expect(response1.body.data.insight).not.toBe(response2.body.data.insight);
        });
    });

    describe('AI Performance Forecasting Integration', () => {
        beforeEach(() => {
            // Seed historical performance data
            const stmt = db.prepare(`
                INSERT INTO user_metrics (
                    id, userId, date, readinessScore, recoveryScore, 
                    injuryRisk, fatigueLevel, sleepHours, stressLevel, activityLoad
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            // Create 30 days of historical data with trends
            const baseDate = new Date('2026-01-01');
            for (let i = 0; i < 30; i++) {
                const date = new Date(baseDate);
                date.setDate(date.getDate() + i);
                
                stmt.run(
                    `perf-${i}`,
                    testUser.id,
                    date.toISOString().split('T')[0],
                    50 + (i * 1.5), // Gradually improving readiness
                    45 + (i * 1.2), // Gradually improving recovery
                    30 - (i * 0.5), // Gradually decreasing injury risk
                    70 - (i * 1.8), // Gradually decreasing fatigue
                    6 + (i * 0.05), // Gradually improving sleep
                    55 - (i * 0.8), // Gradually decreasing stress
                    75 + (i * 2.5)  // Gradually increasing activity load
                );
            }
        });

        test('GET /api/ai/performance-forecast should predict future performance', async () => {
            const response = await request(app)
                .get('/api/ai/performance-forecast?days=7')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.forecast).toBeDefined();
            expect(Array.isArray(response.body.data.forecast.predictions)).toBe(true);
            expect(response.body.data.forecast.predictions.length).toBe(7);
            
            // Verify prediction structure
            response.body.data.forecast.predictions.forEach((prediction: any) => {
                expect(prediction.date).toBeDefined();
                expect(typeof prediction.readinessScore).toBe('number');
                expect(typeof prediction.injuryRisk).toBe('number');
                expect(prediction.confidenceInterval).toBeDefined();
            });
        });

        test('GET /api/ai/performance-forecast should show positive trends', async () => {
            const response = await request(app)
                .get('/api/ai/performance-forecast?days=14')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const predictions = response.body.data.forecast.predictions;
            
            // First prediction should be based on recent data
            const firstPrediction = predictions[0];
            const lastPrediction = predictions[predictions.length - 1];
            
            // Should show improvement trend
            expect(lastPrediction.readinessScore).toBeGreaterThan(firstPrediction.readinessScore);
            expect(lastPrediction.injuryRisk).toBeLessThan(firstPrediction.injuryRisk);
        });

        test('GET /api/ai/performance-forecast should provide confidence intervals', async () => {
            const response = await request(app)
                .get('/api/ai/performance-forecast?days=5')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const predictions = response.body.data.forecast.predictions;
            
            predictions.forEach((prediction: any) => {
                expect(prediction.confidenceInterval.lower).toBeLessThan(prediction.readinessScore);
                expect(prediction.confidenceInterval.upper).toBeGreaterThan(prediction.readinessScore);
                expect(prediction.confidenceInterval.range).toBeGreaterThan(0);
            });
        });

        test('GET /api/ai/performance-forecast should handle different time periods', async () => {
            const timePeriods = [3, 7, 14, 30];
            
            for (const days of timePeriods) {
                const response = await request(app)
                    .get(`/api/ai/performance-forecast?days=${days}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body.data.forecast.predictions.length).toBe(days);
            }
        });
    });

    describe('AI Integration Error Handling', () => {
        test('AI endpoints should handle service unavailability gracefully', async () => {
            // This test would simulate AI service downtime
            // For now, we'll test with invalid parameters to ensure proper error handling
            const response = await request(app)
                .post('/api/ai/workout-plan')
                .set('Authorization', `Bearer ${authToken}`)
                .send({}) // Empty request body
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBeDefined();
        });

        test('AI endpoints should validate user authentication', async () => {
            const response = await request(app)
                .post('/api/ai/workout-plan')
                .send({
                    goal: 'strength',
                    experienceLevel: 'intermediate'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Unauthorized');
        });

        test('AI endpoints should handle rate limiting', async () => {
            // Make multiple rapid requests to test rate limiting
            const promises = Array(15).fill(null).map(() =>
                request(app)
                    .post('/api/ai/workout-plan')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        goal: 'strength',
                        experienceLevel: 'intermediate',
                        availableTime: 60
                    })
            );

            const responses = await Promise.all(promises);
            
            // Some requests should be rate limited (429 status)
            const rateLimited = responses.filter(r => r.status === 429);
            expect(rateLimited.length).toBeGreaterThan(0);
        });

        test('AI endpoints should provide meaningful error messages', async () => {
            const response = await request(app)
                .post('/api/ai/workout-plan')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    goal: 'invalid_goal_type'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message.toLowerCase()).toContain('validation');
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('AI Service Health and Monitoring', () => {
        test('GET /api/ai/health should return service status', async () => {
            const response = await request(app)
                .get('/api/ai/health')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBeDefined();
            expect(response.body.data.providers).toBeDefined();
            expect(Array.isArray(response.body.data.providers)).toBe(true);
        });

        test('GET /api/ai/providers should list available AI providers', async () => {
            const response = await request(app)
                .get('/api/ai/providers')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.providers)).toBe(true);
            
            response.body.data.providers.forEach((provider: any) => {
                expect(provider.name).toBeDefined();
                expect(provider.capabilities).toBeDefined();
                expect(Array.isArray(provider.capabilities)).toBe(true);
            });
        });

        test('GET /api/ai/models should return available models', async () => {
            const response = await request(app)
                .get('/api/ai/models')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.models).toBeDefined();
            expect(Array.isArray(response.body.data.models)).toBe(true);
        });
    });
});

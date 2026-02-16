import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('Integration Tests Between All Modules', () => {
    let app: any;
    let db: DatabaseType;
    let authToken: string;
    let userId: string;
    let workoutId: string;
    let routineId: string;

    const testUser = {
        name: 'Integration Test User',
        email: 'integration-test@example.com',
        password: 'SecurePassword123!'
    };

    beforeAll(async () => {
        // Setup environment
        process.env.DB_PATH = e2eManager.getDbPath();
        
        // Import server
        const serverModule = await import('../../server');
        app = serverModule.app;

        // Setup database
        await e2eManager.cleanDatabase();

        db = new Database(e2eManager.getDbPath());

        // Create user and get auth token
        await request(app)
            .post('/api/auth/register')
            .send({
                name: testUser.name,
                email: testUser.email,
                password: testUser.password
            })
            .expect(201);

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .expect(200);

        authToken = loginResponse.body.data.token;
        userId = loginResponse.body.data.user.id;
    });

    afterAll(() => {
        if (db) db.close();
    });

    test('Integration: User Profile + Workouts + Routines + Analytics', async () => {
        // 1. Update user profile with fitness goals
        const profileUpdateResponse = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                weightKg: 75,
                trainingCycle: 'strength',
                keystoneHabits: ['sleep', 'hydration', 'consistency'],
                masterRegulationSettings: { threshold: 80 },
                nutritionSettings: { proteinGoal: 150 }
            })
            .expect(200);

        expect(profileUpdateResponse.body.success).toBe(true);
        expect(profileUpdateResponse.body.data.user.trainingCycle).toBe('strength');

        // 2. Create a routine
        const routineData = {
            name: 'Strength Routine',
            description: 'Full body strength routine',
            frequency: '3x per week',
            exercises: [
                { name: 'Bench Press', sets: 4, reps: 6, weight: 135 },
                { name: 'Squats', sets: 4, reps: 8, weight: 185 },
                { name: 'Deadlifts', sets: 3, reps: 5, weight: 225 }
            ]
        };

        const createRoutineResponse = await request(app)
            .post('/api/routines')
            .set('Authorization', `Bearer ${authToken}`)
            .send(routineData)
            .expect(201);

        expect(createRoutineResponse.body.success).toBe(true);
        expect(createRoutineResponse.body.data.routine.name).toBe(routineData.name);
        routineId = createRoutineResponse.body.data.routine.id;

        // 3. Create a workout based on the routine
        const workoutData = {
            title: 'Strength Session',
            description: 'Following strength routine',
            durationMinutes: 75,
            routineId: routineId, // Link to routine
            exercises: routineData.exercises.map((ex: any) => ({
                ...ex,
                restTimeSeconds: 180,
                notes: 'Standard lifting'
            }))
        };

        const createWorkoutResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send(workoutData)
            .expect(201);

        expect(createWorkoutResponse.body.success).toBe(true);
        expect(createWorkoutResponse.body.data.workout.routineId).toBe(routineId);
        workoutId = createWorkoutResponse.body.data.workout.id;

        // 4. Complete the workout
        const completionData = {
            completedAt: new Date().toISOString(),
            notes: 'Completed strength session',
            rating: 4
        };

        const completeWorkoutResponse = await request(app)
            .post(`/api/workouts/${workoutId}/complete`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(completionData)
            .expect(200);

        expect(completeWorkoutResponse.body.success).toBe(true);
        expect(completeWorkoutResponse.body.data.workout.completed).toBe(true);

        // 5. Check that analytics reflect the completed workout
        const statsResponse = await request(app)
            .get('/api/workouts/stats')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(statsResponse.body.success).toBe(true);
        expect(statsResponse.body.data.completedWorkouts).toBeGreaterThanOrEqual(1);
        expect(statsResponse.body.data.averageRating).toBeDefined();

        // 6. Get user profile again to verify stats are updated
        const profileResponse = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(profileResponse.body.success).toBe(true);
        expect(profileResponse.body.data.user.stats).toBeDefined();
        expect(profileResponse.body.data.user.stats?.totalWorkouts).toBeGreaterThanOrEqual(1);
    });

    test('Integration: Biometric Data + ML Forecasting + RAG Insights', async () => {
        // 1. Upload biometric data
        const biometricData = {
            heartRate: [{ timestamp: new Date().toISOString(), value: 72, source: 'apple-watch' }],
            hrv: [{ timestamp: new Date().toISOString(), value: 65, source: 'apple-watch' }],
            sleep: {
                duration: 420, // minutes
                quality: 'good',
                date: new Date().toISOString().split('T')[0],
                source: 'apple-watch'
            },
            activity: {
                steps: 8500,
                distance: { value: 6.2, unit: 'km' },
                caloriesBurned: 420,
                date: new Date().toISOString().split('T')[0],
                source: 'apple-watch'
            }
        };

        const biometricResponse = await request(app)
            .post('/api/biometrics/sync')
            .set('Authorization', `Bearer ${authToken}`)
            .send(biometricData)
            .expect(200);

        expect(biometricResponse.body.success).toBe(true);
        expect(biometricResponse.body.message).toBe('Biometric data synchronized');

        // 2. Request ML forecasting based on biometric data
        const forecastResponse = await request(app)
            .post('/api/ml/forecasting/performance')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                userId: userId,
                days: 30,
                metric: 'performance'
            })
            .expect(200);

        expect(forecastResponse.body.success).toBe(true);
        expect(Array.isArray(forecastResponse.body.data.forecasts)).toBe(true);
        expect(forecastResponse.body.data.forecasts.length).toBeGreaterThan(0);

        // 3. Request RAG-based insights based on the data
        const ragInsightResponse = await request(app)
            .post('/api/rag/query')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                query: 'Based on my recent activity and biometrics, what recovery recommendations do you have?',
                context: 'recovery_recommendations'
            })
            .expect(200);

        expect(ragInsightResponse.body.success).toBe(true);
        expect(ragInsightResponse.body.data.answer).toBeDefined();
        expect(ragInsightResponse.body.data.citations).toBeDefined();

        // 4. Verify that the biometric data affected user readiness
        const profileWithBiometrics = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(profileWithBiometrics.body.success).toBe(true);
        expect(profileWithBiometrics.body.data.user.stats?.latestBiometricData).toBeDefined();
    });

    test('Integration: Notifications + Personalization + Adaptive Planning', async () => {
        // 1. Update user preferences for notifications
        const notificationPrefs = {
            preferences: {
                email: true,
                push: true,
                sms: false,
                schedule: {
                    morning: '08:00',
                    evening: '20:00'
                }
            }
        };

        await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send(notificationPrefs)
            .expect(200);

        // 2. Schedule a workout for tomorrow
        const scheduledWorkout = {
            title: 'Scheduled Workout',
            description: 'Tomorrow\'s planned workout',
            durationMinutes: 60,
            scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            exercises: [
                {
                    name: 'Warm-up',
                    sets: 1,
                    reps: 10,
                    restTimeSeconds: 30
                }
            ]
        };

        const scheduledWorkoutResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send(scheduledWorkout)
            .expect(201);

        expect(scheduledWorkoutResponse.body.success).toBe(true);
        expect(scheduledWorkoutResponse.body.data.workout.scheduledDate).toBeDefined();

        // 3. Request personalized workout recommendation
        const recommendationResponse = await request(app)
            .post('/api/ml/recommendations/training')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                userId: userId,
                preferences: {
                    goal: 'strength',
                    equipment: ['barbell', 'dumbbells'],
                    timeAvailable: 60
                }
            })
            .expect(200);

        expect(recommendationResponse.body.success).toBe(true);
        expect(recommendationResponse.body.data.recommendation).toBeDefined();

        // 4. Check that the system generated appropriate notifications
        const notificationsResponse = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(notificationsResponse.body.success).toBe(true);
        expect(Array.isArray(notificationsResponse.body.data.notifications)).toBe(true);

        // 5. Request adaptive plan adjustment based on recent data
        const adjustmentResponse = await request(app)
            .post('/api/plans/adjust')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                userId: userId,
                reason: 'recovery_needed',
                adjustments: {
                    volume: 0.8,
                    intensity: 0.7
                }
            })
            .expect(200);

        expect(adjustmentResponse.body.success).toBe(true);
        expect(adjustmentResponse.body.data.adjustedPlan).toBeDefined();
    });

    test('Integration: Third-party Data + Knowledge Base + Insights', async () => {
        // 1. Import data from third-party source (simulating Garmin/Google Fit)
        const thirdPartyData = {
            source: 'garmin',
            data: {
                dailySummary: {
                    steps: 12000,
                    calories: 3200,
                    elevationGain: 150,
                    intensityMinutes: {
                        moderate: 45,
                        vigorous: 30
                    }
                },
                activities: [
                    {
                        activityType: 'running',
                        duration: 3600, // seconds
                        distance: 12.5, // km
                        calories: 750,
                        averageHeartRate: 155
                    }
                ]
            }
        };

        const importResponse = await request(app)
            .post('/api/data/import')
            .set('Authorization', `Bearer ${authToken}`)
            .send(thirdPartyData)
            .expect(200);

        expect(importResponse.body.success).toBe(true);
        expect(importResponse.body.message).toContain('imported');

        // 2. Query knowledge base for running improvement
        const knowledgeQuery = {
            query: 'How can I improve my running performance based on my recent data?',
            context: 'running_performance'
        };

        const knowledgeResponse = await request(app)
            .post('/api/knowledge-base/query')
            .set('Authorization', `Bearer ${authToken}`)
            .send(knowledgeQuery)
            .expect(200);

        expect(knowledgeResponse.body.success).toBe(true);
        expect(knowledgeResponse.body.data.answer).toBeDefined();
        expect(knowledgeResponse.body.data.sources).toBeDefined();

        // 3. Request personalized insights combining imported data and knowledge base
        const insightRequest = {
            query: 'Provide insights on my fitness progress combining all data sources',
            timeframe: 'last_month'
        };

        const insightResponse = await request(app)
            .post('/api/insights/personalized')
            .set('Authorization', `Bearer ${authToken}`)
            .send(insightRequest)
            .expect(200);

        expect(insightResponse.body.success).toBe(true);
        expect(insightResponse.body.data.insights).toBeDefined();
        expect(Array.isArray(insightResponse.body.data.insights)).toBe(true);
        expect(insightResponse.body.data.confidenceScore).toBeDefined();
    });

    test('Integration: Error Handling Across Modules', async () => {
        // 1. Test error propagation from one module affecting others
        const invalidWorkout = {
            title: '', // Invalid: empty title
            durationMinutes: -30 // Invalid: negative duration
        };

        const invalidWorkoutResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidWorkout)
            .expect(400);

        expect(invalidWorkoutResponse.body.success).toBe(false);

        // 2. Test that the error didn't corrupt the user's data
        const profileAfterError = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(profileAfterError.body.success).toBe(true);

        // 3. Test rate limiting integration
        const promises = Array(15).fill(null).map(() => 
            request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrong-password'
                })
        );

        const responses = await Promise.all(promises);
        const rateLimited = responses.filter(r => r.status === 429);
        
        // At least some requests should be rate limited
        expect(rateLimited.length).toBeGreaterThan(0);

        // 4. Verify account is still functional after rate limiting
        const finalLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .expect(200);

        expect(finalLogin.body.success).toBe(true);
    });
});

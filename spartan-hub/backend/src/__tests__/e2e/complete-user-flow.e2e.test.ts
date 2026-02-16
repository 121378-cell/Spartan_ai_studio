import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('Complete User Flow E2E Test', () => {
    let app: any;
    let db: DatabaseType;
    let authToken: string;
    let userId: string;
    let workoutId: string;

    const testUser = {
        name: 'Complete Flow Test User',
        email: 'complete-flow-test@example.com',
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
    });

    afterAll(() => {
        if (db) db.close();
    });

    test('Complete user flow: Register -> Login -> Create workout -> Complete -> View analytics', async () => {
        // Step 1: User Registration
        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                name: testUser.name,
                email: testUser.email,
                password: testUser.password
            })
            .expect(201);

        expect(registerResponse.body.success).toBe(true);
        expect(registerResponse.body.data.user.email).toBe(testUser.email);
        expect(registerResponse.body.data.token).toBeDefined();
        
        userId = registerResponse.body.data.user.id;

        // Step 2: User Login
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .expect(200);

        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data.token).toBeDefined();
        authToken = loginResponse.body.data.token;

        // Step 3: Update user profile
        const profileUpdateResponse = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Flow Test User',
                weightKg: 75,
                trainingCycle: 'strength'
            })
            .expect(200);

        expect(profileUpdateResponse.body.success).toBe(true);
        expect(profileUpdateResponse.body.data.user.name).toBe('Updated Flow Test User');

        // Step 4: Create a workout
        const workoutData = {
            title: 'Complete Flow Test Workout',
            description: 'Testing complete user flow with this workout',
            durationMinutes: 45,
            exercises: [
                {
                    name: 'Push-ups',
                    sets: 3,
                    reps: 15,
                    weight: null,
                    restTimeSeconds: 60,
                    notes: 'Focus on form'
                },
                {
                    name: 'Squats',
                    sets: 4,
                    reps: 12,
                    weight: 80,
                    restTimeSeconds: 90,
                    notes: 'Deep squats'
                }
            ]
        };

        const createWorkoutResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send(workoutData)
            .expect(201);

        expect(createWorkoutResponse.body.success).toBe(true);
        expect(createWorkoutResponse.body.data.workout.title).toBe(workoutData.title);
        expect(createWorkoutResponse.body.data.workout.exercises).toHaveLength(2);
        workoutId = createWorkoutResponse.body.data.workout.id;

        // Step 5: Retrieve the created workout
        const getWorkoutResponse = await request(app)
            .get(`/api/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(getWorkoutResponse.body.success).toBe(true);
        expect(getWorkoutResponse.body.data.workout.id).toBe(workoutId);
        expect(getWorkoutResponse.body.data.workout.exercises).toHaveLength(2);

        // Step 6: Complete the workout
        const completionData = {
            completedAt: new Date().toISOString(),
            notes: 'Completed the workout successfully',
            rating: 5
        };

        const completeWorkoutResponse = await request(app)
            .post(`/api/workouts/${workoutId}/complete`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(completionData)
            .expect(200);

        expect(completeWorkoutResponse.body.success).toBe(true);
        expect(completeWorkoutResponse.body.data.workout.completed).toBe(true);

        // Step 7: Get user's workout history
        const workoutHistoryResponse = await request(app)
            .get('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(workoutHistoryResponse.body.success).toBe(true);
        expect(Array.isArray(workoutHistoryResponse.body.data.workouts)).toBe(true);
        expect(workoutHistoryResponse.body.data.workouts.length).toBeGreaterThan(0);

        // Step 8: Get workout statistics
        const statsResponse = await request(app)
            .get('/api/workouts/stats')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(statsResponse.body.success).toBe(true);
        expect(statsResponse.body.data.totalWorkouts).toBeDefined();
        expect(statsResponse.body.data.completedWorkouts).toBeDefined();

        // Step 9: Get user profile with updated stats
        const profileResponse = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(profileResponse.body.success).toBe(true);
        expect(profileResponse.body.data.user.name).toBe('Updated Flow Test User');
        expect(profileResponse.body.data.user.stats).toBeDefined();

        // Step 10: Log out
        const logoutResponse = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(logoutResponse.body.success).toBe(true);
        expect(logoutResponse.body.message).toBe('Logged out successfully');
    });

    test('User should not be able to access resources after logout', async () => {
        // Try to access protected resource after logout
        const protectedResponse = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(401);

        expect(protectedResponse.body.success).toBe(false);
        expect(protectedResponse.body.message).toBe('Unauthorized');
    });

    test('User should be able to log back in after logout', async () => {
        // Log back in with the same credentials
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .expect(200);

        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data.token).toBeDefined();
        
        // Verify that the user still has their workout data
        const workoutHistoryResponse = await request(app)
            .get('/api/workouts')
            .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
            .expect(200);

        expect(workoutHistoryResponse.body.success).toBe(true);
        expect(workoutHistoryResponse.body.data.workouts.length).toBeGreaterThan(0);
    });
});

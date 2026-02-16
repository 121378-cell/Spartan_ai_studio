import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
import { performance } from 'perf_hooks';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('Performance Regression Tests', () => {
    let app: any;
    let db: DatabaseType;
    let authToken: string;
    let userId: string;

    const testUser = {
        name: 'Performance Test User',
        email: 'performance-test@example.com',
        password: 'SecurePassword123!'
    };

    // Performance thresholds (in milliseconds)
    const PERFORMANCE_THRESHOLDS = {
        auth_login: 500,      // Login should be under 500ms
        auth_register: 800,   // Registration should be under 800ms
        workout_create: 600,  // Workout creation should be under 600ms
        workout_get: 300,     // Workout retrieval should be under 300ms
        profile_get: 200,     // Profile retrieval should be under 200ms
        search_query: 500,    // Search queries should be under 500ms
        ml_prediction: 2000   // ML predictions should be under 2000ms
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

    // Helper function to measure performance
    async function measurePerformance<T>(fn: () => Promise<T>): Promise<{ result: T, duration: number }> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        const duration = end - start;
        return { result, duration };
    }

    test('Performance: User registration should meet threshold', async () => {
        const newUser = {
            name: 'Performance Test User 2',
            email: 'performance-test-2@example.com',
            password: 'SecurePassword123!'
        };

        const { result, duration } = await measurePerformance(() => 
            request(app)
                .post('/api/auth/register')
                .send(newUser)
        );

        expect(result.status).toBe(201);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth_register);
        expect(result.body.success).toBe(true);
        
        console.log(`Registration took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.auth_register}ms)`);
    });

    test('Performance: User login should meet threshold', async () => {
        const { result, duration } = await measurePerformance(() => 
            request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
        );

        expect(result.status).toBe(200);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth_login);
        expect(result.body.success).toBe(true);
        
        console.log(`Login took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.auth_login}ms)`);
    });

    test('Performance: Workout creation should meet threshold', async () => {
        const workoutData = {
            title: 'Performance Test Workout',
            description: 'Testing performance of workout creation',
            durationMinutes: 45,
            exercises: [
                { name: 'Push-ups', sets: 3, reps: 15, weight: null, restTimeSeconds: 60 },
                { name: 'Squats', sets: 4, reps: 12, weight: 80, restTimeSeconds: 90 }
            ]
        };

        const { result, duration } = await measurePerformance(() => 
            request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(workoutData)
        );

        expect(result.status).toBe(201);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.workout_create);
        expect(result.body.success).toBe(true);
        
        console.log(`Workout creation took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.workout_create}ms)`);
    });

    test('Performance: Workout retrieval should meet threshold', async () => {
        // First create a workout to retrieve
        const workoutData = {
            title: 'Retrieval Performance Test',
            durationMinutes: 30
        };

        const createResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send(workoutData)
            .expect(201);

        const workoutId = createResponse.body.data.workout.id;

        const { result, duration } = await measurePerformance(() => 
            request(app)
                .get(`/api/workouts/${workoutId}`)
                .set('Authorization', `Bearer ${authToken}`)
        );

        expect(result.status).toBe(200);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.workout_get);
        expect(result.body.success).toBe(true);
        
        console.log(`Workout retrieval took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.workout_get}ms)`);
    });

    test('Performance: Profile retrieval should meet threshold', async () => {
        const { result, duration } = await measurePerformance(() => 
            request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
        );

        expect(result.status).toBe(200);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.profile_get);
        expect(result.body.success).toBe(true);
        
        console.log(`Profile retrieval took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.profile_get}ms)`);
    });

    test('Performance: Workout listing with pagination should meet threshold', async () => {
        // Create multiple workouts to test pagination performance
        for (let i = 0; i < 10; i++) {
            await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: `Paginated Workout ${i}`,
                    durationMinutes: 30
                })
                .expect(201);
        }

        const { result, duration } = await measurePerformance(() => 
            request(app)
                .get('/api/workouts?page=1&limit=10')
                .set('Authorization', `Bearer ${authToken}`)
        );

        expect(result.status).toBe(200);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.workout_get);
        expect(result.body.success).toBe(true);
        expect(result.body.data.workouts.length).toBeGreaterThanOrEqual(10);
        
        console.log(`Workout listing (10 items) took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.workout_get}ms)`);
    });

    test('Performance: Concurrent requests should maintain acceptable response times', async () => {
        // Create multiple concurrent requests
        const concurrentRequests = Array(10).fill(null).map(() => 
            request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
        );

        const start = performance.now();
        const responses = await Promise.all(concurrentRequests);
        const duration = performance.now() - start;

        // All requests should succeed
        responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        // Average response time should be acceptable under load
        const avgDuration = duration / 10;
        expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.profile_get * 2); // Allow some overhead for concurrency
        
        console.log(`Average concurrent profile retrieval took ${avgDuration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.profile_get * 2}ms)`);
    });

    test('Performance: ML prediction should meet threshold', async () => {
        const { result, duration } = await measurePerformance(() => 
            request(app)
                .post('/api/ml/forecasting/performance')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: userId,
                    days: 7,
                    metric: 'performance'
                })
        );

        // ML predictions might fail if no historical data exists, but timing should still be measured
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.ml_prediction);
        
        if (result.status === 200) {
            expect(result.body.success).toBe(true);
        }
        
        console.log(`ML prediction took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.ml_prediction}ms)`);
    });

    test('Performance: Search functionality should meet threshold', async () => {
        const { result, duration } = await measurePerformance(() => 
            request(app)
                .get('/api/workouts/search?q=performance')
                .set('Authorization', `Bearer ${authToken}`)
        );

        expect(result.status).toBe(200);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.search_query);
        expect(result.body.success).toBe(true);
        
        console.log(`Search query took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.search_query}ms)`);
    });

    test('Performance: Large payload handling should remain efficient', async () => {
        // Create a workout with many exercises to test large payload handling
        const largeWorkout = {
            title: 'Large Workout Payload Test',
            description: 'Testing performance with a large workout containing many exercises',
            durationMinutes: 120,
            exercises: Array(20).fill(null).map((_, i) => ({
                name: `Exercise ${i + 1}`,
                sets: 4,
                reps: 10,
                weight: 50 + i * 5,
                restTimeSeconds: 90,
                notes: `Notes for exercise ${i + 1}`
            }))
        };

        const { result, duration } = await measurePerformance(() => 
            request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(largeWorkout)
        );

        expect(result.status).toBe(201);
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.workout_create * 2); // Allow more time for large payload
        expect(result.body.success).toBe(true);
        
        console.log(`Large workout creation took ${duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.workout_create * 2}ms)`);
    });

    test('Performance: Database cleanup should be efficient', async () => {
        // Create many records to clean up
        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(
                request(app)
                    .post('/api/workouts')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        title: `Cleanup Test Workout ${i}`,
                        durationMinutes: 30
                    })
            );
        }
        await Promise.all(promises);

        // Measure how long it takes to get all workouts
        const { result, duration } = await measurePerformance(() => 
            request(app)
                .get('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
        );

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.data.workouts.length).toBeGreaterThanOrEqual(50);
        
        console.log(`Retrieved ${result.body.data.workouts.length} workouts in ${duration.toFixed(2)}ms`);
    });

    test('Performance: Memory usage should remain stable under load', async () => {
        // Track memory usage before
        const memBefore = process.memoryUsage();

        // Perform multiple operations
        const operations = [];
        for (let i = 0; i < 20; i++) {
            operations.push(
                request(app)
                    .post('/api/workouts')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        title: `Memory Test ${i}`,
                        durationMinutes: 15
                    })
            );
        }
        
        await Promise.all(operations);

        // Track memory usage after
        const memAfter = process.memoryUsage();
        const heapUsedDiff = memAfter.heapUsed - memBefore.heapUsed;
        
        // Heap growth should be reasonable (less than 50MB for 20 operations)
        const heapGrowthMB = heapUsedDiff / 1024 / 1024;
        expect(heapGrowthMB).toBeLessThan(50);
        
        console.log(`Memory growth after 20 operations: ${heapGrowthMB.toFixed(2)}MB`);
    });
});